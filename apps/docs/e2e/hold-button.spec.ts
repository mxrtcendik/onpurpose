import { devices, expect, type Locator, type Page, test } from "@playwright/test";

const ALLOWED = new Set(["clip-path", "transform", "opacity"]);

async function button(page: Page) {
  return page.getByRole("button", { name: "Hold to delete" });
}

async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Button has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function press(page: Page, locator: Locator) {
  const point = await center(locator);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
}

function transitionProperties(css: string) {
  const names = new Set<string>();
  for (const match of css.matchAll(/transition:([^;}{]+)/g)) {
    const value = match[1]?.trim() ?? "";
    const property = value.split(/\s+/)[0];
    if (!property || property === "none") continue;
    names.add(property);
  }
  return [...names];
}

async function runningProperties(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("button");
    if (!root) return [];
    const names = new Set<string>();
    for (const animation of root.getAnimations({ subtree: true })) {
      if (animation instanceof CSSTransition) {
        names.add(animation.transitionProperty);
        continue;
      }
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect)) continue;
      for (const frame of effect.getKeyframes()) {
        for (const key of Object.keys(frame)) {
          if (key !== "offset" && key !== "easing" && key !== "composite") names.add(key);
        }
      }
    }
    return [...names];
  });
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const button = document.querySelector("button");
    const face = document.querySelector(".op-f");
    const fill = document.querySelector(".op-i");
    if (!button || !face || !fill) throw new Error("Missing button");
    const box = (node: Element) => {
      const element = node as HTMLElement;
      return [element.offsetLeft, element.offsetTop, element.offsetWidth, element.offsetHeight];
    };
    return {
      button: box(button),
      face: box(face),
      fill: box(fill),
      clip: getComputedStyle(fill).clipPath,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("mouse hold confirms once", async ({ page }) => {
  const hold = await button(page);
  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "holding");
  await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "0");
  await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
  await expect(hold.getByRole("status")).toHaveText("Confirmed");
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

test("only clip-path, transform, and opacity animate", async ({ page }) => {
  const css = await page.locator("#op").textContent();
  expect(css).toBeTruthy();
  const declared = transitionProperties(css ?? "");
  expect(declared).toContain("clip-path");
  expect(declared).toContain("transform");
  for (const property of declared) expect(ALLOWED).toContain(property);

  const hold = await button(page);
  const fill = hold.locator(".op-i");
  const face = hold.locator(".op-f");
  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "holding");

  await expect
    .poll(async () =>
      fill.evaluate((element) => getComputedStyle(element).transitionTimingFunction),
    )
    .toBe("linear");
  const holdingFill = await fill.evaluate((element) => {
    const style = getComputedStyle(element);
    return { property: style.transitionProperty, duration: style.transitionDuration };
  });
  expect(holdingFill).toEqual({ property: "clip-path", duration: "1.5s" });

  const holdingFace = await face.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      property: style.transitionProperty,
      duration: style.transitionDuration,
    };
  });
  expect(holdingFace.property).toBe("transform");
  expect(holdingFace.duration).toBe("0.16s");

  await page.waitForTimeout(40);
  const early = await geometry(page);
  const earlyMotion = await runningProperties(page);
  expect(earlyMotion).toContain("clip-path");
  expect(earlyMotion).toContain("transform");
  for (const property of earlyMotion) expect(ALLOWED).toContain(property);
  await expect
    .poll(async () => face.evaluate((element) => getComputedStyle(element).transform))
    .toContain("0.97");
  expect(early.fill[2]).toBeGreaterThan(0);
  expect(early.fill[3]).toBeGreaterThan(0);

  await page.waitForTimeout(350);
  const later = await geometry(page);
  expect(later.button).toEqual(early.button);
  expect(later.face).toEqual(early.face);
  expect(later.fill).toEqual(early.fill);
  expect(later.clip).not.toBe(early.clip);
  const midMotion = await runningProperties(page);
  for (const property of midMotion) expect(ALLOWED).toContain(property);

  await page.mouse.up();
  await expect(hold).toHaveAttribute("data-state", "idle");
  const released = await fill.evaluate((element) => {
    const style = getComputedStyle(element);
    return { property: style.transitionProperty, duration: style.transitionDuration };
  });
  expect(released).toEqual({ property: "clip-path", duration: "0.2s" });
  const retracting = await runningProperties(page);
  for (const property of retracting) expect(ALLOWED).toContain(property);
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

const pixel7 = devices["Pixel 7"];

test.describe("touch", () => {
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
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the fill and removes the press scale", async ({ page }) => {
    const hold = await button(page);
    const fill = hold.locator(".op-i");
    const face = hold.locator(".op-f");
    await press(page, hold);
    await expect(hold).toHaveAttribute("data-state", "holding");

    const transform = await face.evaluate((element) => getComputedStyle(element).transform);
    expect(transform).toBe("none");
    const faceTransition = await face.evaluate(
      (element) => getComputedStyle(element).transitionProperty,
    );
    expect(faceTransition).toBe("none");

    const holdingFill = await fill.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        property: style.transitionProperty,
        duration: style.transitionDuration,
        timing: style.transitionTimingFunction,
      };
    });
    expect(holdingFill).toEqual({ property: "clip-path", duration: "1.5s", timing: "linear" });

    await page.waitForTimeout(80);
    const early = await geometry(page);
    await page.waitForTimeout(400);
    const later = await geometry(page);
    expect(later.fill).toEqual(early.fill);
    expect(later.clip).not.toBe(early.clip);
    const motion = await runningProperties(page);
    expect(motion).toContain("clip-path");
    expect(motion).not.toContain("transform");
    for (const property of motion) expect(ALLOWED).toContain(property);

    await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
    await page.mouse.up();
    await expect(hold).toHaveAttribute("data-state", "confirmed");
    await expect(hold).toHaveAttribute("data-state", "idle");
    await expect(page.getByTestId("confirms")).toHaveAttribute("data-count", "1");
    const released = await fill.evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(released).toBe("0s");
  });
});

test("light and dark both paint the fill from currentColor", async ({ page }) => {
  const themes: { text: string; canvas: string; fill: string }[] = [];

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.reload();
    const theme = await page.evaluate(() => {
      const button = document.querySelector("button");
      const fill = document.querySelector(".op-i");
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
    const confirmed = await page.evaluate(() => {
      const button = document.querySelector("button");
      const face = document.querySelector(".op-f");
      if (!button || !face) throw new Error("Missing button");
      return {
        background: getComputedStyle(button).backgroundColor,
        label: getComputedStyle(face).color,
      };
    });
    expect(confirmed.background).toBe(theme.text);
    expect(confirmed.label).toBe(theme.canvas);
    await page.mouse.up();
  }

  expect(themes[0]?.text).not.toBe(themes[1]?.text);
  expect(themes[0]?.fill).not.toBe(themes[1]?.fill);
  expect(themes[0]?.canvas).not.toBe(themes[1]?.canvas);
});
