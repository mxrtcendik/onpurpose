import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  act,
  createRef,
  type PointerEvent as ReactPointerEvent,
  StrictMode,
  useState,
  version,
} from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
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
  document.querySelector("style[data-onpurpose]")?.remove();
});

function ourStyles() {
  return document.querySelectorAll('style[data-href^="onpurpose-"], style[data-onpurpose]');
}

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

function deferred() {
  let resolve = () => {};
  let reject = (_error: unknown) => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function nextUnhandledRejection() {
  const vitest = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  return new Promise<unknown>((resolve) => {
    process.once("unhandledRejection", (reason) => {
      for (const listener of vitest) process.on("unhandledRejection", listener);
      resolve(reason);
    });
  });
}

function DisablesOnConfirm() {
  const [removed, setRemoved] = useState(false);
  return (
    <HoldButton disabled={removed} onConfirm={() => setRemoved(true)}>
      Hold to delete
    </HoldButton>
  );
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

  it("keeps a touch hold that starts in the extended hit area and jitters", () => {
    const coarse = vi
      .spyOn(window, "matchMedia")
      .mockImplementation(
        (query) => ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
      );
    const { onConfirm, button } = renderButton();

    point("pointerDown", button, { pointerType: "touch", clientX: 80, clientY: -1 });
    point("pointerMove", button, { pointerType: "touch", clientX: 82, clientY: -2 });
    point("pointerMove", button, { pointerType: "touch", clientX: 164, clientY: 46 });
    expect(button).toHaveAttribute("data-state", "holding");
    advance(1500);
    expect(onConfirm).toHaveBeenCalledOnce();
    point("pointerUp", button, { pointerType: "touch" });
    advance(1000);

    point("pointerDown", button, { pointerType: "touch", clientX: 80, clientY: 20 });
    point("pointerMove", button, { pointerType: "touch", clientX: 80, clientY: -11 });
    expect(button).toHaveAttribute("data-state", "idle");
    coarse.mockRestore();
  });

  it("gives a mouse no slack past the edge", () => {
    const { button } = renderButton();

    point("pointerDown", button);
    point("pointerMove", button, { clientX: 160, clientY: 40 });
    expect(button).toHaveAttribute("data-state", "holding");
    point("pointerMove", button, { clientX: 161, clientY: 40 });
    expect(button).toHaveAttribute("data-state", "idle");
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

  it("cancels a keyboard hold on Escape, and the held key's release does nothing", () => {
    const { onConfirm, button } = renderButton();

    fireEvent.keyDown(button, { key: " " });
    advance(500);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(button).toHaveAttribute("data-state", "idle");
    const release = new KeyboardEvent("keyup", { key: " ", bubbles: true, cancelable: true });
    act(() => {
      button.dispatchEvent(release);
    });
    expect(release.defaultPrevented).toBe(true);
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("cancels a pointer hold on Escape, even when focus is elsewhere", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button);
    advance(500);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(button).toHaveAttribute("data-state", "idle");
    advance(2000);
    point("pointerUp", button);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not start a hold from a shortcut with Ctrl, Alt or Cmd", () => {
    const { onConfirm, button } = renderButton();

    for (const modifier of ["ctrlKey", "altKey", "metaKey"]) {
      const down = new KeyboardEvent("keydown", {
        key: "Enter",
        [modifier]: true,
        bubbles: true,
        cancelable: true,
      });
      act(() => {
        button.dispatchEvent(down);
      });
      expect(down.defaultPrevented).toBe(true);
      expect(button).toHaveAttribute("data-state", "idle");
      fireEvent.keyUp(button, { key: "Enter" });
    }
    advance(2000);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps a pointer hold when the button blurs, as Safari does on press", () => {
    const { onConfirm, button } = renderButton();
    button.focus();

    point("pointerDown", button);
    fireEvent.blur(button);
    expect(button).toHaveAttribute("data-state", "holding");
    advance(1500);
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
    expect(button).toHaveAttribute("data-disabled", "");

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

  it("stays confirmed and busy until a returned promise resolves", async () => {
    const work = deferred();
    const onConfirm = vi.fn(() => work.promise);
    render(
      <HoldButton onConfirm={onConfirm}>
        {(state, { busy }) => (busy ? "Deleting" : state === "confirmed" ? "Deleted" : "Delete")}
      </HoldButton>,
    );
    const button = screen.getByRole("button");

    point("pointerDown", button);
    advance(1500);
    point("pointerUp", button);
    advance(5000);
    expect(button).toHaveAttribute("data-state", "confirmed");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAccessibleName("Deleting");

    point("pointerDown", button);
    fireEvent.keyDown(button, { key: "Enter" });
    advance(1500);
    expect(onConfirm).toHaveBeenCalledOnce();
    point("pointerUp", button);
    fireEvent.keyUp(button, { key: "Enter" });

    await act(async () => work.resolve());
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).toHaveAccessibleName("Deleted");
    advance(700);
    expect(button).toHaveAttribute("data-state", "idle");

    point("pointerDown", button);
    advance(1500);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("waits for the release when the promise resolves mid-hold", async () => {
    const work = deferred();
    const { button } = renderButton(vi.fn(() => work.promise));

    point("pointerDown", button);
    advance(1500);
    await act(async () => work.resolve());
    expect(button).not.toHaveAttribute("aria-busy");
    advance(2000);
    expect(button).toHaveAttribute("data-state", "confirmed");
    point("pointerUp", button);
    advance(700);
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("goes idle at once when the promise rejects, and still surfaces the error", async () => {
    const work = deferred();
    const { button } = renderButton(vi.fn(() => work.promise));
    const failure = new Error("Request failed");

    point("pointerDown", button);
    advance(1500);
    point("pointerUp", button);
    vi.useRealTimers();
    const surfaced = nextUnhandledRejection();
    await act(async () => work.reject(failure));

    expect(button).toHaveAttribute("data-state", "idle");
    expect(button).not.toHaveAttribute("aria-busy");
    expect(await surfaced).toBe(failure);
  });

  it("ignores a promise that settles after unmount", async () => {
    const work = deferred();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(
      <HoldButton onConfirm={() => work.promise}>Hold to delete</HoldButton>,
    );
    point("pointerDown", screen.getByRole("button"));
    advance(1500);
    unmount();

    await act(async () => work.resolve());
    advance(2000);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("arms on a click with no press, and confirms on a second one", () => {
    const { onConfirm, button } = renderButton();

    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("data-state", "idle");
    expect(screen.getByRole("status")).toHaveTextContent("Activate again to confirm");

    advance(3000);
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("data-state", "confirmed");
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    advance(700);
    expect(button).toHaveAttribute("data-state", "idle");

    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("forgets the first activation after ten seconds or when focus leaves", () => {
    const { onConfirm, button } = renderButton();

    fireEvent.click(button);
    advance(10_000);
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    advance(10_000);

    button.focus();
    fireEvent.click(button);
    fireEvent.blur(button);
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("never arms from a mouse or touch click", () => {
    const { onConfirm, button } = renderButton();

    for (const pointerType of ["mouse", "touch", "mouse"]) {
      point("pointerDown", button, { pointerType });
      advance(100);
      point("pointerUp", button, { pointerType });
      fireEvent.click(button, { detail: 1 });
    }
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("drops the arm when a real press starts", () => {
    const { onConfirm, button } = renderButton();

    fireEvent.click(button);
    point("pointerDown", button);
    advance(200);
    point("pointerUp", button);
    advance(1500);
    fireEvent.click(button);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Activate again to confirm");
  });

  it("reads the arming message again each time", () => {
    const { button } = renderButton();
    const status = screen.getByRole("status");

    fireEvent.click(button);
    const first = status.textContent;
    advance(10_000);
    fireEvent.click(button);
    expect(status.textContent).not.toBe(first);
    expect(status.textContent?.trim()).toBe("Activate again to confirm");
  });

  it("waits for a promise after a two-step confirm", async () => {
    const work = deferred();
    const { button } = renderButton(vi.fn(() => work.promise));

    fireEvent.click(button);
    fireEvent.click(button);
    advance(5000);
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-state", "confirmed");
    await act(async () => work.resolve());
    advance(700);
    expect(button).toHaveAttribute("data-state", "idle");
  });

  it("uses messages.again", () => {
    render(
      <HoldButton messages={{ again: "Actívalo otra vez para confirmar" }} onConfirm={() => {}}>
        Eliminar
      </HoldButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("status")).toHaveTextContent("Actívalo otra vez para confirmar");
  });

  it("buzzes once when a touch hold confirms, and only then", () => {
    const vibrate = vi.fn(() => true);
    const activation = { hasBeenActive: true };
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });
    Object.defineProperty(navigator, "userActivation", { configurable: true, value: activation });
    const { button } = renderButton();

    point("pointerDown", button);
    advance(1500);
    point("pointerUp", button);
    advance(1000);
    fireEvent.keyDown(button, { key: "Enter" });
    advance(1500);
    fireEvent.keyUp(button, { key: "Enter" });
    advance(1000);
    fireEvent.click(button);
    fireEvent.click(button);
    advance(1000);
    point("pointerDown", button, { pointerType: "touch" });
    advance(500);
    point("pointerUp", button, { pointerType: "touch" });
    expect(vibrate).not.toHaveBeenCalled();

    point("pointerDown", button, { pointerType: "touch" });
    advance(1500);
    expect(vibrate).toHaveBeenCalledOnce();
    expect(vibrate).toHaveBeenCalledWith(15);
    point("pointerUp", button, { pointerType: "touch" });
    advance(1000);

    activation.hasBeenActive = false;
    point("pointerDown", button, { pointerType: "pen" });
    advance(1500);
    expect(vibrate).toHaveBeenCalledOnce();

    Reflect.deleteProperty(navigator, "vibrate");
    Reflect.deleteProperty(navigator, "userActivation");
  });

  it("announces from a live region outside the button", () => {
    const { button } = renderButton();
    const status = screen.getByRole("status");

    expect(button.contains(status)).toBe(false);
    expect(button.nextElementSibling).toBe(status);
    point("pointerDown", button);
    advance(1500);
    expect(status).toHaveTextContent("Confirmed");
  });

  it("keeps the announcement when the button is disabled as it confirms", () => {
    render(<DisablesOnConfirm />);
    const button = screen.getByRole("button", { name: "Hold to delete" });

    point("pointerDown", button);
    advance(1500);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-state", "idle");
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
    advance(5000);
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
  });

  it("clears the announcement when the next hold starts, so it is read again", () => {
    const { button } = renderButton();
    point("pointerDown", button);
    advance(1500);
    point("pointerUp", button);
    advance(1000);

    point("pointerDown", button);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    advance(1500);
    expect(screen.getByRole("status")).toHaveTextContent("Confirmed");
  });

  it("uses messages for the hint and the announcement", () => {
    render(
      <HoldButton
        messages={{ hint: "Mantén pulsado para confirmar", confirmed: "Eliminado" }}
        onConfirm={() => {}}
      >
        Mantén para eliminar
      </HoldButton>,
    );
    const button = screen.getByRole("button", { name: "Mantén para eliminar" });

    expect(button).toHaveAccessibleDescription("Mantén pulsado para confirmar");
    point("pointerDown", button);
    advance(1500);
    expect(screen.getByRole("status")).toHaveTextContent("Eliminado");
  });

  it("keeps the English default for any message left out", () => {
    render(
      <HoldButton messages={{ confirmed: "Gelöscht" }} onConfirm={() => {}}>
        Halten zum Löschen
      </HoldButton>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Press and hold to confirm");
  });

  it("works under StrictMode: one confirm, one stylesheet, clean unmount", () => {
    const onConfirm = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <HoldButton onConfirm={onConfirm}>Hold to delete</HoldButton>
      </StrictMode>,
    );
    const button = screen.getByRole("button", { name: "Hold to delete" });

    point("pointerDown", button);
    advance(1500);
    expect(onConfirm).toHaveBeenCalledOnce();
    point("pointerUp", button);
    fireEvent.click(button);
    advance(2000);
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledOnce();
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(ourStyles()).toHaveLength(1);
    advance(1000);

    point("pointerDown", button);
    unmount();
    advance(3000);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("delivers styles the way this React version supports", () => {
    render(<HoldButton onConfirm={() => {}}>One</HoldButton>);
    const injected = document.querySelectorAll("style[data-onpurpose]");
    const hoisted = document.querySelectorAll('style[data-href^="onpurpose-"]');
    if (version.startsWith("18.")) {
      expect(injected).toHaveLength(1);
      expect(hoisted).toHaveLength(0);
    } else {
      expect(injected).toHaveLength(0);
      expect(hoisted).toHaveLength(1);
    }
  });

  it("injects one shared stylesheet", () => {
    render(
      <>
        <HoldButton onConfirm={() => {}}>One</HoldButton>
        <HoldButton onConfirm={() => {}}>Two</HoldButton>
      </>,
    );

    const styles = ourStyles();
    expect(styles).toHaveLength(1);
    expect(styles[0]?.parentElement).toBe(document.head);
    expect(styles[0]?.textContent).toMatch(/^@layer theme, base, components, utilities;/);
    expect(styles[0]?.textContent).toContain("@layer components.hold-button");
    expect(styles[0]?.textContent).toContain("--hold-fill");
    expect(styles[0]?.textContent).toContain("--hold-confirmed");
    expect(styles[0]?.textContent).toContain(".onpurpose");
    const css = styles[0]?.textContent ?? "";
    expect(css).toContain("1500ms");
    expect(css).toContain("border-radius: 0.5em");
    expect(css).toContain("outline-offset: 2px");
    expect(css).toContain("44px");
    expect(css).toContain("forced-colors: active");
    expect(css).toContain("Highlight");
  });

  it("still styles the page when another element has the id onpurpose", () => {
    const section = document.createElement("section");
    section.id = "onpurpose";
    document.body.append(section);
    render(<HoldButton onConfirm={() => {}}>One</HoldButton>);

    expect(ourStyles()).toHaveLength(1);
    section.remove();
  });

  it("hides the hint and live region before any stylesheet loads", () => {
    const html = renderToString(<HoldButton onConfirm={() => {}}>Hold to delete</HoldButton>);
    const host = document.createElement("div");
    host.innerHTML = html.replace(/<style[\s\S]*?<\/style>/, "");

    for (const span of host.querySelectorAll<HTMLElement>(".onpurpose-sr")) {
      expect(span.style.position).toBe("absolute");
      expect(span.style.clipPath).toBe("inset(50%)");
      expect(span.style.width).toBe("1px");
    }
  });

  it("hydrates server markup without a mismatch", async () => {
    vi.useRealTimers();
    const ui = (
      <HoldButton aria-describedby="extra" onConfirm={() => {}}>
        {(state) => `Hold to delete (${state})`}
      </HoldButton>
    );
    const host = document.createElement("div");
    host.innerHTML = renderToString(ui);
    document.body.append(host);
    const errors: unknown[] = [];
    const error = vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));

    await act(async () => {
      hydrateRoot(host, ui, { onRecoverableError: (cause) => errors.push(cause) });
    });

    expect(errors).toEqual([]);
    expect(screen.getByRole("button", { name: "Hold to delete (idle)" })).toBeInTheDocument();
    error.mockRestore();
    host.remove();
  });

  it("does not start a hold from a non-primary button", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button, { button: 2, buttons: 2 });
    expect(button).toHaveAttribute("data-state", "idle");
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("uses aria-label as the accessible name", () => {
    render(
      <HoldButton aria-label="Delete the project" onConfirm={() => {}}>
        Hold to delete
      </HoldButton>,
    );
    const button = screen.getByRole("button", { name: "Delete the project" });

    expect(button).not.toHaveAttribute("aria-labelledby");
  });

  it("preserves a caller-supplied aria-labelledby", () => {
    render(
      <>
        <span id="name">Delete the project</span>
        <HoldButton aria-labelledby="name" onConfirm={() => {}}>
          Hold to delete
        </HoldButton>
      </>,
    );
    const button = screen.getByRole("button", { name: "Delete the project" });

    expect(button).toHaveAttribute("aria-labelledby", "name");
  });

  it("bubbles a short press and swallows the click after confirm", () => {
    const parentClick = vi.fn();
    const onConfirm = vi.fn();
    render(
      // biome-ignore lint/a11y/noStaticElementInteractions: parent click is the behavior under test
      // biome-ignore lint/a11y/useKeyWithClickEvents: parent click is the behavior under test
      <div onClick={parentClick}>
        <HoldButton onConfirm={onConfirm}>Hold to delete</HoldButton>
      </div>,
    );
    const button = screen.getByRole("button", { name: "Hold to delete" });

    point("pointerDown", button);
    advance(400);
    point("pointerUp", button);
    fireEvent.click(button);
    expect(parentClick).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();

    parentClick.mockClear();
    point("pointerDown", button);
    advance(1500);
    expect(onConfirm).toHaveBeenCalledOnce();
    point("pointerUp", button);
    fireEvent.click(button);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it.each(["submit", "reset"] as const)("does not %s its form on a plain click", (type) => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const onReset = vi.fn();
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)} onReset={onReset}>
        <HoldButton type={type} onConfirm={() => {}}>
          Hold to delete
        </HoldButton>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Hold to delete" });

    point("pointerDown", button);
    point("pointerUp", button);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      button.dispatchEvent(click);
    });

    expect(click.defaultPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  it("keeps the click after a confirm from native listeners too", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const nativeClicks = vi.fn();
    host.addEventListener("click", nativeClicks);
    render(<HoldButton onConfirm={() => {}}>Hold to delete</HoldButton>, { container: host });
    const button = screen.getByRole("button", { name: "Hold to delete" });

    point("pointerDown", button);
    advance(400);
    point("pointerUp", button);
    fireEvent.click(button);
    expect(nativeClicks).toHaveBeenCalledOnce();

    point("pointerDown", button);
    advance(1500);
    point("pointerUp", button);
    fireEvent.click(button);
    expect(nativeClicks).toHaveBeenCalledOnce();
    host.remove();
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
