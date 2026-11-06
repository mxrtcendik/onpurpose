import { fireEvent, render, screen } from "@testing-library/react";
import { act, StrictMode, version } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HoldButton } from "../src";
import { advance, ourStyles, point } from "./helpers";

describe("rendering", () => {
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
});
