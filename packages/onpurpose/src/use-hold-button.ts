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
import {
  ARM_MS,
  DWELL_MS,
  HAPTIC_MS,
  HOLD_MS,
  PRESS_CLICK_MS,
  TARGET_PX,
  TOUCH_SLOP_PX,
} from "./constants";

export type HoldButtonState = "idle" | "holding" | "confirmed";

const useIsoLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

type Gesture =
  | { kind: "pointer"; pointerId: number; slop: number; coarse: boolean; touch: boolean }
  | { kind: "key"; key: string };

function buzz() {
  if (typeof navigator.vibrate !== "function" || !navigator.userActivation?.hasBeenActive) return;
  navigator.vibrate(HAPTIC_MS);
}

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
  messages,
}: {
  disabled: boolean | undefined;
  onConfirm: () => unknown;
  messages: { confirmed: string; again: string };
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const onConfirmRef = useRef(onConfirm);
  const messagesRef = useRef(messages);
  const lastPointerUpRef = useRef(Number.NEGATIVE_INFINITY);
  const armTimerRef = useRef(0);
  const armedRef = useRef(false);
  const clickRef = useRef<(event: globalThis.MouseEvent) => void>(() => {});
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
  messagesRef.current = messages;

  const setPhaseBoth = (next: HoldButtonState) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const announce = (text: string) => {
    setAnnouncement((current) => (current === text ? `${text} ` : text));
  };

  const disarm = () => {
    armedRef.current = false;
    window.clearTimeout(armTimerRef.current);
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
    const node = buttonRef.current;
    if (node?.hasPointerCapture(gesture.pointerId)) node.releasePointerCapture(gesture.pointerId);
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
    disarm();
    setPhaseBoth("confirmed");
    announce(messagesRef.current.confirmed);
    const gesture = gestureRef.current;
    if (gesture?.kind === "pointer" && gesture.touch) buzz();
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
    disarm();
    goIdle();
  };

  endGestureRef.current = endGesture;
  abortRef.current = abort;

  const beginHold = () => {
    disarm();
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
      const onEscape = (event: globalThis.KeyboardEvent) => {
        if (event.key === "Escape" && phaseRef.current === "holding") endGestureRef.current();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onWindowBlur);
      document.addEventListener("scroll", onScroll, true);
      document.addEventListener("keydown", onEscape);
      removePageListenersRef.current = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("blur", onWindowBlur);
        document.removeEventListener("scroll", onScroll, true);
        document.removeEventListener("keydown", onEscape);
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
      window.clearTimeout(armTimerRef.current);
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
      touch: event.pointerType !== "mouse",
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
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
    event.preventDefault();
    if (disabled || pendingRef.current || event.repeat || gestureRef.current) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    gestureRef.current = { kind: "key", key: event.key };
    beginHold();
  };

  const onKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const gesture = gestureRef.current;
    if (gesture?.kind === "key" && gesture.key === event.key) endGesture();
  };

  const onBlur = (event: FocusEvent<HTMLButtonElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    disarm();
    if (gestureRef.current?.kind === "key") endGesture();
  };

  const onContextMenu = (event: MouseEvent<HTMLButtonElement>) => {
    if (gestureRef.current) event.preventDefault();
  };

  clickRef.current = (event) => {
    event.preventDefault();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.stopPropagation();
      return;
    }
    if (event.timeStamp - lastPointerUpRef.current < PRESS_CLICK_MS) return;
    if (pendingRef.current || gestureRef.current) return;
    if (!armedRef.current) {
      armedRef.current = true;
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = window.setTimeout(disarm, ARM_MS);
      announce(messagesRef.current.again);
      return;
    }
    confirm();
    if (!pendingRef.current) dwellThenIdle();
  };

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;
    const onClick = (event: globalThis.MouseEvent) => clickRef.current(event);
    const onPointerUp = (event: globalThis.PointerEvent) => {
      lastPointerUpRef.current = event.timeStamp;
    };
    node.addEventListener("click", onClick);
    node.addEventListener("pointerup", onPointerUp, true);
    return () => {
      node.removeEventListener("click", onClick);
      node.removeEventListener("pointerup", onPointerUp, true);
    };
  }, []);

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
  };
}
