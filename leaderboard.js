const STORAGE_KEY = 'inversia_scores';

function readAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveScore(tag, score, wave, mode) {
  const entry = {
    tag: String(tag || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'AAA',
    score: Math.max(0, Number(score) || 0),
    wave: Math.max(1, Number(wave) || 1),
    mode: String(mode || '').toUpperCase(),
    date: new Date().toISOString(),
  };

  const merged = readAll().concat(entry);
  merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top20 = merged.slice(0, 20);
  writeAll(top20);
  return top20;
}

export function getTopScores(n = 5) {
  const limit = Math.max(1, Number(n) || 5);
  return readAll()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}

export function getPlayerRank(score) {
  const target = Math.max(0, Number(score) || 0);
  const sorted = readAll().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const higherCount = sorted.filter((entry) => (entry.score ?? 0) > target).length;
  return higherCount + 1;
}

export function getBestScore() {
  const top = getTopScores(1);
  return top[0] ?? null;
}

export function clearScores() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createLeaderboard() {
  return {
    add(entry) {
      return saveScore(entry?.tag, entry?.score, entry?.wave, entry?.mode);
    },
    read() {
      return getTopScores(20);
    },
    write(entries) {
      const safe = Array.isArray(entries) ? entries.slice(0, 20) : [];
      writeAll(safe);
      return safe;
    },
  };
}
