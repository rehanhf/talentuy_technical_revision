"use client";

import { BookOpen, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/shell";
import {
  Card,
  ErrorState,
  TableSkeleton,
  Tag,
} from "@/components/ui";
import { useMethodology, useUsabilitySummary } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";

/** Tahapan Ellis dan tempat penerapannya di produk. */
const ELLIS_STAGES: Array<{ stage: string; need: string; feature: string }> = [
  {
    stage: "Starting",
    need: "Memulai pencarian tanpa menyusun query yang rumit",
    feature:
      "Preset kata kunci per kategori isu di Pencarian Post, serta preset topik pada pencarian global (Ctrl + K)",
  },
  {
    stage: "Chaining",
    need: "Mengikuti petunjuk menuju informasi lain",
    feature: "Kata kunci terkait, topik, dan jenis pekerjaan yang dapat diklik",
  },
  {
    stage: "Browsing",
    need: "Menjelajah informasi secara luas",
    feature: "Overview, grafik tren, dan kartu topik",
  },
  {
    stage: "Differentiating",
    need: "Memilah informasi yang paling relevan",
    feature: "Filter tanggal, pekerjaan, topik, sentimen, engagement, dan urutan relevansi",
  },
  {
    stage: "Monitoring",
    need: "Mengikuti perubahan isu tertentu",
    feature: "Monitoring dan perbandingan antar periode",
  },
  {
    stage: "Extracting",
    need: "Mengambil informasi untuk digunakan",
    feature:
      "Detail post beserta dasar klasifikasi tiap label, catatan peninjau, dan ekspor laporan agregat",
  },
];

const FORAGING_CONCEPTS: Array<{ concept: string; application: string }> = [
  {
    concept: "Information scent",
    application:
      "Label eksplisit, cuplikan teks, jumlah post, perubahan persentase, dan indikator sentimen pada setiap kartu.",
  },
  {
    concept: "Information patch",
    application:
      "Percakapan dikelompokkan menjadi kombinasi kategori isu × jenis pekerjaan (SPG/SPB, Staf Gudang, Kasir, Administrasi, Pengemudi) pada periode tertentu.",
  },
  {
    concept: "Cost of information",
    application:
      "Cross-filter dari grafik, drill-down dalam panel, dan filter yang bertahan antar halaman.",
  },
  {
    concept: "Value of information",
    application:
      "Isu diprioritaskan memakai skor perhatian yang menggabungkan volume, momentum, dan porsi sentimen negatif.",
  },
  {
    concept: "Navigation between patches",
    application:
      "Perpindahan grafik → topik → post → insight tanpa kehilangan filter, karena state tersimpan pada URL.",
  },
];

const READING_TIPS: Array<{ title: string; body: string }> = [
  {
    title: "Angka selalu terikat periode aktif",
    body: "Seluruh KPI dihitung dari rentang tanggal dan filter yang sedang aktif. Periode pembanding memakai rentang sepanjang periode aktif tepat sebelumnya.",
  },
  {
    title: "Perubahan persentase bisa kosong",
    body: "Bila periode pembanding tidak memiliki data, perubahan ditulis “Tidak dapat dibandingkan” alih-alih 0% agar tidak menyesatkan.",
  },
  {
    title: "Sentimen adalah konteks, bukan vonis",
    body: "Label sentimen berasal dari model baseline berbasis leksikon. Post dengan keyakinan rendah diberi label “Tidak Yakin” dan ditandai perlu ditinjau. Detail post menampilkan aturan dan kata pemicu setiap label agar ketepatannya dapat dinilai.",
  },
  {
    title: "Lonjakan bukan otomatis masalah",
    body: "Puncak ditandai bila volume harian melampaui ambang statistik terhadap garis dasar periode. Selalu buka post terkait sebelum mengambil kesimpulan.",
  },
];

export default function MethodologyPage() {
  const methodology = useMethodology();
  const usability = useUsabilitySummary();

  return (
    <>
      <PageHeader
        title="Metodologi & Etika Data"
        subtitle="Cara data dikumpulkan, diolah, dan dibaca — beserta batas penggunaannya. Halaman ini juga menjadi rujukan saat dashboard dipakai dalam pengujian dengan pengguna."
      />

      {methodology.isError ? (
        <Card title="Metodologi tidak dapat dimuat">
          <ErrorState
            message={
              methodology.error instanceof ApiError
                ? methodology.error.userMessage
                : "Kesalahan tidak terduga."
            }
            onRetry={() => methodology.refetch()}
          />
        </Card>
      ) : methodology.isLoading ? (
        <Card title="Memuat metodologi">
          <TableSkeleton rows={5} />
        </Card>
      ) : methodology.data ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card
            title="Sumber dan pengolahan data"
            description="Status data yang sedang ditampilkan pada dashboard."
          >
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                    methodology.data.is_synthetic
                      ? "bg-warning/12 text-warning-strong"
                      : "bg-positive/12 text-positive-strong"
                  }`}
                >
                  {methodology.data.is_synthetic ? "DATA DEMO" : "DATA LIVE"}
                </span>
                <span className="text-muted">
                  {formatNumber(methodology.data.freshness.total_posts)} post tersimpan ·{" "}
                  {formatNumber(methodology.data.freshness.synthetic_posts)} sintetis
                </span>
              </div>

              <div>
                <p className="tp-label">Pengumpulan</p>
                <p className="text-muted">{methodology.data.collection}</p>
              </div>
              <div>
                <p className="tp-label">Pengolahan</p>
                <p className="text-muted">{methodology.data.processing}</p>
              </div>
              <div>
                <p className="tp-label">Rumus engagement</p>
                <p className="tabular rounded-lg bg-surface-muted px-3 py-2 text-muted">
                  {methodology.data.engagement_formula}
                </p>
              </div>
              <div>
                <p className="tp-label">Kesegaran data</p>
                <p className="text-muted">
                  Diperbarui {formatRelative(methodology.data.freshness.last_updated)} · post
                  terbaru {formatDateTime(methodology.data.freshness.latest_post_at)} ·
                  mesin pencarian {methodology.data.freshness.search_provider}
                  {methodology.data.freshness.is_stale && (
                    <span className="ml-1.5 rounded bg-warning/12 px-1.5 py-0.5 text-warning-strong">
                      data mungkin belum terbarui
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>

          <Card
            title="Etika dan batas penggunaan"
            description="Aturan yang mengikat cara produk ini boleh dipakai."
          >
            <ul className="space-y-2 text-xs leading-relaxed">
              {methodology.data.ethics.map((rule) => (
                <li key={rule} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive-strong" aria-hidden />
                  <span className="text-ink">{rule}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-[11px] leading-relaxed text-ink">
              TID (Talent Intelegence Dashboard) adalah media informasi pendukung komunikasi rekrutmen. Produk ini
              bukan sistem seleksi, bukan alat penilaian kandidat, dan tidak berafiliasi
              resmi dengan X.
            </p>
          </Card>

          <Card
            title="Keterbatasan"
            description="Dibaca lebih dulu sebelum angka dipakai sebagai dasar tindakan."
          >
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-muted">
              {methodology.data.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </Card>

          <Card
            title="Cara membaca dashboard"
            description="Empat hal yang paling sering menimbulkan salah tafsir."
          >
            <ul className="space-y-2.5">
              {READING_TIPS.map((tip) => (
                <li key={tip.title} className="rounded-lg border border-line px-3 py-2.5">
                  <p className="text-sm font-medium text-ink">{tip.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{tip.body}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      <Card
        title="Landasan Sains Informasi"
        description="Model perilaku pencarian informasi Ellis dipakai sebagai kerangka alur pengguna, bukan sekadar rujukan teori."
        className="mt-4"
        actions={<Tag tone="primary">Ellis (1989)</Tag>}
      >
        <div className="tp-scroll-x">
          <table className="w-full min-w-[640px] text-xs">
            <caption className="sr-only">
              Pemetaan tahap Ellis terhadap fitur TID
            </caption>
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-3 font-medium">Tahap</th>
                <th className="py-2 pr-3 font-medium">Kebutuhan pengguna</th>
                <th className="py-2 font-medium">Implementasi di produk</th>
              </tr>
            </thead>
            <tbody>
              {ELLIS_STAGES.map((row) => (
                <tr key={row.stage} className="border-b border-line/60">
                  <td className="py-2 pr-3 font-medium text-ink">{row.stage}</td>
                  <td className="py-2 pr-3 text-muted">{row.need}</td>
                  <td className="py-2 text-muted">{row.feature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Information Foraging Theory"
        description="Rancangan antarmuka menurunkan biaya pencarian dan memperkuat petunjuk informasi."
        className="mt-4"
        actions={<Tag tone="primary">Pirolli & Card (1999)</Tag>}
      >
        <dl className="grid gap-2.5 md:grid-cols-2">
          {FORAGING_CONCEPTS.map((item) => (
            <div key={item.concept} className="rounded-lg border border-line px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <BookOpen className="h-3.5 w-3.5 text-muted" aria-hidden />
                {item.concept}
              </dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted">{item.application}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card
        title="Ringkasan pengujian usability"
        description="Metrik alur yang tercatat saat dashboard dipakai untuk pengujian. Isi pencarian tidak pernah disimpan — hanya nama filter, jumlah langkah, dan durasi."
        className="mt-4"
      >
        {usability.isLoading ? (
          <TableSkeleton rows={3} />
        ) : usability.isError ? (
          <ErrorState
            message={
              usability.error instanceof ApiError
                ? usability.error.userMessage
                : "Kesalahan tidak terduga."
            }
            onRetry={() => usability.refetch()}
          />
        ) : (usability.data?.items ?? []).length === 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            Belum ada sesi pengujian yang tercatat. Metrik akan muncul setelah peserta
            menjalankan skenario tugas pada dashboard.
          </p>
        ) : (
          <div className="tp-scroll-x">
            <table className="w-full min-w-[520px] text-xs">
              <caption className="sr-only">Ringkasan metrik usability</caption>
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-3 font-medium">Tugas</th>
                  <th className="py-2 pr-3 font-medium">Jenis kejadian</th>
                  <th className="py-2 pr-3 font-medium">Jumlah</th>
                  <th className="py-2 pr-3 font-medium">Rata-rata durasi</th>
                  <th className="py-2 font-medium">Rata-rata langkah</th>
                </tr>
              </thead>
              <tbody>
                {(usability.data?.items ?? []).map((item, index) => (
                  <tr key={index} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink">{item.task_code}</td>
                    <td className="py-2 pr-3 text-muted">{item.event_type}</td>
                    <td className="tabular py-2 pr-3 text-ink">{formatNumber(item.count)}</td>
                    <td className="tabular py-2 pr-3 text-ink">
                      {(item.avg_duration_ms / 1000).toFixed(1).replace(".", ",")} detik
                    </td>
                    <td className="tabular py-2 text-ink">
                      {item.avg_steps.toFixed(1).replace(".", ",")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
