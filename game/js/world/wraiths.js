// The things that climb out of the night sea. Darkness hides all but their eyes; the beam reveals and burns them.

import { TAU, approach, dist, clamp } from '../core/mathx.js';
import { PALETTE } from '../core/palette.js';
import { TOWER_TARGET, TOWER_HIT_RADIUS, W } from './layout.js';
import { beamHit } from './light.js';
import { beamDps, hurtTower } from './keeper.js';
import { emitBurst } from './particles.js';
import { drawGlow } from '../render/glow.js';

export const WRAITH_TYPES = {
  murkling: { name: 'Murkling', r: 14, hp: 22, speed: 42, damage: 6, score: 50, eye: PALETTE.murkEye, mass: 1, armor: 1 },
  gloomray: { name: 'Gloomray', r: 19, hp: 32, speed: 80, damage: 8, score: 90, eye: PALETTE.gloomEye, mass: 1, armor: 1 },
  brinehulk: { name: 'Brinehulk', r: 31, hp: 220, speed: 19, damage: 22, score: 300, eye: PALETTE.hulkEye, mass: 3, armor: 0.2 },
  sirenwisp: { name: 'Siren-wisp', r: 12, hp: 26, speed: 58, damage: 5, score: 140, eye: PALETTE.wispEye, mass: 0.8, armor: 1 },
};

export function spawnWraith(session, type, x, y) {
  const def = WRAITH_TYPES[type];
  const rng = session.rng;
  const hpScale = 1 + (session.night - 1) * 0.08;
  const w = {
    type,
    def,
    x,
    y,
    r: def.r,
    hp: def.hp * hpScale,
    maxHp: def.hp * hpScale,
    mass: def.mass,
    age: 0,
    seed: rng.range(0, 100),
    lit: 0,
    hit: 0,
    burn: 0,
    stun: 0,
    kx: 0,
    ky: 0,
    weave: rng.sign(),
    ship: null,
    dead: false,
  };
  session.wraiths.push(w);
  return w;
}

export function damageWraith(session, w, amount, source) {
  if (w.dead) return;
  w.hp -= amount;
  if (amount >= 5) w.hit = 1; // a flash for bursts, not for the beam's steady burn
  if (w.hp <= 0) killWraith(session, w, source);
}

function killWraith(session, w, source) {
  w.dead = true;
  const big = w.type === 'brinehulk';
  emitBurst(session, w.x, w.y, { count: big ? 60 : 26, speed: big ? 280 : 190, life: 0.9, size: 3, color: PALETTE.ember, glow: true, drag: 2.4, rise: 40 });
  emitBurst(session, w.x, w.y, { count: big ? 30 : 12, speed: 90, life: 1.4, size: 5, color: '#2a2440', drag: 1.5, rise: 60 });
  emitBurst(session, w.x, w.y, { count: 6, speed: 60, life: 0.6, size: 4, color: w.def.eye, glow: true });
  session.sfx.push(big ? 'bigKill' : 'kill');
  session.onKill(w, source);
}

function pickTarget(session, w) {
  if (w.type === 'sirenwisp') {
    if (w.ship && w.ship.state === 'sailing') return w.ship;
    let best = null;
    let bestD = Infinity;
    for (const s of session.ships) {
      if (s.state !== 'sailing' || s.x < 0 || s.x > W) continue;
      const d = dist(w.x, w.y, s.x, s.y);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) return best;
  }
  if (session.boss && session.boss.dying <= 0 && w.type === 'gloomray' && w.age < 1.2) return { x: w.x + w.weave * 120, y: w.y + 80 };
  return TOWER_TARGET;
}

