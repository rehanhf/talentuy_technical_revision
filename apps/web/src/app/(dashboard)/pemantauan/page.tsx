"use client";

import { Archive, Copy, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Sparkline } from "@/components/charts";
import { PageHeader } from "@/components/shell";
import {
  Card,
  ChangeBadge,
  Drawer,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Tag,
  Toast,
} from "@/components/ui";
import {
  useCreateMonitor,
  useDuplicateMonitor,
  useMonitors,
  useTaxonomy,
  useUpdateMonitor,
} from "@/hooks/useApi";
import { useFilters } from "@/hooks/useFilters";
import { ApiError } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";

const DIRECTION_TONE: Record<string, string> = {
  naik: "text-positive-strong",
  turun: "text-negative-strong",
  stabil: "text-muted",
  "tidak cukup data": "text-muted",
};

export default function MonitoringPage() {
  const router = useRouter();
  const { setFilters } = useFilters();
  const { data: monitors, isLoading, isError, error, refetch } = useMonitors();
  const { data: taxonomy } = useTaxonomy();

  const createMonitor = useCreateMonitor();
  const updateMonitor = useUpdateMonitor();
  const duplicateMonitor = useDuplicateMonitor();

  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null,
  );

  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [excluded, setExcluded] = useState("");
  const [jobRoles, setJobRoles] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [window, setWindow] = useState(7);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setKeywords("");
    setExcluded("");
    setJobRoles([]);
    setTopics([]);
    setWindow(7);
    setFormError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) return setFormError("Nama monitor wajib diisi.");
    const includeKeywords = keywords
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (includeKeywords.length === 0 && topics.length === 0 && jobRoles.length === 0) {
      return setFormError(
        "Isi minimal satu kata kunci, topik, atau jenis pekerjaan agar monitor bermakna.",
      );
    }

    try {
      await createMonitor.mutateAsync({
        name: name.trim(),
        comparison_window: window,
        source_query: {
          name: name.trim(),
          query_text: "",
          include_keywords: includeKeywords,
          exclude_keywords: excluded
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          job_roles: jobRoles,
          topics,
          sentiments: [],
          intents: [],
        },
      });
      setToast({ message: "Monitor berhasil disimpan.", tone: "success" });
      setFormOpen(false);
      resetForm();
    } catch (caught) {
      setFormError(
        caught instanceof ApiError ? caught.userMessage : "Monitor gagal disimpan.",
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Monitoring"
        subtitle="Query yang disimpan untuk diikuti perkembangannya. Perbandingan dihitung ulang setiap halaman dibuka — bukan monitoring real-time."
        actions={
          <button
            type="button"
            className="tp-btn tp-btn-primary"
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Monitor baru
          </button>
        }
      />

      <div className="mb-4 rounded-card border border-warning/25 bg-warning/5 px-4 py-3 text-[11px] leading-relaxed text-ink">
        <strong className="font-medium">Mode demo.</strong> Alert pada mode ini hanya
        simulasi tampilan. Tidak ada notifikasi yang dikirim dan data tidak mengalir
        secara langsung dari platform.
      </div>

      {isError ? (
        <Card title="Data tidak dapat ditampilkan">
          <ErrorState
            message={error instanceof ApiError ? error.userMessage : "Kesalahan tidak terduga."}
            onRetry={() => refetch()}
          />
        </Card>
      ) : isLoading ? (
        <Card title="Memuat monitor">
          <TableSkeleton rows={4} />
        </Card>
      ) : !monitors || monitors.length === 0 ? (
        <Card title="Belum ada monitor">
          <EmptyState
            title="Belum ada query yang dipantau"
            description="Simpan kombinasi kata kunci dan filter yang sering Anda periksa, lalu bandingkan dua periode berurutan untuk melihat perubahannya."
            action={
              <button
                type="button"
                className="tp-btn tp-btn-primary"
                onClick={() => setFormOpen(true)}
              >
                Buat monitor pertama
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {monitors.map((monitor) => (
            <article key={monitor.id} className="tp-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-ink">{monitor.name}</h2>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {monitor.owner_name ?? "Tanpa pemilik"} · dibuat{" "}
                    {formatDate(monitor.created_at)} · jendela {monitor.comparison_window}{" "}
                    hari
                  </p>
                </div>
                <ChangeBadge value={monitor.change_percent} />
              </div>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="tabular text-2xl font-semibold text-ink">
                    {formatNumber(monitor.current_count)}
                  </p>
                  <p className="text-[11px] text-muted">
                    post pada {monitor.comparison_window} hari terakhir · sebelumnya{" "}
                    {formatNumber(monitor.previous_count)}
                  </p>
                  <p
                    className={`mt-0.5 text-[11px] font-medium ${DIRECTION_TONE[monitor.trend_direction]}`}
                  >
                    Tren: {monitor.trend_direction}
                  </p>
                </div>
                <Sparkline data={monitor.sparkline} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {monitor.source_query.include_keywords.map((keyword) => (
                  <Tag key={keyword} tone="primary">
                    {keyword}
                  </Tag>
                ))}
                {monitor.source_query.exclude_keywords.map((keyword) => (
                  <Tag key={keyword}>-{keyword}</Tag>
                ))}
                {monitor.source_query.job_roles.map((role) => (
                  <Tag key={role}>{role}</Tag>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-2.5">
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    setFilters({ query_id: monitor.source_query.id });
                    router.push("/");
                  }}
                >
                  Buka di dashboard
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                  onClick={() => duplicateMonitor.mutate(monitor.id)}
                >
                  <Copy className="h-3 w-3" aria-hidden />
                  Duplikat
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                  onClick={() =>
                    updateMonitor.mutate({
                      id: monitor.id,
                      body: { is_archived: true },
                    })
                  }
                >
                  <Archive className="h-3 w-3" aria-hidden />
                  Arsipkan
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Drawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Monitor baru"
        subtitle="Simpan kata kunci dan filter untuk diikuti perubahannya antar periode."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="tp-btn" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <button
              type="submit"
              form="form-monitor"
              className="tp-btn tp-btn-primary"
              disabled={createMonitor.isPending}
            >
              {createMonitor.isPending ? "Menyimpan…" : "Simpan monitor"}
            </button>
          </div>
        }
      >
        <form id="form-monitor" onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="monitor-name" className="tp-label">
                Nama monitor
              </label>
              <input
                id="monitor-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="tp-input"
                placeholder="Contoh: Penipuan Lowongan"
              />
            </div>

            <div>
              <label htmlFor="monitor-keywords" className="tp-label">
                Kata kunci (pisahkan dengan koma)
              </label>
              <input
                id="monitor-keywords"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                className="tp-input"
                placeholder="penipuan, loker palsu, pungli"
              />
              <p className="mt-1 text-[11px] text-muted">
                Post cocok bila mengandung salah satu kata kunci di atas.
              </p>
            </div>

            <div>
              <label htmlFor="monitor-excluded" className="tp-label">
                Kata yang dikecualikan (opsional)
              </label>
              <input
                id="monitor-excluded"
                value={excluded}
                onChange={(event) => setExcluded(event.target.value)}
                className="tp-input"
                placeholder="promosi, jasa"
              />
            </div>

            <div>
              <span className="tp-label">Jenis pekerjaan (opsional)</span>
              <div className="flex flex-wrap gap-1.5">
                {(taxonomy?.job_roles ?? []).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setJobRoles((current) =>
                        current.includes(role)
                          ? current.filter((item) => item !== role)
                          : [...current, role],
                      )
                    }
                    className={`tp-chip transition ${
                      jobRoles.includes(role)
                        ? "border-primary bg-primary-soft text-primary-strong"
                        : "hover:border-primary/40"
                    }`}
                    aria-pressed={jobRoles.includes(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="tp-label">Topik (opsional)</span>
              <div className="flex flex-wrap gap-1.5">
                {(taxonomy?.topics ?? []).map((topic) => (
                  <button
                    key={topic.slug}
                    type="button"
                    onClick={() =>
                      setTopics((current) =>
                        current.includes(topic.slug)
                          ? current.filter((item) => item !== topic.slug)
                          : [...current, topic.slug],
                      )
                    }
                    className={`tp-chip transition ${
                      topics.includes(topic.slug)
                        ? "border-primary bg-primary-soft text-primary-strong"
                        : "hover:border-primary/40"
                    }`}
                    aria-pressed={topics.includes(topic.slug)}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="monitor-window" className="tp-label">
                Jendela perbandingan
              </label>
              <select
                id="monitor-window"
                value={window}
                onChange={(event) => setWindow(Number(event.target.value))}
                className="tp-input"
              >
                {[7, 14, 30].map((days) => (
                  <option key={days} value={days}>
                    {days} hari terakhir vs {days} hari sebelumnya
                  </option>
                ))}
              </select>
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-negative/20 bg-negative/5 px-3 py-2 text-xs text-negative-strong"
              >
                {formError}
              </p>
            )}
          </form>
      </Drawer>

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
