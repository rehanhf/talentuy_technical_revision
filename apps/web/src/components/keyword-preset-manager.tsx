"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import {
  Card,
  ConfirmDialog,
  Drawer,
  ErrorState,
  TableSkeleton,
  Tag,
} from "@/components/ui";
import {
  useDeleteKeywordPreset,
  useKeywordPresets,
  useSaveKeywordPreset,
} from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import type { KeywordPreset, TopicMeta } from "@/lib/types";

type PresetForm = {
  topic_slug: string;
  label: string;
  query_text: string;
  sort_order: number;
  is_active: boolean;
};

const EMPTY_FORM: PresetForm = {
  topic_slug: "",
  label: "",
  query_text: "",
  sort_order: 0,
  is_active: true,
};

/**
 * Preset kata kunci per kategori isu (karakteristik *starting* Ellis).
 * Preset disimpan di basis data sehingga admin dapat menyuntingnya tanpa
 * mengubah kode; pengguna memakainya di Pencarian Post.
 */
export function KeywordPresetManager({
  topics,
  onToast,
}: {
  topics: TopicMeta[];
  onToast: (toast: { message: string; tone: "success" | "error" }) => void;
}) {
  const presets = useKeywordPresets();
  const save = useSaveKeywordPreset();
  const remove = useDeleteKeywordPreset();

  const [editing, setEditing] = useState<KeywordPreset | "new" | null>(null);
  const [form, setForm] = useState<PresetForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<KeywordPreset | null>(null);

  const grouped = useMemo(() => {
    const groups = new Map<string, { name: string; items: KeywordPreset[] }>();
    for (const preset of presets.data ?? []) {
      const group = groups.get(preset.topic_slug) ?? { name: preset.topic_name, items: [] };
      group.items.push(preset);
      groups.set(preset.topic_slug, group);
    }
    return [...groups.entries()];
  }, [presets.data]);

  const openForm = (preset: KeywordPreset | "new", topicSlug?: string) => {
    setFormError(null);
    setEditing(preset);
    setForm(
      preset === "new"
        ? { ...EMPTY_FORM, topic_slug: topicSlug ?? topics[0]?.slug ?? "" }
        : {
            topic_slug: preset.topic_slug,
            label: preset.label,
            query_text: preset.query_text,
            sort_order: preset.sort_order,
            is_active: preset.is_active,
          },
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (!form.label.trim() || !form.query_text.trim() || !form.topic_slug) {
      setFormError("Kategori isu, nama preset, dan kueri wajib diisi.");
      return;
    }
    try {
      await save.mutateAsync({
        id: editing === "new" ? undefined : editing.id,
        body: { ...form, label: form.label.trim(), query_text: form.query_text.trim() },
      });
      onToast({
        message: editing === "new" ? "Preset ditambahkan." : "Preset diperbarui.",
        tone: "success",
      });
      setEditing(null);
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.userMessage : "Preset gagal disimpan.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await remove.mutateAsync(target.id);
      onToast({ message: `Preset "${target.label}" dihapus.`, tone: "success" });
    } catch (caught) {
      onToast({
        message: caught instanceof ApiError ? caught.userMessage : "Preset gagal dihapus.",
        tone: "error",
      });
    }
  };

  return (
    <>
      <Card
        title="Preset kata kunci"
        description="Kueri terpandu per kategori isu yang tampil di Pencarian Post, agar pengguna baru dapat mulai menelusuri tanpa mengetik kueri."
        actions={
          <button type="button" className="tp-btn" onClick={() => openForm("new")}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Tambah preset
          </button>
        }
      >
        {presets.isError ? (
          <ErrorState
            message={
              presets.error instanceof ApiError
                ? presets.error.userMessage
                : "Kesalahan tidak terduga."
            }
            onRetry={() => presets.refetch()}
          />
        ) : presets.isLoading ? (
          <TableSkeleton rows={4} />
        ) : grouped.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">Belum ada preset.</p>
        ) : (
          <ul className="space-y-2">
            {grouped.map(([slug, group]) => (
              <li key={slug} className="rounded-lg border border-line px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{group.name}</span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => openForm("new", slug)}
                  >
                    Tambah
                  </button>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {group.items.map((preset) => (
                    <li
                      key={preset.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs"
                    >
                      <span className="min-w-0">
                        <span className="text-ink">{preset.label}</span>{" "}
                        <code className="break-all text-[11px] text-muted">
                          {preset.query_text}
                        </code>{" "}
                        {!preset.is_active && <Tag>nonaktif</Tag>}
                      </span>
                      <span className="flex shrink-0 gap-3">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => openForm(preset)}
                          aria-label={`Ubah preset ${preset.label}`}
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          className="text-negative hover:underline"
                          onClick={() => setPendingDelete(preset)}
                          aria-label={`Hapus preset ${preset.label}`}
                        >
                          Hapus
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Tambah preset" : "Ubah preset"}
        width="max-w-lg"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="tp-btn" onClick={() => setEditing(null)}>
              Batal
            </button>
            <button
              type="submit"
              form="form-preset"
              className="tp-btn tp-btn-primary"
              disabled={save.isPending}
            >
              {save.isPending ? "Menyimpan…" : "Simpan preset"}
            </button>
          </div>
        }
      >
        <form id="form-preset" onSubmit={submit} className="space-y-3" noValidate>
            <div>
              <label htmlFor="preset-topik" className="tp-label">
                Kategori isu
              </label>
              <select
                id="preset-topik"
                className="tp-input"
                value={form.topic_slug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, topic_slug: event.target.value }))
                }
              >
                {topics.map((topic) => (
                  <option key={topic.slug} value={topic.slug}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="preset-nama" className="tp-label">
                Nama preset
              </label>
              <input
                id="preset-nama"
                className="tp-input"
                maxLength={120}
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
              />
            </div>
            <div>
              <label htmlFor="preset-kueri" className="tp-label">
                Kueri
              </label>
              <input
                id="preset-kueri"
                className="tp-input"
                maxLength={300}
                value={form.query_text}
                onChange={(event) =>
                  setForm((current) => ({ ...current, query_text: event.target.value }))
                }
                placeholder='Contoh: gaji OR umr OR "slip gaji"'
              />
              <p className="mt-1 text-[11px] text-muted">
                Sintaks sama dengan Pencarian Post: AND, OR, -kata, dan tanda kutip untuk frasa.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="preset-urutan" className="tp-label">
                  Urutan
                </label>
                <input
                  id="preset-urutan"
                  type="number"
                  className="tp-input w-24"
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sort_order: Number(event.target.value) || 0,
                    }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, is_active: event.target.checked }))
                  }
                />
                Tampilkan di Pencarian Post
              </label>
            </div>
            {formError && (
              <p role="alert" className="text-xs text-negative">
                {formError}
              </p>
            )}
          </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus preset?"
        description={`Preset "${pendingDelete?.label ?? ""}" tidak lagi tampil di Pencarian Post.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
