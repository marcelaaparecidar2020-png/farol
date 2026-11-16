// The Undertow: Night V's leviathan. It rises at the horizon, opens one great eye in cycles, and only the
// light poured into that open eye can wound it. It summons murklings and hurls gloomrays at the tower.

import { TAU, clamp, approach, dist } from '../core/mathx.js';
import { PALETTE } from '../core/palette.js';
import { HORIZON } from './layout.js';
import { beamHit } from './light.js';
import { beamDps } from './keeper.js';
import { spawnWraith } from './wraiths.js';
import { emitBurst, addRing, addText } from './particles.js';
import { drawGlow } from '../render/glow.js';

const EYE_CLOSED = 4.2;
const EYE_OPEN = 4.4;

export function createUndertow(session) {
  const maxHp = 1500;
  return {
    x: 640,
    baseY: HORIZON + 70,
    y: HORIZON + 250,
    eyeY: HORIZON + 250,
    rise: 0,
    hp: maxHp,
    maxHp,
    eyeOpen: 0,
    eyeT: 0,
    eyeState: 'closed',
    summonT: 3,
    hurlT: 7,
    hit: 0,
    dying: 0,
    lit: 0,
    age: 0,
    announced: false,
  };
}

export function damageBoss(session, amount) {
  const b = session.boss;
  if (!b || b.dying > 0 || b.rise < 1) return;
  const exposed = b.eyeOpen > 0.5 ? 1 : 0.15;
  b.hp -= amount * exposed;
  if (amount >= 5) b.hit = 1;
  if (b.hp <= 0) {
    b.hp = 0;
    b.dying = 0.001;
    session.sfx.push('bigKill');
    session.sfx.push('lightning');
    session.shake = 18;
    session.addScore(5000);
    addText(session, b.x, b.eyeY - 80, 'THE UNDERTOW FALLS  +5000', '#ffe08a', 30);
  }
}

export function updateUndertow(session, dt) {
  const b = session.boss;
  if (!b) return;
  b.age += dt;
  b.hit = Math.max(0, b.hit - dt * 4);
  if (b.rise < 1) {
    b.rise = Math.min(1, b.rise + dt / 4.5);
    if (!b.announced) {
      b.announced = true;
      session.sfx.push('bossRise');
    }
  }
  b.y = b.baseY + (1 - b.rise) * 260 + Math.sin(b.age * 0.7) * 6;
  b.eyeY = b.y - 10;

  if (b.dying > 0) {
    b.dying += dt;
    b.eyeOpen = approach(b.eyeOpen, 0, 3, dt);
    if (session.fxRng.next() < dt * 30) {
      const fx = b.x + session.fxRng.range(-260, 260);
      const fy = b.y + session.fxRng.range(-120, 60);
      emitBurst(session, fx, fy, { count: 14, speed: 200, life: 1, size: 3, color: PALETTE.ember, glow: true, rise: 60 });
    }
    return;
  }
  if (b.rise < 1) return;

  // Eye cycle
  b.eyeT += dt;
  const phaseBoost = 1 + (1 - b.hp / b.maxHp) * 0.6;
  if (b.eyeState === 'closed' && b.eyeT > EYE_CLOSED / phaseBoost) {
    b.eyeState = 'open';
    b.eyeT = 0;
    session.sfx.push('bossEye');
    addRing(session, b.x, b.eyeY, 120, '#ff6b6b', 0.7);
  } else if (b.eyeState === 'open' && b.eyeT > EYE_OPEN) {
    b.eyeState = 'closed';
    b.eyeT = 0;
  }
  b.eyeOpen = approach(b.eyeOpen, b.eyeState === 'open' ? 1 : 0, 7, dt);

  const strike = beamHit(session, b.x, b.eyeY, 34);
  b.lit = approach(b.lit, strike > 0 ? 1 : 0, 10, dt);
  if (strike > 0) {
    const focusBonus = 0.45 + 0.75 * session.keeper.focusLevel;
    damageBoss(session, beamDps(session.keeper) * focusBonus * dt * 1.15);
    if (b.eyeOpen > 0.5 && session.fxRng.next() < dt * 30) {
      emitBurst(session, b.x + session.fxRng.range(-30, 30), b.eyeY, { count: 2, speed: 90, life: 0.6, size: 3, color: PALETTE.ember, glow: true, rise: 50 });
      if (session.fxRng.next() < 0.3) session.sfx.push('burn');
    }
  }

  // Attacks quicken as it weakens.
  b.summonT -= dt * phaseBoost;
  if (b.summonT <= 0) {
    b.summonT = 5.5;
    for (const side of [-1, 1]) spawnWraith(session, 'murkling', b.x + side * session.rng.range(180, 300), b.y + 40);
    emitBurst(session, b.x, b.y + 40, { count: 20, speed: 120, life: 1, size: 3, color: '#9fd6ff', gravity: 200, rise: 100 });
  }
  b.hurlT -= dt * phaseBoost;
  if (b.hurlT <= 0) {
    b.hurlT = 10;
    for (let i = 0; i < 3; i++) {
      const g = spawnWraith(session, 'gloomray', b.x + (i - 1) * 90, b.y - 40);
      g.weave = i % 2 ? 1 : -1;
    }
    session.sfx.push('bossEye');
  }
}

