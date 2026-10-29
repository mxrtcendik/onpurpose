import "@testing-library/jest-dom/vitest";

const box = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  bottom: 40,
  right: 160,
  width: 160,
  height: 40,
  toJSON() {
    return {};
  },
} as DOMRect;

Element.prototype.getBoundingClientRect = () => box;

if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = () => {};
}
if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = () => {};
}
if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = () => false;
}
