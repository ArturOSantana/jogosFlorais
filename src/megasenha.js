export const DEFAULT_MEGA = {
  lists: [],
  durationSeconds: 90,
  pointsPerCorrect: 1,
  penalty: 0,
  skipLimit: 0,
  scores: { pp: 0, sl: 0, gg: 0 },
  history: [],
  round: null,
};

export const normalizeMega = value => ({
  ...DEFAULT_MEGA,
  ...(value || {}),
  lists: Array.isArray(value?.lists) ? value.lists : [],
  scores: { ...DEFAULT_MEGA.scores, ...(value?.scores || {}) },
  history: Array.isArray(value?.history) ? value.history : [],
});

const timestampMs = timestamp => {
  if (typeof timestamp?.toMillis === 'function') return timestamp.toMillis();
  return Number(timestamp) || 0;
};

export const startRoundClock = (state, startedAt) => {
  if (!state.round || !['countdown', 'running'].includes(state.round.status)) return state;
  return { ...state, round: { ...state.round, startedAt } };
};

export const remainingMs = (round, now = Date.now()) => {
  if (!round) return 0;
  const remaining = Math.max(0, Number(round.remainingMs) || 0);
  if (!['running', 'countdown'].includes(round.status)) return remaining;
  const startedAt = timestampMs(round.startedAt);
  if (!startedAt) return remaining;
  return Math.max(0, remaining - Math.max(0, now - startedAt));
};

export const countdownPlayingMs = (round, now = Date.now()) => {
  if (!round || round.status !== 'countdown') return null;
  const startedAt = timestampMs(round.startedAt);
  if (!startedAt) return null;
  const elapsed = Math.max(0, now - startedAt);
  if (elapsed < 3000) return null;
  return Math.max(0, (Number(round.durationSeconds) || 0) * 1000 - (elapsed - 3000));
};

const archiveRound = (state, round) => {
  if (!round || state.history.some(item => item.id === round.id)) return state.history;
  return [{ ...round, status: 'finished', remainingMs: 0 }, ...state.history].slice(0, 100);
};

const markWordUsed = (lists, listId, word) => {
  if (!word) return lists;
  return lists.map(list => list.id === listId
    ? { ...list, usedWords: [...new Set([...(list.usedWords || []), word])] }
    : list);
};

export const markCurrentWordUsed = state => {
  const round = state.round;
  if (!round) return state;
  return { ...state, lists: markWordUsed(state.lists, round.listId, round.words[round.index]) };
};

export const finishRound = (state, now = Date.now()) => {
  if (!state.round || state.round.status === 'finished') return state;
  const round = { ...state.round, status: 'finished', revealed: false, remainingMs: 0, startedAt: null, finishedAt: now };
  return { ...state, round, history: archiveRound(state, round) };
};

export const deleteRound = (state, roundId) => {
  if (!state.history.some(round => round.id === roundId)) return state;
  return {
    ...state,
    history: state.history.filter(round => round.id !== roundId),
    round: state.round?.id === roundId && state.round.status === 'finished' ? null : state.round,
  };
};

export const recordOutcome = (state, outcome, now = Date.now()) => {
  const current = state.round;
  if (!current || current.status !== 'running' || remainingMs(current, now) <= 0) return state;
  if (!['correct', 'skip', 'error'].includes(outcome)) return state;
  const skipLimit = Number(current.skipLimit ?? state.skipLimit) || 0;
  if (outcome === 'skip' && skipLimit > 0 && current.skipped >= skipLimit) return state;

  const correct = current.correct + Number(outcome === 'correct');
  const skipped = current.skipped + Number(outcome === 'skip');
  const errors = current.errors + Number(outcome === 'error');
  const points = outcome === 'correct'
    ? Number(state.pointsPerCorrect) || 0
    : outcome === 'error' ? -(Number(state.penalty) || 0) : 0;
  const scores = { ...state.scores, [current.teamId]: (Number(state.scores[current.teamId]) || 0) + points };
  const index = current.index + 1;
  const round = {
    ...current,
    correct,
    skipped,
    errors,
    index,
    revealed: false,
    remainingMs: remainingMs(current, now),
  };

  const lists = markWordUsed(state.lists, current.listId, current.words[current.index]);
  const consumedLists = index < current.words.length ? markWordUsed(lists, current.listId, current.words[index]) : lists;
  const next = { ...state, lists: consumedLists, scores, round };
  return index >= current.words.length ? finishRound(next, now) : next;
};

export const prepareRound = (state, { teamId, listId, clueGiver = '' }) => {
  const list = state.lists.find(item => item.id === listId);
  if (!list) return null;
  const usedWords = new Set(list.usedWords || []);
  const words = [...new Set(list.words || [])].filter(word => !usedWords.has(word));
  if (!words.length) return null;
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  const durationSeconds = Number(state.durationSeconds) || DEFAULT_MEGA.durationSeconds;
  return {
    ...state,
    round: {
      id: crypto.randomUUID(),
      teamId,
      listId,
      clueGiver,
      words,
      index: 0,
      correct: 0,
      skipped: 0,
      errors: 0,
      status: 'ready',
      revealed: true,
      durationSeconds,
      skipLimit: Number(state.skipLimit) || 0,
      remainingMs: durationSeconds * 1000,
      startedAt: null,
    },
  };
};
