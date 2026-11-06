import type { ComponentPropsWithRef, ReactNode } from "react";
import { forwardRef, type Ref, useCallback, useId, useRef } from "react";
import { HoldButtonStyles, SR_ONLY } from "./styles";
import { type HoldButtonState, useHoldButton } from "./use-hold-button";

export type { HoldButtonState };

export type HoldButtonMessages = {
  hint?: string;
  confirmed?: string;
  again?: string;
};

export type HoldButtonProps = Omit<ComponentPropsWithRef<"button">, "children" | "onClick"> & {
  onConfirm: () => unknown;
  children: ReactNode | ((state: HoldButtonState, info: { busy: boolean }) => ReactNode);
  messages?: HoldButtonMessages;
};

const DEFAULT_MESSAGES = {
  hint: "Press and hold to confirm",
  confirmed: "Confirmed",
  again: "Activate again to confirm",
} satisfies Required<HoldButtonMessages>;

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
export const HoldButton = forwardRef<HTMLButtonElement, HoldButtonProps>(function HoldButton(
  {
    onConfirm,
    children,
    messages,
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
  const hintId = useId();
  const labelId = useId();
  const forwardedRef = useRef(ref);
  const text = { ...DEFAULT_MESSAGES, ...messages };
  const hold = useHoldButton({ disabled, onConfirm, messages: text });

  forwardedRef.current = ref;

  const setButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      hold.setButtonNode(node);
      assignRef(forwardedRef.current, node);
    },
    [hold.setButtonNode],
  );

  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(" ");
  const label =
    typeof children === "function" ? children(hold.phase, { busy: hold.busy }) : children;
  const labelledBy = ariaLabelledBy ?? (ariaLabel ? undefined : labelId);

  return (
    <>
      <HoldButtonStyles />
      <button
        aria-busy={hold.busy || undefined}
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
        onPointerDown={(event) => runUnlessPrevented(onPointerDown, event, hold.onPointerDown)}
        onPointerMove={(event) => runUnlessPrevented(onPointerMove, event, hold.onPointerMove)}
        onPointerUp={(event) => runUnlessPrevented(onPointerUp, event, hold.onPointerUp)}
        onPointerCancel={(event) =>
          runUnlessPrevented(onPointerCancel, event, hold.onPointerCancel)
        }
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
        <span id={hintId} className="onpurpose-sr" style={SR_ONLY}>
          {text.hint}
        </span>
      </button>
      <span role="status" className="onpurpose-sr" style={SR_ONLY}>
        {hold.announcement}
      </span>
    </>
  );
});

HoldButton.displayName = "HoldButton";
