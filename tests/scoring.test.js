import test from 'node:test';
import assert from 'node:assert/strict';
import { totals, ranking, sum } from '../src/scoring.js';
const ids = ['pp', 'sl', 'gg'];
test('positivo soma e negativo remove', () => {
  const aj = [{ t: 'sl', v: 5 }, { t: 'sl', v: -3 }, { t: 'gg', v: 10 }];
  assert.deepEqual(totals(ids, {}, aj), { pp: 0, sl: 2, gg: 10 });
});
test('apagar um lançamento desfaz o efeito', () => {
  const a = { t: 'pp', v: 7 }, b = { t: 'pp', v: -2 };
  assert.equal(totals(ids, {}, [a, b]).pp, 5);
  assert.equal(totals(ids, {}, [b]).pp, -2);
  assert.equal(totals(ids, {}, []).pp, 0);
});
test('atas e ajustes se combinam', () => {
  const atas = { x: { s: { pp: [3, 4.5], sl: [2, 2], gg: [0, 1] } }, y: { s: { pp: [1], sl: [5], gg: [5] } } };
  assert.deepEqual(totals(ids, atas, [{ t: 'gg', v: -2 }]), { pp: 8.5, sl: 9, gg: 4 });
});
test('sem erro de ponto flutuante', () => {
  assert.equal(sum([0.1, 0.2]), 0.3);
  assert.equal(totals(ids, {}, [{ t: 'pp', v: 0.1 }, { t: 'pp', v: 0.2 }]).pp, 0.3);
});
test('posição automática e empates', () => {
  assert.deepEqual(ranking(ids, { pp: 5, sl: 9, gg: 1 }).map(r => [r.id, r.pos]), [['sl', 1], ['pp', 2], ['gg', 3]]);
  assert.deepEqual(ranking(ids, { pp: 9, sl: 9, gg: 1 }).map(r => r.pos), [1, 1, 3]);
  assert.deepEqual(ranking(ids, { pp: 0, sl: 0, gg: 0 }).map(r => r.pos), [1, 1, 1]);
  assert.deepEqual(ranking(ids, { pp: -4, sl: 0, gg: -4 }).map(r => r.pos), [1, 2, 2]);
});
