"use client";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  ClassificationBasis,
  Highlighted,
  LabelCorrection,
} from "@/components/classification-basis";
import { ActiveFilterChips } from "@/components/filter-panel";
import { PageHeader } from "@/components/shell";
import {
  Card,
  Drawer,
  ErrorState,
  NoResultState,
  SentimentBadge,
  TableSkeleton,
  Tag,
  Toast,
} from "@/components/ui";
import { useKeywordPresets, usePosts } from "@/hooks/useApi";
import { useFilters } from "@/hooks/useFilters";
import { useReportMeta } from "@/hooks/useMeta";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { KeywordPreset, LabelField, Post } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevansi" },
  { value: "recent", label: "Terbaru" },
  { value: "engagement", label: "Engagement tertinggi" },
];

export default function PostExplorerPage() {
  const { apiParams, filters, setFilters, reset } = useFilters();
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [queryInput, setQueryInput] = useState(filters.q ?? "");
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [basisFocus, setBasisFocus] = useState<LabelField | null>(null);
  const [correctionField, setCorrectionField] = useState<LabelField>("topic");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const presets = useKeywordPresets();

  const { data, isLoading, isError, error, refetch, isFetching } = usePosts(
    apiParams,
    sort,
    page,
    pageSize,
  );
  useReportMeta(data?.meta);

  useEffect(() => setQueryInput(filters.q ?? ""), [filters.q]);
  // Kembali ke halaman pertama setiap kali kriteria berubah.
  useEffect(() => setPage(1), [apiParams, sort, pageSize]);
  // Sorotan dasar klasifikasi selalu dimulai dari kata pencarian.
  useEffect(() => setBasisFocus(null), [activePost?.id]);

  // Preset dikelompokkan per kategori isu; disunting di Data & Pengaturan.
  const presetGroups = useMemo(() => {
    const groups = new Map<string, { name: string; items: KeywordPreset[] }>();
    for (const preset of presets.data ?? []) {
      if (!preset.is_active) continue;
      const group = groups.get(preset.topic_slug) ?? { name: preset.topic_name, items: [] };
      group.items.push(preset);
      groups.set(preset.topic_slug, group);
    }
    return [...groups.values()];
  }, [presets.data]);

  const highlightTerms = useMemo(() => data?.highlight_terms ?? [], [data]);
  const drawerTerms =
    activePost && basisFocus
      ? (activePost.explanation?.[basisFocus]?.triggers ?? [])
      : highlightTerms;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ q: queryInput.trim() || undefined });
  };

  if (isError) {
    return (
      <>
        <PageHeader title="Pencarian Post" />
        <Card title="Data tidak dapat ditampilkan">
          <ErrorState
            message={error instanceof ApiError ? error.userMessage : "Kesalahan tidak terduga."}
            onRetry={() => refetch()}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pencarian Post"
        subtitle="Post ditampilkan sebagai konteks percakapan. Skor relevansi menilai kecocokan teks dengan query, bukan kualitas atau kelayakan penulisnya."
        badge={data && <Tag tone="warning">{data.meta.is_synthetic ? "TERMASUK DATA DEMO" : "DATA NYATA"}</Tag>}
      />

      <Card
        title="Kata kunci pencarian"
        description="Operator yang didukung: AND, OR, dan -kata untuk mengecualikan. Gunakan tanda kutip untuk frasa."
        definition="Pencarian berjalan pada teks post yang telah dinormalisasi. Pencarian berdasarkan identitas personal tidak disediakan."
        className="mb-4"
      >
        <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder='Contoh: gaji AND gudang -penipuan atau "loker palsu"'
              aria-label="Kata kunci pencarian post"
              className="tp-input pl-9"
            />
          </div>
          <button type="submit" className="tp-btn tp-btn-primary shrink-0">
            Cari
          </button>
          {filters.q && (
            <button
              type="button"
              className="tp-btn shrink-0"
              onClick={() => {
                setQueryInput("");
                setFilters({ q: undefined });
              }}
            >
              Kosongkan
            </button>
          )}
        </form>

        {presetGroups.length > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Mulai dari preset kata kunci
            </p>
            <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {presetGroups.map((group) => (
                <div key={group.name} className="min-w-0">
                  <p className="mb-1 text-[11px] text-muted">{group.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((preset) => {
                      const active = filters.q === preset.query_text;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.query_text}
                          aria-pressed={active}
                          className={
                            active
                              ? "tp-chip border-primary bg-primary-soft text-primary"
                              : "tp-chip transition hover:border-primary hover:text-primary"
                          }
                          onClick={() => {
                            setQueryInput(preset.query_text);
                            setFilters({ q: preset.query_text });
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <ActiveFilterChips />

      <Card
        title={
          data ? `${formatNumber(data.total)} post ditemukan` : "Memuat hasil pencarian"
        }
        description={
          data
            ? `Halaman ${data.page} dari ${data.total_pages} · ${data.meta.period_label}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isFetching && !isLoading && (
              <span className="text-[11px] text-muted">Memperbarui…</span>
            )}
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Urutkan
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
                aria-label="Urutkan hasil"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              Per halaman
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
                aria-label="Jumlah hasil per halaman"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      >
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : !data || data.items.length === 0 ? (
          <NoResultState query={filters.q} onReset={reset} />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {data.items.map((post) => (
                <li key={post.id}>
                  <button
                    type="button"
                    onClick={() => setActivePost(post)}
                    className="w-full py-3 text-left transition hover:bg-surface-muted"
                    aria-label={`Buka detail post ${post.external_post_id}`}
                  >
                    <p className="text-[13px] leading-relaxed text-ink">
                      <Highlighted text={post.text} terms={highlightTerms} />
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                      <Tag tone={post.is_synthetic ? "warning" : "primary"}>{post.is_synthetic ? "DEMO" : post.source === "twitterapi_io" ? "twitterapi.io" : "DATA NYATA"}</Tag>
                      <SentimentBadge label={post.sentiment_label} />
                      <span>{post.intent_label}</span>
                      <span>{post.job_role}</span>
                      {post.topic_name && <span>{post.topic_name}</span>}
                      <span className="tabular">
                        Engagement {formatNumber(post.engagement_score)}
                      </span>
                      {sort === "relevance" && (
                        <span className="tabular">
                          Skor pencarian {post.relevance_score.toFixed(2).replace(".", ",")}
                        </span>
                      )}
                      <span>{formatDateTime(post.created_at_source)}</span>
                      {post.needs_review && <Tag tone="warning">Perlu ditinjau</Tag>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <nav
              className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3"
              aria-label="Navigasi halaman hasil"
            >
              <p className="text-xs text-muted">
                Menampilkan {(data.page - 1) * data.page_size + 1}–
                {Math.min(data.page * data.page_size, data.total)} dari{" "}
                {formatNumber(data.total)} post
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="tp-btn px-2 py-1.5"
                  disabled={data.page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <span className="tabular px-2 text-xs text-muted">
                  {data.page} / {data.total_pages}
                </span>
                <button
                  type="button"
                  className="tp-btn px-2 py-1.5"
                  disabled={data.page >= data.total_pages}
                  onClick={() => setPage((value) => value + 1)}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </nav>
          </>
        )}
      </Card>

      <Drawer
        open={Boolean(activePost)}
        onClose={() => setActivePost(null)}
        title="Detail post"
        subtitle={activePost ? `ID: ${activePost.external_post_id}` : undefined}
      >
        {activePost && (
          <div className="space-y-5">
            <p className="rounded-lg border border-line bg-surface-muted px-3.5 py-3 text-[13px] leading-relaxed text-ink">
              <Highlighted text={activePost.text} terms={drawerTerms} />
            </p>

            <ClassificationBasis
              post={activePost}
              focus={basisFocus}
              onFocus={setBasisFocus}
              onCorrect={(field) => {
                setCorrectionField(field);
                document
                  .getElementById("judul-koreksi")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              showConfidence
              canCorrect
            />

            <LabelCorrection
              post={activePost}
              field={correctionField}
              onFieldChange={setCorrectionField}
              onDone={({ message, tone, post }) => {
                setToast({ message, tone });
                if (post) setActivePost(post);
              }}
            />

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Metadata publik
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                {[
                  ["Tanggal", formatDateTime(activePost.created_at_source)],
                  ["Bahasa", activePost.language],
                  ["Sumber", activePost.source],
                  ["Suka", formatNumber(activePost.like_count)],
                  ["Repost", formatNumber(activePost.repost_count)],
                  ["Balasan", formatNumber(activePost.reply_count)],
                  ["Kutipan", formatNumber(activePost.quote_count)],
                  ["Engagement", formatNumber(activePost.engagement_score)],
                  [
                    "Skor pencarian",
                    activePost.relevance_score.toFixed(3).replace(".", ","),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted">{label}</dt>
                    <dd className="tabular mt-0.5 text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Identitas penulis sengaja tidak ditampilkan. Dashboard tidak menyediakan
                pencarian atau profiling berdasarkan individu.
              </p>
            </section>

            {activePost.keywords.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Kata kunci terdeteksi
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {activePost.keywords.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      className="tp-chip transition hover:border-primary hover:text-primary"
                      onClick={() => {
                        setFilters({ q: keyword });
                        setActivePost(null);
                      }}
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="border-t border-line pt-3">
              {activePost.url ? (
                <a
                  href={activePost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  Buka post asli
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : (
                <p className="text-[11px] text-muted">
                  Tautan post asli tidak tersedia untuk record ini.
                </p>
              )}
              {activePost.is_synthetic && (
                <p className="mt-2 text-[11px] text-warning-strong">
                  Post ini adalah data sintetis untuk keperluan prototipe dan tidak
                  merepresentasikan percakapan nyata.
                </p>
              )}
              {activePost.model_version && (
                <p className="mt-1.5 text-[11px] text-muted">
                  Versi model: {activePost.model_version}
                </p>
              )}
            </section>
          </div>
        )}
      </Drawer>

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
