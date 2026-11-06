"use client";

import {
  Activity,
  BarChart3,
  CalendarDays,
  BookOpen,
  ChevronLeft,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  PanelLeftClose,
  RotateCcw,
  Search,
  Shapes,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useFilters } from "@/hooks/useFilters";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/format";
import { filtersToSearchParams } from "@/lib/filters";
import type { ResponseMeta } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
  section?: string;
}

export const HOME_ITEM: NavItem = {
  href: "/",
  label: "Beranda",
  icon: LayoutDashboard,
  description: "Ringkasan percakapan kandidat pada periode aktif",
};

// Ubah label untuk mengganti nama menu; href menentukan alamat halaman.
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/tren",
    label: "Analisis Tren",
    icon: Activity,
    description: "Perubahan volume antar periode dan lonjakan terdeteksi",
  },
  {
    href: "/topik",
    label: "Eksplorasi Topik",
    icon: Shapes,
    description: "Topik, subtopik, dan kata kunci terkait",
  },
  {
    href: "/post",
    label: "Pencarian Post",
    icon: MessagesSquare,
    description: "Cari post sebagai konteks percakapan",
  },
  {
    href: "/monitoring",
    label: "Monitoring",
    section: "Pantau & laporkan",
    icon: BarChart3,
    description: "Query tersimpan dan perbandingan periode",
  },
  {
    href: "/laporan",
    label: "Laporan Insight",
    icon: FileText,
    description: "Susun temuan yang ditinjau manusia",
  },
  {
    href: "/data",
    label: "Data & Pengaturan",
    section: "Kelola & pahami",
    icon: Database,
    description: "Sumber data, taxonomy, dan kualitas data",
  },
  {
    href: "/metodologi",
    label: "Metodologi & Etika",
    icon: BookOpen,
    description: "Cara data dikumpulkan, diolah, dan batasannya",
  },
];

