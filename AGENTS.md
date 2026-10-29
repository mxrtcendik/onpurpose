# Build: a hold-to-confirm React button, published to npm

You are building a small, open-source React component and its docs site. I'm a design engineer. The component is part of my portfolio, so the quality bar is "a senior design engineer would ship this." Small surface, great defaults, every edge case handled.

Work in phases. **Stop at the end of each phase**, summarize what you did, list any decisions you made that I didn't specify, and wait for me to say "continue." Don't start the next phase on your own.

## The component

A `<button>` that fires `onConfirm` only after it has been held down for a fixed time. While it's held, a fill reveals across the button from left to right. If it's released early, the fill retracts and nothing happens. It's meant for destructive or irreversible actions (delete, revoke, publish) as an alternative to a confirm dialog.

Usage should be this, with nothing else required. No provider, no CSS import, no setup:

```tsx
import { HoldButton } from "onpurpose";

<HoldButton onConfirm={() => deleteProject()}>Hold to delete</HoldButton>
```

### Philosophy (this decides every tie)

- **The default is the product.** Most people will never pass a prop beyond `onConfirm`. The default timing, easing, and styling must be right out of the box.
- **No timing or easing props.** No `duration`, `easing`, `fillColor` or `variant`. Timing belongs to the component. Users restyle with CSS (className / CSS variables / `data-state`), not props.
- **One curve.** Use `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out) for everything that isn't the hold progress itself.
- **Don't fight the host page.** The default look inherits `font`, `color` and `border-radius` from context where possible, and builds its fill from `currentColor` with `color-mix()`, so it fits in light and dark themes without configuration.

### API (exactly this, do not add more)

```ts
type HoldButtonState = "idle" | "holding" | "confirmed";

