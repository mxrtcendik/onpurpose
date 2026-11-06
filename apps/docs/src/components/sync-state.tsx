import type { HoldButtonState } from "onpurpose";
import { type ReactNode, useEffect } from "react";

export function SyncState({
  state,
  onChange,
  children,
}: {
  state: HoldButtonState;
  onChange: (state: HoldButtonState) => void;
  children: ReactNode;
}) {
  useEffect(() => {
    onChange(state);
  }, [state, onChange]);

  return children;
}
