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
}

test("complete sandbox flow from product to delivery", async ({ page }) => {
  await login(page);

  // Create a new product
  await page.getByRole("button", { name: "New product" }).click();
  await page.getByPlaceholder("Creator DM Guide").fill(productTitle);
  await page
    .getByPlaceholder("What transformation does this product unlock?")
    .fill(productDescription);
  await page.getByPlaceholder("29.00").fill(productPrice);
  await page.getByPlaceholder("/files/creator-guide.pdf").fill(productFilePath);
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByRole("cell", { name: productTitle })).toBeVisible();

  // Navigate to DM Studio
  await page.getByRole("tab", { name: "DM Studio" }).click();
  await expect(page.getByText("DM Studio Controls")).toBeVisible();

  // Ensure the new product is selected
  const productSelect = page.locator("button[role='combobox']").nth(1);
  await productSelect.click();
  await page.getByRole("option", { name: productTitle }).click();

  const messageInput = page.getByPlaceholder("Type a DM…");

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
  await expect(orderRow.getByRole("link", { name: "Download" })).toHaveAttribute("href", productFilePath);
});
