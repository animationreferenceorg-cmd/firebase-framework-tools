import type { Layer, BlendMode, CanvasSize, Frame } from './types';
import { createLayerCanvas } from './engine';
import { nanoid } from 'nanoid';

interface SerializedLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  alphaLocked?: boolean;
  maskEnabled?: boolean;
  dataUrl: string;
  maskDataUrl?: string;
}

interface SerializedFrame {
  id: string;
  name: string;
  activeLayerId: string;
  layers: SerializedLayer[];
  storyboardScript?: {
    dialogue: string;
    action: string;
    camera: string;
    duration: number;
  };
  poseType?: 'key' | 'extreme' | 'breakdown' | 'inbetween';
}

// v1 was a single layer stack with no frames — kept here only so
// deserializeProject can still read autosaves/files written before frames
// existed (this session shipped v1 shortly before v2, so real files exist).
interface SerializedProjectV1 {
  version: 1;
  canvasSize: CanvasSize;
  layers: SerializedLayer[];
  activeLayerId: string;
  savedAt: number;
}

export interface SerializedProject {
  version: 2;
  canvasSize: CanvasSize;
  fps?: number;
  frames: SerializedFrame[];
  activeFrameIndex: number;
  savedAt: number;
}

type AnySerializedProject = SerializedProject | SerializedProjectV1;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function serializeLayer(l: Layer): SerializedLayer {
  return {
    id: l.id,
    name: l.name,
    visible: l.visible,
    opacity: l.opacity,
    blendMode: l.blendMode,
    alphaLocked: l.alphaLocked,
    maskEnabled: l.maskEnabled,
    dataUrl: l.canvas.toDataURL('image/png'),
    maskDataUrl: l.mask ? l.mask.toDataURL('image/png') : undefined,
  };
}

async function deserializeLayer(s: SerializedLayer, canvasSize: CanvasSize): Promise<Layer> {
  const canvas = createLayerCanvas(canvasSize.width, canvasSize.height);
  const img = await loadImage(s.dataUrl);
  canvas.getContext('2d')!.drawImage(img, 0, 0);

  let mask: HTMLCanvasElement | undefined;
  if (s.maskDataUrl) {
    mask = createLayerCanvas(canvasSize.width, canvasSize.height);
    const maskImg = await loadImage(s.maskDataUrl);
    mask.getContext('2d')!.drawImage(maskImg, 0, 0);
  }

  return {
    id: s.id,
    name: s.name,
    visible: s.visible,
    opacity: s.opacity,
    blendMode: s.blendMode,
    alphaLocked: s.alphaLocked,
    maskEnabled: s.maskEnabled,
    canvas,
    mask,
  };
}

export function serializeProject(frames: Frame[], canvasSize: CanvasSize, activeFrameIndex: number, fps?: number): SerializedProject {
  return {
    version: 2,
    canvasSize,
    fps,
    activeFrameIndex,
    savedAt: Date.now(),
    frames: frames.map((f) => ({
      id: f.id,
      name: f.name,
      activeLayerId: f.activeLayerId,
      layers: f.layers.map(serializeLayer),
      storyboardScript: f.storyboardScript,
      poseType: f.poseType,
    })),
  };
}

export async function deserializeProject(project: AnySerializedProject): Promise<{ frames: Frame[]; canvasSize: CanvasSize; activeFrameIndex: number; fps?: number }> {
  const canvasSize = project.canvasSize;
  const fps = project.version === 2 ? project.fps : undefined;

  const serializedFrames: SerializedFrame[] =
    project.version === 2
      ? project.frames
      : [{ id: nanoid(), name: 'Frame 1', activeLayerId: project.activeLayerId, layers: project.layers }];

  const frames = await Promise.all(serializedFrames.map(async (sf) => {
    const layers = await Promise.all(sf.layers.map((sl) => deserializeLayer(sl, canvasSize)));
    const frame: Frame = {
      id: sf.id,
      name: sf.name,
      layers,
      activeLayerId: layers.find((l) => l.id === sf.activeLayerId) ? sf.activeLayerId : layers[layers.length - 1]?.id ?? '',
      storyboardScript: sf.storyboardScript,
      poseType: sf.poseType,
    };
    return frame;
  }));

  const activeFrameIndex = project.version === 2 ? Math.min(Math.max(0, project.activeFrameIndex), frames.length - 1) : 0;

  return { frames, canvasSize, activeFrameIndex, fps };
}

export function downloadProject(project: SerializedProject, filename: string = 'animation-project.animref') {
  const cleanFilename = filename.endsWith('.animref') || filename.endsWith('.json') || filename.endsWith('.paint')
    ? filename
    : `${filename}.animref`;
  const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readProjectFile(file: File): Promise<AnySerializedProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// --- Autosave (IndexedDB — canvas image data can easily exceed
// localStorage's ~5-10MB quota, IndexedDB doesn't have that ceiling) ---

const DB_NAME = 'paint-studio-autosave';
const STORE_NAME = 'projects';
const AUTOSAVE_KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function autosaveProject(project: SerializedProject): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(project, AUTOSAVE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadAutosavedProject(): Promise<AnySerializedProject | null> {
  const db = await openDb();
  const result = await new Promise<AnySerializedProject | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(AUTOSAVE_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearAutosavedProject(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(AUTOSAVE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
