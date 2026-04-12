import { drawStarfield } from '../starfield.js';

const PLANET_MAX_HP = 7500;
const PLANET_LAST_STAND_HP = 200;
const PLANET_SHATTER_MS = 500;
const PLANET_IMMUNITY_MS = 3000;
const PLANET_CORE_CHARGE_MS = 2500;
const FINAL_ASSAULT_TROOPS = 25;
const FINAL_ASSAULT_BOSS_HP = 25;
const FINAL_ASSAULT_BOSS_FIRE_MS = 1500;
const FINAL_ASSAULT_TROOP_STAGGER_MS = 50;
const PLAYER_HP_MAX = 80;
const AI_HP_MAX = 50;
const PLAYER_RADIUS = 32;
const AI_RADIUS = 20;
const PLAYER_SPEED = 4.6;
const PLAYER_ACCEL = 0.9;
const PLAYER_DECEL = 0.88;
const PLAYER_BULLET_SPEED = 10;
const PLAYER_SHOT_COOLDOWN_MS = 170;
const PLAYER_BULLET_W = 3;
const PLAYER_BULLET_H = 12;
const CHARGE_TIME_MS = 1500;
const CHARGED_BULLET_SPEED = 12;
const CHARGED_BULLET_W = 6;
const CHARGED_BULLET_H = 20;

const GREEN_FIGHTER_W = 14;
const GREEN_FIGHTER_H = 18;
const GREEN_FIGHTER_SPEED = 2.6;
const GREEN_FIGHTER_FIRE_MS = 500;
const GREEN_FIGHTER_BULLET_SPEED = 8;
const GREEN_FIGHTER_BULLET_W = 2;
const GREEN_FIGHTER_BULLET_H = 8;
const FIGHTER_SEPARATION = 18;
const MAX_BOSS_LOCKS = 5;

const RED_FIGHTER_W = 16;
const RED_FIGHTER_H = 18;
const RED_FIGHTER_SPEED = 2.2;
const RED_FIGHTER_BULLET_SPEED = 6.2;
const RED_FIGHTER_BULLET_W = 2;
const RED_FIGHTER_BULLET_H = 9;
const RED_FIGHTER_SHOT_MIN_MS = 1200;
const RED_FIGHTER_SHOT_MAX_MS = 2400;
const RED_FIGHTER_ATTACK_RANGE = 340;

const FIGHTER_DEFAULT_HP = 2;
const RED_DEFAULT_HP = 3;
const BROADCAST_DURATION_MS = 8000;
const KAMIKAZE_COOLDOWN_MS = 20000;
const BOMB_DAMAGE_HIT = 50;
const BOMB_DAMAGE_DOT = 0.5;
const BOMB_FALL_SPEED = 3;
const BOMB_MIN_MS = 750;
const BOMB_MAX_MS = 1500;

const BOSS_W = 68;
const BOSS_H = 75;
const BOSS_HP = 34;
const BOSS_BULLET_SPEED = 5.8;
const BOSS_BULLET_W = 3;
const BOSS_BULLET_H = 11;
const BOSS_FIRE_MIN_MS = 1300;
const BOSS_FIRE_MAX_MS = 2200;
const BOSS_BREAKOUT_SPEED = 0.95;

const MAX_GREEN_BULLETS_DESKTOP = 60;
const MAX_RED_BULLETS_DESKTOP = 28;
const MAX_GREEN_BULLETS_MOBILE = 48;
const MAX_RED_BULLETS_MOBILE = 24;

const RED_TOTAL_TARGET = 300;
const RED_ONSCREEN_TARGET_DESKTOP = 75;
const RED_DEFENDER_TARGET_DESKTOP = 45;
const RED_DIVER_TARGET_DESKTOP = 30;
const RED_ONSCREEN_TARGET_MOBILE = 50;
const RED_DEFENDER_TARGET_MOBILE = 30;
const RED_DIVER_TARGET_MOBILE = 20;

const AI_ONSCREEN_PER_SHIP_DESKTOP = 10;
const AI_ONSCREEN_PER_SHIP_MOBILE = 8;
const AI_TOTAL_PER_SHIP = 30;
const PLAYER_FLEET_MAX = 50;
const INVADE_COOLDOWN_MS = 20000;
const INVADE_PAUSE_MS = 300;
const INVADE_PLANET_DAMAGE = 100;
const PLANET_BULLET_DAMAGE = 0.5;

const SCORE_RED_KILL = 150;
const SCORE_BOSS_KILL = 8000;
const SCORE_PLANET_TICK = 1;
const SCORE_INVADE_SUCCESS = 500;
const SCORE_BONUS_ALL_MOTHERSHIPS = 15000;
const SCORE_BONUS_AI_ALIVE = 3000;
const SCORE_BONUS_PLANET_DESTROYED = 10000;
const INVASION_DROP_RATE_SCALE = 1 / 3;

const INVASION_SCORE_KEY = 'inversia_invasion_scores';
const INVASION_SKIPSCENE_KEY = 'inversia_invasion_skip_scene';
const OUTCOME_CAPTURE = 'capture';
const OUTCOME_BONUS = 'bonus_destroy';
const OUTCOME_LAST_STAND = 'last_stand';
const OUTCOME_FAILED = 'failed';

const PLANET_NAMES = [
  'VERAK IV', 'SOLENNE', 'DUSK PRIME', 'ORRYN', 'CAELUM-7', 'THRESH',
  'MYRIAD', 'VANTA DEEP', 'AERIS MINOR', 'KORRATH', 'PALE ZENITH',
  'NULLPOINT', 'EREVON', 'SABLE RING', "TITAN'S WAKE", 'CERYN',
  'DREADHOLM', 'IXARATH', 'THE FOLD', 'UMBRIEL STATION',
  'GREY HAVEN', 'SECTOR NINE', 'VOSS', 'MERIDIAN DARK', 'ASHFALL',
];

const AI_CALLSIGNS = ['ALPHA', 'BETA', 'DELTA', 'OMEGA'];
const AI_COMPLIANCE = {
  ALPHA: 0.85,
  BETA: 0.7,
  DELTA: 0.9,
  OMEGA: 0.6,
};

let currentContext = null;
let animationFrameId = null;
let resizeHandler = null;
let keydownHandler = null;
let keyupHandler = null;
let lastFrameTime = 0;
let commandModuleEl = null;
let statusNoticeEl = null;
let battleOverlayEl = null;
let commsOverlayEl = null;
let backspaceUi = null;
let modeButtonsEl = null;
let phaseBannerEl = null;
let preBattleUi = null;
let nextGreenFighterId = 1;

const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

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

function showCenterNotice(lines, durationMs = 2400) {
  if (!state) return;
  state.centerNotice = {
    lines,
    startedAt: nowMs(),
    until: nowMs() + durationMs,
    fadeInMs: 300,
    fadeOutMs: 300,
  };
}

function playPlanetCrackSound() {
  const ctx = currentContext?.audio?.audioContext;
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1300, t);
  osc.frequency.exponentialRampToValueAtTime(280, t + 0.18);
  gain.gain.setValueAtTime(0.95, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playPlanetThudSound() {
  const ctx = currentContext?.audio?.audioContext;
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(70, t);
  osc.frequency.exponentialRampToValueAtTime(35, t + 0.32);
  gain.gain.setValueAtTime(0.65, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

function playPlanetAnnihilationSound() {
  const ctx = currentContext?.audio?.audioContext;
  if (!ctx) return;
  const t = ctx.currentTime;

  const low = ctx.createOscillator();
  const lowGain = ctx.createGain();
  low.type = 'sine';
  low.frequency.setValueAtTime(60, t);
  low.frequency.exponentialRampToValueAtTime(30, t + 1.2);
  lowGain.gain.setValueAtTime(0.95, t);
  lowGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  low.connect(lowGain);
  lowGain.connect(ctx.destination);
  low.start(t);
  low.stop(t + 1.2);

  const high = ctx.createOscillator();
  const highGain = ctx.createGain();
  high.type = 'sine';
  high.frequency.setValueAtTime(1200, t);
  high.frequency.exponentialRampToValueAtTime(240, t + 1.0);
  highGain.gain.setValueAtTime(0.28, t);
  highGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
  high.connect(highGain);
  highGain.connect(ctx.destination);
  high.start(t);
  high.stop(t + 1.0);
}

function isLastStandKamikazeDisabled() {
  if (!state?.planetState) return false;
  const phase = state.planetState.phase;
  return phase === 'shatter' || phase === 'immunity' || phase === 'last-stand' || phase === 'final-assault' || phase === 'destroyed-sequence';
}

function spawnFinalAssaultTroop(now) {
  const spread = randomInRange(-20, 20);
  const fighter = makeGreenFighter('player', 'YOU', state.player.x + spread, state.player.y + randomInRange(-8, 8));
  fighter.hp = 1;
  fighter.maxHp = 1;
  fighter.order = 'ATTACK';
  fighter.finalAssaultTroop = true;
  fighter.warpInUntil = now + 450;
  state.playerFleet.push(fighter);
}

function deployFinalAssaultBosses(now) {
  state.bosses = [];
  state.bossesKilled = 0;
  state.bossBreakoutActive = false;
  const slotWidth = state.zones.width / 5;
  const arcY = state.zones.planetArcY + (state.zones.planetArcWidth * 0.32);
  for (let index = 0; index < 5; index += 1) {
    const boss = makeBoss();
    boss.hp = FINAL_ASSAULT_BOSS_HP;
    boss.maxHp = FINAL_ASSAULT_BOSS_HP;
    boss.x = slotWidth * index + (slotWidth / 2);
    boss.y = arcY + randomInRange(-4, 4);
    boss.targetY = state.zones.redTop + 28 + (index % 2) * 22;
    boss.entered = false;
    boss.fireInterval = FINAL_ASSAULT_BOSS_FIRE_MS;
    boss.fireTimer = randomInRange(0, 500);
    state.bosses.push(boss);
  }
  currentContext.audio?.play?.('bossArrival');
}

function beginPlanetDestroyedSequence(now) {
  if (!state || state.planetDestroyedSequence) return;
  if (!state.totalAnnihilationBonusApplied) {
    state.score += SCORE_BONUS_PLANET_DESTROYED;
    state.totalAnnihilationBonusApplied = true;
  }

  const centerX = state.zones.width / 2;
  const centerY = state.zones.planetArcY + (state.zones.planetArcWidth * 0.32);
  const segments = [];
  for (let i = 0; i < 5; i += 1) {
    segments.push({
      angleStart: Math.PI * (1.15 + i * 0.14),
      angleEnd: Math.PI * (1.23 + i * 0.14),
      vx: randomInRange(-0.4, 0.4),
      vy: randomInRange(-0.2, 0.35),
      ox: 0,
      oy: 0,
    });
  }

  state.planetState.phase = 'destroyed-sequence';
  state.mode = 'planet-destroyed-sequence';
  state.redFighters = [];
  state.redBullets = [];
  state.bombs = [];
  state.planetDestroyedSequence = {
    phase: 'arc-collapse',
    phaseStartedAt: now,
    centerX,
    centerY,
    segments,
    blackoutAlpha: 0,
    endSceneShown: false,
  };
  playPlanetAnnihilationSound();
}

function triggerFinalAssault(now) {
  if (!state || state.finalAssault.active) return;
  state.planetState.phase = 'final-assault';
  state.planetState.lastStandHp = 0;
  state.finalAssault = {
    active: true,
    triggeredAt: now,
    troopStartAt: now + 500,
    bossesStartAt: now + 1500,
    nextTroopSpawnAt: now + 500,
    troopsSpawned: 0,
    troopsLost: 0,
    bossesSpawned: false,
    bossesKilled: 0,
    deployNoticeShown: false,
    bossNoticeShown: false,
  };
  state.redFighters = [];
  state.redBullets = [];
  playPlanetThudSound();
  showCenterNotice([
    { text: 'FINAL ASSAULT', size: 10, color: 'rgba(0,255,136,0.5)' },
    { text: '25 TROOPS DEPLOYED', size: 20, color: '#00ff88', bold: true },
    { text: '1 HP · NO RETREAT', size: 10, color: 'rgba(0,255,136,0.3)' },
  ], 2000);
}

function triggerPlanetShatter(now) {
  if (!state || state.planetState.phase !== 'normal') return;
  state.planetHp = 0;
  state.planetState.phase = 'shatter';
  state.planetState.phaseStartedAt = now;
  state.planetState.immunityUntil = now + PLANET_SHATTER_MS + PLANET_IMMUNITY_MS;
  state.planetState.coreChargeStartedAt = now + PLANET_SHATTER_MS + 500;
  state.planetState.coreChargeUntil = state.planetState.immunityUntil;
  state.planetState.hardFlashUntil = now + 120;
  state.planetState.shatterToggleUntil = now + PLANET_SHATTER_MS;
  playPlanetCrackSound();
  showCenterNotice([
    { text: 'PLANET CORE CRITICAL', size: 10, color: 'rgba(255,80,60,0.5)' },
    { text: 'LAST STAND ACTIVATED', size: 22, color: '#ff3322', bold: true },
    { text: '200 HP REMAINING', size: 10, color: 'rgba(255,80,60,0.4)' },
  ], 2400);
}

function applyPlanetDamage(amount) {
  if (!state || amount <= 0) return false;
  const now = nowMs();
  const phase = state.planetState.phase;
  if (phase === 'shatter' || phase === 'immunity') {
    return false;
  }

  if (phase === 'last-stand' || phase === 'final-assault') {
    state.planetState.lastStandHp = Math.max(0, state.planetState.lastStandHp - amount);
    if (state.planetState.lastStandHp <= 0 && phase !== 'final-assault') {
      triggerFinalAssault(now);
    }
    return true;
  }

  state.planetHp = Math.max(0, state.planetHp - amount);
  if (state.planetHp <= 0) {
    triggerPlanetShatter(now);
  }
  return true;
}

function updatePlanetPhases(now) {
  if (!state) return;
  const ps = state.planetState;

  if (ps.phase === 'shatter' && now >= ps.phaseStartedAt + PLANET_SHATTER_MS) {
    ps.phase = 'immunity';
    ps.phaseStartedAt = now;
  }

  if (ps.phase === 'immunity' && now >= ps.immunityUntil) {
    ps.phase = 'last-stand';
    ps.phaseStartedAt = now;
    ps.lastStandHp = PLANET_LAST_STAND_HP;
  }

  if (state.finalAssault.active) {
    if (now >= state.finalAssault.nextTroopSpawnAt && state.finalAssault.troopsSpawned < FINAL_ASSAULT_TROOPS) {
      spawnFinalAssaultTroop(now);
      state.finalAssault.troopsSpawned += 1;
      state.finalAssault.nextTroopSpawnAt += FINAL_ASSAULT_TROOP_STAGGER_MS;
    }

    if (now >= state.finalAssault.bossesStartAt && !state.finalAssault.bossesSpawned) {
      deployFinalAssaultBosses(now);
      state.finalAssault.bossesSpawned = true;
      showCenterNotice([
        { text: 'COMMAND UNITS ACTIVE', size: 10, color: 'rgba(255,80,60,0.5)' },
        { text: '5 BOSSES INCOMING', size: 20, color: '#ff3322', bold: true },
      ], 2000);
    }

    if (state.finalAssault.bossesKilled >= 5 && state.planetState.lastStandHp <= 0) {
      beginPlanetDestroyedSequence(now);
    }
  }

  if (state.mode === 'planet-destroyed-sequence' && state.planetDestroyedSequence) {
    const seq = state.planetDestroyedSequence;
    if (seq.phase === 'arc-collapse') {
      const dt = (now - seq.phaseStartedAt) / 16.67;
      for (const segment of seq.segments) {
        segment.ox += segment.vx * dt;
        segment.oy += segment.vy * dt;
      }
      if (now - seq.phaseStartedAt >= 1000) {
        seq.phase = 'explosion';
        seq.phaseStartedAt = now;
      }
    } else if (seq.phase === 'explosion') {
      if (now - seq.phaseStartedAt >= 500) {
        seq.phase = 'blackout';
        seq.phaseStartedAt = now;
      }
    } else if (seq.phase === 'blackout') {
      seq.blackoutAlpha = clamp((now - seq.phaseStartedAt) / 800, 0, 1);
      if (seq.blackoutAlpha >= 1) {
        seq.phase = 'end-scene';
        seq.phaseStartedAt = now;
      }
    } else if (seq.phase === 'end-scene' && !seq.endSceneShown) {
      showPlanetDestroyedEndScene();
      seq.endSceneShown = true;
    }
  }
}

function syncCanvasResolution(canvas, ctx) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function getBounds(canvas) {
  return {
    width: canvas.clientWidth || window.innerWidth,
    height: canvas.clientHeight || window.innerHeight,
  };
}

function createStarfieldBuffer(width, height) {
  const offscreen = document.createElement('canvas');
  offscreen.width = Math.max(1, Math.floor(width));
  offscreen.height = Math.max(1, Math.floor(height));
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) {
    return null;
  }
  offCtx.fillStyle = '#000';
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
  for (let i = 0; i < (isTouchDevice ? 90 : 150); i += 1) {
    const x = Math.random() * offscreen.width;
    const y = Math.random() * offscreen.height;
    const r = randomInRange(0.4, 1.2);
    const a = randomInRange(0.06, 0.2);
    offCtx.beginPath();
    offCtx.arc(x, y, r, 0, Math.PI * 2);
    offCtx.fillStyle = `rgba(255,255,255,${a})`;
    offCtx.fill();
  }
  return offscreen;
}

function makePlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    hp: PLAYER_HP_MAX,
    dead: false,
    nextShotAt: 0,
    chargeStartAt: 0,
    charging: false,
    flashFrames: 0,
  };
}

function makeAiMothership(callsign, x, y) {
  return {
    callsign,
    x,
    y,
    hp: AI_HP_MAX,
    dead: false,
    compliance: AI_COMPLIANCE[callsign] ?? 0.75,
    order: 'FORMATION',
    nextShotAt: 0,
    reserve: AI_TOTAL_PER_SHIP,
    onScreenMax: isTouchDevice ? AI_ONSCREEN_PER_SHIP_MOBILE : AI_ONSCREEN_PER_SHIP_DESKTOP,
    nextRespawnAt: 0,
    nextDecisionAt: nowMs() + randomInRange(1000, 2200),
  };
}

function makeGreenFighter(ownerType, ownerId, x, y) {
  return {
    id: `gf-${nextGreenFighterId += 1}`,
    ownerType,
    ownerId,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: FIGHTER_DEFAULT_HP,
    maxHp: FIGHTER_DEFAULT_HP,
    dead: false,
    state: 'FORMATION',
    order: 'FORMATION',
    invader: false,
    invadePhase: 'none',
    invadePauseUntil: 0,
    targetX: x,
    targetY: y,
    nextShotAt: 0,
    evadeUntil: 0,
    scatterSeed: Math.random() * Math.PI * 2,
    targetBossId: null,
    armorBroken: false,
    bomber: false,
    bomberAssigned: false,
    bomberPhaseOffset: Math.random() * Math.PI * 2,
    bomberNextDropAt: 0,
    bomberDropInterval: randomInRange(BOMB_MIN_MS, BOMB_MAX_MS),
    bomberPermanentOneHp: false,
    attackDamageMultiplier: 1,
    preBroadcastOrder: null,
    broadcastLocked: false,
    shieldMode: false,
    kamikazeMode: false,
  };
}

