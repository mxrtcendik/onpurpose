---
"onpurpose": patch
---

The built-in styles moved to `@layer components.hold-button`, so Tailwind utilities override them and Tailwind's reset no longer flattens the button. A `@layer hold-button` ordering line in your own CSS no longer has any effect.
