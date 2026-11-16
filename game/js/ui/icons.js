// Procedural icons for upgrade cards and the HUD, drawn with paths so the game ships no image files.

import { TAU } from '../core/mathx.js';

export function drawIcon(ctx, kind, x, y, s, color = '#ffd27a') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 40, s / 40);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  (ICONS[kind] || ICONS.lens)(ctx);
  ctx.restore();
}

const ICONS = {
  lens(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 18, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(14, i * 7);
      ctx.lineTo(20, i * 11);
      ctx.stroke();
    }
  },
  mirror(ctx) {
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(20, -18);
    ctx.lineTo(20, 18);
    ctx.closePath();
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-12, 0, 6, 0, TAU);
    ctx.fill();
  },
  oil(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(14, -2, 14, 16, 0, 16);
    ctx.bezierCurveTo(-14, 16, -14, -2, 0, -18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(-5, 5, 3, 6, 0.4, 0, TAU);
    ctx.fill();
  },
  wick(ctx) {
    for (const dx of [-8, 8]) {
      ctx.beginPath();
      ctx.moveTo(dx, -18);
      ctx.bezierCurveTo(dx + 9, -6, dx + 7, 4, dx, 4);
      ctx.bezierCurveTo(dx - 7, 4, dx - 9, -6, dx, -18);
      ctx.fill();
    }
    ctx.fillRect(-16, 8, 32, 8);
  },
  flare(ctx) {
    ctx.beginPath();
    ctx.arc(0, -4, 7, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 11, -4 + Math.sin(a) * 11);
      ctx.lineTo(Math.cos(a) * 18, -4 + Math.sin(a) * 18);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, 20);
    ctx.stroke();
  },
  stone(ctx) {
    const rows = [[-18, 6, 16], [2, 6, 16], [-10, -6, 18], [-18, -18, 14], [-2, -18, 18]];
    for (const [x, y, w] of rows) ctx.fillRect(x, y, w, 10);
  },
  bell(ctx) {
    ctx.beginPath();
    ctx.moveTo(-14, 10);
    ctx.quadraticCurveTo(-12, -16, 0, -16);
    ctx.quadraticCurveTo(12, -16, 14, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-18, 10, 36, 4);
    ctx.beginPath();
    ctx.arc(0, 17, 4, 0, TAU);
    ctx.fill();
  },
  ember(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.bezierCurveTo(16, -4, 12, 18, 0, 18);
    ctx.bezierCurveTo(-12, 18, -16, 2, -6, -6);
    ctx.bezierCurveTo(-4, 2, 2, 2, 0, -20);
    ctx.fill();
  },
  horn(ctx) {
    ctx.beginPath();
    ctx.moveTo(-18, -5);
    ctx.lineTo(4, -12);
    ctx.lineTo(4, 12);
    ctx.lineTo(-18, 5);
    ctx.closePath();
    ctx.fill();
    for (const r of [10, 17]) {
      ctx.beginPath();
      ctx.arc(4, 0, r, -0.7, 0.7);
      ctx.stroke();
    }
  },
  bolt(ctx) {
    ctx.beginPath();
    ctx.moveTo(4, -20);
    ctx.lineTo(-10, 2);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 20);
    ctx.lineTo(12, -4);
    ctx.lineTo(2, -4);
    ctx.closePath();
    ctx.fill();
  },
  tower(ctx) {
    ctx.beginPath();
    ctx.moveTo(-8, 18);
    ctx.lineTo(-5, -8);
    ctx.lineTo(5, -8);
    ctx.lineTo(8, 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-7, -16, 14, 7);
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.lineTo(0, -22);
    ctx.lineTo(8, -16);
    ctx.fill();
  },
  ship(ctx) {
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(18, 4);
    ctx.lineTo(12, 14);
    ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(2, -18);
    ctx.lineTo(14, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, -16);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();
  },
  moon(ctx) {
    // crescent: the outer disc's left edge, closed by an inner arc running back
    ctx.beginPath();
    ctx.arc(0, 0, 14, -1.1, 1.1, true);
    ctx.arc(7, 0, 11, 1.45, -1.45, false);
    ctx.closePath();
    ctx.fill();
  },
  sun(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
      ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.stroke();
    }
  },
};
