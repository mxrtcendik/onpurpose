import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { HOLD_MS, TARGET_PX } from "./styles";

/** `idle` before a hold, `holding` while it is in progress, and `confirmed` after it completes. */
export type HoldButtonState = "idle" | "holding" | "confirmed";

const DWELL_MS = 700;
const TOUCH_SLOP_PX = 8;

const useIsoLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

type Gesture =
  | { kind: "pointer"; pointerId: number; slop: number; coarse: boolean }
  | { kind: "key"; key: string };

function pointerIsInside(
  x: number,
  y: number,
  node: HTMLElement,
  { slop, coarse }: { slop: number; coarse: boolean },
) {
  const rect = node.getBoundingClientRect();
  const reach = coarse ? Math.max(0, (TARGET_PX - rect.height) / 2) : 0;
  return (
    x >= rect.left - slop &&
    x <= rect.right + slop &&
    y >= rect.top - reach - slop &&
    y <= rect.bottom + reach + slop
  );
}

export function useHoldButton({
  disabled,
  onConfirm,
  confirmedMessage,
}: {
  disabled: boolean | undefined;
  onConfirm: () => unknown;
  confirmedMessage: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const onConfirmRef = useRef(onConfirm);
  const confirmedMessageRef = useRef(confirmedMessage);
  const gestureRef = useRef<Gesture | null>(null);
  const phaseRef = useRef<HoldButtonState>("idle");
  const mountedRef = useRef(true);
  const holdTimerRef = useRef(0);
  const dwellTimerRef = useRef(0);
  const pointRef = useRef({ x: 0, y: 0 });
  const removePageListenersRef = useRef<(() => void) | null>(null);
  const endGestureRef = useRef<() => void>(() => {});
  const abortRef = useRef<() => void>(() => {});
  const suppressClickRef = useRef(false);
  const pendingRef = useRef(0);

  const [phase, setPhase] = useState<HoldButtonState>("idle");
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);

  onConfirmRef.current = onConfirm;
  confirmedMessageRef.current = confirmedMessage;

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
  };

  const dwellThenIdle = () => {
    clearDwell();
    dwellTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current || gestureRef.current || pendingRef.current) return;
      if (phaseRef.current === "confirmed") setPhaseBoth("idle");
    }, DWELL_MS);
  };

  const endGesture = () => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    gestureRef.current = null;
    removePageListeners();
    window.clearTimeout(holdTimerRef.current);
    releasePointer(gesture);
    if (phaseRef.current === "confirmed") {
      if (!pendingRef.current) dwellThenIdle();
      return;
    }
    if (phaseRef.current === "holding") goIdle();
  };

  const settle = (token: number, ok: boolean) => {
    if (!mountedRef.current || pendingRef.current !== token) return;
    pendingRef.current = 0;
    setBusy(false);
    if (gestureRef.current) return;
    if (ok) dwellThenIdle();
    else goIdle();
  };

  const confirm = () => {
    setPhaseBoth("confirmed");
    setAnnouncement(confirmedMessageRef.current);
    const result = onConfirmRef.current();
    if (!isThenable(result)) return;
    const token = pendingRef.current + 1;
    pendingRef.current = token;
    setBusy(true);
    Promise.resolve(result).then(
      () => settle(token, true),
      (error: unknown) => {
        settle(token, false);
        throw error;
      },
    );
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
        if (!pointerIsInside(pointRef.current.x, pointRef.current.y, node, active)) {
          endGestureRef.current();
        }
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
      confirm();
    }, HOLD_MS);
  };

  const shownPhaseRef = useRef<HoldButtonState>("idle");

  useIsoLayoutEffect(() => {
    const fill = fillRef.current;
    const previous = shownPhaseRef.current;
    shownPhaseRef.current = phase;
    const reset = phase === "holding" || (phase === "idle" && previous === "confirmed");
    if (!reset || !fill) return;
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

  const setButtonNode = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    suppressClickRef.current = false;
    if (disabled || pendingRef.current || !event.isPrimary || event.button !== 0) return;
    if (gestureRef.current) return;
    pointRef.current = { x: event.clientX, y: event.clientY };
    gestureRef.current = {
      kind: "pointer",
      pointerId: event.pointerId,
      slop: event.pointerType === "mouse" ? 0 : TOUCH_SLOP_PX,
      coarse: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail if the pointer is already gone. The hold still tracks the id.
    }
    beginHold();
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.kind !== "pointer" || gesture.pointerId !== event.pointerId) return;
    pointRef.current = { x: event.clientX, y: event.clientY };
    if (!pointerIsInside(event.clientX, event.clientY, event.currentTarget, gesture)) endGesture();
  };

  const matchesPointer = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    return gesture?.kind === "pointer" && gesture.pointerId === event.pointerId;
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!matchesPointer(event)) return;
    if (phaseRef.current === "confirmed") suppressClickRef.current = true;
    endGesture();
  };

  const onPointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (!matchesPointer(event)) return;
    endGesture();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (disabled || pendingRef.current || event.repeat || gestureRef.current) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    gestureRef.current = { kind: "key", key: event.key };
    beginHold();
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.kind !== "key" || gesture.key !== event.key) return;
    event.preventDefault();
    endGesture();
  };

  const onBlur = (event: FocusEvent<HTMLButtonElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    endGesture();
  };

  const onContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    if (gestureRef.current) event.preventDefault();
  };

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.stopPropagation();
  };

  return {
    phase,
    busy,
    announcement,
    fillRef,
    setButtonNode,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
    onBlur,
    onContextMenu,
    onClick,
  };
}
