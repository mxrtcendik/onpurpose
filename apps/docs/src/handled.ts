export const handled = [
  {
    title: "Pointer",
    items: [
      "Only the main pointer starts a hold: left click, or one finger. A second finger is ignored, even when it lifts.",
      "The pointer is captured, so letting go still registers if your finger has slid off the button.",
      "Drag off the button and the hold cancels. Sliding back on does not resume it, and releasing outside never confirms.",
      "A finger gets a few pixels of slack, and the whole 44px touch area counts as the button, so a steady thumb near the edge doesn't cancel.",
      "If the pointer is cancelled, or something else takes over the pointer, the hold cancels.",
      "On a phone, the long-press menu, text selection, and magnifier stay out of the way while you hold.",
      "Scroll the button out from under your finger and the hold cancels.",
      "On Android, a touch hold that confirms gives a short buzz. iPhones don't let the web do that.",
    ],
  },
  {
    title: "Keyboard",
    items: [
      "Hold Space or Enter. A key that is already down won't start the timer again, and releasing a different key won't stop it.",
      "Escape cancels a hold, whether it's a key or a pointer, and letting go of the key afterwards does nothing.",
      "Shortcuts like Ctrl+Enter or Cmd+Enter don't start a hold, and don't click the button either.",
      "A mouse hold keeps going when Safari takes focus off the button as you press it. Only a keyboard hold cancels when focus leaves.",
    ],
  },
  {
    title: "Page",
    items: [
      "Tab away, switch windows, or hide the tab, and an unfinished hold cancels. It won't finish in the background.",
      "disabled stops a hold that's already going, and a disabled button can't start one.",
      "Handlers you pass run first. Call preventDefault and the hold never starts.",
      "A short press still clicks, and that click bubbles. It does not confirm. After a finished hold, letting go doesn't click, so no listener above it runs as well, React or not.",
      "Return a promise from onConfirm and a second hold can't start until it settles.",
      'It never submits or resets its form, even with type="submit". A quick click can\'t send the form.',
      "If the button unmounts mid-hold, the timer is cleared. onConfirm does not run after it's gone.",
      "With reduced motion, the button doesn't shrink and an early release snaps back. The fill still moves, because that's how you can tell the hold is working.",
    ],
  },
];
