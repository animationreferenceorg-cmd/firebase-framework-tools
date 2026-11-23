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
  | 'polyLasso'
  | 'magicWand'
  | 'move'
  | 'smudge'
  | 'gradient'
  | 'cloneStamp'
  | 'blur'
  | 'sharpen'
  | 'dodge'
  | 'burn';

/** Tools that paint into the active layer via a dragged stroke. Used to decide
 * whether a selection clip and alpha-lock need to be set up for the stroke. */
export const STROKE_TOOLS: ToolType[] = [
  'brush', 'eraser', 'smudge', 'cloneStamp', 'blur', 'sharpen', 'dodge', 'burn',
];

export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  thumbnail?: string; // data URL, refreshed periodically
  alphaLocked?: boolean; // painting only affects pixels that already have alpha > 0
  locked?: boolean; // fully locked — no painting, no transform
  mask?: HTMLCanvasElement; // layer mask — alpha channel is visibility (255 = shown, 0 = hidden)
  maskEnabled?: boolean; // lets the mask be toggled off without deleting it
  /** Clipping Mask (Photoshop/Procreate) — clips this layer's pixels to the alpha of the base layer below. */
  clippedToBelow?: boolean;
  /** Reference Layer (Toon Boom/Procreate) — Paint Bucket reads line-art boundaries from this layer when filling other layers. */
  isReference?: boolean;
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
  /** Stamp spacing as a fraction of brush size (e.g. 0.05 smooth ink, 0.25 rake/chalk). */
  spacing?: number;
  /** Rotate brush tip along the stroke direction (Oil Rake, Flat Gouache, Sumi, Chisel). */
  angleFollow?: boolean;
  /** Fixed nib rotation offset in degrees (e.g. 35 for Calligraphy / Chisel Marker). */
  angleOffset?: number;
  /** Random rotation jitter per dab, 0-1 (Charcoal, Chalk, Splatter, Foliage). */
  angleJitter?: number;
  /** Perpendicular positional scatter multiplier, 0-2 (Dry Grain, Spray, FX). */
  scatter?: number;
  /** Organic per-dab size jitter, 0-0.6. */
  sizeJitter?: number;
  /** Elliptical nib squeeze, 0.15-1.0 (1 = round, 0.35 = flat chisel/pencil). */
  roundness?: number;
  /** Toon Boom Harmony / Clip Studio style crisp variable-width vector ribbon rendering. */
  vectorSmooth?: boolean;
  /** Magic-wand / fill colour distance threshold, 0-255. */
  tolerance: number;
  /** How much pigment the smudge tool drags along the stroke, 0-1. */
  smudgeStrength: number;
  /** Second colour stop for the gradient tool. */
  secondaryColor: string;
  /** Gradient tool shape. */
  gradientType: 'linear' | 'radial';
  /** Dodge/burn exposure per dab, 0-1. */
  exposure: number;
  /** Text tool settings — only read by the text tool. */
  fontFamily: string;
  fontWeight: number;
  fontItalic: boolean;
  lineHeight: number; // multiplier of font size
  textAlign: 'left' | 'center' | 'right';
}

export const FONT_FAMILIES: { value: string; label: string }[] = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times' },
  { value: '"Courier New", monospace', label: 'Courier' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: '"Comic Sans MS", cursive', label: 'Comic Sans' },
  { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet' },
];

export interface CustomBrushTexture {
  id: string;
  name: string;
  /** Pre-processed as a white-RGB alpha mask so it can be tinted with any brush color. */
  canvas: HTMLCanvasElement;
  thumbnail: string; // data URL for UI previews
  /** True for the procedurally-generated built-in library; false/undefined for user uploads. */
  builtin?: boolean;
}

export type BrushCategory = 'Vector' | 'Sketch' | 'Inking' | 'Painting' | 'Texture' | 'FX';

export interface BrushPreset {
  id: string;
  name: string;
  category: BrushCategory;
  badge?: string;
  settings: Partial<
    Pick<
      BrushSettings,
      | 'hardness'
      | 'pressureSize'
      | 'pressureOpacity'
      | 'minPressureFactor'
      | 'smoothing'
      | 'textureId'
      | 'spacing'
      | 'angleFollow'
      | 'angleOffset'
      | 'angleJitter'
      | 'scatter'
      | 'sizeJitter'
      | 'roundness'
      | 'vectorSmooth'
    >
  >;
}

