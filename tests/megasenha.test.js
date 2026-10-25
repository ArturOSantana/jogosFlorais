import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MEGA, countdownPlayingMs, deleteRound, finishRound, normalizeMega, prepareRound, recordOutcome, remainingMs, startRoundClock } from '../src/megasenha.js';

const activeRound = overrides => ({
  id: 'round-1',
  teamId: 'pp',
  listId: 'animals',
  words: ['Gato', 'Cachorro'],
  index: 0,
  correct: 0,
  skipped: 0,
  errors: 0,
  status: 'running',
  revealed: false,
  remainingMs: 90000,
  startedAt: 1000,
  ...overrides,
});

test('normalizes missing game data with safe defaults', () => {
  assert.deepEqual(normalizeMega({ scores: { pp: 4 } }), { ...DEFAULT_MEGA, scores: { pp: 4, sl: 0, gg: 0 } });
});

test('counts down from the persisted start time', () => {
  assert.equal(remainingMs(activeRound(), 16000), 75000);
  assert.equal(remainingMs(activeRound({ startedAt: null }), 16000), 90000);
  assert.equal(remainingMs(activeRound({ status: 'paused' }), 16000), 90000);
  assert.equal(remainingMs(activeRound(), 100000), 0);
});

test('correct answers award points and advance the word', () => {
  const state = { ...DEFAULT_MEGA, round: activeRound(), pointsPerCorrect: 2 };
  const next = recordOutcome(state, 'correct', 5000);
  assert.equal(next.scores.pp, 2);
  assert.equal(next.round.index, 1);
  assert.equal(next.round.correct, 1);
  assert.equal(next.round.remainingMs, 86000);
});

test('skip and error update counters, and errors apply the configured penalty', () => {
  const state = { ...DEFAULT_MEGA, round: activeRound(), pointsPerCorrect: 1, penalty: 2 };
  const skipped = recordOutcome(state, 'skip', 2000);
  assert.equal(skipped.round.skipped, 1);
  assert.equal(skipped.scores.pp, 0);
  const errored = recordOutcome(state, 'error', 2000);
  assert.equal(errored.round.errors, 1);
  assert.equal(errored.scores.pp, -2);
});

test('finishes and archives a round when the last word is answered', () => {
  const state = {
    ...DEFAULT_MEGA,
    round: activeRound({ index: 1, correct: 1 }),
  };
  const next = recordOutcome(state, 'correct', 5000);
  assert.equal(next.round.status, 'finished');
  assert.equal(next.round.revealed, false);
  assert.equal(next.round.finishedAt, 5000);
  assert.equal(next.history.length, 1);
  assert.equal(next.history[0].correct, 2);
});

test('deletes a round from history and clears it when it is the selected finished round', () => {
  const archived = activeRound({ id: 'round-1', status: 'finished' });
  const other = activeRound({ id: 'round-2', status: 'finished' });
  const state = { ...DEFAULT_MEGA, round: archived, history: [archived, other] };
  const next = deleteRound(state, 'round-1');
  assert.deepEqual(next.history, [other]);
  assert.equal(next.round, null);
  assert.equal(deleteRound(state, 'missing'), state);
});

test('deleting a historical round does not clear a different active round', () => {
  const active = activeRound({ id: 'round-active' });
  const state = { ...DEFAULT_MEGA, round: active, history: [activeRound({ id: 'round-old', status: 'finished' })] };
  const next = deleteRound(state, 'round-old');
  assert.equal(next.round, active);
  assert.deepEqual(next.history, []);
});

test('expired or paused rounds cannot accept outcomes', () => {
  const expired = { ...DEFAULT_MEGA, round: activeRound({ startedAt: 1000, remainingMs: 500 }) };
  const paused = { ...DEFAULT_MEGA, round: activeRound({ status: 'paused' }) };
  assert.equal(recordOutcome(expired, 'correct', 2000), expired);
  assert.equal(recordOutcome(paused, 'correct', 2000), paused);
});

test('the visible telão word does not prevent the admin from recording an outcome', () => {
  const visible = { ...DEFAULT_MEGA, round: activeRound({ revealed: true }) };
  assert.equal(recordOutcome(visible, 'correct', 2000).round.correct, 1);
});

test('prepares a shuffled round with unused words and the configured clue giver', () => {
  const state = {
    ...DEFAULT_MEGA,
    lists: [{ id: 'animals', words: ['Cat', 'Dog', 'Bird'], usedWords: ['Dog'] }],
  };
  const prepared = prepareRound(state, { teamId: 'pp', listId: 'animals', clueGiver: 'Ana' });
  assert.equal(prepared.round.status, 'ready');
  assert.equal(prepared.round.clueGiver, 'Ana');
  assert.equal(prepared.round.durationSeconds, 90);
  assert.deepEqual(new Set(prepared.round.words), new Set(['Cat', 'Bird']));
  assert.equal(prepareRound({ ...state, lists: [{ ...state.lists[0], usedWords: ['Cat', 'Dog', 'Bird'] }] }, { teamId: 'pp', listId: 'animals' }), null);
});

test('enforces the per-round skip limit and tracks consumed words', () => {
  const state = {
    ...DEFAULT_MEGA,
    skipLimit: 1,
    lists: [{ id: 'animals', words: ['Cat', 'Dog'], usedWords: [] }],
    round: activeRound({ words: ['Cat', 'Dog'], skipLimit: 1 }),
  };
  const skipped = recordOutcome(state, 'skip', 2000);
  assert.equal(skipped.round.skipped, 1);
  assert.deepEqual(skipped.lists[0].usedWords, ['Cat', 'Dog']);
  assert.equal(recordOutcome(skipped, 'skip', 3000), skipped);
});

test('countdown continues into the game timer without exposing the word early', () => {
  const round = activeRound({ status: 'countdown', remainingMs: 3000, startedAt: 1000, durationSeconds: 90 });
  assert.equal(remainingMs(round, 2000), 2000);
  assert.equal(countdownPlayingMs(round, 2000), null);
  assert.equal(countdownPlayingMs(round, 4000), 90000);
  assert.equal(countdownPlayingMs(round, 5000), 89000);
});

test('starting the clock stamps countdown and running states', () => {
  const prepared = { ...DEFAULT_MEGA, round: activeRound({ status: 'countdown', remainingMs: 3000, startedAt: null }) };
  const countdown = startRoundClock(prepared, 2000);
  assert.equal(countdown.round.startedAt, 2000);
  assert.equal(remainingMs(countdown.round, 3000), 2000);
  const running = startRoundClock({ ...prepared, round: activeRound({ startedAt: null }) }, 4000);
  assert.equal(running.round.startedAt, 4000);
  const paused = { ...prepared, round: activeRound({ status: 'paused', startedAt: null }) };
  assert.equal(startRoundClock(paused, 5000), paused);
});
