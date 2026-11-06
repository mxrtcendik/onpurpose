import { cleanup, fireEvent } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { advance, box, point, renderButton } from "./helpers";

describe("pointer", () => {
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

  it("does not start a hold from a non-primary button", () => {
    const { onConfirm, button } = renderButton();

    point("pointerDown", button, { button: 2, buttons: 2 });
    expect(button).toHaveAttribute("data-state", "idle");
    advance(1500);
    expect(onConfirm).not.toHaveBeenCalled();
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

  it("keeps a pointer hold when the button blurs, as Safari does on press", () => {
    const { onConfirm, button } = renderButton();
    button.focus();

    point("pointerDown", button);
    fireEvent.blur(button);
    expect(button).toHaveAttribute("data-state", "holding");
    advance(1500);
    expect(onConfirm).toHaveBeenCalledOnce();
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
});
