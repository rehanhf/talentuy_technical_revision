"""Uji parser query boolean, pipeline NLP, dan template insight."""

from __future__ import annotations

from datetime import datetime

from app.nlp.baseline import normalize_text
from app.nlp.pipeline import engagement_score, pipeline
from app.nlp.summarizer import summarizer
from app.search.base import parse_query
from app.connectors.x_public_embed import parse_embed_html, parse_x_post_url


def test_parse_public_x_embed():
    username, post_id, canonical = parse_x_post_url(
        "https://twitter.com/hrdbacot/status/1566952453937205248?ref_src=test"
    )
    assert username == "hrdbacot"
    assert post_id == "1566952453937205248"
    assert canonical == "https://x.com/hrdbacot/status/1566952453937205248"

    text, published_at = parse_embed_html(
        '<blockquote><p lang="in">Baru dapat offering letter 5 juta.</p>'
        '— HRD BACOT <a href="https://x.com/x/status/1">September 6, 2022</a></blockquote>'
    )
    assert text == "Baru dapat offering letter 5 juta."
    assert published_at == datetime(2022, 9, 6)


def test_parse_query_defaults_to_and():
    parsed = parse_query("gaji gudang")
    assert parsed.all_terms == ["gaji", "gudang"]
    assert parsed.any_terms == []


def test_parse_query_or_moves_previous_term():
    parsed = parse_query("gaji OR lembur")
    assert set(parsed.any_terms) == {"gaji", "lembur"}
    assert parsed.all_terms == []


def test_parse_query_exclusions():
    parsed = parse_query("gudang -penipuan NOT promosi")
    assert parsed.all_terms == ["gudang"]
    assert set(parsed.exclude_terms) == {"penipuan", "promosi"}


def test_parse_query_quoted_phrase():
    parsed = parse_query('"loker palsu" gudang')
    assert "loker palsu" in parsed.all_terms


def test_parse_query_empty():
    assert parse_query("").is_empty
    assert parse_query(None).is_empty


def test_normalize_expands_slang_and_strips_urls():
    normalized = normalize_text("Gaji nya brp sih? cek https://contoh.id @akun #loker")
    assert "https" not in normalized
    assert "@akun" not in normalized
    assert "berapa" in normalized


def test_question_detection():
    result = pipeline.run("min gaji staf gudang berapa ya?")
    assert result.intent_label == "Pertanyaan"
    assert result.intent_confidence >= 0.7


def test_fraud_warning_intent():
    result = pipeline.run("hati hati loker palsu minta bayar administrasi, itu penipuan")
    assert result.intent_label in {"Peringatan Penipuan", "Pertanyaan"}
    assert result.topic_slug == "keamanan-penipuan"


def test_low_confidence_becomes_uncertain():
    """Teks tanpa penanda kuat tidak boleh dipaksa jadi positif/negatif."""
    result = pipeline.run("sistem shift rolling per minggu")
    assert result.sentiment_label in {"Netral", "Tidak Yakin"}


def test_negation_flips_positive_phrase():
    result = pipeline.run("gaji tidak sesuai dan tidak dibayar tepat waktu, kecewa")
    assert result.sentiment_label == "Negatif"


def test_job_role_tagging():
    assert pipeline.run("dicari sales motoris area bekasi").job_role == "Salesman"
    assert pipeline.run("gaji md toko sekarang berapa ya").job_role == "Merchandiser"
    assert pipeline.run("dibutuhkan spg mall untuk event").job_role == "SPG/SPB"
    assert pipeline.run("lowongan staff officer penempatan jakarta").job_role == "Staf Officer"
    assert pipeline.run("lowongan staff admin data entry").job_role == "Administrasi"
    # Posisi di luar lima posisi penempatan masuk Lainnya.
    assert pipeline.run("lowongan helper gudang di cikarang").job_role == "Lainnya"
    assert pipeline.run("kasir minimarket shift malam").job_role == "Lainnya"
    assert pipeline.run("cuaca hari ini cerah sekali").job_role == "Lainnya"


def test_job_role_triggers_match_whole_words():
    # "sales promotion" lebih spesifik daripada "sales" -> SPG/SPB, bukan Salesman.
    assert pipeline.run("loker sales promotion di mall").job_role == "SPG/SPB"
    # Akhiran -nya tetap cocok.
    assert pipeline.run("adminnya galak banget").job_role == "Administrasi"
    # "administrasi" pada "biaya administrasi" bukan penanda jenis pekerjaan.
    assert pipeline.run("diminta bayar biaya administrasi dulu").job_role == "Lainnya"
    # "md" tidak cocok di tengah kata.
    assert pipeline.run("cmd error terus").job_role == "Lainnya"


def test_job_roles_follow_siprama_positions():
    """Lima posisi penempatan PT Siprama Cakrawala, ditambah penampung Lainnya."""
    from app.taxonomy import JOB_ROLE_CODES, JOB_ROLE_TRIGGERS, JOB_ROLES

    assert JOB_ROLES == [
        "Salesman", "Merchandiser", "SPG/SPB", "Staf Officer", "Administrasi", "Lainnya"
    ]
    assert JOB_ROLES == [*JOB_ROLE_CODES.values(), "Lainnya"]
    # Setiap label selain Lainnya punya kata pemicu.
    assert list(JOB_ROLE_TRIGGERS) == JOB_ROLES[:-1]


def test_every_label_carries_its_classification_basis():
    result = pipeline.run("min gaji spg di bekasi udah umr belum? kecewa sama potongannya")
    assert set(result.explanation) == {"topic", "sentiment", "intent", "job_role"}
    for entry in result.explanation.values():
        assert entry["rule"]
    assert "gaji" in result.explanation["topic"]["triggers"]
    assert "spg" in result.explanation["job_role"]["triggers"]
    assert "?" in result.explanation["intent"]["triggers"]
    assert "kecewa" in result.explanation["sentiment"]["triggers"]


def test_fallback_labels_still_explain_themselves():
    result = pipeline.run("cuaca hari ini cerah sekali")
    assert result.explanation["job_role"]["triggers"] == []
    assert "Lainnya" in result.explanation["job_role"]["rule"]
    assert "belum terklasifikasi" in result.explanation["topic"]["rule"]


def test_engagement_formula_uses_configured_weights():
    assert engagement_score(10, 2, 4, 2) == 10 + 2 * 2 + 4 * 1.5 + 2 * 1.5


def test_relevance_not_dominated_by_engagement():
    """Post viral tanpa sinyal tekstual tidak boleh mengungguli post relevan."""
    viral_noise = pipeline.run("hari ini panas banget", likes=5000, reposts=5000)
    relevant = pipeline.run("berapa gaji staf gudang di cikarang sekarang?", likes=0)
    assert relevant.relevance_score > viral_noise.relevance_score


def test_insight_template_formats_indonesian_numbers():
    text = summarizer.summarize(
        {"topic": "Gaji dan Benefit", "share_percent": 18.42, "period": "Juli 2026",
         "change_percent": 12.5, "keywords": ["gaji", "lembur"]}
    )
    assert "Gaji dan Benefit" in text
    assert "18,4%" in text
    assert "naik 12,5%" in text


def test_insight_template_without_comparison():
    text = summarizer.summarize(
        {"topic": "Shift", "share_percent": 5.0, "period": "Juli", "change_percent": None}
    )
    assert "Tidak cukup data untuk membuat perbandingan" in text
