import type { ComponentPropsWithRef, ReactNode } from "react";
import {
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export type HoldButtonState = "idle" | "holding" | "confirmed";

export type HoldButtonProps = Omit<ComponentPropsWithRef<"button">, "children" | "onClick"> & {
  onConfirm: () => void;
  children: ReactNode | ((state: HoldButtonState) => ReactNode);
};

const HOLD_MS = 1500;
const RETRACT_MS = 200;
const PRESS_MS = 160;
const DWELL_MS = 700;
const EASE = "cubic-bezier(.23,1,.32,1)";
const STYLE_ID = "op";

const CSS = `@layer hold-button{.op{--e:${EASE};--r:${RETRACT_MS}ms;position:relative;display:inline-flex;appearance:none;padding:0;border:0;background:none;font:inherit;color:inherit;border-radius:.5em;touch-action:manipulation;user-select:none;-webkit-touch-callout:none}.op:disabled{opacity:.4}.op:focus{outline:none}.op:focus-visible{outline:2px solid;outline-offset:2px}.op-f{position:relative;display:inline-flex;overflow:hidden;border:1px solid;border-radius:inherit;padding:.5em .9em;transition:transform ${PRESS_MS}ms var(--e)}.op[data-state=holding] .op-f{transform:scale(.97)}.op[data-state=confirmed]{background:var(--hold-confirmed,currentColor)}.op[data-state=confirmed] .op-f{color:Canvas;background:0;border-color:transparent}.op-i{position:absolute;inset:0;background:var(--hold-fill,color-mix(in srgb,currentColor 16%,transparent));clip-path:inset(0 100% 0 0);transition:clip-path var(--r) var(--e)}.op[data-state=holding] .op-i{clip-path:inset(0);transition:clip-path ${HOLD_MS}ms linear}.op[data-state=confirmed] .op-i{clip-path:inset(0);opacity:0;transition:none}.op-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%)}@media (pointer:coarse){.op:before{content:"";position:absolute;inset-block:min(0px,calc((100% - 44px) / 2));inset-inline:0}}@media (prefers-reduced-motion:reduce){.op{--r:0s}.op[data-state=holding] .op-f{transform:none;transition:none}}@media (prefers-contrast:more){.op{--hold-fill:color-mix(in srgb,currentColor 40%,transparent)}}@media (forced-colors:active){.op-i{background:Highlight}.op[data-state=confirmed]{background:Highlight}.op[data-state=confirmed] .op-f{color:HighlightText}}}`;

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

const useIsoLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

type Gesture = { kind: "pointer"; pointerId: number } | { kind: "key"; key: string };

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

function pointerIsInside(x: number, y: number, node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export const HoldButton = forwardRef<HTMLButtonElement, HoldButtonProps>(function HoldButton(
  {
    onConfirm,
    children,
    className,
    disabled,
    type = "button",
    "aria-describedby": ariaDescribedBy,
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
  injectStyles();

  const hintId = useId();
  const labelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const forwardedRef = useRef(ref);
  const onConfirmRef = useRef(onConfirm);
  const gestureRef = useRef<Gesture | null>(null);
  const phaseRef = useRef<HoldButtonState>("idle");
  const mountedRef = useRef(true);
  const holdTimerRef = useRef<number>(0);
  const dwellTimerRef = useRef<number>(0);
  const pointRef = useRef({ x: 0, y: 0 });
  const removePageListenersRef = useRef<(() => void) | null>(null);
  const endGestureRef = useRef<() => void>(() => {});
  const abortRef = useRef<() => void>(() => {});

  const [phase, setPhase] = useState<HoldButtonState>("idle");
  const [announcement, setAnnouncement] = useState("");

  forwardedRef.current = ref;
  onConfirmRef.current = onConfirm;

  const setPhaseBoth = (next: HoldButtonState) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const removePageListeners = () => {
    removePageListenersRef.current?.();
    removePageListenersRef.current = null;
  };

  const clearDwell = () => {
    window.clearTimeout(dwellTimerRef.current);
  };

  const releasePointer = (gesture: Gesture | null) => {
    if (gesture?.kind !== "pointer") return;
    try {
      buttonRef.current?.releasePointerCapture(gesture.pointerId);
    } catch {
      // The pointer is already gone.
    }
  };

  const goIdle = () => {
    clearDwell();
    if (phaseRef.current === "idle") return;
    setPhaseBoth("idle");
    setAnnouncement("");
  };

  const endGesture = () => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;
    removePageListeners();
    window.clearTimeout(holdTimerRef.current);
    releasePointer(gesture);
    if (phaseRef.current === "confirmed") {
      clearDwell();
      dwellTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current || gestureRef.current || phaseRef.current !== "confirmed") return;
        setPhaseBoth("idle");
        setAnnouncement("");
      }, DWELL_MS);
      return;
    }
    if (phaseRef.current === "holding") goIdle();
  };

  const abort = () => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    removePageListeners();
    window.clearTimeout(holdTimerRef.current);
    releasePointer(gesture);
    goIdle();
  };

  endGestureRef.current = endGesture;
  abortRef.current = abort;

  const beginHold = () => {
    window.clearTimeout(holdTimerRef.current);
    clearDwell();
    setPhaseBoth("holding");
    setAnnouncement("");
    if (!removePageListenersRef.current) {
      const onVisibility = () => {
        if (document.visibilityState === "hidden") endGestureRef.current();
      };
      const onWindowBlur = () => endGestureRef.current();
      const onScroll = () => {
        const active = gestureRef.current;
        const node = buttonRef.current;
        if (active?.kind !== "pointer" || !node) return;
        if (!pointerIsInside(pointRef.current.x, pointRef.current.y, node)) endGestureRef.current();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onWindowBlur);
      document.addEventListener("scroll", onScroll, true);
      removePageListenersRef.current = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("blur", onWindowBlur);
        document.removeEventListener("scroll", onScroll, true);
      };
    }
    holdTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current || phaseRef.current !== "holding") return;
      setPhaseBoth("confirmed");
      setAnnouncement("Confirmed");
      onConfirmRef.current();
    }, HOLD_MS);
  };

  useIsoLayoutEffect(() => {
    const fill = fillRef.current;
    if (phase !== "holding" || !fill) return;
    fill.style.cssText = "transition:none;clip-path:inset(0 100% 0 0)";
    void fill.offsetWidth;
    fill.style.cssText = "";
  }, [phase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(holdTimerRef.current);
      window.clearTimeout(dwellTimerRef.current);
      removePageListenersRef.current?.();
      removePageListenersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (disabled) abortRef.current();
  }, [disabled]);

  const setButtonRef = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
    assignRef(forwardedRef.current, node);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || !event.isPrimary || event.button !== 0 || gestureRef.current) return;
    pointRef.current = { x: event.clientX, y: event.clientY };
    gestureRef.current = { kind: "pointer", pointerId: event.pointerId };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail if the pointer is already gone. The hold still tracks the id.
    }
    beginHold();
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.kind !== "pointer" || gesture.pointerId !== event.pointerId) return;
    pointRef.current = { x: event.clientX, y: event.clientY };
    if (!pointerIsInside(event.clientX, event.clientY, event.currentTarget)) endGesture();
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.kind !== "pointer" || gesture.pointerId !== event.pointerId) return;
    endGesture();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (disabled || event.repeat || gestureRef.current) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    gestureRef.current = { kind: "key", key: event.key };
    beginHold();
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.kind !== "key" || gesture.key !== event.key) return;
    event.preventDefault();
    endGesture();
  };

  const handleBlur = (event: FocusEvent<HTMLButtonElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    endGesture();
  };

  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    if (gestureRef.current) event.preventDefault();
  };

  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(" ");
  const label = typeof children === "function" ? children(phase) : children;

  return (
    <button
      {...props}
      ref={setButtonRef}
      type={type}
      className={className ? `op ${className}` : "op"}
      disabled={disabled}
      data-state={phase}
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      onPointerDown={(event) => runUnlessPrevented(onPointerDown, event, handlePointerDown)}
      onPointerMove={(event) => runUnlessPrevented(onPointerMove, event, handlePointerMove)}
      onPointerUp={(event) => runUnlessPrevented(onPointerUp, event, handlePointerUp)}
      onPointerCancel={(event) => runUnlessPrevented(onPointerCancel, event, handlePointerUp)}
      onLostPointerCapture={(event) =>
        runUnlessPrevented(onLostPointerCapture, event, handlePointerUp)
      }
      onKeyDown={(event) => runUnlessPrevented(onKeyDown, event, handleKeyDown)}
      onKeyUp={(event) => runUnlessPrevented(onKeyUp, event, handleKeyUp)}
      onBlur={(event) => runUnlessPrevented(onBlur, event, handleBlur)}
      onContextMenu={(event) => runUnlessPrevented(onContextMenu, event, handleContextMenu)}
    >
      <span className="op-f">
        <span ref={fillRef} className="op-i" aria-hidden="true" />
        <span id={labelId}>{label}</span>
      </span>
      <span id={hintId} className="op-sr">
        Press and hold to confirm
      </span>
      <span role="status" className="op-sr">
        {announcement}
      </span>
    </button>
  );
});
