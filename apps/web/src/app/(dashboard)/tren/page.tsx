"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChartWithTable, VolumeChart } from "@/components/charts";
import { ActiveFilterChips } from "@/components/filter-panel";
import { PageHeader } from "@/components/shell";
import {
  Card,
  ChartSkeleton,
  ChangeBadge,
  ErrorState,
  NoResultState,
  Tag,
  TableSkeleton,
} from "@/components/ui";
import { useTrends } from "@/hooks/useApi";
import { useFilters } from "@/hooks/useFilters";
import { useReportMeta } from "@/hooks/useMeta";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import type { LabelCount, TopicRow } from "@/lib/types";

type Granularity = "daily" | "weekly";
type Breakdown = "topic" | "job_role" | "sentiment";

const BREAKDOWN_LABELS: Record<Breakdown, string> = {
  topic: "Topik",
  job_role: "Jenis pekerjaan",
  sentiment: "Sentimen",
};

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border border-line bg-surface p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition",
            value === option.value
              ? "bg-primary text-white"
              : "text-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function TrendPage() {
  const router = useRouter();
  const { apiParams, filters, setFilters, toggleValue, reset } = useFilters();
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [breakdown, setBreakdown] = useState<Breakdown>("topic");
  const [mode, setMode] = useState<"absolute" | "indexed">("absolute");

  const { data, isLoading, isError, error, refetch } = useTrends(
    apiParams,
    granularity,
    breakdown,
  );
  useReportMeta(data?.meta);

  if (isError) {
    return (
      <>
        <PageHeader title="Analisis Tren" />
        <Card title="Data tidak dapat ditampilkan">
          <ErrorState
            message={error instanceof ApiError ? error.userMessage : "Kesalahan tidak terduga."}
            onRetry={() => refetch()}
          />
        </Card>
      </>
    );
  }

  const isEmpty = !isLoading && data && data.comparison.current_total === 0;

  return (
    <>
      <PageHeader
        title="Analisis Tren"
        subtitle={
          data
            ? `Membandingkan ${data.meta.period_label} dengan periode sebelumnya yang sama panjang. Lonjakan dilabeli tanpa menyimpulkan penyebabnya.`
            : "Menyiapkan data tren…"
        }
        badge={data && <Tag tone="warning">{data.meta.is_synthetic ? "DATA DEMO" : "DATA LIVE"}</Tag>}
        actions={
          <div className="flex flex-wrap gap-2">
            <SegmentedControl
              label="Granularitas"
              value={granularity}
              onChange={setGranularity}
              options={[
                { value: "daily", label: "Harian" },
                { value: "weekly", label: "Mingguan" },
              ]}
            />
            <SegmentedControl
              label="Skala nilai"
              value={mode}
              onChange={setMode}
              options={[
                { value: "absolute", label: "Jumlah" },
                { value: "indexed", label: "Indeks" },
              ]}
            />
          </div>
        }
      />

      <ActiveFilterChips />

      {isEmpty ? (
        <Card title="Tidak ada percakapan pada periode ini">
          <NoResultState query={filters.q} onReset={reset} />
        </Card>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Periode aktif",
                value: data ? formatNumber(data.comparison.current_total) : "–",
                hint: data?.meta.period_label,
              },
              {
                label: "Periode sebelumnya",
                value: data ? formatNumber(data.comparison.previous_total) : "–",
                hint: data
                  ? `${formatShortDate(data.meta.comparison_start)} – ${formatShortDate(data.meta.comparison_end)}`
                  : undefined,
              },
              {
                label: "Perubahan",
                value: data ? <ChangeBadge value={data.comparison.change_percent} /> : "–",
                hint:
                  data?.comparison.change_percent === null
                    ? "Tidak cukup data untuk membuat perbandingan."
                    : "Relatif terhadap periode sebelumnya",
              },
            ].map((item) => (
              <div key={item.label} className="tp-card px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {item.label}
                </p>
                <p className="mt-1 tabular text-2xl font-semibold text-ink">{item.value}</p>
                {item.hint && <p className="mt-1 text-[11px] text-muted">{item.hint}</p>}
              </div>
            ))}
          </div>

          <Card
            title={
              mode === "indexed"
                ? "Perubahan terindeks (titik awal = 100)"
                : "Volume percakapan"
            }
            description="Garis putus-putus menampilkan periode pembanding. Klik grafik untuk membuka post pada tanggal tersebut."
            definition="Mode indeks menormalkan titik pertama menjadi 100 sehingga perubahan relatif lebih mudah dibandingkan ketika volume dasarnya berbeda."
          >
            {isLoading || !data ? (
              <ChartSkeleton height={320} />
            ) : (
              <ChartWithTable
                columns={["Periode", "Jumlah post", "Indeks"]}
                rows={data.series.map((point) => [
                  formatShortDate(point.date),
                  point.count,
                  (point.indexed ?? 100).toFixed(1).replace(".", ","),
                ])}
                summary={`Tren ${granularity === "daily" ? "harian" : "mingguan"} pada ${data.meta.period_label}.`}
              >
                <VolumeChart
                  series={data.series}
                  peaks={data.peaks}
                  comparison={data.previous_series}
                  mode={mode}
                  height={320}
                  onSelectDate={(date) => {
                    setFilters({ date_from: date, date_to: date });
                    router.push("/post");
                  }}
                />
              </ChartWithTable>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              title="Lonjakan isu mingguan"
              description={
                data
                  ? `Kelompok isu dengan minimal ${data.spike_rule.min_posts} post dalam seminggu dan naik minimal ${formatPercent(data.spike_rule.min_increase_percent)} dibanding rata-rata ${data.spike_rule.baseline_weeks} minggu sebelumnya.`
                  : "Kelompok isu yang volume mingguannya melewati dua ambang."
              }
              definition={
                data
                  ? `${data.spike_rule.description} Kedua ambang adalah parameter yang dapat disetel; lonjakan adalah pengamatan statistik dan penyebabnya harus ditelusuri manusia.`
                  : undefined
              }
            >
              {isLoading || !data ? (
                <TableSkeleton rows={4} />
              ) : data.peaks.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">
                  Tidak ada kelompok isu yang melewati kedua ambang pada periode ini.
                </p>
              ) : (
                <div className="tp-scroll-x">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead className="text-left text-muted">
                      <tr className="border-b border-line">
                        <th scope="col" className="py-2 font-medium">Minggu</th>
                        <th scope="col" className="py-2 font-medium">Kelompok isu</th>
                        <th scope="col" className="py-2 font-medium">Jumlah</th>
                        <th scope="col" className="py-2 font-medium">
                          Rata-rata {data.spike_rule.baseline_weeks} mgg
                        </th>
                        <th scope="col" className="py-2 font-medium">Kenaikan</th>
                        <th scope="col" className="py-2 font-medium">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.peaks.slice(0, 8).map((peak) => (
                        <tr
                          key={`${peak.week_start}-${peak.topic_slug}`}
                          className="border-b border-line last:border-0"
                        >
                          <td className="py-2">
                            {formatShortDate(peak.week_start)} – {formatShortDate(peak.week_end)}
                            {peak.is_partial_week && (
                              <span className="block text-[10px] text-muted">minggu berjalan</span>
                            )}
                          </td>
                          <td className="py-2 text-ink">{peak.topic_name}</td>
                          <td className="tabular py-2 font-medium">{formatNumber(peak.count)}</td>
                          <td
                            className="tabular py-2 text-muted"
                            title={`Minggu pembanding: ${peak.previous_weeks.join(", ")} post`}
                          >
                            {formatNumber(peak.baseline)}
                          </td>
                          <td className="py-2">
                            {peak.delta_percent === null ? (
                              <span className="text-[11px] text-muted">muncul dari nol</span>
                            ) : (
                              <ChangeBadge value={peak.delta_percent} />
                            )}
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => {
                                setFilters({
                                  date_from: peak.week_start,
                                  date_to: peak.week_end,
                                  topics: [peak.topic_slug],
                                });
                                router.push("/post");
                              }}
                            >
                              Lihat post
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[11px] text-muted">
                    Label &ldquo;lonjakan terdeteksi&rdquo; bersifat deskriptif. Dashboard
                    tidak menyimpulkan sebab-akibat secara otomatis.
                  </p>
                </div>
              )}
            </Card>

            <Card
              title={`Rincian berdasarkan ${BREAKDOWN_LABELS[breakdown].toLowerCase()}`}
              description="Klik baris untuk menerapkannya sebagai filter global."
              definition="Perubahan dihitung terhadap periode pembanding dengan panjang yang sama."
              actions={
                <SegmentedControl
                  label="Jenis rincian"
                  value={breakdown}
                  onChange={setBreakdown}
                  options={[
                    { value: "topic", label: "Topik" },
                    { value: "job_role", label: "Pekerjaan" },
                    { value: "sentiment", label: "Sentimen" },
                  ]}
                />
              }
            >
              {isLoading || !data ? (
                <TableSkeleton rows={6} />
              ) : data.breakdown.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">
                  Tidak ada data untuk rincian ini.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.breakdown.map((row) => {
                    const isTopic = "slug" in row;
                    const name = isTopic ? (row as TopicRow).name : (row as LabelCount).label;
                    const change = row.change_percent ?? null;
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition hover:bg-surface-muted"
                          onClick={() => {
                            if (breakdown === "topic" && isTopic) {
                              toggleValue("topics", (row as TopicRow).slug);
                            } else if (breakdown === "job_role") {
                              toggleValue("job_roles", name);
                            } else {
                              toggleValue("sentiments", name);
                            }
                          }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-ink">{name}</span>
                            <span className="block text-[11px] text-muted">
                              {formatNumber(row.count)} post · {formatPercent(row.share)}
                            </span>
                          </span>
                          <ChangeBadge value={change} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
