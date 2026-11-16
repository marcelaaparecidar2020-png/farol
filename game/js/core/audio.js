// Every sound in FAROL is synthesised here with WebAudio: the sea, the lamp's hum, the creatures' burning,
// the foghorn, the harbour bell and a slow generative score. Nothing is loaded from a file.

const SCALE = [0, 3, 5, 7, 10, 12, 15, 17]; // D minor pentatonic, two octaves
const ROOT_HZ = 146.83; // D3

export function createAudio() {
  let ctx = null;
  let master, sfxBus, musicBus, noiseBuffer, humGain, humOsc, oceanGain;
  let muted = false;
  let intensity = 1;
  let musicStep = 0;
  let nextNoteAt = 0;
  let musicTimer = null;

  const hz = (semi) => ROOT_HZ * Math.pow(2, semi / 12);

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(master);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    startOcean();
    startLampHum();
    nextNoteAt = ctx.currentTime + 0.2;
    musicTimer = setInterval(scheduleMusic, 90);
  }

  function startOcean() {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    oceanGain = ctx.createGain();
    oceanGain.gain.value = 0.16;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.11;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.09;
    swell.connect(swellDepth).connect(oceanGain.gain);
    src.connect(low).connect(oceanGain).connect(master);
    src.start();
    swell.start();
  }

  function startLampHum() {
    humOsc = ctx.createOscillator();
    humOsc.type = 'sawtooth';
    humOsc.frequency.value = 73.4;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    humGain = ctx.createGain();
    humGain.gain.value = 0;
    humOsc.connect(filter).connect(humGain).connect(sfxBus);
    humOsc.start();
  }

  function tone({ freq, type = 'sine', dur = 0.25, vol = 0.25, slideTo = null, attack = 0.006, delay = 0, bus = sfxBus }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.3, vol = 0.3, type = 'lowpass', freq = 900, slideTo = null, q = 0.8, delay = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t0);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(sfxBus);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }

  function bell(base, vol = 0.18, delay = 0) {
    [1, 2.01, 2.76, 4.07].forEach((ratio, i) => tone({ freq: base * ratio, dur: 2.2 - i * 0.4, vol: vol / (i + 1), delay }));
  }

  const SOUNDS = {
    burn: () => noise({ dur: 0.09, vol: 0.05, type: 'highpass', freq: 2600 }),
    kill: () => {
      tone({ freq: 620, type: 'triangle', dur: 0.22, vol: 0.12, slideTo: 180 });
      noise({ dur: 0.25, vol: 0.12, type: 'bandpass', freq: 1400, slideTo: 300 });
    },
    bigKill: () => {
      tone({ freq: 220, type: 'sawtooth', dur: 0.6, vol: 0.14, slideTo: 55 });
      noise({ dur: 0.7, vol: 0.25, freq: 1200, slideTo: 120 });
    },
    flare: () => {
      noise({ dur: 0.35, vol: 0.18, type: 'bandpass', freq: 500, slideTo: 3000, q: 2 });
      noise({ dur: 0.9, vol: 0.32, freq: 1600, slideTo: 90, delay: 0.3 });
      tone({ freq: 90, type: 'sine', dur: 0.8, vol: 0.3, slideTo: 40, delay: 0.3 });
    },
    foghorn: () => {
      tone({ freq: 69, type: 'sawtooth', dur: 1.5, vol: 0.2, attack: 0.15 });
      tone({ freq: 69.8, type: 'sawtooth', dur: 1.5, vol: 0.18, attack: 0.15 });
      tone({ freq: 104, type: 'square', dur: 1.3, vol: 0.05, attack: 0.2 });
    },
    towerHit: () => {
      tone({ freq: 110, type: 'square', dur: 0.25, vol: 0.18, slideTo: 50 });
      noise({ dur: 0.4, vol: 0.28, freq: 600, slideTo: 80 });
    },
    shipSaved: () => bell(523.25, 0.16),
    wreck: () => {
      noise({ dur: 1.2, vol: 0.35, freq: 400, slideTo: 60 });
      tone({ freq: 180, type: 'triangle', dur: 0.9, vol: 0.12, slideTo: 70, delay: 0.1 });
    },
    lightning: () => {
      noise({ dur: 0.18, vol: 0.4, type: 'highpass', freq: 1800 });
      noise({ dur: 2.6, vol: 0.38, freq: 260, slideTo: 40, delay: 0.25 });
    },
    nightStart: () => {
      bell(293.66, 0.14);
      bell(220, 0.1, 0.7);
    },
    dawn: () => [0, 4, 7, 12].forEach((s, i) => tone({ freq: 392 * Math.pow(2, s / 12), type: 'triangle', dur: 1.6, vol: 0.09, delay: i * 0.14 })),
    pick: () => [0, 7, 12].forEach((s, i) => tone({ freq: 523.25 * Math.pow(2, s / 12), type: 'triangle', dur: 0.4, vol: 0.1, delay: i * 0.06 })),
    hover: () => tone({ freq: 880, type: 'sine', dur: 0.06, vol: 0.04 }),
    click: () => tone({ freq: 660, type: 'triangle', dur: 0.1, vol: 0.08 }),
    empty: () => tone({ freq: 140, type: 'square', dur: 0.12, vol: 0.06, slideTo: 90 }),
    bossRise: () => {
      tone({ freq: 46, type: 'sawtooth', dur: 3.5, vol: 0.28, attack: 0.8, slideTo: 38 });
      noise({ dur: 3.5, vol: 0.3, freq: 300, slideTo: 60 });
    },
    bossEye: () => tone({ freq: 196, type: 'sawtooth', dur: 0.7, vol: 0.1, slideTo: 392 }),
    victory: () => [0, 4, 7, 11, 12, 16, 19, 24].forEach((s, i) => tone({ freq: 261.63 * Math.pow(2, s / 12), type: 'triangle', dur: 1.8, vol: 0.08, delay: i * 0.12 })),
    defeat: () => [12, 10, 7, 3, 0].forEach((s, i) => tone({ freq: 220 * Math.pow(2, s / 12), type: 'sine', dur: 1.4, vol: 0.12, delay: i * 0.28 })),
  };

  function scheduleMusic() {
    if (!ctx || muted) return;
    const beat = 60 / 76 / 2;
    while (nextNoteAt < ctx.currentTime + 0.4) {
      const bar = Math.floor(musicStep / 8);
      const chordRoot = [0, -2, -4, -5][bar % 4];
      const delay = Math.max(0, nextNoteAt - ctx.currentTime);
      if (musicStep % 8 === 0) {
        tone({ freq: hz(chordRoot - 12), type: 'triangle', dur: beat * 7.5, vol: 0.16, attack: 0.4, delay, bus: musicBus });
        tone({ freq: hz(chordRoot + 7 - 12), type: 'sine', dur: beat * 7.5, vol: 0.08, attack: 0.6, delay, bus: musicBus });
      }
      const pattern = [0, 2, 4, 2, 5, 4, 2, 1];
      const playArp = intensity >= 2 || musicStep % 2 === 0;
      if (playArp) {
        const semi = SCALE[(pattern[musicStep % 8] + bar) % SCALE.length] + chordRoot;
        tone({ freq: hz(semi + 12), type: 'sine', dur: beat * 1.6, vol: 0.05 + 0.012 * intensity, delay, bus: musicBus });
      }
      if (intensity >= 4 && musicStep % 4 === 2) noise({ dur: 0.08, vol: 0.05, type: 'highpass', freq: 5000, delay });
      if (intensity >= 3 && musicStep % 8 === 0) tone({ freq: 55, type: 'sine', dur: 0.35, vol: 0.2, slideTo: 40, delay, bus: musicBus });
      musicStep++;
      nextNoteAt += beat;
    }
  }

  return {
    unlock,
    play(name) {
      if (ctx && !muted && SOUNDS[name]) SOUNDS[name]();
    },
    /** 0 = lamp idle, 1 = focused beam roaring. */
    setFocus(level) {
      if (!ctx) return;
      humGain.gain.setTargetAtTime(muted ? 0 : 0.012 + level * 0.07, ctx.currentTime, 0.05);
      humOsc.frequency.setTargetAtTime(73.4 + level * 36, ctx.currentTime, 0.08);
    },
    setIntensity(level) {
      intensity = level;
    },
    toggleMute() {
      muted = !muted;
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.85, ctx.currentTime, 0.05);
      return muted;
    },
    get muted() {
      return muted;
    },
    stop() {
      if (musicTimer) clearInterval(musicTimer);
    },
  };
}
