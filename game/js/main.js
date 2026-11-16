// FAROL — The Last Keeper. Boot, screen flow (title → nights ⇄ dawn gifts → results) and the frame loop.

import { W, H } from './world/layout.js';
import { createInput } from './core/input.js';
import { createAudio } from './core/audio.js';
import { createSession, updateSession, advanceNight, isOver, STEP } from './game/session.js';
import { createAutopilot, autopilotControls } from './game/autopilot.js';
import { offerUpgrades, applyUpgrade } from './game/upgrades.js';
import { loadBest, saveBest } from './game/scoring.js';
import { SCENES } from './game/scenes.js';
import { drawWorld } from './render/scene.js';
import { drawHud, drawNightBanner, drawControlsStrip } from './ui/hud.js';
import { drawTitle, drawUpgradePicker, drawPause, drawResults, cardRects, RESULTS_AGAIN } from './ui/screens.js';
import { inside, text } from './ui/draw.js';

const canvas = document.getElementById('farol');
const ctx = canvas.getContext('2d');
const DPR = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * DPR;
canvas.height = H * DPR;

function fitToWindow() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fitToWindow);
fitToWindow();

const toLogical = (cx, cy) => {
  const r = canvas.getBoundingClientRect();
  return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
};
const input = createInput(canvas, toLogical);
const audio = createAudio();

const ui = { screen: 'title', t: 0, screenT: 0, best: loadBest(), offers: [], hoverCard: -1, hoverStart: false, hoverAgain: false, newBest: false, mutedNote: 0 };
let session = null;
let pilot = null;
let frozen = false;
let shotPointer = null;
let attractRuns = 0;

function setScreen(name) {
  ui.screen = name;
  ui.screenT = 0;
  canvas.style.cursor = name === 'play' ? 'none' : 'default';
}

function newAttract() {
  attractRuns++;
  session = createSession({ seed: 41 + attractRuns, night: 2 + (attractRuns % 3), attract: true });
  pilot = createAutopilot();
  setScreen('title');
}

function startRun() {
  audio.unlock();
  audio.play('click');
  session = createSession({ seed: Math.floor(Math.random() * 1e9) });
  pilot = null;
  setScreen('play');
}

function finishRun() {
  ui.newBest = saveBest(session.stats.score);
  ui.best = Math.max(ui.best, session.stats.score);
  setScreen('results');
}

function playerControls(firstStep) {
  const p = input.pointer;
  return {
    aimX: p.x,
    aimY: p.y,
    focus: p.down,
    flare: firstStep && (input.rightClicked || input.wasPressed('Space')),
    foghorn: firstStep && input.wasPressed('ShiftLeft', 'ShiftRight'),
  };
}

const IDLE = { aimX: 640, aimY: 300, focus: false, flare: false, foghorn: false };

function handleScreens() {
  const p = input.pointer;
  if (input.wasPressed('KeyM')) {
    audio.toggleMute();
    ui.mutedNote = 1.6;
  }
  switch (ui.screen) {
    case 'title':
      ui.hoverStart = inside(p, { x: 490, y: 452, w: 300, h: 58 });
      if (input.leftClicked || input.wasPressed('Enter', 'NumpadEnter', 'Space')) startRun();
      break;
    case 'play':
      if (input.wasPressed('KeyP', 'Escape')) setScreen('pause');
      else if (session.phase === 'cleared') {
        ui.offers = offerUpgrades(session);
        ui.hoverCard = -1;
        setScreen('upgrade');
      } else if (isOver(session)) finishRun();
      break;
    case 'pause':
      if (input.wasPressed('KeyP', 'Escape')) setScreen('play');
      else if (input.wasPressed('KeyQ')) {
        session.phase = 'fallen';
        session.keeper.outage = 1;
        finishRun();
      }
      break;
    case 'upgrade': {
      const rects = cardRects();
      ui.hoverCard = rects.findIndex((r) => inside(p, r));
      let choice = -1;
      if (ui.screenT > 0.6) {
        if (input.leftClicked && ui.hoverCard >= 0) choice = ui.hoverCard;
        ['Digit1', 'Digit2', 'Digit3'].forEach((code, i) => input.wasPressed(code, `Numpad${i + 1}`) && (choice = i));
      }
      if (choice >= 0 && ui.offers[choice]) {
        applyUpgrade(session, ui.offers[choice]);
        audio.play('pick');
        advanceNight(session);
        setScreen('play');
      }
      break;
    }
    case 'results':
      ui.hoverAgain = inside(p, RESULTS_AGAIN);
      if (ui.screenT > 0.8 && ((input.leftClicked && ui.hoverAgain) || input.wasPressed('KeyR', 'Enter'))) startRun();
      else if (input.wasPressed('Escape')) newAttract();
      break;
  }
}

function step(firstStep) {
  if (ui.screen === 'pause') return;
  if (ui.screen === 'title') {
    updateSession(session, autopilotControls(session, pilot, STEP), STEP);
    if (session.phase !== 'night' && session.phase !== 'dawn') newAttract();
    session.sfx.length = 0;
  } else if (ui.screen === 'play') updateSession(session, playerControls(firstStep), STEP);
  else updateSession(session, IDLE, STEP);
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawWorld(ctx, session);
  switch (ui.screen) {
    case 'title':
      drawTitle(ctx, ui);
      break;
    case 'play':
      drawNightBanner(ctx, session);
      drawHud(ctx, session, shotPointer ?? input.pointer);
      drawControlsStrip(ctx, 382, H - 26);
      break;
    case 'pause':
      drawHud(ctx, session, null);
      drawPause(ctx);
      break;
    case 'upgrade':
      drawUpgradePicker(ctx, ui, session);
      break;
    case 'results':
      drawResults(ctx, ui, session);
      break;
  }
  if (ui.mutedNote > 0) text(ctx, audio.muted ? 'SOUND OFF' : 'SOUND ON', W / 2, H - 60, { size: 16, weight: 900, align: 'center', alpha: Math.min(1, ui.mutedNote) });
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!frozen) {
    ui.t += dt;
    ui.screenT += dt;
    ui.mutedNote = Math.max(0, ui.mutedNote - dt);
    handleScreens();
    acc += dt;
    let first = true;
    while (acc >= STEP) {
      step(first);
      first = false;
      acc -= STEP;
    }
    if (ui.screen !== 'title') {
      for (const name of session.sfx) audio.play(name);
      audio.setIntensity(session.night);
    }
    session.sfx.length = 0;
    audio.setFocus(ui.screen === 'play' ? session.keeper.focusLevel : 0);
  }
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

// Screenshot scenes: ?shot=title|play|boss|upgrade|end&seed=N
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot && SCENES[shot]) {
  const scene = SCENES[shot](Number(params.get('seed')) || 1, params.has('at') ? Number(params.get('at')) : undefined);
  session = scene.session;
  pilot = scene.pilot;
  ui.offers = scene.offers ?? [];
  ui.hoverCard = scene.hoverCard ?? -1;
  ui.best = scene.screen === 'results' ? session.stats.score : 0;
  ui.t = 1.3;
  setScreen(scene.screen);
  shotPointer = scene.pointer ?? null;
  frozen = true;
  render();
  document.body.dataset.ready = '1';
} else {
  newAttract();
}

window.farol = { ui, get session() { return session; } };
requestAnimationFrame(frame);