function makeRedFighter(type, x, y) {
  return {
    type,
    x,
    y,
    vx: randomInRange(-0.5, 0.5),
    vy: type === 'diver' ? 1.4 : 0.3,
    hp: RED_DEFAULT_HP,
    maxHp: RED_DEFAULT_HP,
    dead: false,
    phase: 'hold',
    nextShotAt: nowMs() + randomInRange(RED_FIGHTER_SHOT_MIN_MS, RED_FIGHTER_SHOT_MAX_MS),
    nextDecisionAt: 0,
    driftSeed: Math.random() * Math.PI * 2,
    anchorX: x,
    anchorY: y,
    targetBiasX: randomInRange(-110, 110),
  };
}

function makeBoss() {
  const fireInterval = randomInRange(BOSS_FIRE_MIN_MS, BOSS_FIRE_MAX_MS);
  return {
    id: `ib-${Math.floor(nowMs())}-${Math.floor(Math.random() * 100000)}`,
    active: true,
    x: 0,
    y: 0,
    hp: BOSS_HP,
    maxHp: BOSS_HP,
    dead: false,
    lockedBy: [],
    fireInterval,
    fireTimer: randomInRange(0, fireInterval),
    entered: false,
    targetY: 0,
    patrolOffset: randomInRange(0, Math.PI * 2),
    breakout: false,
    flashFrames: 0,
  };
}

function makeBullet(side, x, y, vx, vy, width, height, damage, meta = null) {
  return {
    side,
    x,
    y,
    vx,
    vy,
    width,
    height,
    damage,
    dead: false,
    meta,
  };
}

function makeShockwave(x, y, maxRadius = 60, lifeMs = 380) {
  return {
    x,
    y,
    radius: 1,
    maxRadius,
    until: nowMs() + lifeMs,
  };
}

function makePlanetBlast(x, y) {
  return {
    x,
    y,
    radius: 1,
    maxRadius: 20,
    until: nowMs() + 300,
  };
}

function makeBomb(x, y) {
  return {
    x,
    y,
    vy: BOMB_FALL_SPEED,
    radius: 4,
    dead: false,
  };
}

function makeFlashRing(x, y, maxRadius, growMs, fadeMs) {
  return {
    x,
    y,
    radius: 0,
    maxRadius,
    growUntil: nowMs() + growMs,
    until: nowMs() + growMs + fadeMs,
  };
}

function clearPreBattleUi() {
  if (preBattleUi?.root?.parentElement) {
    preBattleUi.root.parentElement.removeChild(preBattleUi.root);
  }
  preBattleUi = null;
}

function createPreBattleUi() {
  clearPreBattleUi();

  const root = document.createElement('div');
  root.style.cssText = [
    'position:absolute',
    'inset:0',
    'z-index:40',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:22px',
    'pointer-events:none',
    'font-family:"Courier New", monospace',
  ].join(';');

  const planetName = document.createElement('div');
  planetName.textContent = state.seedPlanet;
  planetName.style.cssText = 'opacity:0;font-size:11px;letter-spacing:0.3em;color:rgba(255,255,255,0.18);text-transform:uppercase;transition:opacity 600ms ease;';

  const cmd = document.createElement('div');
  cmd.textContent = 'GIVE THE COMMAND';
  cmd.style.cssText = 'opacity:0;font-size:13px;letter-spacing:0.25em;color:rgba(255,255,255,0.28);font-weight:400;transition:opacity 500ms ease;margin-bottom:28px;';

  const invade = document.createElement('button');
  invade.type = 'button';
  invade.textContent = 'INVADE';
  invade.style.cssText = [
    'opacity:0',
    'width:220px',
    'height:64px',
    'border-radius:14px',
    'background:rgba(255,255,255,0)',
    'border:0.5px solid rgba(255,255,255,0.22)',
    'font-size:18px',
    'letter-spacing:0.25em',
    'color:rgba(255,255,255,0.85)',
    'font-family:"Courier New", monospace',
    'font-weight:400',
    'cursor:pointer',
    'pointer-events:auto',
    'transition:opacity 500ms ease, border-color 140ms ease',
  ].join(';');
  invade.addEventListener('mouseenter', () => {
    invade.style.borderColor = 'rgba(255,255,255,0.45)';
  });
  invade.addEventListener('mouseleave', () => {
    invade.style.borderColor = 'rgba(255,255,255,0.22)';
  });

  const back = document.createElement('div');
  back.textContent = 'go back';
  back.style.cssText = 'opacity:0;margin-top:28px;font-size:10px;letter-spacing:0.15em;color:rgba(255,255,255,0.15);cursor:pointer;pointer-events:auto;transition:opacity 800ms ease,color 120ms ease;';
  back.addEventListener('mouseenter', () => {
    back.style.color = 'rgba(255,255,255,0.3)';
  });
  back.addEventListener('mouseleave', () => {
    back.style.color = 'rgba(255,255,255,0.15)';
  });

  const canSkipScene = localStorage.getItem(INVASION_SKIPSCENE_KEY) === 'true';
  let skip = null;
  if (canSkipScene) {
    skip = document.createElement('button');
    skip.type = 'button';
    skip.textContent = 'SKIP SCENE';
    skip.style.cssText = [
      'opacity:0',
      'position:absolute',
      'top:16px',
      'right:16px',
      'width:160px',
      'height:38px',
      'border-radius:10px',
      'background:rgba(20,80,255,0.08)',
      'border:0.5px solid rgba(20,80,255,0.35)',
      'font-size:11px',
      'letter-spacing:0.16em',
      'color:rgba(160,195,255,0.92)',
      'font-family:"Courier New", monospace',
      'cursor:pointer',
      'pointer-events:auto',
      'transition:opacity 500ms ease, border-color 140ms ease',
    ].join(';');
    skip.addEventListener('mouseenter', () => {
      skip.style.borderColor = 'rgba(80,150,255,0.6)';
    });
    skip.addEventListener('mouseleave', () => {
      skip.style.borderColor = 'rgba(20,80,255,0.35)';
    });
  }

  root.append(planetName, cmd, invade, back);
  if (skip) {
    root.appendChild(skip);
  }
  currentContext.uiLayer.appendChild(root);

  preBattleUi = {
    root,
    planetName,
    cmd,
    invade,
    back,
    skip,
    lastChanceLabel: null,
    lastChanceButton: null,
  };

  invade.addEventListener('click', () => {
    if (!state || state.sequencePhase !== 'command-screen') return;
    state.sequencePhase = 'command-fadeout';
    state.sequencePhaseStartedAt = nowMs();
  });

  back.addEventListener('click', () => {
    currentContext.hud?.showMainMenu?.(currentContext.startMode, currentContext.audio);
    stopInvasion();
  });

  skip?.addEventListener('click', () => {
    if (!state || state.combatEnabled) return;
    startCombat();
  });
}

function createLastChanceUi() {
  if (!preBattleUi || preBattleUi.lastChanceLabel || preBattleUi.lastChanceButton) {
    return;
  }

  const label = document.createElement('div');
  label.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:0',
    'transform:translate(-50%, -50%)',
    'opacity:0',
    'font-size:9px',
    'letter-spacing:0.2em',
    'color:rgba(255,255,255,0.35)',
    'pointer-events:none',
    'transition:opacity 300ms ease',
  ].join(';');
  label.textContent = 'LAST CHANCE';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'GIVE UP';
  button.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:0',
    'transform:translate(-50%, -50%)',
    'opacity:0',
    'width:110px',
    'height:36px',
    'border-radius:10px',
    'background:rgba(255,255,255,0.06)',
    'border:0.5px solid rgba(255,255,255,0.35)',
    'backdrop-filter:blur(8px)',
    '-webkit-backdrop-filter:blur(8px)',
    'font-family:"Courier New", monospace',
    'font-size:11px',
    'letter-spacing:0.2em',
    'color:rgba(255,255,255,0.7)',
    'cursor:pointer',
    'pointer-events:auto',
    'transition:opacity 300ms ease',
  ].join(';');
  if (isTouchDevice) {
    button.style.width = '130px';
    button.style.height = '50px';
  }

  button.addEventListener('click', () => {
    if (!state) return;
    state.sequencePhase = 'giveup-fade';
    state.sequencePhaseStartedAt = nowMs();
    if (preBattleUi) {
      preBattleUi.root.style.transition = 'opacity 500ms ease';
      preBattleUi.root.style.opacity = '0';
    }
    window.setTimeout(() => {
      currentContext.hud?.showMainMenu?.(currentContext.startMode, currentContext.audio);
      stopInvasion();
    }, 520);
  });

  currentContext.uiLayer.appendChild(label);
  currentContext.uiLayer.appendChild(button);
  preBattleUi.lastChanceLabel = label;
  preBattleUi.lastChanceButton = button;
  positionLastChanceUi();
}

function positionLastChanceUi() {
  if (!state || !preBattleUi) {
    return;
  }
  const y = state.zones.planetArcY + (state.zones.planetArcWidth * 0.32);
  if (preBattleUi.lastChanceLabel) {
    preBattleUi.lastChanceLabel.style.top = `${Math.round(y - 4)}px`;
  }
  if (preBattleUi.lastChanceButton) {
    preBattleUi.lastChanceButton.style.top = `${Math.round(y + 32)}px`;
  }
}

function getZones(canvas) {
  const { width, height } = getBounds(canvas);
  return {
    width,
    height,
    planetTop: 0,
    planetBottom: height * 0.15,
    redTop: height * 0.15,
    redBottom: height * 0.45,
    boundaryY: height * 0.45,
    greenTop: height * 0.45,
    greenBottom: height,
    planetArcY: height * 0.08,
    planetArcWidth: width * 0.6,
  };
}

function initializeState(context) {
  const { canvas } = context;
  const zones = getZones(canvas);
  const centerX = zones.width / 2;
  const playerY = zones.greenBottom + 40;

  const aiPositions = [
    centerX - 250,
    centerX - 120,
    centerX + 120,
    centerX + 250,
  ];

  const aiMotherships = AI_CALLSIGNS.map((callsign, idx) => makeAiMothership(callsign, aiPositions[idx], zones.greenBottom + 40));

  const playerFleet = [];
  for (let i = 0; i < PLAYER_FLEET_MAX; i += 1) {
    playerFleet.push(makeGreenFighter('player', 'YOU', centerX, playerY - 40));
  }

  const aiFighters = [];
  for (const ship of aiMotherships) {
    for (let i = 0; i < ship.onScreenMax; i += 1) {
      aiFighters.push(makeGreenFighter('ai', ship.callsign, ship.x, ship.y + 8));
      ship.reserve -= 1;
    }
  }

  return {
    seedPlanet: PLANET_NAMES[Math.floor(Math.random() * PLANET_NAMES.length)],
    zones,
    starfieldBuffer: createStarfieldBuffer(zones.width, zones.height),
    player: makePlayer(centerX, playerY),
    aiMotherships,
    playerFleet,
    aiFighters,
    greenBullets: [],
    redBullets: [],
    redFighters: [],
    bosses: [],
    bombs: [],
    flashRings: [],
    shockwaves: [],
    planetBlasts: [],
    planetHp: PLANET_MAX_HP,
    planetState: {
      phase: 'normal',
      phaseStartedAt: nowMs(),
      immunityUntil: 0,
      coreChargeStartedAt: 0,
      coreChargeUntil: 0,
      lastStandHp: PLANET_LAST_STAND_HP,
      hardFlashUntil: 0,
      shatterToggleUntil: 0,
    },
    centerNotice: null,
    finalAssault: {
      active: false,
      triggeredAt: 0,
      troopStartAt: 0,
      bossesStartAt: 0,
      nextTroopSpawnAt: 0,
      troopsSpawned: 0,
      troopsLost: 0,
      bossesSpawned: false,
      bossesKilled: 0,
      deployNoticeShown: false,
      bossNoticeShown: false,
    },
    planetDestroyedSequence: null,
    totalAnnihilationBonusApplied: false,
    redKilled: 0,
    redDeployed: 0,
    bossesKilled: 0,
    score: 0,
    backspaceCount: 0,
    laserFramesRemaining: 0,
    backspaceFlashFrames: 0,
    input: {
      left: false,
      right: false,
      up: false,
      down: false,
      fire: false,
      axisX: 0,
      axisY: 0,
      command: false,
    },
    mode: 'active',
    battlePhase: 'fighters',
    commsLostUntil: 0,
    matchStartAt: nowMs(),
    lastPathTick: 0,
    frameCount: 0,
    invasionOrderCooldownUntil: 0,
    invasionOrderPulseUntil: 0,
    lastInvasionIssuedAt: 0,
    playerFleetOrder: 'FORMATION',
    selectedTab: 'MY_FLEET',
    aiStatusLine: '',
    aiStatusUntil: 0,
    fighterLosses: 0,
    mothershipLosses: 0,
    planetDestroyedBonusApplied: false,
    pendingCapture: null,
    phaseBannerUntil: 0,
    counterMode: 'reds',
    counterTransitionUntil: 0,
    bossBreakoutActive: false,
    broadcast: {
      active: false,
      order: null,
      until: 0,
      startedAt: 0,
      flashUntil: 0,
    },
    kamikaze: {
      cooldownUntil: 0,
      forceReady: false,
    },
    sequencePhase: 'command-screen',
    sequenceStartedAt: nowMs(),
    sequencePhaseStartedAt: nowMs(),
    combatEnabled: false,
    combatStartAt: 0,
    hudFadeUntil: 0,
    ambientRamp: {
      from: 0,
      to: 0,
      startedAt: 0,
      duration: 2000,
      active: false,
    },
    ambientTargetVolume: 1,
    planetPulseUntil: 0,
    redWarmupStartAt: 0,
    redWarmupUntil: 0,
  };
}

function onBossKilled(boss) {
  if (!boss || boss.dead) {
    return;
  }
  boss.lockedBy = [];
  for (const fighter of [...state.playerFleet, ...state.aiFighters]) {
    if (fighter.targetBossId === boss.id) {
      fighter.targetBossId = null;
    }
  }
  boss.dead = true;
  state.bossesKilled += 1;
  if (state.finalAssault?.active) {
    state.finalAssault.bossesKilled += 1;
  }
  state.score += SCORE_BOSS_KILL;
  state.shockwaves.push(makeShockwave(boss.x, boss.y));

  if (!state.bossBreakoutActive && state.bossesKilled >= 1) {
    state.bossBreakoutActive = true;
    for (const survivor of state.bosses) {
      if (!survivor.dead && survivor.active) {
        survivor.breakout = true;
      }
    }
    showStatusNotice('BOSS FORMATION BROKEN', 1800);
  }
}

function saveInvasionScore(entry) {
  const raw = localStorage.getItem(INVASION_SCORE_KEY);
  let list = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } catch {
      list = [];
    }
  }
  list.push(entry);
  list.sort((a, b) => (b.score || 0) - (a.score || 0));
  list = list.slice(0, 30);
  localStorage.setItem(INVASION_SCORE_KEY, JSON.stringify(list));
}

function keyToOrder(key) {
  if (key === '1') return 'ATTACK';
  if (key === '2') return 'FALL BACK';
  if (key === '3') return 'FLANK LEFT';
  if (key === '4') return 'FLANK RIGHT';
  if (key === '5') return 'SHIELD WALL';
  if (key === '6') return 'SCATTER';
  if (key === '7') return 'RECALL';
  if (key === '8') return 'INVADE';
  return null;
}

function getAllGreenFighters() {
  return [...state.playerFleet, ...state.aiFighters].filter((fighter) => !fighter.dead);
}

function applyBombardOrder(fighters, zones) {
  const selected = fighters.slice(0, Math.min(25, fighters.length));
  for (const fighter of fighters) {
    fighter.bomberAssigned = false;
    fighter.bomber = false;
    fighter.kamikazeMode = false;
  }
  for (const fighter of selected) {
    fighter.order = 'BOMBARD';
    fighter.bomberAssigned = true;
    fighter.bomberDropInterval = randomInRange(BOMB_MIN_MS, BOMB_MAX_MS);
    fighter.bomberNextDropAt = nowMs() + fighter.bomberDropInterval;
    fighter.bomberPhaseOffset = randomInRange(0, Math.PI * 2);
    fighter.targetY = zones.redTop + 28;
  }
}

function captureBroadcastSnapshot() {
  for (const fighter of getAllGreenFighters()) {
    fighter.preBroadcastOrder = fighter.order;
  }
  for (const ship of state.aiMotherships) {
    ship.preBroadcast = {
      order: ship.order,
      x: ship.x,
      y: ship.y,
    };
  }
}

function endBroadcast(reason = 'timeout') {
  if (!state.broadcast.active) return;

  const boundary = state.zones.boundaryY;
  for (const fighter of getAllGreenFighters()) {
    fighter.broadcastLocked = false;
    fighter.shieldMode = false;
    if (fighter.y >= boundary && fighter.preBroadcastOrder) {
      fighter.order = fighter.preBroadcastOrder;
      if (fighter.order !== 'BOMBARD') {
        fighter.bomberAssigned = false;
        fighter.bomber = false;
      }
    }
    fighter.preBroadcastOrder = null;
  }

  for (const ship of state.aiMotherships) {
    if (ship.preBroadcast) {
      ship.order = ship.preBroadcast.order;
      ship.returnTargetX = ship.preBroadcast.x;
      ship.returnTargetY = ship.preBroadcast.y;
      ship.returnUntil = nowMs() + 800;
      ship.returnStartX = ship.x;
      ship.returnStartY = ship.y;
      ship.preBroadcast = null;
    }
  }

  state.broadcast.active = false;
  state.broadcast.order = null;
  state.broadcast.flashUntil = reason === 'timeout' ? nowMs() + 280 : 0;
  if (commandModuleEl?.panel) {
    commandModuleEl.panel.style.display = 'none';
  }
}

function beginBroadcast(order) {
  captureBroadcastSnapshot();
  state.broadcast.active = true;
  state.broadcast.order = order;
  state.broadcast.startedAt = nowMs();
  state.broadcast.until = nowMs() + BROADCAST_DURATION_MS;
}

function issueBroadcastOrder(order) {
  if (state.mode !== 'active') return;
  if (state.broadcast.active) {
    endBroadcast('replaced');
  }

  beginBroadcast(order);
  const allFighters = getAllGreenFighters();

  if (order === 'ATTACK') {
    for (const fighter of allFighters) {
      fighter.order = 'ATTACK';
      fighter.broadcastLocked = true;
      fighter.hp = Math.min(fighter.hp, 1);
      fighter.maxHp = Math.max(fighter.maxHp, 2);
      fighter.armorBroken = true;
      fighter.attackDamageMultiplier = 3;
    }
    return;
  }

  if (order === 'GROUP_SHIELD') {
    for (const fighter of allFighters) {
      fighter.order = 'GROUP_SHIELD';
      fighter.broadcastLocked = true;
      fighter.shieldMode = true;
      fighter.attackDamageMultiplier = 1;
      fighter.maxHp = Math.max(fighter.maxHp, 5);
      fighter.hp = Math.max(fighter.hp, 5);
    }
    for (const ship of state.aiMotherships) {
      ship.order = 'GROUP_SHIELD';
    }
    return;
  }
}

