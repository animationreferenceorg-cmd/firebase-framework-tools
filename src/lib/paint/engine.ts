import type { BrushSettings, Point, Layer } from './types';
import { rgbToHsv, hsvToRgb } from './color';

/** Blend factor between the brush's minimum and full pressure response. */
function pressureFactor(pressure: number, minFactor: number): number {
  const clamped = Math.max(0, Math.min(1, pressure));
  return minFactor + (1 - minFactor) * clamped;
}

let textureScratch: HTMLCanvasElement | null = null;
function getTextureScratch(): HTMLCanvasElement {
  if (!textureScratch) textureScratch = document.createElement('canvas');
  return textureScratch;
}

/**
 * Stamps a single dab of the brush at a point — either the built-in soft/hard
 * round brush, or (if the brush has a custom texture) that texture tinted
 * with the brush color and clipped to its alpha mask.
 * Hardness controls how quickly the radial gradient falls off to transparent.
 * Size/opacity respond to the point's pressure per the brush's settings.
 */
export function stampBrush(ctx: CanvasRenderingContext2D, point: Point, brush: BrushSettings, texture?: HTMLCanvasElement) {
  const pressure = point.pressure ?? 1;
  const sizeFactor = brush.pressureSize ? pressureFactor(pressure, brush.minPressureFactor) : 1;
  const opacityFactor = brush.pressureOpacity ? pressureFactor(pressure, brush.minPressureFactor) : 1;

  const radius = Math.max(0.5, (brush.size * sizeFactor) / 2);
  const effectiveOpacity = Math.max(0, Math.min(1, brush.opacity * opacityFactor));
  const { x, y } = point;

  if (texture) {
    const size = Math.max(1, Math.round(radius * 2));
    const scratch = getTextureScratch();
    scratch.width = size;
    scratch.height = size;
    const sctx = scratch.getContext('2d')!;
    sctx.clearRect(0, 0, size, size);
    sctx.drawImage(texture, 0, 0, size, size);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = brush.color;
    sctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.globalAlpha = effectiveOpacity;
    ctx.drawImage(scratch, x - size / 2, y - size / 2);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.globalAlpha = effectiveOpacity;

  if (brush.hardness >= 0.98) {
    // Hard-edge brush: plain filled circle, cheaper and crisper.
    ctx.fillStyle = brush.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const innerStop = Math.max(0, Math.min(0.99, brush.hardness));
    const gradient = ctx.createRadialGradient(x, y, radius * innerStop, x, y, radius);
    gradient.addColorStop(0, brush.color);
    gradient.addColorStop(1, hexToRgba(brush.color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws a smooth stroke segment between two points by stamping brush dabs
 * at a fixed spacing along the path. Prevents gappy strokes on fast drags.
 * Pressure is interpolated between the two endpoints along the segment.
 */
export function strokeSegment(ctx: CanvasRenderingContext2D, from: Point, to: Point, brush: BrushSettings, texture?: HTMLCanvasElement) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const spacing = Math.max(1, brush.size * 0.06);
  const steps = Math.max(1, Math.floor(distance / spacing));
  const fromPressure = from.pressure ?? 1;
  const toPressure = to.pressure ?? 1;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    stampBrush(ctx, {
      x: from.x + dx * t,
      y: from.y + dy * t,
      pressure: fromPressure + (toPressure - fromPressure) * t,
    }, brush, texture);
  }
}

/**
 * Converts an uploaded image into a reusable brush-tip texture: a white-RGB
 * alpha mask so it can be tinted with any brush color via 'source-in'.
 * If the source image has no real transparency, luminance is used as alpha
 * instead (dark marks on a light background = the classic scanned-brush
 * convention), inverted so dark pixels become opaque ink.
 */
export function processBrushTextureImage(img: HTMLImageElement, maxDim: number = 512): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  let hasRealAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) { hasRealAlpha = true; break; }
  }

  for (let i = 0; i < data.length; i += 4) {
    let alpha: number;
    if (hasRealAlpha) {
      alpha = data[i + 3];
    } else {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      alpha = 255 - luminance; // dark marks -> opaque
    }
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = alpha;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Exponential-smoothing filter for incoming pointer points — reduces hand
 * jitter/tablet noise without adding perceptible lag. `smoothing` is 0
 * (no smoothing) to 1 (heavy smoothing).
 */
export function smoothPoint(previous: Point | null, incoming: Point, smoothing: number): Point {
  if (!previous || smoothing <= 0) return incoming;
  const factor = Math.max(0, Math.min(0.95, smoothing));
  return {
    x: previous.x + (incoming.x - previous.x) * (1 - factor),
    y: previous.y + (incoming.y - previous.y) * (1 - factor),
    pressure: incoming.pressure,
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Flood fill starting at (x, y) with the given color, using a simple
 * tolerance-based scanline-ish stack fill over ImageData.
 */
export function floodFill(ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string, tolerance: number = 32) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const startIdx = (startY * w + startX) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  const fill = hexToRgbaTuple(fillColor);

  if (
    Math.abs(targetR - fill.r) <= 2 &&
    Math.abs(targetG - fill.g) <= 2 &&
    Math.abs(targetB - fill.b) <= 2 &&
    Math.abs(targetA - fill.a) <= 2
  ) {
    return; // already the fill color
  }

  const matches = (idx: number) => {
    const dr = data[idx] - targetR;
    const dg = data[idx + 1] - targetG;
    const db = data[idx + 2] - targetB;
    const da = data[idx + 3] - targetA;
    return Math.sqrt(dr * dr + dg * dg + db * db + da * da) <= tolerance;
  };

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(w * h);

  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const pos = y * w + x;
    if (visited[pos]) continue;
    const idx = pos * 4;
    if (!matches(idx)) continue;

    visited[pos] = 1;
    data[idx] = fill.r;
    data[idx + 1] = fill.g;
    data[idx + 2] = fill.b;
    data[idx + 3] = fill.a;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

function hexToRgbaTuple(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
    a: 255,
  };
}

export function createLayerCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const clone = createLayerCanvas(source.width, source.height);
  const ctx = clone.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  return clone;
}

/** Flattens a layer stack into one canvas. `skipBottom` drops the
 * bottom-most layer — used for onion skinning, where that layer is by
 * convention the opaque background fill, and including it would turn the
 * ghost into a solid rectangle instead of a silhouette of the actual
 * linework/content layered above it. */
export function flattenLayers(layers: Layer[], width: number, height: number, skipBottom: boolean = false): HTMLCanvasElement {
  const composite = createLayerCanvas(width, height);
  const ctx = composite.getContext('2d')!;
  const toDraw = (skipBottom && layers.length > 1) ? layers.slice(1) : layers;
  for (const layer of toDraw) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }
  return composite;
}

/** Recolors every opaque pixel of `source` to a flat tint color while
 * keeping its alpha shape — the solid-color "ghost" look onion skinning
 * uses (blue for the previous frame, orange/red for the next). */
export function tintSilhouette(source: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const tinted = cloneCanvas(source);
  const ctx = tinted.getContext('2d')!;
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, tinted.width, tinted.height);
  return tinted;
}

