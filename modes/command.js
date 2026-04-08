import { drawStarfield } from '../starfield.js';

// ─── Ship constants ─────────────────────────────────────────────────────────
const SHIP_RADIUS = 28;
const SHIP_COLOR = '#00ff88';
const SHIP_GLOW = 24;
const SHIP_STROKE_WIDTH = 1.8;

// ─── Fighter (fleet) constants ───────────────────────────────────────────────
const FIGHTER_WIDTH = 15;
const FIGHTER_HEIGHT = 20;
const FIGHTER_COLOR = '#00ff88';
const FIGHTER_GLOW = 10;
const STARTING_FLEET_COUNT = 12;
const MAX_FLEET_COUNT = 30;
// Y-offsets from mothership centre for each formation row
const FLEET_ROW_Y = [-60, 0, 55];
// Fleet HP bar
const FLEET_BAR_WIDTH = 80;
const FLEET_BAR_HEIGHT = 2;
// Fighter movement / fire
const FIGHTER_ATTACK_SPEED = 2.8;
const FIGHTER_RETURN_SPEED = 3.5;
const FIGHTER_FLANK_SPEED = 2.8;
const FIGHTER_SCATTER_SPEED = 2.5;
const FIGHTER_FIRE_MIN_MS = 600;
const FIGHTER_FIRE_MAX_MS = 1200;
const FIGHTER_BULLET_WIDTH = 2;
const FIGHTER_BULLET_HEIGHT = 8;
const FIGHTER_BULLET_SPEED = 8;
// Auto-hover in command mode
const AUTO_HOVER_SPEED = 0.4;
const AUTO_HOVER_RANGE = 40;

// ─── Tactical panel ──────────────────────────────────────────────────────────
const TACTICAL_PANEL_HEIGHT = 160;
const COMMAND_ORDERS = ['ATTACK', 'FALL BACK', 'FLANK LEFT', 'FLANK RIGHT', 'SHIELD WALL', 'SCATTER', 'RECALL'];
const ORDER_KEYS    = ['ATTACK', 'FALL_BACK', 'FLANK_LEFT', 'FLANK_RIGHT', 'SHIELD_WALL', 'SCATTER', 'RECALL'];

// ─── Movement constants ──────────────────────────────────────────────────────
const MOVE_ACCELERATION = 0.9;
const MAX_SPEED = 5;
const DECELERATION = 0.88;

// ─── Enemy constants ─────────────────────────────────────────────────────────
const ENEMY_COLUMNS = 7;
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
const ENEMY_DIVE_TRACK_Y_SPEED = 0.55;
const ENEMY_RETURN_SPEED = 2.1;
const ENEMY_SHOT_MIN_MS = 2000;
const ENEMY_SHOT_MAX_MS = 3000;
const ENEMY_BULLET_WIDTH = 2;
const ENEMY_BULLET_HEIGHT = 9;
const ENEMY_BULLET_SPEED = 3.2;
const ENEMY_MAX_BULLETS = 3;

// ─── Player bullet constants ──────────────────────────────────────────────────
const PLAYER_BULLET_WIDTH = 2;
const PLAYER_BULLET_HEIGHT = 10;
const PLAYER_BULLET_SPEED = 9;
const PLAYER_MAX_BULLETS = 6;
const PLAYER_SHOT_COOLDOWN_MS = 350;
const PLAYER_SPREAD_ANGLE = 0.18;
const PLAYER_FLASH_FRAMES_ON_HIT = 3;
const SCORE_PER_KILL = 100;
const COMMAND_MULTI_SPREAD_COUNT = 5;
const COMMAND_MULTI_SPREAD_ANGLE = 0.26;
const POWERUP_DROP_CHANCE = 0.15;

// ─── Boss constants ───────────────────────────────────────────────────────────
const BOSS_WIDTH = 80;
const BOSS_HEIGHT = 90;
const BOSS_HP = 20;
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

// ─── Module-level state ───────────────────────────────────────────────────────
let animationFrameId = null;
let currentContext = null;
let resizeHandler = null;
let keydownHandler = null;
let keyupHandler = null;
let livesHudElement = null;
let touchControls = null;
let lastFrameTime = 0;
let modeToggleEl = null;
let tacticalPanelEl = null;
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

let commandState = {
  x: 0,
  y: 0,
  velocityX: 0,
  velocityY: 0,
  // Fleet
  fighters: [],
  fighterBullets: [],
  fleetCount: STARTING_FLEET_COUNT,
  fleetMaxCount: STARTING_FLEET_COUNT,
  // Control mode
  ctrlMode: 'control',
  activeOrder: null,
  hoverOffset: 0,
  hoverDirection: 1,
  // Weapons
  playerBullets: [],
  nextPlayerShotAt: 0,
  playerFlashFrames: 0,
  shieldActive: false,
  multiShotUntil: 0,
  activePowerupLabel: null,
  activePowerupLabelUntil: 0,
  powerUps: [],
  // Enemies
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
    up: false,
    down: false,
    fire: false,
    axisX: 0,
    axisY: 0,
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function syncCanvasResolution(canvas, ctx) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPlayerBoundaryY(canvasHeight) {
  return canvasHeight * 0.6;
}

function getAabb(x, y, w, h) {
  return { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 };
}

function getCircleAabb(x, y, r) {
  return { left: x - r, right: x + r, top: y - r, bottom: y + r };
}

function overlapsAabb(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

// ─── Formation layout ─────────────────────────────────────────────────────────
/**
 * Given a total fighter count return how many fighters go in each of
 * up to 3 rows as [row0, row1, row2].
 */
function getRowCounts(total) {
  if (total <= 0) return [0, 0, 0];
  if (total <= 4) return [total, 0, 0];
  if (total <= 8) {
    const r0 = Math.ceil(total / 2);
    return [r0, total - r0, 0];
  }
  const r0 = Math.ceil(total / 3);
  const r1 = Math.ceil((total - r0) / 2);
  const r2 = total - r0 - r1;
  return [r0, r1, r2];
}

/**
 * Return the {x, y} formation target for a fighter given mothership pos.
 */
function getFormationTarget(row, col, totalInRow) {
  const spacing = 24;
  const totalWidth = Math.max(0, (totalInRow - 1)) * spacing;
  const dx = -totalWidth / 2 + col * spacing;
  const dy = FLEET_ROW_Y[row] != null ? FLEET_ROW_Y[row] : 0;
  return { tx: commandState.x + dx, ty: commandState.y + dy };
}

/**
 * Create an initial array of 12 fighter objects.
 */
function initializeFighters() {
  const fighters = [];
  const counts = getRowCounts(STARTING_FLEET_COUNT);
  let id = 0;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < counts[row]; col += 1) {
      fighters.push({
        id: `f${id += 1}`,
        hp: 1,
        x: 0,
        y: 0,
        state: 'FORMATION',
        row,
        col,
        totalInRow: counts[row],
        nextShotAt: randomInRange(FIGHTER_FIRE_MIN_MS, FIGHTER_FIRE_MAX_MS),
        flankSide: null,
        scatterX: 0,
        scatterY: 0,
      });
    }
  }
  return fighters;
}

/**
 * Redistribute living fighters across rows and start the smooth slide
 * animation (each fighter will LERP toward its new target in updateFighters).
 */
function recalculateFormation() {
  const alive = commandState.fighters.filter((f) => f.hp > 0);
  const counts = getRowCounts(alive.length);
  let idx = 0;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < counts[row]; col += 1) {
      if (idx < alive.length) {
        alive[idx].row = row;
        alive[idx].col = col;
        alive[idx].totalInRow = counts[row];
        idx += 1;
      }
    }
  }
  commandState.fleetCount = alive.length;
}

// ─── Fighter AI helpers ───────────────────────────────────────────────────────
function getNearestEnemyForFighter(fighter) {
  let nearest = null;
  let minDist = Infinity;
  const candidates = commandState.bossPhase
    ? (commandState.boss && commandState.boss.hp > 0 ? [commandState.boss] : [])
    : commandState.enemies;
  for (const e of candidates) {
    if (!e || (e.hp !== undefined && e.hp <= 0)) continue;
    const dx = e.x - fighter.x;
    const dy = e.y - fighter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = e;
    }
  }
  return nearest;
}

function fireFighterBulletAt(fighter, now, vx, vy) {
  if (now < fighter.nextShotAt) return;
  commandState.fighterBullets.push({
    x: fighter.x,
    y: fighter.y - FIGHTER_HEIGHT / 2,
    vx,
    vy,
  });
  fighter.nextShotAt = now + randomInRange(FIGHTER_FIRE_MIN_MS, FIGHTER_FIRE_MAX_MS);
}

