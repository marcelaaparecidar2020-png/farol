// Between nights the keeper chooses one of three gifts for the lighthouse. Plain gifts make the lamp
// stronger; the sharper ones carry a cost (`cost`), and the two Oaths bind the whole watch to one duty:
// a keeper may swear only one of them.

export const UPGRADES = [
  { id: 'lens', name: 'Polished Lens', text: 'Beam burns 30% hotter.', icon: 'lens', max: 3, apply: (k) => (k.dmgMul += 0.3) },
  {
    id: 'mirror',
    name: 'Wide Mirror',
    text: 'Wide beam spreads 35% further.',
    cost: 'Wide beam burns 15% cooler.',
    icon: 'mirror',
    max: 2,
    apply: (k) => {
      k.wideHalf *= 1.35;
      k.wideMul *= 0.85;
    },
  },
  {
    id: 'burning',
    name: 'Burning Glass',
    text: 'Focused beam burns 50% hotter.',
    cost: 'Focus drinks oil 40% faster.',
    icon: 'burning',
    max: 2,
    apply: (k) => {
      k.focusMul *= 1.5;
      k.oilDrain *= 1.4;
    },
  },
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
    id: 'starshell',
    name: 'Star Shells',
    text: 'Flares burst twice as hot and far wider.',
    cost: 'One flare fewer in the rack.',
    icon: 'star',
    max: 1,
    when: (k) => k.flaresMax >= 2,
    apply: (k) => {
      k.flarePower = 2;
      k.flaresMax -= 1;
      k.flares = Math.min(k.flares, k.flaresMax);
    },
  },
  {
    id: 'mortar',
    name: 'Granite Mortar',
    text: '+40 max integrity, tower fully mended.',
    cost: 'The heavy lamp turns 30% slower.',
    icon: 'stone',
    max: 2,
    apply: (k) => {
      k.integrityMax += 40;
      k.integrity = k.integrityMax;
      k.turn *= 0.7;
    },
  },
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
  {
    id: 'harbour',
    name: "Harbourmaster's Oath",
    text: 'Ships home pay double oil, a flare and +400.',
    cost: 'Every wreck cracks the tower (−15).',
    icon: 'bell',
    max: 1,
    oath: true,
    apply: (k) => {
      k.oath = 'harbour';
      k.shipOil *= 2;
    },
  },
  {
    id: 'bastion',
    name: 'Bastion Oath',
    text: 'The tower mends itself; foghorn waits half as long.',
    cost: 'Ships pay no oil.',
    icon: 'shield',
    max: 1,
    oath: true,
    apply: (k) => {
      k.oath = 'bastion';
      k.mend = 0.5;
      k.foghornMax *= 0.5;
      k.shipOil = 0;
    },
  },
];

export function offerUpgrades(session, count = session.giftCount ?? 3) {
  const owned = session.upgrades;
  const k = session.keeper;
  const pool = UPGRADES.filter((u) => (owned[u.id] || 0) < u.max && !(u.oath && k.oath) && (!u.when || u.when(k)));
  const picks = [];
  while (picks.length < count && pool.length) {
    // drawn from the watch's plan, not the night's dice: the same choices meet the same gifts
    const i = Math.floor(session.plan.rng.next() * pool.length);
    const pick = pool.splice(i, 1)[0];
    picks.push(pick);
    // at most one oath on the table at a dawn, so the other cards still answer the night ahead
    if (pick.oath) for (let j = pool.length - 1; j >= 0; j--) if (pool[j].oath) pool.splice(j, 1);
  }
  return picks;
}

export function applyUpgrade(session, upgrade) {
  upgrade.apply(session.keeper);
  session.upgrades[upgrade.id] = (session.upgrades[upgrade.id] || 0) + 1;
}
