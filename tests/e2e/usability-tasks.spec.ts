import { expect, test } from "@playwright/test";

import { applyFilter, ensureApiReady, login, openPage } from "./helpers";

/**
 * Tugas 1–5 pada `docs/usability_test.md`. Skenario otomatis memakai jalur
 * yang sama dengan pengujian bersama pengguna.
 */
test.beforeAll(async () => {
  await ensureApiReady();
});

test.beforeEach(async ({ page }) => {
  await login(page, "analyst");
});

test("Tugas 1 — menemukan topik dominan untuk SPG/SPB", async ({ page }) => {
  await applyFilter(page, "SPG/SPB");

  const topicCard = page.getByRole("region", { name: "Topik terbanyak" });
  await expect(topicCard).toBeVisible();

  // Alternatif tabel dipakai agar pembacaan tidak bergantung pada render SVG.
  await topicCard.getByRole("button", { name: "Lihat sebagai tabel" }).click();
  const rows = topicCard.locator("tbody tr");
  await expect(rows).not.toHaveCount(0);
  expect(await rows.count()).toBeGreaterThanOrEqual(3);

  // Filter global tetap terpasang ketika pengguna berpindah halaman.
  await openPage(page, "Eksplorasi Topik");
  await expect(page).toHaveURL(/job_roles=Staf\+Gudang|job_roles=Staf%20Gudang/);
});

test("Tugas 2 — menemukan pertanyaan sistem shift dan membuka post", async ({ page }) => {
  await applyFilter(page, "Sistem Shift dan Jam Kerja");
  await openPage(page, "Pencarian Post");

  await page.getByLabel("Kata kunci pencarian post").fill("shift");
  await page.getByRole("button", { name: "Cari", exact: true }).click();

  const results = page.getByRole("button", { name: /^Buka detail post/ });
  await expect(results.first()).toBeVisible();

  // Buka tiga post representatif melalui panel detail.
  for (let index = 0; index < 3; index += 1) {
    await results.nth(index).click();
    const drawer = page.getByRole("dialog", { name: "Detail post" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Tutup panel detail" }).click();
    await expect(drawer).toBeHidden();
  }
});

test("Tugas 3 — membandingkan sentimen antar jenis pekerjaan", async ({ page }) => {
  const sentimentCard = page.getByRole("region", { name: "Sentimen per jenis pekerjaan" });
  await expect(sentimentCard).toBeVisible();

  await sentimentCard.getByRole("button", { name: "Lihat sebagai tabel" }).click();
  const table = sentimentCard.locator("table");
  await expect(table).toContainText("Administrasi");
  await expect(table).toContainText("SPG/SPB");
});

test("Tugas 4 — menyimpan monitor penipuan lowongan", async ({ page }) => {
  await openPage(page, "Monitoring");
  await page.getByRole("button", { name: "Monitor baru" }).click();

  const name = `Penipuan Lowongan ${Date.now()}`;
  await page.getByLabel("Nama monitor").fill(name);
  await page.getByLabel("Kata kunci (pisahkan dengan koma)").fill("penipuan, loker palsu");
  await page.getByRole("button", { name: "Simpan monitor" }).click();

  const card = page.getByRole("article").filter({ hasText: name });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Tren:");
  await expect(card).toContainText("post pada 7 hari terakhir");
});

test("Tugas 5 — menyusun laporan berisi grafik dan temuan", async ({ page }) => {
  await openPage(page, "Laporan Insight");

  // Simpan tiga rekomendasi sebagai draft yang wajib ditinjau manusia.
  await page.getByRole("button", { name: "Saran dari data", exact: true }).click();
  const suggestions = page.getByRole("dialog", { name: "Saran insight dari data" });
  await expect(suggestions).toBeVisible();

  for (let index = 0; index < 3; index += 1) {
    await suggestions
      .getByRole("button", { name: "Simpan sebagai draft" })
      .nth(index)
      .click();
  }
  await suggestions.getByRole("button", { name: "Tutup panel detail" }).click();

  const insightList = page.getByRole("region", { name: "Insight" });
  await expect(insightList.getByText("Rekomendasi untuk Ditinjau").first()).toBeVisible();

  await page.getByRole("button", { name: "Susun laporan", exact: true }).click();
  const builder = page.getByRole("dialog", { name: "Susun laporan" });
  const title = `Laporan E2E ${Date.now()}`;
  await builder.getByLabel("Judul laporan").fill(title);

  const checkboxes = builder.getByRole("checkbox");
  for (let index = 0; index < 3; index += 1) {
    await checkboxes.nth(index).check();
  }
  await builder.getByRole("button", { name: "Simpan laporan" }).click();

  // Pratinjau terbuka otomatis dan memuat watermark data sintetis.
  const preview = page.getByRole("dialog", { name: "Pratinjau laporan" });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText("DATA SINTETIS — BUKAN TEMUAN AKTUAL");
  await expect(preview).toContainText("Statistik agregat");
  await preview.getByRole("button", { name: "Tutup panel detail" }).click();

  await expect(page.getByRole("region", { name: "Laporan tersimpan" })).toContainText(title);
});
