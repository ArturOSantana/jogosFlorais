import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCsv, buildAuditRows, filterAuditRows } from '../src/audit.js';

const teams = [
  { id: 'pp', s: 'Padre Pio' },
  { id: 'sl', s: 'São Luís IX' },
];
const activities = [{ id: 'teatro', n: 'Teatro', c: ['Atuação', 'Figurino'] }];

test('gera uma linha por equipe e critério com comparação da alteração', () => {
  const rows = buildAuditRows({
    teams,
    activities,
    events: [{
      type: 'evaluation',
      action: 'save',
      ts: 100,
      sourceId: 'teatro__juiz',
      activityId: 'teatro',
      activityName: 'Teatro',
      criteria: activities[0].c,
      juiz: 'Juiz Um',
      before: { pp: [2, 0], sl: [1, 4] },
      after: { pp: [3, 0], sl: [1, 2] },
    }],
  });
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.filter(row => row.teamId === 'pp').map(row => [row.criterion, row.before, row.after, row.delta]), [
    ['Atuação', 2, 3, 1],
    ['Figurino', 0, 0, 0],
  ]);
  assert.equal(rows.find(row => row.teamId === 'sl' && row.criterion === 'Figurino').delta, -2);
});

test('inclui os registros atuais antigos como posição inicial e evita duplicar os já auditados', () => {
  const rows = buildAuditRows({
    teams,
    activities,
    avaliacoes: {
      'teatro__juiz': { id: 'teatro__juiz', activityId: 'teatro', juizId: 'juiz', juiz: 'Juiz Um', s: { pp: [8], sl: [4] }, ts: 50 },
    },
    atas: { antigo: { juiz: 'Juiz Antigo', s: { pp: [2], sl: [1] }, ts: 20 } },
    adjustments: [{ id: 'aj-1', t: 'pp', v: 5, m: 'Correção', ts: 40 }],
    events: [{
      type: 'evaluation',
      action: 'save',
      ts: 100,
      sourceId: 'teatro__juiz',
      activityId: 'teatro',
      activityName: 'Teatro',
      criteria: ['Atuação'],
      juiz: 'Juiz Um',
      before: { pp: [7], sl: [4] },
      after: { pp: [8], sl: [4] },
    }],
  });
  assert.equal(rows.filter(row => row.recordId === 'teatro__juiz').length, 2);
  assert.equal(rows.some(row => row.activity === 'antigo' && row.action === 'baseline'), true);
  assert.equal(rows.find(row => row.recordId === 'aj-1').delta, 5);
});

test('registra exclusões de avaliações e ajustes como variações negativas', () => {
  const rows = buildAuditRows({
    teams,
    events: [
      { type: 'evaluation', action: 'delete', ts: 2, sourceId: 'teatro__juiz', activityId: 'teatro', activityName: 'Teatro', criteria: ['Atuação'], before: { pp: [3], sl: [1] } },
      { type: 'adjustment', action: 'delete', ts: 1, sourceId: 'aj-1', adjustment: { id: 'aj-1', t: 'pp', v: 5, m: 'Correção' } },
    ],
  });
  assert.deepEqual(rows.map(row => row.delta), [-3, -1, -5]);
});

test('aplica filtros sem alterar os dados originais', () => {
  const rows = [
    { ts: new Date('2026-02-01T12:00:00').getTime(), teamId: 'pp', source: 'Ata', activity: 'Teatro', criterion: 'Atuação', judge: 'Ana' },
    { ts: new Date('2026-02-02T12:00:00').getTime(), teamId: 'sl', source: 'Ajuste', activity: 'Lançamento', motive: 'Correção manual' },
  ];
  assert.deepEqual(filterAuditRows(rows, {
    team: 'sl', source: 'Ajuste', search: 'CORREÇÃO', from: '2026-02-02', to: '2026-02-02',
  }), [rows[1]]);
  assert.equal(rows.length, 2);
});

test('gera CSV compatível com Excel pt-BR, com BOM e escape de delimitadores e aspas', () => {
  const csv = auditCsv([{
    ts: 0, action: 'save', source: 'Ata', activity: 'Teatro; dança', criterion: 'Atuação',
    team: 'São Luís IX', judge: 'Ana "Bia"', before: null, after: 3, delta: 3,
    motive: 'Observação; "importante"', actor: 'admin@example.com', recordId: 'x1',
  }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Teatro; dança"'));
  assert.ok(csv.includes('"Ana ""Bia"""'));
  assert.ok(csv.includes('\r\n'));
});
