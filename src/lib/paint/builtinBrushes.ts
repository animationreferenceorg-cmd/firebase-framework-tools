import type { CustomBrushTexture } from './types';

/**
 * Procedurally-generated brush tip textures — no external/downloaded assets,
 * so there's nothing to license-check. Each generator produces a white-RGB
 * alpha-mask canvas, the same format processBrushTextureImage() outputs for
 * uploaded images, so these slot directly into the existing stamp/tint
 * pipeline with zero special-casing.
 */

const SIZE = 256;

function blankMask(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

// Simple seeded PRNG so each generated brush has a stable, reproducible shape
// rather than a new random pattern on every page load.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintAsWhiteMask(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void) {
  // Draw the shape in black on a temp layer, then convert to a white-RGB
  // alpha mask (alpha = how "inked" that pixel is) — the format the brush
  // engine expects for tinting via source-in.
  draw(ctx);
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = alpha;
  }
  ctx.putImageData(img, 0, 0);
}

function generateSplatter(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    // Central blob
    c.beginPath();
    c.arc(cx, cy, SIZE * 0.22, 0, Math.PI * 2);
    c.fill();
    // Scattered droplets radiating outward, larger near center, tapering out
    const count = 26;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = (rand() * 0.75 + 0.15) * SIZE * 0.5;
      const r = Math.max(2, (1 - dist / (SIZE * 0.5)) * 18 * rand() + 3);
      c.beginPath();
      c.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, r, 0, Math.PI * 2);
      c.fill();
    }
  });
  return canvas;
}

function generateSpray(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    const count = 260;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      // Gaussian-ish falloff via sum of two randoms, denser toward center
      const dist = ((rand() + rand()) / 2) * SIZE * 0.48;
      const r = rand() * 2 + 0.5;
      c.globalAlpha = 0.5 + rand() * 0.5;
      c.beginPath();
      c.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  });
  return canvas;
}

function generateGrunge(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  // Low-res blocky noise, scaled up and lightly blurred for a mottled look,
  // clipped to a soft circle so it still reads as a round brush tip.
  const blockSize = 16;
  const cols = SIZE / blockSize;
  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 4, 0, Math.PI * 2);
  ctx.clip();
  paintAsWhiteMask(ctx, (c) => {
    for (let y = 0; y < cols; y++) {
      for (let x = 0; x < cols; x++) {
        const v = rand();
        c.fillStyle = '#000';
        c.globalAlpha = Math.max(0, Math.min(1, v * 1.3 - 0.15));
        c.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
      }
    }
    c.globalAlpha = 1;
  });
  ctx.restore();
  return canvas;
}

function generateChalk(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2, baseR = SIZE * 0.42;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    c.beginPath();
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const jitter = 1 + (rand() - 0.5) * 0.35;
      const r = baseR * jitter;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();

    // Punch grainy holes out of the shape for a dry, textured chalk feel.
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 400; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * baseR;
      const r = rand() * 3;
      c.globalAlpha = rand() * 0.7;
      c.beginPath();
      c.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  });
  return canvas;
}

function generateInkBlot(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2, baseR = SIZE * 0.4;
  // Smooth organic blob via low-frequency sine perturbation instead of pure
  // per-vertex jitter, so the edge looks fluid rather than spiky.
  const freqA = 3 + Math.floor(rand() * 2);
  const freqB = 5 + Math.floor(rand() * 3);
  const phaseA = rand() * Math.PI * 2;
  const phaseB = rand() * Math.PI * 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    c.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const wobble = Math.sin(angle * freqA + phaseA) * 0.12 + Math.sin(angle * freqB + phaseB) * 0.08;
      const r = baseR * (1 + wobble);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
  });
  return canvas;
}

function generateFoliage(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * SIZE * 0.32;
      const leafAngle = rand() * Math.PI * 2;
      const w = 14 + rand() * 22;
      const h = w * (0.4 + rand() * 0.3);
      c.save();
      c.translate(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
      c.rotate(leafAngle);
      c.beginPath();
      c.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  });
  return canvas;
}

