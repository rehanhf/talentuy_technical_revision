"use client";

import { Layers, MessageCircleQuestion } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { KeywordNetwork, VolumeChart } from "@/components/charts";
import { ActiveFilterChips } from "@/components/filter-panel";
import { PageHeader } from "@/components/shell";
import {
  Card,
  ChartSkeleton,
  Drawer,
  ErrorState,
  InlineLoader,
  NoResultState,
  SentimentBadge,
  Skeleton,
  TableSkeleton,
  Tag,
} from "@/components/ui";
import { useTopicDetail, useTopics } from "@/hooks/useApi";
import { useFilters } from "@/hooks/useFilters";
import { useReportMeta } from "@/hooks/useMeta";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { filtersToSearchParams } from "@/lib/filters";
import { formatNumber, formatPercent, formatShortDate, truncate } from "@/lib/format";
import type { TopicRolePartition } from "@/lib/types";

const PARTITION_PREVIEW = 6;

function PartitionCard({
  partition,
  onOpenPosts,
  onFilter,
}: {
  partition: TopicRolePartition;
  onOpenPosts: () => void;
  onFilter: () => void;
}) {
  return (
    <article className="flex flex-col rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: partition.color }}
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink">
          {partition.topic_name}
          <span className="font-normal text-muted"> × </span>
          {partition.job_role}
        </h3>
      </div>
      <p className="tabular mt-1 text-[11px] text-muted">
        {formatNumber(partition.count)} post · {formatPercent(partition.share)} ·{" "}
        {formatNumber(partition.questions)} pertanyaan
      </p>
      {partition.negative_share >= 25 && (
        <span className="mt-1.5 self-start">
          <Tag tone="warning">{formatPercent(partition.negative_share)} negatif</Tag>
        </span>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={onOpenPosts}
          className="text-xs font-medium text-primary hover:underline"
        >
          Lihat post
        </button>
        <button type="button" onClick={onFilter} className="text-xs text-muted hover:text-ink">
          Terapkan sebagai filter
        </button>
      </div>
    </article>
  );
}

function TopicExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apiParams, filters, toggleValue, setFilters, reset } = useFilters();
  const { data, isLoading, isError, error, refetch } = useTopics(apiParams);
  useReportMeta(data?.meta);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [showAllPartitions, setShowAllPartitions] = useState(false);
  const { data: detail, isLoading: detailLoading } = useTopicDetail(activeSlug, apiParams);

  // Mendukung tautan drill-down dari Overview (?fokus=slug).
  useEffect(() => {
    const focus = searchParams.get("fokus");
    if (focus) setActiveSlug(focus);
  }, [searchParams]);

  if (isError) {
    return (
      <>
        <PageHeader title="Eksplorasi Topik" />
        <Card title="Data tidak dapat ditampilkan">
          <ErrorState
            message={error instanceof ApiError ? error.userMessage : "Kesalahan tidak terduga."}
            onRetry={() => refetch()}
          />
        </Card>
      </>
    );
  }

  const isEmpty = !isLoading && data && data.topics.length === 0;

  return (
    <>
      <PageHeader
        title="Eksplorasi Topik"
        subtitle={
          data
            ? `${formatNumber(data.total_posts)} post terklasifikasi ke dalam ${data.topics.length} topik pada ${data.meta.period_label}.`
            : "Menyiapkan daftar topik…"
        }
      />

      <ActiveFilterChips />

      {isEmpty ? (
        <Card title="Tidak ada topik pada filter ini">
          <NoResultState query={filters.q} onReset={reset} />
        </Card>
      ) : (
        <div className="grid gap-4">
          {/*
           * Baris atas: sebaran kata kunci di kiri, komposisi topik di kanan —
           * mengikuti rancangan antarmuka.
           */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Card
              title="Sebaran kata kunci"
              description="Ukuran kata merepresentasikan frekuensi kemunculan. Klik kata untuk menjadikannya kata kunci pencarian."
              definition="Kata kunci diekstraksi per post. Garis penghubung berarti dua kata sering muncul pada post yang sama."
            >
              {isLoading || !data ? (
                <ChartSkeleton height={300} />
              ) : (
                <KeywordNetwork
                  nodes={data.related_keywords.nodes}
                  edges={data.related_keywords.edges}
                  activeKeyword={filters.q}
                  onSelect={(keyword) => {
                    setFilters({ q: keyword });
                    router.push("/post");
                  }}
                />
              )}
            </Card>

            <Card
              title="Komposisi topik"
              description="Proporsi percakapan pada setiap kategori isu."
              definition="Proporsi dihitung terhadap seluruh post terklasifikasi pada filter aktif."
            >
              {isLoading || !data ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-9 w-full" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {data.topics.slice(0, 8).map((topic) => (
                    <li key={topic.slug}>
                      <button
                        type="button"
                        onClick={() => toggleValue("topics", topic.slug)}
                        className="w-full rounded-lg px-1 py-0.5 text-left transition hover:bg-surface-muted"
                        aria-label={`Saring menurut topik ${topic.name}`}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-[13px] text-ink">
                            {topic.name}
                          </span>
                          <span className="tabular shrink-0 text-[11px] font-medium text-muted">
                            {formatPercent(topic.share)}
                          </span>
                        </span>
                        <span className="mt-1 block h-2 overflow-hidden rounded-full bg-surface-muted">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              // `share` sudah dalam satuan persen (0–100).
                              width: `${Math.max(topic.share, 2)}%`,
                              backgroundColor: topic.color,
                            }}
                            aria-hidden
                          />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Baris bawah: partisi isu x pekerjaan di kiri, daftar topik di kanan. */}
          <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Kategori isu × jenis pekerjaan"
            description="Satu kartu untuk setiap kombinasi yang muncul pada filter aktif, diurutkan dari volume terbesar."
            definition="Jenis pekerjaan mengikuti lima posisi yang ditempatkan PT Siprama Cakrawala (Salesman, Merchandiser, SPG/SPB, Staf Officer, Administrasi) ditambah Lainnya. Persentase dihitung terhadap seluruh post terklasifikasi."
          >
            {isLoading || !data ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[86px] w-full" />
                ))}
              </div>
            ) : data.partitions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                Belum ada kombinasi kategori isu dan jenis pekerjaan pada filter ini.
              </p>
            ) : (
              <>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {(showAllPartitions
                    ? data.partitions
                    : data.partitions.slice(0, PARTITION_PREVIEW)
                  ).map((partition) => (
                    <PartitionCard
                      key={`${partition.topic_slug}|${partition.job_role}`}
                      partition={partition}
                      onOpenPosts={() => {
                        // URL dibangun langsung: setFilters + push akan ditimpa
                        // sinkronisasi URL halaman ini (router.replace).
                        const query = filtersToSearchParams({
                          ...filters,
                          topics: [partition.topic_slug],
                          job_roles: [partition.job_role],
                        });
                        router.push(`/post?${query}`);
                      }}
                      onFilter={() =>
                        setFilters({
                          topics: [partition.topic_slug],
                          job_roles: [partition.job_role],
                        })
                      }
                    />
                  ))}
                </div>
                {data.partitions.length > PARTITION_PREVIEW && (
                  <button
                    type="button"
                    className="tp-btn mt-3"
                    aria-expanded={showAllPartitions}
                    onClick={() => setShowAllPartitions((value) => !value)}
                  >
                    {showAllPartitions
                      ? "Tampilkan lebih sedikit"
                      : `Tampilkan semua (${data.partitions.length} kombinasi)`}
                  </button>
                )}
              </>
            )}
          </Card>

          <Card
            title="Daftar topik"
            description="Klik baris untuk melihat detail topik."
            definition="Proporsi dihitung terhadap seluruh post terklasifikasi pada filter aktif."
          >
            {isLoading || !data ? (
              <TableSkeleton rows={6} />
            ) : (
              <div className="tp-scroll-x">
                <table className="w-full min-w-[460px] text-xs">
                  <caption className="sr-only">
                    Daftar kategori isu beserta jumlah, proporsi, dan sentimen dominan.
                  </caption>
                  <thead className="tp-thead">
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Nama topik</th>
                      <th scope="col">Jumlah</th>
                      <th scope="col">Proporsi</th>
                      <th scope="col">Sentimen dominan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topics.map((topic, index) => (
                      <tr
                        key={topic.slug}
                        className={cn(
                          "border-b border-line last:border-0",
                          filters.topics.includes(topic.slug) && "bg-primary-soft",
                        )}
                      >
                        <td className="tabular py-2 text-muted">{index + 1}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => setActiveSlug(topic.slug)}
                            className="flex items-center gap-2 text-left font-medium text-ink hover:text-primary hover:underline"
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: topic.color }}
                              aria-hidden
                            />
                            {topic.name}
                          </button>
                        </td>
                        <td className="tabular py-2 font-medium">
                          {formatNumber(topic.count)}
                        </td>
                        <td className="tabular py-2 text-muted">
                          {formatPercent(topic.share)}
                        </td>
                        <td className="py-2">
                          <SentimentBadge label={topic.dominant_sentiment} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          </div>

          <Card
            title="Pertanyaan yang sering muncul"
            description="Kandidat konten FAQ untuk komunikasi rekrutmen."
            definition="Post ber-intent 'Pertanyaan' diurutkan berdasarkan relevansi pencarian."
          >
              {isLoading || !data ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : data.questions.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">
                  Belum ada pertanyaan terdeteksi pada filter ini.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {data.questions.map((question) => (
                    <li key={question.external_post_id} className="flex gap-2.5">
                      <MessageCircleQuestion
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-relaxed text-ink">
                          {truncate(question.text, 130)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {question.topic} · {question.job_role}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </div>
      )}

      <Drawer
        open={Boolean(activeSlug)}
        onClose={() => setActiveSlug(null)}
        title={detail?.topic?.name ?? "Detail topik"}
        subtitle={
          detail?.topic
            ? `${formatNumber(detail.topic.count)} post · ${formatPercent(detail.topic.share)} dari percakapan periode ini`
            : undefined
        }
        width="max-w-2xl"
        footer={
          activeSlug && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="tp-btn tp-btn-primary"
                onClick={() => {
                  setFilters({ topics: [activeSlug] });
                  router.push("/post");
                }}
              >
                Lihat post topik ini
              </button>
              <button
                type="button"
                className="tp-btn"
                onClick={() => {
                  toggleValue("topics", activeSlug);
                  setActiveSlug(null);
                }}
              >
                {filters.topics.includes(activeSlug)
                  ? "Hapus dari filter global"
                  : "Tambahkan ke filter global"}
              </button>
            </div>
          )
        }
      >
        {detailLoading || !detail ? (
          <InlineLoader label="Memuat detail topik" />
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-primary/20 bg-primary-soft px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                <Layers className="h-3.5 w-3.5" aria-hidden />
                Draft ringkasan (perlu ditinjau)
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
                {detail.suggested_summary}
              </p>
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Volume harian topik
              </h3>
              <VolumeChart series={detail.series} peaks={detail.peaks} height={180} />
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Sentimen
                </h3>
                <ul className="space-y-1.5">
                  {detail.sentiment.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-2">
                      <SentimentBadge label={item.label} />
                      <span className="tabular text-xs text-muted">
                        {formatNumber(item.count)} ({formatPercent(item.share)})
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Kategori percakapan
                </h3>
                <ul className="space-y-1.5">
                  {detail.intents.slice(0, 5).map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-ink">{item.label}</span>
                      <span className="tabular text-muted">
                        {formatNumber(item.count)} ({formatPercent(item.share)})
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Jenis pekerjaan terkait
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.job_roles.map((role) => (
                  <button
                    key={role.label}
                    type="button"
                    className="tp-chip transition hover:border-primary hover:text-primary"
                    onClick={() => toggleValue("job_roles", role.label)}
                  >
                    {role.label}
                    <span className="tabular text-muted">{formatNumber(role.count)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Kata kunci terkait
              </h3>
              <KeywordNetwork
                nodes={detail.related_keywords.nodes}
                edges={detail.related_keywords.edges}
                onSelect={(keyword) => {
                  setFilters({ q: keyword, topics: activeSlug ? [activeSlug] : [] });
                  setActiveSlug(null);
                  router.push("/post");
                }}
              />
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Contoh post representatif
              </h3>
              <ul className="space-y-2">
                {detail.questions.slice(0, 5).map((question) => (
                  <li
                    key={question.external_post_id}
                    className="rounded-lg border border-line px-3 py-2"
                  >
                    <p className="text-[13px] leading-relaxed text-ink">{question.text}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {question.job_role} · {formatShortDate(question.created_at)} ·{" "}
                      {question.external_post_id}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </Drawer>
    </>
  );
}

export default function TopicPage() {
  return (
    <Suspense fallback={<InlineLoader label="Memuat eksplorasi topik" />}>
      <TopicExplorer />
    </Suspense>
  );
}
