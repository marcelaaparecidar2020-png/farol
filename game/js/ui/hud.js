// The heads-up display: night and dawn clock, score and combo, tower, oil, flares, foghorn, ships, and the
// night's opening banner.

import { PALETTE } from '../core/palette.js';
import { ROMAN, formatTime, clamp, TAU } from '../core/mathx.js';
import { NIGHTS } from '../game/nights.js';
import { comboMultiplier } from '../game/scoring.js';
import { W, H } from '../world/layout.js';
import { text, panel, bar, keycap, FONT_TITLE } from './draw.js';
import { drawIcon } from './icons.js';

export function drawHud(ctx, session, pointer) {
  drawNightClock(ctx, session);
  drawOmenChip(ctx, session);
  drawScore(ctx, session);
  drawTowerPanel(ctx, session);
  drawShipTally(ctx, session);
  if (session.boss) drawBossBar(ctx, session);
  drawLowIntegrityVignette(ctx, session);
  if (pointer) drawReticle(ctx, session, pointer);
}

function drawNightClock(ctx, session) {
  const night = NIGHTS[session.night - 1];
  panel(ctx, 16, 14, 300, 74);
  text(ctx, `NIGHT ${ROMAN[session.night]}`, 32, 38, { size: 26, weight: 900, font: FONT_TITLE, color: '#ffe3a6', spacing: 2 });
  text(ctx, night.title, 32, 66, { size: 15, weight: 600, color: PALETTE.hudDim });
  if (night.duration) {
    const frac = clamp(session.nightTime / night.duration, 0, 1);
    const left = session.phase === 'night' ? night.duration - session.nightTime : 0;
    text(ctx, left > 0 ? `DAWN IN ${formatTime(left)}` : 'DAWN', 300, 38, { size: 14, weight: 800, align: 'right', color: '#ffcf9a' });
    drawIcon(ctx, 'moon', 186, 66, 16, '#c9d6ff');
    bar(ctx, 198, 61, 92, 9, frac, '#ff9a6b');
    drawIcon(ctx, 'sun', 304, 66, 14, '#ffb070');
  } else {
    text(ctx, 'no dawn until it falls', 300, 66, { size: 13, weight: 800, align: 'right', color: '#ff8a8a' });
  }
}

/** Tonight's omen, under the clock, so the bent rule is never forgotten mid-night. */
function drawOmenChip(ctx, session) {
  const omen = session.omen;
  if (!omen || omen.id === 'calm') return;
  panel(ctx, 16, 94, 300, 30, { fill: 'rgba(30, 12, 26, 0.72)', border: 'rgba(255, 140, 160, 0.35)' });
  drawIcon(ctx, omen.icon, 34, 109, 16, '#ffb3c0');
  text(ctx, omen.name.toUpperCase(), 50, 110, { size: 13, weight: 900, color: '#ffd0d8', spacing: 1 });
  const tag = omen.scoreMul ? `SCORE ×${omen.scoreMul}` : omen.id === 'convoy' ? 'CONVOY' : omen.id === 'flotsam' ? `${session.stats.salvaged} SALVAGED` : '';
  if (tag) text(ctx, tag, 304, 110, { size: 12, weight: 900, align: 'right', color: '#ffe08a' });
}

function drawScore(ctx, session) {
  const st = session.stats;
  panel(ctx, W - 276, 14, 260, 74);
  text(ctx, 'SCORE', W - 260, 34, { size: 13, weight: 800, color: PALETTE.hudDim, spacing: 2 });
  text(ctx, st.score.toLocaleString('en-US'), W - 30, 46, { size: 34, weight: 900, align: 'right', color: '#fff4dc' });
  if (st.combo > 1) {
    const mult = comboMultiplier(st);
    const hot = mult >= 3 ? '#ff8ad8' : mult >= 2 ? '#ffd36b' : '#cfe8ff';
    text(ctx, `${st.combo} BURNED  ×${mult}`, W - 260, 70, { size: 15, weight: 900, color: hot });
    bar(ctx, W - 110, 66, 80, 7, st.comboTimer / st.comboWindow, hot);
  } else {
    text(ctx, `${st.kills} creatures burned`, W - 260, 70, { size: 14, weight: 600, color: PALETTE.hudDim });
  }
}

function drawTowerPanel(ctx, session) {
  const k = session.keeper;
  const x = 16;
  const y = H - 112;
  panel(ctx, x, y, 330, 96);
  drawIcon(ctx, 'tower', x + 22, y + 24, 22, PALETTE.integrity);
  text(ctx, 'TOWER', x + 40, y + 24, { size: 13, weight: 900, color: PALETTE.hudDim, spacing: 1 });
  bar(ctx, x + 102, y + 18, 180, 12, k.integrity / k.integrityMax, PALETTE.integrity);
  text(ctx, `${Math.ceil(k.integrity)}`, x + 316, y + 24, { size: 14, weight: 900, align: 'right' });

  drawIcon(ctx, 'oil', x + 22, y + 50, 20, PALETTE.oil);
  text(ctx, 'OIL', x + 40, y + 50, { size: 13, weight: 900, color: PALETTE.hudDim, spacing: 1 });
  bar(ctx, x + 102, y + 44, 180, 12, k.oil / k.oilMax, k.oil < 15 ? '#ff7a4a' : PALETTE.oil);
  text(ctx, `${Math.floor(k.oil)}`, x + 316, y + 50, { size: 14, weight: 900, align: 'right' });

  drawIcon(ctx, 'flare', x + 22, y + 76, 18, PALETTE.flare);
  text(ctx, 'FLARES', x + 40, y + 76, { size: 13, weight: 900, color: PALETTE.hudDim, spacing: 1 });
  for (let i = 0; i < k.flaresMax; i++) {
    ctx.beginPath();
    ctx.arc(x + 112 + i * 20, y + 76, 7, 0, TAU);
    ctx.fillStyle = i < k.flares ? PALETTE.flare : 'rgba(255,255,255,0.12)';
    ctx.fill();
  }
  if (k.flares < k.flaresMax) {
    ctx.beginPath();
    ctx.arc(x + 112 + k.flares * 20, y + 76, 7, -Math.PI / 2, -Math.PI / 2 + TAU * (k.flareTimer / k.flareRecharge));
    ctx.strokeStyle = PALETTE.flare;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // foghorn readiness
  const hx = x + 262;
  const ready = k.foghornCd <= 0;
  drawIcon(ctx, 'horn', hx, y + 76, 18, ready ? '#bfe9ff' : 'rgba(191,233,255,0.35)');
  ctx.beginPath();
  ctx.arc(hx, y + 76, 13, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k.foghornCd / k.foghornMax));
  ctx.strokeStyle = ready ? '#bfe9ff' : 'rgba(191,233,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'SHIFT', hx + 20, y + 77, { size: 10, weight: 900, color: PALETTE.hudDim });
}

