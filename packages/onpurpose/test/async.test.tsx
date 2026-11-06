import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { HoldButton } from "../src";
import { advance, deferred, nextUnhandledRejection, point, renderButton } from "./helpers";

describe("a promise from onConfirm", () => {
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
});
