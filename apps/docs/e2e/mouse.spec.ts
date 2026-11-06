import { expect, test } from "@playwright/test";
import { button, press } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("mouse hold confirms once", async ({ page }) => {
  const hold = await button(page);
  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "holding");
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "0");
  await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
  const status = hold.locator("xpath=following-sibling::*[1]");
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveText("Confirmed");
  expect(await hold.ariaSnapshot()).not.toContain("status");
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
  await page.waitForTimeout(400);
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
  await page.mouse.up();
  await expect(hold).toHaveAttribute("data-state", "confirmed");
  await expect(hold).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
});

test("an early mouse release does not confirm", async ({ page }) => {
  const hold = await button(page);
  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "holding");
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(hold).toHaveAttribute("data-state", "idle");
  await page.waitForTimeout(1_200);
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "0");
  await expect(hold).toHaveAttribute("data-state", "idle");
});

test("a click does not confirm", async ({ page }) => {
  const hold = await button(page);
  await hold.click();
  await expect(hold).toHaveAttribute("data-state", "idle");
  await page.waitForTimeout(1_700);
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "0");
});

test("a mouse hold on a focused button confirms", async ({ page }) => {
  const hold = await button(page);
  await hold.focus();
  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "holding");
  await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
  await page.mouse.up();
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
});

test("a returned promise keeps the button busy until it settles", async ({ page }) => {
  const hold = page.getByRole("button", { name: "Hold to archive" });
  await hold.scrollIntoViewIfNeeded();
  await press(page, hold);
  const archiving = page.getByRole("button", { name: "Archiving…" });
  await expect(archiving).toHaveAttribute("aria-busy", "true", { timeout: 3_000 });
  await page.mouse.up();
  await expect(archiving).toHaveAttribute("data-state", "confirmed");
  const archived = page.getByRole("button", { name: "Archived" });
  await expect(archived).not.toHaveAttribute("aria-busy");
  await expect(page.getByRole("button", { name: "Hold to archive" })).toHaveAttribute(
    "data-state",
    "idle",
  );
});