function drawShipTally(ctx, session) {
  const st = session.stats;
  const x = W - 236;
  const y = H - 64;
  panel(ctx, x, y, 220, 48);
  drawIcon(ctx, 'ship', x + 26, y + 22, 24, '#f4ead2');
  text(ctx, `${st.shipsSaved} guided home`, x + 50, y + 17, { size: 15, weight: 800, color: PALETTE.good });
  text(ctx, `${st.shipsLost} lost to the reefs`, x + 50, y + 35, { size: 13, weight: 700, color: st.shipsLost ? '#ff9a9a' : PALETTE.hudDim });
}

function drawBossBar(ctx, session) {
  const b = session.boss;
  if (b.rise <= 0.05) return;
  const w = 520;
  const x = (W - w) / 2;
  const y = 22;
  text(ctx, 'THE UNDERTOW', W / 2, y + 4, { size: 20, weight: 900, align: 'center', font: FONT_TITLE, color: '#ff8a8a', spacing: 4, glow: '#ff2b2b' });
  bar(ctx, x, y + 20, w, 12, b.hp / b.maxHp, '#ff3b4b', { back: 'rgba(0,0,0,0.55)' });
  const label = b.eyeOpen > 0.5 ? 'EYE OPEN — STRIKE NOW' : 'Wait for the eye to open';
  text(ctx, label, W / 2, y + 48, { size: 13, weight: 800, align: 'center', color: b.eyeOpen > 0.5 ? '#ffd36b' : PALETTE.hudDim });
}

function drawLowIntegrityVignette(ctx, session) {
  const k = session.keeper;
  const danger = 1 - k.integrity / k.integrityMax;
  if (danger < 0.6) return;
  const pulse = 0.5 + 0.5 * Math.sin(session.time * 6);
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  grad.addColorStop(0, 'rgba(255,0,30,0)');
  grad.addColorStop(1, `rgba(255,0,30,${(danger - 0.6) * 0.8 * (0.6 + pulse * 0.4)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawReticle(ctx, session, p) {
  const focus = session.keeper.focusLevel;
  const r = 14 - focus * 6;
  ctx.save();
  ctx.strokeStyle = focus > 0.5 ? '#ffe08a' : 'rgba(255, 240, 210, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + session.time * (0.5 + focus * 3);
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(a) * (r + 4), p.y + Math.sin(a) * (r + 4));
    ctx.lineTo(p.x + Math.cos(a) * (r + 10), p.y + Math.sin(a) * (r + 10));
    ctx.stroke();
  }
  ctx.restore();
}

/** NIGHT III / title / hint, fading in and out as each night begins. */
export function drawNightBanner(ctx, session) {
  const b = session.banner;
  if (!b || b.t > 4.2 || session.phase !== 'night') return;
  const a = b.t < 0.5 ? b.t / 0.5 : b.t > 3.4 ? 1 - (b.t - 3.4) / 0.8 : 1;
  const y = 250;
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, 'rgba(4,6,20,0)');
  grad.addColorStop(0.5, `rgba(4,6,20,${0.7 * a})`);
  grad.addColorStop(1, 'rgba(4,6,20,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, y - 70, W, b.omen ? 180 : 150);
  text(ctx, b.title, W / 2, y - 20, { size: 56, weight: 900, align: 'center', font: FONT_TITLE, color: '#ffe3a6', glow: '#ff9a3c', glowBlur: 28, spacing: 8, alpha: a });
  text(ctx, b.sub, W / 2, y + 26, { size: 22, weight: 700, align: 'center', font: FONT_TITLE, color: PALETTE.hudText, alpha: a });
  text(ctx, b.hint, W / 2, y + 58, { size: 16, weight: 700, align: 'center', color: '#bfe9ff', alpha: a });
  if (b.omen) {
    text(ctx, `OMEN · ${b.omen.name.toUpperCase()}`, W / 2, y + 88, { size: 15, weight: 900, align: 'center', color: '#ffb3c0', spacing: 2, alpha: a });
  }
}

export function drawControlsStrip(ctx, x, y) {
  let cx = x;
  const item = (key, label) => {
    cx += keycap(ctx, key, cx, y, { size: 12, minW: 24 }) + 6;
    text(ctx, label, cx, y + 1, { size: 13, weight: 700, color: PALETTE.hudDim });
    ctx.font = `700 13px "Trebuchet MS"`;
    cx += ctx.measureText(label).width + 16;
  };
  item('HOLD LMB', 'focus');
  item('RMB / SPACE', 'flare');
  item('SHIFT', 'foghorn');
  item('P', 'pause');
}
