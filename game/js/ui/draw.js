// Drawing helpers for the interface: text with glow, panels, bars, buttons and keycaps.

import { PALETTE } from '../core/palette.js';

export const FONT_UI = '"Trebuchet MS", "Segoe UI", sans-serif';
export const FONT_TITLE = 'Georgia, "Times New Roman", serif';

export function text(ctx, str, x, y, { size = 18, weight = 700, color = PALETTE.hudText, align = 'left', baseline = 'middle', font = FONT_UI, glow = null, glowBlur = 18, stroke = null, spacing = 0, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (stroke) {
    ctx.lineWidth = stroke.width;
    ctx.strokeStyle = stroke.color;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = glowBlur;
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function panel(ctx, x, y, w, h, { fill = PALETTE.hudPanel, border = 'rgba(255, 210, 140, 0.28)', radius = 12 } = {}) {
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function bar(ctx, x, y, w, h, frac, color, { back = 'rgba(255,255,255,0.08)', ghost = null } = {}) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  if (ghost !== null && ghost > frac) {
    roundRect(ctx, x, y, Math.max(h, w * ghost), h, h / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
  }
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, color);
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

export function keycap(ctx, label, x, y, { size = 15, minW = 30 } = {}) {
  ctx.save();
  ctx.font = `800 ${size}px ${FONT_UI}`;
  const w = Math.max(minW, ctx.measureText(label).width + 16);
  const h = size + 14;
  roundRect(ctx, x, y - h / 2, w, h, 6);
  ctx.fillStyle = 'rgba(246, 234, 210, 0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(246, 234, 210, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + 1);
  ctx.restore();
  return w;
}

export function button(ctx, rect, label, { hover = false, t = 0, primary = true } = {}) {
  const pulse = primary ? 0.5 + 0.5 * Math.sin(t * 3) : 0;
  ctx.save();
  if (primary) {
    ctx.shadowColor = 'rgba(255, 190, 90, 0.8)';
    ctx.shadowBlur = 16 + pulse * 18;
  }
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2);
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  if (primary) {
    grad.addColorStop(0, hover ? '#ffe2a0' : '#ffd27a');
    grad.addColorStop(1, hover ? '#ff9a4a' : '#e87a34');
  } else {
    grad.addColorStop(0, 'rgba(246,234,210,0.16)');
    grad.addColorStop(1, 'rgba(246,234,210,0.06)');
  }
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
  if (!primary) {
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, rect.h / 2);
    ctx.strokeStyle = 'rgba(246,234,210,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, { size: 20, weight: 900, align: 'center', color: primary ? '#2a1206' : PALETTE.hudText, spacing: 2 });
}

export const inside = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