/**
 * Drags/smears existing pixels along a path (Procreate/Photoshop's finger
 * or smudge tool) — at each step, copies a small patch from the previous
 * sample point onto the current one, clipped to a circle, at partial alpha.
 * Operates directly on `ctx`'s own canvas: browsers snapshot the source
 * region before compositing, so self-referential drawImage is safe.
 */
export function smudgeSegment(ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number, strength: number) {
  const source = ctx.canvas;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const spacing = Math.max(1, size * 0.1);
  const steps = Math.max(1, Math.floor(distance / spacing));
  const radius = Math.max(1, size / 2);

  for (let i = 1; i <= steps; i++) {
    const prevT = (i - 1) / steps;
    const t = i / steps;
    const px = from.x + dx * prevT;
    const py = from.y + dy * prevT;
    const x = from.x + dx * t;
    const y = from.y + dy * t;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = Math.max(0, Math.min(1, strength));
    ctx.drawImage(source, px - radius, py - radius, radius * 2, radius * 2, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }
}

/**
 * Clone stamp: copies pixels from a fixed source point (established by
 * Alt+click) to the brush path, maintaining a constant offset the whole
 * stroke — Photoshop's "Aligned" clone mode, which is the mode people
 * expect by default.
 */
export function cloneStampSegment(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  from: Point,
  to: Point,
  offset: { dx: number; dy: number },
  brush: BrushSettings
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const spacing = Math.max(1, brush.size * 0.06);
  const steps = Math.max(1, Math.floor(distance / spacing));
  const radius = Math.max(0.5, brush.size / 2);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    const sx = x - offset.dx;
    const sy = y - offset.dy;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = Math.max(0, Math.min(1, brush.opacity));
    ctx.drawImage(source, sx - radius, sy - radius, radius * 2, radius * 2, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }
}

/** Rectangle selection, rasterized into the same full-canvas alpha-mask
 * format lasso and magic-wand selections use, so all three clip painting
 * through one code path. */
export function rectSelectionMask(width: number, height: number, x: number, y: number, w: number, h: number): HTMLCanvasElement {
  const mask = createLayerCanvas(width, height);
  const ctx = mask.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  return mask;
}

/** Freehand (lasso) selection — fills the closed polygon traced by the drag. */
export function polygonSelectionMask(width: number, height: number, points: Point[]): HTMLCanvasElement {
  const mask = createLayerCanvas(width, height);
  if (points.length < 3) return mask;
  const ctx = mask.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fill();
  return mask;
}

/** Magic wand — same contiguous-region tolerance match as floodFill, but
 * returns a selection mask instead of painting the region. */
export function magicWandSelectionMask(source: HTMLCanvasElement, startX: number, startY: number, tolerance: number = 32): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const mask = createLayerCanvas(w, h);
  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return mask;

  const data = source.getContext('2d')!.getImageData(0, 0, w, h).data;
  const startIdx = (startY * w + startX) * 4;
  const tr = data[startIdx], tg = data[startIdx + 1], tb = data[startIdx + 2], ta = data[startIdx + 3];
  const matches = (idx: number) => {
    const dr = data[idx] - tr, dg = data[idx + 1] - tg, db = data[idx + 2] - tb, da = data[idx + 3] - ta;
    return Math.sqrt(dr * dr + dg * dg + db * db + da * da) <= tolerance;
  };

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(w * h);
  const maskData = new Uint8ClampedArray(w * h * 4);

  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const pos = y * w + x;
    if (visited[pos]) continue;
    const idx = pos * 4;
    if (!matches(idx)) continue;
    visited[pos] = 1;
    maskData[idx] = 255; maskData[idx + 1] = 255; maskData[idx + 2] = 255; maskData[idx + 3] = 255;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  mask.getContext('2d')!.putImageData(new ImageData(maskData, w, h), 0, 0);
  return mask;
}

