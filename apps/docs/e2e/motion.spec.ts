import { expect, test } from "@playwright/test";
import {
  ALLOWED,
  button,
  geometry,
  press,
  runningProperties,
  transitionProperties,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("only clip-path, transform, and opacity animate", async ({ page }) => {
  const css = await page.locator('style[data-href^="onpurpose-"]').textContent();
  expect(css).toBeTruthy();
  const declared = transitionProperties(css ?? "");
  expect(declared).toContain("clip-path");
  expect(declared).toContain("transform");
  for (const property of declared) expect(ALLOWED).toContain(property);

  const hold = await button(page);
  const fill = hold.locator(".onpurpose-fill");
  const face = hold.locator(".onpurpose-frame");
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
  const pressSettled = await face.evaluate(
    (element) => getComputedStyle(element).transform === "matrix(0.97, 0, 0, 0.97, 0, 0)",
  );
  expect(earlyMotion).toContain("clip-path");
  expect(earlyMotion.includes("transform") || pressSettled).toBe(true);
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

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the fill and removes the press scale", async ({ page }) => {
    const hold = await button(page);
    const fill = hold.locator(".onpurpose-fill");
    const face = hold.locator(".onpurpose-frame");
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

test("after a confirm, the color fades out and the fill does not retract", async ({ page }) => {
  const hold = await button(page);
  await press(page, hold);
  await expect(hold).toHaveAttribute("data-state", "confirmed", { timeout: 3_000 });
  const recording = page.evaluate(async () => {
    const button = document.querySelector("button");
    const fill = document.querySelector(".onpurpose-fill");
    if (!button || !fill) throw new Error("Missing button");
    const out: { clip: string; layer: number }[] = [];
    while (button.dataset.state !== "idle") {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const start = performance.now();
    while (performance.now() - start < 400) {
      out.push({
        clip: getComputedStyle(fill).clipPath,
        layer: Number(getComputedStyle(button, "::after").opacity),
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return out;
  });
  await page.mouse.up();
  const samples = await recording;
  for (const sample of samples) expect(sample.clip).toBe("inset(0px 100% 0px 0px)");
  expect(samples.at(-1)?.layer).toBe(0);
  expect(samples.some((sample) => sample.layer > 0 && sample.layer < 1)).toBe(true);
});
