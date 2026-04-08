import { drawStarfield } from '../starfield.js';

const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 44;
const PLAYER_COLOR = '#00ff88';
const PLAYER_GLOW = 22;
const PLAYER_MAX_HEALTH = 10;
const HEALTH_BAR_WIDTH = 60;
const HEALTH_BAR_HEIGHT = 2;
const HEALTH_BAR_OFFSET_Y = 34;
const MOVE_ACCELERATION = 0.9;
const MAX_SPEED = 7;
const DECELERATION = 0.82;
const PLAYER_SHOT_COOLDOWN_MS = 200;
const PLAYER_BULLET_WIDTH = 2;
const PLAYER_BULLET_HEIGHT = 10;
const PLAYER_BULLET_SPEED = 9;
const PLAYER_MAX_BULLETS = 4;
const POWERUP_DROP_CHANCE = 0.15;
const PLAYER_FLASH_FRAMES_ON_HIT = 3;
const PLAYER_CONTACT_DAMAGE = 2;
const FLUX_MULTI_SPREAD_COUNT = 5;
const FLUX_MULTI_SPREAD_ARC = 0.32;

const ENEMY_COLUMNS = 6;
const ENEMY_ROWS = 4;
const ENEMY_WIDTH = 16;
const ENEMY_HEIGHT = 18;
const ENEMY_COLOR = '#ff3322';
const ENEMY_GLOW = 16;
const ENEMY_BASE_DRIFT_SPEED = 0.45;
const ENEMY_DIVE_MIN_MS = 1500;
const ENEMY_DIVE_MAX_MS = 3000;
const ENEMY_DIVE_SPEED_X = 0.8;
const ENEMY_DIVE_SPEED_Y = 1.35;
const ENEMY_RETURN_SPEED = 2.1;
const ENEMY_SHOT_MIN_MS = 2000;
const ENEMY_SHOT_MAX_MS = 3000;
const ENEMY_BULLET_WIDTH = 2;
const ENEMY_BULLET_HEIGHT = 9;
const ENEMY_BULLET_SPEED = 3.2;
const ENEMY_MAX_BULLETS = 3;

const BOSS_WIDTH = 80;
const BOSS_HEIGHT = 90;
const BOSS_HP = 30;
const BOSS_COLOR = '#ff3322';
const BOSS_STROKE_WIDTH = 2;
const BOSS_DRIFT_SPEED = 0.8;
const BOSS_TRIPLE_INTERVAL_MS = 2000;
const BOSS_FAN_INTERVAL_MS = 8000;
const BOSS_TRIPLE_SPREAD = 0.25;
const BOSS_FAN_COUNT = 7;
const BOSS_FAN_ARC = 1.8;
const BOSS_BULLET_WIDTH = 3;
const BOSS_BULLET_HEIGHT = 12;
const BOSS_BULLET_SPEED = 2.8;
const BOSS_SCORE = 2000;

let animationFrameId = null;
let currentContext = null;
let resizeHandler = null;
let keydownHandler = null;
let keyupHandler = null;

let fluxState = {
  x: 0,
  y: 0,
  velocityX: 0,
  health: PLAYER_MAX_HEALTH,
  playerBullets: [],
  powerUps: [],
  nextPlayerShotAt: 0,
  playerFlashFrames: 0,
  shieldActive: false,
  multiShotUntil: 0,
  activePowerupLabel: null,
  activePowerupLabelUntil: 0,
  enemyFormationOffsetX: 0,
  enemyFormationDirection: 1,
  enemies: [],
  enemyBullets: [],
  nextDiveAt: 0,
  nextEnemyShotAt: 0,
  boss: null,
  bossPhase: false,
  bossBullets: [],
  input: {
    left: false,
    right: false,
    fire: false,
  },
};

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getFormationLayout(canvas) {
  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const formationWidth = Math.min(canvasWidth - 80, 360);
  const spacingX = formationWidth / (ENEMY_COLUMNS - 1);

  return {
    startX: canvasWidth / 2 - formationWidth / 2,
    startY: 72,
    spacingX,
    spacingY: 44,
    formationWidth,
    wallPadding: 24,
  };
}

