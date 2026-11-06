---
"onpurpose": patch
---

Accept an `onConfirm` that returns any value again, like `() => items.push(item)`. The promise support had narrowed the return type to `void` or a promise.
