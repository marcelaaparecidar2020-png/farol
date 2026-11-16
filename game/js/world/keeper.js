// The keeper's lighthouse: beam aim and focus, oil, flares, the foghorn and the tower's integrity.

import { approach, clamp, dist, TAU } from '../core/mathx.js';
import { LAMP, TOWER_TARGET, W, HORIZON } from './layout.js';
import { emitBurst, addRing, addText } from './particles.js';

export const WIDE_DPS = 16;
export const FOCUS_DPS = 64;
export const FLARE_RADIUS = 170;
export const FOGHORN_RADIUS = 330;

export function createKeeper() {
  return {
    aim: -Math.PI / 2,
    focusLevel: 0,
    focusing: false,
    oil: 100,
    oilMax: 100,
    oilRegen: 5,
    oilDrain: 17,
    integrity: 100,
    integrityMax: 100,
    flares: 2,
    flaresMax: 2,
    flareRecharge: 24,
    flareTimer: 0,
    foghornCd: 0,
    foghornMax: 13,
    foghornPower: 1,
    dmgMul: 1,
    wideHalf: 0.38,
    focusHalf: 0.095,
    range: 1080,
    emberGlass: 0,
    lightningRod: 0,
    harborBell: 0,
    hurtFlash: 0,
    outage: 0,
    dryWarned: false,
  };
}

export function beamDps(keeper) {
  return (WIDE_DPS + (FOCUS_DPS - WIDE_DPS) * keeper.focusLevel) * keeper.dmgMul;
}

export function updateKeeper(session, controls, dt) {
  const k = session.keeper;
  if (k.outage > 0) {
    k.focusLevel = approach(k.focusLevel, 0, 10, dt);
    return;
  }

  const target = Math.atan2(controls.aimY - LAMP.y, controls.aimX - LAMP.x);
  let delta = (target - k.aim) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  k.aim += delta * (1 - Math.exp(-18 * dt));

  const wantsFocus = controls.focus && k.oil > 0.5;
  if (controls.focus && k.oil <= 0.5 && !k.dryWarned) {
    session.sfx.push('empty');
    addText(session, LAMP.x, LAMP.y - 60, 'NO OIL', '#ffb36b', 20);
    k.dryWarned = true;
  }
  if (!controls.focus) k.dryWarned = false;
  k.focusing = wantsFocus;
  if (wantsFocus) k.oil = Math.max(0, k.oil - k.oilDrain * dt);
  else k.oil = Math.min(k.oilMax, k.oil + k.oilRegen * dt);
  k.focusLevel = approach(k.focusLevel, wantsFocus ? 1 : 0, 14, dt);

  if (k.flares < k.flaresMax) {
    k.flareTimer += dt;
    if (k.flareTimer >= k.flareRecharge) {
      k.flareTimer = 0;
      k.flares++;
    }
  } else k.flareTimer = 0;
  k.foghornCd = Math.max(0, k.foghornCd - dt);
  k.hurtFlash = Math.max(0, k.hurtFlash - dt * 2.5);

  if (controls.flare) fireFlare(session, controls.aimX, controls.aimY);
  if (controls.foghorn) soundFoghorn(session);
}

export function fireFlare(session, x, y) {
  const k = session.keeper;
  if (k.flares <= 0) {
    session.sfx.push('empty');
    return false;
  }
  k.flares--;
  const fx = clamp(x, 40, W - 40);
  const fy = clamp(y, HORIZON + 20, 640);
  session.flares.push({ x: fx, y: fy, radius: FLARE_RADIUS, glow: 1, life: 3.2, age: 0, burst: false });
  session.sfx.push('flare');
  return true;
}

export function updateFlares(session, dt) {
  for (const f of session.flares) {
    f.age += dt;
    if (!f.burst && f.age >= 0.28) {
      f.burst = true;
      addRing(session, f.x, f.y, FLARE_RADIUS * 1.15, '#ffb15a', 0.6);
      emitBurst(session, f.x, f.y, { count: 46, speed: 260, life: 1.1, size: 3.2, color: '#ffcf7a', drag: 2.2, glow: true });
      for (const w of session.wraiths) {
        if (dist(w.x, w.y, f.x, f.y) < FLARE_RADIUS + w.r) session.damageWraith(w, 70 * session.keeper.dmgMul, 'flare');
      }
      if (session.boss && dist(session.boss.x, session.boss.eyeY, f.x, f.y) < FLARE_RADIUS + 60) session.damageBoss(90);
      session.shake = Math.max(session.shake, 8);
    }
    f.glow = f.age < 0.28 ? f.age / 0.28 : Math.max(0, 1 - (f.age - 0.28) / (f.life - 0.28));
  }
  session.flares = session.flares.filter((f) => f.age < f.life);
}

export function soundFoghorn(session) {
  const k = session.keeper;
  if (k.foghornCd > 0) {
    session.sfx.push('empty');
    return false;
  }
  k.foghornCd = k.foghornMax;
  session.sfx.push('foghorn');
  addRing(session, TOWER_TARGET.x, TOWER_TARGET.y, FOGHORN_RADIUS, '#bfe9ff', 1.1);
  addRing(session, TOWER_TARGET.x, TOWER_TARGET.y, FOGHORN_RADIUS * 0.7, '#bfe9ff', 0.8);
  for (const w of session.wraiths) {
    const d = dist(w.x, w.y, TOWER_TARGET.x, TOWER_TARGET.y);
    if (d < FOGHORN_RADIUS) {
      const push = (380 * k.foghornPower * (1 - d / FOGHORN_RADIUS) + 120) / Math.max(1, w.mass);
      w.kx += ((w.x - TOWER_TARGET.x) / (d || 1)) * push;
      w.ky += ((w.y - TOWER_TARGET.y) / (d || 1)) * push;
      w.stun = Math.max(w.stun, 1.1 * k.foghornPower);
    }
  }
  session.shake = Math.max(session.shake, 5);
  return true;
}

export function hurtTower(session, amount) {
  const k = session.keeper;
  k.integrity = Math.max(0, k.integrity - amount);
  k.hurtFlash = 1;
  session.shake = Math.max(session.shake, 10);
  session.sfx.push('towerHit');
  emitBurst(session, TOWER_TARGET.x, TOWER_TARGET.y + 10, { count: 18, speed: 160, life: 0.8, size: 3, color: '#9aa6b8', gravity: 420 });
}
