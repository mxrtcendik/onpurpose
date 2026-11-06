---
"onpurpose": patch
---

On React 19 the styles render with the page, so server-rendered buttons are styled before hydration. The hidden screen reader text stays hidden before any CSS loads, and a page element with `id="onpurpose"` no longer blocks the styles.
