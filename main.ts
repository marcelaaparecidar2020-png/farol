// FAROL — The Last Keeper: make.fun best-game-01 entry program (Node 22, standard library only).
//
// The game itself lives in game/ as static files (no build step, no network). This program hands it in:
// it copies game/ and screenshots/ into the output directory and writes dossier.json with the kit's
// unchanged vendor/makefun-game.ts. The grader uses /output; locally set MAKEFUN_OUTPUT_DIR instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyFolder(name: string): void {
  const from = join(repoRoot, name);
  if (!existsSync(from)) throw new Error(`missing ${name}/ beside main.ts`);
  cpSync(from, join(outputDir, name), { recursive: true });
}

// The gate wants game/index.html as a regular file of at most 1 MiB; fail loudly here rather than at the gate.
const indexHtml = join(repoRoot, 'game', 'index.html');
if (!existsSync(indexHtml) || !statSync(indexHtml).isFile()) throw new Error('game/index.html is missing');
if (statSync(indexHtml).size > 1024 * 1024) throw new Error('game/index.html is over 1 MiB');

mkdirSync(outputDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');

const shotCount = readdirSync(join(outputDir, 'screenshots')).filter((f) => !f.startsWith('.')).length;
if (shotCount < 3 || shotCount > 4) throw new Error(`screenshots/ must hold 3 or 4 images, found ${shotCount}`);

// Caps mirror the scorer's gate: 160 KiB of source text, 4 screenshots of 256 KiB, 993 game entries, 48 MiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