/* ------------------------------------------------------------------ sidebar */

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { filters } = useFilters();
  const filterQuery = filtersToSearchParams(filters).toString();

  const content = (collapsed: boolean) => (
    <nav
      className="tp-sidebar flex h-full flex-col text-slate-300"
      aria-label="Navigasi utama"
    >
      <div className={cn("flex items-center justify-between gap-3 px-5 py-7", collapsed && "flex-col px-2")}>
        <Link
          href={filterQuery ? `/?${filterQuery}` : "/"}
          aria-label="TID - Beranda"
          title="Beranda"
          aria-current={pathname === "/" ? "page" : undefined}
          className="flex items-center gap-2.5 text-white"
          onClick={onCloseMobile}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-400/15 text-blue-300">
            <BrandMark className="h-6 w-6" />
          </span>
          {!collapsed && (
            <span className="text-2xl font-semibold tracking-[-0.04em]">TID<span className="mt-1 block text-[10px] font-normal leading-relaxed tracking-normal text-slate-400">Talent Intelegence<br />Dashboard</span></span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:block"
          aria-label={collapsed ? "Lebarkan menu samping" : "Ciutkan menu samping"}
        >
          {collapsed ? (
            <Menu className="h-4 w-4" aria-hidden />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-lg p-1.5 text-slate-400 transition hover:text-white lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {!collapsed && (
        <div className="mx-4 mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-200 text-blue-900"><Shapes className="h-5 w-5" aria-hidden /></span>
          <div className="min-w-0"><p className="text-[10px] text-slate-400">Workspace</p><p className="truncate text-xs font-medium text-white">Talent Intelligence</p></div>
        </div>
      )}
      {!collapsed && <p className="px-6 pb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Ruang analisis</p>}
      <ul className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              {!collapsed && item.section && (
                <p className="px-3 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                  {item.section}
                </p>
              )}
              <Link
                href={filterQuery ? `${item.href}?${filterQuery}` : item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border px-2.5 py-2 text-[13px] transition",
                  active
                    ? "border-blue-400/25 bg-blue-400/15 font-medium text-white"
                    : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", active ? "bg-blue-300 text-slate-900" : "bg-white/5 text-slate-400 group-hover:text-white")}><Icon className="h-4 w-4" aria-hidden /></span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      {!collapsed && (
        <div className="mx-5 border-t border-white/10 py-5">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-slate-400">Akun workspace</p>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-200 text-xs font-semibold text-blue-950">{user?.name.slice(0, 2).toUpperCase() ?? "TP"}</span>
            <div className="min-w-0"><p className="truncate text-sm text-white">{user?.name}</p></div>
          </div>
        </div>
      )}
    </nav>
  );

  return (
    <>
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-screen shrink-0 transition-all duration-200 lg:block",
          collapsed ? "w-[80px]" : "w-[250px]",
        )}
      >
        {content(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={onCloseMobile} aria-hidden />
          <div className="relative h-full w-[260px] animate-slide-in">{content(false)}</div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------- topbar */

export function TopBar({
  meta,
  onOpenMobileNav,
  onOpenFilters,
}: {
  meta?: ResponseMeta;
  onOpenMobileNav: () => void;
  onOpenFilters: () => void;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { filters, activeCount, reset, setFilters, setPeriodDays } = useFilters();
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const periodDays = Math.round((Date.parse(filters.date_to) - Date.parse(filters.date_from)) / 86400000) + 1;
  const preset = filters.date_to === todayIso && [7, 30, 90].includes(periodDays) ? String(periodDays) : "custom";
  const [commandOpen, setCommandOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Ctrl/Cmd+K membuka pencarian global (tahap "Starting" pada model Ellis).
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const mode = meta?.data_source_mode ?? "demo";

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-line/70 bg-surface/90 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3 px-4 py-4 lg:px-8">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="tp-btn px-2 py-1.5 lg:hidden"
            aria-label="Buka menu navigasi"
          >
            <Menu className="h-4 w-4" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="order-last flex w-full min-w-0 items-center gap-2 rounded-full border border-line/70 bg-surface px-4 py-2.5 text-left text-sm text-muted transition hover:border-primary/40 sm:order-none sm:w-auto sm:flex-1 md:max-w-md"
            aria-label="Cari percakapan, topik, atau pekerjaan"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">
              {filters.q ? filters.q : "Cari percakapan, topik, atau pekerjaan"}
            </span>
            <kbd className="ml-auto hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-muted md:block">
              Ctrl K
            </kbd>
          </button>

          <span
            className={cn(
              "hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide sm:inline-flex",
              mode === "demo"
                ? "bg-warning/12 text-warning-strong"
                : "bg-positive/12 text-positive-strong",
            )}
            title={
              mode === "demo"
                ? "Seluruh angka berasal dari data sintetis, bukan kondisi aktual."
                : "Data berasal dari connector resmi."
            }
          >
            {mode === "demo" ? "DATA DEMO" : "DATA LIVE"}
          </span>

          <button
            type="button"
            onClick={onOpenFilters}
            className="tp-btn shrink-0"
            aria-label="Buka filter global"
          >
            Filter
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">
                {activeCount}
              </span>
            )}
          </button>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={reset}
              className="tp-btn shrink-0 text-xs"
              title="Kembalikan seluruh filter ke pengaturan awal"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Reset filter</span>
            </button>
          )}

          <div className="relative ml-auto shrink-0" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1.5 text-left transition hover:bg-surface-muted"
              aria-label={`Menu akun ${user?.name ?? "pengguna"}`}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-strong">
                {user?.name.slice(0, 2).toUpperCase() ?? "–"}
              </span>
              <span className="hidden text-xs leading-tight md:block">
                <span className="block font-medium text-ink">{user?.name}</span>
              </span>
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-11 z-40 w-60 rounded-lg border border-line bg-surface p-2 shadow-raised"
              >
                <p className="px-2 py-1.5 text-xs text-muted">{user?.email}</p>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition hover:bg-surface-muted"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/metodologi");
                  }}
                >
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Cara membaca dashboard
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-negative-strong transition hover:bg-negative/5"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line/70 px-4 py-2.5 lg:px-8">
          <label className="flex items-center gap-2 text-xs font-medium text-ink">
            <CalendarDays className="h-4 w-4 text-muted" aria-hidden />
            Periode
            <select aria-label="Periode analisis" className="tp-input w-auto py-1.5 text-xs" value={preset} onChange={(event) => event.target.value === "custom" ? onOpenFilters() : setPeriodDays(Number(event.target.value))}>
              <option value="7">7 hari terakhir</option>
              <option value="30">30 hari terakhir</option>
              <option value="90">90 hari terakhir</option>
              <option value="custom">Tanggal khusus</option>
            </select>
          </label>
          <button type="button" onClick={onOpenFilters} className="rounded-lg px-2 py-1.5 text-xs text-primary hover:bg-primary-soft" aria-label="Ubah tanggal analisis">
            {formatDate(filters.date_from)} – {formatDate(filters.date_to)}
          </button>
          {meta && <span className="ml-auto text-[11px] text-muted">Diperbarui {formatRelative(meta.last_updated)}{meta.is_stale ? " · pembaruan tertunda" : ""}</span>}
        </div>

        {meta && filters.q && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/70 px-4 py-1.5 text-[11px] text-muted lg:px-6">
            <span className="min-w-0 break-words">Kata kunci aktif: <strong className="font-medium text-ink">{filters.q}</strong></span>
            <button
              type="button"
              className="ml-auto text-primary hover:underline"
              onClick={() => setFilters({ q: undefined })}
              hidden={!filters.q}
            >
              Hapus kata kunci pencarian
            </button>
          </div>
        )}
      </header>

      <CommandSearch open={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  );
}

