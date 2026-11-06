import { type CSSProperties, useInsertionEffect, version } from "react";
import { EASE, HOLD_MS, PRESS_MS, RETRACT_MS, TARGET_PX } from "./constants";

const CSS = `
@layer theme, base, components, utilities;

@layer components.hold-button {
  .onpurpose {
    --e: ${EASE};
    --r: ${RETRACT_MS}ms;
    position: relative;
    display: inline-flex;
    appearance: none;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    border-radius: 0.5em;
    touch-action: manipulation;
    user-select: none;
    -webkit-touch-callout: none;
    isolation: isolate;
  }

  .onpurpose::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--hold-confirmed, currentColor);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--r) var(--e);
  }

  .onpurpose[data-state="confirmed"]::after {
    opacity: 1;
    transition: none;
  }

  .onpurpose:disabled {
    opacity: 0.4;
  }

  .onpurpose:focus {
    outline: none;
  }

  .onpurpose:focus-visible {
    outline: 2px solid;
    outline-offset: 2px;
  }

  .onpurpose-frame {
    position: relative;
    display: inline-flex;
    overflow: hidden;
    border: 1px solid;
    border-radius: inherit;
    padding: 0.5em 0.9em;
    transition: transform ${PRESS_MS}ms var(--e);
  }

  .onpurpose[data-state="holding"] .onpurpose-frame {
    transform: scale(0.97);
  }

  .onpurpose[data-state="confirmed"] .onpurpose-frame {
    color: var(--hold-confirmed-text, Canvas);
    border-color: transparent;
  }

  @supports (color: oklch(from red l c h)) {
    .onpurpose[data-state="confirmed"] .onpurpose-frame {
      color: var(
        --hold-confirmed-text,
        oklch(from var(--hold-confirmed, currentColor) clamp(0, (0.6 - l) * 1000, 1) 0 0)
      );
    }
  }

  .onpurpose-fill {
    position: absolute;
    inset: 0;
    background: var(--hold-fill, color-mix(in srgb, currentColor 16%, transparent));
    clip-path: inset(0 100% 0 0);
    transition: clip-path var(--r) var(--e);
  }

  .onpurpose[data-state="holding"] .onpurpose-fill {
    clip-path: inset(0);
    transition: clip-path ${HOLD_MS}ms linear;
  }

  .onpurpose[data-state="confirmed"] .onpurpose-fill {
    clip-path: inset(0);
    opacity: 0;
    transition: none;
  }

  @media (pointer: coarse) {
    .onpurpose::before {
      content: "";
      position: absolute;
      inset-block: min(0px, calc((100% - ${TARGET_PX}px) / 2));
      inset-inline: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .onpurpose {
      --r: 0s;
    }

    .onpurpose[data-state="holding"] .onpurpose-frame {
      transform: none;
      transition: none;
    }
  }

  @media (prefers-contrast: more) {
    .onpurpose {
      --hold-fill: color-mix(in srgb, currentColor 40%, transparent);
    }
  }

  @media (forced-colors: active) {
    .onpurpose-fill {
      background: Highlight;
    }

    .onpurpose::after {
      background: Highlight;
    }

    .onpurpose[data-state="confirmed"] .onpurpose-frame {
      color: HighlightText;
    }
  }
}
`.trim();

function hash(text: string) {
  let value = 5381;
  for (let i = 0; i < text.length; i++) value = (value * 33) ^ text.charCodeAt(i);
  return (value >>> 0).toString(36);
}

const STYLE_KEY = `onpurpose-${hash(CSS)}`;

export const SR_ONLY: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};

const HOISTS_STYLES = !version.startsWith("18.");

export function HoldButtonStyles() {
  useInsertionEffect(() => {
    if (HOISTS_STYLES || document.querySelector(`style[data-onpurpose="${STYLE_KEY}"]`)) return;
    const style = document.createElement("style");
    style.dataset.onpurpose = STYLE_KEY;
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);

  return HOISTS_STYLES ? (
    <style href={STYLE_KEY} precedence="onpurpose">
      {CSS}
    </style>
  ) : null;
}