function startKamikazeRun(forceAll = false) {
  if (isLastStandKamikazeDisabled()) {
    return;
  }
  if (nowMs() < state.kamikaze.cooldownUntil) {
    return;
  }
  const fighters = getAllGreenFighters();
  const volunteers = [];
  for (const fighter of fighters) {
    const willing = forceAll ? true : (Math.random() < 0.05);
    if (!willing) continue;
    volunteers.push(fighter);
  }

  for (const fighter of volunteers) {
    fighter.kamikazeMode = true;
    fighter.bomber = false;
    fighter.bomberAssigned = false;
    fighter.order = 'KAMIKAZE';
    fighter.attackDamageMultiplier = 1;
    fighter.shieldMode = false;
    fighter.maxHp = forceAll ? 2 : 3;
    fighter.hp = Math.min(fighter.hp, fighter.maxHp);
  }

  state.kamikaze.cooldownUntil = nowMs() + KAMIKAZE_COOLDOWN_MS;
  state.kamikaze.forceReady = false;
}

function handleKeyChange(event, isDown) {
  if (!state || state.mode === 'finished') {
    return;
  }

  if (!state.combatEnabled) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') state.input.left = isDown;
  if (key === 'arrowright' || key === 'd') state.input.right = isDown;
  if (key === 'arrowup' || key === 'w') state.input.up = isDown;
  if (key === 'arrowdown' || key === 's') state.input.down = isDown;
  if (key === ' ' || key === 'spacebar') {
    if (isDown && !state.player.charging) {
      state.player.charging = true;
      state.player.chargeStartAt = nowMs();
    }
    if (!isDown && state.player.charging) {
      const held = nowMs() - state.player.chargeStartAt;
      state.player.charging = false;
      if (held >= CHARGE_TIME_MS) {
        fireChargedShot();
      }
    }
    state.input.fire = isDown;
  }
  if (key === 'backspace' && isDown) {
    event.preventDefault();
    activateBackspace();
  }
  if (key === 'c' && isDown && state.mode !== 'spectator') {
    toggleCommandModule();
  }
  if (key === 'escape' && isDown && state.mode === 'spectator') {
    failInvasion();
  }

  if (isDown && commandModuleEl && commandModuleEl.panel.style.display !== 'none') {
    if (key === 'tab') {
      event.preventDefault();
      if (state.selectedTab === 'MY_FLEET') {
        state.selectedTab = 'AI_FLEET';
      } else if (state.selectedTab === 'AI_FLEET') {
        state.selectedTab = 'BROADCAST';
      } else {
        state.selectedTab = 'MY_FLEET';
      }
      refreshCommandModule();
      return;
    }
    const order = keyToOrder(key);
    if (order && state.selectedTab === 'MY_FLEET') {
      issuePlayerOrder(order);
    }
  }
}

function createStatusNotice() {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:110px',
    'transform:translateX(-50%)',
    'padding:8px 16px',
    'border-radius:14px',
    'background:rgba(255,40,20,0.08)',
    'border:0.5px solid rgba(255,40,20,0.28)',
    'backdrop-filter:blur(12px)',
    '-webkit-backdrop-filter:blur(12px)',
    'font-family:"Courier New", monospace',
    'font-size:10px',
    'letter-spacing:0.2em',
    'color:rgba(255,150,130,0.92)',
    'display:none',
    'pointer-events:none',
    'z-index:18',
  ].join(';');
  currentContext.uiLayer.appendChild(el);
  statusNoticeEl = el;
}

function showStatusNotice(text, durationMs = 2000) {
  if (!statusNoticeEl) return;
  statusNoticeEl.textContent = text;
  statusNoticeEl.style.display = 'block';
  const until = nowMs() + durationMs;
  statusNoticeEl.dataset.until = String(until);
}

function updateStatusNotice(now) {
  if (!statusNoticeEl || statusNoticeEl.style.display === 'none') return;
  const until = Number(statusNoticeEl.dataset.until || 0);
  if (now >= until) {
    statusNoticeEl.style.display = 'none';
  }
}

function createPhaseBanner() {
  if (phaseBannerEl) {
    return;
  }
  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:absolute',
    'left:50%',
    'top:50%',
    'transform:translate(-50%,-50%)',
    'padding:16px 24px',
    'border-radius:16px',
    'background:rgba(255,40,20,0.08)',
    'border:0.5px solid rgba(255,80,60,0.28)',
    'backdrop-filter:blur(14px)',
    '-webkit-backdrop-filter:blur(14px)',
    'font-family:"Courier New", monospace',
    'text-align:center',
    'pointer-events:none',
    'display:none',
    'z-index:28',
  ].join(';');
  currentContext.uiLayer.appendChild(panel);
  phaseBannerEl = panel;
}

function showPhaseBanner(durationMs = 2000) {
  if (!phaseBannerEl) {
    createPhaseBanner();
  }
  if (!phaseBannerEl) return;
  phaseBannerEl.innerHTML = `
    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(255,80,60,0.5);margin-bottom:8px;">DEFENDERS ELIMINATED</div>
    <div style="font-size:10px;letter-spacing:0.2em;color:rgba(255,50,34,0.7);">COMMAND UNITS INCOMING</div>
  `;
  phaseBannerEl.style.display = 'block';
  state.phaseBannerUntil = nowMs() + durationMs;
}

function updatePhaseBanner(now) {
  if (phaseBannerEl && phaseBannerEl.style.display !== 'none' && now >= state.phaseBannerUntil) {
    phaseBannerEl.style.display = 'none';
  }
}

function getActiveBosses() {
  return state.bosses.filter((boss) => boss.active && !boss.dead);
}

function releaseInvasionBossLock(fighter) {
  if (!fighter?.targetBossId) {
    return;
  }
  const boss = getActiveBosses().find((candidate) => candidate.id === fighter.targetBossId);
  if (boss?.lockedBy) {
    boss.lockedBy = boss.lockedBy.filter((fighterId) => fighterId !== fighter.id);
  }
  fighter.targetBossId = null;
}

function acquireInvasionBossLock(fighter) {
  const bosses = getActiveBosses();
  if (bosses.length === 0) {
    releaseInvasionBossLock(fighter);
    return null;
  }

  const existing = bosses.find((boss) => boss.id === fighter.targetBossId && boss.lockedBy.includes(fighter.id));
  if (existing) {
    return existing;
  }

  releaseInvasionBossLock(fighter);
  const available = bosses.filter((boss) => boss.lockedBy.length < MAX_BOSS_LOCKS);
  if (available.length === 0) {
    return null;
  }

  let nearest = null;
  let nearestDistance = Infinity;
  for (const boss of available) {
    const dx = boss.x - fighter.x;
    const dy = boss.y - fighter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = boss;
    }
  }

  if (!nearest) {
    return null;
  }
  nearest.lockedBy.push(fighter.id);
  fighter.targetBossId = nearest.id;
  return nearest;
}

function getInvasionBossTarget(fighter, allowLock) {
  const bosses = getActiveBosses();
  if (bosses.length === 0) {
    releaseInvasionBossLock(fighter);
    return null;
  }

  const existing = bosses.find((boss) => boss.id === fighter.targetBossId);
  if (existing) {
    return existing;
  }

  if (allowLock) {
    return acquireInvasionBossLock(fighter);
  }

  let nearest = null;
  let nearestDistance = Infinity;
  for (const boss of bosses) {
    const dx = boss.x - fighter.x;
    const dy = boss.y - fighter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = boss;
    }
  }
  return nearest;
}

function applyGreenFighterSeparation() {
  if (state.frameCount % 2 !== 0) {
    return;
  }

  const fighters = [...state.playerFleet, ...state.aiFighters].filter((fighter) => !fighter.dead);
  const { width, height, boundaryY, redTop } = state.zones;
  const cellWidth = width / 6;
  const cellHeight = height / 6;
  const grid = new Map();

  const keyFor = (fighter) => {
    const gx = clamp(Math.floor(fighter.x / cellWidth), 0, 5);
    const gy = clamp(Math.floor(fighter.y / cellHeight), 0, 5);
    return `${gx},${gy}`;
  };

  for (const fighter of fighters) {
    const key = keyFor(fighter);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(fighter);
  }

  for (const fighter of fighters) {
    const gx = clamp(Math.floor(fighter.x / cellWidth), 0, 5);
    const gy = clamp(Math.floor(fighter.y / cellHeight), 0, 5);
    for (let ix = gx - 1; ix <= gx + 1; ix += 1) {
      for (let iy = gy - 1; iy <= gy + 1; iy += 1) {
        const neighbours = grid.get(`${ix},${iy}`);
        if (!neighbours) continue;
        for (const neighbour of neighbours) {
          if (neighbour === fighter || neighbour.dead) continue;
          const dx = fighter.x - neighbour.x;
          const dy = fighter.y - neighbour.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
          if (distance >= FIGHTER_SEPARATION) continue;
          fighter.x += (dx / distance) * 0.8;
          fighter.y += (dy / distance) * 0.8;
        }
      }
    }

    fighter.x = clamp(fighter.x, 8, width - 8);
    let topClamp = 8;
    if (fighter.invader) {
      topClamp = 6;
    } else if (fighter.order === 'BOMBARD') {
      topClamp = redTop + 6;
    } else if (fighter.order === 'ADVANCE') {
      topClamp = redTop + 20;
    }
    fighter.y = clamp(fighter.y, topClamp, height - 8);
  }
}

function createBackspaceUi() {
  removeBackspaceUi();

  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:absolute',
    'right:16px',
    'bottom:18px',
    'z-index:17',
    'display:flex',
    'align-items:center',
    'gap:8px',
    'pointer-events:auto',
    'font-family:"Courier New", monospace',
  ].join(';');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'BACKSPACE';
  btn.style.cssText = [
    'background:rgba(255,255,255,0.05)',
    'border:0.5px solid rgba(255,255,255,0.2)',
    'border-radius:12px',
    'padding:8px 12px',
    'font-size:10px',
    'letter-spacing:0.16em',
    'color:rgba(255,255,255,0.88)',
    'pointer-events:auto',
    'cursor:pointer',
  ].join(';');

  const count = document.createElement('div');
  count.style.cssText = [
    'min-width:30px',
    'text-align:center',
    'font-size:11px',
    'color:rgba(255,255,255,0.9)',
  ].join(';');
  count.textContent = 'x0';

  const dps = document.createElement('div');
  dps.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.6);letter-spacing:0.1em;';
  dps.textContent = 'DPS 0.0';

  btn.addEventListener('click', activateBackspace);
  wrap.append(btn, count, dps);
  currentContext.uiLayer.appendChild(wrap);

  backspaceUi = { wrap, btn, count, dps };
}

function removeBackspaceUi() {
  if (backspaceUi?.wrap?.parentElement) {
    backspaceUi.wrap.parentElement.removeChild(backspaceUi.wrap);
  }
  backspaceUi = null;
}

function createModeButtons() {
  removeModeButtons();

  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:absolute',
    'left:16px',
    'bottom:18px',
    'z-index:17',
    'display:flex',
    'gap:8px',
    'pointer-events:auto',
    'font-family:"Courier New", monospace',
  ].join(';');

  const controlBtn = document.createElement('button');
  controlBtn.type = 'button';
  controlBtn.textContent = 'CONTROL';
  controlBtn.style.cssText = baseCmdBtnStyle(true);

  const commandBtn = document.createElement('button');
  commandBtn.type = 'button';
  commandBtn.textContent = 'COMMAND';
  commandBtn.style.cssText = baseCmdBtnStyle(false);

  commandBtn.addEventListener('click', () => {
    toggleCommandModule();
    const visible = commandModuleEl?.panel?.style.display !== 'none';
    controlBtn.style.cssText = baseCmdBtnStyle(!visible);
    commandBtn.style.cssText = baseCmdBtnStyle(visible);
  });

  controlBtn.addEventListener('click', () => {
    if (commandModuleEl) {
      commandModuleEl.panel.style.display = 'none';
    }
    controlBtn.style.cssText = baseCmdBtnStyle(true);
    commandBtn.style.cssText = baseCmdBtnStyle(false);
  });

  wrap.append(controlBtn, commandBtn);
  currentContext.uiLayer.appendChild(wrap);
  modeButtonsEl = { wrap, controlBtn, commandBtn };
}

function removeModeButtons() {
  if (modeButtonsEl?.wrap?.parentElement) {
    modeButtonsEl.wrap.parentElement.removeChild(modeButtonsEl.wrap);
  }
  modeButtonsEl = null;
}

function updateBackspaceUi() {
  if (!backspaceUi) return;
  backspaceUi.count.textContent = `x${state.backspaceCount}`;
  const alive = getAliveGreenFighterCount();
  const dps = 15 + alive * 0.05;
  backspaceUi.dps.textContent = `DPS ${dps.toFixed(1)}`;
  const active = state.laserFramesRemaining > 0;
  backspaceUi.btn.style.borderColor = active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)';
  backspaceUi.btn.style.background = active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
}

function createCommandModule() {
  removeCommandModule();

  const panel = document.createElement('div');
  panel.className = 'hidden';
  panel.style.cssText = [
    'position:absolute',
    'left:16px',
    'right:16px',
    'bottom:72px',
    'z-index:18',
    'max-width:640px',
    'margin:0 auto',
    'background:rgba(255,255,255,0.04)',
    'border:0.5px solid rgba(255,255,255,0.16)',
    'border-radius:16px',
    'backdrop-filter:blur(14px)',
    '-webkit-backdrop-filter:blur(14px)',
    'padding:12px',
    'font-family:"Courier New", monospace',
    'color:rgba(255,255,255,0.78)',
    'pointer-events:auto',
    'display:none',
  ].join(';');

  const tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';

  const myTab = document.createElement('button');
  myTab.type = 'button';
  myTab.textContent = 'MY FLEET';
  myTab.style.cssText = baseCmdBtnStyle();

  const aiTab = document.createElement('button');
  aiTab.type = 'button';
  aiTab.textContent = 'AI FLEET';
  aiTab.style.cssText = baseCmdBtnStyle();

  const broadcastTab = document.createElement('button');
  broadcastTab.type = 'button';
  broadcastTab.textContent = 'BROADCAST';
  broadcastTab.style.cssText = baseCmdBtnStyle();

  tabs.append(myTab, aiTab, broadcastTab);

  const body = document.createElement('div');
  panel.append(tabs, body);

  myTab.addEventListener('click', () => {
    state.selectedTab = 'MY_FLEET';
    refreshCommandModule();
  });

  aiTab.addEventListener('click', () => {
    state.selectedTab = 'AI_FLEET';
    refreshCommandModule();
  });

  broadcastTab.addEventListener('click', () => {
    state.selectedTab = 'BROADCAST';
    refreshCommandModule();
  });

  currentContext.uiLayer.appendChild(panel);
  commandModuleEl = { panel, body, myTab, aiTab, broadcastTab };
  refreshCommandModule();
}

function baseCmdBtnStyle(active = false) {
  if (active) {
    return [
      'background:rgba(0,255,120,0.1)',
      'border:0.5px solid rgba(0,255,120,0.35)',
      'border-radius:10px',
      'padding:8px 10px',
      'font-size:10px',
      'letter-spacing:0.12em',
      'color:rgba(180,255,210,0.95)',
      'cursor:pointer',
    ].join(';');
  }

  return [
    'background:rgba(255,255,255,0.05)',
    'border:0.5px solid rgba(255,255,255,0.2)',
    'border-radius:10px',
    'padding:8px 10px',
    'font-size:10px',
    'letter-spacing:0.12em',
    'color:rgba(255,255,255,0.85)',
    'cursor:pointer',
  ].join(';');
}

function issuePlayerOrder(order) {
  if (state.mode !== 'active') return;

  if (order === 'INVADE') {
    issueInvadeOrder();
  } else if (order === 'BOMBARD') {
    state.playerFleetOrder = order;
    const candidates = state.playerFleet.filter((fighter) => !fighter.dead && !fighter.invader);
    applyBombardOrder(candidates, state.zones);
  } else if (order === 'FALL BACK' || order === 'RECALL') {
    state.playerFleetOrder = order;
    for (const fighter of state.playerFleet) {
      if (!fighter.dead && !fighter.invader) {
        fighter.order = order;
        fighter.bomberAssigned = false;
        fighter.bomber = false;
        fighter.kamikazeMode = false;
      }
    }
  } else {
    state.playerFleetOrder = order;
    for (const f of state.playerFleet) {
      if (!f.dead && !f.invader) {
        f.order = order;
      }
    }
  }

  if (commandModuleEl?.panel) {
    commandModuleEl.panel.style.display = 'none';
  }
}

function setAiShipOrder(ship, suggestion) {
  if (!ship || ship.dead) return;
  ship.order = suggestion;
  const owned = state.aiFighters.filter((fighter) => !fighter.dead && fighter.ownerId === ship.callsign);
  if (suggestion === 'BOMBARD') {
    applyBombardOrder(owned, state.zones);
    return;
  }
  for (const fighter of owned) {
    fighter.bomberAssigned = false;
    if (!fighter.bomberPermanentOneHp) {
      fighter.bomber = false;
    }
  }
}

function updateAiMothershipStrategy(now) {
  if (!state || state.mode !== 'active' || state.broadcast.active) {
    return;
  }

  const redsNearBoundary = state.redFighters.filter((red) => !red.dead && red.y >= state.zones.boundaryY - 30).length;
  const playerThreat = state.redFighters.filter((red) => !red.dead && Math.abs(red.x - state.player.x) < 120 && red.y >= state.zones.boundaryY - 20).length;

  for (const ship of state.aiMotherships) {
    if (ship.dead || now < (ship.nextDecisionAt ?? 0)) continue;

    const ownedAlive = state.aiFighters.filter((fighter) => !fighter.dead && fighter.ownerId === ship.callsign).length;
    const current = ship.order;
    let nextOrder = current;

    if (ship.hp <= AI_HP_MAX * 0.32 || ownedAlive <= 2) {
      nextOrder = 'DEFEND';
    } else if (state.battlePhase === 'bosses' && ownedAlive >= 6) {
      nextOrder = 'ADVANCE';
    } else if (playerThreat >= 8 || redsNearBoundary >= 18) {
      nextOrder = 'SUPPORT';
    } else if (state.redFighters.length >= 55 && ownedAlive >= 7) {
      nextOrder = 'BOMBARD';
    } else {
      nextOrder = ship.compliance >= 0.8 ? 'FORMATION' : 'SUPPORT';
    }

    if (nextOrder !== current) {
      setAiShipOrder(ship, nextOrder);
      state.aiStatusLine = `${ship.callsign}: ${nextOrder}`;
      state.aiStatusUntil = now + 1400;
    }

    ship.nextDecisionAt = now + randomInRange(1300, 2600);
  }
}

