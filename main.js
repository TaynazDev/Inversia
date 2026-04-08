import { createStarfield } from './starfield.js';
import { createHUD } from './ui.js';
import { createAudioEngine } from './audio.js';
import { createLeaderboard } from './leaderboard.js';
import { fluxMode } from './modes/flux.js';
import { commandMode } from './modes/command.js';
import { bridgeMode } from './modes/bridge.js';

const canvas = document.getElementById('gameCanvas');
const uiLayer = document.getElementById('ui-layer');

const starfield = createStarfield(canvas);
const hud = createHUD(uiLayer);
const audio = createAudioEngine();
const leaderboard = createLeaderboard();
hud.attachLeaderboard(leaderboard);

const modes = {
  flux: fluxMode,
  command: commandMode,
  bridge: bridgeMode,
};

let activeMode = null;

const WAVE_INTERMISSION_MS = 500;
const WAVE_BADGE_MS = 1500;
const WAVE_DRIFT_SCALE = 1.06;
const WAVE_FIRE_SCALE = 1.08;
const WAVE_DIVE_SCALE = 1.05;

const DEFAULT_GAME_STATE = {
  mode: null,
  score: 0,
  wave: 1,
  lives: 3,
  running: false,
  paused: false,
};

export const gameState = {
  ...DEFAULT_GAME_STATE,
};

function createWaveController(uiContainer, state) {
  let phase = 'combat';
  let phaseUntil = 0;
  let pendingWave = 1;
  let highWaveReached = 1;
  let badgeElement = null;

  function ensureBadge() {
    if (badgeElement && badgeElement.parentElement !== uiContainer) {
      uiContainer.appendChild(badgeElement);
    }

    if (badgeElement) {
      return badgeElement;
    }

    const badge = document.createElement('div');
    badge.style.position = 'absolute';
    badge.style.left = '50%';
    badge.style.top = '50%';
    badge.style.transform = 'translate(-50%, -50%)';
    badge.style.padding = '16px 24px';
    badge.style.borderRadius = '16px';
    badge.style.background = 'rgba(255, 255, 255, 0.08)';
    badge.style.border = '1px solid rgba(255, 255, 255, 0.22)';
    badge.style.backdropFilter = 'blur(12px)';
    badge.style.webkitBackdropFilter = 'blur(12px)';
    badge.style.color = 'rgba(255, 255, 255, 0.96)';
    badge.style.fontFamily = '"Courier New", monospace';
    badge.style.fontSize = '30px';
    badge.style.fontWeight = '700';
    badge.style.letterSpacing = '0.08em';
    badge.style.textAlign = 'center';
    badge.style.boxShadow = '0 0 26px rgba(255, 255, 255, 0.18)';
    badge.style.pointerEvents = 'none';
    badge.style.display = 'none';
    uiContainer.appendChild(badge);
    badgeElement = badge;
    return badgeElement;
  }

  function hideBadge() {
    if (badgeElement) {
      badgeElement.style.display = 'none';
    }
  }

  function showBadge(text) {
    const badge = ensureBadge();
    badge.textContent = text;
    badge.style.display = 'block';
  }

  function resetRun() {
    phase = 'combat';
    phaseUntil = 0;
    pendingWave = 1;
    highWaveReached = 1;
    state.wave = 1;
    hideBadge();
  }

  function beginWaveTransition(now = performance.now()) {
    if (phase !== 'combat') {
      return;
    }
    pendingWave = state.wave + 1;
    phase = 'wait';
    phaseUntil = now + WAVE_INTERMISSION_MS;
  }

  function update(now = performance.now()) {
    if (phase === 'wait' && now >= phaseUntil) {
      showBadge(`WAVE ${pendingWave}`);
      phase = 'badge';
      phaseUntil = now + WAVE_BADGE_MS;
      return { action: 'intermission-badge' };
    }

    if (phase === 'badge' && now >= phaseUntil) {
      hideBadge();
      state.wave = pendingWave;
      highWaveReached = Math.max(highWaveReached, state.wave);
      phase = 'combat';
      return {
        action: state.wave % 5 === 0 ? 'spawn-boss' : 'spawn-formation',
        wave: state.wave,
      };
    }

    return { action: 'none' };
  }

  function driftMultiplier() {
    return Math.pow(WAVE_DRIFT_SCALE, Math.max(0, state.wave - 1));
  }

  function fireMultiplier() {
    return Math.pow(WAVE_FIRE_SCALE, Math.max(0, state.wave - 1));
  }

  function diveMultiplier() {
    return Math.pow(WAVE_DIVE_SCALE, Math.max(0, state.wave - 1));
  }

  function scaleRangeForRate(min, max, multiplier) {
    return [min / multiplier, max / multiplier];
  }

  return {
    resetRun,
    beginWaveTransition,
    update,
    isCombatPhase: () => phase === 'combat',
    getDriftMultiplier: driftMultiplier,
    getFireRange: (min, max) => scaleRangeForRate(min, max, fireMultiplier()),
    getDiveRange: (min, max) => scaleRangeForRate(min, max, diveMultiplier()),
    getHighWaveReached: () => highWaveReached,
    dispose: () => hideBadge(),
  };
}

const waveController = createWaveController(uiLayer, gameState);

export function resetGameState() {
  Object.assign(gameState, DEFAULT_GAME_STATE);
  waveController.resetRun();
}

export function drawTriangle(ctx, x, y, width, height, direction, color, glowStrength) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const leftX = x - halfWidth;
  const rightX = x + halfWidth;
  const topY = y - halfHeight;
  const bottomY = y + halfHeight;
  const apexUp = direction !== 'down';

  ctx.beginPath();

  if (apexUp) {
    ctx.moveTo(x, topY);
    ctx.lineTo(rightX, bottomY);
    ctx.lineTo(leftX, bottomY);
  } else {
    ctx.moveTo(x, bottomY);
    ctx.lineTo(rightX, topY);
    ctx.lineTo(leftX, topY);
  }

  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glowStrength;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function drawCircle(ctx, x, y, radius, color, glowStrength) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glowStrength;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function drawBullet(ctx, x, y, width, height, color, glowStrength) {
  const left = x - width / 2;
  const top = y - height / 2;

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glowStrength;
  ctx.fillRect(left, top, width, height);
  ctx.shadowBlur = 0;
}

export const POWERUP_RADIUS = 8;
export const POWERUP_DRIFT_SPEED = 1;
export const POWERUP_TYPES = ['shield', 'multi', 'fleet'];
export const POWERUP_COLORS = {
  shield: '#00eeff',
  multi: '#ffee00',
  fleet: '#00ff88',
};
export const MULTI_SHOT_DURATION_MS = 8000;

export function spawnPowerup(x, y) {
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  return {
    x,
    y,
    radius: POWERUP_RADIUS,
    type,
    color: POWERUP_COLORS[type],
  };
}

export function startMode(modeName = 'flux') {
  activeMode?.stop?.();

  const mode = modes[modeName] ?? fluxMode;
  activeMode = mode;

  resetGameState();

  starfield.start();
  hud.showMode(modeName);
  mode.start?.({
    canvas,
    uiLayer,
    audio,
    leaderboard,
    starfield,
    hud,
    gameState,
    drawTriangle,
    drawCircle,
    drawBullet,
    spawnPowerup,
    POWERUP_RADIUS,
    POWERUP_DRIFT_SPEED,
    POWERUP_COLORS,
    MULTI_SHOT_DURATION_MS,
    waveController,
    startMode,
  });
}

export const startGame = startMode;

starfield.start();
hud.showLoading(1000).then(() => {
  hud.showMainMenu(startMode, audio);
});
