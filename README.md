# onpurpose

A hold-to-confirm button for React, for the actions you don't want on a misclick: delete, publish, revoke, send. Hold it for 1.5 seconds and the action runs. Let go early, or just click, and nothing happens.

Live demo and docs: https://onpurpose.cendik.dev

```tsx
import { HoldButton } from "onpurpose";

<HoldButton onConfirm={() => deleteProject()}>Hold to delete</HoldButton>;
```

## Install

```sh
npm install onpurpose
```

Works with React 18.3 and 19. There's no provider and no stylesheet to import. The button picks up the font and color of the page it's on.

## Guide

### Pass the action

`onConfirm` runs once, when the hold completes. The children are the label.

The hold takes 1.5 seconds, and that isn't configurable. The fill crosses the button in exactly that time, so you can see how close you are. Let go early and the fill eases back over 200ms without running anything. While you press, the button settles in slightly.

The button never submits or resets a form, even with `type="submit"`. If sending the form is the action, do it in `onConfirm`, for example with `form.requestSubmit()`.

### Change the label

Pass a function as `children` when the words should follow the hold. It receives `"idle"`, `"holding"` or `"confirmed"`.

```tsx
<HoldButton onConfirm={() => publish()}>
  {(state) => (state === "confirmed" ? "Published" : "Hold to publish")}
</HoldButton>;
```

`confirmed` lasts while you keep holding, and for a moment after you let go.

### Wait for a request

If the action is a request, return its promise. Until it settles, the button stays confirmed, sets `aria-busy`, and won't start another hold. The label function's second argument tells you when it's busy.

```tsx
<HoldButton onConfirm={() => archiveProject()}>
  {(state, { busy }) =>
    busy ? "Archiving…" : state === "confirmed" ? "Archived" : "Hold to archive"
  }
</HoldButton>;
```

If the promise rejects, the button returns to idle and the error is rethrown, so your own error handling still sees it.

### Restyle it

Font and color come from the page, so light and dark themes usually work as they are. Three custom properties cover the hold itself:

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

`className` goes on the `<button>`. The built-in styles live in `@layer components`, the layer Tailwind uses for components, so your classes and Tailwind utilities override them, and Tailwind's reset leaves the button intact.

```tsx
<HoldButton
  className="rounded-full text-red-700 dark:text-red-300"
  onConfirm={() => revokeAccess()}
>
  Hold to revoke
</HoldButton>;
```

### Put it where the damage happens

Put the button at the end of the row it removes. A click on the row can still open the project. A completed hold doesn't also open it.

```tsx
<div className="row" onClick={openProject}>
  <div>
    <p>Northwind</p>
    <p>12 files, shared with 4 people</p>
  </div>
  <HoldButton onConfirm={removeProject}>Remove Northwind</HoldButton>
</div>;
```

## API

### Props