function applyAiSuggestion(callsign, suggestion) {
  const ship = state.aiMotherships.find((s) => s.callsign === callsign);
  if (!ship || ship.dead) return;

  if (Math.random() <= ship.compliance) {
    setAiShipOrder(ship, suggestion);
    state.aiStatusLine = `${callsign}: ${suggestion}`;
  } else {
    state.aiStatusLine = `${callsign}: HOLDING CURRENT ORDERS`;
  }
  state.aiStatusUntil = nowMs() + 1800;
  refreshCommandModule();
}

function refreshCommandModule() {
  if (!commandModuleEl) return;

  commandModuleEl.myTab.style.cssText = baseCmdBtnStyle(state.selectedTab === 'MY_FLEET');
  commandModuleEl.aiTab.style.cssText = baseCmdBtnStyle(state.selectedTab === 'AI_FLEET');
  commandModuleEl.broadcastTab.style.cssText = baseCmdBtnStyle(state.selectedTab === 'BROADCAST');

  if (state.selectedTab === 'MY_FLEET') {
    const now = nowMs();
    const invadeReady = now >= state.invasionOrderCooldownUntil;
    const cooldownRemainingMs = Math.max(0, state.invasionOrderCooldownUntil - now);
    const cooldownRatio = clamp(cooldownRemainingMs / INVADE_COOLDOWN_MS, 0, 1);
    const progress = 1 - cooldownRatio;
    const invadePulse = invadeReady && now < state.invasionOrderPulseUntil;
    const invadeLabel = invadeReady
      ? 'INVADE'
      : `INVADE ${(Math.ceil((state.invasionOrderCooldownUntil - nowMs()) / 1000))}s`;
    commandModuleEl.body.innerHTML = '';
    const orders = ['ATTACK', 'FALL BACK', 'FLANK LEFT', 'FLANK RIGHT', 'SHIELD WALL', 'SCATTER', 'RECALL', 'BOMBARD', invadeLabel];
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;';
    orders.forEach((label, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = baseCmdBtnStyle(index === 8 ? invadeReady : false);
      btn.textContent = label;
      btn.disabled = index === 8 && !invadeReady;
      if (index === 8) {
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.style.background = invadeReady
          ? 'rgba(0,255,120,0.12)'
          : `conic-gradient(rgba(0,255,120,0.34) ${progress * 360}deg, rgba(255,255,255,0.08) ${progress * 360}deg)`;
        if (invadePulse) {
          btn.style.boxShadow = '0 0 18px rgba(0,255,120,0.45)';
        } else {
          btn.style.boxShadow = 'none';
        }
      }
      btn.addEventListener('click', () => {
        if (index === 8) {
          issuePlayerOrder('INVADE');
        } else {
          issuePlayerOrder(orders[index]);
        }
      });
      grid.appendChild(btn);
    });
    commandModuleEl.body.appendChild(grid);
  } else if (state.selectedTab === 'AI_FLEET') {
    commandModuleEl.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    for (const ship of state.aiMotherships) {
      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex',
        'flex-wrap:wrap',
        'gap:8px',
        'align-items:center',
        'padding:8px',
        'border:0.5px solid rgba(255,255,255,0.13)',
        'border-radius:10px',
        'background:rgba(255,255,255,0.02)',
      ].join(';');

      const alive = state.aiFighters.filter((f) => !f.dead && f.ownerId === ship.callsign).length;
      const label = document.createElement('div');
      label.style.cssText = 'min-width:170px;font-size:10px;letter-spacing:0.11em;color:rgba(180,255,210,0.9);';
      label.textContent = `${ship.callsign}  HP ${Math.max(0, Math.ceil(ship.hp))}  ${alive}/${ship.reserve + alive}`;
      row.appendChild(label);

      ['FORMATION', 'DEFEND', 'ADVANCE', 'SUPPORT', 'BOMBARD'].forEach((suggestion) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText = baseCmdBtnStyle(ship.order === suggestion);
        btn.textContent = suggestion;
        btn.disabled = ship.dead;
        btn.addEventListener('click', () => applyAiSuggestion(ship.callsign, suggestion));
        row.appendChild(btn);
      });

      const status = document.createElement('div');
      status.style.cssText = 'width:100%;font-size:9px;letter-spacing:0.08em;color:rgba(255,255,255,0.42);';
      status.textContent = `ACTIVE ${ship.order}`;
      row.appendChild(status);
      wrap.appendChild(row);
    }

    if (state.aiStatusLine && nowMs() < state.aiStatusUntil) {
      const line = document.createElement('div');
      line.style.cssText = 'font-size:10px;letter-spacing:0.12em;color:rgba(255,255,255,0.45);padding-top:2px;';
      line.textContent = state.aiStatusLine;
      wrap.appendChild(line);
    }

    commandModuleEl.body.appendChild(wrap);
  } else {
    commandModuleEl.body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;border-top:1px solid rgba(255,50,34,0.3);padding-top:8px;';

    const header = document.createElement('div');
    header.textContent = 'FLEET-WIDE BROADCAST · 8 SECONDS';
    header.style.cssText = 'font-size:9px;letter-spacing:0.2em;color:rgba(255,80,60,0.5);';
    wrap.appendChild(header);

    if (state.broadcast.active) {
      const progress = clamp((state.broadcast.until - nowMs()) / BROADCAST_DURATION_MS, 0, 1);
      const bar = document.createElement('div');
      bar.style.cssText = 'height:3px;background:rgba(255,80,60,0.2);border-radius:4px;overflow:hidden;';
      const fill = document.createElement('div');
      fill.style.cssText = `height:3px;width:${Math.floor(progress * 100)}%;background:rgba(255,80,60,0.6);`;
      bar.appendChild(fill);
      wrap.appendChild(bar);
    }

    const mk = (text, critical = false) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.style.cssText = critical
        ? [
          'width:100%',
          'height:48px',
          'background:rgba(255,20,20,0.15)',
          'border:0.5px solid rgba(255,20,20,0.5)',
          'border-radius:12px',
          'font-size:16px',
          'letter-spacing:0.2em',
          'color:#ff2222',
          'text-shadow:0 0 20px rgba(255,34,34,0.4)',
          'font-family:"Courier New", monospace',
          'cursor:pointer',
        ].join(';')
        : [
          'width:100%',
          'padding:10px 12px',
          'background:rgba(255,255,255,0.05)',
          'border:0.5px solid rgba(255,255,255,0.2)',
          'border-radius:10px',
          'font-size:10px',
          'letter-spacing:0.14em',
          'color:rgba(255,255,255,0.9)',
          'font-family:"Courier New", monospace',
          'cursor:pointer',
        ].join(';');
      return btn;
    };

    const attack = mk('ATTACK');
    const shield = mk('GROUP SHIELD');
    const kamikazeLockedByLastStand = isLastStandKamikazeDisabled();
    const kamiReadyForce = nowMs() >= state.kamikaze.cooldownUntil && state.kamikaze.forceReady;
    const kamiCooling = nowMs() < state.kamikaze.cooldownUntil;
    const kami = mk(kamiReadyForce ? 'FORCE KAMIKAZE' : 'KAMIKAZE', true);
    if (kamikazeLockedByLastStand) {
      kami.textContent = 'KAMIKAZE';
      kami.disabled = true;
      kami.style.background = 'rgba(255,20,20,0.02)';
      kami.style.border = '0.5px solid rgba(255,20,20,0.08)';
      kami.style.color = 'rgba(255,255,255,0.1)';
      kami.style.textShadow = 'none';
    } else if (kamiCooling) {
      const sec = Math.max(1, Math.ceil((state.kamikaze.cooldownUntil - nowMs()) / 1000));
      kami.textContent = String(sec);
      kami.disabled = true;
      kami.style.background = 'rgba(255,20,20,0.04)';
      kami.style.border = '0.5px solid rgba(255,20,20,0.15)';
      kami.style.color = 'rgba(255,34,34,0.4)';
      kami.style.fontSize = '20px';
    } else {
      kami.disabled = false;
      if (kamiReadyForce) {
        kami.style.background = 'rgba(255,20,20,0.25)';
        kami.style.border = '0.5px solid rgba(255,20,20,0.7)';
      }
    }

    attack.addEventListener('click', () => issueBroadcastOrder('ATTACK'));
    shield.addEventListener('click', () => issueBroadcastOrder('GROUP_SHIELD'));
    kami.addEventListener('click', () => {
      issueBroadcastOrder(kamiReadyForce ? 'FORCE_KAMIKAZE' : 'KAMIKAZE');
      startKamikazeRun(kamiReadyForce);
    });

    const note = document.createElement('div');
    note.textContent = kamikazeLockedByLastStand
      ? 'DISABLED · LAST STAND'
      : '5% VOLUNTEER RATE · FORCE AVAILABLE AFTER 20S';
    note.style.cssText = 'font-size:9px;letter-spacing:0.12em;color:rgba(255,255,255,0.15);text-align:center;';

    wrap.append(attack, shield, kami, note);
    commandModuleEl.body.appendChild(wrap);
  }
}

function toggleCommandModule() {
  if (!commandModuleEl) return;
  const visible = commandModuleEl.panel.style.display !== 'none';
  commandModuleEl.panel.style.display = visible ? 'none' : 'block';
  if (!visible) {
    refreshCommandModule();
  }
  if (modeButtonsEl) {
    modeButtonsEl.controlBtn.style.cssText = baseCmdBtnStyle(visible);
    modeButtonsEl.commandBtn.style.cssText = baseCmdBtnStyle(!visible);
  }
}

function removeCommandModule() {
  if (commandModuleEl?.panel?.parentElement) {
    commandModuleEl.panel.parentElement.removeChild(commandModuleEl.panel);
  }
  commandModuleEl = null;
}

function getAliveGreenFighterCount() {
  const playerAlive = state.playerFleet.filter((f) => !f.dead).length;
  const aiAlive = state.aiFighters.filter((f) => !f.dead).length;
  return playerAlive + aiAlive;
}

function activateBackspace() {
  if (!state || state.backspaceCount <= 0 || state.laserFramesRemaining > 0) {
    return;
  }
  state.backspaceCount -= 1;
  state.laserFramesRemaining = 300;
  state.backspaceFlashFrames = 10;
}

function spawnPowerupAt(x, y, type = null) {
  const drop = type
    ? ({ type, x, y, radius: type === currentContext.BACKSPACE_TYPE ? currentContext.BACKSPACE_RADIUS : currentContext.POWERUP_RADIUS, color: currentContext.POWERUP_COLORS[type] })
    : currentContext.spawnDropPowerup?.(x, y, true);
  if (!drop) return;
  drop.vy = 0.9;
  if (!state.powerups) state.powerups = [];
  state.powerups.push(drop);
}

function maybeSpawnDrop(x, y) {
  if (!state.powerups) state.powerups = [];
  const guaranteedBackspace = (state.redKilled > 0 && state.redKilled % 55 === 0);
  if (!guaranteedBackspace && Math.random() > INVASION_DROP_RATE_SCALE) {
    return;
  }
  const drop = guaranteedBackspace
    ? { x, y, radius: currentContext.BACKSPACE_RADIUS, type: currentContext.BACKSPACE_TYPE, color: currentContext.POWERUP_COLORS.backspace, vy: 0.9 }
    : currentContext.spawnDropPowerup?.(x, y, false);
  if (drop) {
    drop.vy = drop.vy ?? 0.9;
    state.powerups.push(drop);
  }
}

function issueInvadeOrder() {
  const now = nowMs();
  if (now < state.invasionOrderCooldownUntil) {
    return;
  }

  const available = state.playerFleet.filter((f) => !f.dead && !f.invader);
  const commitCount = Math.min(25, available.length);
  if (commitCount <= 0) {
    return;
  }

  state.lastInvasionIssuedAt = now;
  state.invasionOrderCooldownUntil = now + INVADE_COOLDOWN_MS;
  state.invasionOrderPulseUntil = now + 1200;
  state.score += SCORE_INVADE_SUCCESS;

  for (let i = 0; i < commitCount; i += 1) {
    const f = available[i];
    f.invader = true;
    f.invadePhase = 'up';
    f.order = 'INVADE';
  }
}

function startBossPhase(now) {
  if (state.battlePhase !== 'fighters') {
    return;
  }
  state.battlePhase = 'boss-transition';
  state.redFighters = [];
  state.redBullets = [];
  state.counterTransitionUntil = now + 400;
  showPhaseBanner(2000);
  state.phaseBannerUntil = now + 2000;
}

function deployBossPhase(now) {
  if (state.battlePhase !== 'boss-transition') {
    return;
  }
  state.battlePhase = 'bosses';
  state.counterMode = 'bosses';
  state.counterTransitionUntil = now + 400;
  state.bosses = [];
  const slotWidth = state.zones.width / 5;
  for (let index = 0; index < 5; index += 1) {
    const boss = makeBoss();
    boss.x = slotWidth * index + (slotWidth / 2);
    boss.y = -90;
    boss.targetY = state.zones.redTop + 28 + (index % 2) * 22;
    state.bosses.push(boss);
  }
}

function spawnRedIfNeeded(now) {
  if (!state.combatEnabled || state.battlePhase !== 'fighters') {
    return;
  }
  const onScreenTarget = isTouchDevice ? RED_ONSCREEN_TARGET_MOBILE : RED_ONSCREEN_TARGET_DESKTOP;
  const defendersTarget = isTouchDevice ? RED_DEFENDER_TARGET_MOBILE : RED_DEFENDER_TARGET_DESKTOP;
  const diversTarget = isTouchDevice ? RED_DIVER_TARGET_MOBILE : RED_DIVER_TARGET_DESKTOP;

  const aliveReds = state.redFighters.filter((r) => !r.dead).length;
  if (aliveReds >= onScreenTarget || state.redDeployed >= RED_TOTAL_TARGET) {
    return;
  }

  const zones = state.zones;
  const aliveDefenders = state.redFighters.filter((r) => !r.dead && r.type === 'defender').length;
  const aliveDivers = state.redFighters.filter((r) => !r.dead && r.type === 'diver').length;
  const type = aliveDefenders < defendersTarget
    ? 'defender'
    : (aliveDivers < diversTarget ? 'diver' : (Math.random() < 0.6 ? 'defender' : 'diver'));

  const x = zones.width / 2 + randomInRange(-zones.planetArcWidth * 0.45, zones.planetArcWidth * 0.45);
  const y = zones.redTop + randomInRange(-8, 26);
  state.redFighters.push(makeRedFighter(type, x, y));
  state.redDeployed += 1;

  if (state.redDeployed < RED_TOTAL_TARGET && Math.random() < 0.5) {
    spawnRedIfNeeded(now);
  }
}

function updatePlayer(dt, now) {
  if (state.player.dead || state.mode !== 'active') return;

  const { player, zones } = state;
  const axisX = (state.input.left ? -1 : 0) + (state.input.right ? 1 : 0) + state.input.axisX;
  const axisY = (state.input.up ? -1 : 0) + (state.input.down ? 1 : 0) + state.input.axisY;

  player.vx += axisX * PLAYER_ACCEL * dt;
  player.vy += axisY * PLAYER_ACCEL * dt;
  player.vx = clamp(player.vx, -PLAYER_SPEED, PLAYER_SPEED);
  player.vy = clamp(player.vy, -PLAYER_SPEED, PLAYER_SPEED);

  if (axisX === 0) player.vx *= PLAYER_DECEL;
  if (axisY === 0) player.vy *= PLAYER_DECEL;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, PLAYER_RADIUS + 8, zones.width - PLAYER_RADIUS - 8);
  player.y = clamp(player.y, zones.boundaryY + PLAYER_RADIUS + 8, zones.height - PLAYER_RADIUS - 8);

  if (state.input.fire && !player.charging && now >= player.nextShotAt) {
    player.nextShotAt = now + PLAYER_SHOT_COOLDOWN_MS;
    firePlayerSpread();
  }

  if (player.flashFrames > 0) {
    player.flashFrames -= 1;
  }
}

function firePlayerSpread() {
  const cap = isTouchDevice ? MAX_GREEN_BULLETS_MOBILE : MAX_GREEN_BULLETS_DESKTOP;
  if (state.greenBullets.length >= cap) return;

  const angles = [-0.22, -0.11, 0, 0.11, 0.22];
  for (const a of angles) {
    const vx = Math.sin(a) * PLAYER_BULLET_SPEED;
    const vy = -Math.cos(a) * PLAYER_BULLET_SPEED;
    state.greenBullets.push(makeBullet('green', state.player.x, state.player.y - PLAYER_RADIUS, vx, vy, PLAYER_BULLET_W, PLAYER_BULLET_H, 1));
  }
}

function fireChargedShot() {
  const cap = isTouchDevice ? MAX_GREEN_BULLETS_MOBILE : MAX_GREEN_BULLETS_DESKTOP;
  if (state.greenBullets.length >= cap) return;

  state.greenBullets.push(
    makeBullet(
      'green',
      state.player.x,
      state.player.y - PLAYER_RADIUS,
      0,
      -CHARGED_BULLET_SPEED,
      CHARGED_BULLET_W,
      CHARGED_BULLET_H,
      5,
      { charged: true },
    ),
  );
}

function getPlayerFleetFormationTarget(index) {
  const row = Math.floor(index / 10);
  const col = index % 10;
  const spacingX = 22;
  const spacingY = 28;
  const totalWidth = spacingX * 9;
  const baseX = state.player.x - totalWidth / 2;
  const baseY = state.player.y + 110;
  return {
    x: baseX + col * spacingX,
    y: baseY - row * spacingY,
  };
}

function getAiFighterTarget(fighter, idxInOwner, owner) {
  const line = Math.floor(idxInOwner / 5);
  const col = idxInOwner % 5;
  const spread = 17;
  return {
    x: owner.x - spread * 2 + col * spread,
    y: owner.y - 24 - line * 18,
  };
}

