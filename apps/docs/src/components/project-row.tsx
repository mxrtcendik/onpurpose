import { HoldButton } from "onpurpose";
import { useState } from "react";

export function ProjectRow() {
  const [opened, setOpened] = useState(false);
  const [removed, setRemoved] = useState(false);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: row receives the bubbled click
    // biome-ignore lint/a11y/useKeyWithClickEvents: the remove button is the keyboard control
    <div
      className="row"
      onClick={() => {
        if (!removed) setOpened(true);
      }}
    >
      <div>
        <p className="row-title">Northwind</p>
        <p className="row-meta">
          {removed
            ? "Removed. The row didn't open."
            : opened
              ? "Opened. A short click still hits the row."
              : "12 files, shared with 4 people"}
        </p>
      </div>
      <HoldButton disabled={removed} onConfirm={() => setRemoved(true)}>
        {(state) => (removed || state === "confirmed" ? "Removed" : "Remove Northwind")}
      </HoldButton>
    </div>
  );
}
