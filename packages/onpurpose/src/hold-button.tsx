import type { ComponentPropsWithRef, ReactNode } from "react";
import { forwardRef, type Ref, useCallback, useId, useRef } from "react";
import { useHoldButtonStyles } from "./styles";
import { type HoldButtonState, useHoldButton } from "./use-hold";

export type { HoldButtonState };

export type HoldButtonProps = Omit<ComponentPropsWithRef<"button">, "children" | "onClick"> & {
  /** Runs once, when the hold finishes. */
  onConfirm: () => void;
  /** The label. Pass a function to change it with the hold state. */
  children: ReactNode | ((state: HoldButtonState) => ReactNode);
};

type EventWithDefault = { defaultPrevented: boolean };

function runUnlessPrevented<E extends EventWithDefault>(
  user: ((event: E) => void) | undefined,
  event: E,
  ours: (event: E) => void,
) {
  user?.(event);
  if (!event.defaultPrevented) ours(event);
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/**
 * A button that fires `onConfirm` only after it is held down.
 * Letting go early retracts the fill and runs nothing.
 */
export const HoldButton = forwardRef<HTMLButtonElement, HoldButtonProps>(function HoldButton(
  {
    onConfirm,
    children,
    className,
    disabled,
    type = "button",
    "aria-describedby": ariaDescribedBy,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onKeyDown,
    onKeyUp,
    onBlur,
    onContextMenu,
    ...props
  },
  ref,
) {
  useHoldButtonStyles();

  const hintId = useId();
  const labelId = useId();
  const forwardedRef = useRef(ref);
  const hold = useHoldButton({ disabled, onConfirm });

  forwardedRef.current = ref;

  const setButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      hold.setButtonNode(node);
      assignRef(forwardedRef.current, node);
    },
    [hold.setButtonNode],
  );

  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(" ");
  const label = typeof children === "function" ? children(hold.phase) : children;
  const labelledBy = ariaLabelledBy ?? (ariaLabel ? undefined : labelId);

  return (
    <button
      {...props}
      ref={setButtonRef}
      type={type}
      className={className ? `onpurpose ${className}` : "onpurpose"}
      disabled={disabled}
      data-state={hold.phase}
      data-disabled={disabled ? "" : undefined}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={hold.onClick}
      onPointerDown={(event) => runUnlessPrevented(onPointerDown, event, hold.onPointerDown)}
      onPointerMove={(event) => runUnlessPrevented(onPointerMove, event, hold.onPointerMove)}
      onPointerUp={(event) => runUnlessPrevented(onPointerUp, event, hold.onPointerUp)}
      onPointerCancel={(event) => runUnlessPrevented(onPointerCancel, event, hold.onPointerCancel)}
      onLostPointerCapture={(event) =>
        runUnlessPrevented(onLostPointerCapture, event, hold.onPointerCancel)
      }
      onKeyDown={(event) => runUnlessPrevented(onKeyDown, event, hold.onKeyDown)}
      onKeyUp={(event) => runUnlessPrevented(onKeyUp, event, hold.onKeyUp)}
      onBlur={(event) => runUnlessPrevented(onBlur, event, hold.onBlur)}
      onContextMenu={(event) => runUnlessPrevented(onContextMenu, event, hold.onContextMenu)}
    >
      <span className="onpurpose-frame">
        <span ref={hold.fillRef} className="onpurpose-fill" aria-hidden="true" />
        <span id={labelId} className="onpurpose-label">
          {label}
        </span>
      </span>
      <span id={hintId} className="onpurpose-sr">
        Press and hold to confirm
      </span>
      <span role="status" className="onpurpose-sr">
        {hold.announcement}
      </span>
    </button>
  );
});

HoldButton.displayName = "HoldButton";
