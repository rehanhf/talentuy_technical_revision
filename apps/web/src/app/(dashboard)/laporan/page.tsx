"use client";

import {
  Check,
  Download,
  FileDown,
  FileText,
  Lightbulb,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { PageHeader } from "@/components/shell";
import {
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  InlineLoader,
  TableSkeleton,
  Tag,
  Toast,
} from "@/components/ui";
import {
  useCreateInsight,
  useCreateReport,
  useDeleteInsight,
  useDeleteReport,
  useInsightSuggestions,
  useInsights,
  useReportPreview,
  useReports,
  useUpdateInsight,
} from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useFilters } from "@/hooks/useFilters";
import { ApiError, downloadFile } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { HumanStatus, Insight, SuggestedInsight } from "@/lib/types";

const STATUS_LABEL: Record<HumanStatus, string> = {
  draft: "Rekomendasi untuk Ditinjau",
  reviewed: "Sudah ditinjau",
  approved: "Disetujui",
};

const STATUS_STYLE: Record<HumanStatus, string> = {
  draft: "bg-warning/10 text-warning-strong border-warning/25",
  reviewed: "bg-primary-soft text-primary-strong border-primary/20",
  approved: "bg-positive/10 text-positive-strong border-positive/20",
};

const STATUS_TABS: Array<{ value: HumanStatus | "all"; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Untuk ditinjau" },
  { value: "reviewed", label: "Sudah ditinjau" },
  { value: "approved", label: "Disetujui" },
];

const CHART_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "volume", label: "Volume percakapan harian" },
  { key: "topics", label: "Topik terbanyak" },
  { key: "sentiment", label: "Distribusi sentimen" },
  { key: "job_roles", label: "Jenis pekerjaan teratas" },
  { key: "intents", label: "Kategori intent" },
];

