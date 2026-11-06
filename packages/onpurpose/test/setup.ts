import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { box } from "./helpers";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;

beforeEach(() => {
  vi.useFakeTimers();
  Element.prototype.getBoundingClientRect = () => box;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.querySelector("style[data-onpurpose]")?.remove();
});
