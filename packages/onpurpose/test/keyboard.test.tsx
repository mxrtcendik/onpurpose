import { fireEvent, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { advance, point, renderButton } from "./helpers";

describe("keyboard", () => {
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
});