function updateGreenFighters(dt, now) {
  const pathTick = state.frameCount % 3 === 0;
  const zones = state.zones;
  const broadcastOrder = state.broadcast.active ? state.broadcast.order : null;
  const hasBroadcastOrder = broadcastOrder === 'ATTACK' || broadcastOrder === 'GROUP_SHIELD';

  if (state.broadcast.active && state.broadcast.order === 'GROUP_SHIELD') {
    const clusterTargets = {
      ALPHA: { x: state.player.x, y: state.player.y - 55 },
      BETA: { x: state.player.x - 55, y: state.player.y },
      DELTA: { x: state.player.x + 55, y: state.player.y },
      OMEGA: { x: state.player.x, y: state.player.y + 55 },
    };
    for (const ship of state.aiMotherships) {
      const t = clusterTargets[ship.callsign];
      if (!t || ship.dead) continue;
      ship.x += (t.x - ship.x) * 0.08 * dt;
      ship.y += (t.y - ship.y) * 0.08 * dt;
    }
  } else {
    for (const ship of state.aiMotherships) {
      if (
        ship.dead
        || !Number.isFinite(ship.returnUntil)
        || !Number.isFinite(ship.returnStartX)
        || !Number.isFinite(ship.returnStartY)
      ) continue;
      const progress = clamp((nowMs() - (ship.returnUntil - 800)) / 800, 0, 1);
      ship.x = ship.returnStartX + ((ship.returnTargetX - ship.returnStartX) * progress);
      ship.y = ship.returnStartY + ((ship.returnTargetY - ship.returnStartY) * progress);
      if (progress >= 1) {
        ship.returnUntil = 0;
      }
    }
  }

  const alivePlayerFleet = state.playerFleet.filter((f) => !f.dead);
  const playerOrder = hasBroadcastOrder ? broadcastOrder : state.playerFleetOrder;
  alivePlayerFleet.forEach((f, i) => {
    updateSingleGreenFighter(f, dt, now, pathTick, zones, getPlayerFleetFormationTarget(i), playerOrder, null);
  });

  for (const ship of state.aiMotherships) {
    const shipOrder = hasBroadcastOrder ? broadcastOrder : ship.order;
    const owned = state.aiFighters.filter((f) => !f.dead && f.ownerId === ship.callsign);
    owned.forEach((f, i) => {
      const target = getAiFighterTarget(f, i, ship);
      updateSingleGreenFighter(f, dt, now, pathTick, zones, target, shipOrder, ship);
    });

    if (!ship.dead) {
      if (owned.length < ship.onScreenMax && ship.reserve > 0 && now >= ship.nextRespawnAt) {
        const spawn = makeGreenFighter('ai', ship.callsign, ship.x, ship.y - 26);
        spawn.order = ship.order;
        state.aiFighters.push(spawn);
        ship.reserve -= 1;
        ship.nextRespawnAt = now + 1500;
      }

      if (now >= ship.nextShotAt) {
        ship.nextShotAt = now + 900;
        const cap = isTouchDevice ? MAX_GREEN_BULLETS_MOBILE : MAX_GREEN_BULLETS_DESKTOP;
        if (state.greenBullets.length < cap) {
          state.greenBullets.push(makeBullet('green', ship.x, ship.y - AI_RADIUS, 0, -8.5, PLAYER_BULLET_W, PLAYER_BULLET_H, 1));
        }
      }
    }
  }

  applyGreenFighterSeparation();
}

function updateSingleGreenFighter(f, dt, now, pathTick, zones, formationTarget, order, ownerShip) {
  if (f.dead) return;

  if (f.finalAssaultTroop) {
    const wave = Math.sin((now * 0.002) + (f.scatterSeed || 0));
    f.targetX = (zones.width / 2) + wave * 140;
    f.targetY = zones.redTop + 22;
    if (pathTick) {
      f.vx += Math.sign(f.targetX - f.x) * 0.34;
      f.vy += Math.sign(f.targetY - f.y) * 0.38;
    }
    f.vx = clamp(f.vx * 0.92, -3.2, 3.2);
    f.vy = clamp(f.vy * 0.92, -3.2, 3.2);
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.x = clamp(f.x, 10, zones.width - 10);
    f.y = clamp(f.y, zones.redTop + 8, zones.height - 10);
    if (now >= f.nextShotAt) {
      f.nextShotAt = now + 360;
      state.bombs.push(makeBomb(f.x, f.y));
    }
    return;
  }

  if (f.kamikazeMode) {
    f.targetX = f.x;
    f.targetY = zones.planetArcY + 4;
    if (pathTick) {
      f.vy -= 0.8;
    }
    const kamikazeSpeed = GREEN_FIGHTER_SPEED * 2;
    f.vx = clamp(f.vx * 0.9, -kamikazeSpeed, kamikazeSpeed);
    f.vy = clamp(f.vy * 0.9, -kamikazeSpeed, kamikazeSpeed);
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.x = clamp(f.x, 8, zones.width - 8);
    if (f.y <= zones.planetArcY + 8) {
      state.flashRings.push(makeFlashRing(f.x, f.y, 55, 400, 300));
      applyPlanetDamage(300);
      destroyRedInRadius(f.x, f.y, 40);
      for (const ally of getAllGreenFighters()) {
        if (ally === f || ally.dead) continue;
        if (circlesOverlap(ally.x, ally.y, 8, f.x, f.y, 20)) {
          damageGreenFighter(ally);
        }
      }
      f.dead = true;
      return;
    }
    return;
  }

  const lockEligible = state.mode === 'spectator'
    || order === 'ATTACK'
    || (ownerShip && order === 'ADVANCE');
  const bossTarget = getInvasionBossTarget(f, lockEligible);

  if (state.mode === 'spectator') {
    const nearestRed = bossTarget || findNearestRed(f.x, f.y);
    if (nearestRed) {
      f.targetX = nearestRed.x;
      f.targetY = nearestRed.y;
      if (pathTick) {
        f.vx += Math.sign(f.targetX - f.x) * 0.4;
        f.vy += Math.sign(f.targetY - f.y) * 0.4;
      }
      if (Math.random() < 0.04) {
        f.vx += randomInRange(-0.5, 0.5);
      }
    } else {
      f.targetX = f.x;
      f.targetY = zones.planetBottom - 4;
      if (pathTick) {
        f.vy -= 0.35;
      }
    }
  } else if (f.invader) {
    const arcY = zones.planetArcY;
    if (f.invadePhase === 'up') {
      f.targetX = state.player.x + randomInRange(-60, 60);
      f.targetY = arcY + 8;
      if (f.y <= arcY + 10) {
        f.invadePhase = 'pause';
        f.invadePauseUntil = now + INVADE_PAUSE_MS;
      }
    } else if (f.invadePhase === 'pause') {
      f.vx *= 0.8;
      f.vy *= 0.8;
      if (now >= f.invadePauseUntil) {
        f.invadePhase = 'return';
        applyPlanetDamage(INVADE_PLANET_DAMAGE);
        state.score += INVADE_PLANET_DAMAGE;
        state.planetBlasts.push(makePlanetBlast(f.x, zones.planetArcY + 3));
        destroyRedInRadius(f.x, zones.planetArcY + 6, 20);
      }
    } else {
      releaseInvasionBossLock(f);
      f.targetX = formationTarget.x;
      f.targetY = formationTarget.y;
      if (Math.abs(f.x - formationTarget.x) < 12 && Math.abs(f.y - formationTarget.y) < 12) {
        f.invader = false;
        f.invadePhase = 'none';
      }
    }
  } else {
    if (!lockEligible) {
      releaseInvasionBossLock(f);
    }
    f.targetX = formationTarget.x;
    f.targetY = formationTarget.y;

    if (order === 'ATTACK') {
      const nearRed = bossTarget || findNearestRed(f.x, f.y);
      if (nearRed) {
        if (bossTarget) {
          f.targetX = bossTarget.x;
          f.targetY = Math.max(zones.redTop + 10, bossTarget.y - 28);
        } else {
          f.targetX = nearRed.x;
          f.targetY = Math.max(zones.redTop + 10, nearRed.y - 22);
        }
      }
    } else if (order === 'FALL BACK') {
      f.targetY = clamp(formationTarget.y + 42, zones.redTop + 10, zones.height - 18);
    } else if (order === 'FLANK LEFT') {
      f.targetX = clamp(formationTarget.x - 130, 12, zones.width - 12);
    } else if (order === 'FLANK RIGHT') {
      f.targetX = clamp(formationTarget.x + 130, 12, zones.width - 12);
    } else if (order === 'SCATTER') {
      const t = now * 0.001 + f.scatterSeed;
      f.targetX = clamp(f.x + Math.cos(t) * 24, 10, zones.width - 10);
      f.targetY = clamp(f.y + Math.sin(t) * 24, zones.redTop + 10, zones.height - 10);
    } else if (order === 'RECALL') {
      f.targetX = formationTarget.x;
      f.targetY = formationTarget.y;
    } else if (order === 'SHIELD WALL') {
      f.targetY = state.player.y - 54;
    } else if (order === 'ADVANCE') {
      if (bossTarget) {
        f.targetX = bossTarget.x;
        f.targetY = Math.max(zones.redTop + 10, bossTarget.y - 26);
      } else {
        f.targetY = clamp(formationTarget.y - 78, zones.redTop + 28, zones.height - 24);
      }
    } else if (order === 'SUPPORT') {
      f.targetX = clamp(state.player.x + randomInRange(-34, 34), 12, zones.width - 12);
      f.targetY = clamp(state.player.y + randomInRange(-26, 26), zones.redTop + 10, zones.height - 16);
    } else if (order === 'BOMBARD') {
      if (f.bomberAssigned) {
        f.targetY = zones.redTop + 30;
      }
    } else if (order === 'GROUP_SHIELD') {
      const all = getAllGreenFighters();
      const idx = all.indexOf(f);
      const innerCount = Math.min(20, all.length);
      const isInner = idx < innerCount;
      const slot = isInner ? idx : (idx - innerCount);
      const slotCount = isInner ? Math.max(1, innerCount) : Math.max(1, all.length - innerCount);
      const angle = (slot / slotCount) * Math.PI * 2;
      const radius = isInner ? 90 : 130;
      f.targetX = state.player.x + Math.cos(angle) * radius;
      f.targetY = state.player.y + Math.sin(angle) * radius;
    }

    if (ownerShip?.dead) {
      f.order = 'SCATTER';
      f.targetX = clamp(f.x + randomInRange(-28, 28), 10, zones.width - 10);
      f.targetY = clamp(f.y + randomInRange(-28, 28), zones.redTop + 10, zones.height - 10);
    }
  }

  if (order === 'BOMBARD' && f.bomberAssigned && f.y <= zones.boundaryY - 2) {
    f.bomber = true;
    f.bomberPermanentOneHp = true;
    f.hp = Math.min(f.hp, 1);
    f.maxHp = Math.max(f.maxHp, 2);
    f.armorBroken = true;
    f.bomberPhaseOffset = f.bomberPhaseOffset || randomInRange(0, Math.PI * 2);
  }

  if (f.bomber && order === 'BOMBARD') {
    f.targetY = clamp(f.y + Math.sin(now * 0.001 + f.bomberPhaseOffset) * 2, zones.redTop + 16, zones.boundaryY - 6);
    f.x += Math.sin(now * 0.001 + f.bomberPhaseOffset) * 1.2;
    if (now >= f.bomberNextDropAt) {
      state.bombs.push(makeBomb(f.x, f.y));
      f.bomberDropInterval = randomInRange(BOMB_MIN_MS, BOMB_MAX_MS);
      f.bomberNextDropAt = now + f.bomberDropInterval;
    }
  }

  if (pathTick) {
    f.vx += Math.sign(f.targetX - f.x) * 0.28;
    f.vy += Math.sign(f.targetY - f.y) * 0.28;
  }

  const speedCap = f.invader ? 3.6 : GREEN_FIGHTER_SPEED;
  f.vx = clamp(f.vx * 0.92, -speedCap, speedCap);
  f.vy = clamp(f.vy * 0.92, -speedCap, speedCap);

  f.x += f.vx * dt;
  f.y += f.vy * dt;

  f.x = clamp(f.x, 8, zones.width - 8);
  let topClamp = 8;
  if (f.invader) {
    topClamp = 6;
  } else if (order === 'BOMBARD') {
    topClamp = zones.redTop + 6;
  } else if (order === 'ADVANCE') {
    topClamp = zones.redTop + 20;
  }
  f.y = clamp(f.y, topClamp, zones.height - 8);

  if (f.shieldMode) {
    return;
  }

  if (now >= f.nextShotAt) {
    f.nextShotAt = now + randomInRange(GREEN_FIGHTER_FIRE_MS, GREEN_FIGHTER_FIRE_MS + 450);
    const cap = isTouchDevice ? MAX_GREEN_BULLETS_MOBILE : MAX_GREEN_BULLETS_DESKTOP;
    if (state.greenBullets.length < cap) {
      const target = findNearestRed(f.x, f.y);
      if (target) {
        const dx = target.x - f.x;
        const dy = target.y - f.y;
        const len = Math.hypot(dx, dy) || 1;
        const vx = (dx / len) * GREEN_FIGHTER_BULLET_SPEED;
        const vy = (dy / len) * GREEN_FIGHTER_BULLET_SPEED;
        const damage = f.attackDamageMultiplier || 1;
        state.greenBullets.push(makeBullet('green', f.x, f.y - 8, vx, vy, GREEN_FIGHTER_BULLET_W, GREEN_FIGHTER_BULLET_H, damage));
      } else if (order === 'BOMBARD' || state.mode === 'spectator') {
        const damage = f.attackDamageMultiplier || 1;
        state.greenBullets.push(makeBullet('green', f.x, f.y - 8, 0, -GREEN_FIGHTER_BULLET_SPEED, GREEN_FIGHTER_BULLET_W, GREEN_FIGHTER_BULLET_H, damage));
      }
    }
  }
}

function findNearestRed(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const red of state.redFighters) {
    if (red.dead) continue;
    const d = (red.x - x) ** 2 + (red.y - y) ** 2;
    if (d < bestDist) {
      best = red;
      bestDist = d;
    }
  }
  for (const boss of state.bosses) {
    if (!boss.active || boss.dead) continue;
    const d = (boss.x - x) ** 2 + (boss.y - y) ** 2;
    if (d < bestDist) {
      best = boss;
      bestDist = d;
    }
  }
  return best;
}

function findNearestGreenMothership(x, y) {
  const candidates = [];
  if (!state.player.dead) candidates.push(state.player);
  for (const ship of state.aiMotherships) {
    if (!ship.dead) candidates.push(ship);
  }
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function findNearestInvader(x, y, maxDistance = Infinity) {
  let best = null;
  let bestDist = maxDistance * maxDistance;
  for (const fighter of state.playerFleet) {
    if (fighter.dead || !fighter.invader) continue;
    const dx = fighter.x - x;
    const dy = fighter.y - y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      best = fighter;
      bestDist = dist;
    }
  }
  return best;
}

function getRedTargetPoint(red) {
  const livingShips = [];
  if (!state.player.dead) {
    livingShips.push(state.player);
  }
  for (const ship of state.aiMotherships) {
    if (!ship.dead) {
      livingShips.push(ship);
    }
  }

  if (livingShips.length === 0) {
    return null;
  }

  const index = Math.floor(red.driftSeed * 1000) % livingShips.length;
  const primary = livingShips[index];
  const nearest = findNearestGreenMothership(red.x, red.y);
  const target = nearest && Math.abs(nearest.x - red.x) < 120 ? nearest : primary;
  return {
    x: clamp(target.x + red.targetBiasX, 24, state.zones.width - 24),
    y: target.y,
    entity: target,
  };
}

function updateRedFighters(dt, now) {
  const zones = state.zones;
  const pathTick = state.frameCount % 3 === 0;

  for (const red of state.redFighters) {
    if (red.dead) continue;

    if (red.type === 'defender') {
      const t = now * 0.001 + red.driftSeed;
      const patrolX = red.anchorX + Math.sin(t * 0.9) * 42;
      const patrolY = red.anchorY + Math.cos(t * 0.7) * 16;
      red.vx += (patrolX - red.x) * 0.028;
      red.vy += (patrolY - red.y) * 0.02;

      const target = findNearestInvader(red.x, red.y, 150);
      if (target && pathTick) {
        red.vx += Math.sign(target.x - red.x) * 0.45;
        red.vy += Math.sign(target.y - red.y) * 0.32;
      } else if (pathTick) {
        red.vx += Math.sign(red.anchorX - red.x) * 0.12;
        red.vy += Math.sign(red.anchorY - red.y) * 0.08;
      }
    } else {
      const targetPoint = getRedTargetPoint(red);
      if (targetPoint && pathTick) {
        red.vx += Math.sign(targetPoint.x - red.x) * 0.34;
        red.vy += Math.sign(targetPoint.y - red.y) * 0.5;
      }

      const invader = findNearestInvader(red.x, red.y, 180);
      if (invader && pathTick) {
        red.vx += Math.sign(invader.x - red.x) * 0.22;
        red.vy += Math.sign(invader.y - red.y) * 0.28;
      }

      if (red.y > zones.greenTop + 80) {
        red.vy -= 0.45;
      }
    }

    red.vx = clamp(red.vx * 0.92, -RED_FIGHTER_SPEED, RED_FIGHTER_SPEED);
    red.vy = clamp(red.vy * 0.92, -RED_FIGHTER_SPEED, RED_FIGHTER_SPEED);
    red.x += red.vx * dt;
    red.y += red.vy * dt;

    red.x = clamp(red.x, 10, zones.width - 10);
    red.y = clamp(red.y, zones.redTop - 8, zones.greenBottom - 10);

    if (now >= red.nextShotAt) {
      red.nextShotAt = now + randomInRange(RED_FIGHTER_SHOT_MIN_MS, RED_FIGHTER_SHOT_MAX_MS);
      const cap = isTouchDevice ? MAX_RED_BULLETS_MOBILE : MAX_RED_BULLETS_DESKTOP;
      if (state.redBullets.length < cap) {
        const target = pickGreenTargetForRed(red);
        if (target) {
          const dx = target.x - red.x;
          const dy = target.y - red.y;
          const distance = Math.hypot(dx, dy) || 1;
          if (distance <= RED_FIGHTER_ATTACK_RANGE || target.invader || target.callsign || target === state.player) {
            const vx = (dx / distance) * RED_FIGHTER_BULLET_SPEED;
            const vy = (dy / distance) * RED_FIGHTER_BULLET_SPEED;
            state.redBullets.push(makeBullet('red', red.x, red.y + 8, vx, vy, RED_FIGHTER_BULLET_W, RED_FIGHTER_BULLET_H, 1));
          }
        }
      }
    }
  }
}

function pickGreenTargetForRed(red) {
  const invader = findNearestInvader(red.x, red.y, 180);
  if (invader) return invader;

  const candidates = [];
  if (!state.player.dead) candidates.push(state.player);
  for (const ship of state.aiMotherships) {
    if (!ship.dead) candidates.push(ship);
  }
  for (const f of state.playerFleet) {
    if (!f.dead && Math.abs(f.x - red.x) < 150 && Math.random() < 0.12) candidates.push(f);
  }
  for (const f of state.aiFighters) {
    if (!f.dead && Math.abs(f.x - red.x) < 150 && Math.random() < 0.08) candidates.push(f);
  }
  if (candidates.length === 0) return null;
  const seededIndex = Math.floor(red.driftSeed * 1000) % candidates.length;
  return candidates[seededIndex];
}

