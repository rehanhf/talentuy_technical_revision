"use client";

import { AlertTriangle, ArrowRight, MessageCircleQuestion } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ChartWithTable,
  ConcernHeatmap,
  SentimentStackedChart,
  TopicBarChart,
  VolumeChart,
} from "@/components/charts";
import { ActiveFilterChips } from "@/components/filter-panel";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/shell";
import {
  Card,
  ChartSkeleton,
  DrillDownLink,
  ErrorState,
  NoResultState,
  SentimentBadge,
  Skeleton,
  Tag,
} from "@/components/ui";
import { useOverview } from "@/hooks/useApi";
import { useFilters } from "@/hooks/useFilters";
import { useReportMeta } from "@/hooks/useMeta";
import { ApiError } from "@/lib/api";
import { filtersToSearchParams, type GlobalFilters } from "@/lib/filters";
import {
  formatNumber,
  formatPercent,
  formatShortDate,
  truncate,
} from "@/lib/format";
import { useTaxonomy } from "@/hooks/useApi";

export default function HomePage() {
  const router = useRouter();
  const { apiParams, filters, setFilters, toggleValue, reset } = useFilters();
  const { data, isLoading, isError, error, refetch, isFetching } = useOverview(apiParams);
  const { data: taxonomy } = useTaxonomy();
  useReportMeta(data?.meta);

  const navigate = (path: string, changes: Partial<GlobalFilters> = {}) => {
    const [pathname, existingQuery] = path.split("?");
    const query = filtersToSearchParams({ ...filters, ...changes });
    new URLSearchParams(existingQuery).forEach((value, key) => query.set(key, value));
    router.push(`${pathname}?${query}`);
  };

  const topicSlugByName = (name: string) =>
    taxonomy?.topics.find((topic) => topic.name === name)?.slug;

  if (isError) {
    return (
      <>
        <PageHeader title="Ringkasan Percakapan Kandidat" />
        <Card title="Data tidak dapat ditampilkan">
          <ErrorState
            message={
              error instanceof ApiError
                ? error.userMessage
                : "Terjadi kesalahan tidak terduga."
            }
            onRetry={() => refetch()}
          />
        </Card>
      </>
    );
  }

  const kpis = data?.kpis;
  const isEmpty = !isLoading && data && kpis?.total_posts.value === 0;

  return (
    <>
      <PageHeader
        title="Ringkasan Percakapan Kandidat"
        subtitle={
          data
            ? `${filters.q ? `Query "${filters.q}" · ` : ""}Periode ${data.meta.period_label} · dibandingkan dengan periode sebelumnya yang sama panjang.`
            : "Menyiapkan ringkasan periode aktif…"
        }
        badge={
          data && (
            <Tag tone={data.meta.is_synthetic ? "warning" : "primary"}>
              {data.meta.is_synthetic ? "DATA DEMO" : "DATA LIVE"}
            </Tag>
          )
        }
        actions={
          <>
            {isFetching && !isLoading && <span role="status" className="text-xs text-muted">Memperbarui…</span>}
            <button type="button" className="tp-btn tp-btn-primary" onClick={() => navigate("/post")}>Telusuri post <ArrowRight className="h-4 w-4" aria-hidden /></button>
          </>
        }
      />

      <ActiveFilterChips />

      {/* Ukuran metrik mengikuti ruang konten, bukan lebar viewport. */}
      <div className="tp-metrics mb-5">
        {isLoading || !kpis
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[118px] w-full rounded-card" />
            ))
          : [
              <KpiCard
                key="total"
                emphasis
                label="Total Post"
                value={formatNumber(kpis.total_posts.value)}
                definition="Jumlah post publik yang lolos seluruh filter aktif pada periode terpilih."
                change={kpis.total_posts.change_percent}
                comparison={`${formatNumber(kpis.total_posts.previous)} pada periode sebelumnya`}
                onDrillDown={() => navigate("/post")}
                drillDownLabel="Lihat post"
              />,
              <KpiCard
                key="volume"
                label="Perubahan Volume"
                value={
                  kpis.volume_change.value === null
                    ? "Tidak cukup data"
                    : formatPercent(kpis.volume_change.value)
                }
                definition="Perbandingan jumlah post terhadap periode sebelumnya yang panjangnya sama. Ditampilkan sebagai 'tidak cukup data' bila periode pembanding kosong."
                comparison="Perbandingan antar periode"
                onDrillDown={() => navigate("/tren")}
                drillDownLabel="Buka analisis tren"
              />,
              <KpiCard
                key="topics"
                label="Topik Aktif"
                value={formatNumber(kpis.active_topics.value)}
                definition={`Topik dengan minimal ${kpis.active_topics.threshold} post pada periode ini. Dari total ${kpis.active_topics.total_topics} topik yang muncul.`}
                comparison={`dari ${kpis.active_topics.total_topics} topik terdeteksi`}
                onDrillDown={() => navigate("/topik")}
                drillDownLabel="Eksplorasi topik"
              />,
              <KpiCard
                key="sentiment"
                label="Sentimen Dominan"
                value={
                  <span className="flex items-center gap-2 text-lg">
                    <SentimentBadge label={kpis.dominant_sentiment.value} />
                  </span>
                }
                definition="Label sentimen dengan jumlah terbanyak. Label otomatis dapat salah memahami slang dan sarkasme, sehingga hanya dipakai sebagai konteks."
                comparison={`${formatPercent(kpis.dominant_sentiment.share)} dari seluruh post`}
                onDrillDown={() =>
                  setFilters({ sentiments: [kpis.dominant_sentiment.value] })
                }
                drillDownLabel="Terapkan sebagai filter"
              />,
              <KpiCard
                key="questions"
                label="Pertanyaan Terdeteksi"
                value={formatNumber(kpis.detected_questions.value)}
                definition="Post yang terdeteksi berisi pertanyaan. Paling berguna untuk menyusun FAQ dan konten edukasi rekrutmen."
                change={kpis.detected_questions.change_percent}
                comparison={`${formatPercent(kpis.detected_questions.share)} dari total post`}
                onDrillDown={() => navigate("/post", { intents: ["Pertanyaan"] })}
                drillDownLabel="Baca pertanyaan"
              />,
              <KpiCard
                key="role"
                label="Jenis Pekerjaan Teratas"
                value={<span className="text-lg">{kpis.top_job_role.value}</span>}
                definition="Jenis pekerjaan dengan volume percakapan tertinggi. Ditandai dari kata kunci pada teks, bukan dari identitas penulis."
                change={kpis.top_job_role.change_percent}
                comparison={`${formatNumber(kpis.top_job_role.count)} post (${formatPercent(kpis.top_job_role.share)})`}
                onDrillDown={() => setFilters({ job_roles: [kpis.top_job_role.value] })}
                drillDownLabel="Filter pekerjaan ini"
              />,
            ]}
      </div>

      {isEmpty && (
        <Card title="Tidak ada percakapan pada filter ini">
          <NoResultState query={filters.q} onReset={reset} />
        </Card>
      )}

      {!isEmpty && (
        <div className="tp-overview-grid grid items-start gap-5">
          <Card
            className="tp-chart-panel"
            title="Volume percakapan harian"
            description="Klik titik pada grafik untuk membuka post pada tanggal tersebut. Titik oranye menandai lonjakan terdeteksi."
            definition="Jumlah post per hari setelah filter. Lonjakan dideteksi dengan moving average dan z-score; label bersifat deskriptif, bukan pernyataan sebab-akibat."
          >
            {isLoading || !data ? (
              <ChartSkeleton />
            ) : (
              <ChartWithTable
                columns={["Tanggal", "Jumlah post"]}
                rows={data.volume_series.map((point) => [
                  formatShortDate(point.date),
                  point.count,
                ])}
                summary={`Volume harian pada ${data.meta.period_label}, total ${formatNumber(
                  data.kpis.total_posts.value,
                )} post.`}
              >
                <VolumeChart
                  series={data.volume_series}
                  peaks={data.peaks}
                  onSelectDate={(date) => navigate("/post", { date_from: date, date_to: date })}
                />
              </ChartWithTable>
            )}
          </Card>

          <Card
            title="Isu yang perlu diperhatikan"
            description="Pilih Buka topik untuk melihat detail. Gulir daftar untuk melihat isu lainnya."
            definition="Skor perhatian menggabungkan share sentimen negatif (50%), kenaikan volume (30%), dan porsi percakapan (20%). Ini adalah bantuan penyaringan, bukan kesimpulan."
          >
            {isLoading || !data ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : data.attention_issues.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                Tidak ada topik yang melewati ambang perhatian pada periode ini.
              </p>
            ) : (
              <ul className="max-h-[280px] space-y-2.5 overflow-y-auto pr-2" tabIndex={0} aria-label="Daftar isu yang perlu diperhatikan">
                {data.attention_issues.map((issue) => (
                  <li
                    key={issue.slug}
                    className="border-b border-line py-3 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium text-ink">{issue.name}</p>
                      <span className="tabular shrink-0 text-xs text-muted">
                        {formatNumber(issue.count)} post
                      </span>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {issue.reasons.map((reason) => (
                        <li key={reason} className="flex gap-1.5 text-[11px] text-muted">
                          <AlertTriangle
                            className="mt-0.5 h-3 w-3 shrink-0 text-warning-strong"
                            aria-hidden
                          />
                          {reason}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-1.5">
                      <DrillDownLink
                        label="Buka topik"
                        onClick={() => navigate(`/topik?fokus=${issue.slug}`)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            className="tp-chart-panel"
            title="Topik terbanyak"
            description="Klik batang untuk menambahkan topik ke filter global."
            definition="Jumlah post per topik. Topik ditentukan dari kecocokan kata kunci taxonomy dan dapat dikoreksi manual oleh pengguna."
          >
            {isLoading || !data ? (
              <ChartSkeleton height={300} />
            ) : (
              <ChartWithTable
                columns={["Topik", "Post", "Porsi (%)"]}
                rows={data.topics.map((topic) => [
                  topic.name,
                  topic.count,
                  topic.share.toFixed(1).replace(".", ","),
                ])}
                summary={`Distribusi ${data.topics.length} topik teratas pada periode aktif.`}
              >
                <TopicBarChart
                  topics={data.topics}
                  selected={filters.topics}
                  onSelect={(slug) => toggleValue("topics", slug)}
                />
              </ChartWithTable>
            )}
          </Card>

          <Card
            title="Sentimen per jenis pekerjaan"
            description="Klik batang untuk memfilter pekerjaan tersebut."
            definition="Distribusi sentimen dalam jumlah post. Label 'Tidak Yakin' dipakai saat keyakinan model rendah, dan tidak dipaksakan menjadi positif atau negatif."
          >
            {isLoading || !data ? (
              <ChartSkeleton height={300} />
            ) : (
              <ChartWithTable
                columns={["Pekerjaan", "Positif", "Netral", "Negatif", "Tidak Yakin"]}
                rows={data.sentiment_by_role.map((row) => [
                  row.job_role,
                  row.Positif,
                  row.Netral,
                  row.Negatif,
                  row["Tidak Yakin"],
                ])}
                summary="Perbandingan komposisi sentimen antar jenis pekerjaan."
              >
                <SentimentStackedChart
                  data={data.sentiment_by_role}
                  onSelectRole={(role) => toggleValue("job_roles", role)}
                />
              </ChartWithTable>
            )}
          </Card>

          <Card
            className="tp-chart-panel"
            title="Jenis pekerjaan × topik"
            description="Klik sel untuk membuka post pada kombinasi tersebut."
            definition="Matriks jumlah post. Sel gelap menandakan volume tinggi, bukan tingkat keparahan masalah."
          >
            {isLoading || !data ? (
              <ChartSkeleton height={280} />
            ) : (
              <ConcernHeatmap
                rows={data.heatmap.rows}
                columns={data.heatmap.columns}
                cells={data.heatmap.cells}
                maxCount={data.heatmap.max_count}
                onSelect={(jobRole, topicName) => {
                  const slug = topicSlugByName(topicName);
                  navigate("/post", {
                    job_roles: [jobRole],
                    topics: slug ? [slug] : filters.topics,
                  });
                }}
              />
            )}
          </Card>

          <Card
            title="Pertanyaan kandidat teratas"
            description="Bahan langsung untuk FAQ dan konten rekrutmen."
            definition="Post ber-intent 'Pertanyaan' dengan skor relevansi pencarian tertinggi. Skor menilai kecocokan teks, bukan kualitas penulisnya."
            actions={
              <DrillDownLink
                label="Semua pertanyaan"
                onClick={() => navigate("/post", { intents: ["Pertanyaan"] })}
              />
            }
          >
            {isLoading || !data ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : data.top_questions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                Belum ada pertanyaan terdeteksi pada filter ini.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {data.top_questions.map((question) => (
                  <li key={question.external_post_id} className="flex gap-2.5">
                    <MessageCircleQuestion
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] leading-relaxed text-ink">
                        {truncate(question.text, 140)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {question.job_role} · {question.topic} ·{" "}
                        {formatShortDate(question.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {data && (
        <p className="mt-5 rounded-card border border-line bg-surface-muted px-4 py-3 text-[11px] leading-relaxed text-muted">
          <strong className="font-medium text-ink">Batasan pembacaan.</strong>{" "}
          {data.limitations.slice(0, 3).join(" ")}{" "}
          <a href="/metodologi" className="text-primary underline underline-offset-2">
            Baca metodologi lengkap
          </a>
          .
        </p>
      )}
    </>
  );
}
