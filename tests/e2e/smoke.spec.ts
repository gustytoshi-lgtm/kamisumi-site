import { expect, test } from "@playwright/test";

test("Traditional Chinese home page renders core sections", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/zh-tw");

  await expect(page.getByRole("heading", { name: "從日本尋找、挑選，送往世界。" })).toBeVisible();
  await expect(page.getByRole("link", { name: "查看商品" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "目前可詢問商品" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Japanese product detail keeps localized status CTA", async ({ page }) => {
  await page.goto("/ja/products/kyoto-usucha-midori");

  await expect(page.getByRole("heading", { name: "京都薄茶抹茶 Midori" })).toBeVisible();
  await expect(page.getByText("残りわずか").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "在庫を確認する" })).toBeVisible();
});
