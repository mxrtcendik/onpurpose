import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { HoldButton } from "../src";
import { advance, DisablesOnConfirm, deferred, point, renderButton } from "./helpers";

describe("screen readers", () => {
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
});
