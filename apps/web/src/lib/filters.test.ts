import { describe, expect, it } from "vitest";

import {
  activeFilterChips,
  countActiveFilters,
  defaultFilters,
  filtersFromSearchParams,
  filtersToApiParams,
  filtersToSearchParams,
  toggleArrayValue,
} from "@/lib/filters";

describe("filter global", () => {
  it("memakai jendela 30 hari sebagai bawaan", () => {
    const filters = defaultFilters();
    const from = new Date(filters.date_from);
    const to = new Date(filters.date_to);
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    expect(days).toBe(30);
  });

  it("hanya menulis nilai non-default ke URL", () => {
    const params = filtersToSearchParams(defaultFilters());
    expect(params.toString()).toBe("");
  });

  it("mempertahankan filter melalui URL (round trip)", () => {
    const filters = {
      ...defaultFilters(),
      q: "gaji AND gudang",
      topics: ["gaji-benefit", "shift-jam-kerja"],
      job_roles: ["SPG/SPB"],
      min_engagement: 20,
    };

    const restored = filtersFromSearchParams(
      new URLSearchParams(filtersToSearchParams(filters).toString()),
    );

    expect(restored.q).toBe("gaji AND gudang");
    expect(restored.topics).toEqual(["gaji-benefit", "shift-jam-kerja"]);
    expect(restored.job_roles).toEqual(["SPG/SPB"]);
    expect(restored.min_engagement).toBe(20);
  });

  it("mengembalikan bawaan bila URL kosong", () => {
    expect(filtersFromSearchParams(null)).toEqual(defaultFilters());
  });

  it("mengubah filter menjadi parameter API dengan batas hari penuh", () => {
    const params = filtersToApiParams({ ...defaultFilters(), topics: ["proses-melamar"] });
    expect(String(params.date_from)).toMatch(/T00:00:00$/);
    expect(String(params.date_to)).toMatch(/T23:59:59$/);
    expect(params.topics).toEqual(["proses-melamar"]);
  });

  it("membuat chip untuk setiap filter aktif dan tidak untuk periode bawaan", () => {
    const chips = activeFilterChips({
      ...defaultFilters(),
      q: "shift",
      sentiments: ["Negatif"],
    });

    expect(chips.map((chip) => chip.label)).toEqual([
      'Pencarian: "shift"',
      "Sentimen: Negatif",
    ]);
    expect(countActiveFilters({ ...defaultFilters(), q: "shift" })).toBe(1);
  });

  it("menghitung query tersimpan sebagai filter aktif", () => {
    expect(countActiveFilters({ ...defaultFilters(), query_id: "abc" })).toBe(1);
  });

  // Cross-filter dari grafik memakai toggle yang sama.
  it("menambah lalu melepas nilai pada toggle array", () => {
    expect(toggleArrayValue([], "gaji-benefit")).toEqual(["gaji-benefit"]);
    expect(toggleArrayValue(["gaji-benefit"], "gaji-benefit")).toEqual([]);
    expect(toggleArrayValue(["a"], "b")).toEqual(["a", "b"]);
  });
});

it("preserves data source filtering in URLs, API requests and active chips", () => {
  const filters = filtersFromSearchParams(new URLSearchParams("data_type=twitterapi_io"));
  expect(filtersToSearchParams(filters).get("data_type")).toBe("twitterapi_io");
  expect(filtersToApiParams(filters).data_type).toBe("twitterapi_io");
  expect(activeFilterChips(filters)).toContainEqual({ key: "data_type", value: "twitterapi_io", label: "twitterapi.io saja" });
  expect(filtersFromSearchParams(new URLSearchParams("data_type=invalid")).data_type).toBeUndefined();
});
