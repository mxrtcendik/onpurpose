# onpurpose

## 0.3.0

### Minor Changes

- 241ba2c: `onConfirm` can return a promise. Until it settles, the button stays confirmed, sets `aria-busy` and won't start another hold. If it rejects, the button returns to idle and the error is rethrown. The label function receives `{ busy }` as a second argument.
- 3323991: The confirmed label turns white or black, whichever reads better on `--hold-confirmed`, so it stays readable on any page. Set it yourself with the new `--hold-confirmed-text`. On release, the confirmed color fades out instead of the fill sliding back.
- 29cfb7f: A touch hold that confirms gives a short vibration where the browser supports it, which in practice means Android.
- a60b6f3: New `messages` prop to translate the screen reader text. The live region now sits right after the button instead of inside it, so it's announced reliably, and the announcement survives the button being disabled as it confirms.
- 6298fe8: Screen reader users can confirm with two activations. A click that comes without a press arms the button and announces `messages.again`, and a second one within 10 seconds confirms. Mouse clicks, taps and key presses never arm it.

### Patch Changes

- f6c2a1c: Escape cancels a hold in progress. Ctrl, Alt or Cmd with Enter or Space no longer starts a hold or clicks the button.
- 018e304: The click after a completed hold is stopped before any ancestor sees it, including native `addEventListener` listeners, not just React handlers.
- ad3e4a2: The package no longer ships sourcemaps. They pointed at source files that weren't published.
- 8f67e70: A quick click no longer submits or resets a form when the button has `type="submit"` or `type="reset"`.
- adedcf4: In Safari, a mouse hold on a button that already had focus no longer cancels the moment it starts. Only keyboard holds cancel when focus leaves.
- 8ca0c80: On React 19 the styles render with the page, so server-rendered buttons are styled before hydration. The hidden screen reader text stays hidden before any CSS loads, and a page element with `id="onpurpose"` no longer blocks the styles.
- 8eec731: The built-in styles moved to `@layer components.hold-button`, so Tailwind utilities override them and Tailwind's reset no longer flattens the button. A `@layer hold-button` ordering line in your own CSS no longer has any effect.
- 787c5bf: A touch hold that starts in the extra 44px touch area no longer cancels on the first tiny movement, and fingers get a few pixels of slack before a hold cancels.

## 0.2.1

### Patch Changes

- 772da32: Point the package homepage at onpurpose.cendik.dev.

## 0.2.0

### Minor Changes

- a57da64: First release of the hold-to-confirm button.

### Patch Changes

- 89eed4e: Keep the hold button's styles from colliding with the page, and stop a completed hold from also clicking its parent.
