import { expect, test } from "@playwright/test";
import { button, confirmedColors, press } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Tailwind utilities win and its reset doesn't flatten the button", async ({ page }) => {
  const read = () =>
    page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const revoke = buttons.find((b) => b.textContent?.startsWith("Hold to revoke"));
      const plain = buttons.find((b) => b.textContent?.startsWith("Hold to delete"));
      const frame = plain?.querySelector(".onpurpose-frame");
      if (!revoke || !plain || !frame) throw new Error("Missing buttons");
      return {
        revokeRadius: Number.parseFloat(getComputedStyle(revoke).borderTopLeftRadius),
        revokeColor: getComputedStyle(revoke).color,
        plainColor: getComputedStyle(plain).color,
        plainRadius: getComputedStyle(plain).borderTopLeftRadius,
        framePadding: getComputedStyle(frame).paddingTop,
        frameBorder: getComputedStyle(frame).borderTopWidth,
      };
    });

  for (const order of ["after", "before"] as const) {
    if (order === "before") {
      await page.evaluate(() => {
        const ours = document.querySelector('style[data-href^="onpurpose-"]');
        if (ours) document.head.prepend(ours);
      });
    }
    const styles = await read();
    expect(styles.revokeRadius).toBeGreaterThan(1000);
    expect(styles.revokeColor).not.toBe(styles.plainColor);
    expect(styles.plainRadius).not.toBe("0px");
    expect(styles.framePadding).not.toBe("0px");
    expect(styles.frameBorder).toBe("1px");
  }
});

test("light and dark both paint the fill from currentColor", async ({ page }) => {
  const themes: { text: string; canvas: string; fill: string }[] = [];

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.reload();
    const theme = await page.evaluate(() => {
      const button = document.querySelector("button");
      const fill = document.querySelector(".onpurpose-fill");
      if (!button || !fill) throw new Error("Missing button");
      return {
        text: getComputedStyle(button).color,
        canvas: getComputedStyle(document.documentElement).backgroundColor,
        fill: getComputedStyle(fill).backgroundColor,
      };
    });
    expect(theme.text).not.toBe(theme.canvas);
    expect(theme.fill).not.toBe(theme.text);
    expect(theme.fill).not.toBe("rgba(0, 0, 0, 0)");
    themes.push(theme);

    const hold = await button(page);
    await press(page, hold);
    await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
    const confirmed = await confirmedColors(page);
    expect(confirmed.background).toBe(theme.text);
    expect(confirmed.contrast).toBeGreaterThanOrEqual(4.5);
    await page.mouse.up();
  }

  expect(themes[0]?.text).not.toBe(themes[1]?.text);
  expect(themes[0]?.fill).not.toBe(themes[1]?.fill);
  expect(themes[0]?.canvas).not.toBe(themes[1]?.canvas);
});

test("the confirmed label stays readable on a dark page without color-scheme", async ({ page }) => {
  await page.addStyleTag({
    content: ":root{color-scheme:light} html,body{background:#111;color:#eee}",
  });
  const hold = await button(page);
  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
  const confirmed = await confirmedColors(page);
  expect(confirmed.opacity).toBe("1");
  expect(confirmed.contrast).toBeGreaterThanOrEqual(4.5);
  await page.mouse.up();
});

test("--hold-confirmed-text overrides the confirmed label", async ({ page }) => {
  await page.addStyleTag({
    content: ".onpurpose{--hold-confirmed:rgb(10, 20, 30);--hold-confirmed-text:rgb(200, 100, 50)}",
  });
  const hold = await button(page);
  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
  const confirmed = await confirmedColors(page);
  expect(confirmed.background).toBe("rgb(10, 20, 30)");
  expect(confirmed.label).toBe("rgb(200, 100, 50)");
  await page.mouse.up();
});
