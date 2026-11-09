import { expect, type Page } from "@playwright/test";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000";

export const ACCOUNTS = {
  admin: "rani@talentpulse.local",
  analyst: "dimas@talentpulse.local",
  viewer: "sinta@talentpulse.local",
} as const;

export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "TalentPulse123!";

/** Gagal lebih awal dengan pesan jelas bila backend belum dijalankan. */
export async function ensureApiReady(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/health`);
  } catch {
    throw new Error(
      `Backend tidak dapat dihubungi di ${API_URL}. Jalankan: cd apps/api && uvicorn app.main:app --port 8000`,
    );
  }
  const body = (await response.json()) as { seeded: boolean; post_count: number };
  if (!body.seeded) {
    throw new Error(
      "Basis data belum berisi data demo. Jalankan: cd apps/api && python -m app.seed --reset",
    );
  }
}

export async function login(
  page: Page,
  role: keyof typeof ACCOUNTS = "analyst",
): Promise<void> {
  await page.goto("/masuk");
  await page.getByLabel("Email").fill(ACCOUNTS[role]);
  await page.getByLabel("Kata sandi", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await expect(
    page.getByRole("heading", { name: "Ringkasan Percakapan Kandidat" }),
  ).toBeVisible();
}

/** Centang satu nilai pada panel filter global (cross-filter seluruh halaman). */
export async function applyFilter(page: Page, value: string): Promise<void> {
  const openFilters = page.getByRole("button", { name: "Buka filter global" });
  if (await openFilters.isVisible()) await openFilters.click();
  const option = page.getByRole("checkbox", { name: value, exact: true }).first();
  await option.scrollIntoViewIfNeeded();
  await option.check();
  await expect(option).toBeChecked();
  const closeFilters = page.getByRole("dialog", { name: "Filter global" }).getByRole("button", { name: "Tutup panel detail", exact: true });
  if (await closeFilters.isVisible()) await closeFilters.click();
  // Chip filter aktif memakai slug topik, jadi keberadaannya dicek secara umum.
  await expect(page.getByText("Filter aktif").first()).toBeVisible();
}

export async function openPage(page: Page, name: string): Promise<void> {
  await page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name }).click();
}
