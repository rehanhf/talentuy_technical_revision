"use client";

import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
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
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useFilters } from "@/hooks/useFilters";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { formatDate, formatRelative } from "@/lib/format";
import { filtersToSearchParams } from "@/lib/filters";
import type { ResponseMeta } from "@/lib/types";

/** Nama organisasi pemilik dashboard; tampil di bawah logo pada sidebar. */
export const ORGANISATION_NAME = "PT Siprama Cakrawala";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
  section?: string;
}

export const HOME_ITEM: NavItem = {
  href: "/",
  label: "Ringkasan",
  icon: LayoutDashboard,
  description: "Ringkasan percakapan kandidat pada periode aktif",
};

// Ubah label untuk mengganti nama menu; href menentukan alamat halaman.
// `section` menandai awal sebuah kelompok menu di sidebar.
export const NAV_ITEMS: NavItem[] = [
  {
    ...HOME_ITEM,
    section: "Ruang Analisis",
  },
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
    href: "/monitoring",
    label: "Monitoring",
    section: "Ruang Pantau",
    icon: BarChart3,
    description: "Query tersimpan dan perbandingan periode",
  },
  {
    href: "/post",
    label: "Pencarian Post",
    icon: MessagesSquare,
    description: "Cari post sebagai konteks percakapan",
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
    section: "Bantuan",
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

/* ------------------------------------------------------------ judul halaman */

interface PageTitleState {
  /** Judul terakhir yang didaftarkan, beserta path halaman asalnya. */
  entry: { path: string; title: string } | null;
  register: (path: string, title: string) => void;
}

const PageTitleContext = createContext<PageTitleState>({
  entry: null,
  register: () => {},
});

/**
 * Judul halaman tampil di bilah atas, bukan di badan halaman. Halaman tetap
 * mendaftarkannya lewat `PageHeader`, dan judul disimpan bersama path asalnya
 * supaya judul halaman sebelumnya tidak sempat terbawa saat berpindah halaman.
 */
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<{ path: string; title: string } | null>(null);
  const value = useMemo<PageTitleState>(
    () => ({
      entry,
      register: (path, title) =>
        setEntry((current) =>
          current && current.path === path && current.title === title
            ? current
            : { path, title },
        ),
    }),
    [entry],
  );
  return (
    <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
  );
}

function usePageTitle() {
  return useContext(PageTitleContext);
}

/** Judul cadangan selama halaman baru belum mendaftarkan judulnya sendiri. */
function routeTitle(pathname: string): string {
  const match = NAV_ITEMS.filter((item) => item.href !== "/").find((item) =>
    pathname.startsWith(item.href),
  );
  return match?.label ?? HOME_ITEM.label;
}

