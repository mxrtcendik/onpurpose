import { expect, test } from "@playwright/test";
import { button, press } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("keyboard hold confirms", async ({ page }) => {
  const hold = await button(page);
  await hold.focus();
  await page.keyboard.down("Space");
  await expect(hold).toHaveAttribute("data-state", "holding");
  await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
  await page.keyboard.up("Space");
  await expect(hold).toHaveAttribute("data-state", "confirmed");
  await expect(hold).toHaveAttribute("data-state", "idle");
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
});

test("Escape cancels a hold and shortcuts never start one", async ({ page }) => {
  const hold = await button(page);
  const status = hold.locator("xpath=following-sibling::*[1]");
  await hold.focus();
  await page.keyboard.down("Space");
  await expect(hold).toHaveAttribute("data-state", "holding");
  await page.keyboard.press("Escape");
  await expect(hold).toHaveAttribute("data-state", "idle");
  await page.keyboard.up("Space");

  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "holding");
  await page.keyboard.press("Escape");
  await expect(hold).toHaveAttribute("data-state", "idle");
  await page.mouse.up();

  await hold.focus();
  for (const shortcut of ["Control+Enter", "Alt+Enter", "Meta+Enter", "Control+Space"]) {
    await page.keyboard.press(shortcut);
  }
  await page.waitForTimeout(1_700);
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "0");
  await expect(status).toHaveText("");
});