function updateBosses(dt, now) {
  const zones = state.zones;
  for (const boss of state.bosses) {
    if (!boss.active || boss.dead) continue;
    if (!boss.entered) {
      boss.y += 0.8 * dt;
      if (boss.y >= boss.targetY) {
        boss.y = boss.targetY;
        boss.entered = true;
      }
    } else {
      if (state.bossBreakoutActive || boss.breakout) {
        boss.breakout = true;
        const lineY = zones.boundaryY - 14;
        const target = findNearestGreenMothership(boss.x, boss.y);
        const chaseX = target ? target.x : (zones.width / 2);
        const drift = Math.sin(now * 0.0014 + boss.patrolOffset) * 26;
        const targetX = clamp(chaseX + drift, 24, zones.width - 24);
        boss.x += clamp(targetX - boss.x, -BOSS_BREAKOUT_SPEED * dt, BOSS_BREAKOUT_SPEED * dt);
        boss.y += clamp(lineY - boss.y, -BOSS_BREAKOUT_SPEED * dt, BOSS_BREAKOUT_SPEED * dt);
      } else {
        boss.y = Math.min(zones.redTop + 56, boss.y + (0.06 * dt));
      }
    }

    boss.fireTimer += dt * 16.67;
    if (boss.fireTimer >= boss.fireInterval) {
      boss.fireTimer = 0;
      boss.fireInterval = state.finalAssault?.active
        ? FINAL_ASSAULT_BOSS_FIRE_MS
        : randomInRange(BOSS_FIRE_MIN_MS, BOSS_FIRE_MAX_MS);
      const cap = isTouchDevice ? MAX_RED_BULLETS_MOBILE : MAX_RED_BULLETS_DESKTOP;
      if (state.redBullets.length + 6 <= cap) {
        const spreads = [-0.36, -0.2, -0.08, 0.08, 0.2, 0.36];
        for (const a of spreads) {
          state.redBullets.push(makeBullet('red', boss.x, boss.y + 12, Math.sin(a) * BOSS_BULLET_SPEED, Math.cos(a) * BOSS_BULLET_SPEED, BOSS_BULLET_W, BOSS_BULLET_H, 2.4));
        }
      }
    }

    if (boss.flashFrames > 0) {
      boss.flashFrames -= 1;
    }
  }
}

function updateBullets(dt) {
  const { zones } = state;

  for (const b of state.greenBullets) {
    if (b.dead) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.y < zones.planetBottom) {
      if (applyPlanetDamage(PLANET_BULLET_DAMAGE)) {
        state.score += SCORE_PLANET_TICK;
      }
      b.dead = true;
      continue;
    }

    if (b.x < -20 || b.x > zones.width + 20 || b.y < -30 || b.y > zones.height + 30) {
      b.dead = true;
    }
  }

  for (const b of state.redBullets) {
    if (b.dead) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < -20 || b.x > zones.width + 20 || b.y < -30 || b.y > zones.height + 30) {
      b.dead = true;
    }
  }

  for (const bomb of state.bombs) {
    if (bomb.dead) continue;
    bomb.y += bomb.vy * dt;
    if (bomb.y <= zones.planetBottom) {
      if (applyPlanetDamage(BOMB_DAMAGE_DOT)) {
        state.score += SCORE_PLANET_TICK;
      }
      if (bomb.y <= zones.planetArcY + 8) {
        applyPlanetDamage(BOMB_DAMAGE_HIT);
        state.flashRings.push(makeFlashRing(bomb.x, bomb.y, 20, 200, 180));
        bomb.dead = true;
      }
    }
    if (bomb.y > zones.height + 20) {
      bomb.dead = true;
    }
  }

  state.greenBullets = state.greenBullets.filter((b) => !b.dead);
  state.redBullets = state.redBullets.filter((b) => !b.dead);
  state.bombs = state.bombs.filter((b) => !b.dead);
}

function applyBackspaceLaser(dt) {
  if (state.laserFramesRemaining <= 0) {
    return;
  }

  state.laserFramesRemaining -= 1;
  const aliveFighters = getAliveGreenFighterCount();
  const dps = 15 + aliveFighters * 0.05;
  const tickDamage = (dps / 60) * dt;
  const x = state.player.x;

  for (const red of state.redFighters) {
    if (red.dead) continue;
    if (Math.abs(red.x - x) <= 18) {
      red.dead = true;
      onRedKilled(red.x, red.y, false);
    }
  }

  for (const boss of state.bosses) {
    if (!boss.active || boss.dead) continue;
    const left = boss.x - BOSS_W / 2;
    const right = boss.x + BOSS_W / 2;
    if (x >= left && x <= right) {
      boss.hp -= tickDamage;
      boss.flashFrames = 2;
      if (boss.hp <= 0 && !boss.dead) {
        onBossKilled(boss);
      }
    }
  }

  for (const b of state.redBullets) {
    if (Math.abs(b.x - x) <= 12) {
      b.dead = true;
    }
  }
}

function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy <= (ar + br) * (ar + br);
}

function rectCircleHit(rect, cx, cy, r) {
  const testX = clamp(cx, rect.left, rect.right);
  const testY = clamp(cy, rect.top, rect.bottom);
  const dx = cx - testX;
  const dy = cy - testY;
  return dx * dx + dy * dy <= r * r;
}

function triggerBomberDeathExplosion(fighter) {
  if (!fighter || fighter.dead) return;
  state.flashRings.push(makeFlashRing(fighter.x, fighter.y, 35, 300, 200));
  destroyRedInRadius(fighter.x, fighter.y, 25);
  if (fighter.y <= state.zones.planetArcY + 16) {
    applyPlanetDamage(100);
  }
  currentContext.audio?.play?.('enemyDeath');
}

function damageGreenFighter(fighter, amount = 1) {
  if (!fighter || fighter.dead) return;
  fighter.hp -= amount;
  fighter.maxHp = Math.max(fighter.maxHp ?? FIGHTER_DEFAULT_HP, FIGHTER_DEFAULT_HP);
  if (fighter.hp <= 0) {
    releaseInvasionBossLock(fighter);
    if (fighter.bomber && fighter.y < state.zones.boundaryY) {
      triggerBomberDeathExplosion(fighter);
    }
    fighter.dead = true;
    fighter.bomber = false;
    fighter.bomberAssigned = false;
    fighter.kamikazeMode = false;
    if (fighter.finalAssaultTroop && state.finalAssault?.active) {
      state.finalAssault.troopsLost += 1;
    }
    state.fighterLosses += 1;
    return;
  }
  if (fighter.hp < fighter.maxHp) {
    fighter.armorBroken = true;
  }
}

function damageMothership(ship, amount) {
  if (ship.dead) return;
  ship.hp -= amount;
  if (ship.hp <= 0) {
    ship.dead = true;
    state.mothershipLosses += 1;
    showStatusNotice(`${ship.callsign || 'YOU'} DESTROYED`, 2000);
    if (ship.callsign) {
      for (const f of state.aiFighters) {
        if (!f.dead && f.ownerId === ship.callsign) {
          f.order = 'SCATTER';
        }
      }
      ship.reserve = 0;
    } else {
      state.player.dead = true;
    }
  }
}

function onRedKilled(x, y, rollDrop = true) {
  state.redKilled += 1;
  state.score += SCORE_RED_KILL;
  if (rollDrop) {
    maybeSpawnDrop(x, y);
  }
}

function destroyRedInRadius(x, y, radius) {
  for (const red of state.redFighters) {
    if (red.dead) continue;
    if (circlesOverlap(red.x, red.y, 8, x, y, radius)) {
      red.dead = true;
      onRedKilled(red.x, red.y, false);
    }
  }
}

function resolveCollisions() {
  for (const bullet of state.greenBullets) {
    if (bullet.dead) continue;
    if (bullet.meta?.charged) {
      let hitAny = false;
      for (const red of state.redFighters) {
        if (red.dead) continue;
        if (circlesOverlap(red.x, red.y, 8, bullet.x, bullet.y, 12)) {
          red.hp -= 1;
          hitAny = true;
          if (red.hp <= 0) {
            red.dead = true;
            onRedKilled(red.x, red.y, false);
          }
        }
      }
      if (hitAny) {
        destroyRedInRadius(bullet.x, bullet.y, 20);
      }
      for (const boss of state.bosses) {
        if (!boss.active || boss.dead) continue;
        const box = { left: boss.x - BOSS_W / 2, right: boss.x + BOSS_W / 2, top: boss.y - BOSS_H / 2, bottom: boss.y + BOSS_H / 2 };
        if (rectCircleHit(box, bullet.x, bullet.y, 8)) {
          boss.hp -= 5;
          boss.flashFrames = 3;
          hitAny = true;
          if (boss.hp <= 0) {
            onBossKilled(boss);
          }
        }
      }
      if (hitAny) {
        bullet.dead = true;
      }
    } else {
      for (const red of state.redFighters) {
        if (red.dead) continue;
        const box = { left: red.x - RED_FIGHTER_W / 2, right: red.x + RED_FIGHTER_W / 2, top: red.y - RED_FIGHTER_H / 2, bottom: red.y + RED_FIGHTER_H / 2 };
        if (bullet.x >= box.left && bullet.x <= box.right && bullet.y >= box.top && bullet.y <= box.bottom) {
          bullet.dead = true;
          red.hp -= (bullet.damage ?? 1);
          if (red.hp <= 0) {
            red.dead = true;
            onRedKilled(red.x, red.y);
          }
          break;
        }
      }
      if (bullet.dead) continue;
      for (const boss of state.bosses) {
        if (!boss.active || boss.dead) continue;
        const box = { left: boss.x - BOSS_W / 2, right: boss.x + BOSS_W / 2, top: boss.y - BOSS_H / 2, bottom: boss.y + BOSS_H / 2 };
        if (bullet.x >= box.left && bullet.x <= box.right && bullet.y >= box.top && bullet.y <= box.bottom) {
          boss.hp -= bullet.damage;
          boss.flashFrames = 2;
          bullet.dead = true;
          if (boss.hp <= 0) {
            onBossKilled(boss);
          }
          break;
        }
      }
    }
  }

  for (const bullet of state.redBullets) {
    if (bullet.dead) continue;

    if (!state.player.dead && circlesOverlap(state.player.x, state.player.y, PLAYER_RADIUS, bullet.x, bullet.y, 3)) {
      bullet.dead = true;
      damageMothership(state.player, bullet.damage);
      state.player.flashFrames = 3;
      continue;
    }

    for (const ship of state.aiMotherships) {
      if (ship.dead) continue;
      if (circlesOverlap(ship.x, ship.y, AI_RADIUS, bullet.x, bullet.y, 3)) {
        bullet.dead = true;
        damageMothership(ship, bullet.damage);
        break;
      }
    }

    if (bullet.dead) continue;

    for (const f of state.playerFleet) {
      if (f.dead) continue;
      if (circlesOverlap(f.x, f.y, 8, bullet.x, bullet.y, 2)) {
        bullet.dead = true;
        damageGreenFighter(f);
        break;
      }
    }

    if (bullet.dead) continue;

    for (const f of state.aiFighters) {
      if (f.dead) continue;
      if (circlesOverlap(f.x, f.y, 8, bullet.x, bullet.y, 2)) {
        bullet.dead = true;
        damageGreenFighter(f);
        break;
      }
    }
  }

  for (const red of state.redFighters) {
    if (red.dead || red.type !== 'diver') continue;
    if (!state.player.dead && circlesOverlap(red.x, red.y, 8, state.player.x, state.player.y, PLAYER_RADIUS)) {
      damageMothership(state.player, 3);
      red.vy = -Math.abs(red.vy) - 0.6;
      red.y -= 8;
    }
    for (const ship of state.aiMotherships) {
      if (ship.dead) continue;
      if (circlesOverlap(red.x, red.y, 8, ship.x, ship.y, AI_RADIUS)) {
        damageMothership(ship, 3);
        red.vy = -Math.abs(red.vy) - 0.6;
        red.y -= 8;
      }
    }
  }

  if (state.powerups?.length) {
    const kept = [];
    for (const pu of state.powerups) {
      pu.y += (pu.vy ?? 0.9);
      if (pu.y > state.zones.height + 16) {
        continue;
      }
      if (!state.player.dead && circlesOverlap(pu.x, pu.y, pu.radius, state.player.x, state.player.y, PLAYER_RADIUS)) {
        if (pu.type === currentContext.BACKSPACE_TYPE) {
          state.backspaceCount += 1;
        } else if (pu.type === 'fleet') {
          addPlayerFleet(8);
        } else if (pu.type === 'multi') {
          for (let i = 0; i < 3; i += 1) {
            firePlayerSpread();
          }
        } else if (pu.type === 'shield') {
          state.player.hp = Math.min(PLAYER_HP_MAX, state.player.hp + 10);
        }
      } else {
        kept.push(pu);
      }
    }
    state.powerups = kept;
  }

  state.greenBullets = state.greenBullets.filter((b) => !b.dead);
  state.redBullets = state.redBullets.filter((b) => !b.dead);
  state.redFighters = state.redFighters.filter((r) => !r.dead);
  state.playerFleet = state.playerFleet.filter((f) => !f.dead);
  state.aiFighters = state.aiFighters.filter((f) => !f.dead);
}

function addPlayerFleet(count) {
  const current = state.playerFleet.length;
  const toAdd = Math.max(0, Math.min(count, PLAYER_FLEET_MAX - current));
  for (let i = 0; i < toAdd; i += 1) {
    state.playerFleet.push(makeGreenFighter('player', 'YOU', state.player.x, state.player.y + 20));
  }
}

function updateEffects(now) {
  state.shockwaves = state.shockwaves.filter((w) => {
    const t = clamp((w.until - now) / 380, 0, 1);
    w.radius = w.maxRadius * (1 - t);
    return now < w.until;
  });

  state.planetBlasts = state.planetBlasts.filter((w) => {
    const t = clamp((w.until - now) / 300, 0, 1);
    w.radius = w.maxRadius * (1 - t);
    return now < w.until;
  });

  state.flashRings = state.flashRings.filter((ring) => {
    if (now >= ring.until) {
      return false;
    }
    const growProgress = clamp(1 - ((ring.growUntil - now) / Math.max(1, ring.growUntil - (ring.until - 200))), 0, 1);
    ring.radius = ring.maxRadius * growProgress;
    return true;
  });
}

function updateBroadcastState(now) {
  if (!state) return;
  if (!state.kamikaze.forceReady && state.kamikaze.cooldownUntil > 0 && now >= state.kamikaze.cooldownUntil) {
    state.kamikaze.forceReady = true;
  }

  if (state.broadcast.active && now >= state.broadcast.until) {
    endBroadcast('timeout');
  }

  if (commandModuleEl?.panel && state.broadcast.flashUntil > now) {
    commandModuleEl.panel.style.borderColor = 'rgba(255,80,60,0.78)';
  } else if (commandModuleEl?.panel) {
    commandModuleEl.panel.style.borderColor = 'rgba(255,255,255,0.16)';
  }

  const broadcastVisible = commandModuleEl?.panel?.style.display !== 'none' && state.selectedTab === 'BROADCAST';
  if (broadcastVisible) {
    const cooldownSec = Math.max(0, Math.ceil((state.kamikaze.cooldownUntil - now) / 1000));
    const countdownTick = cooldownSec !== state.lastBroadcastCooldownSecond;
    const activePulse = state.broadcast.active && now >= (state.nextBroadcastUiRefreshAt ?? 0);
    if (countdownTick || activePulse) {
      refreshCommandModule();
      state.lastBroadcastCooldownSecond = cooldownSec;
      state.nextBroadcastUiRefreshAt = now + (state.broadcast.active ? 400 : 1000);
    }
  }
}

function ensureCombatUi() {
  if (!state || state.combatUiReady) return;
  createCommandModule();
  createModeButtons();
  createStatusNotice();
  createBackspaceUi();
  state.combatUiReady = true;
}

function startCombat() {
  if (!state || state.combatEnabled) return;
  state.sequencePhase = 'combat';
  state.sequencePhaseStartedAt = nowMs();
  state.combatEnabled = true;
  state.mode = 'active';
  state.combatStartAt = nowMs();
  state.planetPulseUntil = nowMs() + 300;
  state.redWarmupStartAt = nowMs();
  state.redWarmupUntil = nowMs() + 3500;
  state.hudFadeUntil = nowMs() + 400;

  if (preBattleUi?.lastChanceLabel?.parentElement) {
    preBattleUi.lastChanceLabel.parentElement.removeChild(preBattleUi.lastChanceLabel);
  }
  if (preBattleUi?.lastChanceButton?.parentElement) {
    preBattleUi.lastChanceButton.parentElement.removeChild(preBattleUi.lastChanceButton);
  }
  if (preBattleUi?.root?.parentElement) {
    preBattleUi.root.parentElement.removeChild(preBattleUi.root);
  }
  preBattleUi = null;

  ensureCombatUi();
  currentContext.hud?.showHUD?.();
}

function updateSequence(now) {
  if (!state || !preBattleUi) return;
  const elapsed = now - state.sequenceStartedAt;

  if (state.sequencePhase === 'command-screen') {
    if (elapsed >= 400) preBattleUi.planetName.style.opacity = '1';
    if (elapsed >= 1200) preBattleUi.cmd.style.opacity = '1';
    if (elapsed >= 2000) preBattleUi.invade.style.opacity = '1';
    if (elapsed >= 2600) preBattleUi.back.style.opacity = '1';
    return;
  }

  if (state.sequencePhase === 'command-fadeout') {
    preBattleUi.root.style.transition = 'opacity 500ms ease';
    preBattleUi.root.style.opacity = '0';
    if (now - state.sequencePhaseStartedAt >= 500) {
      preBattleUi.root.style.display = 'none';
      state.sequencePhase = 'assembly';
      state.sequencePhaseStartedAt = now;
      state.ambientRamp = {
        from: 0,
        to: state.ambientTargetVolume,
        startedAt: now,
        duration: 2000,
        active: true,
      };
    }
    return;
  }

  if (state.sequencePhase === 'assembly') {
    const seq = now - state.sequencePhaseStartedAt;
    if (seq >= 4000 && !preBattleUi.lastChanceLabel) {
      state.sequencePhase = 'last-chance';
      state.sequencePhaseStartedAt = now;
      createLastChanceUi();
    }
    return;
  }

  if (state.sequencePhase === 'last-chance') {
    const seq = now - state.sequencePhaseStartedAt;
    if (seq >= 200 && preBattleUi.lastChanceLabel) preBattleUi.lastChanceLabel.style.opacity = '1';
    if (seq >= 400 && preBattleUi.lastChanceButton) preBattleUi.lastChanceButton.style.opacity = '1';
    if (seq >= 3400) {
      if (preBattleUi.lastChanceLabel) preBattleUi.lastChanceLabel.style.opacity = '0';
      if (preBattleUi.lastChanceButton) preBattleUi.lastChanceButton.style.opacity = '0';
      state.sequencePhase = 'last-chance-fade';
      state.sequencePhaseStartedAt = now;
    }
    return;
  }

  if (state.sequencePhase === 'last-chance-fade') {
    if (now - state.sequencePhaseStartedAt >= 400) {
      startCombat();
    }
  }
}