/** Combines a freshly-drawn selection mask with whatever was already
 * selected — Shift+drag adds, Alt+drag subtracts, matching Photoshop. */
export function combineSelectionMask(existing: HTMLCanvasElement | null, next: HTMLCanvasElement, mode: 'new' | 'add' | 'subtract'): HTMLCanvasElement {
  if (mode === 'new' || !existing) return next;
  const combined = cloneCanvas(existing);
  const ctx = combined.getContext('2d')!;
  ctx.globalCompositeOperation = mode === 'add' ? 'source-over' : 'destination-out';
  ctx.drawImage(next, 0, 0);
  return combined;
}

/** Bounding box of a mask's non-transparent pixels, for the selection's
 * on-screen marching-ants-style overlay rect. */
export function maskBounds(mask: HTMLCanvasElement): { x: number; y: number; w: number; h: number } {
  const data = mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height).data;
  let minX = mask.width, minY = mask.height, maxX = -1, maxY = -1;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (data[(y * mask.width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Fills the whole canvas with a linear gradient between two colors along
 * the dragged axis — the composited result is clipped by the caller the
 * same way brush strokes are (selection / alpha-lock), so this just paints. */
export function paintLinearGradient(ctx: CanvasRenderingContext2D, from: Point, to: Point, colorFrom: string, colorTo: string, width: number, height: number) {
  const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  gradient.addColorStop(0, colorFrom);
  gradient.addColorStop(1, colorTo);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/** Brightness/contrast adjustment, applied in place. brightness/contrast
 * both range -100..100, matching Photoshop's slider scale. */
export function applyBrightnessContrast(canvas: HTMLCanvasElement, brightness: number, contrast: number) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const b = brightness * 2.55;
  const c = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let ch = 0; ch < 3; ch++) {
      const v = c * (data[i + ch] + b - 128) + 128;
      data[i + ch] = Math.max(0, Math.min(255, v));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Hue/saturation/lightness adjustment, applied in place. hueShift is
 * degrees (-180..180); saturation/lightness are percent deltas (-100..100). */
export function applyHueSaturation(canvas: HTMLCanvasElement, hueShift: number, saturationPct: number, lightnessPct: number) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    hsv.h = (hsv.h + hueShift + 360) % 360;
    hsv.s = Math.max(0, Math.min(1, hsv.s * (1 + saturationPct / 100)));
    hsv.v = Math.max(0, Math.min(1, hsv.v * (1 + lightnessPct / 100)));
    const rgb = hsvToRgb(hsv);
    data[i] = rgb.r; data[i + 1] = rgb.g; data[i + 2] = rgb.b;
  }
  ctx.putImageData(imageData, 0, 0);
}