function generateStipple(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    const count = 220;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * SIZE * 0.45; // even areal density
      const r = 1.5 + rand() * 2.5;
      c.globalAlpha = 0.6 + rand() * 0.4;
      c.beginPath();
      c.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  });
  return canvas;
}

function generateWatercolor(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    // Several overlapping soft, offset gradient blobs -> uneven "bleed" wash.
    const blobs = 6;
    for (let i = 0; i < blobs; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * SIZE * 0.12;
      const r = SIZE * (0.28 + rand() * 0.16);
      const bx = cx + Math.cos(angle) * dist;
      const by = cy + Math.sin(angle) * dist;
      const gradient = c.createRadialGradient(bx, by, 0, bx, by, r);
      gradient.addColorStop(0, `rgba(0,0,0,${0.35 + rand() * 0.25})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gradient;
      c.beginPath();
      c.arc(bx, by, r, 0, Math.PI * 2);
      c.fill();
    }
  });
  return canvas;
}

function generateStarSparkle(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;

  function drawStar(c: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const outer = size, inner = size * 0.28;
      const ox = Math.cos(a) * outer, oy = Math.sin(a) * outer;
      const ia = a + Math.PI / 4;
      const ix = Math.cos(ia) * inner, iy = Math.sin(ia) * inner;
      if (i === 0) c.moveTo(ox, oy); else c.lineTo(ox, oy);
      c.lineTo(ix, iy);
    }
    c.closePath();
    c.fill();
    c.restore();
  }

  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    drawStar(c, cx, cy, SIZE * 0.32, rand() * Math.PI);
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * SIZE * 0.42;
      drawStar(c, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 6 + rand() * 14, rand() * Math.PI);
    }
  });
  return canvas;
}

function generateCrosshatch(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2, radius = SIZE * 0.44;
  paintAsWhiteMask(ctx, (c) => {
    c.strokeStyle = '#000';
    c.lineCap = 'round';
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * radius * 0.8;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const lineAngle = rand() * Math.PI;
      const len = 10 + rand() * 20;
      c.lineWidth = 1 + rand() * 1.5;
      c.globalAlpha = 0.5 + rand() * 0.5;
      c.beginPath();
      c.moveTo(x - Math.cos(lineAngle) * len / 2, y - Math.sin(lineAngle) * len / 2);
      c.lineTo(x + Math.cos(lineAngle) * len / 2, y + Math.sin(lineAngle) * len / 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  });
  return canvas;
}

function generateOilBristles(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    // Base wash
    c.beginPath();
    c.arc(cx, cy, SIZE * 0.45, 0, Math.PI * 2);
    c.globalAlpha = 0.3;
    c.fill();
    // Bristle streaks
    c.globalAlpha = 0.8;
    const bristleCount = 40 + rand() * 20;
    for (let i = 0; i < bristleCount; i++) {
      const offsetX = (rand() - 0.5) * SIZE * 0.7;
      const offsetY = (rand() - 0.5) * SIZE * 0.7;
      const length = SIZE * 0.6 + rand() * SIZE * 0.4;
      const thickness = 1 + rand() * 4;
      
      c.beginPath();
      c.ellipse(cx + offsetX, cy + offsetY, thickness, length / 2, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  });
  return canvas;
}

function generateCharcoalBlock(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  paintAsWhiteMask(ctx, (c) => {
    // Solid block
    c.fillStyle = '#000';
    const margin = SIZE * 0.1;
    c.fillRect(margin, margin, SIZE - margin * 2, SIZE - margin * 2);
    
    // Punch out grainy holes
    c.globalCompositeOperation = 'destination-out';
    const count = 1000;
    for (let i = 0; i < count; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const r = rand() * 4;
      c.globalAlpha = rand() * 0.9;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    
    // Rough up the edges
    for (let i = 0; i < 200; i++) {
      const isTopBottom = rand() > 0.5;
      const x = isTopBottom ? rand() * SIZE : (rand() > 0.5 ? margin : SIZE - margin);
      const y = isTopBottom ? (rand() > 0.5 ? margin : SIZE - margin) : rand() * SIZE;
      const r = rand() * 12;
      c.globalAlpha = 0.8 + rand() * 0.2;
      c.beginPath();
      c.arc(x + (rand() - 0.5) * 10, y + (rand() - 0.5) * 10, r, 0, Math.PI * 2);
      c.fill();
    }
    
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  });
  return canvas;
}

function generateCloud(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    const blobs = 15;
    for (let i = 0; i < blobs; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * Math.sqrt(rand()) * SIZE * 0.25;
      const r = SIZE * (0.2 + rand() * 0.2);
      const bx = cx + Math.cos(angle) * dist;
      const by = cy + Math.sin(angle) * dist;
      
      const gradient = c.createRadialGradient(bx, by, 0, bx, by, r);
      gradient.addColorStop(0, `rgba(0,0,0,${0.15 + rand() * 0.15})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gradient;
      c.beginPath();
      c.arc(bx, by, r, 0, Math.PI * 2);
      c.fill();
    }
  });
  return canvas;
}