function getEnemyHomePosition(enemy, canvas) {
  const layout = getFormationLayout(canvas);

  return {
    x: layout.startX + enemy.col * layout.spacingX + fluxState.enemyFormationOffsetX,
    y: layout.startY + enemy.row * layout.spacingY,
  };
}

function initializeEnemies() {
  const enemies = [];

  for (let row = 0; row < ENEMY_ROWS; row += 1) {
    for (let col = 0; col < ENEMY_COLUMNS; col += 1) {
      enemies.push({
        id: `${row}-${col}`,
        col,
        row,
        hp: 1,
        state: 'formation',
        x: 0,
        y: 0,
        diveTargetX: 0,
      });
    }
  }

  return enemies;
}

function scheduleNextDive(now) {
  const [minDelay, maxDelay] = currentContext.waveController.getDiveRange(
    ENEMY_DIVE_MIN_MS,
    ENEMY_DIVE_MAX_MS,
  );
  fluxState.nextDiveAt = now + randomInRange(minDelay, maxDelay);
}

function scheduleNextEnemyShot(now) {
  const [minDelay, maxDelay] = currentContext.waveController.getFireRange(
    ENEMY_SHOT_MIN_MS,
    ENEMY_SHOT_MAX_MS,
  );
  fluxState.nextEnemyShotAt = now + randomInRange(minDelay, maxDelay);
}

function handleKeyChange(event, isDown) {
  const key = event.key.toLowerCase();

  if (key === 'arrowleft' || key === 'a') {
    fluxState.input.left = isDown;
  }

  if (key === 'arrowright' || key === 'd') {
    fluxState.input.right = isDown;
  }

  if (key === ' ' || key === 'spacebar') {
    fluxState.input.fire = isDown;
  }
}

function getAabb(x, y, width, height) {
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}

function overlapsAabb(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function spawnPowerUp(x, y) {
  const pu = currentContext.spawnPowerup(x, y);
  fluxState.powerUps.push(pu);
}

function updatePowerups(canvas, now) {
  const canvasHeight = canvas.clientHeight || window.innerHeight;
  const { POWERUP_DRIFT_SPEED } = currentContext;

  for (const pu of fluxState.powerUps) {
    pu.y += POWERUP_DRIFT_SPEED;
  }

  fluxState.powerUps = fluxState.powerUps.filter((pu) => pu.y - pu.radius <= canvasHeight);

  const collected = [];
  const remaining = [];

  for (const pu of fluxState.powerUps) {
    const dx = pu.x - fluxState.x;
    const dy = pu.y - fluxState.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const collectRadius = pu.radius + PLAYER_WIDTH / 2;
    if (dist <= collectRadius) {
      collected.push(pu);
    } else {
      remaining.push(pu);
    }
  }

  fluxState.powerUps = remaining;

  for (const pu of collected) {
    currentContext.audio?.playPowerup?.();
    applyPowerup(pu.type, now);
  }
}

function applyPowerup(type, now) {
  const { MULTI_SHOT_DURATION_MS } = currentContext;

  fluxState.activePowerupLabel = type.toUpperCase();
  fluxState.activePowerupLabelUntil = now + 3000;

  if (type === 'shield') {
    fluxState.shieldActive = true;
  } else if (type === 'multi') {
    fluxState.multiShotUntil = now + MULTI_SHOT_DURATION_MS;
  } else if (type === 'fleet') {
    fluxState.health = Math.min(PLAYER_MAX_HEALTH, fluxState.health + 1);
  }
}

function syncHudState(now) {
  if (!currentContext?.gameState) {
    return;
  }

  const bossActive = Boolean(fluxState.bossPhase && fluxState.boss && fluxState.boss.hp > 0);
  currentContext.gameState.powerups = {
    shield: fluxState.shieldActive,
    multi: now < fluxState.multiShotUntil,
    fleet: false,
  };
  currentContext.gameState.fleetCount = 0;
  currentContext.gameState.bossActive = bossActive;
  currentContext.gameState.bossHp = bossActive ? fluxState.boss.hp : 0;
  currentContext.gameState.bossMaxHp = bossActive ? fluxState.boss.maxHp : 1;
}

function triggerGameOver() {
  if (!currentContext) {
    return;
  }

  syncHudState(performance.now());
  currentContext.hud?.updateHUD?.(currentContext.gameState);
  currentContext.hud?.showGameOver?.({
    mode: currentContext.gameState.mode,
    score: currentContext.gameState.score,
    wave: currentContext.gameState.wave,
  });
  currentContext.gameState.running = false;
}

function damagePlayer(amount) {
  if (fluxState.shieldActive) {
    fluxState.shieldActive = false;
    return;
  }

  fluxState.health = Math.max(0, fluxState.health - amount);
  fluxState.playerFlashFrames = PLAYER_FLASH_FRAMES_ON_HIT;
  currentContext.audio?.play?.('playerHit');

  if (fluxState.health <= 0) {
    triggerGameOver();
  }
}

function updatePlayerShooting(now) {
  if (!fluxState.input.fire) {
    return;
  }

  if (fluxState.playerBullets.length >= PLAYER_MAX_BULLETS) {
    return;
  }

  if (now < fluxState.nextPlayerShotAt) {
    return;
  }

  const originX = fluxState.x;
  const originY = fluxState.y - PLAYER_HEIGHT / 2;
  const isMulti = now < fluxState.multiShotUntil;

  if (isMulti) {
    const count = FLUX_MULTI_SPREAD_COUNT;
    const halfArc = FLUX_MULTI_SPREAD_ARC * (count - 1) / 2;
    for (let i = 0; i < count; i += 1) {
      const angle = -halfArc + i * FLUX_MULTI_SPREAD_ARC;
      fluxState.playerBullets.push({
        x: originX,
        y: originY,
        width: PLAYER_BULLET_WIDTH,
        height: PLAYER_BULLET_HEIGHT,
        vx: Math.sin(angle) * PLAYER_BULLET_SPEED,
        vy: -Math.cos(angle) * PLAYER_BULLET_SPEED,
      });
    }
  } else {
    fluxState.playerBullets.push({
      x: originX,
      y: originY,
      width: PLAYER_BULLET_WIDTH,
      height: PLAYER_BULLET_HEIGHT,
      vx: 0,
      vy: -PLAYER_BULLET_SPEED,
    });
  }

  currentContext.audio?.play?.('shoot');
  fluxState.nextPlayerShotAt = now + PLAYER_SHOT_COOLDOWN_MS;
}

function updatePlayerBullets(canvas) {
  for (const bullet of fluxState.playerBullets) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
  }

  fluxState.playerBullets = fluxState.playerBullets.filter(
    (bullet) => bullet.y + bullet.height / 2 >= 0 && bullet.x >= -20 && bullet.x <= (window.innerWidth + 20),
  );
}

