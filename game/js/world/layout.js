// Fixed geography of the bay: logical screen size, the horizon, the lamp, the reefs and the shipping lanes.

export const W = 1280;
export const H = 720;
export const HORIZON = 206;

/** The lamp room at the top of the tower: the beam's origin. */
export const LAMP = { x: 640, y: 446 };
/** Where creatures strike the tower. */
export const TOWER_TARGET = { x: 640, y: 600 };
export const TOWER_HIT_RADIUS = 56;

export const SHIP_LANES = [
  { y: 268, dir: 1 },
  { y: 330, dir: -1 },
  { y: 392, dir: 1 },
];

export const REEFS = [
  { x: 286, y: 270, r: 30 },
  { x: 902, y: 266, r: 36 },
  { x: 520, y: 334, r: 26 },
  { x: 1056, y: 330, r: 32 },
  { x: 184, y: 394, r: 30 },
  { x: 792, y: 396, r: 34 },
];

export const REEF_DANGER_X = 150;
export const REEF_DANGER_Y = 34;

/** Spawn points ring the bay: the two side edges and the line of the horizon. */
export function spawnPoint(rng) {
  const side = rng.next();
  if (side < 0.3) return { x: -30, y: rng.range(250, 600) };
  if (side < 0.6) return { x: W + 30, y: rng.range(250, 600) };
  return { x: rng.range(60, W - 60), y: HORIZON + rng.range(6, 30) };
}
