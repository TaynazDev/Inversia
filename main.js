import { createStarfield } from './starfield.js';
import { createHUD } from './ui.js';
import { createAudioEngine } from './audio.js';
import { createLeaderboard } from './leaderboard.js';
import { fluxMode } from './modes/flux.js';
import { commandMode } from './modes/command.js';
import { bridgeMode } from './modes/bridge.js';
import { mayhemMode } from './modes/mayhem.js';

const canvas = document.getElementById('gameCanvas');
const uiLayer = document.getElementById('ui-layer');
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const MOBILE_GLOW_CAP = 14;
const MAYHEM_UNLOCK_KEY = 'inversia_mayhem_unlocked';

function getGlow(ctx, glowStrength) {
  if (ctx?.__allowFullGlow || !isTouchDevice) {
    return glowStrength;
  }
  return Math.min(glowStrength, MOBILE_GLOW_CAP);
}

const starfield = createStarfield(canvas);
const hud = createHUD(uiLayer);
const audio = createAudioEngine();
const leaderboard = createLeaderboard();
hud.attachLeaderboard(leaderboard);

const modes = {
  flux: fluxMode,
  command: commandMode,
  bridge: bridgeMode,
  mayhem: mayhemMode,
};

let activeMode = null;
let unlockSequenceActive = false;

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
  let mayhemUnlocked = localStorage.getItem(MAYHEM_UNLOCK_KEY) === 'true';

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
    mayhemUnlocked = localStorage.getItem(MAYHEM_UNLOCK_KEY) === 'true';
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

      if (state.wave === 100 && !mayhemUnlocked) {
        mayhemUnlocked = true;
        localStorage.setItem(MAYHEM_UNLOCK_KEY, 'true');
        return { action: 'unlock-mayhem', wave: state.wave };
      }

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
    isMayhemUnlocked: () => mayhemUnlocked,
    dispose: () => hideBadge(),
  };
}

const waveController = createWaveController(uiLayer, gameState);

export function resetGameState() {
  Object.assign(gameState, DEFAULT_GAME_STATE);
  waveController.resetRun();
}

