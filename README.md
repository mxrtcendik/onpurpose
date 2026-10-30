# onpurpose

A hold-to-confirm button for React. For delete, publish, revoke, send — anything you don't want on a misclick. Hold it for 1.5 seconds and the action runs. Let go early, or just click, and nothing happens.

Docs: https://onpurpose.cendik.dev/

```tsx
import { HoldButton } from "onpurpose";

<HoldButton onConfirm={() => deleteProject()}>Hold to delete</HoldButton>;
```

## Install

```sh
npm install onpurpose
```

React 18.3 and 19. No provider, and no stylesheet to import. It picks up the font and color of the page it's on.

## Use it

### 1. Pass the action

`onConfirm` runs once, at the end of the hold. The words inside the button are the label. `type` is `"button"`, so it won't submit a form you drop it into.

The hold is 1.5 seconds, and that time isn't a prop. The fill crosses the button over those same 1.5 seconds, so you can see how close you are. Let go and it eases back over 200ms. `onConfirm` doesn't run. While you're pressing, the button scales to `0.97`.

`onConfirm` returns right away. If the work is a request, the button is idle again while that request is still going, and someone can hold it a second time. Disable it yourself until the request finishes.

### 2. Change the label as the hold progresses

`children` can be a function when the words should change as you hold. It receives `"idle"`, `"holding"`, or `"confirmed"`.

```tsx
<HoldButton onConfirm={() => publish()}>
  {(state) => (state === "confirmed" ? "Published" : "Hold to publish")}
</HoldButton>;
```

`confirmed` stays while you're still holding, then for a moment after you let go, and the button returns to `idle`.

### 3. Restyle with CSS

Font and color come from the page, so light and dark usually just work. Two custom properties cover the hold itself:

- `--hold-fill` is the wash that reveals the progress. The default is the current text color mixed to 16% opacity.
- `--hold-confirmed` is the solid color once the hold completes. The default is the current text color, and the label switches to the page background.

The corner radius is `0.5em` until a class replaces it.

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

`className` goes on the button. The built-in CSS sits in `@layer hold-button`, so your classes win, Tailwind included.

```tsx
<HoldButton
  className="rounded-full text-red-700 dark:text-red-300"
  onConfirm={() => revokeAccess()}
>
  Hold to revoke
</HoldButton>;
```

`data-state` is `"idle"`, `"holding"`, or `"confirmed"` if you want to style each phase yourself. `data-disabled` is set while the button is disabled.

Put the button at the end of the row it will destroy. A click on that row can still do something else, like open the project. A finished hold does not.

```tsx
<div className="row" onClick={openProject}>
  <div>
    <p>Northwind</p>
    <p>12 files, shared with 4 people</p>
  </div>
  <HoldButton onConfirm={removeProject}>Remove Northwind</HoldButton>
</div>;
```

### 4. Keep your own event handlers

Other button props are passed through. `onClick` isn't one of them, since a click isn't the action.

If you pass `onPointerDown`, `onKeyDown`, or another handler the button uses, yours runs first. Call `preventDefault` and the hold never starts. A `ref` points at the real `<button>`.

## What it handles

### Pointer

- Only the main pointer starts a hold: left click, or one finger. A second finger is ignored, even when it lifts.
- The pointer is captured, so letting go still registers if your finger has slid off the button.
- Drag off the button and the hold cancels. Sliding back on does not resume it, and releasing outside never confirms.
- If the pointer is cancelled, or something else takes over the pointer, the hold cancels.
- On a phone, the long-press menu, text selection, and magnifier stay out of the way while you hold.
- Scroll the button out from under your finger and the hold cancels.

### Keyboard

- Hold Space or Enter. A key that is already down won't start the timer again, and releasing a different key won't stop it.

### Page

- Tab away, switch windows, or hide the tab, and an unfinished hold cancels. It won't finish in the background.
- `disabled` stops a hold that's already going, and a disabled button can't start one.
- A short press still clicks, and that click bubbles. It does not confirm. After a finished hold, letting go doesn't click, so a parent handler won't run as well.
- If the button unmounts mid-hold, the timer is cleared. `onConfirm` does not run after it's gone.
- With reduced motion, the button doesn't shrink and an early release snaps back. The fill still moves, because that's how you can tell the hold is working.

## Accessibility

It's a normal `<button>`, with a focus ring you can see. The name is the label. Pass `aria-label` or `aria-labelledby` if the name should be something else. A hidden note, "Press and hold to confirm", is attached with `aria-describedby`. Pass your own and your ids come first. When the hold finishes, a live region says "Confirmed". That note, and the word "Confirmed", are English. There isn't a prop to change them.

On a touch screen the tappable area is at least 44px tall. The button doesn't grow to get there.

A faint wash can disappear in forced colors, so the fill and the confirmed state use `Highlight`. If the person has asked for more contrast, the fill gets stronger too.

Screen readers activate a button with a click. They don't hold it for 1.5 seconds, and this button won't treat that click as a confirm. A double-tap can't delete anything. Space and Enter only confirm when those keys actually reach the page.

- macOS VoiceOver: VO+Space is a click, so it doesn't confirm. Holding a real key can still get through in Safari, and that does.
- iOS VoiceOver and TalkBack: a double-tap is a click or a short tap. It doesn't confirm.
- NVDA and JAWS in browse mode: Enter usually arrives as a click, not a held key. Chrome can't tell that click from a mouse click, so it doesn't confirm. Pass-through mode can send a real key hold, and that does.

## Development

The repo is a pnpm workspace. The component lives in `packages/onpurpose`. The docs site lives in `apps/docs`.

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
pnpm attw
```

`pnpm dev` starts the docs site. `pnpm test` is the unit suite. `pnpm test:e2e` runs the browser checks against that page. `pnpm size` enforces the gzip budget. `pnpm publint` and `pnpm attw` check the package that gets published.

Releases go out through Changesets and the Release workflow. That workflow publishes with npm provenance once the package has a trusted publisher on npm.

## License

[MIT](https://github.com/mxrtcendik/onpurpose/blob/main/LICENSE). Copyright Mert Cendik.
