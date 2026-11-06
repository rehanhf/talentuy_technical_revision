"use client";

import {
  CheckCircle2,
  CircleSlash,
  Database,
  Link2,
  Palette,
  RefreshCw,
  Satellite,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { KeywordPresetManager } from "@/components/keyword-preset-manager";
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
  useAuditLog,
  useConnectors,
  useDataQuality,
  useFetchLive,
  useImportData,
  useImportPublicX,
  useIngestionRuns,
  useReanalyze,
  useSeedDemoData,
  useTaxonomy,
  useUpdateTopic,
} from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import {
  DEFAULT_BRANDING,
  applyBranding,
  isValidHex,
  loadBranding,
  saveBranding,
  type Branding,
} from "@/lib/branding";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";
import type { ImportResult, TopicMeta } from "@/lib/types";

const RUN_STATUS_STYLE: Record<string, string> = {
  success: "bg-positive/10 text-positive-strong",
  partial: "bg-warning/10 text-warning-strong",
  failed: "bg-negative/10 text-negative-strong",
  running: "bg-primary-soft text-primary-strong",
};

const ACTION_LABEL: Record<string, string> = {
  "data.import": "Impor berkas",
  "data.import_public_x": "Impor URL post X",
  "data.seed": "Bangkitkan data demo",
  "data.reanalyze": "Analisis ulang",
  "data.fetch_live": "Tarik data X API",
  "taxonomy.update": "Ubah taxonomy",
  "label.correct": "Koreksi label",
  "preset.create": "Tambah preset kata kunci",
  "preset.update": "Ubah preset kata kunci",
  "preset.delete": "Hapus preset kata kunci",
  "insight.create": "Buat insight",
  "insight.update": "Ubah insight",
  "insight.delete": "Hapus insight",
  "report.create": "Buat laporan",
  "report.export": "Ekspor laporan",
  "report.delete": "Hapus laporan",
};

function QualityStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-line px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="tabular mt-0.5 text-lg font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{hint}</p>
    </div>
  );
}

