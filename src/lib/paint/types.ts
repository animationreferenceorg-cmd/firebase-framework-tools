export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

export type ToolType =
  | 'brush'
  | 'eraser'
  | 'fill'
  | 'eyedropper'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'select'
  | 'lasso'
  | 'magicWand'
  | 'move'
  | 'smudge'
  | 'gradient'
  | 'cloneStamp';

export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  thumbnail?: string; // data URL, refreshed periodically
  alphaLocked?: boolean; // painting only affects pixels that already have alpha > 0
  mask?: HTMLCanvasElement; // layer mask — alpha channel is visibility (255 = shown, 0 = hidden)
  maskEnabled?: boolean; // lets the mask be toggled off without deleting it
}

/** A pixel-accurate selection — bounding box for UI plus a full-canvas-size
 * alpha mask (255 = selected) so rectangle, lasso, and magic-wand selections
 * can all clip painting the same way. */
export interface Selection {
  x: number;
  y: number;
  w: number;
  h: number;
  mask: HTMLCanvasElement;
}

export interface BrushSettings {
  size: number; // px
  opacity: number; // 0-1
  hardness: number; // 0-1 (0 = soft feathered edge, 1 = hard edge)
  color: string; // hex
  pressureSize: boolean; // tablet/pen pressure scales stroke size
  pressureOpacity: boolean; // tablet/pen pressure scales stroke opacity
  minPressureFactor: number; // 0-1, how thin/faint the stroke gets at zero pressure
  smoothing: number; // 0-1, how much input jitter is filtered out
  textureId?: string; // uploaded custom brush tip, falls back to the round brush if unset
}

export interface CustomBrushTexture {
  id: string;
  name: string;
  /** Pre-processed as a white-RGB alpha mask so it can be tinted with any brush color. */
  canvas: HTMLCanvasElement;
  thumbnail: string; // data URL for UI previews
  /** True for the procedurally-generated built-in library; false/undefined for user uploads. */
  builtin?: boolean;
}

export type BrushCategory = 'Sketch' | 'Inking' | 'Painting' | 'Texture' | 'FX';

export interface BrushPreset {
  id: string;
  name: string;
  category: BrushCategory;
  settings: Pick<BrushSettings, 'hardness' | 'pressureSize' | 'pressureOpacity' | 'minPressureFactor' | 'smoothing' | 'textureId'>;
}

