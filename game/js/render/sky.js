// The sky: night gradient, faint stars, a drifting storm-cloud band, and the dawn that wins each night.

import { W, HORIZON } from '../world/layout.js';
import { PALETTE } from '../core/palette.js';
import { hash01, lerp } from '../core/mathx.js';
import { drawGlow } from './glow.js';

let cloudLayer = null;

function buildClouds() {
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = HORIZON + 40;
  const g = c.getContext('2d');
  for (let i = 0; i < 90; i++) {
    const x = hash01(i * 4.1) * c.width;
    const y = 20 + hash01(i * 9.3) * (HORIZON - 30);
    const rx = 80 + hash01(i * 2.2) * 180;
    const ry = 18 + hash01(i * 5.5) * 34;
    const shade = 14 + Math.floor(hash01(i * 6.6) * 22);
    g.fillStyle = `rgba(${shade}, ${shade + 6}, ${shade + 24}, 0.55)`;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    // wrap so the band tiles seamlessly while it scrolls
    g.beginPath();
    g.ellipse(x - c.width, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

export function drawSky(ctx, session) {
  if (!cloudLayer) cloudLayer = buildClouds();
  const dawn = session.dawn;
  const grad = ctx.createLinearGradient(0, 0, 0, HORIZON);
  grad.addColorStop(0, mixHex(PALETTE.skyTop, PALETTE.dawnTop, dawn));
  grad.addColorStop(1, mixHex(PALETTE.skyHorizon, PALETTE.dawnHorizon, dawn));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, HORIZON + 2);

  // stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 70; i++) {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(session.time * (0.5 + hash01(i)) + i));
    ctx.globalAlpha = tw * 0.6 * (1 - dawn);
    ctx.fillRect(hash01(i * 3.3) * W, hash01(i * 8.1) * (HORIZON - 40), 1.6, 1.6);
  }
  ctx.globalAlpha = 1;

  // moon, low over the sea, or the rising sun at dawn
  if (dawn > 0) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, '#ffb070', 640, HORIZON + 30 - dawn * 70, 260, dawn * 0.9);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(255, 220, 160, ${dawn})`;
    ctx.beginPath();
    ctx.arc(640, HORIZON + 30 - dawn * 70, 46, Math.PI, 0);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, '#9fb8ff', 1040, 78, 70, 0.35 * (1 - dawn));
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(225, 232, 255, ${0.85 * (1 - dawn)})`;
  ctx.beginPath();
  ctx.arc(1040, 78, 20, 0, Math.PI * 2);
  ctx.fill();

  // clouds scroll; lightning lights them from inside
  const offset = (session.time * 9) % W;
  ctx.globalAlpha = 1 - dawn * 0.6;
  ctx.drawImage(cloudLayer, -offset, 0, W * 2, HORIZON + 40);
  ctx.globalAlpha = 1;
  if (session.weather.flash > 0) {
    ctx.fillStyle = `rgba(190, 210, 255, ${session.weather.flash * 0.45})`;
    ctx.fillRect(0, 0, W, HORIZON);
  }
}