function generateCalligraphy(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    c.save();
    c.translate(cx, cy);
    c.rotate(-Math.PI / 4); // 45 degree angle typical for calligraphy
    c.beginPath();
    // A sharp ellipse
    c.ellipse(0, 0, SIZE * 0.45, SIZE * 0.08, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
  return canvas;
}

function generateFur(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    const strands = 60;
    for (let i = 0; i < strands; i++) {
      const offsetX = (rand() - 0.5) * SIZE * 0.5;
      const offsetY = (rand() - 0.5) * SIZE * 0.5;
      const length = SIZE * 0.4 + rand() * SIZE * 0.2;
      const thickness = 1.5 + rand() * 2;
      const angle = (rand() - 0.5) * 0.2; // Slight splay
      
      c.save();
      c.translate(cx + offsetX, cy + offsetY);
      c.rotate(angle);
      
      // Draw tapered strand
      c.beginPath();
      c.moveTo(0, -length / 2);
      c.quadraticCurveTo(thickness, 0, 0, length / 2);
      c.quadraticCurveTo(-thickness, 0, 0, -length / 2);
      c.fill();
      
      c.restore();
    }
  });
  return canvas;
}

function generateSponge(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2, baseR = SIZE * 0.45;
  paintAsWhiteMask(ctx, (c) => {
    // Solid base
    c.fillStyle = '#000';
    c.beginPath();
    c.arc(cx, cy, baseR, 0, Math.PI * 2);
    c.fill();
    
    // Punch out cellular holes
    c.globalCompositeOperation = 'destination-out';
    const count = 150;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * baseR * 1.1;
      const r = 2 + rand() * 15;
      
      c.globalAlpha = 0.4 + rand() * 0.6;
      c.beginPath();
      c.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, r, 0, Math.PI * 2);
      c.fill();
    }
    
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  });
  return canvas;
}

function generateHalftone(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const cx = SIZE / 2, cy = SIZE / 2, maxR = SIZE * 0.45;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    const dotSpacing = 24;
    const maxDotSize = 9;
    
    // Create a circular clipping mask to keep the brush round
    c.beginPath();
    c.arc(cx, cy, maxR, 0, Math.PI * 2);
    c.clip();

    for (let y = 0; y < SIZE; y += dotSpacing) {
      for (let x = 0; x < SIZE; x += dotSpacing) {
        // Offset every other row for a hex grid (halftone style)
        const rowOffset = (Math.floor(y / dotSpacing) % 2) * (dotSpacing / 2);
        const px = x + rowOffset;
        const py = y;
        
        // Dots get slightly smaller towards the edges for a softer brush stroke edge
        const distToCenter = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
        const normalizedDist = Math.max(0, 1 - (distToCenter / maxR));
        
        // Easing function so it doesn't fade too quickly
        const sizeMultiplier = Math.pow(normalizedDist, 0.5);
        const r = maxDotSize * sizeMultiplier;
        
        if (r > 0.5) {
          c.beginPath();
          c.arc(px, py, r, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  });
  return canvas;
}

function generateHexagons(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const cx = SIZE / 2, cy = SIZE / 2, maxR = SIZE * 0.48;
  
  function drawHexagon(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    // Cut out inner hexagon to make lines
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = x + Math.cos(angle) * (r - 4);
      const py = y + Math.sin(angle) * (r - 4);
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'source-over';
  }

  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    
    // Circular clip
    c.beginPath();
    c.arc(cx, cy, maxR, 0, Math.PI * 2);
    c.clip();

    const hexRadius = 20;
    const hexHeight = hexRadius * Math.sqrt(3);
    const hexWidth = hexRadius * 2;
    const vertDist = hexHeight;
    const horizDist = hexWidth * 0.75;

    for (let y = -2; y < SIZE / vertDist + 2; y++) {
      for (let x = -2; x < SIZE / horizDist + 2; x++) {
        const px = x * horizDist;
        const offset = (Math.abs(x) % 2) * (vertDist / 2);
        const py = y * vertDist + offset;
        drawHexagon(c, px, py, hexRadius - 2); // -2 leaves a gap between hexes
      }
    }
  });
  return canvas;
}

