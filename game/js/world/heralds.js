// First sightings: in the dark the keeper sees only eyes, so the first time the light reveals a kind of
// creature (beam, flare or lightning), it is named there with a ring and a one-line counter, long enough to
// read. After that the keeper knows it by its eyes and its signature.

import { TAU, clamp } from '../core/mathx.js';
import { W } from './layout.js';
import { NIGHTS } from '../game/nights.js';
import { featuredFor } from '../game/omens.js';
import { text, roundRect } from '../ui/draw.js';

export const HERALD_TIME = 6.5;

/** A watch begun at a later night (the screenshot scenes) has already met the earlier nights' creatures. */
export function markEarlierNights(session, night) {
  for (let n = 1; n < night; n++) {
    for (const type of Object.keys(NIGHTS[n - 1].spawns)) session.seen.add(type);
    const newcomer = featuredFor(session.plan, n);
    if (newcomer) session.seen.add(newcomer);
  }
}

/** Called when light falls on a creature: the first of its kind in the watch gets its name tag. */
export function revealWraith(session, w) {
  if (!w.def.tip || session.seen.has(w.type)) return;
  session.seen.add(w.type);
  session.heralds.push({ w, t: HERALD_TIME });
}

export function updateHeralds(session, dt) {
  for (const h of session.heralds) h.t -= dt;
  session.heralds = session.heralds.filter((h) => h.t > 0);
}

export function drawHeralds(ctx, session) {
  if (session.phase !== 'night') return;
  for (const { w, t } of session.heralds) {
    // a tag outlives a creature burned at once, fading where it fell, so it can still be read
    const shown = HERALD_TIME - t;
    const alpha = clamp(shown / 0.35, 0, 1) * clamp(t / 0.8, 0, 1) * (w.dead ? 0.85 : 1);
    const color = w.def.eye;
    // a ring on the creature itself, pulsing so the eye goes to it
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (!w.dead) {
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r + 12 + 3 * Math.sin(session.time * 6), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // the tag: name over its counter, kept on screen and clear of the top panels
    ctx.font = '700 13px "Trebuchet MS"';
    const tw = Math.max(ctx.measureText(w.def.tip).width, w.def.name.length * 11) + 28;
    const above = w.y - w.r - 70 > 150;
    const ty = above ? w.y - w.r - 70 : w.y + w.r + 22;
    const tx = clamp(w.x - tw / 2, 12, W - tw - 12);
    ctx.beginPath();
    ctx.moveTo(w.x, above ? w.y - w.r - 14 : w.y + w.r + 14);
    ctx.lineTo(clamp(w.x, tx + 14, tx + tw - 14), above ? ty + 48 : ty);
    ctx.stroke();
    roundRect(ctx, tx, ty, tw, 48, 9);
    ctx.fillStyle = 'rgba(6, 10, 26, 0.86)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    text(ctx, `NEW · ${w.def.name.toUpperCase()}`, tx + 14, ty + 15, { size: 14, weight: 900, color, spacing: 1.5, alpha });
    text(ctx, w.def.tip, tx + 14, ty + 34, { size: 13, weight: 700, alpha });
  }
}
