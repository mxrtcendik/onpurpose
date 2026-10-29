# onpurpose

A button for actions you should not be able to do by accident. The action runs only if the hold finishes.

```tsx
import { HoldButton } from "onpurpose";

<HoldButton onConfirm={() => deleteProject()}>Hold to delete</HoldButton>;
```

## Install

```sh
npm install onpurpose
```

React 18.3 or 19. No provider, and no stylesheet to import.

## Examples

Children can be a function of the state: `idle`, `holding`, or `confirmed`.

```tsx
<HoldButton onConfirm={() => publish()}>
  {(state) => (state === "confirmed" ? "Published" : "Hold to publish")}
</HoldButton>;
```

`--hold-fill` is the progress wash. `--hold-confirmed` is the solid color after the hold completes. Color and font are inherited. The radius is `0.5em` unless a class replaces it.

```css
.send {
  color: light-dark(#087443, #8dcfb0);
  --hold-fill: color-mix(in srgb, currentColor 28%, transparent);
  --hold-confirmed: light-dark(#087443, #8dcfb0);
}
```

```tsx
<HoldButton className="send" onConfirm={() => send()}>
  Hold to send
</HoldButton>;
```

Pass utilities through `className`. The component's styles sit in `@layer hold-button`, so those classes win.

```tsx
<HoldButton
  className="rounded-full font-medium text-red-700 dark:text-red-300"
  onConfirm={() => revokeAccess()}
>
  Hold to revoke
</HoldButton>;
```

`data-state` is `idle`, `holding`, or `confirmed`.

## What it handles

Pointer:

- Only the primary pointer can start a hold. A second finger is ignored, including its release.
- The pointer is captured, so a release is still received if it lands outside the button.
- Dragging off the button cancels the hold. Dragging back does not resume it. Releasing outside never confirms.
- A cancelled pointer, or losing pointer capture, cancels the hold.
- On touch, the long-press callout, text selection, and magnifier stay off during the hold.
- A scroll that carries the button off the pointer cancels the hold.

Keyboard:

- Space and Enter hold. Key repeat is ignored. Only the key that started the hold can end it.

Page:

- Blur, the window losing focus, or the tab being hidden cancels an in-progress hold.
- `disabled` cancels a hold and cannot start one.
- Handlers you pass run first. If they call `preventDefault`, the hold does not start.
- A short press still fires a click. That click does not confirm, and it bubbles.
- `type` defaults to `button`, so the hold does not submit a form.
- Unmounting during a hold clears the timer. `onConfirm` does not run after the button is gone.
- The hold takes 1.5 seconds. The fill moves linearly across that same time. Letting go early retracts it, and nothing runs.
- After confirming, the button stays inverted while you are still holding, then for a moment after you let go.
- Reduced motion removes the press scale and makes the retract instant. The fill still moves, and the confirmed colors stay.

## Accessibility

It is a real button, with a visible focus ring. The accessible name is the visible label. A hidden description, "Press and hold to confirm", is attached with `aria-describedby`. If you pass your own `aria-describedby`, your ids come first. When the hold completes, a polite live region says "Confirmed".

On a coarse pointer the hit area grows until it is at least 44px tall. The visual size of the button stays the same.

In forced colors the fill and the confirmed state use `Highlight`, so the progress stays visible when a translucent wash would disappear. Stronger contrast also deepens the fill.

A plain screen reader activate is a click, not a 1.5 second hold. This button does not confirm on that click. Space or Enter confirm only when those keys actually reach the page. A tap still cannot delete anything.

- macOS VoiceOver: VO+Space clicks, so it does not confirm. A physical key held down can still send key events in Safari, and those do confirm.
- iOS VoiceOver and TalkBack: a double-tap fires a click or a short tap. It does not confirm.
- NVDA and JAWS in browse mode: Enter usually arrives as a click, not a key. On Chrome that click cannot be distinguished from a real mouse click, so it does not confirm. Pass-through can deliver a real key hold, which does confirm.

## Development

```sh
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm size
pnpm publint
```

`pnpm test` is the unit suite. `pnpm test:e2e` runs the browser checks against the docs page. Releasing is `changeset` plus the Release workflow. It publishes with npm provenance once the package has a trusted publisher on npm. Do not publish by hand from a laptop.

## License

[MIT](https://github.com/mxrtcendik/onpurpose/blob/main/LICENSE). Copyright Mert Cendik.