function tentacleCurves(b) {
  const t = b.age;
  const curves = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const k = i % 3;
    const baseX = b.x + side * (150 + k * 60);
    const baseY = b.y + 70;
    const sway = Math.sin(t * (0.9 + k * 0.3) + i) * 40;
    curves.push({
      k,
      baseX,
      baseY,
      cx: baseX + side * (70 + k * 30) + sway,
      cy: baseY - 150,
      tipX: baseX + side * (150 + k * 70) + sway,
      tipY: baseY - 190 - k * 40 + Math.cos(t + i) * 30,
    });
  }
  return curves;
}

/** Crowned head with spines and a fanged maw at the waterline. */
function headPath(ctx, b) {
  const x = b.x;
  const y = b.y;
  ctx.beginPath();
  ctx.moveTo(x - 300, y + 80);
  ctx.bezierCurveTo(x - 280, y - 40, x - 210, y - 120, x - 150, y - 140);
  const spines = [[-150, -140], [-120, -230], [-90, -160], [-50, -270], [-20, -175], [0, -300], [20, -175], [50, -270], [90, -160], [120, -230], [150, -140]];
  for (const [dx, dy] of spines) ctx.lineTo(x + dx, y + dy);
  ctx.bezierCurveTo(x + 210, y - 120, x + 280, y - 40, x + 300, y + 80);
  // fanged lower jaw
  for (let i = 0; i <= 12; i++) {
    const fx = x + 300 - i * 50;
    ctx.lineTo(fx, y + 80 - (i % 2 ? 0 : 26));
  }
  ctx.closePath();
}

export function drawUndertowBody(ctx, session) {
  const b = session.boss;
  if (!b) return;
  const fade = b.dying > 0 ? clamp(1 - b.dying / 3, 0, 1) : 1;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineCap = 'round';
  for (const c of tentacleCurves(b)) {
    ctx.strokeStyle = '#07060f';
    for (let layer = 0; layer < 3; layer++) {
      ctx.lineWidth = 38 - layer * 12 - c.k * 5;
      ctx.beginPath();
      ctx.moveTo(c.baseX, c.baseY);
      ctx.quadraticCurveTo(c.cx, c.cy, c.tipX, c.tipY);
      ctx.stroke();
    }
  }
  const flash = b.hit;
  ctx.fillStyle = flash > 0 ? `rgb(${12 + flash * 90}, ${8 + flash * 30}, ${20 + flash * 30})` : '#07060f';
  headPath(ctx, b);
  ctx.fill();
  // scale ridges
  ctx.strokeStyle = 'rgba(110, 90, 170, 0.28)';
  ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(b.x + i * 45, b.y - 150 + Math.abs(i) * 10);
    ctx.quadraticCurveTo(b.x + i * 70, b.y - 50, b.x + i * 90, b.y + 50);
    ctx.stroke();
  }
  // brow over the eye socket
  ctx.fillStyle = '#020207';
  ctx.beginPath();
  ctx.ellipse(b.x, b.eyeY, 82, 44, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A cold rim of light around the leviathan, drawn above the darkness so its shape always reads. */
export function drawUndertowRim(ctx, session) {
  const b = session.boss;
  if (!b || b.rise <= 0) return;
  const fade = b.dying > 0 ? clamp(1 - b.dying / 3, 0, 1) : 1;
  const glow = (0.22 + b.lit * 0.25 + session.weather.flash * 0.5) * fade;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(150, 120, 255, ${glow * 0.7})`;
  ctx.lineWidth = 2;
  for (const c of tentacleCurves(b)) {
    ctx.beginPath();
    ctx.moveTo(c.baseX, c.baseY);
    ctx.quadraticCurveTo(c.cx, c.cy, c.tipX, c.tipY);
    ctx.stroke();
  }
  headPath(ctx, b);
  const mass = ctx.createLinearGradient(0, b.y - 300, 0, b.y + 80);
  mass.addColorStop(0, `rgba(70, 40, 120, ${0.35 * fade})`);
  mass.addColorStop(1, `rgba(20, 12, 40, ${0.15 * fade})`);
  ctx.fillStyle = mass;
  ctx.fill();
  ctx.strokeStyle = `rgba(170, 140, 255, ${glow})`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

/** The eye blazes above the darkness: the player's one target. */
export function drawUndertowEye(ctx, session) {
  const b = session.boss;
  if (!b || b.rise <= 0) return;
  const open = b.eyeOpen * (b.dying > 0 ? clamp(1 - b.dying / 2, 0, 1) : 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, PALETTE.bossEye, b.x, b.eyeY, 70 + open * 90, 0.35 + open * 0.5);
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.ellipse(b.x, b.eyeY, 70, Math.max(2, 34 * open), 0, 0, TAU);
  ctx.fillStyle = '#ffd9a8';
  ctx.fill();
  if (open > 0.1) {
    const look = session.keeper.aim;
    const px = b.x + Math.cos(look) * 14;
    const py = b.eyeY + Math.sin(look) * 6;
    const grad = ctx.createRadialGradient(px, py, 2, px, py, 30);
    grad.addColorStop(0, '#2a0005');
    grad.addColorStop(0.35, '#ff2b2b');
    grad.addColorStop(1, '#5a0010');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(px, py, 28, Math.max(1, 28 * open), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#05000a';
    ctx.beginPath();
    ctx.ellipse(px, py, 5, Math.max(1, 22 * open), 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function bossDefeated(session) {
  return session.boss && session.boss.dying > 2.6;
}

export function bossNear(session, x, y) {
  const b = session.boss;
  return b ? dist(x, y, b.x, b.eyeY) : Infinity;
}