/** Move obj toward (tx,ty) at speed; returns true when arrived. */
function moveToward(obj, tx, ty, speed, dt) {
  const dx = tx - obj.x;
  const dy = ty - obj.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const step = Math.min(speed * dt, dist);
  obj.x += (dx / dist) * step;
  obj.y += (dy / dist) * step;
  return dist <= step + 0.5;
}

function getShieldWallTarget(fighter) {
  const alive = commandState.fighters.filter((f) => f.hp > 0);
  const n = alive.length || 1;
  const idx = alive.indexOf(fighter);
  const totalSpan = SHIP_RADIUS * 2 + 120;
  const spacing = n > 1 ? totalSpan / (n - 1) : 0;
  const startX = commandState.x - totalSpan / 2;
  const tx = n === 1 ? commandState.x : startX + idx * spacing;
  return { tx, ty: commandState.y - 40 };
}

function updateFighterBullets(canvas) {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  for (const b of commandState.fighterBullets) {
    b.x += b.vx;
    b.y += b.vy;
  }
  commandState.fighterBullets = commandState.fighterBullets.filter(
    (b) => b.y + FIGHTER_BULLET_HEIGHT >= 0 && b.x >= -20 && b.x <= w + 20 && b.y <= h + 20,
  );
}

// ─── Fighter update ───────────────────────────────────────────────────────────
function updateFighters(canvas, now, dt) {
  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const canvasHeight = canvas.clientHeight || window.innerHeight;
  const flankMargin = 32;
  const allEnemiesGone = commandState.enemies.length === 0 && !commandState.bossPhase;

  for (const f of commandState.fighters) {
    if (f.hp <= 0) continue;

    // Auto-return if enemies are gone while attacking/flanking/scattering
    if (allEnemiesGone && (f.state === 'ATTACKING' || f.state === 'FLANKING' || f.state === 'SCATTERED')) {
      f.state = 'RETURNING';
    }

    switch (f.state) {
      case 'FORMATION': {
        const { tx, ty } = getFormationTarget(f.row, f.col, f.totalInRow);
        f.x += (tx - f.x) * 0.15 * dt;
        f.y += (ty - f.y) * 0.15 * dt;
        break;
      }

      case 'ATTACKING': {
        const target = getNearestEnemyForFighter(f);
        if (target) {
          moveToward(f, target.x, target.y - FIGHTER_HEIGHT, FIGHTER_ATTACK_SPEED, dt);
          fireFighterBulletAt(f, now, 0, -FIGHTER_BULLET_SPEED);
          if (f.y < 20) {
            f.state = 'RETURNING';
          }
        } else {
          f.state = 'RETURNING';
        }
        break;
      }

      case 'FLANKING': {
        const targetX = f.flankSide === 'left' ? flankMargin : canvasWidth - flankMargin;
        if (Math.abs(f.x - targetX) > 6) {
          moveToward(f, targetX, f.y, FIGHTER_FLANK_SPEED * 2, dt);
        } else {
          f.x = targetX;
          f.y -= FIGHTER_FLANK_SPEED * dt;
          const target = getNearestEnemyForFighter(f);
          if (target) {
            const dx = target.x - f.x;
            const dy = target.y - f.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            fireFighterBulletAt(f, now, (dx / dist) * FIGHTER_BULLET_SPEED, (dy / dist) * FIGHTER_BULLET_SPEED);
          } else {
            fireFighterBulletAt(f, now, 0, -FIGHTER_BULLET_SPEED);
          }
        }
        if (f.y < -FIGHTER_HEIGHT) {
          f.state = 'RETURNING';
          f.y = -FIGHTER_HEIGHT;
        }
        break;
      }

      case 'SHIELDING': {
        const { tx, ty } = getShieldWallTarget(f);
        f.x += (tx - f.x) * 0.2 * dt;
        f.y += (ty - f.y) * 0.2 * dt;
        // No firing in shield wall
        break;
      }

      case 'SCATTERED': {
        const arrived = moveToward(f, f.scatterX, f.scatterY, FIGHTER_SCATTER_SPEED, dt);
        if (arrived) {
          const target = getNearestEnemyForFighter(f);
          if (target) {
            const dx = target.x - f.x;
            const dy = target.y - f.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            fireFighterBulletAt(f, now, (dx / dist) * FIGHTER_BULLET_SPEED, (dy / dist) * FIGHTER_BULLET_SPEED);
          }
        }
        break;
      }

      case 'RETURNING': {
        const { tx, ty } = getFormationTarget(f.row, f.col, f.totalInRow);
        const arrived = moveToward(f, tx, ty, FIGHTER_RETURN_SPEED, dt);
        if (arrived) {
          f.x = tx;
          f.y = ty;
          f.state = 'FORMATION';
        }
        break;
      }
      default: break;
    }
  }

  updateFighterBullets(canvas);
}

// ─── Tactical orders ──────────────────────────────────────────────────────────
function issueOrder(orderKey) {
  const canvas = currentContext?.canvas;
  const canvasWidth = canvas ? (canvas.clientWidth || window.innerWidth) : window.innerWidth;
  const canvasHeight = canvas ? (canvas.clientHeight || window.innerHeight) : window.innerHeight;
  const boundaryY = getPlayerBoundaryY(canvasHeight);

  commandState.activeOrder = orderKey;

  switch (orderKey) {
    case 'ATTACK':
      for (const f of commandState.fighters) {
        if (f.hp > 0) f.state = 'ATTACKING';
      }
      break;

    case 'FALL_BACK':
      for (const f of commandState.fighters) {
        if (f.hp > 0) f.state = 'RETURNING';
      }
      commandState.activeOrder = null;
      break;

    case 'FLANK_LEFT': {
      const alive = commandState.fighters.filter((f) => f.hp > 0);
      const half = Math.ceil(alive.length / 2);
      for (let i = 0; i < alive.length; i += 1) {
        if (i < half) {
          alive[i].state = 'FLANKING';
          alive[i].flankSide = 'left';
        } else {
          alive[i].state = 'FORMATION';
        }
      }
      break;
    }

    case 'FLANK_RIGHT': {
      const alive = commandState.fighters.filter((f) => f.hp > 0);
      const half = Math.ceil(alive.length / 2);
      for (let i = 0; i < alive.length; i += 1) {
        if (i >= alive.length - half) {
          alive[i].state = 'FLANKING';
          alive[i].flankSide = 'right';
        } else {
          alive[i].state = 'FORMATION';
        }
      }
      break;
    }

    case 'SHIELD_WALL':
      for (const f of commandState.fighters) {
        if (f.hp > 0) f.state = 'SHIELDING';
      }
      break;

    case 'SCATTER':
      for (const f of commandState.fighters) {
        if (f.hp > 0) {
          f.state = 'SCATTERED';
          f.scatterX = randomInRange(40, canvasWidth - 40);
          f.scatterY = randomInRange(boundaryY + 30, canvasHeight - 60);
        }
      }
      break;

    case 'RECALL':
      recalculateFormation();
      for (const f of commandState.fighters) {
        if (f.hp > 0) {
          const { tx, ty } = getFormationTarget(f.row, f.col, f.totalInRow);
          f.x = tx;
          f.y = ty;
          f.state = 'FORMATION';
        }
      }
      commandState.activeOrder = null;
      break;

    default: break;
  }

  updateTacticalPanelButtons();
}

// ─── Mode-toggle UI ───────────────────────────────────────────────────────────
const GLASS_BTN_BASE = [
  'padding:10px 14px',
  'min-width:44px',
  'min-height:44px',
  'border-radius:10px',
  'font-family:"Courier New",monospace',
  'font-size:10px',
  'letter-spacing:0.15em',
  'text-transform:uppercase',
  'cursor:pointer',
  'border:0.5px solid rgba(255,255,255,0.12)',
  'background:rgba(255,255,255,0.04)',
  'color:rgba(255,255,255,0.45)',
  'backdrop-filter:blur(12px)',
  '-webkit-backdrop-filter:blur(12px)',
  'transition:all 120ms ease',
  'pointer-events:auto',
].join(';');

const GLASS_BTN_ACTIVE_EXTRA = [
  'background:rgba(0,255,136,0.12)',
  'border-color:rgba(0,255,136,0.35)',
  'color:#00ff88',
].join(';');