type HoldButtonProps = Omit<React.ComponentPropsWithRef<"button">, "children" | "onClick"> & {
  onConfirm: () => void;
  children: React.ReactNode | ((state: HoldButtonState) => React.ReactNode);
};
```

- All other native button props are spread onto the `<button>`. `type` defaults to `"button"`.
- If the user passes `onPointerDown`, `onKeyDown`, etc., call theirs too (compose handlers; theirs runs first, and respect `event.defaultPrevented`).
- The ref reaches the real `<button>`.
- `disabled` works like a normal disabled button and cancels an in-progress hold.
- The root element gets `data-state="idle" | "holding" | "confirmed"` for styling.
- `children` as a function lets the label change, e.g. `{(s) => s === "confirmed" ? "Deleted" : "Hold to delete"}`.

### Motion spec

- **Hold duration:** one internal constant, 1500ms. It's not exported or configurable.
- **Fill:** an absolutely positioned layer that is always painted at full size. Progress is `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`, linear over the hold duration (linear because it's honest progress). **Never animate `width`.** Only `clip-path`, `transform` and `opacity` may animate.
- **Early release:** the fill retracts over 200ms with the ease-out curve. It retracts from wherever it currently is, without jumping to full first.
- **Press feedback:** the button scales to `0.97` over 160ms ease-out while held. Scale and fill are separate: the scale is feedback, the fill is the decision.
- **Confirm:** call `onConfirm` exactly once, when the timer completes. Drive completion from a JS timer started on press, never from `transitionend` (unreliable, and it may not fire under reduced motion). Keep the CSS transition duration and the timer sourced from the same constant. After confirming, the fill stays full while the button is still held. On release it returns to idle (state `confirmed` lasts until release, or ~1s if released instantly, your call; tell me what you picked).
- **Reduced motion** (`prefers-reduced-motion: reduce`): remove the scale. **Keep the linear fill**, because it is the progress readout and removing it would leave the user guessing. Make the early-release retract instant. Removing motion must never remove information: the `confirmed` state still has to be clearly visible (color/label), not just an animation.

### Input handling (this is where the quality is)

Pointer:
- Start only on a primary press (`event.button === 0`, `isPrimary`). Track the active `pointerId` and **ignore any second pointer/finger**.
- `setPointerCapture` on press so a release is always received.
- If the pointer moves outside the button's bounds, cancel (same as a native button, where dragging off is the escape hatch). Releasing outside never confirms.
- `pointercancel` cancels.
- On touch: no long-press context menu, callout, text selection or magnifier during the hold (`contextmenu` preventDefault while holding; `-webkit-touch-callout: none`; `user-select: none`; `touch-action: manipulation`).

Keyboard:
- Holding `Space` or `Enter` holds the button. Ignore `event.repeat`. `keyup` of that key releases.
- Losing focus cancels.

Page:
- `visibilitychange` to hidden, or window `blur`, cancels an in-progress hold. A hold must never complete while the user isn't looking.
- Unmounting mid-hold clears all timers and listeners. `onConfirm` must never fire after unmount.

Accessibility:
- It's a real `<button>` with a visible `:focus-visible` ring.
- It has an accessible description ("Press and hold to confirm") via a visually hidden element and `aria-describedby`. Respect a user-supplied `aria-describedby` by merging the ids.
- Announce confirmation through a polite live region.
- Touch target is at least 44px tall on coarse pointers (`@media (pointer: coarse)`). Extend the hit area with a pseudo-element if the visual size is smaller, rather than changing the visual size.
- **Screen readers:** a plain screen-reader "activate" usually fires a synthetic `click` with no pointerdown/keydown (`event.detail === 0` and no hold in progress). Research how VoiceOver (iOS/macOS), NVDA, JAWS and TalkBack activate buttons, then propose how the component should handle this. Don't silently pick one. Put the options and your recommendation in the Phase 2 summary for me to decide. Whatever we choose gets documented honestly on the docs page.

### Styling delivery

- Zero-config: the component's base CSS is injected once into `document.head` at runtime, with a stable id and deduped across instances and multiple copies of the package. It must be SSR-safe and must not cause a hydration mismatch.
- Wrap base styles in `@layer` (e.g. `@layer hold-button`) so any user CSS/Tailwind class wins without `!important`.
- Expose a few CSS custom properties for restyling (e.g. `--hold-fill`). That's the theming API; keep the list short and document it.
- Must work in Next.js App Router: the built output starts with `"use client"`.

### Package constraints

- TypeScript, strict. Zero runtime dependencies. `react` and `react-dom` are peer deps; support React 18 and 19.
- ESM output with type declarations. Tree-shakeable, `sideEffects: false`.
- Size budget: under 2 kB min+gzip. Enforce it in CI with a size-limit check.
- No animation libraries (no Motion/Framer, no GSAP). CSS transitions plus a timer is enough.
- **Before choosing tooling, check current docs/versions** for the bundler (e.g. tsup vs tsdown), Vitest, Playwright, pnpm and Changesets. Don't rely on memory, and use current stable versions.

## Repo layout

pnpm workspace:

```
/packages/onpurpose   the component
/apps/docs                 docs site
```

Plus `README.md`, MIT `LICENSE`, `.github/workflows` (CI: typecheck, lint, test, size; release via Changesets with npm provenance).

## Phases

**Phase 0: Plan (no code).**
- Propose 6 package names with a point of view: short, memorable, not just "react-hold-button". Check which are free on npm (`npm view <name>` 404 = free). I'll pick one.
- List the tooling you'll use with current versions.
- Restate the edge cases above in your own words, and list any you think are missing.

**Phase 1: Scaffold.** Workspace, package build, docs app shell, lint/format, CI. `pnpm build` and `pnpm test` pass on an empty component.

**Phase 2: Core component plus tests.**
- Vitest + Testing Library + fake timers. Cover: confirm after full hold; no confirm on early release; confirm fires exactly once; second pointer ignored; pointer leaving the bounds cancels; keyboard hold incl. `repeat` ignored; blur/visibility cancel; disabled; unmount mid-hold; handler composition; ref forwarding; `data-state` transitions; children as a function.
- Include the screen reader research and options in your summary.

**Phase 3: Real-browser checks.** Playwright against the docs page: mouse hold, touch hold (mobile emulation), keyboard hold, reduced-motion emulation, light and dark. Verify that no layout properties animate (only `clip-path`/`transform`/`opacity`).

**Phase 4: Docs site.** One page. The first thing on it is the real button you can press, with the code right next to it. A screenshot is a claim, the button is the component. Sections:
1. Live demo + the 2-line usage.
2. Install.
3. Examples: label via children function, restyle with CSS variables, a Tailwind example.
4. "What it handles": a plain list of the invisible details (second finger ignored, cancels when the tab is hidden, etc.). This is the selling point.
5. Accessibility, including the screen reader decision and its limits.

Minimal and typographic. Light/dark following the system. Fast. It must work at 375px width. Deployable to Cloudflare (static output is fine).

**Phase 5: Release prep.** README mirroring the docs, Changesets config, publish workflow with provenance, `package.json` fields (`exports`, `files`, `repository`, `keywords`), a 0.1.0 changeset. Don't publish; I'll do that.

## Rules

- Don't add props, features or dependencies beyond this spec. If you think something is missing, propose it in your phase summary instead of building it.
- Don't mark anything done that you haven't run. Show test/build output in your summary.
- Prefer deleting code to adding config.
