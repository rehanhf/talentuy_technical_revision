import { describe, expect, it } from "vitest";

import { FETCH_QUERY_MAX_LENGTH, FETCH_TEMPLATES } from "@/lib/fetch-templates";

describe("Template Keyword penarikan data", () => {
  it("menyediakan lima templat bernama unik dengan deskripsi satu baris", () => {
    expect(FETCH_TEMPLATES).toHaveLength(5);
    expect(new Set(FETCH_TEMPLATES.map((t) => t.name)).size).toBe(5);
    for (const template of FETCH_TEMPLATES) {
      expect(template.description.trim()).not.toBe("");
      expect(template.description).not.toContain("\n");
    }
  });

  it("setiap kueri muat dalam batas endpoint dan tanda kutipnya berpasangan", () => {
    for (const { query } of FETCH_TEMPLATES) {
      expect(query.length).toBeGreaterThanOrEqual(2);
      expect(query.length).toBeLessThanOrEqual(FETCH_QUERY_MAX_LENGTH);
      expect((query.match(/"/g) ?? []).length % 2).toBe(0);
      expect((query.match(/\(/g) ?? []).length).toBe((query.match(/\)/g) ?? []).length);
    }
  });
});