function createModeToggleButtons() {
  if (modeToggleEl || !currentContext?.uiLayer) return;

  const container = document.createElement('div');
  container.id = 'cmd-mode-toggle';
  container.style.cssText = [
    'position:fixed',
    'bottom:20px',
    'left:16px',
    'z-index:10',
    'display:flex',
    'gap:8px',
    'pointer-events:auto',
  ].join(';');

  const btnControl = document.createElement('button');
  btnControl.type = 'button';
  btnControl.textContent = 'CONTROL';
  btnControl.style.cssText = GLASS_BTN_BASE + ';' + GLASS_BTN_ACTIVE_EXTRA;

  const btnCommand = document.createElement('button');
  btnCommand.type = 'button';
  btnCommand.textContent = 'COMMAND';
  btnCommand.style.cssText = GLASS_BTN_BASE;
  // Faint glow to remind player COMMAND mode exists
  btnCommand.style.boxShadow = '0 0 8px rgba(0,255,136,0.1)';

  const onControl = (e) => { e.preventDefault(); switchCtrlMode('control'); };
  const onCommand = (e) => { e.preventDefault(); switchCtrlMode('command'); };
  btnControl.addEventListener('click', onControl);
  btnCommand.addEventListener('click', onCommand);
  if (isTouchDevice) {
    btnControl.addEventListener('touchstart', onControl, { passive: false });
    btnCommand.addEventListener('touchstart', onCommand, { passive: false });
  }

  container.appendChild(btnControl);
  container.appendChild(btnCommand);
  currentContext.uiLayer.appendChild(container);

  modeToggleEl = { container, btnControl, btnCommand };
}

function updateModeToggleButtons() {
  if (!modeToggleEl) return;
  const { btnControl, btnCommand } = modeToggleEl;
  if (commandState.ctrlMode === 'control') {
    btnControl.style.cssText = GLASS_BTN_BASE + ';' + GLASS_BTN_ACTIVE_EXTRA;
    btnCommand.style.cssText = GLASS_BTN_BASE + ';box-shadow:0 0 8px rgba(0,255,136,0.1)';
  } else {
    btnControl.style.cssText = GLASS_BTN_BASE;
    btnCommand.style.cssText = GLASS_BTN_BASE + ';' + GLASS_BTN_ACTIVE_EXTRA;
  }
}

function removeModeToggleButtons() {
  if (modeToggleEl?.container?.parentElement) {
    modeToggleEl.container.parentElement.removeChild(modeToggleEl.container);
  }
  modeToggleEl = null;
}

// ─── Tactical panel UI ────────────────────────────────────────────────────────
const CMD_BTN_BASE = [
  'flex-shrink:0',
  'padding:12px 16px',
  'min-width:44px',
  'min-height:44px',
  'border-radius:10px',
  'font-family:"Courier New",monospace',
  'font-size:11px',
  'letter-spacing:0.15em',
  'text-transform:uppercase',
  'cursor:pointer',
  'border:0.5px solid rgba(255,255,255,0.12)',
  'background:rgba(255,255,255,0.04)',
  'color:rgba(255,255,255,0.7)',
  'transition:all 120ms ease',
  'white-space:nowrap',
  'display:inline-flex',
  'align-items:center',
  'gap:6px',
].join(';');

const CMD_BTN_ACTIVE_EXTRA = [
  'background:rgba(0,255,136,0.10)',
  'border:1px solid rgba(0,255,136,0.4)',
  'color:#00ff88',
].join(';');

function createTacticalPanel() {
  if (tacticalPanelEl || !currentContext?.uiLayer) return;

  const panel = document.createElement('div');
  panel.id = 'cmd-tactical-panel';
  panel.style.cssText = [
    'position:fixed',
    'bottom:0',
    'left:0',
    'right:0',
    `height:${TACTICAL_PANEL_HEIGHT}px`,
    'background:rgba(0,0,0,0.7)',
    'border-top:0.5px solid rgba(255,255,255,0.1)',
    'backdrop-filter:blur(16px)',
    '-webkit-backdrop-filter:blur(16px)',
    'z-index:9',
    'display:flex',
    'flex-direction:column',
    'align-items:flex-start',
    'justify-content:center',
    'padding:16px 20px',
    'gap:12px',
    'transform:translateY(100%)',
    'transition:transform 300ms ease',
    'pointer-events:auto',
    'box-sizing:border-box',
  ].join(';');

  // Scrollable button row
  const buttonsRow = document.createElement('div');
  buttonsRow.style.cssText = [
    'display:flex',
    'flex-direction:row',
    'gap:10px',
    'overflow-x:auto',
    'scrollbar-width:none',
    '-ms-overflow-style:none',
    'width:100%',
    'padding-bottom:4px',
  ].join(';');

  const cmdBtns = [];
  for (let i = 0; i < COMMAND_ORDERS.length; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = CMD_BTN_BASE;
    btn.dataset.order = ORDER_KEYS[i];

    const dot = document.createElement('span');
    dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#00ff88;display:none;flex-shrink:0;';

    const label = document.createElement('span');
    label.textContent = COMMAND_ORDERS[i];

    btn.appendChild(dot);
    btn.appendChild(label);

    const key = ORDER_KEYS[i];
    const handler = (e) => { e.preventDefault(); issueOrder(key); };
    btn.addEventListener('click', handler);
    if (isTouchDevice) {
      btn.addEventListener('touchstart', handler, { passive: false });
    }
    btn.addEventListener('mouseover', () => {
      if (commandState.activeOrder !== key) {
        btn.style.background = 'rgba(0,255,136,0.06)';
        btn.style.borderColor = 'rgba(0,255,136,0.2)';
      }
    });
    btn.addEventListener('mouseout', () => {
      if (commandState.activeOrder !== key) {
        btn.style.cssText = CMD_BTN_BASE;
      }
    });

    buttonsRow.appendChild(btn);
    cmdBtns.push({ btn, dot, orderKey: key });
  }

  const statusLine = document.createElement('div');
  statusLine.id = 'cmd-status-line';
  statusLine.style.cssText = [
    'font-family:"Courier New",monospace',
    'font-size:11px',
    'letter-spacing:0.12em',
    'color:rgba(255,255,255,0.35)',
    'white-space:nowrap',
    'overflow:hidden',
    'text-overflow:ellipsis',
  ].join(';');
  statusLine.textContent = `\u203a  FORMATION  \u00b7  ${STARTING_FLEET_COUNT} FIGHTERS ACTIVE`;

  panel.appendChild(buttonsRow);
  panel.appendChild(statusLine);
  currentContext.uiLayer.appendChild(panel);

  tacticalPanelEl = { panel, statusLine, cmdBtns };
}

function showTacticalPanel() {
  if (!tacticalPanelEl) return;
  tacticalPanelEl.panel.style.transform = 'translateY(0)';
  // Fade normal HUD to 30%
  const hudEl = currentContext?.uiLayer?.querySelector('[style*="position: absolute"][style*="inset: 0"]');
  if (hudEl) hudEl.style.opacity = '0.3';
}

function hideTacticalPanel() {
  if (!tacticalPanelEl) return;
  tacticalPanelEl.panel.style.transform = 'translateY(100%)';
  // Restore HUD opacity
  const hudEl = currentContext?.uiLayer?.querySelector('[style*="position: absolute"][style*="inset: 0"]');
  if (hudEl) hudEl.style.opacity = '';
}

function updateTacticalPanelButtons() {
  if (!tacticalPanelEl) return;
  const { cmdBtns, statusLine } = tacticalPanelEl;
  for (const { btn, dot, orderKey } of cmdBtns) {
    const active = commandState.activeOrder === orderKey;
    if (active) {
      btn.style.cssText = CMD_BTN_BASE + ';' + CMD_BTN_ACTIVE_EXTRA;
      dot.style.display = 'inline-block';
    } else {
      btn.style.cssText = CMD_BTN_BASE;
      dot.style.display = 'none';
    }
  }
  const alive = commandState.fighters.filter((f) => f.hp > 0).length;
  const orderLabel = commandState.activeOrder
    ? commandState.activeOrder.replace(/_/g, ' ')
    : 'FORMATION';
  statusLine.textContent = `\u203a  ${orderLabel}  \u00b7  ${alive} FIGHTERS ACTIVE`;
}

function removeTacticalPanel() {
  if (tacticalPanelEl?.panel?.parentElement) {
    tacticalPanelEl.panel.parentElement.removeChild(tacticalPanelEl.panel);
  }
  tacticalPanelEl = null;
}

// ─── Switch between control / command mode ───────────────────────────────────
function switchCtrlMode(mode) {
  if (commandState.ctrlMode === mode) return;
  commandState.ctrlMode = mode;
  if (mode === 'command') {
    showTacticalPanel();
    updateTacticalPanelButtons();
  } else {
    hideTacticalPanel();
    // Recall all fighters to formation
    for (const f of commandState.fighters) {
      if (f.hp > 0 && f.state !== 'FORMATION') f.state = 'RETURNING';
    }
    commandState.activeOrder = null;
  }
  updateModeToggleButtons();
}

