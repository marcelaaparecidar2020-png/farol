// Flotsam: cargo from the storm's wrecks drifts across the bay. Holding the beam on a crate hauls it in for
// oil, a flare or stone for the tower — every second spent on it is a second the creatures are not burned.

import { TAU, clamp } from '../core/mathx.js';
import { SHIP_LANES, W } from './layout.js';
import { beamHit } from './light.js';
import { addText, addRing, emitBurst } from './particles.js';
import { drawGlow } from '../render/glow.js';

const HAUL_TIME = 1.3;
const CARGO = {
  oil: { label: '+35 OIL', color: '#ffc24b' },
  flare: { label: '+1 FLARE', color: '#ff7a3c' },
  stone: { label: '+12 TOWER', color: '#ff6b5a' },
};

export function spawnCrate(session) {
  const rng = session.rng;
  const lane = SHIP_LANES[rng.int(0, SHIP_LANES.length - 1)];
  const dir = rng.sign();
  session.crates.push({
    x: dir > 0 ? -30 : W + 30,
    y: lane.y + 30,
    dir,
    speed: rng.range(24, 34),
    haul: 0,
    lit: 0,
    kind: rng.pick(Object.keys(CARGO)),
    bob: rng.range(0, TAU),
    done: false,
  });
}

export function updateCrates(session, dt) {
  const k = session.keeper;
  for (const c of session.crates) {
    c.x += c.dir * c.speed * dt;
    const strike = session.phase === 'night' ? beamHit(session, c.x, c.y, 16) : 0;
    c.lit = strike > 0 ? 1 : Math.max(0, c.lit - dt * 4);
    if (strike > 0) c.haul += (dt * (0.8 + 1.4 * k.focusLevel)) / HAUL_TIME;
    else c.haul = Math.max(0, c.haul - dt * 0.25);
    if (c.haul >= 1) {
      c.done = true;
      if (c.kind === 'oil') k.oil = Math.min(k.oilMax, k.oil + 35);
      else if (c.kind === 'flare') k.flares = Math.min(k.flaresMax, k.flares + 1);
      else k.integrity = Math.min(k.integrityMax, k.integrity + 12);
      session.addScore(150);
      session.stats.salvaged++;
      session.sfx.push('salvage');
      addText(session, c.x, c.y - 34, `SALVAGE ${CARGO[c.kind].label}`, CARGO[c.kind].color, 18);
      addRing(session, c.x, c.y, 50, CARGO[c.kind].color, 0.6);
      emitBurst(session, c.x, c.y, { count: 16, speed: 110, life: 0.7, size: 2.6, color: '#ffe6a8', glow: true, rise: 40 });
    }
  }
  session.crates = session.crates.filter((c) => !c.done && c.x > -60 && c.x < W + 60);
}

/** The crate itself, under the darkness: only the beam shows its planks. */
export function drawCrates(ctx, session) {
  const t = session.time;
  for (const c of session.crates) {
    const bob = Math.sin(t * 2.1 + c.bob) * 2.5;
    ctx.save();
    ctx.translate(c.x, c.y + bob);
    ctx.rotate(Math.sin(t * 1.4 + c.bob) * 0.12);
    ctx.fillStyle = '#4a3222';
    ctx.fillRect(-13, -11, 26, 20);
    ctx.strokeStyle = '#7a5838';
    ctx.lineWidth = 2;
    ctx.strokeRect(-13, -11, 26, 20);
    ctx.beginPath();
    ctx.moveTo(-13, -11);
    ctx.lineTo(13, 9);
    ctx.stroke();
    ctx.restore();
  }
}

/** A drifting lantern lashed to each crate, and the haul ring: above the darkness, like a ship's signals. */
export function drawCrateSignals(ctx, session) {
  if (session.phase !== 'night') return;
  const t = session.time;
  for (const c of session.crates) {
    const bob = Math.sin(t * 2.1 + c.bob) * 2.5;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, CARGO[c.kind].color, c.x, c.y - 16 + bob, 12, 0.7 + 0.3 * Math.sin(t * 4 + c.bob));
    ctx.globalCompositeOperation = 'source-over';
    if (c.haul > 0.01) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, 22, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = CARGO[c.kind].color;
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, 22, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(c.haul, 0, 1));
      ctx.stroke();
    }
  }
}
