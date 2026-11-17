// One watch of the lighthouse: the full simulation state and the flow of a night
// (night → dawn → upgrade, or the tower's fall), advanced in fixed steps.

import { createRng } from '../core/rng.js';
import { ROMAN } from '../core/mathx.js';
import { NIGHTS, LAST_NIGHT } from './nights.js';
import { createSpawner, updateSpawner } from './spawner.js';
import { planWatch, omenById, featuredFor } from './omens.js';
import { WRAITH_TYPES } from '../world/wraiths.js';
import { updateCrates } from '../world/flotsam.js';
import { createStats, scoreKill, updateCombo } from './scoring.js';
import { UPGRADES, applyUpgrade } from './upgrades.js';
import { createKeeper, updateKeeper, updateFlares } from '../world/keeper.js';
import { damageWraith, updateWraiths } from '../world/wraiths.js';
import { updateShips, guideHome } from '../world/ships.js';
import { createUndertow, damageBoss, updateUndertow, bossDefeated } from '../world/undertow.js';
import { createWeather, updateWeather } from '../world/weather.js';
import { updateParticles, addText, emitBurst } from '../world/particles.js';
import { LAMP } from '../world/layout.js';

export const STEP = 1 / 60;
const DAWN_LENGTH = 3.6;
const FALL_LENGTH = 3.2;

export function createSession({ seed = 1, night = 1, upgrades = [], attract = false, omen = 'calm' } = {}) {
  const session = {
    seed,
    attract,
    plan: planWatch(seed),
    omen: omenById('calm'),
    omenLog: [],
    giftCount: 3,
    crates: [],
    rng: createRng(seed),
    fxRng: createRng(seed * 7919 + 17),
    time: 0,
    night,
    nightTime: 0,
    phase: 'night',
    phaseT: 0,
    dawn: 0,
    darkness: 0.85,
    keeper: createKeeper(),
    wraiths: [],
    ships: [],
    flares: [],
    particles: [],
    rings: [],
    texts: [],
    weather: createWeather(),
    boss: null,
    stats: createStats(),
    upgrades: {},
    spawner: null,
    shipCount: 0,
    shake: 0,
    banner: null,
    sfx: [],
  };
  session.damageWraith = (w, amount, source) => damageWraith(session, w, amount, source);
  session.damageBoss = (amount) => damageBoss(session, amount);
  session.onKill = (w) => scoreKill(session, w);
  session.addScore = (n) => (session.stats.score += n);
  for (const id of upgrades) applyUpgrade(session, UPGRADES.find((u) => u.id === id));
  if (omen !== 'calm') session.plan.chosen.push(omen);
  startNight(session, night, omen);
  return session;
}

export function startNight(session, n, omenId = 'calm') {
  const def = NIGHTS[n - 1];
  const omen = omenById(omenId);
  session.night = n;
  session.nightTime = 0;
  session.phase = 'night';
  session.phaseT = 0;
  session.dawn = 0;
  session.omen = omen;
  if (omen.id !== 'calm') session.omenLog.push(omen.id);
  session.darkness = def.darkness + (omen.darkness ?? 0);
  session.keeper.range = omen.range ?? session.keeper.baseRange;
  session.stats.comboWindow = omen.comboWindow ?? 2.4;
  session.weather.storm = def.storm;
  session.weather.nextStrike = 4;
  session.spawner = createSpawner(session, n);
  session.boss = def.boss ? createUndertow(session) : null;
  session.ships = [];
  session.flares = [];
  session.crates = [];
  const newcomer = featuredFor(session.plan, n);
  session.banner = {
    title: `NIGHT ${ROMAN[n]}`,
    sub: def.title,
    hint: newcomer ? `NEW: ${WRAITH_TYPES[newcomer].counter}` : def.hint,
    omen: omen.id !== 'calm' ? omen : null,
    t: 0,
  };
  session.sfx.push('nightStart');
}

/** Between nights: mend the tower a little and begin the next night under the omen the keeper chose. */
export function advanceNight(session, omenId = 'calm') {
  const k = session.keeper;
  k.integrity = Math.min(k.integrityMax, k.integrity + 15);
  k.oil = k.oilMax;
  k.flares = k.flaresMax;
  k.foghornCd = 0;
  k.gutter = 0;
  session.giftCount = session.omen.giftsNext ?? 3;
  if (omenId !== 'calm') session.plan.chosen.push(omenId);
  startNight(session, session.night + 1, omenId);
}

function beginDawn(session) {
  session.phase = 'dawn';
  session.phaseT = 0;
  session.stats.nightsSurvived = session.night;
  const k = session.keeper;
  const bonus = 500 * session.night + Math.ceil(k.integrity) * 5;
  session.addScore(bonus);
  addText(session, LAMP.x, LAMP.y - 110, `NIGHT ${ROMAN[session.night]} SURVIVED  +${bonus}`, '#ffe08a', 26);
  session.sfx.push('dawn');
  for (const s of session.ships) if (s.state === 'sailing') guideHome(session, s);
}

function beginFall(session) {
  session.phase = 'lost';
  session.phaseT = 0;
  session.keeper.outage = 1;
  session.sfx.push('defeat');
  emitBurst(session, LAMP.x, LAMP.y, { count: 80, speed: 300, life: 1.6, size: 3, color: '#ffcf7a', glow: true, gravity: 300 });
}

export function updateSession(session, controls, dt) {
  session.time += dt;
  session.phaseT += dt;
  if (session.banner) session.banner.t += dt;
  session.shake = Math.max(0, session.shake - dt * 30);
  updateWeather(session, dt);

  if (session.phase === 'night') {
    session.nightTime += dt;
    updateKeeper(session, controls, dt);
    updateSpawner(session, dt);
    updateUndertow(session, dt);
    updateWraiths(session, dt);
    updateShips(session, dt);
    updateCrates(session, dt);
    updateFlares(session, dt);
    updateCombo(session.stats, dt);
    const def = NIGHTS[session.night - 1];
    if (session.keeper.integrity <= 0) beginFall(session);
    else if (def.duration && session.nightTime >= def.duration) beginDawn(session);
    else if (bossDefeated(session)) beginDawn(session);
  } else if (session.phase === 'dawn') {
    session.dawn = Math.min(1, session.phaseT / 2.2);
    updateKeeper(session, { ...controls, focus: false, flare: false, foghorn: false }, dt);
    // first light burns away whatever is still in the water
    for (const w of session.wraiths) session.damageWraith(w, 90 * dt, 'dawn');
    updateWraiths(session, dt);
    updateShips(session, dt);
    updateFlares(session, dt);
    updateUndertow(session, dt);
    updateCombo(session.stats, dt);
    if (session.phaseT >= DAWN_LENGTH) {
      session.phase = session.night >= LAST_NIGHT ? 'won' : 'cleared';
      session.phaseT = 0;
      if (session.phase === 'won') session.sfx.push('victory');
    }
  } else if (session.phase === 'lost') {
    updateWraiths(session, dt);
    if (session.phaseT >= FALL_LENGTH) session.phase = 'fallen';
  } else {
    // 'cleared', 'won' and 'fallen' hold still behind their screens, the sea still moving
    if (session.phase === 'won') session.dawn = 1;
  }
  updateParticles(session, dt);
}

export function isOver(session) {
  return session.phase === 'won' || session.phase === 'fallen';
}
