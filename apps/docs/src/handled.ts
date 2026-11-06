export const handled = [
  {
    title: "Pointer",
    items: [
      "Only the main pointer starts a hold: a left click, or one finger. A second finger is ignored, even when it lifts.",
      "The pointer is captured, so letting go still counts after your finger slides off.",
      "Dragging off the button cancels the hold. Sliding back on doesn't resume it, and releasing outside never confirms.",
      "A finger gets a few pixels of slack, and the whole 44px touch area counts as the button, so a steady thumb near the edge doesn't cancel.",
      "A cancelled pointer, or another gesture taking over, cancels the hold.",
      "Scrolling the button out from under your finger cancels the hold.",
      "On a phone, the long-press menu, text selection and magnifier stay out of the way.",
      "On Android, a touch hold that confirms gives a short buzz. iPhones don't let websites do that.",
    ],
  },
  {
    title: "Keyboard",
    items: [
      "Hold Space or Enter. Key repeat doesn't restart the timer, and releasing a different key doesn't stop it.",
      "Escape cancels a hold, from the keyboard or a pointer. Releasing the key afterwards does nothing.",
      "Shortcuts like Ctrl+Enter or Cmd+Enter neither start a hold nor click the button.",
      "Moving focus away cancels a keyboard hold. A mouse hold keeps going, because Safari takes focus off a button as you press it.",
    ],
  },
  {
    title: "Page",
    items: [
      "Switching tabs or windows cancels an unfinished hold. It never completes in the background.",
      "disabled cancels a hold in progress, and a disabled button can't start one.",
      "A short press still clicks, and the click bubbles. After a completed hold, the click is stopped, so no listener above it runs, React or not.",
      'It never submits or resets its form, even with type="submit".',
      "If the button unmounts mid-hold, nothing runs afterwards.",
      "With reduced motion, the button doesn't shrink and an early release snaps back. The fill still moves, because it's how you can tell the hold is working.",
    ],
  },
];
