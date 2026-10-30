import { useInsertionEffect } from "react";

export const HOLD_MS = 1500;

const RETRACT_MS = 200;
const PRESS_MS = 160;
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const STYLE_ID = "onpurpose";

const CSS = `
@layer hold-button {
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

  .onpurpose[data-state="confirmed"] {
    background: var(--hold-confirmed, currentColor);
  }

  .onpurpose[data-state="confirmed"] .onpurpose-frame {
    color: Canvas;
    background: 0;
    border-color: transparent;
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

  .onpurpose-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  @media (pointer: coarse) {
    .onpurpose::before {
      content: "";
      position: absolute;
      inset-block: min(0px, calc((100% - 44px) / 2));
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

    .onpurpose[data-state="confirmed"] {
      background: Highlight;
    }

    .onpurpose[data-state="confirmed"] .onpurpose-frame {
      color: HighlightText;
    }
  }
}
`.trim();

export function useHoldButtonStyles() {
  useInsertionEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);
}