function createMayhemUnlockOverlay() {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:absolute',
    'inset:0',
    'z-index:40',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:14px',
    'background:rgba(0,0,0,0)',
    'transition:background 500ms ease',
    'pointer-events:auto',
    'font-family:"Courier New", monospace',
  ].join(';');

  const badge = document.createElement('div');
  badge.style.cssText = [
    'opacity:0',
    'transform:translateY(12px) scale(0.96)',
    'transition:opacity 260ms ease, transform 260ms ease',
    'background:rgba(255,255,255,0.04)',
    'border:0.5px solid rgba(255,255,255,0.12)',
    'border-radius:20px',
    'backdrop-filter:blur(16px)',
    '-webkit-backdrop-filter:blur(16px)',
    'padding:24px 48px',
    'text-align:center',
  ].join(';');
  badge.innerHTML = `
    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(255,255,255,0.38);margin-bottom:8px;">WAVE</div>
    <div style="font-size:72px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.95);text-shadow:0 0 40px rgba(255,255,255,0.3);">100</div>
  `;

  const wellDone = document.createElement('div');
  wellDone.style.cssText = 'opacity:0;transition:opacity 260ms ease;color:rgba(255,255,255,0.45);font-size:13px;letter-spacing:0.35em;';
  wellDone.textContent = 'WELL DONE';

  const panel = document.createElement('div');
  panel.style.cssText = [
    'opacity:0',
    'transform:translateY(8px)',
    'transition:opacity 280ms ease, transform 280ms ease',
    'background:rgba(255,40,20,0.06)',
    'border:0.5px solid rgba(255,40,20,0.25)',
    'border-radius:20px',
    'backdrop-filter:blur(16px)',
    '-webkit-backdrop-filter:blur(16px)',
    'padding:32px 48px',
    'text-align:center',
    'max-width:380px',
  ].join(';');
  panel.innerHTML = `
    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(255,255,255,0.3);margin-bottom:12px;">YOU HAVE UNLOCKED</div>
    <div style="font-size:32px;font-weight:700;letter-spacing:0.15em;color:#ff3322;text-shadow:0 0 32px rgba(255,50,34,0.5);margin-bottom:10px;">MAYHEM MODE</div>
    <svg width="64" height="70" viewBox="0 0 54 60" aria-hidden="true" style="display:block;margin:0 auto 10px auto;overflow:visible;">
      <polygon id="mayhem-unlock-triangle" points="27,58 2,3 52,3" fill="none" stroke="#ff3322" stroke-width="2.5" />
    </svg>
    <div style="font-size:11px;letter-spacing:0.2em;color:rgba(0,255,136,0.7);margin-top:8px;">50 FIGHTERS</div>
    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(255,255,255,0.2);margin:6px 0;">VS</div>
    <div style="font-size:11px;letter-spacing:0.2em;color:rgba(255,50,34,0.7);">15 BOSSES · GROWS EVERY WAVE</div>
  `;

  const enterBtn = document.createElement('button');
  enterBtn.type = 'button';
  enterBtn.textContent = 'ENTER MAYHEM';
  enterBtn.style.cssText = [
    'opacity:0',
    'transition:opacity 280ms ease',
    'background:rgba(0,255,120,0.07)',
    'border:0.5px solid rgba(0,255,120,0.3)',
    'border-radius:14px',
    'padding:14px 40px',
    'font-size:12px',
    'letter-spacing:0.2em',
    'color:#00ff88',
    'font-family:"Courier New", monospace',
    'cursor:pointer',
  ].join(';');

  const laterBtn = document.createElement('button');
  laterBtn.type = 'button';
  laterBtn.textContent = 'NOT YET - RETURN TO MENU';
  laterBtn.style.cssText = [
    'opacity:0',
    'transition:opacity 280ms ease',
    'background:transparent',
    'border:none',
    'font-size:10px',
    'letter-spacing:0.15em',
    'color:rgba(255,255,255,0.2)',
    'font-family:"Courier New", monospace',
    'cursor:pointer',
  ].join(';');

  overlay.append(badge, wellDone, panel, enterBtn, laterBtn);
  uiLayer.appendChild(overlay);

  const tri = panel.querySelector('#mayhem-unlock-triangle');
  let raf = 0;
  const pulse = () => {
    const glow = Math.sin(Date.now() * 0.006) * 8 + 24;
    if (tri) {
      tri.setAttribute('style', `filter: drop-shadow(0 0 ${glow}px rgba(255,50,34,0.65));`);
    }
    raf = window.requestAnimationFrame(pulse);
  };
  raf = window.requestAnimationFrame(pulse);

  return {
    overlay,
    badge,
    wellDone,
    panel,
    enterBtn,
    laterBtn,
    dispose() {
      window.cancelAnimationFrame(raf);
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    },
  };
}

function showMayhemUnlockSequence() {
  if (unlockSequenceActive) {
    return;
  }

  unlockSequenceActive = true;
  const seq = createMayhemUnlockOverlay();
  const { overlay, badge, wellDone, panel, enterBtn, laterBtn } = seq;

  // STEP 1
  requestAnimationFrame(() => {
    overlay.style.background = 'rgba(0,0,0,1)';
  });

  // STEP 2
  window.setTimeout(() => {
    badge.style.opacity = '1';
    badge.style.transform = 'translateY(0) scale(1)';
  }, 520);

  // STEP 3
  window.setTimeout(() => {
    badge.style.opacity = '0';
    badge.style.transform = 'translateY(-18px) scale(0.92)';
    wellDone.style.opacity = '1';
  }, 2020);

  // STEP 4
  window.setTimeout(() => {
    wellDone.style.opacity = '0';
    panel.style.opacity = '1';
    panel.style.transform = 'translateY(0)';
  }, 2820);

  // STEP 5
  window.setTimeout(() => {
    enterBtn.style.opacity = '1';
    laterBtn.style.opacity = '1';
  }, 5320);

  const finish = (modeName) => {
    seq.dispose();
    unlockSequenceActive = false;
    if (modeName === 'mayhem') {
      startMode('mayhem');
    } else {
      hud.showMainMenu(startMode, audio);
    }
  };

  enterBtn.addEventListener('click', () => finish('mayhem'));
  laterBtn.addEventListener('click', () => finish('menu'));
}

