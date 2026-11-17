// Brings each night's creatures and ships on schedule, quickening as dawn nears. The night's newcomer and its
// omen are folded in here: the omen sets the pace, the convoy and the drifting cargo.

import { NIGHTS } from './nights.js';
import { NEWCOMERS, featuredFor } from './omens.js';
import { spawnWraith } from '../world/wraiths.js';
import { spawnShip } from '../world/ships.js';
import { spawnCrate } from '../world/flotsam.js';
import { spawnPoint, HORIZON, W } from '../world/layout.js';

const RELIEF = 1.3;
const RELIEF_LAST = 1.25;

export function createSpawner(session, nightIndex) {
  const night = NIGHTS[nightIndex - 1];
  const omen = session.omen;
  const newcomer = featuredFor(session.plan, nightIndex);
  // a newcomer takes the place of part of the night's usual tide, so the night changes rather than swells
  const relief = newcomer ? RELIEF : night.newcomers ? RELIEF_LAST : 1;
  const spawns = {};
  for (const [type, every] of Object.entries(night.spawns)) spawns[type] = every * relief;
  if (newcomer) spawns[newcomer] = night.featured;
  if (night.newcomers) for (const type of NEWCOMERS) spawns[type] = night.newcomers;
  const timers = {};
  for (const [type, every] of Object.entries(spawns)) timers[type] = every * 0.6;
  // the banner names the newcomer at dusk; it rises once the night's first wave is in, so its first
  // sighting comes in the thick of things, after the keeper has read what it is
  if (newcomer) timers[newcomer] = 12;
  const length = night.duration ?? 110;
  const convoyAt = omen.convoyAt ? length * omen.convoyAt : Infinity;
  const crates = [];
  for (let i = 0; i < (omen.crates ?? 0); i++) crates.push(length * (0.08 + (0.8 * i) / omen.crates));
  return {
    night,
    spawns,
    newcomer,
    timers,
    packEvery: night.packs * relief,
    packT: night.packs * relief || Infinity,
    // the convoy takes the place of the lone ships that would have sailed after it
    shipsLeft: night.ships.filter((t) => t < convoyAt),
    convoyAt,
    crates,
  };
}

export function updateSpawner(session, dt) {
  const sp = session.spawner;
  if (!sp || session.phase !== 'night') return;
  const night = sp.night;
  const progress = night.duration ? session.nightTime / night.duration : Math.min(1, session.nightTime / 120);
  const pace = (1 + progress * 0.55) * (session.omen.pace ?? 1);

  for (const [type, every] of Object.entries(sp.spawns)) {
    sp.timers[type] -= dt * pace;
    if (sp.timers[type] <= 0) {
      sp.timers[type] += every * session.rng.range(0.75, 1.25);
      const p = spawnPoint(session.rng);
      spawnWraith(session, type, p.x, p.y);
    }
  }
  sp.packT -= dt * pace;
  if (sp.packT <= 0) {
    sp.packT = sp.packEvery * session.rng.range(0.8, 1.2);
    const p = spawnPoint(session.rng);
    const size = 3 + Math.floor(session.night / 2);
    for (let i = 0; i < size; i++) spawnWraith(session, 'murkling', p.x + session.rng.range(-40, 40), p.y + session.rng.range(-20, 20));
  }
  while (sp.shipsLeft.length && session.nightTime >= sp.shipsLeft[0]) {
    sp.shipsLeft.shift();
    spawnShip(session);
  }
  if (session.nightTime >= sp.convoyAt) {
    sp.convoyAt = Infinity;
    for (let lane = 0; lane < 3; lane++) spawnShip(session, { lane, convoy: true });
    for (let i = 0; i < 2; i++) spawnWraith(session, 'sirenwisp', session.rng.range(160, W - 160), HORIZON + session.rng.range(8, 24));
    session.sfx.push('omen');
  }
  while (sp.crates.length && session.nightTime >= sp.crates[0]) {
    sp.crates.shift();
    spawnCrate(session);
  }
}
