import { expect, test } from "@playwright/test";

import { ensureApiReady, login, openPage } from "./helpers";

/**
 * Cakupan untuk halaman Laporan Insight dan Data & Pengaturan: alur impor
 * berkas, penyuntingan taxonomy, dan akses kolaboratif setelah login.
 */
test.beforeAll(async () => {
  await ensureApiReady();
});

test("viewer dapat mengakses fitur kerja kolaboratif setelah login", async ({ page }) => {
  await login(page, "viewer");

  await openPage(page, "Laporan Insight");
  await expect(page.getByRole("heading", { name: "Laporan Insight" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Susun laporan", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Saran dari data", exact: true })).toBeVisible();

  await openPage(page, "Data & Pengaturan");
  await expect(page.getByRole("region", { name: "Impor data" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Audit log" })).toBeVisible();

  await openPage(page, "Monitoring");
  await expect(page.getByRole("button", { name: "Monitor baru" })).toBeVisible();
});

test("admin mengimpor berkas CSV dan hasilnya tercatat di log proses", async ({ page }) => {
  await login(page, "admin");
  await openPage(page, "Data & Pengaturan");

  const stamp = Date.now();
  const csv = [
    "external_post_id,text,created_at_source,like_count",
    `e2e-${stamp}-1,berapa gaji staf gudang untuk shift malam?,2026-08-20T09:00:00,6`,
    `e2e-${stamp}-2,proses lamaran admin gudang berapa lama biasanya?,2026-08-21T10:30:00,3`,
    `e2e-${stamp}-3,,2026-08-22T11:00:00,1`, // baris tanpa teks harus ditolak
  ].join("\n");

  await page.getByLabel(/Berkas CSV atau JSON/).setInputFiles({
    name: `uji-impor-${stamp}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8"),
  });
  await page.getByRole("button", { name: "Impor berkas" }).click();

  const importCard = page.getByRole("region", { name: "Impor data" });
  await expect(importCard).toContainText("2 dari 3 baris berhasil diproses");
  await expect(importCard).toContainText("1 baris dilewati");

  // Log proses menampilkan run terbaru dengan status partial.
  const runs = page.getByRole("region", { name: "Log proses data" });
  await expect(runs.locator("tbody tr").first()).toContainText("import");
  await expect(runs.locator("tbody tr").first()).toContainText("partial");

  // Audit log mencatat siapa yang mengimpor.
  await expect(
    page.getByRole("region", { name: "Audit log" }).locator("tbody tr").first(),
  ).toContainText("Impor berkas");
});

test("impor menolak berkas tanpa kolom wajib", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/data");

  await page.getByLabel(/Berkas CSV atau JSON/).setInputFiles({
    name: "salah.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("kolom_a,kolom_b\n1,2\n", "utf-8"),
  });
  await page.getByRole("button", { name: "Impor berkas" }).click();

  await expect(
    page.getByRole("region", { name: "Impor data" }).getByRole("alert"),
  ).toContainText("Kolom wajib tidak ditemukan");
});

test("admin menyunting taxonomy topik lalu mengembalikannya", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/data");

  const taxonomyCard = page.getByRole("region", { name: "Taxonomy topik" });
  const topicRow = taxonomyCard.locator("li").filter({ hasText: "Gaji dan Benefit" });
  const originalDescription = (await topicRow.locator("p").first().textContent()) ?? "";

  await topicRow.getByRole("button", { name: "Ubah" }).click();
  const drawer = page.getByRole("dialog", { name: "Ubah topik" });
  await expect(drawer).toBeVisible();

  const marker = `Diubah lewat uji otomatis ${Date.now()}.`;
  await drawer.getByLabel("Deskripsi").fill(marker);
  await drawer.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(topicRow).toContainText(marker);

  // Kembalikan deskripsi semula agar dataset demo tidak berubah permanen.
  await topicRow.getByRole("button", { name: "Ubah" }).click();
  await drawer.getByLabel("Deskripsi").fill(originalDescription.trim());
  await drawer.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(topicRow).toContainText(originalDescription.trim());
});

test("laporan menolak disimpan tanpa insight terpilih", async ({ page }) => {
  await login(page, "analyst");
  await openPage(page, "Laporan Insight");

  await page.getByRole("button", { name: "Susun laporan", exact: true }).click();
  const builder = page.getByRole("dialog", { name: "Susun laporan" });
  await builder.getByLabel("Judul laporan").fill("Laporan tanpa insight");
  await builder.getByRole("button", { name: "Simpan laporan" }).click();

  await expect(builder.getByRole("alert")).toContainText("Pilih minimal satu insight");
  await expect(page.getByRole("dialog", { name: "Pratinjau laporan" })).toHaveCount(0);
});

test("tombol Setujui nonaktif bagi penulis insight", async ({ page }) => {
  await login(page, "analyst");
  await openPage(page, "Laporan Insight");

  await page.getByRole("button", { name: "Saran dari data", exact: true }).click();
  await page.getByRole("button", { name: "Simpan sebagai draft" }).first().click();
  await expect(page.getByText("Rekomendasi disimpan sebagai draft")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.getByTitle("Persetujuan harus oleh pengguna lain").first()).toBeDisabled();
});
