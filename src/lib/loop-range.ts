/**
 * A–B loop math for the video player. An in point alone loops to the end; an
 * out point alone loops from the start. The out frame is inclusive: it stays
 * on screen for one frame before playback wraps to the in point.
 */

export interface LoopRange {
  start: number;
  end: number;
  active: boolean;
}

export function resolveLoop(loopIn: number | null, loopOut: number | null, duration: number, fps: number): LoopRange {
  const start = loopIn ?? 0;
  const end = loopOut ?? duration;
  const active = (loopIn !== null || loopOut !== null) && duration > 0 && end - start >= 1 / fps - 1e-6;
  return { start, end, active };
}

/** True when playback at `time` has left the loop and should jump back to `range.start`. */
export function shouldWrapLoop(time: number, range: LoopRange, duration: number, fps: number): boolean {
  if (!range.active) return false;
  const frame = 1 / fps;
  const exclusiveEnd = range.end + frame;
  // When the out point is the last frame, the media's own `ended` event handles the wrap.
  if (exclusiveEnd < duration && time >= exclusiveEnd) return true;
  return time < range.start - frame;
}
