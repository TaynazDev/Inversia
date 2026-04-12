let context = null;
let masterGain = null;
let ambientOscillator = null;
let ambientGain = null;
let initialized = false;
let listenersArmed = false;
let masterVolume = 1;

function createDistortionCurve(amount = 120) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / samples - 1;
    curve[index] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function createNodePair(type, frequency, startTime, duration, maxGain) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(maxGain, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
  return { oscillator, gain };
}

function ensureAmbientDrone() {
  if (ambientOscillator) {
    return;
  }

  ambientOscillator = context.createOscillator();
  ambientGain = context.createGain();
  ambientOscillator.type = 'sine';
  ambientOscillator.frequency.setValueAtTime(40, context.currentTime);
  ambientGain.gain.setValueAtTime(0.025, context.currentTime);
  ambientOscillator.connect(ambientGain);
  ambientGain.connect(masterGain);
  ambientOscillator.start();
}

async function init() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = context.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(context.destination);
  }

  if (context.state === 'suspended') {
    await context.resume();
  }

  ensureAmbientDrone();
  initialized = true;
  return context;
}

function armAutoInit() {
  if (listenersArmed || typeof window === 'undefined') {
    return;
  }

  listenersArmed = true;
  const activate = () => {
    AudioEngine.init();
    window.removeEventListener('click', activate);
    window.removeEventListener('keydown', activate);
  };

  window.addEventListener('click', activate, { once: true });
  window.addEventListener('keydown', activate, { once: true });
}

function play(soundName) {
  if (!context || !initialized) {
    return;
  }

  const t = context.currentTime;

  if (soundName === 'shoot') {
    createNodePair('sine', 880, t, 0.08, 0.3);
    return;
  }

  if (soundName === 'enemyDeath') {
    const { oscillator, gain } = createNodePair('sine', 400, t, 0.15, 0.25);
    oscillator.frequency.exponentialRampToValueAtTime(180, t + 0.15);
    gain.gain.setValueAtTime(0.25, t);
    return;
  }

  if (soundName === 'playerHit') {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const shaper = context.createWaveShaper();
    shaper.curve = createDistortionCurve(180);
    shaper.oversample = '4x';

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(90, t);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    oscillator.connect(shaper);
    shaper.connect(gain);
    gain.connect(masterGain);

    oscillator.start(t);
    oscillator.stop(t + 0.2);
    return;
  }

  if (soundName === 'powerup') {
    const { oscillator, gain } = createNodePair('sine', 600, t, 0.25, 0.3);
    oscillator.frequency.exponentialRampToValueAtTime(1300, t + 0.25);
    gain.gain.setValueAtTime(0.3, t);
    return;
  }

  if (soundName === 'bossArrival') {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(55, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(t);
    oscillator.stop(t + 0.9);
    return;
  }

  if (soundName === 'bossDeath') {
    const low = createNodePair('sine', 80, t, 0.5, 0.6);
    low.oscillator.frequency.exponentialRampToValueAtTime(45, t + 0.5);

    const burstOsc = context.createOscillator();
    const burstGain = context.createGain();
    const burstFilter = context.createBiquadFilter();
    burstOsc.type = 'sawtooth';
    burstOsc.frequency.setValueAtTime(900, t);
    burstOsc.frequency.exponentialRampToValueAtTime(120, t + 0.5);
    burstFilter.type = 'bandpass';
    burstFilter.frequency.setValueAtTime(1500, t);
    burstFilter.frequency.exponentialRampToValueAtTime(280, t + 0.5);
    burstFilter.Q.value = 0.9;

    burstGain.gain.setValueAtTime(0.6, t);
    burstGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    burstOsc.connect(burstFilter);
    burstFilter.connect(burstGain);
    burstGain.connect(masterGain);

    burstOsc.start(t);
    burstOsc.stop(t + 0.5);
    return;
  }

  if (soundName === 'waveClear') {
    const notes = [500, 700, 1000];
    notes.forEach((frequency, index) => {
      const start = t + index * 0.1;
      createNodePair('sine', frequency, start, 0.1, 0.25);
    });
  }
}

export const AudioEngine = {
  init,
  play,
  get audioContext() {
    return context;
  },
  get outputNode() {
    return masterGain;
  },
  resume() {
    return init();
  },
  playClick() {
    play('shoot');
  },
  playPowerup() {
    play('powerup');
  },
  playBossDeath() {
    play('bossDeath');
  },
  setMasterVolume(value) {
    const next = Math.max(0, Math.min(1, Number(value) || 0));
    masterVolume = next;
    if (masterGain && context) {
      masterGain.gain.setValueAtTime(masterVolume, context.currentTime);
    }
    return masterVolume;
  },
  getMasterVolume() {
    return masterVolume;
  },
};

armAutoInit();

export function createAudioEngine() {
  return AudioEngine;
}
