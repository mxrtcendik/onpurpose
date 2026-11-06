---
"onpurpose": minor
---

`onConfirm` can return a promise. Until it settles, the button stays confirmed, sets `aria-busy` and won't start another hold. If it rejects, the button returns to idle and the error is rethrown. The label function receives `{ busy }` as a second argument.
