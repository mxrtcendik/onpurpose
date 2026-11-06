import { fireEvent, render, screen } from "@testing-library/react";
import { act, createRef, type PointerEvent as ReactPointerEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { HoldButton } from "../src";
import { advance, point } from "./helpers";

describe("clicks, forms and your handlers", () => {
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
});
