---
"onpurpose": minor
---

When `onConfirm` returns a promise, keep the button confirmed and `aria-busy` until it settles and block new holds meanwhile. A rejection returns the button to idle and is still thrown. The label function now also receives `{ busy }`.
