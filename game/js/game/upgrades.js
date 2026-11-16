// Between nights the keeper chooses one of three improvements to the lighthouse.

export const UPGRADES = [
  { id: 'lens', name: 'Polished Lens', text: 'Beam burns 30% hotter.', icon: 'lens', max: 3, apply: (k) => (k.dmgMul += 0.3) },
  { id: 'mirror', name: 'Wide Mirror', text: 'Wide beam spreads 30% further.', icon: 'mirror', max: 2, apply: (k) => (k.wideHalf *= 1.3) },
  {
    id: 'cistern',
    name: 'Oil Cistern',
    text: '+40 oil capacity, filled now.',
    icon: 'oil',
    max: 3,
    apply: (k) => {
      k.oilMax += 40;
      k.oil = k.oilMax;
    },
  },
  { id: 'wick', name: 'Twin Wick', text: 'Oil refills 60% faster.', icon: 'wick', max: 2, apply: (k) => (k.oilRegen *= 1.6) },
  {
    id: 'flares',
    name: 'Flare Crate',
    text: '+1 flare. Flares return faster.',
    icon: 'flare',
    max: 3,
    apply: (k) => {
      k.flaresMax += 1;
      k.flares = k.flaresMax;
      k.flareRecharge *= 0.8;
    },
  },
  {
    id: 'mortar',
    name: 'Stone Mortar',
    text: '+25 max integrity, tower fully mended.',
    icon: 'stone',
    max: 3,
    apply: (k) => {
      k.integrityMax += 25;
      k.integrity = k.integrityMax;
    },
  },
  { id: 'bell', name: 'Harbour Bell', text: 'Saved ships give double oil and a flare.', icon: 'bell', max: 1, apply: (k) => (k.harborBell = 1) },
  { id: 'ember', name: 'Ember Glass', text: 'Focused light sets creatures ablaze.', icon: 'ember', max: 2, apply: (k) => (k.emberGlass += 1) },
  {
    id: 'bellows',
    name: 'Great Bellows',
    text: 'Foghorn: 40% shorter wait, harder push.',
    icon: 'horn',
    max: 2,
    apply: (k) => {
      k.foghornMax *= 0.6;
      k.foghornPower += 0.4;
    },
  },
  { id: 'rod', name: 'Lightning Rod', text: 'Every lightning strike scorches all creatures.', icon: 'bolt', max: 2, apply: (k) => (k.lightningRod += 1) },
];

export function offerUpgrades(session, count = 3) {
  const owned = session.upgrades;
  const pool = UPGRADES.filter((u) => (owned[u.id] || 0) < u.max);
  const picks = [];
  while (picks.length < count && pool.length) {
    const i = Math.floor(session.rng.next() * pool.length);
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(session, upgrade) {
  upgrade.apply(session.keeper);
  session.upgrades[upgrade.id] = (session.upgrades[upgrade.id] || 0) + 1;
}