function applyAssemblyMotion(now, dt) {
  if (!state || state.sequencePhase !== 'assembly') {
    return;
  }

  const elapsed = now - state.sequencePhaseStartedAt;
  const zones = state.zones;
  const playerTargetY = zones.greenBottom - 85;

  const moveRise = (entity, startDelay, duration, targetY) => {
    const local = elapsed - startDelay;
    if (local < 0) return;
    const t = clamp(local / duration, 0, 1);
    const eased = 1 - ((1 - t) * (1 - t));
    const startY = zones.height + 40;
    entity.y = startY + ((targetY - startY) * eased);
  };

  moveRise(state.player, 0, 800, playerTargetY);

  const aiOrder = ['ALPHA', 'BETA', 'DELTA', 'OMEGA'];
  aiOrder.forEach((call, index) => {
    const ship = state.aiMotherships.find((s) => s.callsign === call);
    if (!ship) return;
    moveRise(ship, 100 + (index * 200), 800, zones.greenBottom - 110);
  });

  for (let i = 0; i < state.playerFleet.length; i += 1) {
    const fighter = state.playerFleet[i];
    if (fighter.dead) continue;
    const target = getPlayerFleetFormationTarget(i);
    const row = Math.floor(i / 10);
    const rowDelay = 1200 + ((4 - row) * 150);
    moveRise(fighter, rowDelay, 600, target.y);
    fighter.x += (target.x - fighter.x) * 0.12 * dt;
  }

  aiOrder.forEach((call, idx) => {
    const group = state.aiFighters.filter((f) => !f.dead && f.ownerId === call);
    const ship = state.aiMotherships.find((s) => s.callsign === call);
    if (!ship) return;
    group.forEach((fighter, fi) => {
      const target = getAiFighterTarget(fighter, fi, ship);
      moveRise(fighter, 2400 + (idx * 200), 500, target.y);
      fighter.x += (target.x - fighter.x) * 0.15 * dt;
    });
  });
}

function updateAmbientRamp(now) {
  if (!state?.ambientRamp?.active) {
    return;
  }
  const ramp = state.ambientRamp;
  const t = clamp((now - ramp.startedAt) / ramp.duration, 0, 1);
  const value = ramp.from + ((ramp.to - ramp.from) * t);
  currentContext.audio?.setMasterVolume?.(value);
  if (t >= 1) {
    ramp.active = false;
  }
}

function beginCaptureSequence(outcome) {
  if (state.mode === 'capture-sequence' || state.mode === 'finished') {
    return;
  }

  state.mode = 'capture-sequence';
  state.pendingCapture = {
    outcome,
    phase: 'fade-reds',
    phaseStartedAt: nowMs(),
    phaseUntil: nowMs() + 500,
    pulseIntensity: 0,
    blackoutAlpha: 0,
  };
}

function updateCaptureSequence(now) {
  if (state.mode !== 'capture-sequence' || !state.pendingCapture) {
    return;
  }

  const seq = state.pendingCapture;
  if (seq.phase === 'fade-reds') {
    const t = clamp((now - seq.phaseStartedAt) / 500, 0, 1);
    seq.fadeAlpha = 1 - t;
    if (now >= seq.phaseUntil) {
      state.redFighters = [];
      seq.phase = 'planet-pulse';
      seq.phaseStartedAt = now;
      seq.phaseUntil = now + 1200;
      seq.fadeAlpha = 0;
    }
  } else if (seq.phase === 'planet-pulse') {
    const t = clamp((now - seq.phaseStartedAt) / 1200, 0, 1);
    const pulse = Math.max(0, Math.sin(t * Math.PI * 3));
    seq.pulseIntensity = pulse;
    if (now >= seq.phaseUntil) {
      seq.phase = 'blackout';
      seq.phaseStartedAt = now;
      seq.phaseUntil = now + 800;
      seq.pulseIntensity = 0;
    }
  } else if (seq.phase === 'blackout') {
    const t = clamp((now - seq.phaseStartedAt) / 800, 0, 1);
    seq.blackoutAlpha = t;
    if (now >= seq.phaseUntil) {
      const outcome = seq.outcome;
      state.pendingCapture = null;
      completeInvasion(outcome);
    }
  }
}

function isVictory() {
  return state.redKilled >= RED_TOTAL_TARGET && state.bossesKilled >= 5;
}

function isAllMothershipsDestroyed() {
  const aiAlive = state.aiMotherships.some((s) => !s.dead);
  return state.player.dead && !aiAlive;
}

function enterCommsLost() {
  if (state.mode !== 'active') return;
  state.mode = 'comms-lost';
  state.commsLostUntil = nowMs() + 2000;

  if (!commsOverlayEl) {
    const panel = document.createElement('div');
    panel.style.cssText = [
      'position:absolute',
      'left:50%',
      'top:50%',
      'transform:translate(-50%,-50%)',
      'padding:18px 26px',
      'border-radius:16px',
      'background:rgba(255,255,255,0.05)',
      'border:0.5px solid rgba(255,255,255,0.18)',
      'backdrop-filter:blur(14px)',
      '-webkit-backdrop-filter:blur(14px)',
      'font-family:"Courier New", monospace',
      'text-align:center',
      'z-index:30',
      'color:rgba(255,255,255,0.82)',
      'pointer-events:none',
    ].join(';');
    panel.innerHTML = `
      <div style="font-size:10px;letter-spacing:0.3em;color:rgba(255,255,255,0.3);margin-bottom:8px;">COMMUNICATIONS LOST</div>
      <div style="font-size:10px;letter-spacing:0.2em;color:rgba(255,80,60,0.45);">ALL UNITS AUTONOMOUS</div>
    `;
    currentContext.uiLayer.appendChild(panel);
    commsOverlayEl = panel;
  }
}

function beginSpectatorMode() {
  state.mode = 'spectator';
  if (commsOverlayEl?.parentElement) {
    commsOverlayEl.parentElement.removeChild(commsOverlayEl);
  }
  commsOverlayEl = null;
}

function completeInvasion(outcome) {
  if (state.mode === 'finished') return;
  state.mode = 'finished';

  const aiAlive = state.aiMotherships.filter((s) => !s.dead).length;
  if (outcome === OUTCOME_CAPTURE || outcome === OUTCOME_BONUS) {
    if (!state.player.dead && aiAlive === 4) {
      state.score += SCORE_BONUS_ALL_MOTHERSHIPS;
    } else {
      state.score += aiAlive * SCORE_BONUS_AI_ALIVE;
    }
  }

  if (outcome === OUTCOME_BONUS && !state.planetDestroyedBonusApplied) {
    state.score += SCORE_BONUS_PLANET_DESTROYED;
    state.planetDestroyedBonusApplied = true;
  }

  const summary = {
    score: Math.max(0, Math.floor(state.score)),
    planet: state.seedPlanet,
    mothershipsLost: state.mothershipLosses,
    fightersLost: state.fighterLosses,
    redKills: state.redKilled,
    outcome,
  };
  saveInvasionScore(summary);

  showCaptureOverlay(outcome, summary);
}

function showCaptureOverlay(outcome, summary) {
  if (battleOverlayEl?.parentElement) {
    battleOverlayEl.parentElement.removeChild(battleOverlayEl);
  }

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:absolute',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(0,0,0,0.86)',
    'z-index:35',
    'font-family:"Courier New", monospace',
    'pointer-events:auto',
  ].join(';');

  const card = document.createElement('div');
  card.style.cssText = [
    'background:rgba(20,80,255,0.06)',
    'border:0.5px solid rgba(20,80,255,0.3)',
    'border-radius:20px',
    'backdrop-filter:blur(16px)',
    '-webkit-backdrop-filter:blur(16px)',
    'padding:28px 34px',
    'text-align:center',
    'max-width:480px',
    'color:rgba(255,255,255,0.84)',
  ].join(';');

  let heading = 'PLANET CAPTURED';
  let nameColor = '#1a80ff';
  let subtitle = '';
  if (outcome === OUTCOME_LAST_STAND) {
    heading = 'LAST STAND VICTORY';
    nameColor = '#00ff88';
    subtitle = 'THE FLEET FOUGHT ON WITHOUT YOU';
  } else if (outcome === OUTCOME_FAILED) {
    heading = 'INVASION FAILED';
    nameColor = '#ff5544';
  }

  card.innerHTML = `
    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(26,128,255,0.6);margin-bottom:10px;">${heading}</div>
    <div style="font-size:40px;font-weight:700;letter-spacing:0.1em;color:${nameColor};text-shadow:0 0 50px rgba(26,128,255,0.6);margin-bottom:10px;">${state.seedPlanet}</div>
    ${summary.outcome === OUTCOME_BONUS ? '<div style="font-size:10px;letter-spacing:0.2em;color:rgba(255,80,60,0.5);margin-bottom:8px;">SURFACE DESTROYED</div>' : ''}
    ${subtitle ? `<div style="font-size:10px;letter-spacing:0.2em;color:rgba(255,255,255,0.45);margin-bottom:10px;">${subtitle}</div>` : ''}
    <svg width="88" height="58" viewBox="0 0 100 60" style="display:block;margin:0 auto 14px auto;">
      <path d="M 10 52 A 42 42 0 0 1 90 52" fill="none" stroke="#1a80ff" stroke-width="2.4"/>
    </svg>
    <div style="font-size:11px;letter-spacing:0.15em;color:rgba(255,255,255,0.7);line-height:1.8;">
      FIGHTERS LOST ${summary.fightersLost}<br>
      MOTHERSHIPS LOST ${summary.mothershipsLost} / 5<br>
      PLANET HP ${Math.max(0, Math.ceil(state.planetHp))} / ${PLANET_MAX_HP}<br>
      SCORE ${summary.score}
    </div>
  `;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'RETURN TO FLEET';
  btn.style.cssText = [
    'margin-top:16px',
    'background:rgba(20,80,255,0.08)',
    'border:0.5px solid rgba(20,80,255,0.35)',
    'border-radius:12px',
    'padding:12px 18px',
    'font-size:11px',
    'letter-spacing:0.18em',
    'color:#1a80ff',
    'font-family:"Courier New", monospace',
    'cursor:pointer',
  ].join(';');
  btn.addEventListener('click', () => {
    currentContext.hud?.showMainMenu?.(currentContext.startMode, currentContext.audio);
    stopInvasion();
  });

  card.appendChild(btn);
  panel.appendChild(card);
  currentContext.uiLayer.appendChild(panel);
  battleOverlayEl = panel;
}

function showPlanetDestroyedEndScene() {
  if (battleOverlayEl?.parentElement) {
    battleOverlayEl.parentElement.removeChild(battleOverlayEl);
  }

  const aliveMotherships = (state.player.dead ? 0 : 1) + state.aiMotherships.filter((ship) => !ship.dead).length;
  const troopsLost = Math.max(0, state.finalAssault?.troopsLost ?? 0);
  const score = Math.max(0, Math.floor(state.score));

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:absolute',
    'inset:0',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:rgba(0,0,0,0.88)',
    'z-index:40',
    'font-family:"Courier New", monospace',
    'pointer-events:auto',
  ].join(';');

  const card = document.createElement('div');
  card.style.cssText = [
    'background:rgba(20,80,255,0.05)',
    'border:0.5px solid rgba(20,80,255,0.2)',
    'border-radius:20px',
    'backdrop-filter:blur(16px)',
    '-webkit-backdrop-filter:blur(16px)',
    'padding:32px 48px',
    'text-align:center',
    'max-width:560px',
    'color:rgba(255,255,255,0.84)',
  ].join(';');

  card.innerHTML = `
    <div style="font-size:13px;letter-spacing:0.3em;color:rgba(26,128,255,0.35);margin-bottom:8px;">${state.seedPlanet}</div>
    <div style="font-size:9px;letter-spacing:0.25em;color:rgba(255,80,60,0.4);margin-bottom:16px;">SURFACE: DESTROYED</div>
    <svg width="90" height="58" viewBox="0 0 100 60" style="display:block;margin:0 auto 16px auto;opacity:0.4;">
      <path d="M 12 52 A 42 42 0 0 1 44 20" fill="none" stroke="#1a80ff" stroke-width="2.2"/>
      <path d="M 50 16 A 42 42 0 0 1 70 24" fill="none" stroke="#1a80ff" stroke-width="2.2"/>
      <path d="M 78 30 A 42 42 0 0 1 90 52" fill="none" stroke="#1a80ff" stroke-width="2.2"/>
    </svg>
    <div style="font-size:10px;letter-spacing:0.3em;color:rgba(26,128,255,0.45);margin-bottom:8px;">PLANET DESTROYED</div>
    <div style="font-size:28px;font-weight:700;letter-spacing:0.12em;color:#1a80ff;text-shadow:0 0 40px rgba(26,128,255,0.4);margin-bottom:12px;">${state.seedPlanet}</div>
    <div style="height:1px;background:rgba(255,255,255,0.06);margin:16px 0;"></div>
    <div style="display:grid;grid-template-columns:1fr auto;gap:6px 24px;font-size:11px;letter-spacing:0.14em;color:rgba(255,255,255,0.72);text-align:left;">
      <div>SCORE</div><div>${score}</div>
      <div>LAST STAND HP</div><div>0 / ${PLANET_LAST_STAND_HP}</div>
      <div>BOSSES KILLED</div><div>${Math.max(0, state.finalAssault?.bossesKilled ?? 0)} / 5</div>
      <div>TROOPS LOST</div><div>${troopsLost} / ${FINAL_ASSAULT_TROOPS}</div>
      <div>MOTHERSHIPS</div><div>${aliveMotherships} / 5</div>
      <div>FIGHTERS LOST</div><div>${state.fighterLosses}</div>
    </div>
    <div style="font-size:9px;letter-spacing:0.2em;color:rgba(26,128,255,0.58);margin-top:10px;">+10,000 TOTAL ANNIHILATION BONUS</div>
    <div style="font-size:9px;letter-spacing:0.2em;color:rgba(26,128,255,0.3);margin-top:6px;">TOTAL ANNIHILATION</div>
  `;

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;justify-content:center;gap:10px;margin-top:20px;';

  const returnBtn = document.createElement('button');
  returnBtn.type = 'button';
  returnBtn.textContent = 'RETURN TO FLEET';
  returnBtn.style.cssText = [
    'background:rgba(20,80,255,0.08)',
    'border:0.5px solid rgba(20,80,255,0.35)',
    'border-radius:12px',
    'padding:11px 16px',
    'font-size:11px',
    'letter-spacing:0.18em',
    'color:#1a80ff',
    'font-family:"Courier New", monospace',
    'cursor:pointer',
  ].join(';');

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.textContent = 'MAIN MENU';
  menuBtn.style.cssText = [
    'background:rgba(255,255,255,0.05)',
    'border:0.5px solid rgba(255,255,255,0.18)',
    'border-radius:12px',
    'padding:11px 16px',
    'font-size:11px',
    'letter-spacing:0.18em',
    'color:rgba(255,255,255,0.8)',
    'font-family:"Courier New", monospace',
    'cursor:pointer',
  ].join(';');

  returnBtn.addEventListener('click', () => {
    currentContext.hud?.showMainMenu?.(currentContext.startMode, currentContext.audio);
    stopInvasion();
  });

  menuBtn.addEventListener('click', () => {
    currentContext.hud?.showMainMenu?.(currentContext.startMode, currentContext.audio);
    stopInvasion();
  });

  actions.append(returnBtn, menuBtn);
  card.appendChild(actions);
  panel.appendChild(card);
  currentContext.uiLayer.appendChild(panel);
  battleOverlayEl = panel;
}

function failInvasion() {
  completeInvasion(OUTCOME_FAILED);
}

function updateGameStateHUD(now) {
  const alivePlayerFleet = state.playerFleet.length;
  const aiFighterAlive = {};
  for (const ship of state.aiMotherships) {
    aiFighterAlive[ship.callsign] = state.aiFighters.filter((f) => !f.dead && f.ownerId === ship.callsign).length;
  }

  const lines = [
    `> YOU     ${state.player.dead ? 'DESTROYED' : `${Math.max(0, Math.ceil(state.player.hp))}HP`}   ${alivePlayerFleet} fighters`,
  ];
  for (const ship of state.aiMotherships) {
    lines.push(`${ship.callsign}   ${ship.dead ? 'DESTROYED' : `${Math.max(0, Math.ceil(ship.hp))}HP`}   ${aiFighterAlive[ship.callsign]}/${ship.reserve + aiFighterAlive[ship.callsign]}`);
  }

  currentContext.gameState.mode = 'invasion';
  currentContext.gameState.score = Math.max(0, Math.floor(state.score));
  currentContext.gameState.wave = 1;
  currentContext.gameState.lives = Math.max(0, Math.ceil(state.player.hp));
  currentContext.gameState.fleetCount = alivePlayerFleet;
  currentContext.gameState.powerups = {
    shield: false,
    multi: false,
    fleet: false,
  };
  currentContext.gameState.bossActive = false;
  currentContext.gameState.invasion = {
    planetName: state.mode === 'finished' ? state.seedPlanet : '???',
    planetHp: Math.max(0, Math.ceil(state.planetState.phase === 'normal' ? state.planetHp : state.planetState.lastStandHp)),
    planetMaxHp: state.planetState.phase === 'normal' ? PLANET_MAX_HP : PLANET_LAST_STAND_HP,
    redKilled: state.redKilled,
    redTotal: RED_TOTAL_TARGET,
    bossesKilled: state.bossesKilled,
    bossesTotal: 5,
    counterMode: state.counterMode,
    counterTransitionUntil: state.counterTransitionUntil,
    fleetLines: lines,
    invadeCooldownUntil: state.invasionOrderCooldownUntil,
    now,
  };
}

