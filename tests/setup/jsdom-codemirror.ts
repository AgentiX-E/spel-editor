/**
 * jsdom gaps that CodeMirror steps on.
 *
 * jsdom does not implement `Range#getClientRects` or `Range#getBoundingClientRect`,
 * and CodeMirror calls both while measuring its viewport and while scrolling a
 * selection into view. Each call raises `TypeError: textRange(...).getClientRects is
 * not a function` on stderr. The tests still pass, but the noise buries a real
 * failure among a dozen stack traces, so the methods are filled in here.
 *
 * Empty geometry is the honest answer: jsdom performs no layout, so no rectangle
 * exists to report. Nothing asserted in this suite depends on pixel positions.
 */
const EMPTY_RECT: DOMRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  toJSON: () => ({}),
};

if (typeof Range !== 'undefined') {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => ({ ...EMPTY_RECT }) as DOMRect;
  }
}