function generateGraphite(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2, maxR = SIZE * 0.45;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    // Circular bounds
    c.beginPath();
    c.arc(cx, cy, maxR, 0, Math.PI * 2);
    c.clip();

    // Fill with dense, low opacity fine grain
    const count = 4000;
    for (let i = 0; i < count; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const r = 0.5 + rand() * 1.5;
      c.globalAlpha = 0.1 + rand() * 0.3;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  });
  return canvas;
}

function generateFineLiner(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2, r = SIZE * 0.45;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    c.beginPath();
    // Solid circle but slightly ragged edge for ink bleed
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const jitter = 1 + (rand() - 0.5) * 0.05;
      const px = cx + Math.cos(angle) * (r * jitter);
      const py = cy + Math.sin(angle) * (r * jitter);
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
  });
  return canvas;
}

function generateWetWatercolor(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    const blobs = 20;
    for (let i = 0; i < blobs; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * SIZE * 0.25;
      const r = SIZE * (0.15 + rand() * 0.25);
      const bx = cx + Math.cos(angle) * dist;
      const by = cy + Math.sin(angle) * dist;
      
      const gradient = c.createRadialGradient(bx, by, r * 0.1, bx, by, r);
      gradient.addColorStop(0, `rgba(0,0,0,${0.05 + rand() * 0.1})`); // Very transparent
      gradient.addColorStop(0.8, `rgba(0,0,0,${0.15 + rand() * 0.1})`); // Darker at edges (watercolor pooling effect)
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      c.fillStyle = gradient;
      c.beginPath();
      c.arc(bx, by, r, 0, Math.PI * 2);
      c.fill();
    }
  });
  return canvas;
}

function generateGrass(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    const blades = 25;
    for (let i = 0; i < blades; i++) {
      const offsetX = (rand() - 0.5) * SIZE * 0.6;
      const offsetY = (rand() - 0.5) * SIZE * 0.6;
      const height = SIZE * 0.2 + rand() * SIZE * 0.25;
      const width = 4 + rand() * 6;
      
      c.save();
      c.translate(cx + offsetX, cy + offsetY + height/2); // anchor bottom
      // Slightly lean grass
      c.rotate((rand() - 0.5) * 0.8);
      
      c.beginPath();
      c.moveTo(-width/2, 0); // Bottom left
      c.quadraticCurveTo(-width, -height/2, 0, -height); // Top point
      c.quadraticCurveTo(width, -height/2, width/2, 0); // Bottom right
      c.closePath();
      c.fill();
      
      c.restore();
    }
  });
  return canvas;
}

function generateMagicGlint(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    const count = 15;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * SIZE * 0.4;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const r = 5 + rand() * 25;
      
      c.save();
      c.translate(px, py);
      c.rotate(rand() * Math.PI);
      
      c.beginPath();
      c.moveTo(0, -r);
      c.quadraticCurveTo(r * 0.1, -r * 0.1, r, 0);
      c.quadraticCurveTo(r * 0.1, r * 0.1, 0, r);
      c.quadraticCurveTo(-r * 0.1, r * 0.1, -r, 0);
      c.quadraticCurveTo(-r * 0.1, -r * 0.1, 0, -r);
      c.fill();
      
      c.restore();
    }
  });
  return canvas;
}