export const BRUSH_PRESETS: BrushPreset[] = [
  // Vector (Toon Boom Harmony / Clip Studio / Flash style crisp tapered ribbons)
  {
    id: 'vector-gpen',
    name: 'Vector G-Pen',
    category: 'Vector',
    badge: 'TOON BOOM',
    settings: {
      textureId: undefined,
      vectorSmooth: true,
      hardness: 1,
      pressureSize: true,
      pressureOpacity: false,
      minPressureFactor: 0.12,
      smoothing: 0.55,
      roundness: 1,
    },
  },
  {
    id: 'vector-cleanup',
    name: 'Vector Clean-Up Mono',
    category: 'Vector',
    badge: 'VECTOR',
    settings: {
      textureId: undefined,
      vectorSmooth: true,
      hardness: 1,
      pressureSize: false,
      pressureOpacity: false,
      minPressureFactor: 1,
      smoothing: 0.65,
      roundness: 1,
    },
  },
  {
    id: 'vector-rough-pencil',
    name: 'Vector Rough Animator',
    category: 'Vector',
    badge: 'VECTOR',
    settings: {
      textureId: undefined,
      vectorSmooth: true,
      hardness: 1,
      pressureSize: true,
      pressureOpacity: true,
      minPressureFactor: 0.28,
      smoothing: 0.35,
      roundness: 1,
    },
  },
  {
    id: 'vector-chisel',
    name: 'Vector Chisel Smear',
    category: 'Vector',
    badge: 'VECTOR',
    settings: {
      textureId: undefined,
      vectorSmooth: true,
      hardness: 1,
      pressureSize: true,
      pressureOpacity: false,
      minPressureFactor: 0.35,
      smoothing: 0.45,
      roundness: 0.4,
      angleOffset: 35,
    },
  },

  // Sketch (Photoshop / Procreate / TVPaint)
  {
    id: '6b-anim-pencil',
    name: '6B Animation Pencil',
    category: 'Sketch',
    badge: 'PROCREATE',
    settings: {
      textureId: 'builtin-graphite',
      vectorSmooth: false,
      hardness: 0.75,
      pressureSize: true,
      pressureOpacity: true,
      minPressureFactor: 0.32,
      smoothing: 0.18,
      spacing: 0.12,
      angleJitter: 0.45,
      roundness: 0.55,
    },
  },
  { id: 'pencil', name: 'Pencil', category: 'Sketch', settings: { textureId: undefined, vectorSmooth: false, hardness: 1, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.4, smoothing: 0.1 } },
  { id: 'charcoal', name: 'Charcoal Block', category: 'Sketch', settings: { textureId: 'builtin-charcoal', vectorSmooth: false, hardness: 1.0, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.5, smoothing: 0.1, spacing: 0.15, angleJitter: 0.35 } },
  { id: 'graphite', name: 'Graphite Pencil', category: 'Sketch', settings: { textureId: 'builtin-graphite', vectorSmooth: false, hardness: 0.7, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.3, smoothing: 0.2, spacing: 0.1, angleJitter: 0.25 } },

  // Inking (Photoshop / Manga / Sakuga)
  {
    id: 'dry-sumi',
    name: 'Dry Sumi Ink',
    category: 'Inking',
    badge: 'SAKUGA',
    settings: {
      textureId: 'builtin-dry-sumi',
      vectorSmooth: false,
      hardness: 1.0,
      pressureSize: true,
      pressureOpacity: false,
      minPressureFactor: 0.15,
      smoothing: 0.35,
      spacing: 0.08,
      angleFollow: true,
    },
  },
  {
    id: 'chisel-copic',
    name: 'Chisel Copic Marker',
    category: 'Inking',
    badge: 'PHOTOSHOP',
    settings: {
      textureId: 'builtin-chisel-nib',
      vectorSmooth: false,
      hardness: 0.9,
      pressureSize: false,
      pressureOpacity: true,
      minPressureFactor: 0.55,
      smoothing: 0.3,
      spacing: 0.05,
      angleOffset: 40,
    },
  },
  { id: 'ink', name: 'Ink Pen', category: 'Inking', settings: { textureId: undefined, vectorSmooth: false, hardness: 1, pressureSize: false, pressureOpacity: false, minPressureFactor: 1, smoothing: 0.15 } },
  { id: 'fineliner', name: 'Fine Liner', category: 'Inking', settings: { textureId: 'builtin-fineliner', vectorSmooth: false, hardness: 1.0, pressureSize: true, pressureOpacity: false, minPressureFactor: 0.1, smoothing: 0.4 } },
  { id: 'calligraphy', name: 'Calligraphy Pen', category: 'Inking', settings: { textureId: 'builtin-calligraphy', vectorSmooth: false, hardness: 1.0, pressureSize: true, pressureOpacity: false, minPressureFactor: 0.1, smoothing: 0.5, angleOffset: 35 } },
  { id: 'marker', name: 'Marker', category: 'Inking', settings: { textureId: undefined, vectorSmooth: false, hardness: 0.6, pressureSize: false, pressureOpacity: true, minPressureFactor: 0.5, smoothing: 0.2 } },

  // Painting (Photoshop Kyle-style / Concept Art)
  {
    id: 'studio-rake',
    name: 'Studio Oil Rake',
    category: 'Painting',
    badge: 'PHOTOSHOP',
    settings: {
      textureId: 'builtin-studio-rake',
      vectorSmooth: false,
      hardness: 0.9,
      pressureSize: true,
      pressureOpacity: true,
      minPressureFactor: 0.45,
      smoothing: 0.38,
      spacing: 0.09,
      angleFollow: true,
    },
  },
  {
    id: 'gouache-flat',
    name: 'Gouache Flat',
    category: 'Painting',
    badge: 'PROCREATE',
    settings: {
      textureId: 'builtin-gouache-flat',
      vectorSmooth: false,
      hardness: 0.85,
      pressureSize: true,
      pressureOpacity: true,
      minPressureFactor: 0.5,
      smoothing: 0.32,
      spacing: 0.11,
      angleFollow: true,
      sizeJitter: 0.08,
    },
  },
  {
    id: 'concept-round',
    name: 'Concept Painter Round',
    category: 'Painting',
    badge: 'PHOTOSHOP',
    settings: {
      textureId: undefined,
      vectorSmooth: false,
      hardness: 0.72,
      pressureSize: true,
      pressureOpacity: true,
      minPressureFactor: 0.25,
      smoothing: 0.28,
      roundness: 0.82,
    },
  },
  { id: 'round', name: 'Round Brush', category: 'Painting', settings: { textureId: undefined, vectorSmooth: false, hardness: 0.85, pressureSize: true, pressureOpacity: false, minPressureFactor: 0.35, smoothing: 0.3 } },
  { id: 'soft', name: 'Soft Airbrush', category: 'Painting', settings: { textureId: undefined, vectorSmooth: false, hardness: 0.15, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.15, smoothing: 0.35 } },
  { id: 'oil', name: 'Oil Bristles', category: 'Painting', settings: { textureId: 'builtin-oil', vectorSmooth: false, hardness: 0.9, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.6, smoothing: 0.4, angleFollow: true } },
  { id: 'wet-watercolor', name: 'Wet Watercolor', category: 'Painting', settings: { textureId: 'builtin-wet-watercolor', vectorSmooth: false, hardness: 0.0, pressureSize: true, pressureOpacity: true, minPressureFactor: 0.2, smoothing: 0.6, angleJitter: 0.5 } },
  
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
export interface CameraKeyframe {
  /** Normalized center X (0..1, where 0.5 is canvas center). */
  x: number;
  /** Normalized center Y (0..1, where 0.5 is canvas center). */
  y: number;
  /** Zoom factor (>= 1 = truck in, 1 = full frame). */
  zoom: number;
}

export interface CameraMove {
  enabled: boolean;
  start: CameraKeyframe;
  end: CameraKeyframe;
  easing: 'linear' | 'ease-in-out';
}

export interface Frame {
  id: string;
  name: string;
  layers: Layer[];
  activeLayerId: string;
  poseType?: 'key' | 'extreme' | 'breakdown' | 'inbetween';
  /** Callipeg/Toon Boom exposure duration in timeline frames (1 = on 1s, 2 = on 2s, 3 = on 3s). Defaults to 1. */
  holdFrames?: number;
  /** Storyboard Pro 2D Camera pan/truck/zoom keyframe move for this panel. */
  cameraMove?: CameraMove;
  /** Flattened preview of the frame, used by the storyboard timeline panels. */
  thumbnail?: string;
  storyboardScript?: {
    dialogue: string;
    action: string;
    camera: string;
    duration: number;
  };
}