// ─── Enemy formation helpers ─────────────────────────────────────────────────
function getFormationLayout(canvas) {
  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const formationWidth = Math.min(canvasWidth - 80, 420);
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
    x: layout.startX + enemy.col * layout.spacingX + commandState.enemyFormationOffsetX,
    y: layout.startY + enemy.row * layout.spacingY,
  };
}

function initializeEnemies() {
  const enemies = [];
  for (let row = 0; row < ENEMY_ROWS; row += 1) {
    for (let col = 0; col < ENEMY_COLUMNS; col += 1) {
      enemies.push({ id: `${row}-${col}`, col, row, hp: 1, state: 'formation', x: 0, y: 0, diveTargetX: 0 });
    }
  }
  return enemies;
}

function scheduleNextDive(now) {
  const [minDelay, maxDelay] = currentContext.waveController.getDiveRange(
    ENEMY_DIVE_MIN_MS,
    ENEMY_DIVE_MAX_MS,
  );
  commandState.nextDiveAt = now + randomInRange(minDelay, maxDelay);
}

function scheduleNextEnemyShot(now) {
  const [minDelay, maxDelay] = currentContext.waveController.getFireRange(
    ENEMY_SHOT_MIN_MS,
    ENEMY_SHOT_MAX_MS,
  );
  commandState.nextEnemyShotAt = now + randomInRange(minDelay, maxDelay);
}

// ─── HUD helpers ─────────────────────────────────────────────────────────────
function updateLivesHud() {
  // Rendered by ui.js via shared gameState
}

function removeLivesHud() {
  livesHudElement = null;
}

// ─── Fleet hit helpers ────────────────────────────────────────────────────────
function killFighterById(fighterId) {
  const f = commandState.fighters.find((ff) => ff.id === fighterId);
  if (!f) return;
  f.hp = 0;
  recalculateFormation();
}

function killFighterByHit(fighter) {
  fighter.hp = 0;
  recalculateFormation();
}

// ─── PowerUp ─────────────────────────────────────────────────────────────────
function spawnCommandPowerUp(x, y) {
  const pu = currentContext.spawnPowerup(x, y);
  commandState.powerUps.push(pu);
}

function updatePowerups(canvas, now, dt) {
  const canvasHeight = canvas.clientHeight || window.innerHeight;
  const { POWERUP_DRIFT_SPEED } = currentContext;

  for (const pu of commandState.powerUps) {
    pu.y += POWERUP_DRIFT_SPEED * dt;
  }

  commandState.powerUps = commandState.powerUps.filter((pu) => pu.y - pu.radius <= canvasHeight);

  const collected = [];
  const remaining = [];

  for (const pu of commandState.powerUps) {
    const dx = pu.x - commandState.x;
    const dy = pu.y - commandState.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const collectRadius = pu.radius + SHIP_RADIUS;
    if (dist <= collectRadius) {
      collected.push(pu);
    } else {
      remaining.push(pu);
    }
  }

  commandState.powerUps = remaining;

  for (const pu of collected) {
    currentContext.audio?.playPowerup?.();
    applyPowerup(pu.type, now);
  }
}

function applyPowerup(type, now) {
  const { MULTI_SHOT_DURATION_MS } = currentContext;

  commandState.activePowerupLabel = type.toUpperCase();
  commandState.activePowerupLabelUntil = now + 3000;

  if (type === 'shield') {
    commandState.shieldActive = true;
  } else if (type === 'multi') {
    commandState.multiShotUntil = now + MULTI_SHOT_DURATION_MS;
  } else if (type === 'fleet') {
    // Add 2 new fighters at the rear (max MAX_FLEET_COUNT)
    const currentAlive = commandState.fighters.filter((f) => f.hp > 0).length;
    const toAdd = Math.min(2, MAX_FLEET_COUNT - currentAlive);
    if (toAdd > 0) {
      let nextId = commandState.fighters.length + 1;
      for (let i = 0; i < toAdd; i += 1) {
        commandState.fighters.push({
          id: `f${nextId += 1}`,
          hp: 1,
          x: commandState.x,
          y: commandState.y + 80,
          state: 'RETURNING',
          row: 2,
          col: 0,
          totalInRow: 1,
          nextShotAt: now + randomInRange(FIGHTER_FIRE_MIN_MS, FIGHTER_FIRE_MAX_MS),
          flankSide: null,
          scatterX: 0,
          scatterY: 0,
        });
      }
      // Update baseline for HP bar
      commandState.fleetMaxCount = Math.max(commandState.fleetMaxCount,
        commandState.fighters.filter((f) => f.hp > 0).length);
      recalculateFormation();
    }
  }
}

// ─── HUD sync ─────────────────────────────────────────────────────────────────
function syncHudState(now) {
  if (!currentContext?.gameState) return;
  const bossActive = Boolean(commandState.bossPhase && commandState.boss && commandState.boss.hp > 0);
  commandState.fleetCount = commandState.fighters.filter((f) => f.hp > 0).length;
  currentContext.gameState.fleetCount = commandState.fleetCount;
  currentContext.gameState.powerups = {
    shield: commandState.shieldActive,
    multi: now < commandState.multiShotUntil,
    fleet: false,
  };
  currentContext.gameState.bossActive = bossActive;
  currentContext.gameState.bossHp = bossActive ? commandState.boss.hp : 0;
  currentContext.gameState.bossMaxHp = bossActive ? commandState.boss.maxHp : 1;
}

// ─── Boss ─────────────────────────────────────────────────────────────────────
function spawnBoss(canvas) {
  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const now = performance.now();
  commandState.boss = {
    hp: BOSS_HP,
    maxHp: BOSS_HP,
    x: canvasWidth / 2,
    y: 80,
    direction: 1,
    flashFrames: 0,
    nextTripleShot: now + BOSS_TRIPLE_INTERVAL_MS,
    nextFanShot: now + BOSS_FAN_INTERVAL_MS,
  };
  commandState.bossPhase = true;
  commandState.bossBullets = [];
  commandState.enemyBullets = [];
  currentContext.audio?.play?.('bossArrival');
  updateBossHpHud();
}