function StatusBadge({ status }: { status: HumanStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function ReportPage() {
  const { user } = useAuth();
  // Penulis dan penyunting isi terakhir tidak dapat menyetujui insight.
  const isOwnWork = (insight: Insight) =>
    Boolean(user) &&
    (insight.created_by === user?.id || insight.last_edited_by === user?.id);
  const { filters, apiParams } = useFilters();

  const insightsQuery = useInsights();
  const reportsQuery = useReports();
  const suggestionsQuery = useInsightSuggestions(apiParams);

  const createInsight = useCreateInsight();
  const updateInsight = useUpdateInsight();
  const deleteInsight = useDeleteInsight();
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();

  const [statusTab, setStatusTab] = useState<HumanStatus | "all">("all");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [editing, setEditing] = useState<Insight | null>(null);
  const [note, setNote] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    { kind: "insight" | "report"; id: string; title: string } | null
  >(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );
  const [exporting, setExporting] = useState<string | null>(null);

  const [reportTitle, setReportTitle] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([
    "volume",
    "topics",
    "sentiment",
  ]);
  const [builderError, setBuilderError] = useState<string | null>(null);

  const insights = useMemo(() => insightsQuery.data ?? [], [insightsQuery.data]);
  const visibleInsights = useMemo(
    () =>
      statusTab === "all"
        ? insights
        : insights.filter((item) => item.human_status === statusTab),
    [insights, statusTab],
  );

  const preview = useReportPreview(previewId);

  const saveSuggestion = async (suggestion: SuggestedInsight) => {
    try {
      await createInsight.mutateAsync({
        title: suggestion.title,
        summary: suggestion.summary,
        human_note: "",
        evidence_filters: suggestion.evidence_filters,
        metric_snapshot: suggestion.metric_snapshot,
        human_status: "draft",
      });
      setToast({
        message: "Rekomendasi disimpan sebagai draft untuk ditinjau.",
        tone: "success",
      });
    } catch (caught) {
      setToast({
        message: caught instanceof ApiError ? caught.userMessage : "Gagal menyimpan.",
        tone: "error",
      });
    }
  };

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await updateInsight.mutateAsync({ id: editing.id, body: { human_note: note } });
      const approvalDropped =
        editing.human_status === "approved" && note !== editing.human_note;
      setToast({
        message: approvalDropped
          ? "Catatan tersimpan. Persetujuan gugur dan status kembali ke draft."
          : "Catatan peninjau tersimpan.",
        tone: "success",
      });
      setEditing(null);
    } catch (caught) {
      setToast({
        message:
          caught instanceof ApiError ? caught.userMessage : "Gagal menyimpan catatan.",
        tone: "error",
      });
    }
  };

  const changeStatus = async (insight: Insight, status: HumanStatus) => {
    try {
      await updateInsight.mutateAsync({ id: insight.id, body: { human_status: status } });
      setToast({
        message: `Status diubah menjadi "${STATUS_LABEL[status]}".`,
        tone: "success",
      });
    } catch (caught) {
      setToast({
        message:
          caught instanceof ApiError ? caught.userMessage : "Gagal mengubah status.",
        tone: "error",
      });
    }
  };

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
    setBuilderError(null);
    if (!reportTitle.trim()) return setBuilderError("Judul laporan wajib diisi.");
    if (selectedInsights.length === 0) {
      return setBuilderError(
        "Pilih minimal satu insight agar laporan memiliki temuan yang ditinjau manusia.",
      );
    }
    try {
      const report = await createReport.mutateAsync({
        title: reportTitle.trim(),
        period_start: `${filters.date_from}T00:00:00`,
        period_end: `${filters.date_to}T23:59:59`,
        insight_ids: selectedInsights,
        charts: selectedCharts,
        notes: reportNotes,
        query_snapshot: {
          q: filters.q,
          data_type: filters.data_type ?? "all",
          query_id: filters.query_id,
          job_roles: filters.job_roles,
          topics: filters.topics,
          sentiments: filters.sentiments,
          intents: filters.intents,
        },
      });
      setBuilderOpen(false);
      setReportTitle("");
      setReportNotes("");
      setSelectedInsights([]);
      setToast({ message: "Laporan berhasil disusun.", tone: "success" });
      setPreviewId(report.id);
    } catch (caught) {
      setBuilderError(
        caught instanceof ApiError ? caught.userMessage : "Laporan gagal disimpan.",
      );
    }
  };

  const exportReport = async (id: string, format: "pdf" | "csv" | "posts") => {
    setExporting(`${id}-${format}`);
    try {
      await downloadFile(
        `/reports/${id}/export?format=${format}`,
        `tid-laporan.${format === "pdf" ? "pdf" : "csv"}`,
      );
      setToast({ message: "Berkas ekspor diunduh.", tone: "success" });
    } catch (caught) {
      setToast({
        message: caught instanceof ApiError ? caught.userMessage : "Ekspor gagal.",
        tone: "error",
      });
    } finally {
      setExporting(null);
    }
  };

  const confirmDelete = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === "insight") await deleteInsight.mutateAsync(confirm.id);
      else await deleteReport.mutateAsync(confirm.id);
      setToast({ message: "Data berhasil dihapus.", tone: "success" });
    } catch (caught) {
      setToast({
        message: caught instanceof ApiError ? caught.userMessage : "Gagal menghapus.",
        tone: "error",
      });
    } finally {
      setConfirm(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Laporan Insight"
        subtitle="Temuan disusun manusia. Ringkasan otomatis hanya berupa rekomendasi yang wajib ditinjau sebelum dipakai sebagai bahan komunikasi."
        actions={
          <>
            <button
              type="button"
              className="tp-btn"
              onClick={() => setSuggestionsOpen(true)}
            >
              <Lightbulb className="h-4 w-4" aria-hidden />
              Saran dari data
            </button>
            <button
              type="button"
              className="tp-btn tp-btn-primary"
              onClick={() => setBuilderOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Susun laporan
            </button>
          </>
        }
      />

      <div className="mb-4 rounded-card border border-warning/25 bg-warning/5 px-4 py-3 text-[11px] leading-relaxed text-ink">
        <strong className="font-medium">DATA SINTETIS — BUKAN TEMUAN AKTUAL.</strong>{" "}
        Seluruh laporan pada mode demo memuat watermark yang sama dan tidak boleh dipakai
        sebagai dasar keputusan ketenagakerjaan.
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card
          title="Insight"
          description="Setiap insight memiliki status peninjauan agar jelas mana yang sudah divalidasi manusia."
          actions={
            <div
              className="flex flex-wrap gap-1"
              role="tablist"
              aria-label="Filter status insight"
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={statusTab === tab.value}
                  onClick={() => setStatusTab(tab.value)}
                  className={`tp-chip transition ${
                    statusTab === tab.value
                      ? "border-primary bg-primary-soft text-primary-strong"
                      : "hover:border-primary/40"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
        >
          {insightsQuery.isError ? (
            <ErrorState
              message={
                insightsQuery.error instanceof ApiError
                  ? insightsQuery.error.userMessage
                  : "Kesalahan tidak terduga."
              }
              onRetry={() => insightsQuery.refetch()}
            />
          ) : insightsQuery.isLoading ? (
            <TableSkeleton rows={4} />
          ) : visibleInsights.length === 0 ? (
            <EmptyState
              title="Belum ada insight pada status ini"
              description="Buka “Saran dari data” untuk melihat rekomendasi berbasis periode dan filter yang sedang aktif, lalu tinjau sebelum disimpan ke laporan."
              action={
                <button
                  type="button"
                  className="tp-btn"
                  onClick={() => setSuggestionsOpen(true)}
                >
                  Lihat saran dari data
                </button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {visibleInsights.map((insight) => (
                <li key={insight.id} className="rounded-lg border border-line p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 text-sm font-semibold text-ink">
                      {insight.title}
                    </h3>
                    <StatusBadge status={insight.human_status} />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {insight.summary}
                  </p>
                  {insight.human_note && (
                    <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-relaxed text-ink">
                      <span className="font-medium">Catatan peninjau: </span>
                      {insight.human_note}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-muted">
                    {insight.author_name ?? "Tanpa penulis"} ·{" "}
                    {formatDate(insight.created_at)}
                    {insight.is_synthetic_data && " · berbasis data sintetis"}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-line pt-2.5">
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        setEditing(insight);
                        setNote(insight.human_note);
                      }}
                    >
                      Tulis catatan
                    </button>
                    {insight.human_status !== "reviewed" && (
                      <button
                        type="button"
                        className="text-xs text-muted hover:text-ink"
                        onClick={() => changeStatus(insight, "reviewed")}
                      >
                        Tandai sudah ditinjau
                      </button>
                    )}
                    {insight.human_status !== "approved" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => changeStatus(insight, "approved")}
                        disabled={isOwnWork(insight)}
                        title={isOwnWork(insight) ? "Persetujuan harus oleh pengguna lain" : undefined}
                      >
                        <Check className="h-3 w-3" aria-hidden />
                        Setujui
                      </button>
                    )}
                    {!insight.first_approved_at && insight.human_status !== "approved" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-negative-strong hover:underline"
                        onClick={() =>
                          setConfirm({
                            kind: "insight",
                            id: insight.id,
                            title: insight.title,
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        Hapus
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Laporan tersimpan"
          description="Laporan menyalin periode, query, statistik agregat, dan grafik terpilih pada saat disusun."
        >
          {reportsQuery.isError ? (
            <ErrorState
              message={
                reportsQuery.error instanceof ApiError
                  ? reportsQuery.error.userMessage
                  : "Kesalahan tidak terduga."
              }
              onRetry={() => reportsQuery.refetch()}
            />
          ) : reportsQuery.isLoading ? (
            <TableSkeleton rows={3} />
          ) : (reportsQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon={<FileText className="h-5 w-5" aria-hidden />}
              title="Belum ada laporan"
              description="Susun laporan dari insight yang sudah ditinjau, lalu ekspor sebagai PDF atau CSV agregat untuk kebutuhan internal."
              action={
                <button
                  type="button"
                  className="tp-btn tp-btn-primary"
                  onClick={() => setBuilderOpen(true)}
                >
                  Susun laporan pertama
                </button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {(reportsQuery.data ?? []).map((report) => (
                <li key={report.id} className="rounded-lg border border-line p-3.5">
                  <h3 className="text-sm font-semibold text-ink">{report.title}</h3>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {formatDate(report.period_start)} – {formatDate(report.period_end)} ·{" "}
                    {report.insight_ids.length} insight · dibuat{" "}
                    {formatDateTime(report.generated_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {report.charts.map((chart) => (
                      <Tag key={chart}>
                        {CHART_OPTIONS.find((item) => item.key === chart)?.label ?? chart}
                      </Tag>
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-line pt-2.5">
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setPreviewId(report.id)}
                    >
                      Pratinjau
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                      onClick={() => exportReport(report.id, "pdf")}
                      disabled={exporting === `${report.id}-pdf`}
                    >
                      <FileDown className="h-3 w-3" aria-hidden />
                      {exporting === `${report.id}-pdf` ? "Menyiapkan…" : "PDF"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                      onClick={() => exportReport(report.id, "csv")}
                      disabled={exporting === `${report.id}-csv`}
                    >
                      <Download className="h-3 w-3" aria-hidden />
                      CSV agregat
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                      onClick={() => exportReport(report.id, "posts")}
                      disabled={exporting === `${report.id}-posts`}
                      title="Ekspor post-level dibatasi pada Post ID dan tautan."
                    >
                      <Download className="h-3 w-3" aria-hidden />
                      Post ID
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-negative-strong hover:underline"
                      onClick={() =>
                        setConfirm({
                          kind: "report",
                          id: report.id,
                          title: report.title,
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------ saran insight */}
      <Drawer
        open={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        title="Saran insight dari data"
        subtitle="Dibangkitkan dari template berbasis statistik periode aktif. Bukan kesimpulan final."
      >
        {suggestionsQuery.isLoading ? (
          <TableSkeleton rows={3} />
        ) : suggestionsQuery.isError ? (
          <ErrorState
            message={
              suggestionsQuery.error instanceof ApiError
                ? suggestionsQuery.error.userMessage
                : "Kesalahan tidak terduga."
            }
            onRetry={() => suggestionsQuery.refetch()}
          />
        ) : (suggestionsQuery.data?.suggestions ?? []).length === 0 ? (
          <EmptyState
            title="Belum ada saran untuk filter ini"
            description="Perlebar rentang tanggal atau kurangi filter agar tersedia cukup percakapan untuk diringkas."
          />
        ) : (
          <div className="space-y-3">
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-[11px] leading-relaxed text-muted">
              {suggestionsQuery.data?.notice}
            </p>
            {(suggestionsQuery.data?.suggestions ?? []).map((suggestion, index) => (
              <article key={index} className="rounded-lg border border-line p-3.5">
                <h3 className="text-sm font-semibold text-ink">{suggestion.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  {suggestion.summary}
                </p>
                <button
                  type="button"
                  className="tp-btn mt-2.5 px-2.5 py-1 text-xs"
                  onClick={() => saveSuggestion(suggestion)}
                  disabled={createInsight.isPending}
                >
                  Simpan sebagai draft
                </button>
              </article>
            ))}
          </div>
        )}
      </Drawer>

      {/* -------------------------------------------------- catatan peninjau */}
      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Catatan peninjau"
        subtitle={editing?.title}
        width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="tp-btn" onClick={() => setEditing(null)}>
              Batal
            </button>
            <button
              type="submit"
              form="form-catatan"
              className="tp-btn tp-btn-primary"
              disabled={updateInsight.isPending}
            >
              {updateInsight.isPending ? "Menyimpan…" : "Simpan catatan"}
            </button>
          </div>
        }
      >
        <form id="form-catatan" onSubmit={saveNote} className="space-y-3">
          <label htmlFor="catatan" className="tp-label">
            Interpretasi manusia
          </label>
          <textarea
            id="catatan"
            className="tp-input min-h-[160px]"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Contoh: kenaikan pertanyaan soal shift muncul setelah pembukaan lowongan gudang. Perlu FAQ tentang pola shift."
          />
          <p className="text-[11px] leading-relaxed text-muted">
            Catatan ini ikut tercetak pada laporan sebagai konteks manusia atas angka yang
            ditampilkan.
          </p>
        </form>
      </Drawer>

      {/* ---------------------------------------------------- report builder */}
      <Drawer
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        title="Susun laporan"
        subtitle={`Periode mengikuti filter aktif: ${formatDate(filters.date_from)} – ${formatDate(filters.date_to)}`}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="tp-btn" onClick={() => setBuilderOpen(false)}>
              Batal
            </button>
            <button
              type="submit"
              form="form-laporan"
              className="tp-btn tp-btn-primary"
              disabled={createReport.isPending}
            >
              {createReport.isPending ? "Menyimpan…" : "Simpan laporan"}
            </button>
          </div>
        }
      >
        <form id="form-laporan" onSubmit={submitReport} className="space-y-4" noValidate>
          <div>
            <label htmlFor="report-title" className="tp-label">
              Judul laporan
            </label>
            <input
              id="report-title"
              className="tp-input"
              value={reportTitle}
              onChange={(event) => setReportTitle(event.target.value)}
              placeholder="Contoh: Ringkasan percakapan kandidat gudang — Agustus"
            />
          </div>

          <div>
            <span className="tp-label">Insight yang disertakan</span>
            {insights.length === 0 ? (
              <p className="text-xs text-muted">
                Belum ada insight. Simpan minimal satu rekomendasi terlebih dahulu.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {insights.map((insight) => (
                  <li key={insight.id}>
                    <label className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-xs">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedInsights.includes(insight.id)}
                        onChange={() =>
                          setSelectedInsights((current) =>
                            current.includes(insight.id)
                              ? current.filter((id) => id !== insight.id)
                              : [...current, insight.id],
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">
                          {insight.title}
                        </span>
                        <span className="block text-muted">
                          {STATUS_LABEL[insight.human_status]}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <span className="tp-label">Grafik agregat</span>
            <div className="flex flex-wrap gap-1.5">
              {CHART_OPTIONS.map((chart) => (
                <button
                  key={chart.key}
                  type="button"
                  aria-pressed={selectedCharts.includes(chart.key)}
                  onClick={() =>
                    setSelectedCharts((current) =>
                      current.includes(chart.key)
                        ? current.filter((key) => key !== chart.key)
                        : [...current, chart.key],
                    )
                  }
                  className={`tp-chip transition ${
                    selectedCharts.includes(chart.key)
                      ? "border-primary bg-primary-soft text-primary-strong"
                      : "hover:border-primary/40"
                  }`}
                >
                  {chart.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Maksimal enam grafik per laporan. Seluruh grafik bersifat agregat.
            </p>
          </div>

          <div>
            <label htmlFor="report-notes" className="tp-label">
              Catatan laporan (opsional)
            </label>
            <textarea
              id="report-notes"
              className="tp-input min-h-[96px]"
              value={reportNotes}
              onChange={(event) => setReportNotes(event.target.value)}
              placeholder="Konteks tambahan, batasan pembacaan, atau tindak lanjut yang disarankan."
            />
          </div>

          {builderError && (
            <p
              role="alert"
              className="rounded-lg border border-negative/20 bg-negative/5 px-3 py-2 text-xs text-negative-strong"
            >
              {builderError}
            </p>
          )}
        </form>
      </Drawer>

      {/* --------------------------------------------------------- pratinjau */}
      <Drawer
        open={Boolean(previewId)}
        onClose={() => setPreviewId(null)}
        title="Pratinjau laporan"
        subtitle="Isi yang sama akan tercetak pada berkas ekspor."
        width="max-w-3xl"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="tp-btn" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" aria-hidden />
              Cetak
            </button>
            <button
              type="button"
              className="tp-btn tp-btn-primary"
              onClick={() => previewId && exportReport(previewId, "pdf")}
            >
              <FileDown className="h-3.5 w-3.5" aria-hidden />
              Unduh PDF
            </button>
          </div>
        }
      >
        {preview.isLoading ? (
          <InlineLoader label="Menyiapkan pratinjau" />
        ) : preview.isError ? (
          <ErrorState
            message={
              preview.error instanceof ApiError
                ? preview.error.userMessage
                : "Kesalahan tidak terduga."
            }
            onRetry={() => preview.refetch()}
          />
        ) : preview.data ? (
          <article className="space-y-4">
            {preview.data.is_synthetic && (
              <p className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-[11px] font-medium tracking-wide text-warning-strong">
                DATA SINTETIS — BUKAN TEMUAN AKTUAL
              </p>
            )}
            <header>
              <h3 className="text-base font-semibold text-ink">{preview.data.title}</h3>
              <p className="mt-0.5 text-[11px] text-muted">
                Periode {preview.data.period_start} – {preview.data.period_end} · dibuat{" "}
                {preview.data.generated_at}
              </p>
            </header>

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Statistik agregat
              </h4>
              <dl className="grid gap-2 sm:grid-cols-2">
                {Object.entries(preview.data.statistics).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-surface-muted px-3 py-2">
                    <dt className="text-[11px] text-muted">{label}</dt>
                    <dd className="tabular text-sm font-medium text-ink">
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {preview.data.charts_data.map((chart) => (
              <section key={chart.key}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {chart.title}
                </h4>
                <div className="tp-scroll-x">
                  <table className="w-full min-w-[280px] text-xs">
                    <thead>
                      <tr className="border-b border-line text-left text-muted">
                        {chart.columns.map((column) => (
                          <th key={column} className="py-1.5 pr-3 font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chart.rows.slice(0, 12).map((row, index) => (
                        <tr key={index} className="border-b border-line/60">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="tabular py-1.5 pr-3 text-ink">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Insight
              </h4>
              {preview.data.insights.length === 0 ? (
                <p className="text-xs text-muted">Laporan ini belum memuat insight.</p>
              ) : (
                <ul className="space-y-2">
                  {preview.data.insights.map((insight, index) => (
                    <li key={index} className="rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{insight.title}</p>
                        <StatusBadge status={insight.human_status} />
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {insight.summary}
                      </p>
                      {insight.human_note && (
                        <p className="mt-1.5 text-xs leading-relaxed text-ink">
                          <span className="font-medium">Catatan peninjau: </span>
                          {insight.human_note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {preview.data.notes && (
              <section>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  Catatan
                </h4>
                <p className="text-xs leading-relaxed text-ink">{preview.data.notes}</p>
              </section>
            )}
          </article>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === "report" ? "Hapus laporan?" : "Hapus insight?"}
        description={`"${confirm?.title ?? ""}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirm(null)}
      />

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