| Prop        | Type                                            |                                                                                        |
| ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `onConfirm` | `() => unknown`                                 | Runs when a hold completes. Return a promise to keep the button busy until it settles. |
| `children`  | `ReactNode` or `(state, { busy }) => ReactNode` | The label.                                                                             |
| `messages`  | `{ hint?, confirmed?, again? }`                 | Screen reader text. See [Accessibility](#accessibility).                               |

Every other `<button>` prop is passed through, and `type` defaults to `"button"`. `onClick` is left out on purpose, because a click isn't the action. If you pass a handler the button also uses, like `onPointerDown` or `onKeyDown`, yours runs first, and calling `preventDefault` stops the hold from starting. `ref` points at the `<button>`.

### CSS custom properties

| Property                | Default                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `--hold-fill`           | The text color at 16%. The wash that shows progress.                                                         |
| `--hold-confirmed`      | The text color. The solid color when a hold completes. It fades out when you let go.                         |
| `--hold-confirmed-text` | White or black, whichever reads better on `--hold-confirmed`. Browsers without relative colors use `Canvas`. |

Corners are `0.5em` until a class changes them.

### Data attributes

`data-state` is `"idle"`, `"holding"` or `"confirmed"`. `data-disabled` is set while the button is disabled. While a returned promise is pending, the button has `aria-busy="true"`.

## What it handles

### Pointer

- Only the main pointer starts a hold: a left click, or one finger. A second finger is ignored, even when it lifts.
- The pointer is captured, so letting go still counts after your finger slides off.
- Dragging off the button cancels the hold. Sliding back on doesn't resume it, and releasing outside never confirms.
- A finger gets a few pixels of slack, and the whole 44px touch area counts as the button, so a steady thumb near the edge doesn't cancel.
- A cancelled pointer, or another gesture taking over, cancels the hold.
- Scrolling the button out from under your finger cancels the hold.
- On a phone, the long-press menu, text selection and magnifier stay out of the way.
- On Android, a touch hold that confirms gives a short buzz. iPhones don't let websites do that.

### Keyboard

- Hold Space or Enter. Key repeat doesn't restart the timer, and releasing a different key doesn't stop it.
- Escape cancels a hold, from the keyboard or a pointer. Releasing the key afterwards does nothing.
- Shortcuts like Ctrl+Enter or Cmd+Enter neither start a hold nor click the button.
- Moving focus away cancels a keyboard hold. A mouse hold keeps going, because Safari takes focus off a button as you press it.

### Page

- Switching tabs or windows cancels an unfinished hold. It never completes in the background.
- `disabled` cancels a hold in progress, and a disabled button can't start one.
- A short press still clicks, and the click bubbles. After a completed hold, the click is stopped, so no listener above it runs, React or not.
- It never submits or resets its form, even with `type="submit"`.
- If the button unmounts mid-hold, nothing runs afterwards.
- With reduced motion, the button doesn't shrink and an early release snaps back. The fill still moves, because it's how you can tell the hold is working.

## Accessibility

It's a real `<button>` with a visible focus ring. Its name is the label, unless you pass `aria-label` or `aria-labelledby`. A hidden hint, "Press and hold to confirm", is attached with `aria-describedby`, after any ids you pass. When a hold completes, a live region right after the button announces "Confirmed". The announcement stands even if the button is disabled the moment it confirms.

All three phrases are English until you pass `messages`. Anything you leave out stays English.

```tsx
<HoldButton
  messages={{
    hint: "Mantén pulsado para confirmar",
    confirmed: "Eliminado",
    again: "Actívalo otra vez para confirmar",
  }}
  onConfirm={() => deleteProject()}
>
  Mantén para eliminar
</HoldButton>;
```

On touch screens the tap target is at least 44px tall, without making the button bigger. In forced colors mode, the fill and the confirmed state use `Highlight`, since a faint wash could disappear. When someone asks for more contrast, the fill gets stronger.

### Screen readers

Screen readers usually activate a button with a single click, not a 1.5 second hold. So a click that comes without a press on the button is treated as deliberate. The first one arms the button and announces "Activate again to confirm". A second one within 10 seconds confirms. Moving focus away, or waiting longer, starts over.

Mouse clicks and taps always come with a press, so they never arm the button. A double-click or double-tap still can't delete anything. Code that calls `button.click()` twice goes down the same path as a screen reader.

- NVDA and JAWS in browse mode, and VoiceOver on macOS with VO+Space, send a plain click: activate twice to confirm. In focus or pass-through mode, holding Space or Enter works as it does for everyone.
- VoiceOver on iOS and TalkBack may send a double-tap as a short tap, which doesn't arm the button. Double-tap and hold passes a real hold through, and that confirms.
- This was tested with the events browsers receive, not with every screen reader and browser pairing. If one behaves differently, please open an issue.

## Server rendering

On React 19 the styles render with the page, so a server-rendered button, including in the Next.js App Router, is styled before any JavaScript runs. On React 18 they're added when the first button mounts, so until then it looks like a plain button. The hidden screen reader text never shows either way.

The styles arrive as a `<style>` element, and server-rendered markup hides the screen reader text with inline `style` attributes. A strict Content Security Policy has to allow inline styles (`style-src 'unsafe-inline'`). Without that, the button still works but looks like a plain browser button.

## Development

This is a bun workspace. The component is in `packages/onpurpose` and the docs site in `apps/docs`.

| Command             |                                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| `bun install`       | Install dependencies.                                                        |
| `bun run dev`       | Start the docs site.                                                         |
| `bun run test`      | Run the unit tests.                                                          |
| `bun run test:e2e`  | Run the browser tests against the docs site in Chromium, Firefox and WebKit. |
| `bun run lint`      | Lint and check formatting.                                                   |
| `bun run typecheck` | Type-check every workspace.                                                  |
| `bun run build`     | Build the package and the docs site.                                         |
| `bun run size`      | Check the gzip budget.                                                       |
| `bun run publint`   | Check the published package.                                                 |
| `bun run attw`      | Check that the types resolve.                                                |

Releases go out through Changesets and the Release workflow, which publishes with npm provenance.

## License

[MIT](https://github.com/mxrtcendik/onpurpose/blob/main/LICENSE). Copyright Mert Cendik.
