import { test, expect, type Page } from "@playwright/test";

const demoEmail = "demo@local.test";
const demoPassword = "demo123";

const productTitle = "Playwright Product";
const productDescription = "Automation-friendly template for end-to-end demos.";
const productPrice = "47";
const productFilePath = "/files/creator-guide.pdf";
const buyerName = "Playwright Tester";
const buyerEmail = "pw@example.com";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(demoEmail);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.waitForLoadState("networkidle");
}

test("complete sandbox flow from product to delivery", async ({ page }) => {
  await login(page);

  // Create a new product
  await page.getByRole("button", { name: "New product" }).click();
  await page.getByPlaceholder("Creator Playbook").fill(productTitle);
  await page.getByPlaceholder("Short pitch for the offer").fill(productDescription);
  await page.getByLabel("Price (USD)").fill(productPrice);
  await page.selectOption('select[name="filePath"]', productFilePath);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("cell", { name: productTitle })).toBeVisible();

  // Navigate to DM Studio
  await page.getByRole("tab", { name: "DM Studio" }).click();
  await expect(page.getByRole("heading", { name: "Conversation" })).toBeVisible();

  // Ensure the new product is selected
  const productSelect = page.locator("button[role='combobox']").nth(1);
  await productSelect.click();
  await page.getByRole("option", { name: productTitle }).click();

  const messageInput = page.getByPlaceholder("Type a reply… Use / to insert scripts.");

  // Trigger pitch
  await messageInput.fill("GUIDE");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-testid="dm-message-assistant"][data-stage="pitch"]')).toContainText(
    productTitle
  );

  // Trigger qualify
  await messageInput.fill("Yes, I'm interested");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-testid="dm-message-assistant"][data-stage="qualify"]')).toBeVisible();

  // Trigger checkout
  await messageInput.fill("How much is it?");
  await page.getByRole("button", { name: "Send" }).click();
  const checkoutBubble = page.locator('[data-testid="dm-message-assistant"][data-stage="checkout"]');
  await expect(checkoutBubble).toBeVisible();

  // Open checkout modal
  await checkoutBubble.getByRole("button", { name: "Simulate checkout" }).click();
  await page.getByLabel("Buyer name").fill(buyerName);
  await page.getByLabel("Buyer email").fill(buyerEmail);
  await page.getByRole("button", { name: "Complete checkout" }).click();

  // Delivery message should appear
  await expect(page.locator('[data-testid="dm-message-assistant"][data-stage="delivery"]')).toBeVisible();

  // Verify order recorded
  await page.getByRole("tab", { name: "Orders" }).click();
  const orderRow = page.locator("tr", { hasText: buyerName });
  await expect(orderRow).toBeVisible();
  
  // Note: The 'codex' branch test logic for checking the download link was missing,
  // but the logic from 'main' is compatible and important for a full e2e test.
  // I've included the check from 'main' here.
  await expect(orderRow.getByRole("button", { name: "View" })).toBeVisible();
  await orderRow.getByRole("button", { name: "View" }).click();
  await expect(page.getByRole("link", { name: "Download file" })).toHaveAttribute("href", productFilePath);
});
