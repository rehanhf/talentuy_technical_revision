import { expect, test } from "@playwright/test";
import { ensureApiReady, login } from "./helpers";

test.beforeAll(ensureApiReady);

test("rail, filter drawer, dan navigasi mobile tetap dapat dioperasikan", async ({ page }, testInfo) => {
  await login(page);
  await expect(page.locator(".tp-metric").first()).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("aeux-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "Ciutkan menu samping" }).click();
  const expand = page.getByRole("button", { name: "Lebarkan menu samping" });
  await expect(expand).toBeVisible();
  await expand.click();
  await page.getByRole("button", { name: "Ciutkan menu samping" }).click();

  const filter = page.getByRole("button", { name: "Buka filter global" });
  await filter.click();
  const drawer = page.getByRole("dialog", { name: "Filter global" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("button", { name: "Tutup panel detail" })).toBeFocused();
  await drawer.getByRole("checkbox", { name: "SPG/SPB", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(filter).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("aeux-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Buka menu navigasi" }).click();
  const navigation = page.getByRole("navigation", { name: "Navigasi utama" });
  await navigation.getByRole("link", { name: "Analisis Tren", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Analisis Tren", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/job_roles=Staf/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("periode dan filter bertahan saat menelusuri post", async ({ page }) => {
  await login(page);
  await page.getByRole("combobox", { name: "Periode analisis" }).selectOption("90");
  await expect(page.getByRole("combobox", { name: "Periode analisis" })).toHaveValue("90");
  await page.getByRole("button", { name: "Cari percakapan, topik, atau pekerjaan", exact: true }).click();
  const search = page.getByRole("dialog", { name: "Pencarian global" });
  await search.getByRole("textbox", { name: "Kata kunci pencarian" }).fill("gaji");
  await search.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(page).toHaveURL(/q=gaji/);
  await expect(page.getByRole("combobox", { name: "Periode analisis" })).toHaveValue("90");
  await page.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name: "Ringkasan", exact: true }).click();
  await expect(page).toHaveURL(/q=gaji/);
  await page.getByRole("button", { name: "Buka filter global" }).click();
  const drawer = page.getByRole("dialog", { name: "Filter global" });
  await drawer.getByRole("checkbox", { name: "SPG/SPB", exact: true }).check();
  await drawer.getByRole("button", { name: "Lihat hasil", exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/date_from=/);
  const from = new URL(page.url()).searchParams.get("date_from");
  await page.getByRole("button", { name: "Telusuri post", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pencarian Post", exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("date_from")).toBe(from);
  await expect(page).toHaveURL(/job_roles=Staf/);
  await expect(page.getByRole("combobox", { name: "Periode analisis" })).toHaveValue("90");
});