/* ------------------------------------------------------------------ sidebar */

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

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
    <nav className="tp-sidebar flex h-full flex-col" aria-label="Navigasi utama">
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-5",
          collapsed && "flex-col gap-3 px-2",
        )}
      >
        <Link
          href={filterQuery ? `/?${filterQuery}` : "/"}
          aria-label="TalentPulse - Beranda"
          title="Beranda"
          className="flex min-w-0 items-center gap-2.5"
          onClick={onCloseMobile}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-primary">
            <BrandMark className="h-5 w-5" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight text-white">
                TalentPulse
              </span>
              <span className="block truncate text-[11px] leading-tight text-[rgb(var(--tp-on-sidebar-muted))]">
                {ORGANISATION_NAME}
              </span>
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "hidden rounded-lg p-1.5 text-[rgb(var(--tp-on-sidebar-muted))] transition hover:bg-white/10 hover:text-white lg:block",
            collapsed ? "mx-auto" : "ml-auto",
          )}
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
          className="ml-auto rounded-lg p-1.5 text-[rgb(var(--tp-on-sidebar-muted))] transition hover:text-white lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              {item.section &&
                (collapsed ? (
                  <hr className="mx-2 my-2 border-white/15" />
                ) : (
                  <p className="tp-nav-section">{item.section}</p>
                ))}
              <Link
                href={filterQuery ? `${item.href}?${filterQuery}` : item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn("tp-nav-link", collapsed && "justify-center px-0")}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={cn("p-3", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-[rgb(var(--tp-sidebar))]">
            {user?.name.slice(0, 2).toUpperCase() ?? "TP"}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-white">
                {user?.name}
              </span>
              <span className="block truncate text-[11px] text-[rgb(var(--tp-on-sidebar-soft))]">
                {user?.email}
              </span>
            </span>
          )}
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <aside
        className={cn(
          "no-print sticky top-0 hidden h-screen shrink-0 transition-all duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        {content(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={onCloseMobile}
            aria-hidden
          />
          <div className="relative h-full w-[260px] animate-slide-in">
            {content(false)}
          </div>
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
  const pathname = usePathname();
  const { logout } = useAuth();
  const { filters, activeCount, reset, setFilters, setPeriodDays } = useFilters();
  const { entry } = usePageTitle();
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const periodDays =
    Math.round((Date.parse(filters.date_to) - Date.parse(filters.date_from)) / 86400000) + 1;
  const preset =
    filters.date_to === todayIso && [7, 30, 90].includes(periodDays)
      ? String(periodDays)
      : "custom";
  const [commandOpen, setCommandOpen] = useState(false);

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
  const title = entry && entry.path === pathname ? entry.title : routeTitle(pathname);

  return (
    <>
      <header className="no-print sticky top-0 z-30 bg-canvas/90 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-5 lg:px-7">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="tp-btn px-2 py-1.5 lg:hidden"
            aria-label="Buka menu navigasi"
          >
            <Menu className="h-4 w-4" aria-hidden />
          </button>

          <h1 className="min-w-0 flex-1 truncate text-[clamp(1.35rem,2vw,1.7rem)] font-semibold leading-tight tracking-[-0.03em] text-ink">
            {title}
          </h1>

          <div className="order-last flex w-full flex-wrap items-center gap-2 sm:order-none sm:w-auto">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm text-muted transition hover:border-primary/40 sm:w-[240px] sm:flex-none"
              aria-label="Cari percakapan, topik, atau pekerjaan"
            >
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">
                {filters.q ? filters.q : "Cari kata kunci…"}
              </span>
            </button>

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
                className="tp-btn shrink-0 px-2.5 text-xs"
                title="Kembalikan seluruh filter ke pengaturan awal"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="tp-btn tp-btn-primary shrink-0"
            >
              <LogOut className="h-4 w-4 sm:hidden" aria-hidden />
              Keluar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 lg:px-7">
          {/*
           * Satu kontrol periode: kata "Periode", pilihan preset, lalu rentang
           * tanggal yang sedang aktif — semuanya di dalam satu pil berbingkai.
           */}
          <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-line bg-surface text-xs">
            <label className="inline-flex items-center gap-1.5 py-1.5 pl-3 font-medium text-muted">
              Periode
              <select
                aria-label="Periode analisis"
                className="border-0 bg-transparent py-0 pl-1 pr-6 text-xs font-medium text-ink focus:outline-none"
                value={preset}
                onChange={(event) =>
                  event.target.value === "custom"
                    ? onOpenFilters()
                    : setPeriodDays(Number(event.target.value))
                }
              >
                <option value="7">7 hari terakhir</option>
                <option value="30">30 hari terakhir</option>
                <option value="90">90 hari terakhir</option>
                <option value="custom">Tanggal khusus</option>
              </select>
            </label>
            <span className="my-1.5 w-px shrink-0 bg-line" aria-hidden />
            <button
              type="button"
              onClick={onOpenFilters}
              className="inline-flex items-center gap-1 px-3 font-medium text-ink transition hover:bg-surface-muted"
              aria-label="Ubah tanggal analisis"
            >
              {formatDate(filters.date_from)} – {formatDate(filters.date_to)}
              <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3">
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

            {meta && (
              <span className="text-[11px] text-muted">
                Diperbarui {formatRelative(meta.last_updated)}
                {meta.is_stale ? " · pembaruan tertunda" : ""}
              </span>
            )}
          </div>
        </div>

        {meta && filters.q && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 text-[11px] text-muted lg:px-7">
            <span className="min-w-0 break-words">
              Kata kunci aktif:{" "}
              <strong className="font-medium text-ink">{filters.q}</strong>
            </span>
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
      NAV_ITEMS.filter((item) =>
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
    router.push(
      `/post?${filtersToSearchParams({ ...filters, q: query.trim() || undefined })}`,
    );
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-surface-muted"
            aria-label="Tutup pencarian"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
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

/* ------------------------------------------------------------- page header */

/**
 * Judul halaman didaftarkan ke bilah atas; elemen ini hanya merender sub-judul,
 * penanda, dan aksi khusus halaman.
 */
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
  badge?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  const pathname = usePathname();
  const { register } = usePageTitle();

  useEffect(() => {
    register(pathname, title);
  }, [register, pathname, title]);

  if (!subtitle && !badge && !actions && !backHref) return null;

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
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
        {badge && <div className="flex flex-wrap items-center gap-2">{badge}</div>}
        {subtitle && (
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