export function updateWraiths(session, dt) {
  const keeper = session.keeper;
  const dps = beamDps(keeper);
  for (const w of session.wraiths) {
    if (w.dead) continue;
    w.age += dt;
    w.hit = Math.max(0, w.hit - dt * 6);
    w.stun = Math.max(0, w.stun - dt);

    const strike = beamHit(session, w.x, w.y, w.r);
    w.lit = approach(w.lit, strike > 0 ? 1 : session.weather.flash > 0.3 ? 0.8 : 0, 12, dt);
    if (strike > 0) {
      const armor = w.def.armor + (1 - w.def.armor) * keeper.focusLevel;
      damageWraith(session, w, dps * strike * armor * dt, 'beam');
      if (keeper.emberGlass > 0 && keeper.focusLevel > 0.6) w.burn = Math.max(w.burn, 1.6 + keeper.emberGlass * 0.6);
      if (session.fxRng.next() < dt * 22) {
        emitBurst(session, w.x + session.fxRng.range(-w.r, w.r) * 0.6, w.y - w.r * 0.3, { count: 1, speed: 40, life: 0.6, size: 2.4, color: PALETTE.ember, glow: true, rise: 70, drag: 1 });
        if (session.fxRng.next() < 0.25) session.sfx.push('burn');
      }
    }
    if (w.burn > 0 && !w.dead) {
      w.burn -= dt;
      damageWraith(session, w, 10 * keeper.emberGlass * dt, 'burn');
      if (session.fxRng.next() < dt * 10) emitBurst(session, w.x, w.y, { count: 1, speed: 30, life: 0.5, size: 2, color: '#ff6a2a', glow: true, rise: 50 });
    }
    if (w.dead) continue;

    // Movement: steer at the target; light makes the small ones flinch; stun and knockback from the foghorn.
    const target = pickTarget(session, w);
    const dx = target.x - w.x;
    const dy = target.y - w.y;
    const d = Math.hypot(dx, dy) || 1;
    let speed = w.def.speed * (1 + (session.night - 1) * 0.05);
    if (w.type === 'murkling' && w.lit > 0.5) speed *= 0.5;
    if (w.type === 'sirenwisp' && w.lit > 0.5) speed *= 0.65;
    if (w.stun > 0) speed = 0;
    let vx = (dx / d) * speed;
    let vy = (dy / d) * speed;
    if (w.type === 'gloomray') {
      const swoop = Math.sin(w.age * 2.6 + w.seed) * 70 * w.weave;
      vx += (-dy / d) * swoop;
      vy += (dx / d) * swoop;
    }
    if (w.type === 'murkling') {
      const wob = Math.sin(w.age * 5 + w.seed) * 18;
      vx += (-dy / d) * wob;
      vy += (dx / d) * wob;
    }
    w.x += (vx + w.kx) * dt;
    w.y += (vy + w.ky) * dt;
    w.kx -= w.kx * 3 * dt;
    w.ky -= w.ky * 3 * dt;
    w.y = Math.max(w.y, 214);

    if (w.type === 'sirenwisp' && target !== TOWER_TARGET && target.state === 'sailing') {
      if (d < 26) {
        w.ship = target;
        target.sirens++;
      } else if (w.ship === target) w.ship = null;
    }
    if (dist(w.x, w.y, TOWER_TARGET.x, TOWER_TARGET.y) < TOWER_HIT_RADIUS + w.r * 0.5) {
      w.dead = true;
      if (session.phase === 'night') hurtTower(session, w.def.damage);
      emitBurst(session, w.x, w.y, { count: 14, speed: 120, life: 0.6, size: 4, color: '#3a3358', drag: 2 });
    }
  }
  session.wraiths = session.wraiths.filter((w) => !w.dead);
}

/** Bodies are drawn under the darkness layer: they only read where light falls. */
export function drawWraithBodies(ctx, session) {
  const t = session.time;
  for (const w of session.wraiths) {
    const emerge = clamp(w.age / 0.7, 0, 1);
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.scale(emerge, emerge);
    const body = w.hit > 0 ? `rgb(${30 + w.hit * 200}, ${20 + w.hit * 120}, ${30 + w.hit * 60})` : PALETTE.wraithBody;
    ctx.fillStyle = body;
    // in the beam the silhouette chars at the edges: an ember rim over a violet one
    ctx.strokeStyle = w.lit > 0.5 ? `rgba(255, 140, 60, ${0.5 + 0.4 * w.lit})` : 'rgba(150, 130, 255, 0.3)';
    ctx.lineWidth = w.lit > 0.5 ? 3 : 2;
    if (w.type === 'gloomray') drawGloomray(ctx, w, t);
    else if (w.type === 'brinehulk') drawBrinehulk(ctx, w, t);
    else if (w.type === 'sirenwisp') drawSirenwisp(ctx, w, t);
    else drawMurkling(ctx, w, t);
    ctx.restore();
  }
}

