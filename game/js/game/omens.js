// Omens: at each dawn the keeper reads the sky and charts the coming night from two omens. Every omen bends
// one rule of the night and pays for the trouble in its own way, so the choice is a real wager, not a skin.
// The watch's plan (which new creature each night brings, which omens are offered) comes from its own seeded
// generator, so a watch replays exactly from its seed whatever happens in play.

import { createRng } from '../core/rng.js';

export const OMENS = {
  calm: { id: 'calm', name: 'Clear Sky', icon: 'moon', risk: '', reward: '' },
  fog: {
    id: 'fog',
    name: 'Fog Bank',
    icon: 'fog',
    risk: 'The beam reaches only half the bay.',
    reward: 'Every creature burned scores ×1.5.',
    range: 500,
    darkness: 0.06,
    scoreMul: 1.5,
  },
  convoy: {
    id: 'convoy',
    name: 'The Convoy',
    icon: 'ship',
    risk: 'Three ships sail at once, siren-wisps on their wake.',
    reward: 'Each convoy ship brought home pays +600 and oil.',
    convoyAt: 0.42,
  },
  redtide: {
    id: 'redtide',
    name: 'Red Tide',
    icon: 'tide',
    risk: 'Creatures rise 35% faster.',
    reward: 'Double score, and burn chains last longer.',
    pace: 1.35,
    scoreMul: 2,
    comboWindow: 3.4,
  },
  thunder: {
    id: 'thunder',
    name: 'Thunderhead',
    icon: 'bolt',
    risk: 'Lightning twice as often, and each bolt blinds the lamp.',
    reward: 'Every bolt scorches and stuns all creatures.',
    strikeRate: 2,
  },
  flotsam: {
    id: 'flotsam',
    name: 'Flotsam',
    icon: 'crate',
    risk: 'More creatures rise from the wreckage.',
    reward: 'Cargo drifts by: hold the beam on it to haul oil, flares and stone.',
    pace: 1.12,
    crates: 6,
  },
  still: {
    id: 'still',
    name: 'Still Water',
    icon: 'wave',
    risk: 'Next dawn offers only two gifts.',
    reward: 'A quieter night: 25% fewer creatures.',
    pace: 0.75,
    giftsNext: 2,
  },
};

const DECK = ['fog', 'convoy', 'redtide', 'thunder', 'flotsam', 'still'];
/** The three creatures that each watch introduces, one per night from Night II, in a seeded order. */
export const NEWCOMERS = ['wickmoth', 'broodmaw', 'veilfin'];

export function planWatch(seed) {
  const rng = createRng(seed * 2654435761 + 977);
  const featured = [...NEWCOMERS];
  for (let i = featured.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [featured[i], featured[j]] = [featured[j], featured[i]];
  }
  return { rng, featured, chosen: [] };
}

/** The new creature a night brings (Night II–IV), or null. */
export function featuredFor(plan, night) {
  return night >= 2 && night <= 4 ? plan.featured[night - 2] : null;
}

/** Two omens, never one already weathered this watch, for the keeper to choose between. */
export function offerOmens(plan) {
  const pool = DECK.filter((id) => !plan.chosen.includes(id));
  const picks = [];
  while (picks.length < 2 && pool.length) picks.push(OMENS[pool.splice(Math.floor(plan.rng.next() * pool.length), 1)[0]]);
  return picks;
}

export function omenById(id) {
  return OMENS[id] ?? OMENS.calm;
}
