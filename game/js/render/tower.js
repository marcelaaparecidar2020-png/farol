// The island and the lighthouse: banded tower, gallery, lamp room, and cracks that spread as it is struck.

import { PALETTE } from '../core/palette.js';
import { LAMP, H } from '../world/layout.js';
import { hash01, TAU } from '../core/mathx.js';
import { drawGlow } from './glow.js';

const BASE_Y = 628;
const TOP_Y = 486;
const BASE_HALF = 40;
const TOP_HALF = 26;

const halfAt = (y) => TOP_HALF + ((y - TOP_Y) / (BASE_Y - TOP_Y)) * (BASE_HALF - TOP_HALF);

export function drawIsland(ctx) {
  ctx.fillStyle = PALETTE.rock;
  ctx.strokeStyle = PALETTE.rockEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(380, H);
  const pts = [[430, 676], [478, 650], [520, 640], [560, 622], [600, 616], [680, 614], [722, 622], [770, 640], [812, 652], [858, 678], [900, H]];
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // boulders
  ctx.fillStyle = '#0e1524';
  for (let i = 0; i < 9; i++) {
    const x = 450 + hash01(i * 2.9) * 380;
    const y = 660 + hash01(i * 7.3) * 50;
    ctx.beginPath();
    ctx.ellipse(x, y, 16 + hash01(i) * 22, 9 + hash01(i * 3) * 8, 0, 0, TAU);
    ctx.fill();
  }
  // keeper's cottage
  ctx.fillStyle = '#1b2232';
  ctx.fillRect(706, 596, 60, 30);
  ctx.fillStyle = '#2a1a1c';
  ctx.beginPath();
  ctx.moveTo(700, 598);
  ctx.lineTo(736, 574);
  ctx.lineTo(772, 598);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffcf7a';
  ctx.fillRect(718, 606, 9, 9);
  ctx.fillRect(744, 606, 9, 9);
}

export function drawTower(ctx, session) {
  const k = session.keeper;
  const damage = 1 - k.integrity / k.integrityMax;

  // body with bands
  for (let y = TOP_Y; y < BASE_Y; y += 2) {
    const band = Math.floor((y - TOP_Y) / 28) % 2 === 1;
    const hw = halfAt(y);
    const grad = ctx.createLinearGradient(LAMP.x - hw, 0, LAMP.x + hw, 0);
    const lightC = band ? PALETTE.towerBand : PALETTE.towerLight;
    grad.addColorStop(0, PALETTE.towerShade);
    grad.addColorStop(0.35, lightC);
    grad.addColorStop(1, PALETTE.towerShade);
    ctx.fillStyle = grad;
    ctx.fillRect(LAMP.x - hw, y, hw * 2, 2.2);
  }
  // door and window
  ctx.fillStyle = '#120d10';
  ctx.beginPath();
  ctx.moveTo(LAMP.x - 10, BASE_Y);
  ctx.lineTo(LAMP.x - 10, BASE_Y - 22);
  ctx.arc(LAMP.x, BASE_Y - 22, 10, Math.PI, 0);
  ctx.lineTo(LAMP.x + 10, BASE_Y);
  ctx.fill();
  ctx.fillStyle = k.outage > 0 ? '#1a1410' : '#ffcf7a';
  ctx.fillRect(LAMP.x - 4, 538, 8, 12);

  // cracks grow with damage
  if (damage > 0.05) {
    ctx.strokeStyle = 'rgba(10, 6, 8, 0.85)';
    ctx.lineWidth = 1.6;
    const cracks = Math.ceil(damage * 9);
    for (let c = 0; c < cracks; c++) {
      let x = LAMP.x + (hash01(c * 5.1) - 0.5) * 50;
      let y = BASE_Y - 4 - hash01(c * 2.3) * 120;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += (hash01(c * 9 + s) - 0.5) * 16;
        y -= 6 + hash01(c * 3 + s) * 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // gallery
  ctx.fillStyle = '#20232f';
  ctx.fillRect(LAMP.x - 40, TOP_Y - 6, 80, 8);
  ctx.strokeStyle = '#3a3f52';
  ctx.lineWidth = 1.5;
  for (let x = -36; x <= 36; x += 8) {
    ctx.beginPath();
    ctx.moveTo(LAMP.x + x, TOP_Y - 6);
    ctx.lineTo(LAMP.x + x, TOP_Y - 18);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(LAMP.x - 38, TOP_Y - 18);
  ctx.lineTo(LAMP.x + 38, TOP_Y - 18);
  ctx.stroke();

  // lamp room
  const lit = k.outage > 0 ? 0 : 1;
  ctx.fillStyle = lit ? PALETTE.lampGlass : '#2a2a30';
  ctx.fillRect(LAMP.x - 22, LAMP.y - 26, 44, 46);
  ctx.strokeStyle = '#1b1d26';
  ctx.lineWidth = 3;
  for (const x of [-22, -7, 8, 22]) {
    ctx.beginPath();
    ctx.moveTo(LAMP.x + x, LAMP.y - 26);
    ctx.lineTo(LAMP.x + x, LAMP.y + 20);
    ctx.stroke();
  }
  // roof
  ctx.fillStyle = '#2b1416';
  ctx.beginPath();
  ctx.moveTo(LAMP.x - 30, LAMP.y - 26);
  ctx.lineTo(LAMP.x, LAMP.y - 58);
  ctx.lineTo(LAMP.x + 30, LAMP.y - 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#20232f';
  ctx.beginPath();
  ctx.arc(LAMP.x, LAMP.y - 60, 4, 0, TAU);
  ctx.fill();

}

/** The lamp's own blaze, drawn above the darkness. */
export function drawLampBlaze(ctx, session) {
  const k = session.keeper;
  ctx.globalCompositeOperation = 'lighter';
  if (k.hurtFlash > 0) drawGlow(ctx, '#ff3b3b', LAMP.x, 560, 120, k.hurtFlash * 0.7);
  if (k.outage > 0) {
    ctx.globalCompositeOperation = 'source-over';
    return;
  }
  const pulse = 1 + 0.06 * Math.sin(session.time * 7);
  drawGlow(ctx, '#ffd27a', LAMP.x, LAMP.y, 90 * pulse, 0.85);
  drawGlow(ctx, '#ffffff', LAMP.x, LAMP.y, 24 + k.focusLevel * 10, 1);
  ctx.globalCompositeOperation = 'source-over';
}


