"use client";

import { Highlighter, PencilLine } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { SentimentBadge, Tag } from "@/components/ui";
import { useCorrectLabels, useTaxonomy } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatPercent } from "@/lib/format";
import type { LabelField, Post } from "@/lib/types";

/** Padanan istilah naskah untuk keempat label (lihat README). */
export const LABEL_FIELDS: Array<{ field: LabelField; title: string }> = [
  { field: "topic", title: "Kategori isu" },
  { field: "sentiment", title: "Polaritas sentimen" },
  { field: "intent", title: "Intensi percakapan" },
  { field: "job_role", title: "Jenis pekerjaan" },
];

function escapeRegex(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Sorot kata yang cocok tanpa merusak teks asli post. */
export function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const escaped = terms.filter(Boolean).map(escapeRegex).join("|");
  if (!escaped) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  const lowered = terms.map((term) => term.toLowerCase());

  return (
    <>
      {parts.map((part, index) =>
        lowered.includes(part.toLowerCase()) ? (
          <mark key={index} className="rounded bg-warning/25 px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * Pemicu dicocokkan pada teks ternormalisasi (slang sudah diekspansi), jadi
 * sebagian tidak muncul persis pada teks asli. Yang tidak ditemukan tetap
 * ditampilkan dengan keterangan agar dasar label tidak tersembunyi.
 */
export function appearsInText(text: string, trigger: string) {
  return text.toLowerCase().includes(trigger.toLowerCase());
}

function labelValue(post: Post, field: LabelField) {
  switch (field) {
    case "topic":
      return post.topic_name ?? "Belum terklasifikasi";
    case "sentiment":
      return post.sentiment_label;
    case "intent":
      return post.intent_label;
    case "job_role":
      return post.job_role;
  }
}

function labelConfidence(post: Post, field: LabelField) {
  if (field === "sentiment") return post.sentiment_confidence;
  if (field === "intent") return post.intent_confidence;
  return null;
}

export function ClassificationBasis({
  post,
  focus,
  onFocus,
  onCorrect,
  showConfidence,
  canCorrect,
}: {
  post: Post;
  focus: LabelField | null;
  onFocus: (field: LabelField | null) => void;
  onCorrect: (field: LabelField) => void;
  showConfidence: boolean;
  canCorrect: boolean;
}) {
  const hasBasis = Object.keys(post.explanation ?? {}).length > 0;

  return (
    <section aria-labelledby="judul-dasar-klasifikasi">
      <h3
        id="judul-dasar-klasifikasi"
        className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        Label dan dasar klasifikasi
      </h3>
      <p className="mb-2.5 text-[11px] leading-relaxed text-muted">
        Setiap label ditetapkan oleh aturan deterministik. Pilih &ldquo;Sorot&rdquo; untuk
        menandai kata pemicunya pada teks di atas.
      </p>

      {!hasBasis && (
        <p className="mb-2.5 rounded-md bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning-strong">
          Dasar klasifikasi belum tersimpan untuk post ini karena dianalisis dengan versi
          sebelumnya. Admin dapat menjalankan Analisis ulang di Data &amp; Pengaturan.
        </p>
      )}

      <ul className="space-y-2">
        {LABEL_FIELDS.map(({ field, title }) => {
          const basis = post.explanation?.[field];
          const confidence = labelConfidence(post, field);
          const triggers = basis?.triggers ?? [];
          const active = focus === field;
          return (
            <li
              key={field}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                active ? "border-warning bg-warning/5" : "border-line",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted">{title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] font-medium text-ink">
                    {field === "sentiment" ? (
                      <SentimentBadge label={post.sentiment_label} />
                    ) : (
                      labelValue(post, field)
                    )}
                    {basis?.corrected && <Tag tone="primary">dikoreksi manual</Tag>}
                    {showConfidence && confidence !== null && (
                      <span className="tabular text-[11px] font-normal text-muted">
                        keyakinan {formatPercent(confidence * 100)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {triggers.length > 0 && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      aria-pressed={active}
                      onClick={() => onFocus(active ? null : field)}
                    >
                      <Highlighter className="h-3.5 w-3.5" aria-hidden />
                      {active ? "Hapus sorotan" : "Sorot"}
                    </button>
                  )}
                  {canCorrect && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                      onClick={() => onCorrect(field)}
                      aria-label={`Koreksi ${title.toLowerCase()}`}
                    >
                      <PencilLine className="h-3.5 w-3.5" aria-hidden />
                      Koreksi
                    </button>
                  )}
                </div>
              </div>

              {basis && (
                <>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink">{basis.rule}</p>
                  {basis.corrected && basis.auto_rule && (
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      Aturan otomatis semula: {basis.auto_rule}
                    </p>
                  )}
                  {triggers.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[11px] text-muted">Kata pemicu:</span>
                      {triggers.map((trigger) => {
                        const visible = appearsInText(post.text, trigger);
                        return (
                          <span
                            key={trigger}
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[11px]",
                              visible
                                ? "border-warning/40 bg-warning/10 text-ink"
                                : "border-dashed border-line text-muted",
                            )}
                            title={
                              visible
                                ? undefined
                                : "Cocok setelah normalisasi teks (mis. singkatan atau slang)"
                            }
                          >
                            {trigger}
                            {!visible && <span className="sr-only"> (setelah normalisasi)</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {post.needs_review && (
        <p className="mt-2 rounded-md bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning-strong">
          Post ini ditandai perlu ditinjau manusia: keyakinan label otomatis rendah atau ada
          usulan koreksi.
        </p>
      )}
    </section>
  );
}

/**
 * Koreksi label dilakukan langsung oleh pengguna yang login.
 */
export function LabelCorrection({
  post,
  field,
  onFieldChange,
  onDone,
}: {
  post: Post;
  field: LabelField;
  onFieldChange: (field: LabelField) => void;
  onDone: (result: { message: string; tone: "success" | "error"; post?: Post }) => void;
}) {
  const { data: taxonomy } = useTaxonomy();
  const correct = useCorrectLabels();
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue("");
  }, [field, post.id]);

  const options: Array<{ value: string; label: string }> = !taxonomy
    ? []
    : field === "topic"
      ? taxonomy.topics.map((topic) => ({ value: topic.slug, label: topic.name }))
      : field === "sentiment"
        ? taxonomy.sentiments.map((item) => ({ value: item, label: item }))
        : field === "intent"
          ? taxonomy.intents.map((item) => ({ value: item, label: item }))
          : taxonomy.job_roles.map((item) => ({ value: item, label: item }));

  const pending = correct.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value) return;
    try {
      const key = {
        topic: "topic_slug",
        sentiment: "sentiment_label",
        intent: "intent_label",
        job_role: "job_role",
      }[field];
      const updated = await correct.mutateAsync({ postId: post.id, body: { [key]: value } });
      onDone({ message: "Label berhasil dikoreksi.", tone: "success", post: updated });
    } catch (caught) {
      onDone({
        message: caught instanceof ApiError ? caught.userMessage : "Koreksi gagal disimpan.",
        tone: "error",
      });
    }
  };

  return (
    <section aria-labelledby="judul-koreksi" className="rounded-lg border border-line p-3">
      <h3
        id="judul-koreksi"
        className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        Koreksi label
      </h3>
      <form onSubmit={submit} className="space-y-2.5" noValidate>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label htmlFor="koreksi-label" className="tp-label">
              Label
            </label>
            <select
              id="koreksi-label"
              className="tp-input"
              value={field}
              onChange={(event) => onFieldChange(event.target.value as LabelField)}
            >
              {LABEL_FIELDS.map((item) => (
                <option key={item.field} value={item.field}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="koreksi-nilai" className="tp-label">
              Label yang benar
            </label>
            <select
              id="koreksi-nilai"
              className="tp-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="">Pilih label</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted">
            Koreksi tercatat di audit log dan menggantikan label otomatis.
          </p>
          <button
            type="submit"
            className="tp-btn tp-btn-primary"
            disabled={!value || pending}
          >
            {pending ? "Menyimpan…" : "Simpan koreksi"}
          </button>
        </div>
      </form>
    </section>
  );
}