function renderPlanet(ctx) {
  const { zones } = state;
  const ps = state.planetState;
  const centerX = zones.width / 2;
  const arcRadius = zones.planetArcWidth * 0.32;
  const pulseBoost = state.pendingCapture?.pulseIntensity ? state.pendingCapture.pulseIntensity * 36 : 0;
  const now = nowMs();

  const grad = ctx.createRadialGradient(centerX, zones.planetArcY + 20, 10, centerX, zones.planetArcY + 26, zones.planetArcWidth * 0.36);
  grad.addColorStop(0, 'rgba(20,80,255,0.04)');
  grad.addColorStop(1, 'rgba(20,80,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX, zones.planetArcY + 28, zones.planetArcWidth * 0.33, 0, Math.PI * 2);
  ctx.fill();

  let strokeColor = '#1a80ff';
  let lineWidth = 2;
  let shadowBlur = 24 + pulseBoost;
  let arcStart = Math.PI * 1.15;
  let arcEnd = Math.PI * 1.85;
  let arcAlpha = 1;

  if (ps.phase === 'shatter') {
    const flick = Math.floor((now - ps.phaseStartedAt) / 50) % 2;
    arcAlpha = flick ? 1 : 0.1;
    shadowBlur = now < ps.hardFlashUntil ? 80 : 0;
  } else if (ps.phase === 'immunity') {
    strokeColor = 'rgba(255,255,255,0.6)';
    shadowBlur = 35 + Math.sin(now * 0.008) * 15;
  } else if (ps.phase === 'last-stand' || ps.phase === 'final-assault' || ps.phase === 'destroyed-sequence') {
    lineWidth = 3;
    shadowBlur = 30;
    arcEnd = Math.PI * 1.79;
  }

  ctx.save();
  ctx.globalAlpha = arcAlpha;
  ctx.beginPath();
  ctx.arc(centerX, zones.planetArcY + arcRadius, arcRadius, arcStart, arcEnd);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = strokeColor;
  ctx.shadowBlur = shadowBlur;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  const hpRatio = clamp(state.planetHp / PLANET_MAX_HP, 0, 1);
  const coreRatio = clamp(ps.lastStandHp / PLANET_LAST_STAND_HP, 0, 1);
  const barW = zones.planetArcWidth;
  const barX = centerX - barW / 2;
  const barY = zones.planetArcY + 52;

  if (ps.phase === 'immunity') {
    const elapsed = now - ps.phaseStartedAt;
    if (elapsed < 500) {
      ctx.fillStyle = 'rgba(20,20,20,0.65)';
      ctx.fillRect(barX, barY, barW, 3);
    } else {
      const charge = clamp((elapsed - 500) / PLANET_CORE_CHARGE_MS, 0, 1);
      ctx.fillStyle = 'rgba(255,40,20,0.08)';
      ctx.fillRect(barX, barY, barW, 3);
      ctx.strokeStyle = 'rgba(255,40,20,0.3)';
      ctx.strokeRect(barX, barY - 1, barW, 5);
      ctx.fillStyle = '#ff3322';
      ctx.fillRect(barX, barY, barW * charge, 3);
    }
  } else if (ps.phase === 'last-stand' || ps.phase === 'final-assault' || ps.phase === 'destroyed-sequence') {
    ctx.fillStyle = 'rgba(255,40,20,0.08)';
    ctx.fillRect(barX, barY, barW, 3);
    ctx.strokeStyle = 'rgba(255,40,20,0.3)';
    ctx.strokeRect(barX, barY - 1, barW, 5);
    ctx.fillStyle = '#ff3322';
    ctx.fillRect(barX, barY, barW * coreRatio, 3);
    ctx.fillStyle = 'rgba(255,80,60,0.85)';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LAST STAND · ${Math.max(0, Math.ceil(ps.lastStandHp))} / ${PLANET_LAST_STAND_HP}`, centerX, barY + 13);
    return;
  } else {
    ctx.fillStyle = 'rgba(26,128,255,0.25)';
    ctx.fillRect(barX, barY, barW, 3);
    ctx.fillStyle = '#1a80ff';
    ctx.fillRect(barX, barY, barW * hpRatio, 3);
  }

  ctx.fillStyle = 'rgba(120,170,255,0.8)';
  ctx.font = '10px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`PLANET HP ${Math.max(0, Math.ceil(state.planetHp))} / ${PLANET_MAX_HP}`, centerX, barY + 13);
}

function renderMothership(ctx, ship, isPlayer = false) {
  if (ship.dead) return;
  const radius = isPlayer ? PLAYER_RADIUS : AI_RADIUS;
  const color = '#00ff88';
  ctx.beginPath();
  ctx.arc(ship.x, ship.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = isPlayer ? 2 : 1.8;
  ctx.shadowColor = color;
  ctx.shadowBlur = isPlayer ? 26 : 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const hpMax = isPlayer ? PLAYER_HP_MAX : AI_HP_MAX;
  const hpRatio = clamp(ship.hp / hpMax, 0, 1);
  const barW = isPlayer ? 80 : 40;
  const barX = ship.x - barW / 2;
  const barY = ship.y - radius - 12;
  ctx.fillStyle = 'rgba(0,255,136,0.2)';
  ctx.fillRect(barX, barY, barW, 2);
  ctx.fillStyle = '#00ff88';
  ctx.fillRect(barX, barY, barW * hpRatio, 2);

  if (!isPlayer) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ship.callsign, ship.x, ship.y + radius + 12);
  }
}

function drawFighterBatch(ctx, fighters, color, glow, direction = 'up') {
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.beginPath();
  for (const f of fighters) {
    if (f.dead) continue;
    if (f.x < -20 || f.x > state.zones.width + 20 || f.y < -20 || f.y > state.zones.height + 20) continue;
    const w = direction === 'up' ? GREEN_FIGHTER_W : RED_FIGHTER_W;
    const h = direction === 'up' ? GREEN_FIGHTER_H : RED_FIGHTER_H;
    const hw = w / 2;
    const hh = h / 2;
    if (direction === 'up') {
      ctx.moveTo(f.x, f.y - hh);
      ctx.lineTo(f.x + hw, f.y + hh);
      ctx.lineTo(f.x - hw, f.y + hh);
      ctx.closePath();
    } else {
      ctx.moveTo(f.x, f.y + hh);
      ctx.lineTo(f.x + hw, f.y - hh);
      ctx.lineTo(f.x - hw, f.y - hh);
      ctx.closePath();
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawGreenFighter(ctx, fighter) {
  if (fighter.dead) return;
  if (fighter.warpInUntil && nowMs() < fighter.warpInUntil) {
    const t = clamp((fighter.warpInUntil - nowMs()) / 450, 0, 1);
    const scale = 1 + t * 1.6;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    currentContext.drawTriangle(ctx, fighter.x, fighter.y, GREEN_FIGHTER_W * scale, GREEN_FIGHTER_H * scale, 'up', '#00ff88', 14);
    ctx.restore();
  }
  if (fighter.armorBroken || fighter.hp <= 1) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    currentContext.drawTriangle(ctx, fighter.x, fighter.y, GREEN_FIGHTER_W, GREEN_FIGHTER_H, 'up', '#00ff88', 8);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(fighter.x - 3.5, fighter.y - 2.5);
    ctx.lineTo(fighter.x + 2.8, fighter.y + 3.2);
    ctx.moveTo(fighter.x - 1.2, fighter.y + 3.3);
    ctx.lineTo(fighter.x + 2.1, fighter.y - 0.8);
    ctx.strokeStyle = 'rgba(0,255,136,0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.restore();
    return;
  }
  currentContext.drawTriangle(ctx, fighter.x, fighter.y, GREEN_FIGHTER_W, GREEN_FIGHTER_H, 'up', '#00ff88', 11);
}

function drawCrackedRedFighter(ctx, fighter) {
  if (fighter.dead) return;
  if (fighter.hp === 1) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    currentContext.drawTriangle(ctx, fighter.x, fighter.y, RED_FIGHTER_W, RED_FIGHTER_H, 'down', '#ff3322', 8);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(fighter.x - 4, fighter.y - 4);
    ctx.lineTo(fighter.x + 4, fighter.y + 4);
    ctx.moveTo(fighter.x - 1.5, fighter.y + 3.5);
    ctx.lineTo(fighter.x + 2.5, fighter.y - 0.5);
    ctx.strokeStyle = 'rgba(255,100,80,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.restore();
    return;
  }
  currentContext.drawTriangle(ctx, fighter.x, fighter.y, RED_FIGHTER_W, RED_FIGHTER_H, 'down', '#ff3322', 16);
}

function renderInvasion(ctx, now) {
  const { zones } = state;
  ctx.clearRect(0, 0, zones.width, zones.height);

  if (state.starfieldBuffer) {
    if (state.mode === 'planet-destroyed-sequence' && state.planetDestroyedSequence?.phase === 'end-scene') {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(state.starfieldBuffer, 0, 0, zones.width, zones.height);
      ctx.restore();
    } else {
      ctx.drawImage(state.starfieldBuffer, 0, 0, zones.width, zones.height);
    }
  } else {
    drawStarfield(ctx);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.beginPath();
  ctx.moveTo(0, zones.boundaryY);
  ctx.lineTo(zones.width, zones.boundaryY);
  ctx.stroke();

  renderPlanet(ctx);
  renderMothership(ctx, state.player, true);
  for (const ship of state.aiMotherships) {
    renderMothership(ctx, ship, false);
  }

  for (const fighter of state.playerFleet) {
    drawGreenFighter(ctx, fighter);
  }
  for (const fighter of state.aiFighters) {
    drawGreenFighter(ctx, fighter);
  }
  for (const fighter of state.redFighters) {
    drawCrackedRedFighter(ctx, fighter);
  }

  const activeBosses = getActiveBosses();
  if (activeBosses.length > 0) {
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(0,255,136,0.1)';
    ctx.lineWidth = 0.5;
    for (const fighter of state.playerFleet) {
      if (fighter.dead || !fighter.targetBossId) continue;
      const boss = activeBosses.find((candidate) => candidate.id === fighter.targetBossId);
      if (!boss) continue;
      ctx.beginPath();
      ctx.moveTo(fighter.x, fighter.y);
      ctx.lineTo(boss.x, boss.y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.setLineDash([]);
  }

  if (state.pendingCapture?.phase === 'fade-reds') {
    const fadeAlpha = clamp(state.pendingCapture.fadeAlpha ?? 1, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${1 - fadeAlpha})`;
    ctx.fillRect(0, 0, zones.width, zones.height * 0.5);
  }

  for (const boss of state.bosses) {
    if (!boss.active || boss.dead) continue;
    const color = boss.flashFrames > 0 ? '#ffffff' : '#ff3322';
    currentContext.drawTriangle(ctx, boss.x, boss.y, BOSS_W, BOSS_H, 'down', color, 20);
  }

  for (const b of state.greenBullets) {
    currentContext.drawBullet(ctx, b.x, b.y, b.width, b.height, '#00ff88', 10);
  }
  for (const b of state.redBullets) {
    currentContext.drawBullet(ctx, b.x, b.y, b.width, b.height, '#ff3322', 8);
  }

  for (const bomb of state.bombs) {
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (const pu of state.powerups || []) {
    if (pu.type === currentContext.BACKSPACE_TYPE) {
      currentContext.drawCircle(ctx, pu.x, pu.y, pu.radius, '#ffffff', 16);
    } else {
      currentContext.drawCircle(ctx, pu.x, pu.y, pu.radius, pu.color, 14);
    }
  }

  for (const w of state.shockwaves) {
    const alpha = clamp((w.until - now) / 380, 0, 1);
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const w of state.planetBlasts) {
    const alpha = clamp((w.until - now) / 300, 0, 1);
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.7})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  for (const ring of state.flashRings) {
    const alpha = clamp((ring.until - now) / 260, 0, 1);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.6})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (state.laserFramesRemaining > 0 && !state.player.dead) {
    const laserX = state.player.x;
    const originY = state.player.y - PLAYER_RADIUS;
    ctx.beginPath();
    ctx.moveTo(laserX, originY);
    ctx.lineTo(laserX, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(laserX, originY);
    ctx.lineTo(laserX, 0);
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 28;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
  }

  if (state.mode === 'spectator') {
    const g = ctx.createRadialGradient(zones.width / 2, zones.height / 2, zones.width * 0.2, zones.width / 2, zones.height / 2, zones.width * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, zones.width, zones.height);
  }

  if (state.pendingCapture?.phase === 'blackout') {
    const alpha = clamp(state.pendingCapture.blackoutAlpha ?? 0, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, zones.width, zones.height);
  }

  if (state.mode === 'planet-destroyed-sequence' && state.planetDestroyedSequence) {
    const seq = state.planetDestroyedSequence;
    if (seq.phase === 'arc-collapse') {
      const t = clamp((now - seq.phaseStartedAt) / 1000, 0, 1);
      for (const segment of seq.segments) {
        ctx.beginPath();
        ctx.arc(seq.centerX + segment.ox, seq.centerY + segment.oy, zones.planetArcWidth * 0.32, segment.angleStart, segment.angleEnd);
        ctx.strokeStyle = `rgba(26,128,255,${1 - t})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#1a80ff';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    } else if (seq.phase === 'explosion') {
      const t = clamp((now - seq.phaseStartedAt) / 500, 0, 1);
      const rings = [
        { r: 80, color: `rgba(255,255,255,${0.9 * (1 - t)})`, d: 0.3 },
        { r: 140, color: `rgba(26,128,255,${0.6 * (1 - t)})`, d: 0.45 },
        { r: 200, color: `rgba(26,128,255,${0.2 * (1 - t)})`, d: 0.5 },
      ];
      for (const ring of rings) {
        const rt = clamp(t / ring.d, 0, 1);
        ctx.beginPath();
        ctx.arc(seq.centerX, seq.centerY, ring.r * rt, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (seq.phase === 'blackout') {
      ctx.fillStyle = `rgba(0,0,0,${seq.blackoutAlpha})`;
      ctx.fillRect(0, 0, zones.width, zones.height);
    }
  }

  if (state.centerNotice && now < state.centerNotice.until) {
    const notice = state.centerNotice;
    const elapsed = now - notice.startedAt;
    const remaining = notice.until - now;
    let alpha = 1;
    if (elapsed < notice.fadeInMs) alpha = clamp(elapsed / notice.fadeInMs, 0, 1);
    if (remaining < notice.fadeOutMs) alpha = Math.min(alpha, clamp(remaining / notice.fadeOutMs, 0, 1));

    const h = 92;
    const w = 360;
    const x = zones.width / 2 - w / 2;
    const y = zones.height / 2 - h / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(255,40,20,0.08)';
    ctx.strokeStyle = 'rgba(255,40,20,0.28)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    notice.lines.forEach((line, idx) => {
      ctx.fillStyle = line.color;
      ctx.font = `${line.bold ? '700 ' : ''}${line.size}px "Courier New", monospace`;
      ctx.fillText(line.text, zones.width / 2, y + 24 + idx * 26);
    });
    ctx.restore();
  }

  if (state.centerNotice && now >= state.centerNotice.until) {
    state.centerNotice = null;
  }

  positionLastChanceUi();
}

function updateInvasion(now, dt) {
  if (state.mode === 'finished') {
    return;
  }

  if (state.mode === 'planet-destroyed-sequence') {
    updatePlanetPhases(now);
    return;
  }

  updateAmbientRamp(now);
  updatePlanetPhases(now);

  if (!state.combatEnabled) {
    updateSequence(now);
    applyAssemblyMotion(now, dt);
    return;
  }

  if (state.mode === 'capture-sequence') {
    updateCaptureSequence(now);
    return;
  }

  if (state.mode === 'comms-lost') {
    if (now >= state.commsLostUntil) {
      beginSpectatorMode();
    }
  }

  spawnRedIfNeeded(now);
  updatePhaseBanner(now);

  if (state.battlePhase === 'fighters' && state.redKilled >= RED_TOTAL_TARGET) {
    startBossPhase(now);
  }

  if (state.battlePhase === 'boss-transition' && now >= state.phaseBannerUntil) {
    deployBossPhase(now);
  }

  if (state.mode === 'active') {
    updatePlayer(dt, now);
    updateAiMothershipStrategy(now);
  }

  updateGreenFighters(dt, now);
  updateRedFighters(dt, now);
  updateBosses(dt, now);
  updateBullets(dt);
  resolveCollisions();
  applyBackspaceLaser(dt);
  updateEffects(now);
  updateBroadcastState(now);

  if (state.mode === 'active' && isAllMothershipsDestroyed() && state.planetHp > 0) {
    enterCommsLost();
  }

  if (state.mode === 'active' && state.finalAssault.active) {
    const allMothershipsDead = state.player.dead && state.aiMotherships.every((ship) => ship.dead);
    const noFightersLeft = state.playerFleet.length === 0 && state.aiFighters.length === 0;
    if (allMothershipsDead && noFightersLeft) {
      enterCommsLost();
    }
  }

  const allRedsDown = state.battlePhase !== 'fighters' && state.redFighters.length === 0;
  const allBossesDown = state.bossesKilled >= 5;

  if (!state.finalAssault.active && (isVictory() || (allRedsDown && allBossesDown)) && state.mode !== 'finished') {
    const outcome = state.planetHp <= 0 ? OUTCOME_BONUS : (state.mode === 'spectator' ? OUTCOME_LAST_STAND : OUTCOME_CAPTURE);
    beginCaptureSequence(outcome);
    return;
  }

  if (state.mode === 'spectator') {
    const anyGreenLeft = state.playerFleet.length > 0 || state.aiFighters.length > 0;
    if (!anyGreenLeft && state.mode !== 'finished') {
      failInvasion();
      return;
    }
  }
}

function onResize() {
  if (!currentContext?.canvas || !currentContext?.ctx || !state) return;
  syncCanvasResolution(currentContext.canvas, currentContext.ctx);
  state.zones = getZones(currentContext.canvas);
  state.starfieldBuffer = createStarfieldBuffer(state.zones.width, state.zones.height);
  positionLastChanceUi();
}

function gameLoop() {
  if (!currentContext || !currentContext.gameState.running || currentContext.gameState.mode !== 'invasion') {
    return;
  }

  const now = nowMs();
  const dt = Math.max(0.5, Math.min(2.5, lastFrameTime > 0 ? (now - lastFrameTime) / 16.67 : 1));
  lastFrameTime = now;
  state.frameCount += 1;

  if (!currentContext.gameState.paused) {
    updateInvasion(now, dt);
    if (state.combatEnabled) {
      updateStatusNotice(now);
      updateBackspaceUi();
      updateGameStateHUD(now);
      currentContext.hud?.updateHUD?.(currentContext.gameState);
    }
  }

  renderInvasion(currentContext.ctx, now);
  animationFrameId = window.requestAnimationFrame(gameLoop);
}

function addEventHandlers() {
  keydownHandler = (event) => {
    handleKeyChange(event, true);
  };
  keyupHandler = (event) => {
    handleKeyChange(event, false);
  };
  window.addEventListener('keydown', keydownHandler);
  window.addEventListener('keyup', keyupHandler);

  resizeHandler = () => onResize();
  window.addEventListener('resize', resizeHandler);
}

function removeEventHandlers() {
  if (keydownHandler) window.removeEventListener('keydown', keydownHandler);
  if (keyupHandler) window.removeEventListener('keyup', keyupHandler);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  keydownHandler = null;
  keyupHandler = null;
  resizeHandler = null;
}

export function startInvasion(context = currentContext) {
  if (!context?.canvas) return;
  stopInvasion();

  const canvas = context.canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  currentContext = { ...context, ctx };
  syncCanvasResolution(canvas, ctx);
  state = initializeState(currentContext);

  currentContext.gameState.mode = 'invasion';
  currentContext.gameState.running = true;
  currentContext.gameState.paused = false;
  currentContext.gameState.score = 0;
  currentContext.gameState.wave = 1;
  currentContext.gameState.lives = PLAYER_HP_MAX;
  currentContext.gameState.fleetCount = PLAYER_FLEET_MAX;
  state.ambientTargetVolume = currentContext.audio?.getMasterVolume?.() ?? 1;
  currentContext.audio?.setMasterVolume?.(0);
  createPreBattleUi();

  addEventHandlers();
  currentContext.hud?.hideHUD?.();

  lastFrameTime = 0;
  animationFrameId = window.requestAnimationFrame(gameLoop);
}

export function stopInvasion() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  removeEventHandlers();
  removeCommandModule();
  removeModeButtons();
  removeBackspaceUi();

  if (statusNoticeEl?.parentElement) {
    statusNoticeEl.parentElement.removeChild(statusNoticeEl);
  }
  statusNoticeEl = null;

  if (battleOverlayEl?.parentElement) {
    battleOverlayEl.parentElement.removeChild(battleOverlayEl);
  }
  battleOverlayEl = null;

  if (commsOverlayEl?.parentElement) {
    commsOverlayEl.parentElement.removeChild(commsOverlayEl);
  }
  commsOverlayEl = null;

  if (phaseBannerEl?.parentElement) {
    phaseBannerEl.parentElement.removeChild(phaseBannerEl);
  }
  phaseBannerEl = null;

  clearPreBattleUi();

  if (state) {
    currentContext?.audio?.setMasterVolume?.(state.ambientTargetVolume ?? 1);
  }

  state = null;
  currentContext = null;
}

export const invasionMode = {
  id: 'invasion',
  start(context) {
    startInvasion(context);
  },
  stop() {
    stopInvasion();
  },
};
