"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  HelpCircle,
  Inbox,
  Loader2,
  Minus,
  RefreshCw,
  SearchX,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { changeTone, formatChange } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ tooltip */

/**
 * Tooltip aksesibel: muncul pada hover dan focus, dan isinya juga dibaca
 * pembaca layar melalui aria-describedby.
 */
export function InfoTooltip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Definisi ${label}`}
        aria-describedby={open ? id : undefined}
        className="rounded-full p-0.5 text-muted transition hover:text-ink focus-visible:text-ink"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-6 z-30 w-60 -translate-x-1/2 rounded-lg border border-line bg-sidebar px-3 py-2 text-xs leading-relaxed text-white shadow-raised"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/* --------------------------------------------------------------- card shell */

interface CardProps {
  title: string;
  description?: string;
  definition?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Ringkasan teks alternatif untuk chart (aksesibilitas). */
  dataSummary?: string;
}

export function Card({
  title,
  description,
  definition,
  actions,
  children,
  className,
  dataSummary,
}: CardProps) {
  return (
    <section
      className={cn("tp-card flex min-w-0 flex-col", className)}
      aria-label={title}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-6 pb-2 pt-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-[18px] font-medium tracking-tight text-ink">
            {title}
            {definition && <InfoTooltip label={title} text={definition} />}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </header>
      <div className="min-w-0 flex-1 px-6 py-5">{children}</div>
      {dataSummary && (
        <p className="sr-only" aria-live="polite">
          {dataSummary}
        </p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- data states */

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={cn("tp-skeleton", className)} style={style} aria-hidden />;
}

/** Skeleton menyerupai layout akhir agar tidak terjadi lompatan tata letak. */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Memuat grafik">
      <Skeleton className="h-3 w-40" />
      <div className="flex items-end gap-2" style={{ height }}>
        {[62, 84, 46, 92, 70, 58, 96, 74, 52, 88, 66, 80].map((value, index) => (
          <Skeleton key={index} className="flex-1" style={{ height: `${value}%` }} />
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  );
}

interface StateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: StateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="rounded-full bg-primary-soft p-3 text-primary">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function NoResultState({
  query,
  onReset,
}: {
  query?: string;
  onReset: () => void;
}) {
  return (
    <EmptyState
      icon={<SearchX className="h-5 w-5" aria-hidden />}
      title="Tidak ada hasil untuk kombinasi filter ini"
      description={
        query
          ? `Pencarian "${query}" tidak menemukan percakapan. Coba kurangi kata kunci, ganti operator AND menjadi OR, atau perlebar rentang tanggal.`
          : "Coba perlebar rentang tanggal, kurangi filter, atau pilih preset topik yang lebih umum."
      }
      action={
        <button type="button" className="tp-btn" onClick={onReset}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Hapus semua filter
        </button>
      }
    />
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center"
    >
      <div className="rounded-full bg-negative/10 p-3 text-negative-strong">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">Data gagal dimuat</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="tp-btn" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Coba lagi
        </button>
      )}
    </div>
  );
}


export function InlineLoader({ label = "Memuat" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" role="status">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      {label}…
    </span>
  );
}

/* ----------------------------------------------------------------- badges */

export function ChangeBadge({
  value,
  invertColors = false,
}: {
  value: number | null | undefined;
  /** Untuk metrik yang kenaikannya justru negatif (mis. keluhan). */
  invertColors?: boolean;
}) {
  const tone = changeTone(value);
  const Icon =
    tone === "up" ? ArrowUpRight : tone === "down" ? ArrowDownRight : Minus;

  const good = invertColors ? tone === "down" : tone === "up";
  const bad = invertColors ? tone === "up" : tone === "down";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular",
        tone === "unknown" && "bg-surface-muted text-muted",
        tone === "flat" && "bg-surface-muted text-muted",
        good && "bg-positive/10 text-positive-strong",
        bad && "bg-negative/10 text-negative-strong",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {formatChange(value)}
    </span>
  );
}

const SENTIMENT_STYLE: Record<string, string> = {
  Positif: "bg-positive/10 text-positive-strong border-positive/20",
  Negatif: "bg-negative/10 text-negative-strong border-negative/20",
  Netral: "bg-neutral/10 text-neutral-strong border-neutral/20",
  "Tidak Yakin": "bg-warning/10 text-warning-strong border-warning/25",
};

/** Sentimen tidak boleh dibedakan hanya lewat warna — selalu ada teks label. */
export function SentimentBadge({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        SENTIMENT_STYLE[label] ?? "bg-surface-muted text-muted border-line",
      )}
    >
      <span aria-hidden>
        {label === "Positif" ? "▲" : label === "Negatif" ? "▼" : label === "Tidak Yakin" ? "?" : "●"}
      </span>
      {label}
    </span>
  );
}

export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "primary" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "default" && "bg-surface-muted text-muted",
        tone === "primary" && "bg-primary-soft text-primary-strong",
        tone === "warning" && "bg-warning/10 text-warning-strong",
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ drawer */

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/**
 * Detail drawer menjaga konteks eksplorasi (pengguna tidak kehilangan filter).
 * Menutup dengan Escape dan menahan fokus di dalamnya.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-xl",
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      // Fokus bisa berada di luar panel pada milidetik pertama setelah drawer
      // dibuka, atau setelah elemen yang sedang difokus dilepas dari DOM.
      // Tarik kembali ke dalam agar Tab tidak pernah keluar dari drawer.
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [open, onClose],
  );

  // Handler disimpan pada ref supaya effect di bawah hanya bergantung pada
  // `open`. Bila handler ikut menjadi dependency, setiap render ulang halaman
  // (mis. pembaruan data di latar) akan menjalankan cleanup — dan cleanup itu
  // mengembalikan fokus ke pemicu, sehingga fokus terlempar keluar drawer.
  const keyDownRef = useRef(handleKeyDown);
  keyDownRef.current = handleKeyDown;

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const listener = (event: KeyboardEvent) => keyDownRef.current(event);
    document.addEventListener("keydown", listener);
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    }, 30);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", listener);
      window.clearTimeout(timer);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 animate-fade-in bg-sidebar/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex h-full w-full flex-col animate-slide-in bg-surface shadow-drawer",
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="tp-btn px-2 py-1.5"
            onClick={onClose}
            aria-label="Tutup panel detail"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- confirm */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Hapus",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sidebar/45" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-fade-in rounded-card border border-line bg-surface p-5 shadow-raised"
      >
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="tp-btn" onClick={onCancel}>
            Batal
          </button>
          <button
            type="button"
            className="tp-btn border-transparent bg-negative text-white hover:bg-negative/90"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- toast */

export function Toast({
  message,
  tone = "success",
  onDismiss,
}: {
  message: string;
  tone?: "success" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-white shadow-raised",
        tone === "success" ? "bg-sidebar" : "bg-negative",
      )}
    >
      {message}
      <button type="button" onClick={onDismiss} aria-label="Tutup notifikasi">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function DrillDownLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:text-primary-strong"
    >
      {label}
      <ArrowRight className="h-3 w-3" aria-hidden />
    </button>
  );
}
