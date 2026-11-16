// The sea: depth gradient, rolling wave lines that swell toward the shore, and the reefs ships must avoid.

import { W, H, HORIZON, REEFS } from '../world/layout.js';
import { PALETTE } from '../core/palette.js';
import { TAU, hash01 } from '../core/mathx.js';

export function drawSea(ctx, session) {
  const t = session.time;
  const grad = ctx.createLinearGradient(0, HORIZON, 0, H);
  grad.addColorStop(0, session.dawn > 0 ? blendSea(session.dawn) : PALETTE.seaFar);
  grad.addColorStop(1, PALETTE.seaNear);
  ctx.fillStyle = grad;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  // horizon glint
  ctx.fillStyle = `rgba(160, 190, 255, ${0.18 + session.weather.flash * 0.5})`;
  ctx.fillRect(0, HORIZON, W, 1.5);

  // wave rows: perspective spacing, bigger and faster nearer the tower
  for (let row = 0; row < 26; row++) {
    const depth = row / 25;
    const y = HORIZON + 8 + Math.pow(depth, 1.6) * (H - HORIZON - 10);
    const amp = 1.5 + depth * 7;
    const len = 60 + depth * 160;
    const speed = 12 + depth * 30;
    ctx.strokeStyle = `rgba(120, 185, 225, ${0.08 + depth * 0.16})`;
    ctx.lineWidth = 0.8 + depth * 1.6;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 16) {
      const phase = (x + t * speed * (row % 2 ? 1 : -1)) / len;
      const yy = y + Math.sin(phase * TAU + row) * amp + Math.sin(phase * 2.7 + row * 3) * amp * 0.4;
      x === -20 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  drawReefs(ctx, session);
}

function blendSea(dawn) {
  const r = Math.round(12 + dawn * 70);
  const g = Math.round(32 + dawn * 50);
  const b = Math.round(54 + dawn * 40);
  return `rgb(${r}, ${g}, ${b})`;
}

export function drawReefs(ctx, session) {
  const t = session.time;
  for (let i = 0; i < REEFS.length; i++) {
    const r = REEFS[i];
    // foam ring
    ctx.strokeStyle = `rgba(210, 240, 255, ${0.25 + 0.15 * Math.sin(t * 2 + i)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y + 6, r.r * 1.5 + Math.sin(t * 1.7 + i) * 3, r.r * 0.42, 0, 0, TAU);
    ctx.stroke();
    // jagged rocks
    ctx.fillStyle = PALETTE.rock;
    ctx.strokeStyle = PALETTE.rockEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const peaks = 7;
    ctx.moveTo(r.x - r.r * 1.3, r.y + 6);
    for (let p = 0; p <= peaks; p++) {
      const px = r.x - r.r * 1.3 + (p / peaks) * r.r * 2.6;
      const h = (p % 2 ? 0.35 : 1) * r.r * (0.7 + hash01(i * 10 + p) * 0.6);
      ctx.lineTo(px, r.y + 4 - h);
    }
    ctx.lineTo(r.x + r.r * 1.3, r.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** Shore surf against the island, drawn above the creatures that crawl in from the sea. */
export function drawShoreFoam(ctx, session) {
  const t = session.time;
  ctx.strokeStyle = PALETTE.foam;
  ctx.lineWidth = 2.5;
  for (let k = 0; k < 3; k++) {
    const swell = (t * 0.6 + k / 3) % 1;
    ctx.globalAlpha = (1 - swell) * 0.6;
    ctx.beginPath();
    ctx.ellipse(640, 712, 300 + swell * 70, 96 + swell * 24, 0, Math.PI, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
