---
"onpurpose": patch
---

On React 19, render the styles with the page so server-rendered buttons are styled before hydration. Keep the hidden hint and live region hidden before any CSS loads, and stop a page element with `id="onpurpose"` from blocking the styles.
