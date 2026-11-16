// Full screens over the living scene: the title, the dawn upgrade choice, pause, and the final results.

import { PALETTE } from '../core/palette.js';
import { ROMAN, TAU } from '../core/mathx.js';
import { W, H } from '../world/layout.js';
import { WRAITH_TYPES } from '../world/wraiths.js';
import { LAST_NIGHT } from '../game/nights.js';
import { text, panel, button, keycap, roundRect, FONT_TITLE } from './draw.js';
import { drawIcon } from './icons.js';
import { drawGlow } from '../render/glow.js';

export const TITLE_START = { x: W / 2 - 150, y: 452, w: 300, h: 58 };
export const RESULTS_AGAIN = { x: W / 2 - 170, y: 584, w: 340, h: 56 };
export const CARD_W = 300;
export const CARD_H = 290;

export function cardRects() {
  const gap = 34;
  const total = CARD_W * 3 + gap * 2;
  return [0, 1, 2].map((i) => ({ x: (W - total) / 2 + i * (CARD_W + gap), y: 268, w: CARD_W, h: CARD_H }));
}

function veil(ctx, alpha, color = '4, 6, 20') {
  ctx.fillStyle = `rgba(${color}, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function logo(ctx, x, y, size, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, '#ff9a3c', x, y, size * 2.6, 0.35 + 0.05 * Math.sin(t * 2));
  ctx.restore();
  text(ctx, 'FAROL', x, y, { size, weight: 900, align: 'center', font: FONT_TITLE, color: '#fff1cf', glow: '#ffb347', glowBlur: 40, spacing: size * 0.18, stroke: { width: 6, color: 'rgba(40, 14, 4, 0.8)' } });
  // a thin beam struck under the name
  const grad = ctx.createLinearGradient(x - 260, 0, x + 260, 0);
  grad.addColorStop(0, 'rgba(255, 200, 110, 0)');
  grad.addColorStop(0.5, 'rgba(255, 220, 150, 0.95)');
  grad.addColorStop(1, 'rgba(255, 200, 110, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 260, y + size * 0.52, 520, 3);
}

export function drawTitle(ctx, ui) {
  const t = ui.t;
  veil(ctx, 0.38);
  logo(ctx, W / 2, 170, 128, t);
  text(ctx, 'THE LAST KEEPER', W / 2, 262, { size: 26, weight: 700, align: 'center', font: FONT_TITLE, color: '#ffd9a0', spacing: 12 });
  text(ctx, 'Five stormy nights. One lamp. Burn back what climbs from the sea and guide the ships home until dawn.', W / 2, 306, { size: 17, weight: 600, align: 'center', color: PALETTE.hudText });

  // what hunts in the dark: each creature by its eyes
  const kinds = Object.entries(WRAITH_TYPES);
  const startX = W / 2 - (kinds.length * 170) / 2 + 20;
  kinds.forEach(([, def], i) => {
    const cx = startX + i * 170;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, def.eye, cx, 372, 11, 1);
    drawGlow(ctx, def.eye, cx + 14, 372, 11, 1);
    ctx.restore();
    text(ctx, def.name, cx + 26, 373, { size: 15, weight: 800, color: '#e9e0ff' });
  });
  text(ctx, 'In the dark you see only their eyes.', W / 2, 404, { size: 14, weight: 600, align: 'center', color: PALETTE.hudDim });

  button(ctx, TITLE_START, 'LIGHT THE LAMP', { hover: ui.hoverStart, t });
  text(ctx, 'click or press ENTER', W / 2, 528, { size: 13, weight: 700, align: 'center', color: PALETTE.hudDim });

  // controls card
  panel(ctx, W / 2 - 330, 560, 660, 118, { fill: 'rgba(6,10,26,0.78)' });
  const rows = [
    ['MOUSE', 'aim the beam'],
    ['HOLD LEFT', 'focus: a hotter, narrow beam that burns oil'],
    ['RIGHT / SPACE', 'flare: burst of fire where you aim'],
    ['SHIFT', 'foghorn: hurl back what reaches the rock'],
  ];
  rows.forEach(([key, label], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = W / 2 - 312 + col * 330;
    const y = 590 + row * 44;
    const kw = keycap(ctx, key, x, y, { size: 12 });
    text(ctx, label, x + kw + 10, y + 1, { size: 13, weight: 700, color: PALETTE.hudText });
  });
  text(ctx, `P pause · M mute${ui.best ? `   ·   BEST ${ui.best.toLocaleString('en-US')}` : ''}`, W / 2, 696, { size: 13, weight: 700, align: 'center', color: PALETTE.hudDim });
}

export function drawUpgradePicker(ctx, ui, session) {
  const t = ui.t;
  veil(ctx, 0.45, '20, 10, 30');
  text(ctx, `DAWN BREAKS`, W / 2, 96, { size: 54, weight: 900, align: 'center', font: FONT_TITLE, color: '#ffe0b0', glow: '#ff8a5a', glowBlur: 30, spacing: 8 });
  text(ctx, `Night ${ROMAN[session.night]} survived — the lamp still burns`, W / 2, 148, { size: 20, weight: 700, align: 'center', font: FONT_TITLE, color: PALETTE.hudText });
  const st = session.stats;
  const k = session.keeper;
  const summary = `Score ${st.score.toLocaleString('en-US')}   ·   ${st.kills} burned   ·   ${st.shipsSaved} ships guided   ·   Tower ${Math.ceil(k.integrity)}/${k.integrityMax}`;
  text(ctx, summary, W / 2, 186, { size: 16, weight: 700, align: 'center', color: '#ffd9a0' });
  text(ctx, 'CHOOSE ONE GIFT FOR THE LIGHTHOUSE', W / 2, 236, { size: 16, weight: 900, align: 'center', color: PALETTE.hudDim, spacing: 3 });

  cardRects().forEach((r, i) => {
    const up = ui.offers[i];
    if (!up) return;
    const hover = ui.hoverCard === i;
    const lift = hover ? -8 : 0;
    ctx.save();
    if (hover) {
      ctx.shadowColor = 'rgba(255, 180, 90, 0.8)';
      ctx.shadowBlur = 30;
    }
    roundRect(ctx, r.x, r.y + lift, r.w, r.h, 16);
    const grad = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    grad.addColorStop(0, hover ? 'rgba(60, 36, 30, 0.96)' : 'rgba(26, 22, 44, 0.94)');
    grad.addColorStop(1, 'rgba(8, 10, 24, 0.96)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, r.x, r.y + lift, r.w, r.h, 16);
    ctx.strokeStyle = hover ? '#ffcf7a' : 'rgba(255, 210, 140, 0.35)';
    ctx.lineWidth = hover ? 3 : 1.5;
    ctx.stroke();

    const cx = r.x + r.w / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, '#ff9a3c', cx, r.y + 92 + lift, 70, hover ? 0.6 : 0.35);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, r.y + 92 + lift, 48, 0, TAU);
    ctx.strokeStyle = 'rgba(255, 210, 140, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIcon(ctx, up.icon, cx, r.y + 92 + lift, 56, '#ffd27a');
    text(ctx, up.name, cx, r.y + 170 + lift, { size: 24, weight: 900, align: 'center', font: FONT_TITLE, color: '#fff1cf' });
    wrapText(ctx, up.text, cx, r.y + 206 + lift, r.w - 40, 22, { size: 16, weight: 600, align: 'center', color: PALETTE.hudText });
    const owned = session.upgrades[up.id] || 0;
    if (owned) text(ctx, `owned ×${owned}`, cx, r.y + 252 + lift, { size: 12, weight: 800, align: 'center', color: PALETTE.hudDim });
    keycap(ctx, String(i + 1), cx - 15, r.y + r.h - 4 + lift, { size: 14 });
  });
  text(ctx, `Night ${ROMAN[session.night + 1]} of ${ROMAN[LAST_NIGHT]} awaits  ·  click a gift or press 1, 2, 3`, W / 2, 616, { size: 15, weight: 700, align: 'center', color: PALETTE.hudDim });
}

function wrapText(ctx, str, x, y, maxW, lineH, opts) {
  ctx.font = `${opts.weight} ${opts.size}px "Trebuchet MS"`;
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, x, yy, opts);
      line = word;
      yy += lineH;
    } else line = test;
  }
  if (line) text(ctx, line, x, yy, opts);
}

export function drawPause(ctx) {
  veil(ctx, 0.6);
  text(ctx, 'PAUSED', W / 2, H / 2 - 30, { size: 60, weight: 900, align: 'center', font: FONT_TITLE, color: '#ffe3a6', spacing: 10 });
  text(ctx, 'P or ESC to keep watch  ·  M to mute  ·  Q to give up the watch', W / 2, H / 2 + 30, { size: 17, weight: 700, align: 'center', color: PALETTE.hudText });
}

export function keeperRank(score, won) {
  if (won && score >= 40000) return 'Lord of the Lamp';
  if (won) return 'Keeper of the Bay';
  if (score >= 15000) return 'Stormwatcher';
  if (score >= 6000) return 'Lamplighter';
  return 'Apprentice Keeper';
}

export function drawResults(ctx, ui, session) {
  const won = session.phase === 'won';
  const t = ui.t;
  veil(ctx, won ? 0.25 : 0.55, won ? '40, 16, 30' : '4, 6, 20');
  const title = won ? 'THE LIGHT HELD' : 'THE LAMP WENT OUT';
  text(ctx, title, W / 2, 104, { size: 64, weight: 900, align: 'center', font: FONT_TITLE, color: won ? '#fff0c8' : '#ffb0a8', glow: won ? '#ffa04a' : '#ff3b4b', glowBlur: 34, spacing: 6 });
  text(ctx, won ? 'Dawn over the bay. Every night survived.' : `The sea took the tower on Night ${ROMAN[session.night]}.`, W / 2, 162, { size: 20, weight: 700, align: 'center', font: FONT_TITLE, color: PALETTE.hudText });

  const st = session.stats;
  const px = W / 2 - 300;
  panel(ctx, px, 196, 600, 360, { fill: 'rgba(6,10,26,0.82)' });
  text(ctx, 'FINAL SCORE', W / 2, 228, { size: 15, weight: 900, align: 'center', color: PALETTE.hudDim, spacing: 3 });
  text(ctx, st.score.toLocaleString('en-US'), W / 2, 274, { size: 56, weight: 900, align: 'center', color: '#fff4dc', glow: '#ff9a3c', glowBlur: 20 });
  if (ui.newBest) {
    const pop = 1 + 0.06 * Math.sin(t * 6);
    ctx.save();
    ctx.translate(W / 2 + 200, 252);
    ctx.rotate(0.18);
    ctx.scale(pop, pop);
    text(ctx, 'NEW BEST!', 0, 0, { size: 18, weight: 900, align: 'center', color: '#ff8ad8', glow: '#ff3bb0' });
    ctx.restore();
  }
  text(ctx, `Rank: ${keeperRank(st.score, won)}`, W / 2, 316, { size: 20, weight: 800, align: 'center', font: FONT_TITLE, color: '#ffd27a' });

  const rows = [
    ['Nights survived', `${st.nightsSurvived} / ${LAST_NIGHT}`],
    ['Creatures burned', `${st.kills}`],
    ['Ships guided home', `${st.shipsSaved}`],
    ['Ships lost to the reefs', `${st.shipsLost}`],
    ['Longest burn chain', `${st.bestCombo}`],
    ['Best score', `${Math.max(ui.best, st.score).toLocaleString('en-US')}`],
  ];
  rows.forEach(([label, value], i) => {
    const y = 352 + i * 31;
    text(ctx, label, px + 70, y, { size: 17, weight: 700, color: PALETTE.hudText });
    text(ctx, value, px + 530, y, { size: 18, weight: 900, align: 'right', color: '#fff1cf' });
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(px + 70, y + 15, 460, 1);
  });

  button(ctx, RESULTS_AGAIN, 'KEEP WATCH AGAIN', { hover: ui.hoverAgain, t });
  text(ctx, 'click or press R to play again  ·  ESC for the title', W / 2, 664, { size: 14, weight: 700, align: 'center', color: PALETTE.hudDim });
}