/* ----------------------------------------------------------- command search */

const QUICK_PRESETS = [
  { label: "Kerja outsourcing", query: "outsourcing OR alih daya" },
  { label: "Penipuan lowongan", query: "penipuan OR loker palsu" },
  { label: "Gaji dan lembur", query: "gaji OR lembur" },
  { label: "Sistem shift", query: "shift OR jam kerja" },
  { label: "Proses melamar", query: "interview OR psikotes OR lamaran" },
];

function CommandSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { filters } = useFilters();
  const [value, setValue] = useState(filters.q ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(filters.q ?? "");
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open, filters.q]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const navItems = useMemo(
    () =>
      [HOME_ITEM, ...NAV_ITEMS].filter((item) =>
        value.trim()
          ? item.label.toLowerCase().includes(value.toLowerCase()) ||
            item.description.toLowerCase().includes(value.toLowerCase())
          : true,
      ).slice(0, 4),
    [value],
  );

  if (!open) return null;

  const submit = (query: string) => {
    onClose();
    router.push(`/post?${filtersToSearchParams({ ...filters, q: query.trim() || undefined })}`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-24">
      <div className="absolute inset-0 bg-sidebar/45" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian global"
        className="relative w-full max-w-xl animate-fade-in overflow-hidden rounded-card border border-line bg-surface shadow-raised"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(value);
          }}
          className="flex items-center gap-2 border-b border-line px-4 py-3"
        >
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Cari, misalnya: gaji atau kerja shift"
            aria-label="Kata kunci pencarian"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <button type="submit" className="tp-btn tp-btn-primary px-2.5 py-1 text-xs">
            Cari
          </button>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-surface-muted" aria-label="Tutup pencarian"><X className="h-4 w-4" aria-hidden /></button>
        </form>

        <div className="max-h-[52vh] overflow-y-auto p-3">
          <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            Mulai dari topik
          </p>
          <div className="flex flex-wrap gap-1.5 px-1 pb-3">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="tp-chip transition hover:border-primary hover:text-primary"
                onClick={() => submit(preset.query)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            Buka halaman
          </p>
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-surface-muted"
                  onClick={() => {
                    onClose();
                    router.push(`${item.href}?${filtersToSearchParams(filters)}`);
                  }}
                >
                  <item.icon className="mt-0.5 h-4 w-4 text-muted" aria-hidden />
                  <span>
                    <span className="block text-sm text-ink">{item.label}</span>
                    <span className="block text-xs text-muted">{item.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-[11px] leading-relaxed text-muted">
            Operator yang didukung: <code>AND</code>, <code>OR</code>, dan{" "}
            <code>-kata</code> untuk mengecualikan. Gunakan tanda kutip untuk frasa.
            Pencarian tidak dapat dilakukan berdasarkan identitas personal.
          </p>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- breadcrumb */

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            {backLabel ?? "Kembali"}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="max-w-3xl text-[clamp(1.5rem,2.3vw,2rem)] font-medium leading-tight tracking-[-0.045em] text-ink">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