function resolveCollisions() {
  const { gameState } = currentContext;
  const removedEnemyIds = new Set();
  const removedPlayerBulletIndices = new Set();

  for (let bulletIndex = 0; bulletIndex < fluxState.playerBullets.length; bulletIndex += 1) {
    const bullet = fluxState.playerBullets[bulletIndex];
    const bulletAabb = getAabb(bullet.x, bullet.y, bullet.width, bullet.height);

    for (const enemy of fluxState.enemies) {
      if (removedEnemyIds.has(enemy.id)) {
        continue;
      }

      const enemyAabb = getAabb(enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT);
      if (!overlapsAabb(bulletAabb, enemyAabb)) {
        continue;
      }

      removedPlayerBulletIndices.add(bulletIndex);
      enemy.hp -= 1;

      if (enemy.hp <= 0) {
        removedEnemyIds.add(enemy.id);
        gameState.score += 100;
        currentContext.audio?.play?.('enemyDeath');

        if (Math.random() < POWERUP_DROP_CHANCE) {
          spawnPowerUp(enemy.x, enemy.y);
        }
      }

      break;
    }
  }

  fluxState.playerBullets = fluxState.playerBullets.filter(
    (_, index) => !removedPlayerBulletIndices.has(index),
  );

  if (removedEnemyIds.size > 0) {
    fluxState.enemies = fluxState.enemies.filter((enemy) => !removedEnemyIds.has(enemy.id));
  }

  const playerAabb = getAabb(fluxState.x, fluxState.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  const remainingEnemyBullets = [];

  for (const bullet of fluxState.enemyBullets) {
    const bulletAabb = getAabb(bullet.x, bullet.y, bullet.width, bullet.height);
    if (overlapsAabb(playerAabb, bulletAabb)) {
      damagePlayer(1);
    } else {
      remainingEnemyBullets.push(bullet);
    }
  }

  fluxState.enemyBullets = remainingEnemyBullets;

  const collidedEnemyIds = new Set();
  for (const enemy of fluxState.enemies) {
    const enemyAabb = getAabb(enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT);
    if (overlapsAabb(playerAabb, enemyAabb)) {
      collidedEnemyIds.add(enemy.id);
      damagePlayer(PLAYER_CONTACT_DAMAGE);
    }
  }

  if (collidedEnemyIds.size > 0) {
    fluxState.enemies = fluxState.enemies.filter((enemy) => !collidedEnemyIds.has(enemy.id));
  }
}

function spawnBoss(canvas) {
  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const now = performance.now();
  fluxState.boss = {
    hp: BOSS_HP,
    maxHp: BOSS_HP,
    x: canvasWidth / 2,
    y: 80,
    direction: 1,
    flashFrames: 0,
    nextTripleShot: now + BOSS_TRIPLE_INTERVAL_MS,
    nextFanShot: now + BOSS_FAN_INTERVAL_MS,
  };
  fluxState.bossPhase = true;
  fluxState.bossBullets = [];
  fluxState.enemyBullets = [];
  currentContext.audio?.play?.('bossArrival');
  updateBossHpHud();
}

function updateBoss(canvas, now) {
  const boss = fluxState.boss;
  if (!boss || boss.hp <= 0) return;

  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const margin = BOSS_WIDTH / 2 + 30;

  boss.x += boss.direction * BOSS_DRIFT_SPEED;
  if (boss.x <= margin) { boss.direction = 1; boss.x = margin; }
  if (boss.x >= canvasWidth - margin) { boss.direction = -1; boss.x = canvasWidth - margin; }

  const originY = boss.y + BOSS_HEIGHT / 2;

  if (now >= boss.nextTripleShot) {
    for (let i = -1; i <= 1; i += 1) {
      const angle = i * BOSS_TRIPLE_SPREAD;
      fluxState.bossBullets.push({
        x: boss.x,
        y: originY,
        vx: Math.sin(angle) * BOSS_BULLET_SPEED,
        vy: Math.cos(angle) * BOSS_BULLET_SPEED,
      });
    }
    boss.nextTripleShot = now + BOSS_TRIPLE_INTERVAL_MS;
  }

  if (now >= boss.nextFanShot) {
    const halfArc = BOSS_FAN_ARC / 2;
    const step = BOSS_FAN_ARC / (BOSS_FAN_COUNT - 1);
    for (let i = 0; i < BOSS_FAN_COUNT; i += 1) {
      const angle = -halfArc + i * step;
      fluxState.bossBullets.push({
        x: boss.x,
        y: originY,
        vx: Math.sin(angle) * BOSS_BULLET_SPEED,
        vy: Math.cos(angle) * BOSS_BULLET_SPEED,
      });
    }
    boss.nextFanShot = now + BOSS_FAN_INTERVAL_MS;
  }
}

function updateBossBullets(canvas) {
  for (const b of fluxState.bossBullets) {
    b.x += b.vx;
    b.y += b.vy;
  }
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  fluxState.bossBullets = fluxState.bossBullets.filter(
    (b) => b.x >= -20 && b.x <= w + 20 && b.y >= -20 && b.y <= h + 20,
  );
}

function resolveBossCollisions() {
  const boss = fluxState.boss;
  if (!boss || boss.hp <= 0) return;

  const bossBox = getAabb(boss.x, boss.y, BOSS_WIDTH, BOSS_HEIGHT);
  const usedBullets = new Set();

  for (let i = 0; i < fluxState.playerBullets.length; i += 1) {
    const b = fluxState.playerBullets[i];
    const bBox = getAabb(b.x, b.y, b.width, b.height);
    if (overlapsAabb(bBox, bossBox)) {
      usedBullets.add(i);
      boss.hp -= 1;
      boss.flashFrames = 2;
      updateBossHpHud();
      if (boss.hp <= 0) break;
    }
  }

  fluxState.playerBullets = fluxState.playerBullets.filter((_, i) => !usedBullets.has(i));

  const playerAabb = getAabb(fluxState.x, fluxState.y, PLAYER_WIDTH, PLAYER_HEIGHT);
  fluxState.bossBullets = fluxState.bossBullets.filter((b) => {
    const bBox = getAabb(b.x, b.y, BOSS_BULLET_WIDTH, BOSS_BULLET_HEIGHT);
    if (overlapsAabb(playerAabb, bBox)) {
      damagePlayer(1);
      return false;
    }
    return true;
  });
}

function handleBossDeath(now) {
  currentContext.gameState.score += BOSS_SCORE;
  currentContext.audio?.playBossDeath?.();
  fluxState.bossBullets = [];
  fluxState.boss = null;
  fluxState.bossPhase = false;
  removeBossHpHud();
  currentContext.audio?.play?.('waveClear');
  currentContext.waveController.beginWaveTransition(now);
}

function spawnFormationForWave() {
  if (!currentContext?.canvas) return;
  fluxState.enemies = initializeEnemies();
  fluxState.enemyBullets = [];
  fluxState.enemyFormationOffsetX = 0;
  fluxState.enemyFormationDirection = 1;
  for (const enemy of fluxState.enemies) {
    const home = getEnemyHomePosition(enemy, currentContext.canvas);
    enemy.x = home.x;
    enemy.y = home.y;
  }
  const now = performance.now();
  scheduleNextDive(now);
  scheduleNextEnemyShot(now);
}

function checkWaveTransition(now) {
  if (fluxState.bossPhase) {
    if (fluxState.boss && fluxState.boss.hp <= 0) {
      handleBossDeath(now);
    }
    return;
  }

  if (fluxState.enemies.length === 0) {
    fluxState.enemyBullets = [];
    currentContext.audio?.play?.('waveClear');
    currentContext.waveController.beginWaveTransition(now);
  }
}

function updateBossHpHud() {
  syncHudState(performance.now());
}

function removeBossHpHud() {
  if (!currentContext?.gameState) {
    return;
  }
  currentContext.gameState.bossActive = false;
  currentContext.gameState.bossHp = 0;
  currentContext.gameState.bossMaxHp = 1;
}

function updatePlayer(canvas) {
  const width = canvas.clientWidth || window.innerWidth;
  const minX = PLAYER_WIDTH / 2;
  const maxX = width - PLAYER_WIDTH / 2;

  if (fluxState.input.left) {
    fluxState.velocityX -= MOVE_ACCELERATION;
  }

  if (fluxState.input.right) {
    fluxState.velocityX += MOVE_ACCELERATION;
  }

  if (!fluxState.input.left && !fluxState.input.right) {
    fluxState.velocityX *= DECELERATION;
    if (Math.abs(fluxState.velocityX) < 0.02) {
      fluxState.velocityX = 0;
    }
  }

  fluxState.velocityX = clamp(fluxState.velocityX, -MAX_SPEED, MAX_SPEED);
  fluxState.x += fluxState.velocityX;
  fluxState.x = clamp(fluxState.x, minX, maxX);
}

function updateEnemyFormation(canvas, now) {
  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const canvasHeight = canvas.clientHeight || window.innerHeight;
  const layout = getFormationLayout(canvas);
  const waveSpeedMultiplier = currentContext.waveController.getDriftMultiplier();

  fluxState.enemyFormationOffsetX +=
    fluxState.enemyFormationDirection * ENEMY_BASE_DRIFT_SPEED * waveSpeedMultiplier;

  const leftEdge = layout.startX + fluxState.enemyFormationOffsetX - ENEMY_WIDTH / 2;
  const rightEdge =
    layout.startX + layout.formationWidth + fluxState.enemyFormationOffsetX + ENEMY_WIDTH / 2;

  if (leftEdge <= layout.wallPadding) {
    fluxState.enemyFormationDirection = 1;
    fluxState.enemyFormationOffsetX += layout.wallPadding - leftEdge;
  }

  if (rightEdge >= canvasWidth - layout.wallPadding) {
    fluxState.enemyFormationDirection = -1;
    fluxState.enemyFormationOffsetX -= rightEdge - (canvasWidth - layout.wallPadding);
  }

  if (now >= fluxState.nextDiveAt) {
    const formationEnemies = fluxState.enemies.filter((enemy) => enemy.state === 'formation');
    if (formationEnemies.length > 0) {
      const randomEnemy =
        formationEnemies[Math.floor(Math.random() * formationEnemies.length)];
      randomEnemy.state = 'diving';
      randomEnemy.diveTargetX = fluxState.x;
    }
    scheduleNextDive(now);
  }

  for (const enemy of fluxState.enemies) {
    const home = getEnemyHomePosition(enemy, canvas);

    if (enemy.state === 'formation') {
      enemy.x = home.x;
      enemy.y = home.y;
      continue;
    }

    if (enemy.state === 'diving') {
      const deltaX = enemy.diveTargetX - enemy.x;
      enemy.x += clamp(deltaX, -ENEMY_DIVE_SPEED_X, ENEMY_DIVE_SPEED_X);
      enemy.y += ENEMY_DIVE_SPEED_Y;

      if (enemy.y - ENEMY_HEIGHT / 2 > canvasHeight) {
        enemy.state = 'returning';
        enemy.y = -ENEMY_HEIGHT;
      }
      continue;
    }

    if (enemy.state === 'returning') {
      const dx = home.x - enemy.x;
      const dy = home.y - enemy.y;

      enemy.x += clamp(dx, -ENEMY_RETURN_SPEED, ENEMY_RETURN_SPEED);
      enemy.y += clamp(dy, -ENEMY_RETURN_SPEED, ENEMY_RETURN_SPEED);

      if (Math.abs(dx) < ENEMY_RETURN_SPEED && Math.abs(dy) < ENEMY_RETURN_SPEED) {
        enemy.x = home.x;
        enemy.y = home.y;
        enemy.state = 'formation';
      }
    }
  }
}

function updateEnemyBullets(canvas, now) {
  if (now >= fluxState.nextEnemyShotAt) {
    if (fluxState.enemyBullets.length < ENEMY_MAX_BULLETS) {
      const shooters = fluxState.enemies.filter((enemy) => enemy.state !== 'returning');
      if (shooters.length > 0) {
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        fluxState.enemyBullets.push({
          x: shooter.x,
          y: shooter.y + ENEMY_HEIGHT / 2 + ENEMY_BULLET_HEIGHT / 2,
          width: ENEMY_BULLET_WIDTH,
          height: ENEMY_BULLET_HEIGHT,
          speedY: ENEMY_BULLET_SPEED,
        });
      }
    }

    scheduleNextEnemyShot(now);
  }

  const canvasHeight = canvas.clientHeight || window.innerHeight;

  for (const bullet of fluxState.enemyBullets) {
    bullet.y += bullet.speedY;
  }

  fluxState.enemyBullets = fluxState.enemyBullets.filter(
    (bullet) => bullet.y - bullet.height / 2 <= canvasHeight,
  );
}

function drawHealthBar(ctx) {
  const healthRatio = clamp(fluxState.health / PLAYER_MAX_HEALTH, 0, 1);
  const barWidth = HEALTH_BAR_WIDTH * healthRatio;
  const barX = fluxState.x - HEALTH_BAR_WIDTH / 2;
  const barY = fluxState.y + HEALTH_BAR_OFFSET_Y;

  ctx.fillStyle = PLAYER_COLOR;
  ctx.shadowColor = PLAYER_COLOR;
  ctx.shadowBlur = 10;
  ctx.fillRect(barX, barY, barWidth, HEALTH_BAR_HEIGHT);
  ctx.shadowBlur = 0;
}

function renderFrame(ctx) {
  const { drawTriangle, drawCircle, drawBullet } = currentContext;
  const width = ctx.canvas.clientWidth || window.innerWidth;
  const height = ctx.canvas.clientHeight || window.innerHeight;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  drawStarfield(ctx);

  drawTriangle(
    ctx,
    fluxState.x,
    fluxState.y,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    'up',
    fluxState.playerFlashFrames > 0 ? '#ffffff' : PLAYER_COLOR,
    PLAYER_GLOW,
  );

  for (const bullet of fluxState.playerBullets) {
    drawBullet(
      ctx,
      bullet.x,
      bullet.y,
      bullet.width,
      bullet.height,
      PLAYER_COLOR,
      10,
    );
  }

  for (const enemy of fluxState.enemies) {
    drawTriangle(
      ctx,
      enemy.x,
      enemy.y,
      ENEMY_WIDTH,
      ENEMY_HEIGHT,
      'down',
      ENEMY_COLOR,
      ENEMY_GLOW,
    );
  }

  for (const bullet of fluxState.enemyBullets) {
    drawBullet(
      ctx,
      bullet.x,
      bullet.y,
      bullet.width,
      bullet.height,
      ENEMY_COLOR,
      8,
    );
  }

  for (const powerUp of fluxState.powerUps) {
    drawCircle(ctx, powerUp.x, powerUp.y, powerUp.radius, powerUp.color, 14);
  }

  if (fluxState.boss && fluxState.boss.hp > 0) {
    const boss = fluxState.boss;
    const pulseGlow = Math.sin(Date.now() * 0.004) * 12 + 22;
    const bossColor = boss.flashFrames > 0 ? '#ffffff' : BOSS_COLOR;
    const prevLW = ctx.lineWidth;
    ctx.lineWidth = BOSS_STROKE_WIDTH;
    drawTriangle(ctx, boss.x, boss.y, BOSS_WIDTH, BOSS_HEIGHT, 'down', bossColor, pulseGlow);
    ctx.lineWidth = prevLW;
    if (boss.flashFrames > 0) boss.flashFrames -= 1;
  }

  for (const b of fluxState.bossBullets) {
    drawBullet(ctx, b.x, b.y, BOSS_BULLET_WIDTH, BOSS_BULLET_HEIGHT, BOSS_COLOR, 10);
  }

  if (fluxState.shieldActive) {
    ctx.beginPath();
    ctx.arc(fluxState.x, fluxState.y, PLAYER_WIDTH / 2 + 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 238, 255, 0.22)';
    ctx.shadowColor = '#00eeff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
  }

  const now = performance.now();
  if (fluxState.activePowerupLabel && now < fluxState.activePowerupLabelUntil) {
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText(fluxState.activePowerupLabel, fluxState.x, fluxState.y - PLAYER_HEIGHT / 2 - 14);
    ctx.textAlign = 'start';
  } else {
    fluxState.activePowerupLabel = null;
  }

  drawHealthBar(ctx);
}

function gameLoop() {
  if (
    !currentContext ||
    !currentContext.gameState.running ||
    currentContext.gameState.mode !== 'flux'
  ) {
    return;
  }

  const { canvas, ctx, gameState } = currentContext;

  if (!gameState.paused) {
    const now = performance.now();
    const waveEvent = currentContext.waveController.update(now);
    if (waveEvent.action === 'spawn-boss') {
      spawnBoss(canvas);
    } else if (waveEvent.action === 'spawn-formation') {
      spawnFormationForWave();
    }

    if (currentContext.waveController.isCombatPhase()) {
      updatePlayer(canvas);
      updatePlayerShooting(now);
      updatePlayerBullets(canvas);

      if (fluxState.bossPhase) {
        updateBoss(canvas, now);
        updateBossBullets(canvas);
        resolveBossCollisions();
      } else {
        updateEnemyFormation(canvas, now);
        updateEnemyBullets(canvas, now);
        resolveCollisions();
      }

      updatePowerups(canvas, now);
      checkWaveTransition(now);
    }

    syncHudState(now);
    currentContext.hud?.updateHUD?.(currentContext.gameState);
    renderFrame(ctx);

    if (fluxState.playerFlashFrames > 0) {
      fluxState.playerFlashFrames -= 1;
    }
  }

  animationFrameId = window.requestAnimationFrame(gameLoop);
}

export function startFlux(context = currentContext) {
  if (!context?.canvas) {
    return;
  }

  stopFlux();

  const canvas = context.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  currentContext = { ...context, ctx };
  syncCanvasResolution(canvas, ctx);

  fluxState = {
    x: (canvas.clientWidth || window.innerWidth) / 2,
    y: (canvas.clientHeight || window.innerHeight) - 70,
    velocityX: 0,
    health: PLAYER_MAX_HEALTH,
    playerBullets: [],
    powerUps: [],
    nextPlayerShotAt: 0,
    playerFlashFrames: 0,
    shieldActive: false,
    multiShotUntil: 0,
    activePowerupLabel: null,
    activePowerupLabelUntil: 0,
    enemyFormationOffsetX: 0,
    enemyFormationDirection: 1,
    enemies: initializeEnemies(),
    enemyBullets: [],
    nextDiveAt: 0,
    nextEnemyShotAt: 0,
    boss: null,
    bossPhase: false,
    bossBullets: [],
    input: {
      left: false,
      right: false,
      fire: false,
    },
  };

  for (const enemy of fluxState.enemies) {
    const home = getEnemyHomePosition(enemy, canvas);
    enemy.x = home.x;
    enemy.y = home.y;
  }

  const now = performance.now();
  scheduleNextDive(now);
  scheduleNextEnemyShot(now);

  currentContext.gameState.mode = 'flux';
  currentContext.gameState.score = 0;
  currentContext.gameState.wave = 1;
  currentContext.gameState.running = true;
  currentContext.gameState.paused = false;
  syncHudState(performance.now());
  currentContext.hud?.showHUD?.();
  currentContext.hud?.updateHUD?.(currentContext.gameState);

  resizeHandler = () => {
    const prevWidth = canvas.clientWidth || window.innerWidth;
    const prevHeight = canvas.clientHeight || window.innerHeight;
    syncCanvasResolution(canvas, ctx);
    const nextWidth = canvas.clientWidth || window.innerWidth;
    const nextHeight = canvas.clientHeight || window.innerHeight;
    const sx = prevWidth > 0 ? nextWidth / prevWidth : 1;
    const sy = prevHeight > 0 ? nextHeight / prevHeight : 1;

    fluxState.x *= sx;
    fluxState.y *= sy;

    for (const enemy of fluxState.enemies) {
      enemy.x *= sx;
      enemy.y *= sy;
      enemy.diveTargetX *= sx;
    }

    for (const bullet of fluxState.playerBullets) {
      bullet.x *= sx;
      bullet.y *= sy;
    }

    for (const bullet of fluxState.enemyBullets) {
      bullet.x *= sx;
      bullet.y *= sy;
    }

    for (const bullet of fluxState.bossBullets) {
      bullet.x *= sx;
      bullet.y *= sy;
    }

    for (const powerUp of fluxState.powerUps) {
      powerUp.x *= sx;
      powerUp.y *= sy;
    }

    if (fluxState.boss) {
      fluxState.boss.x *= sx;
      fluxState.boss.y *= sy;
    }

    const minX = PLAYER_WIDTH / 2;
    const maxX = (canvas.clientWidth || window.innerWidth) - PLAYER_WIDTH / 2;
    fluxState.x = clamp(fluxState.x, minX, maxX);
    fluxState.y = clamp(fluxState.y, PLAYER_HEIGHT / 2, (canvas.clientHeight || window.innerHeight) - PLAYER_HEIGHT / 2);
  };

  keydownHandler = (event) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      currentContext.gameState.paused = !currentContext.gameState.paused;
      if (currentContext.gameState.paused) {
        currentContext.hud?.showPauseMenu?.({
          onResume: () => {
            currentContext.gameState.paused = false;
            currentContext.hud?.hidePauseMenu?.();
          },
          onQuit: () => {
            currentContext.hud?.hidePauseMenu?.();
            stopFlux();
            currentContext.hud?.showMainMenu?.(currentContext.startMode, currentContext.audio);
          },
        });
      } else {
        currentContext.hud?.hidePauseMenu?.();
      }
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
    }
    handleKeyChange(event, true);
  };
  keyupHandler = (event) => handleKeyChange(event, false);

  window.addEventListener('resize', resizeHandler);
  window.addEventListener('keydown', keydownHandler);
  window.addEventListener('keyup', keyupHandler);

  animationFrameId = window.requestAnimationFrame(gameLoop);
}

export function stopFlux() {
  if (animationFrameId !== null) {
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

  if (keyupHandler) {
    window.removeEventListener('keyup', keyupHandler);
    keyupHandler = null;
  }

  fluxState.input.left = false;
  fluxState.input.right = false;
  fluxState.input.fire = false;

  removeBossHpHud();
  currentContext?.hud?.hidePauseMenu?.();

  if (currentContext?.gameState?.mode === 'flux') {
    currentContext.gameState.running = false;
  }
}

export const fluxMode = {
  id: 'flux',
  start(context) {
    startFlux(context);
  },
  stop() {
    stopFlux();
  },
};