export const BRUSH_PRESETS: BrushPreset[] = [
  // Sketch
  { id: 'pencil', name: 'Pencil', category: 'Sketch', settings: { hardness: 1, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.4, smoothing: 0.1 } },
  { id: 'charcoal', name: 'Charcoal Block', category: 'Sketch', settings: { textureId: 'builtin-charcoal', hardness: 1.0, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.5, smoothing: 0.1 } },
  { id: 'graphite', name: 'Graphite Pencil', category: 'Sketch', settings: { textureId: 'builtin-graphite', hardness: 0.7, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.3, smoothing: 0.2 } },
  
  // Inking
  { id: 'ink', name: 'Ink Pen', category: 'Inking', settings: { hardness: 1, pressureSize: false, pressureOpacity: false, minPressureFactor: 1, smoothing: 0.15 } },
  { id: 'fineliner', name: 'Fine Liner', category: 'Inking', settings: { textureId: 'builtin-fineliner', hardness: 1.0, pressureSize: true, pressureOpacity: false, minPressureFactor: 0.1, smoothing: 0.4 } },
  { id: 'calligraphy', name: 'Calligraphy Pen', category: 'Inking', settings: { textureId: 'builtin-calligraphy', hardness: 1.0, pressureSize: true, pressureOpacity: false, minPressureFactor: 0.1, smoothing: 0.5 } },
  { id: 'marker', name: 'Marker', category: 'Inking', settings: { hardness: 0.6, pressureSize: false, pressureOpacity: true, minPressureFactor: 0.5, smoothing: 0.2 } },
  
  // Painting
  { id: 'round', name: 'Round Brush', category: 'Painting', settings: { hardness: 0.85, pressureSize: true, pressureOpacity: false, minPressureFactor: 0.35, smoothing: 0.3 } },
  { id: 'soft', name: 'Soft Airbrush', category: 'Painting', settings: { hardness: 0.15, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.15, smoothing: 0.35 } },
  { id: 'oil', name: 'Oil Bristles', category: 'Painting', settings: { textureId: 'builtin-oil', hardness: 0.9, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.6, smoothing: 0.4 } },
  { id: 'wet-watercolor', name: 'Wet Watercolor', category: 'Painting', settings: { textureId: 'builtin-wet-watercolor', hardness: 0.0, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.2, smoothing: 0.6 } },
  
  // Texture
  { id: 'sponge', name: 'Dry Sponge', category: 'Texture', settings: { textureId: 'builtin-sponge', hardness: 0.8, pressureSize: false, pressureOpacity: true, minPressureFactor: 0.8, smoothing: 0.1 } },
  { id: 'concrete', name: 'Concrete Grind', category: 'Texture', settings: { textureId: 'builtin-concrete', hardness: 0.9, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.4, smoothing: 0.1 } },
  { id: 'grunge', name: 'Grunge', category: 'Texture', settings: { textureId: 'builtin-grunge', hardness: 0.9, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.5, smoothing: 0.2 } },
  { id: 'fur', name: 'Fur/Hair', category: 'Texture', settings: { textureId: 'builtin-fur', hardness: 1.0, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.3, smoothing: 0.4 } },
  { id: 'grass', name: 'Grass', category: 'Texture', settings: { textureId: 'builtin-grass', hardness: 1.0, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.5, smoothing: 0.1 } },
  { id: 'halftone', name: 'Halftone', category: 'Texture', settings: { textureId: 'builtin-halftone', hardness: 1.0, pressureSize: true, pressureOpacity: false, minPressureFactor: 0.2, smoothing: 0.2 } },
  { id: 'hexagons', name: 'Sci-Fi Hexagons', category: 'Texture', settings: { textureId: 'builtin-hexagons', hardness: 1.0, pressureSize: true, pressureOpacity: false, minPressureFactor: 0.5, smoothing: 0.2 } },
  
  // FX
  { id: 'cloud', name: 'Cloud/Smoke', category: 'FX', settings: { textureId: 'builtin-cloud', hardness: 0.0, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.2, smoothing: 0.6 } },
  { id: 'splatter', name: 'Splatter', category: 'FX', settings: { textureId: 'builtin-splatter', hardness: 0.8, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.3, smoothing: 0.1 } },
  { id: 'spray', name: 'Spray Paint', category: 'FX', settings: { textureId: 'builtin-spray', hardness: 0.4, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.2, smoothing: 0.1 } },
  { id: 'magic-glint', name: 'Magic Glint', category: 'FX', settings: { textureId: 'builtin-magic-glint', hardness: 1.0, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.1, smoothing: 0.1 } },
];

/** Pointer-event pressure isn't reliable for mouse (0 or always 0.5), so treat
 * non-pen input as full pressure rather than making mouse strokes faint/thin. */
/** Pointer-event pressure normalization for Stylus (Wacom, Apple Pencil, Surface Pen, Huion) & Mouse fallback. */
export function normalizedPressure(rawPressure?: number, pointerType?: string): number {
  if (typeof rawPressure === 'number' && rawPressure > 0 && rawPressure <= 1) {
    return rawPressure;
  }
  return 1;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number; // 0-1, normalized
}

export type SymmetryMode = 'none' | 'vertical' | 'horizontal' | 'both';

/** One flipbook frame — its own independent layer stack, for onion-skinning
 * and simple frame-by-frame animation reference. */
export interface Frame {
  id: string;
  name: string;
  layers: Layer[];
  activeLayerId: string;
  poseType?: 'key' | 'extreme' | 'breakdown' | 'inbetween';
  storyboardScript?: {
    dialogue: string;
    action: string;
    camera: string;
    duration: number;
  };
}
