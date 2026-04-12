import { drawStarfield } from '../starfield.js';

const RETICLE_COLOR = 'rgba(0,255,136,0.5)';
const COCKPIT_LINE_COLOR = 'rgba(255,255,255,0.15)';
const ENEMY_COLOR = '#ff3322';
const ENEMY_GLOW = 14;
const ENEMY_APPROACH_MS = 3000;
const ENEMY_COUNT = 3;
const ENEMY_SPAWN_STAGGER_MS = 900;

let currentContext = null;
let animationFrameId = null;
let resizeHandler = null;
let keydownHandler = null;
let backButtonEl = null;
let humNodes = [];
let lastFrameTime = 0;
let state = null;

function nowMs() {
  return performance.now();
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function syncCanvasResolution(canvas, ctx) {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.floor(window.innerWidth * ratio);
  const height = Math.floor(window.innerHeight * ratio);

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function createPlaceholderEnemy(spawnAt = nowMs()) {
  return {
    spawnAt,
    rotationSeed: randomInRange(0, Math.PI * 2),
    driftX: randomInRange(-10, 10),
    driftY: randomInRange(-8, 8),
  };
}

function initializeState() {
  const now = nowMs();
  state = {
    enemies: Array.from({ length: ENEMY_COUNT }, (_, index) => createPlaceholderEnemy(now + index * ENEMY_SPAWN_STAGGER_MS)),
    hitFlashUntil: 0,
    hitsTaken: 0,
    startedAt: now,
  };
}

function ensureBackButton() {
  if (backButtonEl) {
    return backButtonEl;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'RETURN';
  button.style.cssText = [
    'position:absolute',
    'top:16px',
    'left:16px',
    'padding:8px 12px',
    'border-radius:10px',
    'border:0.5px solid rgba(255,255,255,0.12)',
    'background:rgba(255,255,255,0.04)',
    'color:rgba(255,255,255,0.52)',
    'font-family:"Courier New", monospace',
    'font-size:10px',
    'letter-spacing:0.18em',
    'cursor:pointer',
    'z-index:12',
  ].join(';');
  button.addEventListener('click', () => {
    currentContext?.hud?.showMainMenu?.(currentContext?.startMode, currentContext?.audio);
    stopBridge();
  });
  currentContext.uiLayer.appendChild(button);
  backButtonEl = button;
  return button;
}

function startCockpitHum() {
  const audioContext = currentContext?.audio?.audioContext;
  if (!audioContext) {
    return;
  }

  const output = currentContext?.audio?.outputNode ?? audioContext.destination;
  const humGain = audioContext.createGain();
  humGain.gain.setValueAtTime(0.005, audioContext.currentTime);
  humGain.connect(output);

  const lowOsc = audioContext.createOscillator();
  lowOsc.type = 'sine';
  lowOsc.frequency.setValueAtTime(28, audioContext.currentTime);
  lowOsc.connect(humGain);
  lowOsc.start();

  const midOsc = audioContext.createOscillator();
  const midGain = audioContext.createGain();
  midOsc.type = 'triangle';
  midOsc.frequency.setValueAtTime(54, audioContext.currentTime);
  midGain.gain.setValueAtTime(0.45, audioContext.currentTime);
  midOsc.connect(midGain);
  midGain.connect(humGain);
  midOsc.start();

  humNodes = [lowOsc, midOsc, midGain, humGain];
}

function stopCockpitHum() {
  humNodes.forEach((node) => {
    try {
      if (typeof node.stop === 'function') {
        node.stop();
      }
    } catch {
      // Ignore already-stopped oscillator nodes.
    }

    try {
      node.disconnect?.();
    } catch {
      // Ignore disconnected nodes during teardown.
    }
  });
  humNodes = [];
}

function triggerEnemyHit(enemy, now) {
  state.hitFlashUntil = now + 180;
  state.hitsTaken += 1;
  currentContext?.audio?.play?.('playerHit');
  enemy.spawnAt = now + ENEMY_SPAWN_STAGGER_MS;
  enemy.rotationSeed = randomInRange(0, Math.PI * 2);
  enemy.driftX = randomInRange(-10, 10);
  enemy.driftY = randomInRange(-8, 8);
}

function updateBridge(now) {
  for (const enemy of state.enemies) {
    const elapsed = now - enemy.spawnAt;
    if (elapsed < 0) {
      continue;
    }

    if (elapsed >= ENEMY_APPROACH_MS) {
      triggerEnemyHit(enemy, now);
    }
  }
}

function drawCockpit(ctx, width, height) {
  const horizonY = height * 0.56;

  ctx.strokeStyle = COCKPIT_LINE_COLOR;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(28, height - 26);
  ctx.lineTo(28, 90);
  ctx.lineTo(width * 0.22, 42);
  ctx.lineTo(width * 0.4, 24);
  ctx.moveTo(width - 28, height - 26);
  ctx.lineTo(width - 28, 90);
  ctx.lineTo(width * 0.78, 42);
  ctx.lineTo(width * 0.6, 24);
  ctx.moveTo(width * 0.18, height - 18);
  ctx.lineTo(width * 0.32, height * 0.74);
  ctx.lineTo(width * 0.68, height * 0.74);
  ctx.lineTo(width * 0.82, height - 18);
  ctx.moveTo(48, horizonY);
  ctx.lineTo(width - 48, horizonY);
  ctx.stroke();
}

function drawReticle(ctx, centerX, centerY) {
  ctx.strokeStyle = RETICLE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 12, 0, Math.PI * 2);
  ctx.moveTo(centerX, centerY - 22);
  ctx.lineTo(centerX, centerY - 16);
  ctx.moveTo(centerX + 16, centerY);
  ctx.lineTo(centerX + 22, centerY);
  ctx.moveTo(centerX, centerY + 16);
  ctx.lineTo(centerX, centerY + 22);
  ctx.moveTo(centerX - 22, centerY);
  ctx.lineTo(centerX - 16, centerY);
  ctx.stroke();
}

function drawPlaceholderEnemy(ctx, enemy, now, centerX, centerY) {
  const elapsed = now - enemy.spawnAt;
  if (elapsed < 0) {
    return;
  }

  const progress = clamp(elapsed / ENEMY_APPROACH_MS, 0, 1);
  const radius = 8 + progress * 110;
  const offsetX = enemy.driftX * progress;
  const offsetY = enemy.driftY * progress;
  const rotation = enemy.rotationSeed + now * 0.00045;

  const points = [
    { x: 0, y: -radius },
    { x: radius, y: 0 },
    { x: 0, y: radius },
    { x: -radius, y: 0 },
  ].map((point) => ({
    x: centerX + offsetX + (point.x * Math.cos(rotation) - point.y * Math.sin(rotation)),
    y: centerY + offsetY + (point.x * Math.sin(rotation) + point.y * Math.cos(rotation)),
  }));

  ctx.save();
  ctx.strokeStyle = ENEMY_COLOR;
  ctx.lineWidth = 1.4;
  ctx.shadowColor = ENEMY_COLOR;
  ctx.shadowBlur = ENEMY_GLOW;
  ctx.globalAlpha = 0.42 + progress * 0.58;
  ctx.beginPath();
  for (const point of points) {
    ctx.moveTo(centerX + offsetX, centerY + offsetY);
    ctx.lineTo(point.x, point.y);
  }
  ctx.moveTo(points[0].x, points[0].y);
  ctx.lineTo(points[1].x, points[1].y);
  ctx.lineTo(points[2].x, points[2].y);
  ctx.lineTo(points[3].x, points[3].y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function renderBridge(now) {
  const { canvas } = currentContext;
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.clearRect(0, 0, width, height);
  drawStarfield(ctx);

  drawCockpit(ctx, width, height);
  for (const enemy of state.enemies) {
    drawPlaceholderEnemy(ctx, enemy, now, centerX, centerY);
  }
  drawReticle(ctx, centerX, centerY);

  if (now < state.hitFlashUntil) {
    const alpha = clamp((state.hitFlashUntil - now) / 180, 0, 1) * 0.18;
    ctx.fillStyle = `rgba(255,51,34,${alpha})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.font = '10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('OMEGA STARFIGHTER', centerX, height - 22);
}

function gameLoop(now) {
  if (!currentContext || !state) {
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = now;
  }
  lastFrameTime = now;

  updateBridge(now);
  renderBridge(now);
  animationFrameId = window.requestAnimationFrame(gameLoop);
}

export function startBridge(context = currentContext) {
  stopBridge();
  currentContext = context;
  if (!currentContext?.canvas) {
    return;
  }

  currentContext.gameState.mode = 'bridge';
  currentContext.gameState.running = true;
  currentContext.gameState.paused = false;

  const ctx = currentContext.canvas.getContext('2d');
  syncCanvasResolution(currentContext.canvas, ctx);
  initializeState();
  ensureBackButton();
  startCockpitHum();

  resizeHandler = () => syncCanvasResolution(currentContext.canvas, ctx);
  keydownHandler = (event) => {
    if (event.key === 'Escape') {
      currentContext?.hud?.showMainMenu?.(currentContext?.startMode, currentContext?.audio);
      stopBridge();
    }
  };

  window.addEventListener('resize', resizeHandler);
  window.addEventListener('keydown', keydownHandler);

  lastFrameTime = 0;
  animationFrameId = window.requestAnimationFrame(gameLoop);
}

export function stopBridge() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }

  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }

  if (backButtonEl?.parentElement) {
    backButtonEl.parentElement.removeChild(backButtonEl);
  }
  backButtonEl = null;

  stopCockpitHum();

  if (currentContext?.canvas) {
    const ctx = currentContext.canvas.getContext('2d');
    ctx?.clearRect(0, 0, currentContext.canvas.clientWidth || window.innerWidth, currentContext.canvas.clientHeight || window.innerHeight);
  }

  state = null;
  lastFrameTime = 0;
  if (currentContext?.gameState) {
    currentContext.gameState.running = false;
    currentContext.gameState.paused = false;
  }
  currentContext = null;
}

export const bridgeMode = {
  id: 'bridge',
  start: startBridge,
  stop: stopBridge,
};
