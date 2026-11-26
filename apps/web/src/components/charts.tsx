"use client";

import { Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/cn";
import { formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import type { Peak, SentimentByRole, SeriesPoint, TopicRow } from "@/lib/types";

export const SENTIMENT_COLORS: Record<string, string> = {
  Positif: "#16a34a",
  Netral: "#64748b",
  Negatif: "#dc2626",
  "Tidak Yakin": "#f59e0b",
};

const AXIS_STYLE = { fontSize: 11, fill: "#667085" };

/**
 * Skala heatmap dibuat berjenjang, bukan gradasi alpha yang mulus, agar setiap
 * kombinasi latar dan warna teks tetap memenuhi kontras WCAG AA. Rentang
 * warna menengah sengaja dilewati karena tidak aman baik untuk teks gelap
 * maupun terang.
 */
export const HEATMAP_SCALE = [
  { backgroundColor: "#f9fafb", color: "#111827" },
  { backgroundColor: "#eef4ff", color: "#111827" },
  { backgroundColor: "#dbe7fe", color: "#111827" },
  { backgroundColor: "#bfd4fd", color: "#111827" },
  { backgroundColor: "#2563eb", color: "#ffffff" },
  { backgroundColor: "#1e3a8a", color: "#ffffff" },
] as const;

export function heatLevel(count: number, intensity: number): number {
  if (count === 0) return 0;
  return Math.min(5, 1 + Math.floor(intensity * 4.999));
}

/** Tooltip kustom agar angka memakai format Indonesia dan label jelas. */
function ChartTooltip({
  active,
  payload,
  label,
  valueSuffix = "post",
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
  valueSuffix?: string;
  labelFormatter?: (value: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-raised">
      <p className="mb-1 font-medium text-ink">
        {labelFormatter ? labelFormatter(String(label)) : label}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-muted">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span>{entry.name}</span>
          <span className="tabular font-medium text-ink">
            {formatNumber(entry.value)} {valueSuffix}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Setiap chart menyediakan alternatif tabel data agar tetap terbaca oleh
 * pengguna pembaca layar dan saat grafik sulit dibandingkan secara visual.
 */
export function ChartWithTable({
  children,
  columns,
  rows,
  summary,
}: {
  children: ReactNode;
  columns: string[];
  rows: Array<Array<string | number>>;
  summary: string;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-ink"
          onClick={() => setShowTable((value) => !value)}
          aria-expanded={showTable}
        >
          <Table2 className="h-3.5 w-3.5" aria-hidden />
          {showTable ? "Sembunyikan tabel data" : "Lihat sebagai tabel"}
        </button>
      </div>

      {showTable ? (
        <div className="tp-scroll-x max-h-[300px] overflow-y-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">{summary}</caption>
            <thead className="tp-thead sticky top-0">
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col" className="px-3 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t border-line">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn("px-3 py-1.5", cellIndex > 0 && "tabular")}
                    >
                      {typeof cell === "number" ? formatNumber(cell) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {children}
          <p className="sr-only">{summary}</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------- volume area chart */

export function VolumeChart({
  series,
  peaks = [],
  comparison,
  onSelectDate,
  height = 260,
  mode = "absolute",
}: {
  series: SeriesPoint[];
  peaks?: Peak[];
  comparison?: SeriesPoint[];
  onSelectDate?: (date: string) => void;
  height?: number;
  mode?: "absolute" | "indexed";
}) {
  const peakDates = new Set(peaks.map((peak) => peak.date));
  const dataKey = mode === "indexed" ? "indexed" : "count";

  const merged = series.map((point, index) => ({
    ...point,
    previous: comparison?.[index]?.count ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={merged}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
        onClick={(state) => {
          const point = state?.activePayload?.[0]?.payload as SeriesPoint | undefined;
          if (point && onSelectDate) onSelectDate(point.date);
        }}
      >
        <defs>
          <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--tp-primary))" stopOpacity={0.16} />
            <stop offset="100%" stopColor="rgb(var(--tp-primary))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={{ stroke: "#e4e7ec" }}
          minTickGap={24}
        />
        <YAxis
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <Tooltip
          content={
            <ChartTooltip
              labelFormatter={(value) => formatShortDate(value)}
              valueSuffix={mode === "indexed" ? "indeks" : "post"}
            />
          }
        />
        {comparison && comparison.length > 0 && (
          <Line
            type="monotone"
            dataKey="previous"
            name="Periode sebelumnya"
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          name={mode === "indexed" ? "Indeks (awal = 100)" : "Jumlah post"}
          stroke="rgb(var(--tp-primary))"
          strokeWidth={2}
          fill="url(#volumeFill)"
          activeDot={{ r: 4, cursor: "pointer" }}
        />
        {merged
          .filter((point) => peakDates.has(point.date))
          .map((point) => (
            <ReferenceDot
              key={point.date}
              x={point.date}
              y={point[dataKey as "count" | "indexed"] ?? point.count}
              r={5}
              fill="#f59e0b"
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        {comparison && comparison.length > 0 && (
          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: 11, color: "#667085" }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------- horizontal topic chart */

export function TopicBarChart({
  topics,
  onSelect,
  selected = [],
  height = 300,
}: {
  topics: TopicRow[];
  onSelect?: (slug: string) => void;
  selected?: string[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={topics}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          width={150}
        />
        <Tooltip cursor={{ fill: "#f6f8fc" }} content={<ChartTooltip />} />
        <Bar
          dataKey="count"
          name="Jumlah post"
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          cursor={onSelect ? "pointer" : undefined}
          onClick={(data: unknown) => {
            const row = data as TopicRow;
            if (onSelect && row?.slug) onSelect(row.slug);
          }}
        >
          {topics.map((topic) => (
            <Cell
              key={topic.slug}
              fill={topic.color}
              fillOpacity={
                selected.length === 0 || selected.includes(topic.slug) ? 1 : 0.28
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------- stacked sentiment per role */

export function SentimentStackedChart({
  data,
  onSelectRole,
  height = 300,
}: {
  data: SentimentByRole[];
  onSelectRole?: (role: string) => void;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
        <XAxis
          dataKey="job_role"
          tick={{ ...AXIS_STYLE, width: 80 }}
          tickLine={false}
          axisLine={{ stroke: "#e4e7ec" }}
          angle={-25}
          textAnchor="end"
          height={64}
          interval={0}
        />
        <YAxis
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(value: number) => formatNumber(value)}
        />
        <Tooltip cursor={{ fill: "#f6f8fc" }} content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#667085" }} />
        {(["Positif", "Netral", "Negatif", "Tidak Yakin"] as const).map((key, index, all) => (
          <Bar
            key={key}
            dataKey={key}
            name={key}
            stackId="sentimen"
            fill={SENTIMENT_COLORS[key]}
            maxBarSize={38}
            radius={index === all.length - 1 ? [4, 4, 0, 0] : undefined}
            cursor={onSelectRole ? "pointer" : undefined}
            onClick={(data: unknown) => {
              const row = data as { job_role?: string };
              if (onSelectRole && row?.job_role) onSelectRole(row.job_role);
            }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------------------------------------------------------------- heatmap */

export function ConcernHeatmap({
  rows,
  columns,
  cells,
  maxCount,
  onSelect,
}: {
  rows: string[];
  columns: string[];
  cells: Array<{ job_role: string; topic: string; count: number; share_of_role: number }>;
  maxCount: number;
  onSelect?: (jobRole: string, topic: string) => void;
}) {
  const lookup = new Map(cells.map((cell) => [`${cell.job_role}|${cell.topic}`, cell]));

  if (rows.length === 0 || columns.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted">
        Belum cukup data untuk membentuk matriks pada filter ini.
      </p>
    );
  }

  return (
    <div className="tp-scroll-x">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-xs">
        <caption className="sr-only">
          Matriks jenis pekerjaan terhadap topik percakapan. Nilai adalah jumlah post.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-36 text-left font-medium text-muted">
              Pekerjaan / Topik
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-1 pb-1 align-bottom text-[10px] font-medium leading-tight text-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <th
                scope="row"
                className="max-w-[150px] truncate pr-2 text-left text-[11px] font-medium text-ink"
                title={row}
              >
                {row}
              </th>
              {columns.map((column) => {
                const cell = lookup.get(`${row}|${column}`);
                const count = cell?.count ?? 0;
                const intensity = maxCount > 0 ? count / maxCount : 0;
                return (
                  <td key={column} className="p-0">
                    <button
                      type="button"
                      onClick={() => onSelect?.(row, column)}
                      title={`${row} × ${column}: ${formatNumber(count)} post (${formatPercent(cell?.share_of_role ?? 0)} dari pekerjaan ini)`}
                      className="flex h-9 w-full items-center justify-center rounded text-[11px] font-medium tabular transition hover:ring-2 hover:ring-primary"
                      style={HEATMAP_SCALE[heatLevel(count, intensity)]}
                    >
                      {count === 0 ? "–" : formatNumber(count)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted">
        Warna lebih gelap berarti jumlah post lebih banyak. Angka tetap ditampilkan
        agar tidak bergantung pada warna saja. Klik sel untuk membuka post terkait.
      </p>
    </div>
  );
}

/* --------------------------------------------------- keyword network graph */

export function KeywordNetwork({
  nodes,
  edges,
  onSelect,
  activeKeyword,
}: {
  nodes: Array<{ id: string; label: string; count: number }>;
  edges: Array<{ source: string; target: string; weight: number }>;
  onSelect?: (keyword: string) => void;
  activeKeyword?: string;
}) {
  if (nodes.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted">
        Belum ada kata kunci yang cukup sering muncul pada filter ini.
      </p>
    );
  }

  // Tata letak radial deterministik: mudah dibaca dan stabil antar render.
  const width = 520;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2;
  const visible = nodes.slice(0, 16);
  const maxCount = Math.max(...visible.map((node) => node.count), 1);

  const positions = new Map<string, { x: number; y: number; r: number }>();
  visible.forEach((node, index) => {
    if (index === 0) {
      positions.set(node.id, { x: centerX, y: centerY, r: 26 });
      return;
    }
    const ring = index <= 7 ? 1 : 2;
    const inRing = ring === 1 ? index - 1 : index - 8;
    const ringSize = ring === 1 ? 7 : Math.max(visible.length - 8, 1);
    const angle = (inRing / ringSize) * Math.PI * 2 - Math.PI / 2;
    const radius = ring === 1 ? 90 : 142;
    positions.set(node.id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius * 0.82,
      r: 12 + (node.count / maxCount) * 12,
    });
  });

  return (
    <div className="tp-scroll-x">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[320px] w-full min-w-[480px]"
        // Bukan role="img": simpulnya dapat difokus dan diklik, sehingga
        // grafik ini berperan sebagai grup kontrol, bukan gambar statis.
        role="group"
        aria-label={`Jaringan ${visible.length} kata kunci yang sering muncul bersama.`}
      >
        {edges.map((edge, index) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          return (
            <line
              key={index}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#cbd5e1"
              strokeWidth={Math.min(edge.weight / 3, 2.5)}
              strokeOpacity={0.55}
            />
          );
        })}
        {visible.map((node) => {
          const position = positions.get(node.id);
          if (!position) return null;
          const isActive = activeKeyword === node.id;
          return (
            <g
              key={node.id}
              transform={`translate(${position.x}, ${position.y})`}
              className="cursor-pointer"
              onClick={() => onSelect?.(node.id)}
              role="button"
              tabIndex={0}
              aria-label={`Kata kunci ${node.label}, ${node.count} post`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelect?.(node.id);
              }}
            >
              <circle
                r={position.r}
                fill={isActive ? "rgb(var(--tp-primary))" : "rgb(var(--tp-primary-soft))"}
                stroke={isActive ? "rgb(var(--tp-primary-strong))" : "#bfdbfe"}
                strokeWidth={1.5}
              />
              <text
                textAnchor="middle"
                dy="0.34em"
                fontSize={10}
                fill={isActive ? "#fff" : "rgb(var(--tp-primary-strong))"}
                className="pointer-events-none select-none"
              >
                {node.label.length > 12 ? `${node.label.slice(0, 11)}…` : node.label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-[11px] text-muted">
        Ukuran lingkaran mengikuti frekuensi kata; garis berarti dua kata sering
        muncul pada post yang sama. Klik kata untuk menelusuri lebih lanjut.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- sparkline */

export function Sparkline({ data, tone = "rgb(var(--tp-primary))" }: { data: SeriesPoint[]; tone?: string }) {
  if (data.length === 0) return <span className="text-xs text-muted">Tidak ada data</span>;
  const counts = data.map((point) => point.count);
  const max = Math.max(...counts, 1);
  const min = Math.min(...counts);
  const width = 120;
  const height = 32;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = counts
    .map((count, index) => {
      const y = height - ((count - min) / Math.max(max - min, 1)) * (height - 4) - 2;
      return `${index * step},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`Tren ${data.length} hari terakhir, dari ${counts[0]} hingga ${counts[counts.length - 1]} post.`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={tone}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
