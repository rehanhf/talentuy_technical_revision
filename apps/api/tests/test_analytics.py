"""Uji logika analitik: KPI, periode pembanding, pembagi nol, dan lonjakan isu."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app import analytics
from app.filters import FilterSet
from app.search.base import parse_query


def make_filters(days: int = 30, **kwargs) -> FilterSet:
    end = datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=0)
    start = (end - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0)
    return FilterSet(date_from=start, date_to=end, **kwargs)


def test_percent_change_handles_zero_divisor():
    """Pembagi nol tidak boleh menghasilkan infinity."""
    assert analytics.percent_change(10, 0) is None
    assert analytics.percent_change(0, 0) is None
    assert analytics.percent_change(150, 100) == 50.0
    assert analytics.percent_change(50, 100) == -50.0


def test_share_percent_zero_total():
    assert analytics.share_percent(5, 0) == 0.0
    assert analytics.share_percent(25, 100) == 25.0


def test_previous_window_has_same_length_and_no_overlap():
    filters = make_filters(days=30)
    prev_start, prev_end = filters.previous_window
    assert prev_end < filters.date_from
    assert (filters.date_to.date() - filters.date_from.date()).days == (
        prev_end.date() - prev_start.date()
    ).days


def test_daily_volume_fills_empty_days(db):
    filters = make_filters(days=14)
    series = analytics.daily_volume(db, filters)
    assert len(series) == 14
    assert all("date" in point and "count" in point for point in series)
    assert series == sorted(series, key=lambda p: p["date"])


def test_weekly_aggregation_preserves_total(db):
    filters = make_filters(days=28)
    daily = analytics.daily_volume(db, filters)
    weekly = analytics.weekly_volume(daily)
    assert sum(p["count"] for p in weekly) == sum(p["count"] for p in daily)


def test_kpi_total_matches_count_query(db):
    filters = make_filters(days=30)
    kpis = analytics.overview_kpis(db, filters)
    assert kpis["total_posts"]["value"] == analytics.count_posts(db, filters)
    assert kpis["dominant_sentiment"]["value"] in {
        "Positif", "Netral", "Negatif", "Tidak Yakin", "Tidak ada data",
    }
    assert kpis["detected_questions"]["value"] >= 0
    assert kpis["active_topics"]["threshold"] == analytics.MIN_TOPIC_POSTS


def test_topic_shares_sum_to_about_hundred(db):
    filters = make_filters(days=45)
    topics = analytics.topic_breakdown(db, filters)
    assert topics, "seed harus menghasilkan topik"
    assert sum(t["share"] for t in topics) == pytest.approx(100.0, abs=0.5)
    assert topics == sorted(topics, key=lambda t: -t["count"])


def test_spike_rule_requires_both_thresholds():
    """Lonjakan = volume >= ambang post DAN kenaikan >= ambang % atas rata-rata 4 minggu."""
    # 12 post, rata-rata 4 minggu 6 -> naik 100%: kedua ambang terpenuhi.
    assert analytics.evaluate_issue_week(12, [6, 6, 6, 6])[0] is True
    # Kenaikan 100% tetapi hanya 8 post: gagal ambang volume.
    assert analytics.evaluate_issue_week(8, [4, 4, 4, 4])[0] is False
    # 40 post tetapi hanya naik 33%: gagal ambang persentase.
    assert analytics.evaluate_issue_week(40, [30, 30, 30, 30])[0] is False
    # Tepat di ambang (10 post, naik tepat 50%) dihitung sebagai lonjakan.
    is_spike, baseline, increase = analytics.evaluate_issue_week(15, [10, 10, 10, 10])
    assert is_spike is True and baseline == 10 and increase == 50.0
    # Isu yang muncul dari nol: kenaikan tidak terdefinisi tetapi lolos bila volume cukup.
    assert analytics.evaluate_issue_week(10, [0, 0, 0, 0]) == (True, 0.0, None)
    assert analytics.evaluate_issue_week(9, [0, 0, 0, 0])[0] is False


def test_spike_rule_values_come_from_config(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "spike_min_posts", 20)
    monkeypatch.setattr(settings, "spike_min_increase_percent", 200.0)
    assert analytics.evaluate_issue_week(12, [6, 6, 6, 6])[0] is False
    assert analytics.evaluate_issue_week(30, [10, 10, 10, 10])[0] is True
    rule = analytics.spike_rule()
    assert rule["min_posts"] == 20 and rule["min_increase_percent"] == 200.0
    assert rule["baseline_weeks"] == 4


def test_issue_spikes_are_per_topic_and_satisfy_rule(db):
    from app.config import settings

    spikes = analytics.detect_issue_spikes(db, make_filters(days=60))
    for spike in spikes:
        assert spike["topic_slug"] and spike["topic_name"]
        assert spike["count"] >= settings.spike_min_posts
        assert len(spike["previous_weeks"]) == settings.spike_baseline_weeks
        assert spike["delta_percent"] is None or (
            spike["delta_percent"] >= settings.spike_min_increase_percent
        )
        # Minggu dimulai hari Senin.
        assert datetime.fromisoformat(spike["week_start"]).weekday() == 0


def test_issue_spikes_ignore_weeks_without_full_history(db):
    """Minggu yang pembandingnya jatuh sebelum data pertama tidak dinilai."""
    from sqlalchemy import func, select

    from app.models import Post

    earliest = db.scalar(select(func.min(Post.created_at_source)))
    earliest_week = analytics.week_start(earliest.date())
    filters = make_filters(days=400)
    for spike in analytics.detect_issue_spikes(db, filters):
        first_baseline = datetime.fromisoformat(spike["week_start"]).date() - timedelta(weeks=4)
        assert first_baseline >= earliest_week


def test_indexed_series_starts_at_hundred():
    series = [{"date": "2026-01-01", "count": 20}, {"date": "2026-01-02", "count": 30}]
    indexed = analytics.indexed_series(series)
    assert indexed[0]["indexed"] == 100.0
    assert indexed[1]["indexed"] == 150.0


def test_filter_combination_narrows_results(db):
    base = make_filters(days=60)
    total = analytics.count_posts(db, base)

    narrowed = make_filters(days=60, job_roles=["Staf Gudang"], sentiments=["Negatif"])
    subset = analytics.count_posts(db, narrowed)
    assert subset <= total

    unknown_topic = make_filters(days=60, topics=["topik-tidak-ada"])
    assert analytics.count_posts(db, unknown_topic) == 0


def test_text_query_filters_posts(db):
    filters = make_filters(days=60, q="gaji")
    filters.parsed_query = parse_query("gaji")
    assert analytics.count_posts(db, filters) < analytics.count_posts(db, make_filters(days=60))


def test_heatmap_matrix_is_rectangular(db):
    data = analytics.concern_heatmap(db, make_filters(days=60))
    assert len(data["cells"]) == len(data["rows"]) * len(data["columns"])
    assert data["max_count"] >= 0


def test_related_keywords_edges_reference_existing_nodes(db):
    graph = analytics.related_keywords(db, make_filters(days=60))
    node_ids = {node["id"] for node in graph["nodes"]}
    assert all(e["source"] in node_ids and e["target"] in node_ids for e in graph["edges"])


def test_attention_issues_respect_threshold(db):
    issues = analytics.attention_issues(db, make_filters(days=60))
    assert all(issue["count"] >= analytics.MIN_TOPIC_POSTS for issue in issues)
    assert all(issue["reasons"] for issue in issues)