function triggerWave100MayhemUnlock() {
  if (unlockSequenceActive) {
    return;
  }

  activeMode?.stop?.();
  gameState.running = false;
  gameState.paused = true;
  hud.hideHUD?.();
  showMayhemUnlockSequence();
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
  ctx.shadowBlur = getGlow(ctx, glowStrength);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function drawCircle(ctx, x, y, radius, color, glowStrength) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = getGlow(ctx, glowStrength);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function drawBullet(ctx, x, y, width, height, color, glowStrength) {
  const left = x - width / 2;
  const top = y - height / 2;

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = getGlow(ctx, glowStrength);
  ctx.fillRect(left, top, width, height);
  ctx.shadowBlur = 0;
}

export const POWERUP_RADIUS = 8;
export const BACKSPACE_RADIUS = 9;
export const POWERUP_DRIFT_SPEED = 1;
export const POWERUP_TYPES = ['shield', 'multi', 'fleet'];
export const BACKSPACE_TYPE = 'backspace';
export const POWERUP_COLORS = {
  shield: '#00eeff',
  multi: '#ffee00',
  fleet: '#00ff88',
  backspace: '#ffffff',
};
export const MULTI_SHOT_DURATION_MS = 8000;
export const POWERUP_DROP_CHANCE = 0.15;
export const BACKSPACE_DROP_CHANCE = 0.04;

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

export function spawnBackspace(x, y) {
  return {
    x,
    y,
    radius: BACKSPACE_RADIUS,
    type: BACKSPACE_TYPE,
    color: POWERUP_COLORS.backspace,
  };
}

export function spawnDropPowerup(x, y, guaranteed = false) {
  if (!guaranteed && Math.random() >= POWERUP_DROP_CHANCE) {
    return null;
  }

  if (Math.random() < BACKSPACE_DROP_CHANCE) {
    return spawnBackspace(x, y);
  }

  return spawnPowerup(x, y);
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
    spawnBackspace,
    spawnDropPowerup,
    POWERUP_RADIUS,
    BACKSPACE_RADIUS,
    POWERUP_DRIFT_SPEED,
    POWERUP_COLORS,
    BACKSPACE_TYPE,
    MULTI_SHOT_DURATION_MS,
    waveController,
    onWave100Unlock: triggerWave100MayhemUnlock,
    startMode,
  });
}

export const startGame = startMode;

starfield.start();
hud.showLoading(1000).then(() => {
  hud.showMainMenu(startMode, audio);
});

if ('serviceWorker' in navigator) {
  const host = window.location.hostname;
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  if (isLocalHost) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
  } else {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

if (isTouchDevice) {
  const rotateOverlay = document.createElement('div');
  rotateOverlay.style.cssText = `
    position:absolute;inset:0;display:none;align-items:center;justify-content:center;
    flex-direction:column;gap:10px;z-index:30;pointer-events:none;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    color:rgba(255,255,255,0.9);font-family:'Courier New',monospace;letter-spacing:0.16em;
  `;
  rotateOverlay.innerHTML = `<div style="font-size:42px;opacity:.8;">↻</div><div>ROTATE DEVICE</div>`;
  uiLayer.appendChild(rotateOverlay);

  const updateRotateOverlay = () => {
    const portrait = window.innerHeight > window.innerWidth;
    rotateOverlay.style.display = portrait ? 'flex' : 'none';
  };

  const tryLockLandscape = async () => {
    try {
      if (screen.orientation?.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch {
      updateRotateOverlay();
    }
  };

  const firstInteract = () => {
    tryLockLandscape();
    window.removeEventListener('click', firstInteract);
    window.removeEventListener('touchstart', firstInteract);
    window.removeEventListener('keydown', firstInteract);
  };

  window.addEventListener('click', firstInteract, { once: true });
  window.addEventListener('touchstart', firstInteract, { once: true });
  window.addEventListener('keydown', firstInteract, { once: true });
  window.addEventListener('resize', updateRotateOverlay);
  window.addEventListener('orientationchange', updateRotateOverlay);
  updateRotateOverlay();
}
