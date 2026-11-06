# onpurpose: a hold-to-confirm button for React

This repo is a small, open-source React component, published to npm as `onpurpose`, and its docs site at https://onpurpose.cendik.dev. I'm a design engineer, and it's featured on my portfolio at https://cendik.dev/projects/onpurpose, so the bar is "a senior design engineer would ship this." Small surface, great defaults, every edge case handled.

## How to work with me

- When I ask for an audit or a plan, read the repo first, then propose small steps and wait for me to pick. Don't change code until I approve.
- For each approved step: make the change, run every check (see [Commands](#commands)), check visual or interaction changes in a real browser, then commit.
- Never commit with a failing check. Don't mark anything done that you haven't run, and show the output in your summary.
- Commit messages are short one-liners, written as if I wrote them. No `Co-Authored-By` or other attribution.
- Never push and never publish to npm. I do both.
- Every user-facing change gets a changeset in `.changeset/`. Tell me whether it's a patch, minor or major.
- Don't make breaking API changes without asking me first.
- Don't add props, features or dependencies without proposing them first. Prefer deleting code to adding config.
- No code comments, except functional ones: `"use client"`, `/// <reference>`, `biome-ignore`, bundler hints.
- At the end of a piece of work, list the decisions you made that I didn't specify.

## The component

A `<button>` that runs `onConfirm` only after it has been held for a fixed time. While it's held, a fill reveals across the button from left to right. Released early, the fill retracts and nothing happens. It's for destructive or irreversible actions (delete, revoke, publish) as an alternative to a confirm dialog.

Usage needs nothing else. No provider, no CSS import, no setup:

```tsx
import { HoldButton } from "onpurpose";

<HoldButton onConfirm={() => deleteProject()}>Hold to delete</HoldButton>;
```

### Philosophy (this decides every tie)

- **The default is the product.** Most people never pass a prop beyond `onConfirm`. Timing, easing and styling must be right out of the box.
- **No timing or easing props.** No `duration`, `easing`, `fillColor` or `variant`. Timing belongs to the component. People restyle with CSS (`className`, custom properties, `data-state`), not props.
- **One curve.** `cubic-bezier(0.23, 1, 0.32, 1)` for everything except the hold progress itself.
- **Don't fight the host page.** Inherit `font` and `color`, build the fill from `currentColor` with `color-mix()`, and fit light and dark themes without configuration.

### API

```ts
type HoldButtonState = "idle" | "holding" | "confirmed";

type HoldButtonMessages = { hint?: string; confirmed?: string; again?: string };

type HoldButtonProps = Omit<React.ComponentPropsWithRef<"button">, "children" | "onClick"> & {
  onConfirm: () => unknown;
  children: React.ReactNode | ((state: HoldButtonState, info: { busy: boolean }) => React.ReactNode);
  messages?: HoldButtonMessages;
};
```

- Every other native button prop is spread onto the `<button>`. `type` defaults to `"button"`.
- Handlers the button also uses (`onPointerDown`, `onKeyDown` and so on) are composed: the caller's runs first, and `preventDefault` stops ours.
- The ref reaches the real `<button>`.
- `disabled` works like a normal disabled button and cancels a hold in progress.
- `data-state` is `idle`, `holding` or `confirmed`. `data-disabled` is set while disabled. `aria-busy` is set while a returned promise is pending.
- If `onConfirm` returns a promise, the button stays `confirmed` and busy until it settles and refuses new holds. A rejection returns it to idle and is rethrown.
- `messages` translates the screen reader text. Each one defaults to English.
- CSS custom properties are the theming API: `--hold-fill`, `--hold-confirmed`, `--hold-confirmed-text`. Keep the list short.

### Motion

- **Hold:** 1500ms, one internal constant, not exported or configurable. All timings live in `src/constants.ts`.
- **Fill:** an absolutely positioned layer, always painted at full size. Progress is `clip-path: inset(0 100% 0 0)` to `inset(0)`, linear, because it's honest progress. Only `clip-path`, `transform` and `opacity` may animate. Never `width`.
- **Early release:** the fill retracts from wherever it is, over 200ms with the curve.
- **Press feedback:** the face scales to `0.97` over 160ms while held. Scale is feedback, the fill is the decision.
- **Confirm:** `onConfirm` runs exactly once, from a JS timer started on press, never from `transitionend`. The confirmed color is its own layer. It appears at once, stays while held, and after release lasts 700ms, then fades out over 200ms. The fill resets without retracting.
- **Reduced motion:** no scale, instant retract, but keep the linear fill, because it's the progress readout. The confirmed state stays clearly visible.

### Input handling

Pointer:
- Only a primary press starts a hold. Track the `pointerId` and ignore any second pointer.
- Capture the pointer so a release is always received.
- Moving outside the bounds cancels. The bounds include the 44px coarse-pointer hit area, plus 8px of slack for touch and pen. Releasing outside never confirms.
- `pointercancel`, lost capture, and a scroll that moves the button off the pointer all cancel.
- On touch, no context menu, callout, text selection or magnifier during a hold.
- A touch or pen hold that confirms calls `navigator.vibrate(15)`, only after the page has had a user activation.

Keyboard:
- Holding Space or Enter holds. Ignore `repeat`. Only the key that started it releases it.
- Escape cancels a hold, from the keyboard or a pointer.
- Ctrl, Alt or Cmd with Enter or Space never starts a hold or clicks.
- Losing focus cancels keyboard holds only. Safari blurs a focused button when it's pressed, so pointer holds must survive blur.

Page:
- `visibilitychange` to hidden, or window `blur`, cancels. A hold never completes while nobody is looking.
- Unmounting clears every timer and listener. `onConfirm` never runs after unmount.
- The button never submits or resets a form, even with `type="submit"`.
- A short press still clicks, and the click bubbles. The click after a completed hold is stopped on the button itself, so no ancestor sees it, React or native.

Accessibility:
- A real `<button>` with a visible `:focus-visible` ring.
- A hidden hint ("Press and hold to confirm") via `aria-describedby`, merged after any ids the caller passes.
- Confirmation is announced from a polite live region rendered right after the button, not inside it. The announcement survives the button being disabled as it confirms.
- Touch target at least 44px tall on coarse pointers, using a pseudo-element, without changing the visual size.
- **Screen readers (decided):** a click with no `pointerup` on the button in the last second is treated as assistive or programmatic. The first one arms the button and announces `messages.again`. A second within 10 seconds confirms. Blur, a new press, `disabled` or the timeout disarms it. Mouse clicks, taps and key presses never arm. The docs say plainly that this was tested with browser events, not with every screen reader.
- Forced colors use `Highlight`. `prefers-contrast: more` strengthens the fill.

### Styling delivery

- Zero config. On React 19 the stylesheet renders as a hoisted `<style href precedence>`, so server-rendered pages are styled before hydration. On React 18 it's injected once into `document.head` at mount. Either way it's deduped by a hash of the CSS, never by an element id.
- The hidden hint and live region carry inline hiding styles, so they never show before CSS loads.
- Styles live in `@layer components.hold-button`, after an `@layer theme, base, components, utilities;` statement. Tailwind utilities and plain classes win, and Tailwind's base reset doesn't flatten the button.
- The confirmed label picks white or black from the confirmed color's lightness (relative color syntax), and falls back to `Canvas`.
- The built output starts with `"use client"`.

### Package constraints

- TypeScript, strict. Zero runtime dependencies. `react` and `react-dom` are peer dependencies, React 18.3 and 19.
- ESM only, with type declarations. `sideEffects: false`. No sourcemaps in the package.
- Size budget: 3.75 kB min+gzip, enforced by size-limit in CI. Don't raise it without asking.
- No animation libraries. CSS transitions and a timer are enough.
- Check current docs and versions before adding or changing tooling. Use current stable versions.

## Repo layout

A bun workspace:

```
packages/onpurpose/
  src/         the component: hold-button.tsx, use-hold-button.ts, styles.tsx, constants.ts, index.ts
  test/        Vitest + Testing Library + fake timers, one file per topic, plus helpers.tsx and setup.ts
  scripts/     check-entry.js, run after every build
apps/docs/
  src/         the one-page docs site: app.tsx, components/, examples.ts, handled.ts, styles.css
  e2e/         Playwright specs per topic, plus helpers.ts. They run in Chromium, Firefox and WebKit
  public/      favicon and social preview image
.changeset/    pending release notes
.github/       CI (checks, e2e in three browsers, a React 18 unit run) and the Changesets release
```

The docs site imports the package source directly, so the browser tests exercise the real component. It uses real Tailwind, so the Tailwind example on the page is honest. `README.md` and `packages/onpurpose/README.md` must stay identical, and CI checks that they do.

## Commands

| Command | |
| --- | --- |
| `bun install` | Install dependencies. |
| `bun run dev` | Start the docs site. |
| `bun run lint` | Lint and check formatting (Biome). |
| `bun run typecheck` | Type-check every workspace. |
| `bun run test` | Run the unit tests. |
| `bun run build` | Build the package and the docs site. |
| `bun run size` | Check the size budget. |
| `bun run publint` | Check the package that gets published. |
| `bun run attw` | Check that the types resolve. |
| `bun run test:e2e` | Run the browser tests in Chromium, Firefox and WebKit. |

All of these must pass before a commit.

## The docs site

One page. The first thing on it is the real button you can press, with the code right next to it: a screenshot is a claim, the button is the component. Then install, a guide, the API, "What it handles" (the invisible details are the selling point), accessibility including the screen reader decision and its limits, and server rendering. Minimal and typographic, light and dark following the system, works at 375px, and deploys to Cloudflare as static files. The README mirrors it.