function updateBoss(canvas, now, dt) {
  const boss = commandState.boss;
  if (!boss || boss.hp <= 0) return;

  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const margin = BOSS_WIDTH / 2 + 30;

  boss.x += boss.direction * BOSS_DRIFT_SPEED * dt;
  if (boss.x <= margin) { boss.direction = 1; boss.x = margin; }
  if (boss.x >= canvasWidth - margin) { boss.direction = -1; boss.x = canvasWidth - margin; }

  const originY = boss.y + BOSS_HEIGHT / 2;

  if (now >= boss.nextTripleShot) {
    for (let i = -1; i <= 1; i += 1) {
      const angle = i * BOSS_TRIPLE_SPREAD;
      commandState.bossBullets.push({
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
      commandState.bossBullets.push({
        x: boss.x,
        y: originY,
        vx: Math.sin(angle) * BOSS_BULLET_SPEED,
        vy: Math.cos(angle) * BOSS_BULLET_SPEED,
      });
    }
    boss.nextFanShot = now + BOSS_FAN_INTERVAL_MS;
  }
}

function updateBossBullets(canvas, dt) {
  for (const b of commandState.bossBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  commandState.bossBullets = commandState.bossBullets.filter(
    (b) => b.x >= -20 && b.x <= w + 20 && b.y >= -20 && b.y <= h + 20,
  );
}

function resolveBossCollisions() {
  const boss = commandState.boss;
  if (!boss || boss.hp <= 0) return;

  const bossBox = getAabb(boss.x, boss.y, BOSS_WIDTH, BOSS_HEIGHT);
  const usedBullets = new Set();

  // Player bullets vs boss
  for (let i = 0; i < commandState.playerBullets.length; i += 1) {
    const b = commandState.playerBullets[i];
    const bBox = getAabb(b.x, b.y, PLAYER_BULLET_WIDTH, PLAYER_BULLET_HEIGHT);
    if (overlapsAabb(bBox, bossBox)) {
      usedBullets.add(i);
      boss.hp -= 1;
      boss.flashFrames = 2;
      updateBossHpHud();
      if (boss.hp <= 0) break;
    }
  }

  // Fighter bullets vs boss
  const usedFighterBullets = new Set();
  for (let i = 0; i < commandState.fighterBullets.length; i += 1) {
    if (boss.hp <= 0) break;
    const b = commandState.fighterBullets[i];
    const bBox = getAabb(b.x, b.y, FIGHTER_BULLET_WIDTH, FIGHTER_BULLET_HEIGHT);
    if (overlapsAabb(bBox, bossBox)) {
      usedFighterBullets.add(i);
      boss.hp -= 1;
      boss.flashFrames = 2;
      updateBossHpHud();
    }
  }

  commandState.playerBullets = commandState.playerBullets.filter((_, i) => !usedBullets.has(i));
  commandState.fighterBullets = commandState.fighterBullets.filter((_, i) => !usedFighterBullets.has(i));

  // Boss bullets vs fighters and mothership
  const motherBox = getCircleAabb(commandState.x, commandState.y, SHIP_RADIUS);
  commandState.bossBullets = commandState.bossBullets.filter((b) => {
    const bBox = getAabb(b.x, b.y, BOSS_BULLET_WIDTH, BOSS_BULLET_HEIGHT);
    let absorbed = false;

    for (const f of commandState.fighters) {
      if (!f || f.hp <= 0) continue;
      const fBox = getAabb(f.x, f.y, FIGHTER_WIDTH, FIGHTER_HEIGHT);
      if (overlapsAabb(bBox, fBox)) {
        killFighterByHit(f);
        absorbed = true;
        break;
      }
    }

    if (!absorbed && overlapsAabb(bBox, motherBox)) {
      loseCommandLife();
      absorbed = true;
    }

    return !absorbed;
  });
}

function handleBossDeath(now) {
  currentContext.gameState.score += BOSS_SCORE;
  currentContext.audio?.playBossDeath?.();
  commandState.bossBullets = [];
  commandState.boss = null;
  commandState.bossPhase = false;
  removeBossHpHud();
  currentContext.audio?.play?.('waveClear');
  currentContext.waveController.beginWaveTransition(now);
}

function spawnFormationForWave() {
  if (!currentContext?.canvas) return;
  commandState.enemies = initializeEnemies();
  commandState.enemyBullets = [];
  commandState.enemyFormationOffsetX = 0;
  commandState.enemyFormationDirection = 1;
  for (const enemy of commandState.enemies) {
    const home = getEnemyHomePosition(enemy, currentContext.canvas);
    enemy.x = home.x;
    enemy.y = home.y;
  }
  const now = performance.now();
  scheduleNextDive(now);
  scheduleNextEnemyShot(now);
}

function checkWaveTransition(now) {
  if (commandState.bossPhase) {
    if (commandState.boss && commandState.boss.hp <= 0) {
      handleBossDeath(now);
    }
    return;
  }

  if (commandState.enemies.length === 0) {
    commandState.enemyBullets = [];
    currentContext.audio?.play?.('waveClear');
    currentContext.waveController.beginWaveTransition(now);
  }
}

function updateBossHpHud() {
  syncHudState(performance.now());
}

function removeBossHpHud() {
  if (!currentContext?.gameState) return;
  currentContext.gameState.bossActive = false;
  currentContext.gameState.bossHp = 0;
  currentContext.gameState.bossMaxHp = 1;
}

// ─── Touch controls ───────────────────────────────────────────────────────────
function setupTouchControls() {
  if (!isTouchDevice || !currentContext?.uiLayer || touchControls) return;

  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:6;';

  const joyBase = document.createElement('div');
  joyBase.style.cssText = 'position:fixed;width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.12);display:none;pointer-events:none;';
  const joyThumb = document.createElement('div');
  joyThumb.style.cssText = 'position:absolute;left:24px;top:24px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.08);border:0.5px solid rgba(255,255,255,0.22);';
  joyBase.appendChild(joyThumb);

  const fire = document.createElement('button');
  fire.type = 'button';
  fire.style.cssText = 'position:fixed;right:22px;bottom:20px;width:72px;height:72px;border-radius:50%;background:rgba(0,255,120,0.07);border:0.5px solid rgba(0,255,120,0.25);color:rgba(0,255,120,.95);display:flex;align-items:center;justify-content:center;pointer-events:auto;';
  fire.textContent = '\u25b2';

  const shield = document.createElement('button');
  shield.type = 'button';
  shield.style.cssText = 'position:fixed;right:30px;bottom:102px;width:56px;height:56px;border-radius:50%;background:rgba(0,238,255,0.07);border:0.5px solid rgba(0,238,255,0.25);color:rgba(0,238,255,.95);display:none;pointer-events:auto;';
  shield.textContent = '\u25c9';

  container.append(joyBase, fire, shield);
  currentContext.uiLayer.appendChild(container);

  let fireInterval = null;
  let joyTouchId = null;
  let joyCenterX = 0;
  let joyCenterY = 0;
  const baseRadius = 44;
  const maxOffset = 44;

  const beginFiring = () => {
    commandState.input.fire = true;
    if (fireInterval !== null) return;
    fireInterval = window.setInterval(() => {
      commandState.input.fire = true;
    }, 200);
  };

  const stopFiring = () => {
    commandState.input.fire = false;
    if (fireInterval !== null) {
      window.clearInterval(fireInterval);
      fireInterval = null;
    }
  };

  fire.addEventListener('touchstart', (event) => {
    event.preventDefault();
    beginFiring();
  }, { passive: false });
  fire.addEventListener('touchend', stopFiring);
  fire.addEventListener('touchcancel', stopFiring);

  shield.addEventListener('touchstart', (event) => {
    event.preventDefault();
    if (commandState.shieldActive) {
      commandState.shieldActive = true;
    }
  }, { passive: false });

  window.addEventListener('touchstart', (event) => {
    if (joyTouchId !== null) return;
    const touch = event.changedTouches[0];
    if (!touch || touch.clientX > window.innerWidth * 0.5) return;
    joyTouchId = touch.identifier;
    joyCenterX = touch.clientX;
    joyCenterY = touch.clientY;
    joyBase.style.display = 'block';
    joyBase.style.left = `${joyCenterX - baseRadius}px`;
    joyBase.style.top = `${joyCenterY - baseRadius}px`;
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (joyTouchId === null) return;
    const touch = Array.from(event.changedTouches).find((t) => t.identifier === joyTouchId);
    if (!touch) return;
    const dx = touch.clientX - joyCenterX;
    const dy = touch.clientY - joyCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const clamped = Math.min(maxOffset, dist);
    const nx = (dx / dist) * clamped;
    const ny = (dy / dist) * clamped;
    joyThumb.style.left = `${24 + nx}px`;
    joyThumb.style.top = `${24 + ny}px`;
    commandState.input.axisX = clamp(nx / maxOffset, -1, 1);
    commandState.input.axisY = clamp(ny / maxOffset, -1, 1);
    commandState.input.left = commandState.input.axisX < -0.08;
    commandState.input.right = commandState.input.axisX > 0.08;
    commandState.input.up = commandState.input.axisY < -0.08;
    commandState.input.down = commandState.input.axisY > 0.08;
  }, { passive: true });

  const endJoystickTouch = (event) => {
    if (joyTouchId === null) return;
    const touch = Array.from(event.changedTouches).find((t) => t.identifier === joyTouchId);
    if (!touch) return;
    joyTouchId = null;
    joyBase.style.display = 'none';
    joyThumb.style.left = '24px';
    joyThumb.style.top = '24px';
    commandState.input.axisX = 0;
    commandState.input.axisY = 0;
    commandState.input.left = false;
    commandState.input.right = false;
    commandState.input.up = false;
    commandState.input.down = false;
  };

  window.addEventListener('touchend', endJoystickTouch, { passive: true });
  window.addEventListener('touchcancel', endJoystickTouch, { passive: true });

  touchControls = {
    container,
    update() {
      shield.style.display = commandState.shieldActive ? 'block' : 'none';
    },
    cleanup() {
      stopFiring();
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }
    },
  };
}

function removeTouchControls() {
  touchControls?.cleanup?.();
  touchControls = null;
}

// ─── Key handling ─────────────────────────────────────────────────────────────
function handleKeyChange(event, isDown) {
  if (isTouchDevice) return;

  const key = event.key.toLowerCase();

  if (key === 'arrowleft' || key === 'a') commandState.input.left = isDown;
  if (key === 'arrowright' || key === 'd') commandState.input.right = isDown;
  if (key === 'arrowup' || key === 'w') commandState.input.up = isDown;
  if (key === 'arrowdown' || key === 's') commandState.input.down = isDown;
  if (key === ' ' || key === 'spacebar') commandState.input.fire = isDown;
}

// ─── Player movement ──────────────────────────────────────────────────────────
function updatePlayer(canvas, dt, now) {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  const boundaryY = getPlayerBoundaryY(height);
  const minX = SHIP_RADIUS;
  const maxX = width - SHIP_RADIUS;
  const minY = boundaryY + SHIP_RADIUS;
  const maxY = height - SHIP_RADIUS;

  // In COMMAND mode the mothership auto-hovers; player cannot move
  if (commandState.ctrlMode === 'command') {
    commandState.hoverOffset += AUTO_HOVER_SPEED * commandState.hoverDirection * dt;
    if (commandState.hoverOffset >= AUTO_HOVER_RANGE) {
      commandState.hoverOffset = AUTO_HOVER_RANGE;
      commandState.hoverDirection = -1;
    } else if (commandState.hoverOffset <= -AUTO_HOVER_RANGE) {
      commandState.hoverOffset = -AUTO_HOVER_RANGE;
      commandState.hoverDirection = 1;
    }
    commandState.x = clamp(commandState.x + AUTO_HOVER_SPEED * commandState.hoverDirection * dt, minX, maxX);
    commandState.velocityX = 0;
    commandState.velocityY = 0;
    return;
  }

  // CONTROL mode — full manual movement
  if (isTouchDevice && Math.abs(commandState.input.axisX) > 0.01) {
    commandState.velocityX += commandState.input.axisX * MOVE_ACCELERATION * dt;
  } else {
    if (commandState.input.left) commandState.velocityX -= MOVE_ACCELERATION * dt;
    if (commandState.input.right) commandState.velocityX += MOVE_ACCELERATION * dt;
  }

  if (isTouchDevice && Math.abs(commandState.input.axisY) > 0.01) {
    commandState.velocityY += commandState.input.axisY * MOVE_ACCELERATION * dt;
  } else {
    if (commandState.input.up) commandState.velocityY -= MOVE_ACCELERATION * dt;
    if (commandState.input.down) commandState.velocityY += MOVE_ACCELERATION * dt;
  }

  if (!commandState.input.left && !commandState.input.right && Math.abs(commandState.input.axisX) < 0.01) {
    commandState.velocityX *= Math.pow(DECELERATION, dt);
    if (Math.abs(commandState.velocityX) < 0.02) commandState.velocityX = 0;
  }

  if (!commandState.input.up && !commandState.input.down && Math.abs(commandState.input.axisY) < 0.01) {
    commandState.velocityY *= Math.pow(DECELERATION, dt);
    if (Math.abs(commandState.velocityY) < 0.02) commandState.velocityY = 0;
  }

  commandState.velocityX = clamp(commandState.velocityX, -MAX_SPEED, MAX_SPEED);
  commandState.velocityY = clamp(commandState.velocityY, -MAX_SPEED, MAX_SPEED);
  commandState.x += commandState.velocityX * dt;
  commandState.y += commandState.velocityY * dt;
  commandState.x = clamp(commandState.x, minX, maxX);
  commandState.y = clamp(commandState.y, minY, maxY);
}

// ─── Player & fighter shooting ────────────────────────────────────────────────
function updatePlayerShooting(now) {
  if (!commandState.input.fire) return;
  if (commandState.playerBullets.length >= PLAYER_MAX_BULLETS) return;
  if (now < commandState.nextPlayerShotAt) return;

  const originX = commandState.x;
  const originY = commandState.y - SHIP_RADIUS;
  const isMulti = now < commandState.multiShotUntil;

  if (isMulti) {
    const count = COMMAND_MULTI_SPREAD_COUNT;
    const halfArc = COMMAND_MULTI_SPREAD_ANGLE * (count - 1) / 2;
    for (let i = 0; i < count; i += 1) {
      const angle = -halfArc + i * COMMAND_MULTI_SPREAD_ANGLE;
      commandState.playerBullets.push({
        x: originX, y: originY,
        vx: Math.sin(angle) * PLAYER_BULLET_SPEED,
        vy: -Math.cos(angle) * PLAYER_BULLET_SPEED,
      });
    }
  } else {
    commandState.playerBullets.push(
      { x: originX, y: originY, vx: 0, vy: -PLAYER_BULLET_SPEED },
      { x: originX, y: originY, vx: -Math.sin(PLAYER_SPREAD_ANGLE) * PLAYER_BULLET_SPEED, vy: -Math.cos(PLAYER_SPREAD_ANGLE) * PLAYER_BULLET_SPEED },
      { x: originX, y: originY, vx: Math.sin(PLAYER_SPREAD_ANGLE) * PLAYER_BULLET_SPEED, vy: -Math.cos(PLAYER_SPREAD_ANGLE) * PLAYER_BULLET_SPEED },
    );
  }

  // In CONTROL mode: front-row fighters fire upward too
  if (commandState.ctrlMode === 'control') {
    for (const f of commandState.fighters) {
      if (f.hp > 0 && f.row === 0 && f.state === 'FORMATION') {
        commandState.fighterBullets.push({
          x: f.x,
          y: f.y - FIGHTER_HEIGHT / 2,
          vx: 0,
          vy: -FIGHTER_BULLET_SPEED,
        });
      }
    }
  }

  currentContext.audio?.play?.('shoot');
  commandState.nextPlayerShotAt = now + PLAYER_SHOT_COOLDOWN_MS;
}

function updatePlayerBullets(dt) {
  for (const b of commandState.playerBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  commandState.playerBullets = commandState.playerBullets.filter(
    (b) => b.y + PLAYER_BULLET_HEIGHT / 2 >= 0 && b.x >= -20 && b.x <= (window.innerWidth + 20),
  );
}

// ─── Enemy update ─────────────────────────────────────────────────────────────
function updateEnemyFormation(canvas, now, dt) {
  const canvasWidth = canvas.clientWidth || window.innerWidth;
  const canvasHeight = canvas.clientHeight || window.innerHeight;
  const layout = getFormationLayout(canvas);
  const waveMultiplier = currentContext.waveController.getDriftMultiplier();

  commandState.enemyFormationOffsetX +=
    commandState.enemyFormationDirection * ENEMY_BASE_DRIFT_SPEED * waveMultiplier * dt;

  const leftEdge = layout.startX + commandState.enemyFormationOffsetX - ENEMY_WIDTH / 2;
  const rightEdge = layout.startX + layout.formationWidth + commandState.enemyFormationOffsetX + ENEMY_WIDTH / 2;

  if (leftEdge <= layout.wallPadding) {
    commandState.enemyFormationDirection = 1;
    commandState.enemyFormationOffsetX += layout.wallPadding - leftEdge;
  }
  if (rightEdge >= canvasWidth - layout.wallPadding) {
    commandState.enemyFormationDirection = -1;
    commandState.enemyFormationOffsetX -= rightEdge - (canvasWidth - layout.wallPadding);
  }

  if (now >= commandState.nextDiveAt) {
    const candidates = commandState.enemies.filter((e) => e.state === 'formation');
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      pick.state = 'diving';
      pick.diveTargetX = commandState.x;
    }
    scheduleNextDive(now);
  }

  for (const enemy of commandState.enemies) {
    const home = getEnemyHomePosition(enemy, canvas);
    if (enemy.state === 'formation') {
      enemy.x = home.x;
      enemy.y = home.y;
      continue;
    }
    if (enemy.state === 'diving') {
      const dx = enemy.diveTargetX - enemy.x;
      enemy.x += clamp(dx, -ENEMY_DIVE_SPEED_X * dt, ENEMY_DIVE_SPEED_X * dt);
      enemy.y += ENEMY_DIVE_SPEED_Y * dt;

      const boundaryY = getPlayerBoundaryY(canvasHeight);
      if (enemy.y >= boundaryY) {
        const dyToPlayer = commandState.y - enemy.y;
        enemy.y += clamp(dyToPlayer, -ENEMY_DIVE_TRACK_Y_SPEED * dt, ENEMY_DIVE_TRACK_Y_SPEED * dt);
      }

      if (enemy.y - ENEMY_HEIGHT / 2 > canvasHeight) {
        enemy.state = 'returning';
        enemy.y = -ENEMY_HEIGHT;
      }
      continue;
    }
    if (enemy.state === 'returning') {
      const dx = home.x - enemy.x;
      const dy = home.y - enemy.y;
      enemy.x += clamp(dx, -ENEMY_RETURN_SPEED * dt, ENEMY_RETURN_SPEED * dt);
      enemy.y += clamp(dy, -ENEMY_RETURN_SPEED * dt, ENEMY_RETURN_SPEED * dt);
      if (Math.abs(dx) < ENEMY_RETURN_SPEED && Math.abs(dy) < ENEMY_RETURN_SPEED) {
        enemy.x = home.x;
        enemy.y = home.y;
        enemy.state = 'formation';
      }
    }
  }
}

function updateEnemyBullets(canvas, now, dt) {
  if (now >= commandState.nextEnemyShotAt) {
    if (commandState.enemyBullets.length < ENEMY_MAX_BULLETS) {
      const shooters = commandState.enemies.filter((e) => e.state !== 'returning');
      if (shooters.length > 0) {
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        commandState.enemyBullets.push({
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
  for (const b of commandState.enemyBullets) b.y += b.speedY * dt;
  commandState.enemyBullets = commandState.enemyBullets.filter(
    (b) => b.y - b.height / 2 <= canvasHeight,
  );
}

// ─── Collision resolution ─────────────────────────────────────────────────────
function loseCommandLife() {
  if (!currentContext?.gameState) return;

  if (commandState.shieldActive) {
    commandState.shieldActive = false;
    return;
  }

  currentContext.gameState.lives = Math.max(0, currentContext.gameState.lives - 1);
  commandState.playerFlashFrames = PLAYER_FLASH_FRAMES_ON_HIT;
  currentContext.audio?.play?.('playerHit');
  updateLivesHud();

  if (currentContext.gameState.lives <= 0) {
    syncHudState(performance.now());
    currentContext.hud?.updateHUD?.(currentContext.gameState);
    currentContext.hud?.showGameOver?.({
      mode: currentContext.gameState.mode,
      score: currentContext.gameState.score,
      wave: currentContext.gameState.wave,
    });
    currentContext.gameState.running = false;
  }
}

function resolveCollisions() {
  const { gameState } = currentContext;
  const killedEnemyIds = new Set();
  const usedPlayerBullets = new Set();

  // Player bullets vs enemies
  for (let bi = 0; bi < commandState.playerBullets.length; bi += 1) {
    const b = commandState.playerBullets[bi];
    const bBox = getAabb(b.x, b.y, PLAYER_BULLET_WIDTH, PLAYER_BULLET_HEIGHT);
    for (const enemy of commandState.enemies) {
      if (killedEnemyIds.has(enemy.id)) continue;
      const eBox = getAabb(enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT);
      if (!overlapsAabb(bBox, eBox)) continue;
      usedPlayerBullets.add(bi);
      enemy.hp -= 1;
      if (enemy.hp <= 0) {
        killedEnemyIds.add(enemy.id);
        gameState.score += SCORE_PER_KILL;
        currentContext.audio?.play?.('enemyDeath');
        if (Math.random() < POWERUP_DROP_CHANCE) {
          spawnCommandPowerUp(enemy.x, enemy.y);
        }
      }
      break;
    }
  }

  // Fighter bullets vs enemies
  const usedFighterBullets = new Set();
  for (let bi = 0; bi < commandState.fighterBullets.length; bi += 1) {
    const b = commandState.fighterBullets[bi];
    const bBox = getAabb(b.x, b.y, FIGHTER_BULLET_WIDTH, FIGHTER_BULLET_HEIGHT);
    for (const enemy of commandState.enemies) {
      if (killedEnemyIds.has(enemy.id)) continue;
      const eBox = getAabb(enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT);
      if (!overlapsAabb(bBox, eBox)) continue;
      usedFighterBullets.add(bi);
      enemy.hp -= 1;
      if (enemy.hp <= 0) {
        killedEnemyIds.add(enemy.id);
        gameState.score += SCORE_PER_KILL;
        currentContext.audio?.play?.('enemyDeath');
        if (Math.random() < POWERUP_DROP_CHANCE) {
          spawnCommandPowerUp(enemy.x, enemy.y);
        }
      }
      break;
    }
  }

  commandState.playerBullets = commandState.playerBullets.filter((_, i) => !usedPlayerBullets.has(i));
  commandState.fighterBullets = commandState.fighterBullets.filter((_, i) => !usedFighterBullets.has(i));
  if (killedEnemyIds.size > 0) {
    commandState.enemies = commandState.enemies.filter((e) => !killedEnemyIds.has(e.id));
  }

  // Enemy bullets vs fighters (shield-wall absorbs) and mothership
  const motherBox = getCircleAabb(commandState.x, commandState.y, SHIP_RADIUS);
  const remainingEnemyBullets = [];

  for (const b of commandState.enemyBullets) {
    const bBox = getAabb(b.x, b.y, b.width, b.height);
    let absorbed = false;

    for (const f of commandState.fighters) {
      if (!f || f.hp <= 0) continue;
      const fBox = getAabb(f.x, f.y, FIGHTER_WIDTH, FIGHTER_HEIGHT);
      if (overlapsAabb(bBox, fBox)) {
        killFighterByHit(f);
        absorbed = true;
        break;
      }
    }

    if (!absorbed && overlapsAabb(bBox, motherBox)) {
      loseCommandLife();
      absorbed = true;
    }

    if (!absorbed) remainingEnemyBullets.push(b);
  }

  commandState.enemyBullets = remainingEnemyBullets;

  // Enemy body vs mothership
  const collidedIds = new Set();
  for (const enemy of commandState.enemies) {
    const eBox = getAabb(enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT);
    if (overlapsAabb(eBox, motherBox)) {
      collidedIds.add(enemy.id);
      loseCommandLife();
    }
  }
  if (collidedIds.size > 0) {
    commandState.enemies = commandState.enemies.filter((e) => !collidedIds.has(e.id));
  }
}

// ─── Rendering ────────────────────────────────────────────────────────────────
function renderCommand(ctx) {
  const { drawTriangle, drawCircle, drawBullet } = currentContext;
  const width = ctx.canvas.clientWidth || window.innerWidth;
  const height = ctx.canvas.clientHeight || window.innerHeight;
  const boundaryY = getPlayerBoundaryY(height);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  drawStarfield(ctx);

  // Boundary line
  ctx.beginPath();
  ctx.moveTo(0, boundaryY);
  ctx.lineTo(width, boundaryY);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.lineWidth = 1;

  // Mothership
  const previousLineWidth = ctx.lineWidth;
  ctx.lineWidth = SHIP_STROKE_WIDTH;
  const shipColor = commandState.playerFlashFrames > 0 ? '#ffffff' : SHIP_COLOR;
  drawCircle(ctx, commandState.x, commandState.y, SHIP_RADIUS, shipColor, SHIP_GLOW);
  ctx.lineWidth = previousLineWidth;

  // Fleet HP bar above mothership
  const aliveCount = commandState.fighters.filter((f) => f.hp > 0).length;
  const barRatio = commandState.fleetMaxCount > 0 ? aliveCount / commandState.fleetMaxCount : 0;
  const barX = commandState.x - FLEET_BAR_WIDTH / 2;
  const barY = commandState.y - SHIP_RADIUS - 10;
  ctx.fillStyle = 'rgba(0,255,136,0.2)';
  ctx.fillRect(barX, barY, FLEET_BAR_WIDTH, FLEET_BAR_HEIGHT);
  ctx.fillStyle = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 6;
  ctx.fillRect(barX, barY, FLEET_BAR_WIDTH * barRatio, FLEET_BAR_HEIGHT);
  ctx.shadowBlur = 0;

  // Fighters
  for (const f of commandState.fighters) {
    if (f.hp <= 0) continue;
    ctx.save();
    ctx.globalAlpha = 0.7;
    drawTriangle(ctx, f.x, f.y, FIGHTER_WIDTH, FIGHTER_HEIGHT, 'up', FIGHTER_COLOR, FIGHTER_GLOW);
    ctx.restore();
  }

  // Player bullets
  for (const b of commandState.playerBullets) {
    drawBullet(ctx, b.x, b.y, PLAYER_BULLET_WIDTH, PLAYER_BULLET_HEIGHT, SHIP_COLOR, 10);
  }

  // Fighter bullets
  for (const b of commandState.fighterBullets) {
    drawBullet(ctx, b.x, b.y, FIGHTER_BULLET_WIDTH, FIGHTER_BULLET_HEIGHT, FIGHTER_COLOR, 8);
  }

  // Enemies
  for (const enemy of commandState.enemies) {
    drawTriangle(ctx, enemy.x, enemy.y, ENEMY_WIDTH, ENEMY_HEIGHT, 'down', ENEMY_COLOR, ENEMY_GLOW);
  }

  for (const b of commandState.enemyBullets) {
    drawBullet(ctx, b.x, b.y, b.width, b.height, ENEMY_COLOR, 8);
  }

  // Powerups
  for (const pu of commandState.powerUps) {
    drawCircle(ctx, pu.x, pu.y, pu.radius, pu.color, 14);
  }

  // Boss
  if (commandState.boss && commandState.boss.hp > 0) {
    const boss = commandState.boss;
    const pulseGlow = Math.sin(Date.now() * 0.004) * 12 + 22;
    const bossColor = boss.flashFrames > 0 ? '#ffffff' : BOSS_COLOR;
    const prevLW = ctx.lineWidth;
    ctx.lineWidth = BOSS_STROKE_WIDTH;
    drawTriangle(ctx, boss.x, boss.y, BOSS_WIDTH, BOSS_HEIGHT, 'down', bossColor, pulseGlow);
    ctx.lineWidth = prevLW;
    if (boss.flashFrames > 0) boss.flashFrames -= 1;
  }

  for (const b of commandState.bossBullets) {
    drawBullet(ctx, b.x, b.y, BOSS_BULLET_WIDTH, BOSS_BULLET_HEIGHT, BOSS_COLOR, 10);
  }

  // Shield ring
  if (commandState.shieldActive) {
    ctx.beginPath();
    ctx.arc(commandState.x, commandState.y, SHIP_RADIUS + 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 238, 255, 0.22)';
    ctx.shadowColor = '#00eeff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
  }

  // Active powerup label
  const pnow = performance.now();
  if (commandState.activePowerupLabel && pnow < commandState.activePowerupLabelUntil) {
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText(commandState.activePowerupLabel, commandState.x, commandState.y - SHIP_RADIUS - 16);
    ctx.textAlign = 'start';
  } else {
    commandState.activePowerupLabel = null;
  }
}

// ─── Game loop ────────────────────────────────────────────────────────────────
function gameLoop() {
  if (
    !currentContext ||
    !currentContext.gameState.running ||
    currentContext.gameState.mode !== 'command'
  ) {
    return;
  }

  const now = performance.now();
  const dt = Math.max(0.5, Math.min(2.5, lastFrameTime > 0 ? (now - lastFrameTime) / 16.67 : 1));
  lastFrameTime = now;

  if (!currentContext.gameState.paused) {
    const waveEvent = currentContext.waveController.update(now);
    if (waveEvent.action === 'spawn-boss') {
      spawnBoss(currentContext.canvas);
    } else if (waveEvent.action === 'spawn-formation') {
      spawnFormationForWave();
    }

    if (currentContext.waveController.isCombatPhase()) {
      updatePlayer(currentContext.canvas, dt, now);
      updatePlayerShooting(now);
      updatePlayerBullets(dt);
      updateFighters(currentContext.canvas, now, dt);

      if (commandState.bossPhase) {
        updateBoss(currentContext.canvas, now, dt);
        updateBossBullets(currentContext.canvas, dt);
        resolveBossCollisions();
      } else {
        updateEnemyFormation(currentContext.canvas, now, dt);
        updateEnemyBullets(currentContext.canvas, now, dt);
        resolveCollisions();
      }

      updatePowerups(currentContext.canvas, now, dt);
      checkWaveTransition(now);
    }

    touchControls?.update?.();

    // Keep tactical panel status line fresh
    if (commandState.ctrlMode === 'command') {
      updateTacticalPanelButtons();
    }

    syncHudState(now);
    currentContext.hud?.updateHUD?.(currentContext.gameState);

    renderCommand(currentContext.ctx);

    if (commandState.playerFlashFrames > 0) {
      commandState.playerFlashFrames -= 1;
    }
  }

  animationFrameId = window.requestAnimationFrame(gameLoop);
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────
export function startCommand(context = currentContext) {
  if (!context?.canvas) return;

  stopCommand();

  const canvas = context.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  currentContext = { ...context, ctx, loseLife: loseCommandLife };
  syncCanvasResolution(canvas, ctx);

  const fighters = initializeFighters();
  const cx = (canvas.clientWidth || window.innerWidth) / 2;
  const cy = (canvas.clientHeight || window.innerHeight) - 82;

  // Snap fighters to initial formation positions
  const counts = getRowCounts(STARTING_FLEET_COUNT);
  let idx = 0;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < counts[row]; col += 1) {
      const f = fighters[idx];
      if (!f) break;
      const spacing = 24;
      const totalWidth = Math.max(0, (counts[row] - 1)) * spacing;
      const dx = -totalWidth / 2 + col * spacing;
      f.x = cx + dx;
      f.y = cy + (FLEET_ROW_Y[row] || 0);
      idx += 1;
    }
  }

  commandState = {
    x: cx,
    y: cy,
    velocityX: 0,
    velocityY: 0,
    fighters,
    fighterBullets: [],
    fleetCount: STARTING_FLEET_COUNT,
    fleetMaxCount: STARTING_FLEET_COUNT,
    ctrlMode: 'control',
    activeOrder: null,
    hoverOffset: 0,
    hoverDirection: 1,
    playerBullets: [],
    nextPlayerShotAt: 0,
    playerFlashFrames: 0,
    shieldActive: false,
    multiShotUntil: 0,
    activePowerupLabel: null,
    activePowerupLabelUntil: 0,
    powerUps: [],
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
      left: false, right: false, up: false, down: false, fire: false, axisX: 0, axisY: 0,
    },
  };

  for (const enemy of commandState.enemies) {
    const home = getEnemyHomePosition(enemy, canvas);
    enemy.x = home.x;
    enemy.y = home.y;
  }

  const now = performance.now();
  scheduleNextDive(now);
  scheduleNextEnemyShot(now);

  currentContext.gameState.mode = 'command';
  currentContext.gameState.score = 0;
  currentContext.gameState.wave = 1;
  currentContext.gameState.running = true;
  currentContext.gameState.paused = false;
  currentContext.gameState.lives = 3;
  syncHudState(performance.now());
  currentContext.hud?.showHUD?.();
  currentContext.hud?.updateHUD?.(currentContext.gameState);
  lastFrameTime = 0;

  setupTouchControls();
  createModeToggleButtons();
  createTacticalPanel();
  updateModeToggleButtons();

  updateLivesHud();

  resizeHandler = () => {
    const prevWidth = canvas.clientWidth || window.innerWidth;
    const prevHeight = canvas.clientHeight || window.innerHeight;
    syncCanvasResolution(canvas, ctx);
    const nextWidth = canvas.clientWidth || window.innerWidth;
    const nextHeight = canvas.clientHeight || window.innerHeight;
    const sx = prevWidth > 0 ? nextWidth / prevWidth : 1;
    const sy = prevHeight > 0 ? nextHeight / prevHeight : 1;

    commandState.x *= sx;
    commandState.y *= sy;

    for (const f of commandState.fighters) {
      f.x *= sx;
      f.y *= sy;
    }

    for (const enemy of commandState.enemies) {
      enemy.x *= sx;
      enemy.y *= sy;
      enemy.diveTargetX *= sx;
    }

    for (const bullet of commandState.playerBullets) {
      bullet.x *= sx;
      bullet.y *= sy;
    }

    for (const bullet of commandState.fighterBullets) {
      bullet.x *= sx;
      bullet.y *= sy;
    }

    for (const bullet of commandState.enemyBullets) {
      bullet.x *= sx;
      bullet.y *= sy;
    }

    for (const bullet of commandState.bossBullets) {
      bullet.x *= sx;
      bullet.y *= sy;
    }

    for (const powerUp of commandState.powerUps) {
      powerUp.x *= sx;
      powerUp.y *= sy;
    }

    if (commandState.boss) {
      commandState.boss.x *= sx;
      commandState.boss.y *= sy;
    }

    const minX = SHIP_RADIUS;
    const boundaryY = getPlayerBoundaryY(canvas.clientHeight || window.innerHeight);
    const maxX = (canvas.clientWidth || window.innerWidth) - SHIP_RADIUS;
    const minY = boundaryY + SHIP_RADIUS;
    const maxY = (canvas.clientHeight || window.innerHeight) - SHIP_RADIUS;
    commandState.x = clamp(commandState.x, minX, maxX);
    commandState.y = clamp(commandState.y, minY, maxY);
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
            stopCommand();
            currentContext.hud?.showMainMenu?.(currentContext.startMode, currentContext.audio);
          },
        });
      } else {
        currentContext.hud?.hidePauseMenu?.();
      }
      return;
    }

    if (event.code === 'Space') event.preventDefault();
    handleKeyChange(event, true);
  };
  keyupHandler = (event) => handleKeyChange(event, false);

  window.addEventListener('resize', resizeHandler);
  window.addEventListener('keydown', keydownHandler);
  window.addEventListener('keyup', keyupHandler);

  animationFrameId = window.requestAnimationFrame(gameLoop);
}

export function stopCommand() {
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

  commandState.input.left = false;
  commandState.input.right = false;
  commandState.input.up = false;
  commandState.input.down = false;
  commandState.input.fire = false;
  commandState.input.axisX = 0;
  commandState.input.axisY = 0;
  commandState.velocityX = 0;
  commandState.velocityY = 0;

  removeLivesHud();
  removeBossHpHud();
  currentContext?.hud?.hidePauseMenu?.();
  removeTouchControls();
  removeModeToggleButtons();
  removeTacticalPanel();

  if (currentContext?.gameState?.mode === 'command') {
    currentContext.gameState.running = false;
  }
}

export const commandMode = {
  id: 'command',
  start(context) {
    startCommand(context);
  },
  stop() {
    stopCommand();
  },
};
