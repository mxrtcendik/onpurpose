import { fireEvent, render, screen } from "@testing-library/react";
import { act, useState } from "react";
import { vi } from "vitest";
import { HoldButton } from "../src";

export const box = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 40,
  right: 160,
  width: 160,
  height: 40,
  toJSON() {
    return {};
  },
} as DOMRect;

export function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

export function point(
  type: "pointerDown" | "pointerUp" | "pointerMove" | "pointerCancel" | "lostPointerCapture",
  target: HTMLElement,
  init: Record<string, unknown> = {},
) {
  fireEvent[type](target, {
    pointerId: 1,
    button: 0,
    buttons: type === "pointerUp" || type === "pointerCancel" ? 0 : 1,
    isPrimary: true,
    clientX: 10,
    clientY: 10,
    pointerType: "mouse",
    ...init,
  });
}

export function renderButton(onConfirm: () => unknown = vi.fn()) {
  render(<HoldButton onConfirm={onConfirm}>Hold to delete</HoldButton>);
  return { onConfirm, button: screen.getByRole("button", { name: "Hold to delete" }) };
}

export function ourStyles() {
  return document.querySelectorAll('style[data-href^="onpurpose-"], style[data-onpurpose]');
}

export function deferred() {
  let resolve = () => {};
  let reject = (_error: unknown) => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function nextUnhandledRejection() {
  const vitest = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  return new Promise<unknown>((resolve) => {
    process.once("unhandledRejection", (reason) => {
      for (const listener of vitest) process.on("unhandledRejection", listener);
      resolve(reason);
    });
  });
}

export function DisablesOnConfirm() {
  const [removed, setRemoved] = useState(false);
  return (
    <HoldButton disabled={removed} onConfirm={() => setRemoved(true)}>
      Hold to delete
    </HoldButton>
  );
}
