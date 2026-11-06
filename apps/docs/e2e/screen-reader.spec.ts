import { expect, test } from "@playwright/test";
import { button } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("mouse double-clicks and quick key presses never arm or confirm", async ({ page }) => {
  const hold = await button(page);
  const status = hold.locator("xpath=following-sibling::*[1]");
  await hold.dblclick();
  await hold.click();
  await hold.focus();
  for (const key of ["Enter", "Space", "Enter", "Space"]) await page.keyboard.press(key);
  await page.waitForTimeout(300);
  await expect(status).toHaveText("");
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "0");
});

test("two activations without a press confirm, as a screen reader sends them", async ({ page }) => {
  const hold = await button(page);
  const status = hold.locator("xpath=following-sibling::*[1]");
  await hold.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(status).toHaveText("Activate again to confirm");
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "0");
  await hold.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
  await expect(status).toHaveText("Confirmed");
  await expect(hold).toHaveAttribute("data-state", "idle");
});
