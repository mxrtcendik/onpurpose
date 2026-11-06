import { devices, expect, test } from "@playwright/test";
import { button, center, press } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

const pixel7 = devices["Pixel 7"];

test.describe("touch", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Touch is driven through CDP");
  test.use({
    viewport: pixel7.viewport,
    userAgent: pixel7.userAgent,
    deviceScaleFactor: pixel7.deviceScaleFactor,
    isMobile: pixel7.isMobile,
    hasTouch: pixel7.hasTouch,
  });

  test("touch hold confirms", async ({ page }) => {
    const hold = await button(page);
    const point = await center(hold);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: point.x, y: point.y, id: 1 }],
    });
    await expect(hold).toHaveAttribute("data-state", "holding");
    await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
    await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(hold).toHaveAttribute("data-state", "confirmed");
    await expect(hold).toHaveAttribute("data-state", "idle");
    await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
  });

  test("buzzes once when a touch hold confirms, not for a mouse", async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" || message.type() === "error") warnings.push(message.text());
    });
    await page.addInitScript(() => {
      const calls: unknown[] = [];
      (window as unknown as { buzzes: unknown[] }).buzzes = calls;
      Object.defineProperty(navigator, "vibrate", {
        configurable: true,
        value: (pattern: unknown) => {
          calls.push(pattern);
          return true;
        },
      });
    });
    await page.reload();
    const hold = await button(page);
    const buzzes = () => page.evaluate(() => (window as unknown as { buzzes: unknown[] }).buzzes);
    const session = await page.context().newCDPSession(page);
    const touchHold = async () => {
      const point = await center(hold);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: point.x, y: point.y, id: 1 }],
      });
      await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect(hold).toHaveAttribute("data-state", "idle");
    };

    await touchHold();
    expect(await buzzes()).toEqual([15]);

    await press(page, hold);
    await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
    await page.mouse.up();
    expect(await buzzes()).toEqual([15]);
    expect(warnings.filter((text) => text.includes("vibrate"))).toEqual([]);
  });

  test("quick taps never arm or confirm", async ({ page }) => {
    const hold = await button(page);
    const status = hold.locator("xpath=following-sibling::*[1]");
    for (let i = 0; i < 3; i++) await hold.tap();
    await page.waitForTimeout(300);
    await expect(status).toHaveText("");
    await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "0");
  });

  test("a touch in the extended hit area survives finger jitter", async ({ page }) => {
    const hold = await button(page);
    await hold.evaluate((element) => {
      element.style.fontSize = "12px";
    });
    const box = await hold.boundingBox();
    if (!box) throw new Error("Button has no box");
    expect(box.height).toBeLessThan(44);
    const x = box.x + box.width / 2;
    const y = box.y - 3;
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 1 }],
    });
    await expect(hold).toHaveAttribute("data-state", "holding");
    for (const dx of [1, -1, 2]) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + dx, y: y - 1, id: 1 }],
      });
    }
    await expect(hold).toHaveAttribute("data-state", "holding");
    await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
  });
});
