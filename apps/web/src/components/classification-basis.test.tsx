import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ClassificationBasis,
  Highlighted,
  appearsInText,
} from "@/components/classification-basis";
import type { Post } from "@/lib/types";

const POST: Post = {
  id: "p1",
  external_post_id: "demo_000001",
  text: "Min, gaji kasir udah UMR belum? gak jelas potongannya",
  created_at_source: "2026-10-01T08:00:00",
  language: "id",
  source: "demo",
  url: null,
  is_synthetic: true,
  like_count: 0,
  repost_count: 0,
  reply_count: 0,
  quote_count: 0,
  engagement_score: 0,
  sentiment_label: "Negatif",
  intent_label: "Pertanyaan",
  job_role: "Kasir",
  topic_slug: "gaji-benefit",
  topic_name: "Gaji dan Benefit",
  relevance_score: 0.8,
  needs_review: false,
  keywords: [],
  explanation: {
    topic: { rule: "Kata kunci taxonomy topik cocok.", triggers: ["gaji", "umr"], corrected: false, auto_rule: "" },
    sentiment: { rule: "Leksikon sentimen.", triggers: ["tidak jelas"], corrected: false, auto_rule: "" },
    intent: { rule: "Penanda pertanyaan ditemukan.", triggers: ["?"], corrected: false, auto_rule: "" },
    job_role: {
      rule: "Dikoreksi manual oleh Admin Demo. Label sebelumnya: Lainnya.",
      triggers: [],
      corrected: true,
      auto_rule: "Tidak ada kata kunci dari lima jenis pekerjaan.",
    },
  },
  sentiment_confidence: 0.8,
  intent_confidence: 0.9,
  model_version: "baseline-1.0.0",
};

describe("dasar klasifikasi", () => {
  it("mencocokkan pemicu tanpa memperhatikan huruf besar/kecil", () => {
    expect(appearsInText(POST.text, "umr")).toBe(true);
    // "gak jelas" dinormalisasi menjadi "tidak jelas" sebelum dicocokkan.
    expect(appearsInText(POST.text, "tidak jelas")).toBe(false);
  });

  it("menyorot kata pemicu pada teks asli", () => {
    const { container } = render(<Highlighted text={POST.text} terms={["gaji", "?"]} />);
    const marks = [...container.querySelectorAll("mark")].map((m) => m.textContent);
    expect(marks).toEqual(["gaji", "?"]);
  });

  it("menampilkan aturan keempat label dan status koreksi", () => {
    render(
      <ClassificationBasis
        post={POST}
        focus={null}
        onFocus={() => {}}
        onCorrect={() => {}}
        showConfidence={false}
        canCorrect={false}
      />,
    );
    for (const title of [
      "Kategori isu",
      "Polaritas sentimen",
      "Intensi percakapan",
      "Jenis pekerjaan",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText("Penanda pertanyaan ditemukan.")).toBeInTheDocument();
    expect(screen.getByText("dikoreksi manual")).toBeInTheDocument();
    expect(screen.getByText(/Aturan otomatis semula/)).toBeInTheDocument();
    expect(screen.getByText("(setelah normalisasi)", { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Koreksi/ })).not.toBeInTheDocument();
  });

  it("memilih label untuk disorot", async () => {
    const onFocus = vi.fn();
    render(
      <ClassificationBasis
        post={POST}
        focus={null}
        onFocus={onFocus}
        onCorrect={() => {}}
        showConfidence
        canCorrect
      />,
    );
    await userEvent.click(screen.getAllByRole("button", { name: "Sorot" })[0]);
    expect(onFocus).toHaveBeenCalledWith("topic");
    expect(screen.getByRole("button", { name: "Koreksi jenis pekerjaan" })).toBeInTheDocument();
  });

  it("memberi tahu bila dasar klasifikasi belum tersimpan", () => {
    render(
      <ClassificationBasis
        post={{ ...POST, explanation: {} }}
        focus={null}
        onFocus={() => {}}
        onCorrect={() => {}}
        showConfidence={false}
        canCorrect={false}
      />,
    );
    expect(screen.getByText(/belum tersimpan/)).toBeInTheDocument();
  });
});