function drawMurkling(ctx, w, t) {
  const r = w.r;
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * TAU;
    const wob = 1 + 0.16 * Math.sin(t * 6 + i * 1.9 + w.seed);
    const drip = Math.sin(a) > 0.3 ? 1 + 0.45 * Math.sin(a) * (0.6 + 0.4 * Math.sin(t * 4 + i)) : 1;
    const rr = r * wob * drip;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawGloomray(ctx, w, t) {
  const r = w.r;
  const flap = Math.sin(t * 9 + w.seed) * 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6);
  ctx.quadraticCurveTo(r * 1.4, -r * (0.6 + flap), r * 2.1, r * (0.1 - flap));
  ctx.quadraticCurveTo(r * 0.9, r * 0.2, r * 0.25, r * 0.7);
  ctx.lineTo(0, r * 1.9);
  ctx.lineTo(-r * 0.25, r * 0.7);
  ctx.quadraticCurveTo(-r * 0.9, r * 0.2, -r * 2.1, r * (0.1 - flap));
  ctx.quadraticCurveTo(-r * 1.4, -r * (0.6 + flap), 0, -r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBrinehulk(ctx, w, t) {
  const r = w.r;
  const breathe = 1 + 0.04 * Math.sin(t * 2 + w.seed);
  ctx.beginPath();
  ctx.moveTo(-r * 1.2, r * 0.8);
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const spike = i % 2 === 0 ? 1.25 : 1;
    ctx.lineTo(Math.cos(a) * r * 1.15 * spike * breathe, Math.sin(a) * r * spike * breathe);
  }
  ctx.lineTo(r * 1.2, r * 0.8);
  ctx.quadraticCurveTo(0, r * 1.3, -r * 1.2, r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(80, 110, 120, 0.5)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(-r * 0.7 + i * r * 0.35, -r * 0.15 + (i % 2) * r * 0.3, r * 0.12, 0, TAU);
    ctx.fill();
  }
}

function drawSirenwisp(ctx, w, t) {
  const r = w.r;
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.3);
  ctx.bezierCurveTo(r * 1.3, -r * 0.6, r * 0.9, r * 0.8, Math.sin(t * 5 + w.seed) * r * 0.8, r * 2.4);
  ctx.bezierCurveTo(-r * 0.9, r * 0.8, -r * 1.3, -r * 0.6, 0, -r * 1.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Eyes glow above the darkness, so the player always sees what is coming, but never its shape. */
export function drawWraithEyes(ctx, session) {
  const t = session.time;
  ctx.globalCompositeOperation = 'lighter';
  for (const w of session.wraiths) {
    const emerge = clamp(w.age / 0.7, 0, 1);
    const blink = Math.sin(t * 1.3 + w.seed * 3) > 0.985 ? 0.15 : 1;
    const gap = w.type === 'brinehulk' ? 11 : w.type === 'gloomray' ? 7 : 5;
    const size = (w.type === 'brinehulk' ? 16 : 11) * emerge;
    const ey = w.y - w.r * (w.type === 'gloomray' ? 0.05 : 0.25);
    const alpha = (0.75 + 0.25 * Math.sin(t * 3 + w.seed)) * blink;
    drawGlow(ctx, w.def.eye, w.x - gap, ey, size, alpha);
    drawGlow(ctx, w.def.eye, w.x + gap, ey, size, alpha);
    if (w.burn > 0 || w.lit > 0.5) drawGlow(ctx, PALETTE.ember, w.x, w.y, w.r * 2.2, 0.25 * w.lit + (w.burn > 0 ? 0.25 : 0));
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const w of session.wraiths) {
    if (w.type !== 'brinehulk' || w.hp >= w.maxHp || w.lit < 0.3) continue;
    const bw = 54;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(w.x - bw / 2, w.y - w.r - 18, bw, 6);
    ctx.fillStyle = PALETTE.hulkEye;
    ctx.fillRect(w.x - bw / 2 + 1, w.y - w.r - 17, (bw - 2) * (w.hp / w.maxHp), 4);
  }
}
