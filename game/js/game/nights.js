// The five nights of a watch. Each lists how long until dawn, which creatures come and how often (seconds
// between spawns at the start of the night; the pace quickens toward dawn), and when ships pass.
// Nights II–IV also bring one newcomer, drawn per watch (see omens.js): `featured` is how often it comes.
// Night V brings back every newcomer at `newcomers` seconds apart.

export const NIGHTS = [
  {
    title: 'The First Tide',
    hint: 'Sweep the beam over the eyes in the dark.',
    duration: 50,
    darkness: 0.72,
    storm: 0.3,
    spawns: { murkling: 2.3 },
    packs: 0,
    ships: [5, 27],
  },
  {
    title: 'Wings over Water',
    hint: 'Gloomrays swoop fast. Hold the mouse to focus the beam.',
    duration: 58,
    darkness: 0.76,
    storm: 0.5,
    spawns: { murkling: 1.9, gloomray: 6.5 },
    packs: 16,
    ships: [4, 22, 40],
    featured: 8.5,
  },
  {
    title: 'The Brine Wakes',
    hint: 'Brinehulks shrug off the wide beam. Focus it on them.',
    duration: 66,
    darkness: 0.79,
    storm: 0.7,
    spawns: { murkling: 1.6, gloomray: 5, brinehulk: 17, sirenwisp: 14 },
    packs: 13,
    ships: [3, 18, 34, 50],
    featured: 10,
  },
  {
    title: 'Sirens in the Spray',
    hint: 'Siren-wisps hunt the ships. Burn them before a hull breaks.',
    duration: 72,
    darkness: 0.82,
    storm: 0.9,
    spawns: { murkling: 1.3, gloomray: 3.9, brinehulk: 11, sirenwisp: 8 },
    packs: 10,
    ships: [3, 16, 29, 42, 56],
    featured: 7.5,
  },
  {
    title: 'The Undertow',
    hint: 'Pour the light into its eye when it opens.',
    duration: null,
    darkness: 0.84,
    storm: 1,
    spawns: { murkling: 2.8, gloomray: 9, sirenwisp: 15 },
    packs: 18,
    ships: [9, 45, 85],
    newcomers: 24,
    boss: true,
  },
];

export const LAST_NIGHT = NIGHTS.length;
