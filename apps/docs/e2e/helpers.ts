import type { Locator, Page } from "@playwright/test";

export const ALLOWED = new Set(["clip-path", "transform", "opacity"]);

export async function button(page: Page) {
  return page.getByRole("button", { name: "Hold to delete" });
}

export async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Button has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export async function press(page: Page, locator: Locator) {
  const point = await center(locator);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
}

export function transitionProperties(css: string) {
  const names = new Set<string>();
  for (const match of css.matchAll(/transition:([^;}{]+)/g)) {
    const value = match[1]?.trim() ?? "";
    const property = value.split(/\s+/)[0];
    if (!property || property === "none") continue;
    names.add(property);
  }
  return [...names];
}

export async function runningProperties(page: Page) {
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

export async function geometry(page: Page) {
  return page.evaluate(() => {
    const button = document.querySelector("button");
    const face = document.querySelector(".onpurpose-frame");
    const fill = document.querySelector(".onpurpose-fill");
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

export async function confirmedColors(page: Page) {
  return page.evaluate(() => {
    const button = document.querySelector("button");
    const face = document.querySelector(".onpurpose-frame");
    if (!button || !face) throw new Error("Missing button");
    const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!canvas) throw new Error("No canvas");
    const rgb = (color: string) => {
      canvas.clearRect(0, 0, 1, 1);
      canvas.fillStyle = color;
      canvas.fillRect(0, 0, 1, 1);
      return [...canvas.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const luminance = (color: string) => {
      const [r = 0, g = 0, b = 0] = rgb(color).map((v) => {
        const c = v / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const layer = getComputedStyle(button, "::after");
    const background =
      layer.content === "none" ? getComputedStyle(button).backgroundColor : layer.backgroundColor;
    const label = getComputedStyle(face).color;
    const [hi, lo] = [luminance(background), luminance(label)].sort((a, b) => b - a);
    return {
      background,
      label,
      opacity: getComputedStyle(button, "::after").opacity,
      contrast: ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05),
    };
  });
}
