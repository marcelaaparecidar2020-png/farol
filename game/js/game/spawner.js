// Brings each night's creatures and ships on schedule, quickening as dawn nears.

import { NIGHTS } from './nights.js';
import { spawnWraith } from '../world/wraiths.js';
import { spawnShip } from '../world/ships.js';
import { spawnPoint } from '../world/layout.js';

export function createSpawner(nightIndex) {
  const night = NIGHTS[nightIndex - 1];
  const timers = {};
  for (const [type, every] of Object.entries(night.spawns)) timers[type] = every * 0.6;
  return { night, timers, packT: night.packs || Infinity, shipsLeft: [...night.ships] };
}

export function updateSpawner(session, dt) {
  const sp = session.spawner;
  if (!sp || session.phase !== 'night') return;
  const night = sp.night;
  const progress = night.duration ? session.nightTime / night.duration : Math.min(1, session.nightTime / 120);
  const pace = 1 + progress * 0.55;

  for (const [type, every] of Object.entries(night.spawns)) {
    sp.timers[type] -= dt * pace;
    if (sp.timers[type] <= 0) {
      sp.timers[type] += every * session.rng.range(0.75, 1.25);
      const p = spawnPoint(session.rng);
      spawnWraith(session, type, p.x, p.y);
    }
  }
  sp.packT -= dt * pace;
  if (sp.packT <= 0) {
    sp.packT = night.packs * session.rng.range(0.8, 1.2);
    const p = spawnPoint(session.rng);
    const size = 3 + Math.floor(session.night / 2);
    for (let i = 0; i < size; i++) spawnWraith(session, 'murkling', p.x + session.rng.range(-40, 40), p.y + session.rng.range(-20, 20));
  }
  while (sp.shipsLeft.length && session.nightTime >= sp.shipsLeft[0]) {
    sp.shipsLeft.shift();
    spawnShip(session);
  }
}
