/**
 * Helper to render the creator attribution tag in the top-left corner of exported canvases and videos.
 * Matches the site's signature glassmorphic CreatorBadge style.
 */

export interface CreatorTagOptions {
  tagText: string;
  avatarUrl?: string;
  x?: number;
  y?: number;
  scale?: number;
}

export function drawCreatorTagOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: CreatorTagOptions
) {
  const {
    tagText,
    avatarUrl,
    x = 16,
    y = 16,
    scale = 1,
  } = options;

  if (!tagText) return;

  const formattedTag = tagText.startsWith('@') ? tagText : `@${tagText}`;

  ctx.save();

  const pillHeight = Math.round(30 * scale);
  const fontSize = Math.max(10, Math.round(12 * scale));
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const textWidth = ctx.measureText(formattedTag).width;
  const avatarDiameter = pillHeight - Math.round(4 * scale);
  const pillWidth = avatarDiameter + textWidth + Math.round(22 * scale);
  const radius = pillHeight / 2;

  // Outer shadow for contrast against light or dark footage
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 10 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3 * scale;

  // Glass pill background
  ctx.beginPath();
  ctx.roundRect(x, y, pillWidth, pillHeight, radius);
  ctx.fillStyle = 'rgba(12, 10, 22, 0.82)';
  ctx.fill();

  // Glass pill border
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.stroke();

  // Creator Avatar Circle
  const circleX = x + Math.round(2 * scale);
  const circleY = y + Math.round(2 * scale);

  ctx.save();
  ctx.beginPath();
  ctx.arc(circleX + avatarDiameter / 2, circleY + avatarDiameter / 2, avatarDiameter / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Vibrant gradient background
  const grad = ctx.createLinearGradient(circleX, circleY, circleX + avatarDiameter, circleY + avatarDiameter);
  grad.addColorStop(0, '#9333ea');
  grad.addColorStop(1, '#4f46e5');
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw initial letter
  const initial = (formattedTag.replace(/^@/, '').charAt(0) || 'A').toUpperCase();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, circleX + avatarDiameter / 2, circleY + avatarDiameter / 2 + 0.5);

  ctx.restore();

  // Creator Handle Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(formattedTag, x + avatarDiameter + Math.round(10 * scale), y + pillHeight / 2);

  ctx.restore();
}