function generateConcrete(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = blankMask();
  const rand = mulberry32(seed);
  const cx = SIZE / 2, cy = SIZE / 2, maxR = SIZE * 0.48;
  paintAsWhiteMask(ctx, (c) => {
    c.fillStyle = '#000';
    c.beginPath();
    c.arc(cx, cy, maxR, 0, Math.PI * 2);
    c.clip();
    
    // Fill background solid
    c.fillRect(0, 0, SIZE, SIZE);
    
    // Punch out large gouges
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const r = 5 + rand() * 25;
      c.globalAlpha = 0.5 + rand() * 0.5;
      c.beginPath();
      c.ellipse(x, y, r, r * (0.3 + rand() * 0.7), rand() * Math.PI, 0, Math.PI * 2);
      c.fill();
    }
    
    // Punch out tiny grit
    for (let i = 0; i < 800; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const r = rand() * 4;
      c.globalAlpha = rand() * 0.9;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  });
  return canvas;
}

interface BuiltinBrushDef {
  id: string;
  name: string;
  seed: number;
  generate: (seed: number) => HTMLCanvasElement;
}

const BUILTIN_DEFS: BuiltinBrushDef[] = [
  { id: 'builtin-splatter', name: 'Splatter', seed: 1, generate: generateSplatter },
  { id: 'builtin-spray', name: 'Spray', seed: 2, generate: generateSpray },
  { id: 'builtin-grunge', name: 'Grunge', seed: 3, generate: generateGrunge },
  { id: 'builtin-chalk', name: 'Chalk', seed: 4, generate: generateChalk },
  { id: 'builtin-ink', name: 'Ink Blot', seed: 5, generate: generateInkBlot },
  { id: 'builtin-foliage', name: 'Foliage', seed: 6, generate: generateFoliage },
  { id: 'builtin-stipple', name: 'Stipple', seed: 7, generate: generateStipple },
  { id: 'builtin-watercolor', name: 'Watercolor', seed: 8, generate: generateWatercolor },
  { id: 'builtin-sparkle', name: 'Sparkle', seed: 9, generate: generateStarSparkle },
  { id: 'builtin-crosshatch', name: 'Crosshatch', seed: 10, generate: generateCrosshatch },
  { id: 'builtin-oil', name: 'Oil Bristles', seed: 11, generate: generateOilBristles },
  { id: 'builtin-charcoal', name: 'Charcoal Block', seed: 12, generate: generateCharcoalBlock },
  { id: 'builtin-cloud', name: 'Cloud/Smoke', seed: 13, generate: generateCloud },
  { id: 'builtin-calligraphy', name: 'Calligraphy', seed: 14, generate: generateCalligraphy },
  { id: 'builtin-fur', name: 'Fur/Hair', seed: 15, generate: generateFur },
  { id: 'builtin-sponge', name: 'Sponge', seed: 16, generate: generateSponge },
  { id: 'builtin-halftone', name: 'Halftone', seed: 17, generate: generateHalftone },
  { id: 'builtin-hexagons', name: 'Sci-Fi Hexagons', seed: 18, generate: generateHexagons },
  { id: 'builtin-graphite', name: 'Graphite Pencil', seed: 19, generate: generateGraphite },
  { id: 'builtin-fineliner', name: 'Fine Liner', seed: 20, generate: generateFineLiner },
  { id: 'builtin-wet-watercolor', name: 'Wet Watercolor', seed: 21, generate: generateWetWatercolor },
  { id: 'builtin-grass', name: 'Grass', seed: 22, generate: generateGrass },
  { id: 'builtin-magic-glint', name: 'Magic Glint', seed: 23, generate: generateMagicGlint },
  { id: 'builtin-concrete', name: 'Concrete Grind', seed: 24, generate: generateConcrete },
];

/** Builds the built-in brush library. Client-only (uses document/canvas). */
export function createBuiltinBrushLibrary(): CustomBrushTexture[] {
  return BUILTIN_DEFS.map((def) => {
    const canvas = def.generate(def.seed);
    return {
      id: def.id,
      name: def.name,
      canvas,
      thumbnail: canvas.toDataURL('image/png'),
      builtin: true,
    };
  });
}
