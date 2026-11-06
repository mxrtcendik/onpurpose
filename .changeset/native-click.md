---
"onpurpose": patch
---

The click after a completed hold is stopped before any ancestor sees it, including native `addEventListener` listeners, not just React handlers.
