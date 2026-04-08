import { getTopScores, saveScore, getBestScore, getPlayerRank, clearScores } from './leaderboard.js';

const MENU_STYLE_ID = 'inversia-menu-style';
const GAME_OVER_STYLE_ID = 'inversia-game-over-style';
const PREF_SHOW_LEADERBOARD = 'inversia_pref_show_leaderboard';
const PREF_MASTER_VOLUME = 'inversia_pref_master_volume';

function ensureMenuStyles() {
  if (document.getElementById(MENU_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MENU_STYLE_ID;
  style.textContent = `
    .inversia-menu {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      background: rgba(0, 0, 0, 0.82);
      color: rgba(255, 255, 255, 0.9);
      pointer-events: auto;
    }

    .inversia-logo {
      width: 150px;
      height: 150px;
      filter: drop-shadow(0 0 16px rgba(0, 255, 120, 0.35));
    }

    .inversia-title {
      margin: 0;
      font-size: clamp(2rem, 6vw, 4rem);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.9);
      text-shadow: 0 0 12px rgba(0, 255, 120, 0.2);
    }

    .inversia-subtitle {
      margin: 0;
      font-size: 0.65rem;
      letter-spacing: 0.3em;
      color: rgba(255, 255, 255, 0.45);
      text-transform: uppercase;
    }

    .inversia-cards {
      display: grid;
      grid-template-columns: repeat(3, minmax(180px, 220px));
      gap: 16px;
      margin-top: 12px;
    }

    .inversia-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 0.5px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 24px 20px;
      cursor: pointer;
      pointer-events: auto;
      transition: background 120ms ease, border-color 120ms ease;
    }

    .inversia-card:hover {
      background: rgba(0, 255, 120, 0.06);
      border-color: rgba(0, 255, 120, 0.25);
    }

    .inversia-card-title {
      margin: 0;
      font-size: 1.1rem;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.95);
    }

    .inversia-card-subtitle {
      margin: 0;
      font-size: 0.68rem;
      letter-spacing: 0.08em;
      color: rgba(255, 255, 255, 0.62);
      text-transform: lowercase;
    }

    .inversia-card-bridge {
      opacity: 0.5;
      cursor: default;
    }

    .inversia-card-bridge:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .inversia-soon {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 0.58rem;
      letter-spacing: 0.2em;
      color: rgba(255, 255, 255, 0.75);
      border: 0.5px solid rgba(255, 255, 255, 0.22);
      border-radius: 999px;
      padding: 3px 8px;
    }

    .inversia-bottom {
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.6rem;
      letter-spacing: 0.2em;
      color: rgba(255, 255, 255, 0.35);
      text-transform: uppercase;
    }

    @media (max-width: 760px) {
      .inversia-cards {
        grid-template-columns: 1fr;
        width: min(280px, calc(100vw - 32px));
      }
    }
  `;

  document.head.appendChild(style);
}

function ensureGameOverStyles() {
  if (document.getElementById(GAME_OVER_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = GAME_OVER_STYLE_ID;
  style.textContent = `
    .inversia-caret {
      display: inline-block;
      width: 8px;
      margin-left: 2px;
      color: rgba(170, 255, 204, 0.95);
      animation: inversia-blink 1s steps(1, end) infinite;
    }

    @keyframes inversia-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
  `;

  document.head.appendChild(style);
}

export function createHUD(uiLayer) {
  let hudRoot = null;
  let refs = null;
  let gameOverRoot = null;
  let gameOverRefs = null;
  let startModeHandler = null;
  let lastHudState = null;
  let lastLeaderboardScore = null;
  let audioEngineRef = null;
  let loadingRoot = null;
  let pauseRoot = null;
  let showLeaderboardPanel = localStorage.getItem(PREF_SHOW_LEADERBOARD) !== '0';

  const basePanelStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
    backdropFilter: 'blur(12px)',
    webkitBackdropFilter: 'blur(12px)',
    fontFamily: '"Courier New", monospace',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: '0.13em',
    fontSize: '11px',
    pointerEvents: 'none',
  };

  function applyStyle(element, styleMap) {
    for (const [key, value] of Object.entries(styleMap)) {
      element.style[key] = value;
    }
  }

  function createPanel(extra = {}) {
    const element = document.createElement('div');
    applyStyle(element, { ...basePanelStyle, ...extra });
    return element;
  }

  function buildLeaderboardRows(gameState) {
    const currentScore = Math.max(0, gameState.score ?? 0);
    const rank = getPlayerRank(currentScore);
    const top5 = getTopScores(5);
    return { rank, top5, currentScore };
  }

  function refreshLeaderboardPanel(gameState) {
    const { rank, top5, currentScore } = buildLeaderboardRows(gameState);
    refs.leaderboardList.innerHTML = '';

    top5.forEach((entry, index) => {
      const row = document.createElement('div');
      const rowRank = index + 1;
      const rowWave = Math.max(1, entry.wave ?? 1);
      const rowScore = Math.max(0, entry.score ?? 0);
      const label = (entry.tag || entry.mode || 'RUN').toString().toUpperCase();
      row.textContent = `${String(rowRank).padStart(2, '0')}  ${label}  ${rowScore}  W${String(rowWave).padStart(2, '0')}`;
      if (rowScore === currentScore) {
        row.style.color = 'rgba(180,255,210,0.92)';
      }
      refs.leaderboardList.appendChild(row);
    });

    if (rank > 5) {
      const footer = document.createElement('div');
      footer.style.marginTop = '4px';
      footer.style.color = 'rgba(180,255,210,0.78)';
      footer.textContent = `YOU  #${rank}`;
      refs.leaderboardList.appendChild(footer);
    }

    lastLeaderboardScore = currentScore;
  }

  function ensureLoading() {
    if (loadingRoot) {
      return;
    }

    loadingRoot = document.createElement('div');
    loadingRoot.style.position = 'absolute';
    loadingRoot.style.inset = '0';
    loadingRoot.style.display = 'none';
    loadingRoot.style.alignItems = 'center';
    loadingRoot.style.justifyContent = 'center';
    loadingRoot.style.background = '#000';
    loadingRoot.style.opacity = '1';
    loadingRoot.style.transition = 'opacity 400ms ease';
    loadingRoot.style.pointerEvents = 'none';

    const title = document.createElement('div');
    title.textContent = 'INVERSIA';
    title.style.fontFamily = '"Courier New", monospace';
    title.style.fontSize = 'clamp(3rem, 8vw, 6rem)';
    title.style.letterSpacing = '0.25em';
    title.style.color = 'rgba(255,255,255,0.92)';
    loadingRoot.appendChild(title);

    uiLayer.appendChild(loadingRoot);
  }

  function showLoading(durationMs = 1000) {
    ensureLoading();
    loadingRoot.style.display = 'flex';
    loadingRoot.style.opacity = '1';

    return new Promise((resolve) => {
      window.setTimeout(() => {
        loadingRoot.style.opacity = '0';
        window.setTimeout(() => {
          loadingRoot.style.display = 'none';
          resolve();
        }, 420);
      }, durationMs);
    });
  }

  function ensurePauseMenu() {
    if (pauseRoot) {
      return;
    }

    pauseRoot = createPanel({
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '16px',
      width: '280px',
      pointerEvents: 'auto',
      display: 'none',
      zIndex: '20',
      textAlign: 'center',
    });

    const title = document.createElement('div');
    title.textContent = 'PAUSED';
    title.style.color = 'rgba(255,255,255,0.9)';
    title.style.fontSize = '20px';
    title.style.marginBottom = '12px';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'center';
    actions.style.gap = '10px';

    const resumeBtn = createPanel({
      pointerEvents: 'auto',
      cursor: 'pointer',
      padding: '8px 12px',
      userSelect: 'none',
      color: 'rgba(180,255,210,0.9)',
      background: 'rgba(0,255,120,0.05)',
      borderColor: 'rgba(0,255,120,0.2)',
    });
    resumeBtn.textContent = 'RESUME';

    const quitBtn = createPanel({
      pointerEvents: 'auto',
      cursor: 'pointer',
      padding: '8px 12px',
      userSelect: 'none',
      color: 'rgba(255,255,255,0.85)',
    });
    quitBtn.textContent = 'QUIT TO MENU';

    actions.append(resumeBtn, quitBtn);
    pauseRoot.append(title, actions);
    uiLayer.appendChild(pauseRoot);

    pauseRoot._resumeBtn = resumeBtn;
    pauseRoot._quitBtn = quitBtn;
  }

  function showPauseMenu({ onResume, onQuit }) {
    ensurePauseMenu();
    pauseRoot.style.display = 'block';
    pauseRoot._resumeBtn.onclick = onResume;
    pauseRoot._quitBtn.onclick = onQuit;
  }

  function hidePauseMenu() {
    if (pauseRoot) {
      pauseRoot.style.display = 'none';
      pauseRoot._resumeBtn.onclick = null;
      pauseRoot._quitBtn.onclick = null;
    }
  }

  function ensureHUD() {
    if (hudRoot) {
      return;
    }

    hudRoot = document.createElement('div');
    hudRoot.style.position = 'absolute';
    hudRoot.style.inset = '0';
    hudRoot.style.pointerEvents = 'none';

    const scorePill = createPanel({
      position: 'absolute',
      top: '16px',
      left: '16px',
      padding: '8px 14px',
      borderRadius: '999px',
    });

    const playerPill = createPanel({
      position: 'absolute',
      top: '16px',
      right: '16px',
      padding: '8px 14px',
      borderRadius: '999px',
      background: 'rgba(0,255,120,0.05)',
      borderColor: 'rgba(0,255,120,0.2)',
      color: 'rgba(180,255,210,0.75)',
    });

    const waveBadge = createPanel({
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 16px',
      borderRadius: '999px',
      textAlign: 'center',
      minWidth: '120px',
    });

    const leaderboardPanel = createPanel({
      position: 'absolute',
      right: '16px',
      top: '74px',
      width: '240px',
      padding: '12px',
      lineHeight: '1.7',
    });

    const leaderboardTitle = document.createElement('div');
    leaderboardTitle.textContent = 'LEADERBOARD';
    leaderboardTitle.style.color = 'rgba(255,255,255,0.72)';
    leaderboardTitle.style.marginBottom = '6px';
    leaderboardPanel.appendChild(leaderboardTitle);

    const leaderboardList = document.createElement('div');
    leaderboardPanel.appendChild(leaderboardList);

    const powerupsWrap = document.createElement('div');
    powerupsWrap.style.position = 'absolute';
    powerupsWrap.style.left = '50%';
    powerupsWrap.style.bottom = '16px';
    powerupsWrap.style.transform = 'translateX(-50%)';
    powerupsWrap.style.display = 'flex';
    powerupsWrap.style.gap = '10px';
    powerupsWrap.style.pointerEvents = 'none';

    const makePowerupSlot = (label) => {
      const slot = createPanel({
        width: '42px',
        height: '42px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
      });
      slot.textContent = label;
      return slot;
    };

    const powerupShield = makePowerupSlot('SHD');
    const powerupMulti = makePowerupSlot('MLT');
    const powerupFleet = makePowerupSlot('FLT');
    powerupsWrap.append(powerupShield, powerupMulti, powerupFleet);

    const bossPanel = createPanel({
      position: 'absolute',
      top: '54px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '220px',
      padding: '8px',
      background: 'rgba(255,40,20,0.05)',
      borderColor: 'rgba(255,40,20,0.2)',
      display: 'none',
    });

    const bossFill = document.createElement('div');
    bossFill.style.height = '8px';
    bossFill.style.borderRadius = '8px';
    bossFill.style.background = 'rgba(255,70,50,0.85)';
    bossFill.style.boxShadow = '0 0 10px rgba(255,70,50,0.35)';
    bossPanel.appendChild(bossFill);

    const modeBadge = createPanel({
      position: 'absolute',
      left: '16px',
      bottom: '16px',
      padding: '7px 11px',
      borderRadius: '999px',
      opacity: '0.9',
    });

    hudRoot.append(
      scorePill,
      playerPill,
      waveBadge,
      leaderboardPanel,
      powerupsWrap,
      bossPanel,
      modeBadge,
    );

    refs = {
      scorePill,
      playerPill,
      waveBadge,
      leaderboardPanel,
      leaderboardList,
      powerupShield,
      powerupMulti,
      powerupFleet,
      bossPanel,
      bossFill,
      modeBadge,
    };

    uiLayer.appendChild(hudRoot);
  }

  function ensureGameOver() {
    if (gameOverRoot) {
      return;
    }

    ensureGameOverStyles();

    gameOverRoot = document.createElement('div');
    gameOverRoot.style.position = 'absolute';
    gameOverRoot.style.inset = '0';
    gameOverRoot.style.background = 'rgba(0,0,0,0.82)';
    gameOverRoot.style.display = 'none';
    gameOverRoot.style.flexDirection = 'column';
    gameOverRoot.style.alignItems = 'center';
    gameOverRoot.style.justifyContent = 'center';
    gameOverRoot.style.gap = '12px';
    gameOverRoot.style.pointerEvents = 'auto';

    const brokenTriangle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    brokenTriangle.setAttribute('viewBox', '0 0 120 110');
    brokenTriangle.setAttribute('width', '88');
    brokenTriangle.setAttribute('height', '78');
    brokenTriangle.style.opacity = '0.5';
    const lineLeft = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineLeft.setAttribute('x1', '60');
    lineLeft.setAttribute('y1', '98');
    lineLeft.setAttribute('x2', '18');
    lineLeft.setAttribute('y2', '16');
    lineLeft.setAttribute('stroke', 'rgba(255,80,70,0.8)');
    lineLeft.setAttribute('stroke-width', '3');
    const lineRight = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    lineRight.setAttribute('x1', '60');
    lineRight.setAttribute('y1', '98');
    lineRight.setAttribute('x2', '102');
    lineRight.setAttribute('y2', '16');
    lineRight.setAttribute('stroke', 'rgba(255,80,70,0.8)');
    lineRight.setAttribute('stroke-width', '3');
    brokenTriangle.append(lineLeft, lineRight);

    const signalLost = document.createElement('div');
    signalLost.textContent = 'SIGNAL LOST';
    signalLost.style.fontFamily = '"Courier New", monospace';
    signalLost.style.fontSize = '11px';
    signalLost.style.letterSpacing = '0.25em';
    signalLost.style.textTransform = 'uppercase';
    signalLost.style.color = 'rgba(255,90,90,0.78)';

    const waveReached = document.createElement('div');
    waveReached.style.fontFamily = '"Courier New", monospace';
    waveReached.style.fontSize = '44px';
    waveReached.style.letterSpacing = '0.14em';
    waveReached.style.color = 'rgba(255,255,255,0.96)';

    const statsCard = createPanel({
      width: '280px',
      padding: '14px 16px',
      pointerEvents: 'auto',
    });

    const row = (label) => {
      const line = document.createElement('div');
      line.style.display = 'flex';
      line.style.justifyContent = 'space-between';
      line.style.marginBottom = '7px';
      const left = document.createElement('span');
      left.textContent = label;
      const right = document.createElement('span');
      right.style.color = 'rgba(255,255,255,0.92)';
      line.append(left, right);
      statsCard.appendChild(line);
      return right;
    };

    const scoreValue = row('SCORE');
    const bestValue = row('BEST');
    const rankValue = row('RANK');

    const tagPanel = createPanel({
      width: '280px',
      padding: '12px 16px',
      pointerEvents: 'auto',
      background: 'rgba(0,255,120,0.05)',
      borderColor: 'rgba(0,255,120,0.2)',
      color: 'rgba(180,255,210,0.78)',
      textAlign: 'center',
    });

    const tagLabel = document.createElement('div');
    tagLabel.textContent = 'ENTER TAG';
    tagLabel.style.marginBottom = '8px';

    const tagDisplay = document.createElement('div');
    tagDisplay.style.fontFamily = '"Courier New", monospace';
    tagDisplay.style.fontSize = '28px';
    tagDisplay.style.letterSpacing = '0.22em';
    tagDisplay.style.color = 'rgba(210,255,225,0.98)';

    const caret = document.createElement('span');
    caret.className = 'inversia-caret';
    caret.textContent = '|';
    tagDisplay.appendChild(caret);

    const tagInput = document.createElement('input');
    tagInput.type = 'text';
    tagInput.maxLength = 3;
    tagInput.autocomplete = 'off';
    tagInput.spellcheck = false;
    tagInput.style.position = 'absolute';
    tagInput.style.left = '-9999px';

    tagPanel.append(tagLabel, tagDisplay, tagInput);

    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.gap = '10px';
    buttons.style.pointerEvents = 'auto';

    const submitButton = createPanel({
      padding: '10px 18px',
      pointerEvents: 'auto',
      cursor: 'pointer',
      background: 'rgba(0,255,120,0.05)',
      borderColor: 'rgba(0,255,120,0.2)',
      color: 'rgba(180,255,210,0.9)',
      userSelect: 'none',
    });
    submitButton.textContent = 'SUBMIT';

    const retryButton = createPanel({
      padding: '10px 18px',
      pointerEvents: 'auto',
      cursor: 'pointer',
      userSelect: 'none',
      color: 'rgba(255,255,255,0.85)',
    });
    retryButton.textContent = 'RETRY';

    buttons.append(submitButton, retryButton);

    const changeMode = document.createElement('button');
    changeMode.type = 'button';
    changeMode.textContent = 'CHANGE MODE';
    changeMode.style.background = 'transparent';
    changeMode.style.border = 'none';
    changeMode.style.color = 'rgba(255,255,255,0.42)';
    changeMode.style.fontFamily = '"Courier New", monospace';
    changeMode.style.fontSize = '11px';
    changeMode.style.letterSpacing = '0.16em';
    changeMode.style.cursor = 'pointer';
    changeMode.style.pointerEvents = 'auto';

    gameOverRoot.append(
      brokenTriangle,
      signalLost,
      waveReached,
      statsCard,
      tagPanel,
      buttons,
      changeMode,
    );

    uiLayer.appendChild(gameOverRoot);

    gameOverRefs = {
      waveReached,
      scoreValue,
      bestValue,
      rankValue,
      tagDisplay,
      tagInput,
      caret,
      submitButton,
      retryButton,
      changeMode,
      finalState: null,
      submitted: false,
    };

    const renderTag = () => {
      const value = (tagInput.value || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3);
      tagInput.value = value;
      const padded = `${value}___`.slice(0, 3);
      const visible = document.createTextNode(padded);
      gameOverRefs.tagDisplay.innerHTML = '';
      gameOverRefs.tagDisplay.appendChild(visible);
      gameOverRefs.tagDisplay.appendChild(caret);
      caret.style.visibility = 'visible';
    };

    tagInput.addEventListener('input', renderTag);
    tagPanel.addEventListener('click', () => {
      tagInput.focus();
    });

    submitButton.addEventListener('click', () => {
      if (!gameOverRefs.finalState) {
        return;
      }

      const tag = (tagInput.value || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3) || 'AAA';
      const entry = {
        tag,
        score: gameOverRefs.finalState.score ?? 0,
        wave: gameOverRefs.finalState.wave ?? 1,
        mode: String(gameOverRefs.finalState.mode ?? '').toUpperCase(),
      };

      const updated = saveScore(entry.tag, entry.score, entry.wave, entry.mode);
      localStorage.setItem('inversia_last_tag', tag);

      const best = updated[0]?.score ?? 0;
      const rank = getPlayerRank(entry.score);
      gameOverRefs.bestValue.textContent = `${best}`;
      gameOverRefs.rankValue.textContent = `#${rank}`;
      gameOverRefs.submitted = true;

      if (lastHudState) {
        lastLeaderboardScore = null;
        updateHUD(lastHudState);
      }
    });

    retryButton.addEventListener('click', () => {
      const mode = gameOverRefs.finalState?.mode;
      hideGameOver();
      if (startModeHandler && mode) {
        startModeHandler(mode);
      }
    });

    changeMode.addEventListener('click', () => {
      hideGameOver();
      if (startModeHandler) {
        showMainMenu(startModeHandler);
      }
    });
  }

  function updatePowerupSlot(element, isActive) {
    if (isActive) {
      element.style.background = 'rgba(0,255,120,0.05)';
      element.style.borderColor = 'rgba(0,255,120,0.2)';
      element.style.color = 'rgba(180,255,210,0.78)';
    } else {
      element.style.background = 'rgba(255,255,255,0.04)';
      element.style.borderColor = 'rgba(255,255,255,0.12)';
      element.style.color = 'rgba(255,255,255,0.38)';
    }
  }

  function clear() {
    uiLayer.innerHTML = '';
    hudRoot = null;
    refs = null;
    gameOverRoot = null;
    gameOverRefs = null;
    loadingRoot = null;
    pauseRoot = null;
  }

  function hideMenu() {
    clear();
  }

  function showHUD() {
    ensureHUD();
    if (hudRoot) {
      hudRoot.style.display = 'block';
    }
  }

  function hideHUD() {
    if (hudRoot) {
      hudRoot.style.display = 'none';
    }
  }

  function updateHUD(gameState) {
    if (!gameState) {
      return;
    }

    ensureHUD();
    lastHudState = { ...gameState };

    refs.scorePill.textContent = `SCORE ${Math.max(0, gameState.score ?? 0)}`;
    refs.waveBadge.textContent = `WAVE ${String(Math.max(1, gameState.wave ?? 1)).padStart(2, '0')}`;

    const mode = String(gameState.mode ?? '').toUpperCase();
    refs.modeBadge.textContent = mode || 'MODE';

    const lives = Math.max(0, gameState.lives ?? 0);
    const fleet = Math.max(0, gameState.fleetCount ?? 0);
    if (mode === 'COMMAND') {
      refs.playerPill.style.display = 'block';
      refs.playerPill.textContent = `LIVES ${lives} · FLEET ${fleet}`;
    } else {
      refs.playerPill.style.display = 'none';
    }

    const powerups = gameState.powerups ?? {};
    updatePowerupSlot(refs.powerupShield, Boolean(powerups.shield));
    updatePowerupSlot(refs.powerupMulti, Boolean(powerups.multi));
    updatePowerupSlot(refs.powerupFleet, Boolean(powerups.fleet));

    const bossActive = Boolean(gameState.bossActive);
    if (bossActive) {
      refs.bossPanel.style.display = 'block';
      const hp = Math.max(0, gameState.bossHp ?? 0);
      const maxHp = Math.max(1, gameState.bossMaxHp ?? 1);
      const ratio = Math.max(0, Math.min(1, hp / maxHp));
      refs.bossFill.style.width = `${ratio * 100}%`;
    } else {
      refs.bossPanel.style.display = 'none';
    }

    const currentScore = Math.max(0, gameState.score ?? 0);
    if (lastLeaderboardScore === null || currentScore !== lastLeaderboardScore) {
      refreshLeaderboardPanel(gameState);
    }

    refs.leaderboardPanel.style.display = showLeaderboardPanel ? 'block' : 'none';
  }

  function showGameOver(finalState) {
    ensureHUD();
    ensureGameOver();

    const safeState = {
      mode: String(finalState?.mode ?? 'flux').toLowerCase(),
      score: Math.max(0, finalState?.score ?? 0),
      wave: Math.max(1, finalState?.wave ?? 1),
    };

    const best = getBestScore()?.score ?? 0;
    const rank = getPlayerRank(safeState.score);

    gameOverRefs.finalState = safeState;
    gameOverRefs.submitted = false;
    gameOverRefs.waveReached.textContent = `WAVE ${String(safeState.wave).padStart(2, '0')}`;
    gameOverRefs.scoreValue.textContent = `${safeState.score}`;
    gameOverRefs.bestValue.textContent = `${best}`;
    gameOverRefs.rankValue.textContent = `#${rank}`;

    const savedTag = localStorage.getItem('inversia_last_tag') || 'AAA';
    gameOverRefs.tagInput.value = savedTag.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 3);
    gameOverRefs.tagDisplay.innerHTML = '';
    const padded = `${gameOverRefs.tagInput.value}___`.slice(0, 3);
    gameOverRefs.tagDisplay.appendChild(document.createTextNode(padded));
    gameOverRefs.tagDisplay.appendChild(gameOverRefs.caret);

    gameOverRoot.style.display = 'flex';
    gameOverRefs.tagInput.focus();
  }

  function hideGameOver() {
    if (gameOverRoot) {
      gameOverRoot.style.display = 'none';
    }
  }

  function attachLeaderboard() {
    return undefined;
  }

  function showMainMenu(startMode, audioEngine = audioEngineRef) {
    ensureMenuStyles();
    startModeHandler = startMode;
    audioEngineRef = audioEngine;
    const storedVolume = Number(localStorage.getItem(PREF_MASTER_VOLUME));
    if (Number.isFinite(storedVolume)) {
      audioEngineRef?.setMasterVolume?.(Math.max(0, Math.min(100, storedVolume)) / 100);
    }
    hideGameOver();
    hideHUD();
    hidePauseMenu();
    clear();

    const menu = document.createElement('div');
    menu.className = 'inversia-menu';
    menu.innerHTML = `
      <svg class="inversia-logo" viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="50,8 92,90 8,90" fill="rgba(0,255,120,0.12)" stroke="rgba(0,255,120,0.95)" stroke-width="2" />
      </svg>
      <h1 class="inversia-title">INVERSIA</h1>
      <p class="inversia-subtitle">YOU ARE THE ALIEN</p>
      <div class="inversia-cards">
        <button class="inversia-card" type="button" data-mode="flux" aria-label="Start Flux mode">
          <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
            <polygon points="50,10 88,86 12,86" fill="rgba(0,255,120,0.9)" />
          </svg>
          <h2 class="inversia-card-title">FLUX</h2>
          <p class="inversia-card-subtitle">solo pilot · high health</p>
        </button>

        <button class="inversia-card" type="button" data-mode="command" aria-label="Start Command mode">
          <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="26" fill="rgba(0,255,120,0.9)" />
            <circle cx="50" cy="50" r="26" fill="none" stroke="rgba(0,255,120,0.35)" stroke-width="10" />
          </svg>
          <h2 class="inversia-card-title">COMMAND</h2>
          <p class="inversia-card-subtitle">mothership · fleet control</p>
        </button>

        <div class="inversia-card inversia-card-bridge" aria-disabled="true">
          <span class="inversia-soon">SOON</span>
          <svg width="40" height="34" viewBox="0 0 140 110" aria-hidden="true">
            <polygon points="18,78 72,16 124,78" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="4" />
            <line x1="18" y1="78" x2="90" y2="95" stroke="rgba(255,255,255,0.5)" stroke-width="4" />
            <line x1="124" y1="78" x2="90" y2="95" stroke="rgba(255,255,255,0.5)" stroke-width="4" />
          </svg>
          <h2 class="inversia-card-title">BRIDGE</h2>
          <p class="inversia-card-subtitle">cockpit view · coming soon</p>
        </div>
      </div>
      <button class="inversia-card" type="button" data-action="settings" style="position:absolute;bottom:52px;left:50%;transform:translateX(-50%);padding:10px 14px;min-width:180px;justify-content:center;align-items:center;">
        <h2 class="inversia-card-title" style="font-size:0.85rem;">SETTINGS</h2>
      </button>
      <div class="inversia-bottom">BEST SCORE</div>
    `;

    const fluxButton = menu.querySelector('[data-mode="flux"]');
    const commandButton = menu.querySelector('[data-mode="command"]');
    const settingsButton = menu.querySelector('[data-action="settings"]');

    fluxButton?.addEventListener('click', () => {
      hideMenu();
      startMode('flux');
    });

    commandButton?.addEventListener('click', () => {
      hideMenu();
      startMode('command');
    });

    settingsButton?.addEventListener('click', () => {
      const panel = createPanel({
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',
        padding: '14px',
        pointerEvents: 'auto',
        zIndex: '4',
      });

      const heading = document.createElement('div');
      heading.textContent = 'SETTINGS';
      heading.style.color = 'rgba(255,255,255,0.9)';
      heading.style.marginBottom = '12px';

      const volumeWrap = document.createElement('div');
      volumeWrap.style.marginBottom = '10px';
      const volumeLabel = document.createElement('div');
      volumeLabel.textContent = 'MASTER VOLUME';
      volumeLabel.style.marginBottom = '6px';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.step = '1';
      const storedVolume = Number(localStorage.getItem(PREF_MASTER_VOLUME));
      const initialVolume = Number.isFinite(storedVolume)
        ? storedVolume
        : Math.round((audioEngineRef?.getMasterVolume?.() ?? 1) * 100);
      slider.value = `${Math.max(0, Math.min(100, initialVolume))}`;
      slider.style.width = '100%';
      slider.addEventListener('input', () => {
        const value = Number(slider.value) / 100;
        audioEngineRef?.setMasterVolume?.(value);
        localStorage.setItem(PREF_MASTER_VOLUME, String(Number(slider.value)));
      });
      volumeWrap.append(volumeLabel, slider);

      const leaderboardToggle = createPanel({
        pointerEvents: 'auto',
        cursor: 'pointer',
        padding: '8px 10px',
        marginBottom: '10px',
        userSelect: 'none',
      });
      const renderToggleText = () => {
        leaderboardToggle.textContent = `LEADERBOARD ${showLeaderboardPanel ? 'ON' : 'OFF'}`;
      };
      renderToggleText();
      leaderboardToggle.onclick = () => {
        showLeaderboardPanel = !showLeaderboardPanel;
        localStorage.setItem(PREF_SHOW_LEADERBOARD, showLeaderboardPanel ? '1' : '0');
        renderToggleText();
      };

      const clearButton = createPanel({
        pointerEvents: 'auto',
        cursor: 'pointer',
        padding: '8px 10px',
        marginBottom: '10px',
        userSelect: 'none',
      });
      clearButton.textContent = 'CLEAR SCORES';
      clearButton.onclick = () => {
        const confirmed = window.confirm('Clear all scores?');
        if (!confirmed) {
          return;
        }
        clearScores();
      };

      const closeButton = createPanel({
        pointerEvents: 'auto',
        cursor: 'pointer',
        padding: '8px 10px',
        userSelect: 'none',
        background: 'rgba(0,255,120,0.05)',
        borderColor: 'rgba(0,255,120,0.2)',
        color: 'rgba(180,255,210,0.9)',
      });
      closeButton.textContent = 'CLOSE';
      closeButton.onclick = () => {
        panel.remove();
      };

      panel.append(heading, volumeWrap, leaderboardToggle, clearButton, closeButton);
      menu.appendChild(panel);
      audioEngineRef?.setMasterVolume?.(Number(slider.value) / 100);
    });

    uiLayer.appendChild(menu);
  }

  function showMode(modeName) {
    hideMenu();
    showHUD();
    hideGameOver();
    updateHUD({ mode: modeName, score: 0, wave: 1, lives: 3, powerups: {} });
  }

  return {
    clear,
    hideMenu,
    showMainMenu,
    showMode,
    showHUD,
    hideHUD,
    showLoading,
    updateHUD,
    showGameOver,
    hideGameOver,
    showPauseMenu,
    hidePauseMenu,
    attachLeaderboard,
  };
}
