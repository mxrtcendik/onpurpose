import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act, createRef, type PointerEvent as ReactPointerEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoldButton } from "./hold-button";

const box = {
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

beforeEach(() => {
  vi.useFakeTimers();
  Element.prototype.getBoundingClientRect = () => box;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.getElementById("op")?.remove();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function point(
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

function renderButton(onConfirm = vi.fn()) {
  render(<HoldButton onConfirm={onConfirm}>Hold to delete</HoldButton>);
  return { onConfirm, button: screen.getByRole("button", { name: "Hold to delete" }) };
}

describe("HoldButton", () => {
  it("confirms once the hold completes", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button);
    expect(button).toHaveAttribute("data-state", "holding");
    advance(1499);
    expect(onConfirm).not.toHaveBeenCalled();

    advance(1);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("data-state", "confirmed");
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");

    advance(5000);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("does not confirm when the pointer is released early", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button);
    advance(500);
    point("pointerUp", button);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-state", "idle");
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms again on a later hold", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button);
    advance(1500);
    point("pointerUp", button);
    advance(1000);

    point("pointerDown", button);
    advance(1500);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("returns to idle when the hold is released after confirming", () => {
    const { button } = renderButton();

    point("pointerDown", button);
    advance(1500);
    expect(button).toHaveAttribute("data-state", "confirmed");
    point("pointerUp", button);
    expect(button).toHaveAttribute("data-state", "confirmed");
    advance(699);
    expect(button).toHaveAttribute("data-state", "confirmed");
    advance(1);
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("stays confirmed while the pointer is still down", () => {
    const { button } = renderButton();

    point("pointerDown", button);
    advance(2500);
    expect(button).toHaveAttribute("data-state", "confirmed");
    point("pointerUp", button);
    expect(button).toHaveAttribute("data-state", "confirmed");
    advance(700);
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("ignores a second pointer, including its release", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button, { pointerId: 1 });
    point("pointerDown", button, { pointerId: 2, clientX: 20, clientY: 12 });
    advance(400);
    point("pointerUp", button, { pointerId: 2 });
    expect(button).toHaveAttribute("data-state", "holding");

    advance(1100);
    expect(onConfirm).toHaveBeenCalledOnce();
    point("pointerUp", button, { pointerId: 1 });
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("cancels when the pointer leaves and does not resume if it comes back", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button);
    point("pointerMove", button, { clientX: 800, clientY: 10 });
    expect(button).toHaveAttribute("data-state", "idle");

    point("pointerMove", button, { clientX: 10, clientY: 10 });
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels when a scroll moves the button off the pointer", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button);
    act(() => {
      document.documentElement.dispatchEvent(new Event("scroll"));
    });
    expect(button).toHaveAttribute("data-state", "holding");

    Element.prototype.getBoundingClientRect = () =>
      ({ ...box, left: 400, right: 560, x: 400 }) as DOMRect;
    act(() => {
      document.documentElement.dispatchEvent(new Event("scroll"));
    });
    expect(button).toHaveAttribute("data-state", "idle");
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels on pointercancel and when capture is lost", () => {
    const cancelled = vi.fn();
    const { button } = renderButton(cancelled);
    point("pointerDown", button);
    point("pointerCancel", button);
    advance(1500);
    expect(cancelled).not.toHaveBeenCalled();

    cleanup();

    const lost = vi.fn();
    const { button: again } = renderButton(lost);
    point("pointerDown", again);
    point("lostPointerCapture", again);
    advance(1500);
    expect(lost).not.toHaveBeenCalled();
  });

  it("confirms from a keyboard hold and ignores key repeat", () => {
    const { onConfirm, button } = renderButton();

    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: "Enter", repeat: true });
    advance(1500);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("data-state", "confirmed");

    fireEvent.keyUp(button, { key: "Enter" });
    advance(1000);

    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyDown(button, { key: " ", repeat: true });
    advance(400);
    fireEvent.keyUp(button, { key: " " });
    advance(2000);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("does not release a Space hold when Enter is released", () => {
    const { onConfirm, button } = renderButton();

    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyUp(button, { key: "Enter" });
    expect(button).toHaveAttribute("data-state", "holding");
    advance(1500);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("prevents the browser activation key from also clicking", () => {
    const { button } = renderButton();

    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    act(() => {
      button.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(button).toHaveAttribute("data-state", "holding");
  });

  it("cancels when the button blurs, the window blurs, or the tab hides", () => {
    const { onConfirm, button } = renderButton();
    button.focus();
    fireEvent.keyDown(button, { key: " " });
    fireEvent.blur(button);
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();

    point("pointerDown", button);
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();

    point("pointerDown", button);
    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  it("does not start when disabled, and disabling mid-hold cancels it", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <HoldButton disabled onConfirm={onConfirm}>
        Hold to delete
      </HoldButton>,
    );
    const button = screen.getByRole("button", { name: "Hold to delete" });
    point("pointerDown", button);
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();

    rerender(<HoldButton onConfirm={onConfirm}>Hold to delete</HoldButton>);
    point("pointerDown", button);
    expect(button).toHaveAttribute("data-state", "holding");
    rerender(
      <HoldButton disabled onConfirm={onConfirm}>
        Hold to delete
      </HoldButton>,
    );
    expect(button).toHaveAttribute("data-state", "idle");
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not confirm after unmount", () => {
    const onConfirm = vi.fn();
    const { unmount } = render(<HoldButton onConfirm={onConfirm}>Hold to delete</HoldButton>);
    point("pointerDown", screen.getByRole("button"));
    unmount();
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("runs the caller's handler first and skips the hold when it cancels the event", () => {
    const onPointerDown = vi.fn((event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
    });
    const onConfirm = vi.fn();
    render(
      <HoldButton onConfirm={onConfirm} onPointerDown={onPointerDown}>
        Hold to delete
      </HoldButton>,
    );
    const button = screen.getByRole("button", { name: "Hold to delete" });

    point("pointerDown", button);
    expect(onPointerDown).toHaveBeenCalledOnce();
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("still holds when the caller's handler does not cancel the event", () => {
    const onKeyDown = vi.fn();
    const onConfirm = vi.fn();
    render(
      <HoldButton onConfirm={onConfirm} onKeyDown={onKeyDown}>
        Hold to delete
      </HoldButton>,
    );
    const button = screen.getByRole("button", { name: "Hold to delete" });

    fireEvent.keyDown(button, { key: "Enter" });
    expect(onKeyDown).toHaveBeenCalledOnce();
    advance(1500);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls the onConfirm from the render that is current when the hold completes", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<HoldButton onConfirm={first}>Hold to delete</HoldButton>);
    point("pointerDown", screen.getByRole("button"));
    rerender(<HoldButton onConfirm={second}>Hold to delete</HoldButton>);
    advance(1500);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("forwards the ref to the button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <HoldButton ref={ref} onConfirm={() => {}}>
        Hold to delete
      </HoldButton>,
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Hold to delete" }));
  });

  it("passes each state to function children", () => {
    render(<HoldButton onConfirm={() => {}}>{(state) => state}</HoldButton>);
    const button = screen.getByRole("button", { name: "idle" });

    point("pointerDown", button);
    expect(screen.getByRole("button", { name: "holding" })).toBeInTheDocument();
    advance(1500);
    expect(screen.getByRole("button", { name: "confirmed" })).toBeInTheDocument();
  });

  it("describes the hold and merges a caller-supplied description", () => {
    render(
      <HoldButton aria-describedby="extra" onConfirm={() => {}}>
        Hold to delete
      </HoldButton>,
    );
    const button = screen.getByRole("button", { name: "Hold to delete" });
    const describedBy = button.getAttribute("aria-describedby") ?? "";

    expect(describedBy.startsWith("extra ")).toBe(true);
    const hint = document.getElementById(describedBy.slice("extra ".length));
    expect(hint).toHaveTextContent("Press and hold to confirm");
  });

  it("injects one shared stylesheet", () => {
    render(
      <>
        <HoldButton onConfirm={() => {}}>One</HoldButton>
        <HoldButton onConfirm={() => {}}>Two</HoldButton>
      </>,
    );

    const styles = document.querySelectorAll("#op");
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain("@layer hold-button");
    expect(styles[0]?.textContent).toContain("--hold-fill");
    expect(styles[0]?.textContent).toContain("--hold-confirmed");
    const css = styles[0]?.textContent ?? "";
    expect(css).toContain("1500ms");
    expect(css).toContain("border-radius:.5em");
    expect(css).toContain("outline-offset:2px");
    expect(css).toContain("44px");
    expect(css).toContain("forced-colors:active");
    expect(css).toContain("Highlight");
  });

  it("blocks the context menu while a hold is in progress", () => {
    const { button } = renderButton();
    point("pointerDown", button);
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    act(() => {
      button.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });
});