export default function DataSettingsPage() {

  const connectors = useConnectors();
  const quality = useDataQuality();
  const taxonomy = useTaxonomy();
  const runs = useIngestionRuns();
  const audit = useAuditLog();

  const importData = useImportData();
  const importPublicX = useImportPublicX();
  const fetchLive = useFetchLive();
  const reanalyze = useReanalyze();
  const seedDemo = useSeedDemoData();
  const updateTopic = useUpdateTopic();

  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{
    processed: number;
    failed: number;
    received: number;
    errors: string[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );

  const [editingTopic, setEditingTopic] = useState<TopicMeta | null>(null);
  const [topicForm, setTopicForm] = useState({
    name: "",
    description: "",
    keywords: "",
    color: "#2563eb",
    is_active: true,
  });

  const [liveQuery, setLiveQuery] = useState("");
  const [liveDays, setLiveDays] = useState(7);
  const [liveMax, setLiveMax] = useState(20);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveResult, setLiveResult] = useState<ImportResult | null>(null);
  const [publicXUrl, setPublicXUrl] = useState("");
  const [publicXError, setPublicXError] = useState<string | null>(null);
  const [publicXResult, setPublicXResult] = useState<ImportResult | null>(null);

  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [brandError, setBrandError] = useState<string | null>(null);

  useEffect(() => {
    setBranding(loadBranding());
  }, []);

  const submitImport = async (event: FormEvent) => {
    event.preventDefault();
    setImportError(null);
    setImportResult(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setImportError("Pilih berkas CSV atau JSON terlebih dahulu.");
      return;
    }
    try {
      const result = await importData.mutateAsync(file);
      setImportResult({
        processed: result.records_processed,
        failed: result.records_failed,
        received: result.records_received,
        errors: result.errors,
      });
      setToast({
        message: `${result.records_processed} post berhasil diproses.`,
        tone: "success",
      });
      if (fileRef.current) fileRef.current.value = "";
    } catch (caught) {
      setImportError(
        caught instanceof ApiError ? caught.userMessage : "Impor gagal diproses.",
      );
    }
  };

  const submitFetchLive = async (event: FormEvent) => {
    event.preventDefault();
    setLiveError(null);
    setLiveResult(null);
    if (liveQuery.trim().length < 2) {
      setLiveError("Isi kata kunci pencarian terlebih dahulu.");
      return;
    }
    try {
      const result = await fetchLive.mutateAsync({
        query: liveQuery.trim(),
        days: liveDays,
        max_results: liveMax,
      });
      setLiveResult(result);
      setToast({
        message: `${result.records_processed} post nyata berhasil ditarik.`,
        tone: "success",
      });
    } catch (caught) {
      setLiveError(
        caught instanceof ApiError ? caught.userMessage : "Penarikan data gagal.",
      );
    }
  };

  const submitPublicX = async (event: FormEvent) => {
    event.preventDefault();
    setPublicXError(null);
    setPublicXResult(null);
    if (!/^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/.+\/status\/\d+/.test(publicXUrl.trim())) {
      setPublicXError("Masukkan URL post X yang lengkap.");
      return;
    }
    try {
      const result = await importPublicX.mutateAsync(publicXUrl.trim());
      setPublicXResult(result);
      setToast({
        message:
          result.records_processed > 0
            ? "Post X nyata berhasil disimpan dan dianalisis."
            : "Post tersebut sudah pernah disimpan.",
        tone: "success",
      });
    } catch (caught) {
      setPublicXError(
        caught instanceof ApiError ? caught.userMessage : "Post X tidak dapat diimpor.",
      );
    }
  };

  const runReanalysis = async () => {
    try {
      const run = await reanalyze.mutateAsync();
      setToast({
        message: `Analisis ulang selesai untuk ${run.records_processed} post.`,
        tone: "success",
      });
    } catch (caught) {
      setToast({
        message:
          caught instanceof ApiError ? caught.userMessage : "Analisis ulang gagal.",
        tone: "error",
      });
    }
  };

  const runSeed = async () => {
    setConfirmSeed(false);
    try {
      const summary = await seedDemo.mutateAsync({ count: 1400, days: 90, reset: true });
      setToast({ message: summary.message, tone: "success" });
    } catch (caught) {
      setToast({
        message:
          caught instanceof ApiError ? caught.userMessage : "Pembangkitan data gagal.",
        tone: "error",
      });
    }
  };

  const openTopic = (topic: TopicMeta) => {
    setEditingTopic(topic);
    setTopicForm({
      name: topic.name,
      description: topic.description,
      keywords: topic.keywords.join(", "),
      color: topic.color,
      is_active: topic.is_active,
    });
  };

  const submitTopic = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingTopic) return;
    try {
      await updateTopic.mutateAsync({
        id: editingTopic.id,
        body: {
          name: topicForm.name.trim(),
          description: topicForm.description.trim(),
          color: topicForm.color,
          is_active: topicForm.is_active,
          keywords: topicForm.keywords
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });
      setToast({ message: "Taxonomy topik diperbarui.", tone: "success" });
      setEditingTopic(null);
    } catch (caught) {
      setToast({
        message:
          caught instanceof ApiError ? caught.userMessage : "Perubahan gagal disimpan.",
        tone: "error",
      });
    }
  };

  const submitBranding = (event: FormEvent) => {
    event.preventDefault();
    setBrandError(null);
    if (!branding.companyName.trim() || !branding.productName.trim()) {
      setBrandError("Nama perusahaan dan nama produk tidak boleh kosong.");
      return;
    }
    if (!isValidHex(branding.primaryColor)) {
      setBrandError("Warna merek harus berupa kode heksadesimal, contoh #2563eb.");
      return;
    }
    saveBranding(branding);
    applyBranding(branding);
    setToast({ message: "Identitas dan warna merek diperbarui.", tone: "success" });
  };

  return (
    <>
      <PageHeader
        title="Data & Pengaturan"
        subtitle="Status sumber data, kualitas data, taxonomy, dan identitas produk. Kredensial API hanya tersimpan pada environment server dan tidak pernah dikirim ke browser."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {/* --------------------------------------------------- connector */}
        <Card
          title="Status sumber data"
          description="Mode demo memakai data sintetis. Mode live tersedia bila credential provider terpilih sudah diatur pada server."
        >
          {connectors.isError ? (
            <ErrorState
              message={
                connectors.error instanceof ApiError
                  ? connectors.error.userMessage
                  : "Kesalahan tidak terduga."
              }
              onRetry={() => connectors.refetch()}
            />
          ) : connectors.isLoading ? (
            <TableSkeleton rows={3} />
          ) : connectors.data ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                    connectors.data.mode === "demo"
                      ? "bg-warning/12 text-warning-strong"
                      : "bg-positive/12 text-positive-strong"
                  }`}
                >
                  {connectors.data.mode === "demo" ? "DATA DEMO" : "DATA LIVE"}
                </span>
                <span className="text-[11px] text-muted">
                  Mode diminta: {connectors.data.requested_mode} · connector live{" "}
                  {connectors.data.live_available ? "tersedia" : "belum tersedia"}
                </span>
              </div>

              <ul className="space-y-2">
                {connectors.data.connectors.map((connector) => (
                  <li
                    key={connector.name}
                    className="flex items-start gap-2.5 rounded-lg border border-line px-3 py-2.5"
                  >
                    {connector.available ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive-strong" aria-hidden />
                    ) : (
                      <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">
                        {connector.label}
                      </span>
                      <span className="block text-[11px] leading-relaxed text-muted">
                        {connector.description}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium text-muted">
                        {connector.available ? "Siap dipakai" : "Tidak aktif — connector offline"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="rounded-lg bg-surface-muted px-3 py-2 text-[11px] leading-relaxed text-muted">
                {connectors.data.notice}
              </p>

              <form
                onSubmit={submitPublicX}
                className="space-y-2.5 rounded-lg border border-line p-3"
                noValidate
              >
                  <p className="text-sm font-medium text-ink">Impor satu post X publik</p>
                  <p className="text-[11px] leading-relaxed text-muted">
                    Tempel URL post yang sudah diketahui. Teks publik diambil di server,
                    disimpan sebagai data nyata, lalu dianalisis oleh pipeline aktif.
                  </p>
                  <div>
                    <label htmlFor="public-x-url" className="tp-label">
                      URL post X
                    </label>
                    <input
                      id="public-x-url"
                      type="url"
                      className="tp-input"
                      value={publicXUrl}
                      onChange={(event) => setPublicXUrl(event.target.value)}
                      placeholder="https://x.com/nama/status/123456789"
                    />
                  </div>
                  <button
                    type="submit"
                    className="tp-btn tp-btn-primary"
                    disabled={importPublicX.isPending}
                  >
                    <Link2 className="h-4 w-4" aria-hidden />
                    {importPublicX.isPending ? "Mengambil post…" : "Impor dari URL"}
                  </button>
                  {publicXError && (
                    <p role="alert" className="rounded-lg border border-negative/20 bg-negative/5 px-3 py-2 text-xs text-negative-strong">
                      {publicXError}
                    </p>
                  )}
                  {publicXResult && (
                    <p className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-ink">
                      {publicXResult.records_processed > 0
                        ? "1 post baru tersimpan sebagai data nyata dan sudah dianalisis."
                        : "Post sudah ada; data duplikat tidak dibuat."}
                    </p>
                  )}
                </form>

              <form
                  onSubmit={submitFetchLive}
                  className="space-y-2.5 rounded-lg border border-line p-3"
                  noValidate
                >
                  <p className="text-sm font-medium text-ink">Tarik data X melalui {connectors.data.provider === "twitterapi_io" ? "twitterapi.io" : "X API resmi"}</p>
                  <p className="text-[11px] leading-relaxed text-muted">
                    Ambil post dalam 7 hari terakhir, maksimal 100 post per pencarian.
                    Untuk twitterapi.io, mulai dari 20 post (maksimal satu halaman).
                    Setiap pencarian memakai kredit provider; hasil bisa lebih sedikit dari batas yang dipilih.
                  </p>

                  <div>
                    <label htmlFor="live-query" className="tp-label">
                      Kata kunci pencarian
                    </label>
                    <input
                      id="live-query"
                      className="tp-input"
                      value={liveQuery}
                      onChange={(event) => setLiveQuery(event.target.value)}
                      placeholder="Contoh: loker gudang OR admin gudang"
                      disabled={!connectors.data.live_available}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="live-days" className="tp-label">
                        Rentang
                      </label>
                      <select
                        id="live-days"
                        className="tp-input"
                        value={liveDays}
                        onChange={(event) => setLiveDays(Number(event.target.value))}
                        disabled={!connectors.data.live_available}
                      >
                        {[1, 3, 7].map((day) => (
                          <option key={day} value={day}>
                            {day} hari terakhir
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="live-max" className="tp-label">
                        Maksimal post
                      </label>
                      <select
                        id="live-max"
                        className="tp-input"
                        value={liveMax}
                        onChange={(event) => setLiveMax(Number(event.target.value))}
                        disabled={!connectors.data.live_available}
                      >
                        {[20, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="tp-btn tp-btn-primary"
                    disabled={!connectors.data.live_available || fetchLive.isPending}
                  >
                    <Satellite className="h-4 w-4" aria-hidden />
                    {fetchLive.isPending ? "Menarik data…" : "Tarik data"}
                  </button>

                  {!connectors.data.live_available && (
                    <p className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-[11px] leading-relaxed text-ink">
                      Connector belum aktif. Pilih <code>X_API_PROVIDER</code> dan isi <code>TWITTERAPI_IO_KEY</code> atau <code>X_API_BEARER_TOKEN</code> pada
                      environment server lalu jalankan ulang backend. Selama itu belum
                      tersedia, gunakan impor CSV/JSON di bawah — hasilnya masuk lewat
                      pipeline yang sama.
                    </p>
                  )}

                  {liveError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-negative/20 bg-negative/5 px-3 py-2 text-xs text-negative-strong"
                    >
                      {liveError}
                    </p>
                  )}

                  {liveResult && (
                    <p className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-ink">
                      {formatNumber(liveResult.records_processed)} post baru tersimpan
                      dari {formatNumber(liveResult.records_received)} yang diterima
                      (status {liveResult.status}). Post duplikat tidak digandakan.
                    </p>
                  )}
                </form>
            </div>
          ) : null}
        </Card>

        {/* ---------------------------------------------------- quality */}
        <Card
          title="Kualitas data"
          description="Cakupan analisis dan porsi data yang perlu diperiksa manusia."
          definition="Persentase dihitung terhadap total post yang tersimpan, bukan terhadap periode filter aktif."
        >
          {quality.isError ? (
            <ErrorState
              message={
                quality.error instanceof ApiError
                  ? quality.error.userMessage
                  : "Kesalahan tidak terduga."
              }
              onRetry={() => quality.refetch()}
            />
          ) : quality.isLoading ? (
            <TableSkeleton rows={3} />
          ) : quality.data && quality.data.total_posts === 0 ? (
            <EmptyState
              icon={<Database className="h-5 w-5" aria-hidden />}
              title="Basis data masih kosong"
              description="Impor berkas hasil ekspor resmi atau bangkitkan dataset demo sintetis untuk mulai mengeksplorasi."
            />
          ) : quality.data ? (
            <>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <QualityStat
                  label="Total post"
                  value={formatNumber(quality.data.total_posts)}
                  hint={`${formatNumber(quality.data.synthetic_posts)} di antaranya sintetis (${formatPercent(quality.data.synthetic_percent)})`}
                />
                <QualityStat
                  label="Cakupan analisis"
                  value={formatPercent(quality.data.coverage_percent)}
                  hint={`${formatNumber(quality.data.analyzed_posts)} post sudah diberi label`}
                />
                <QualityStat
                  label="Belum masuk topik"
                  value={formatPercent(quality.data.unclassified_percent)}
                  hint={`${formatNumber(quality.data.unclassified_topic)} post tidak cocok dengan kata kunci topik mana pun`}
                />
                <QualityStat
                  label="Perlu ditinjau"
                  value={formatPercent(quality.data.needs_review_percent)}
                  hint={`${formatNumber(quality.data.needs_review)} post berlabel keyakinan rendah`}
                />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Sentimen “Tidak Yakin”: {formatNumber(quality.data.uncertain_sentiment)} post
                ({formatPercent(quality.data.uncertain_percent)}). Rentang data{" "}
                {formatDateTime(quality.data.earliest_post)} –{" "}
                {formatDateTime(quality.data.latest_post)}.
              </p>
            </>
          ) : null}
        </Card>

        {/* ----------------------------------------------------- import */}
        <Card
          title="Impor data"
          description="Unggah hasil ekspor resmi berformat CSV atau JSON. Berkas diproses di server, bukan di browser."
          actions={
            connectors.data?.system_ops_enabled && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="tp-btn px-2.5 py-1.5 text-xs"
                  onClick={runReanalysis}
                  disabled={reanalyze.isPending}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${reanalyze.isPending ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  {reanalyze.isPending ? "Memproses…" : "Analisis ulang"}
                </button>
                <button
                  type="button"
                  className="tp-btn px-2.5 py-1.5 text-xs"
                  onClick={() => setConfirmSeed(true)}
                  disabled={seedDemo.isPending}
                >
                  {seedDemo.isPending ? "Membangkitkan…" : "Bangkitkan data demo"}
                </button>
              </div>
            )
          }
        >
          <form onSubmit={submitImport} className="space-y-3" noValidate>
              <div>
                <label htmlFor="import-file" className="tp-label">
                  Berkas CSV atau JSON (maks. 8 MB)
                </label>
                <input
                  id="import-file"
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="tp-input file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1 file:text-xs"
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                  Kolom wajib: <code>external_post_id</code>, <code>text</code>,{" "}
                  <code>created_at_source</code>. Kolom opsional:{" "}
                  <code>like_count</code>, <code>repost_count</code>,{" "}
                  <code>reply_count</code>, <code>quote_count</code>,{" "}
                  <code>language</code>, <code>url</code>. Baris duplikat berdasarkan{" "}
                  <code>external_post_id</code> tidak akan digandakan.
                </p>
              </div>

              <button
                type="submit"
                className="tp-btn tp-btn-primary"
                disabled={importData.isPending}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {importData.isPending ? "Mengunggah…" : "Impor berkas"}
              </button>

              {importError && (
                <p
                  role="alert"
                  className="rounded-lg border border-negative/20 bg-negative/5 px-3 py-2 text-xs text-negative-strong"
                >
                  {importError}
                </p>
              )}

              {importResult && (
                <div className="rounded-lg border border-line bg-surface-muted px-3 py-2.5 text-xs">
                  <p className="font-medium text-ink">
                    {formatNumber(importResult.processed)} dari{" "}
                    {formatNumber(importResult.received)} baris berhasil diproses.
                  </p>
                  {importResult.failed > 0 && (
                    <p className="mt-1 text-warning-strong">
                      {formatNumber(importResult.failed)} baris dilewati karena tidak lolos
                      validasi.
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-muted">
                      {importResult.errors.slice(0, 8).map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
        </Card>

        {/* --------------------------------------------------- taxonomy */}
        <Card
          title="Taxonomy topik"
          description="Kata kunci penentu topik. Perubahan berlaku pada analisis berikutnya — jalankan analisis ulang agar data lama ikut menyesuaikan."
        >
          {taxonomy.isError ? (
            <ErrorState
              message={
                taxonomy.error instanceof ApiError
                  ? taxonomy.error.userMessage
                  : "Kesalahan tidak terduga."
              }
              onRetry={() => taxonomy.refetch()}
            />
          ) : taxonomy.isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <ul className="space-y-2">
              {(taxonomy.data?.topics ?? []).map((topic) => (
                <li key={topic.id} className="rounded-lg border border-line px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: topic.color }}
                        aria-hidden
                      />
                      <span className="text-sm font-medium text-ink">{topic.name}</span>
                      {!topic.is_active && <Tag>nonaktif</Tag>}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => openTopic(topic)}
                    >
                      Ubah
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {topic.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {topic.keywords.slice(0, 10).map((keyword) => (
                      <Tag key={keyword}>{keyword}</Tag>
                    ))}
                    {topic.keywords.length > 10 && (
                      <Tag>+{topic.keywords.length - 10} lainnya</Tag>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ------------------------------------------------ preset kata kunci */}
        <KeywordPresetManager
          topics={taxonomy.data?.topics ?? []}
          onToast={setToast}
        />

        {/* ------------------------------------------------- kamus istilah */}
        <Card
          title="Kamus istilah dan taxonomy pendukung"
          description="Daftar jenis pekerjaan, kategori intent, dan label sentimen yang dipakai seluruh dashboard."
        >
          {taxonomy.isLoading ? (
            <TableSkeleton rows={4} />
          ) : taxonomy.data ? (
            <div className="space-y-3 text-xs">
              <div>
                <p className="tp-label">Jenis pekerjaan</p>
                <div className="flex flex-wrap gap-1">
                  {taxonomy.data.job_roles.map((role) => (
                    <Tag key={role}>{role}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <p className="tp-label">Kategori intent</p>
                <div className="flex flex-wrap gap-1">
                  {taxonomy.data.intents.map((intent) => (
                    <Tag key={intent}>{intent}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <p className="tp-label">Label sentimen</p>
                <div className="flex flex-wrap gap-1">
                  {taxonomy.data.sentiments.map((sentiment) => (
                    <Tag key={sentiment}>{sentiment}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <p className="tp-label">Bahasa</p>
                <div className="flex flex-wrap gap-1">
                  {taxonomy.data.languages.map((language) => (
                    <Tag key={language}>{language}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <p className="tp-label">Rumus engagement</p>
                <p className="tabular rounded-lg bg-surface-muted px-3 py-2 text-muted">
                  {taxonomy.data.engagement_formula}
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        {/* ------------------------------------------------------ identitas */}
        <Card
          title="Identitas dan warna merek"
          description="Nama mitra dan warna utama dapat diganti tanpa mengubah kode. Logo resmi belum ditampilkan sampai aset dan persetujuan tersedia."
        >
          <form onSubmit={submitBranding} className="space-y-3" noValidate>
            <div>
              <label htmlFor="brand-company" className="tp-label">
                Nama perusahaan
              </label>
              <input
                id="brand-company"
                className="tp-input"
                value={branding.companyName}
                onChange={(event) =>
                  setBranding((current) => ({
                    ...current,
                    companyName: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="brand-product" className="tp-label">
                Nama produk
              </label>
              <input
                id="brand-product"
                className="tp-input"
                value={branding.productName}
                onChange={(event) =>
                  setBranding((current) => ({
                    ...current,
                    productName: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="brand-color" className="tp-label">
                Warna utama
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="brand-color"
                  type="color"
                  className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-surface"
                  value={
                    isValidHex(branding.primaryColor)
                      ? branding.primaryColor
                      : DEFAULT_BRANDING.primaryColor
                  }
                  onChange={(event) =>
                    setBranding((current) => ({
                      ...current,
                      primaryColor: event.target.value,
                    }))
                  }
                  aria-label="Pilih warna utama"
                />
                <input
                  className="tp-input tabular"
                  value={branding.primaryColor}
                  onChange={(event) =>
                    setBranding((current) => ({
                      ...current,
                      primaryColor: event.target.value,
                    }))
                  }
                  aria-label="Kode warna utama"
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                Pengaturan ini tersimpan pada perangkat Anda dan dipakai untuk uji tampilan
                sebelum brand guideline resmi tersedia. Pastikan kontras teks tetap memenuhi
                WCAG AA.
              </p>
            </div>

            {brandError && (
              <p
                role="alert"
                className="rounded-lg border border-negative/20 bg-negative/5 px-3 py-2 text-xs text-negative-strong"
              >
                {brandError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="tp-btn tp-btn-primary">
                <Palette className="h-4 w-4" aria-hidden />
                Simpan identitas
              </button>
              <button
                type="button"
                className="tp-btn"
                onClick={() => {
                  setBranding(DEFAULT_BRANDING);
                  saveBranding(DEFAULT_BRANDING);
                  applyBranding(DEFAULT_BRANDING);
                  setToast({ message: "Identitas dikembalikan ke bawaan.", tone: "success" });
                }}
              >
                Kembalikan bawaan
              </button>
            </div>
          </form>
        </Card>
      </div>

      {/* ------------------------------------------------------- log proses */}
      <Card
        title="Log proses data"
        description="Riwayat impor, pembangkitan data demo, dan analisis ulang beserta jumlah baris yang berhasil."
        className="mt-4"
      >
        {runs.isError ? (
          <ErrorState
            message={
              runs.error instanceof ApiError
                ? runs.error.userMessage
                : "Kesalahan tidak terduga."
            }
            onRetry={() => runs.refetch()}
          />
        ) : runs.isLoading ? (
          <TableSkeleton rows={4} />
        ) : (runs.data ?? []).length === 0 ? (
          <EmptyState
            title="Belum ada proses data"
            description="Setiap impor dan analisis ulang akan tercatat di sini lengkap dengan jumlah baris dan kegagalannya."
          />
        ) : (
          <div className="tp-scroll-x">
            <table className="w-full min-w-[620px] text-xs">
              <caption className="sr-only">Riwayat proses data</caption>
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-3 font-medium">Waktu mulai</th>
                  <th className="py-2 pr-3 font-medium">Sumber</th>
                  <th className="py-2 pr-3 font-medium">Diterima</th>
                  <th className="py-2 pr-3 font-medium">Diproses</th>
                  <th className="py-2 pr-3 font-medium">Gagal</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {(runs.data ?? []).map((run) => (
                  <tr key={run.id} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink">{formatDateTime(run.started_at)}</td>
                    <td className="py-2 pr-3 text-muted">{run.source}</td>
                    <td className="tabular py-2 pr-3 text-ink">
                      {formatNumber(run.records_received)}
                    </td>
                    <td className="tabular py-2 pr-3 text-ink">
                      {formatNumber(run.records_processed)}
                    </td>
                    <td className="tabular py-2 pr-3 text-ink">
                      {formatNumber(run.records_failed)}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          RUN_STATUS_STYLE[run.status] ?? "bg-surface-muted text-muted"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-2 text-muted">{run.error_summary || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* -------------------------------------------------------- audit log */}
      <Card
        title="Audit log"
        description="Jejak impor, analisis ulang, perubahan taxonomy, koreksi label, dan persetujuan insight."
        className="mt-4"
      >
        {audit.isError ? (
          <ErrorState
            message={
              audit.error instanceof ApiError
                ? audit.error.userMessage
                : "Kesalahan tidak terduga."
            }
            onRetry={() => audit.refetch()}
          />
        ) : audit.isLoading ? (
          <TableSkeleton rows={5} />
        ) : (audit.data?.items ?? []).length === 0 ? (
          <EmptyState
            title="Belum ada aktivitas tercatat"
            description="Aksi yang mengubah data akan muncul di sini beserta pelaku dan waktunya."
          />
        ) : (
          <div className="tp-scroll-x">
            <table className="w-full min-w-[560px] text-xs">
              <caption className="sr-only">Audit log</caption>
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-3 font-medium">Waktu</th>
                  <th className="py-2 pr-3 font-medium">Pelaku</th>
                  <th className="py-2 pr-3 font-medium">Aksi</th>
                  <th className="py-2 font-medium">Objek</th>
                </tr>
              </thead>
              <tbody>
                {(audit.data?.items ?? []).map((entry) => (
                  <tr key={entry.id} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink">{formatDateTime(entry.created_at)}</td>
                    <td className="py-2 pr-3 text-muted">{entry.actor_email}</td>
                    <td className="py-2 pr-3 text-ink">
                      {ACTION_LABEL[entry.action] ?? entry.action}
                    </td>
                    <td className="py-2 text-muted">
                      {entry.entity}
                      {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* -------------------------------------------------- drawer taxonomy */}
      <Drawer
        open={Boolean(editingTopic)}
        onClose={() => setEditingTopic(null)}
        title="Ubah topik"
        subtitle={editingTopic?.slug}
        width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="tp-btn" onClick={() => setEditingTopic(null)}>
              Batal
            </button>
            <button
              type="submit"
              form="form-topik"
              className="tp-btn tp-btn-primary"
              disabled={updateTopic.isPending}
            >
              {updateTopic.isPending ? "Menyimpan…" : "Simpan perubahan"}
            </button>
          </div>
        }
      >
        <form id="form-topik" onSubmit={submitTopic} className="space-y-3" noValidate>
            <div>
              <label htmlFor="topik-nama" className="tp-label">
                Nama topik
              </label>
              <input
                id="topik-nama"
                className="tp-input"
                value={topicForm.name}
                onChange={(event) =>
                  setTopicForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label htmlFor="topik-deskripsi" className="tp-label">
                Deskripsi
              </label>
              <textarea
                id="topik-deskripsi"
                className="tp-input min-h-[80px]"
                value={topicForm.description}
                onChange={(event) =>
                  setTopicForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="topik-keywords" className="tp-label">
                Kata kunci (pisahkan dengan koma)
              </label>
              <textarea
                id="topik-keywords"
                className="tp-input min-h-[80px]"
                value={topicForm.keywords}
                onChange={(event) =>
                  setTopicForm((current) => ({ ...current, keywords: event.target.value }))
                }
              />
              <p className="mt-1 text-[11px] text-muted">
                Kata kunci dicocokkan tanpa memperhatikan huruf besar/kecil.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="topik-warna" className="tp-label">
                  Warna
                </label>
                <input
                  id="topik-warna"
                  type="color"
                  className="h-9 w-14 cursor-pointer rounded-lg border border-line bg-surface"
                  value={topicForm.color}
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, color: event.target.value }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={topicForm.is_active}
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                />
                Topik aktif dipakai pada klasifikasi
              </label>
            </div>
          </form>
      </Drawer>

      <ConfirmDialog
        open={confirmSeed}
        title="Bangkitkan ulang data demo?"
        description="Seluruh post, analisis, monitor, insight, dan laporan yang ada akan dihapus lalu diganti dengan dataset sintetis baru. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Bangkitkan ulang"
        onConfirm={runSeed}
        onCancel={() => setConfirmSeed(false)}
      />

      {(importData.isPending ||
        importPublicX.isPending ||
        seedDemo.isPending ||
        reanalyze.isPending ||
        fetchLive.isPending) && (
        <div className="fixed bottom-5 right-5 z-[70] rounded-lg border border-line bg-surface px-3 py-2 shadow-raised">
          <InlineLoader label="Memproses data di server" />
        </div>
      )}

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
