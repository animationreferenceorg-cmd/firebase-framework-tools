export interface HSV {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

export function hexToHsv(hex: string): HSV {
  const { r, g, b } = hexToRgbTuple(hex);
  return rgbToHsv(r, g, b);
}

export function hsvToHex(hsv: HSV): string {
  const { r, g, b } = hsvToRgb(hsv);
  return rgbToHex(r, g, b);
}

export function hexToRgbTuple(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const bigint = parseInt(full || '000000', 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

export function hsvToRgb({ h, s, v }: HSV): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) { rp = c; gp = x; bp = 0; }
  else if (h < 120) { rp = x; gp = c; bp = 0; }
  else if (h < 180) { rp = 0; gp = c; bp = x; }
  else if (h < 240) { rp = 0; gp = x; bp = c; }
  else if (h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}
