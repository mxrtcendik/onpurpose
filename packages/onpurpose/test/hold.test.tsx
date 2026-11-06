import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { HoldButton } from "../src";
import { advance, point, renderButton } from "./helpers";

describe("holding", () => {
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

  it("accepts an onConfirm that returns anything", () => {
    const removed: string[] = [];
    render(<HoldButton onConfirm={() => removed.push("project")}>Hold to delete</HoldButton>);
    const button = screen.getByRole("button");
    point("pointerDown", button);
    advance(1500);
    expect(removed).toEqual(["project"]);
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("passes each state to function children", () => {
    render(<HoldButton onConfirm={() => {}}>{(state) => state}</HoldButton>);
    const button = screen.getByRole("button", { name: "idle" });

    point("pointerDown", button);
    expect(screen.getByRole("button", { name: "holding" })).toBeInTheDocument();
    advance(1500);
    expect(screen.getByRole("button", { name: "confirmed" })).toBeInTheDocument();
  });
});
