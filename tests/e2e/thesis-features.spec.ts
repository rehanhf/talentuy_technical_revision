import { expect, test } from "@playwright/test";

import { ensureApiReady, login } from "./helpers";

/**
 * Fitur yang dijanjikan naskah tugas akhir (lihat README, "Keselarasan dengan
 * naskah tugas akhir"): partisi jenis pekerjaan, preset kata kunci, dan dasar
 * klasifikasi yang tampil di antarmuka.
 */

test.beforeAll(ensureApiReady);

test("partisi kategori isu × jenis pekerjaan menelusur sampai daftar post", async ({ page }) => {
  await login(page, "analyst");
  await page.goto("/topik");

  const section = page.getByRole("heading", { name: "Kategori isu × jenis pekerjaan" });
  await expect(section).toBeVisible();

  await page.getByRole("button", { name: "Lihat post" }).first().click();
  await page.waitForURL(/\/post/);
  await expect(page).toHaveURL(/topics=/);
  await expect(page).toHaveURL(/job_roles=/);
  await expect(page.getByText(/post ditemukan/)).toBeVisible();
});

test("preset kata kunci memulai penelusuran tanpa mengetik", async ({ page }) => {
  await login(page, "viewer");
  await page.goto("/post");

  await expect(page.getByText("Mulai dari preset kata kunci")).toBeVisible();
  const preset = page.getByRole("button", { name: "Lowongan palsu", exact: true });
  await preset.click();

  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Kata kunci pencarian post")).toHaveValue(/penipuan/);
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByText(/post ditemukan/)).toBeVisible();
});

test("detail post menampilkan dasar klasifikasi dan koreksi dari tampilan yang sama", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/post");

  await page.getByRole("button", { name: /Buka detail post/ }).first().click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByText("Label dan dasar klasifikasi")).toBeVisible();
  for (const title of ["Kategori isu", "Polaritas sentimen", "Intensi percakapan"]) {
    await expect(drawer.getByText(title, { exact: true }).first()).toBeVisible();
  }

  const highlight = drawer.getByRole("button", { name: "Sorot" }).first();
  await highlight.click();
  await expect(drawer.getByRole("button", { name: "Hapus sorotan" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(drawer.locator("mark").first()).toBeVisible();

  await drawer.getByRole("button", { name: "Koreksi jenis pekerjaan" }).click();
  await expect(drawer.getByLabel("Label", { exact: true })).toHaveValue("job_role");
  await drawer.getByLabel("Label yang benar").selectOption("Merchandiser");
  await drawer.getByRole("button", { name: "Simpan koreksi" }).click();

  await expect(page.getByText("Label berhasil dikoreksi.")).toBeVisible();
  await expect(drawer.getByText("dikoreksi manual", { exact: true })).toBeVisible();
});
