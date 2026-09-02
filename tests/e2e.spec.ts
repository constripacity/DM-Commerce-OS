import { test, expect, type Page } from "@playwright/test";

const productTitle = "Playwright Product";
const productDescription = "Automation-friendly template for end-to-end demos.";
const buyerName = "Playwright Tester";
const buyerEmail = "pw@example.com";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@local.test");
  await page.getByLabel("Password").fill("demo123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("complete local DM to attributed delivery loop", async ({ page }) => {
  await login(page);

  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("button", { name: "New product" }).click();
  await page.getByPlaceholder("Creator Playbook").fill(productTitle);
  await page.getByPlaceholder("Short pitch for the offer").fill(productDescription);
  await page.getByLabel("Price (USD)").fill("47");
  await page.getByLabel("Delivery file").selectOption("/files/creator-guide.pdf");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(productTitle, { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "DM Studio" }).click();
  await expect(page.getByRole("heading", { name: "Conversation", exact: true })).toBeVisible();

  const productSelect = page.locator("button[role='combobox']").nth(1);
  await productSelect.click();
  await page.getByRole("option", { name: new RegExp(productTitle) }).click();

  const input = page.getByPlaceholder("Type a reply… Use / to insert scripts.");
  await input.fill("GUIDE");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator('[data-testid="dm-message-assistant"][data-stage="pitch"]')).toContainText(productTitle);

  await input.fill("Yes, I am interested");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator('[data-testid="dm-message-assistant"][data-stage="qualify"]')).toBeVisible();

  await input.fill("How much does it cost?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const checkoutMessage = page.locator('[data-testid="dm-message-assistant"][data-stage="checkout"]');
  await expect(checkoutMessage).toBeVisible();
  await checkoutMessage.getByRole("button", { name: "Simulate checkout" }).click();

  await expect(page).toHaveURL(/\/dashboard\/products\?checkout=/);
  await expect(page.getByRole("heading", { name: "Run checkout simulator" })).toBeVisible();
  await page.getByLabel("Buyer name").fill(buyerName);
  await page.getByLabel("Email").fill(buyerEmail);
  await page.getByLabel("Coupon code (optional)").fill("LAUNCH20");
  await page.getByRole("button", { name: "Record order" }).click();

  await page.getByRole("link", { name: "Orders" }).click();
  const row = page.locator("tr", { hasText: buyerName });
  await expect(row).toContainText("$37.60");
  await expect(row).toContainText("Creator Guide DM Push");
  await row.click();
  await expect(page.getByRole("link", { name: "Download file" })).toHaveAttribute(
    "href",
    "/files/creator-guide.pdf",
  );

  // Close the order-detail dialog so the sidebar nav is interactable again.
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByRole("heading", { name: "Campaign attribution" })).toBeVisible();
  await expect(page.getByText("Creator Guide DM Push").first()).toBeVisible();
});

test("exports a complete flow pack and rejects unsafe imports", async ({ page }) => {
  await login(page);
  const exported = await page.request.get("/api/flow-packs");
  expect(exported.ok()).toBe(true);
  const pack = await exported.json();
  expect(pack).toMatchObject({ schemaVersion: 1, keyword: "GUIDE" });
  expect(pack.steps.length).toBeGreaterThanOrEqual(4);

  const invalid = await page.request.post("/api/flow-packs", {
    data: { schemaVersion: 1, name: "Broken", keyword: "BAD", steps: [] },
  });
  expect(invalid.status()).toBe(400);

  const crossOrigin = await page.request.post("/api/demo-reset", {
    headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
  });
  expect(crossOrigin.status()).toBe(403);
});
