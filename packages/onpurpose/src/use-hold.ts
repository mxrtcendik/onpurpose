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
import { HOLD_MS } from "./styles";

/** `idle` before a hold, `holding` while it is in progress, and `confirmed` after it completes. */
export type HoldButtonState = "idle" | "holding" | "confirmed";

const DWELL_MS = 700;

const useIsoLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

type Gesture = { kind: "pointer"; pointerId: number } | { kind: "key"; key: string };

function pointerIsInside(x: number, y: number, node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function useHoldButton({
  disabled,
  onConfirm,
}: {
  disabled: boolean | undefined;
  onConfirm: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const onConfirmRef = useRef(onConfirm);
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

  const [phase, setPhase] = useState<HoldButtonState>("idle");
  const [announcement, setAnnouncement] = useState("");

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

  const setButtonNode = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    suppressClickRef.current = false;
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

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current;
    if (gesture?.kind !== "pointer" || gesture.pointerId !== event.pointerId) return;
    pointRef.current = { x: event.clientX, y: event.clientY };
    if (!pointerIsInside(event.clientX, event.clientY, event.currentTarget)) endGesture();
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
    if (disabled || event.repeat || gestureRef.current) {
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
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    phase,
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
