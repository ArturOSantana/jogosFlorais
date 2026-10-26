import { judgeKey } from './data.js';

const valueAt = (scores, teamId, index) => {
  const values = scores?.[teamId];
  return Array.isArray(values) && Number.isFinite(Number(values[index])) ? Number(values[index]) : null;
};

const evaluationRows = (event, teams, fallbackCriteria = []) => {
  const criteria = event.criteria?.length ? event.criteria : fallbackCriteria;
  const scores = event.action === 'delete' ? event.before : event.after;
  const count = Math.max(criteria.length, ...teams.map(team => scores?.[team.id]?.length || 0), 0);
  return Array.from({ length: count }, (_, index) => teams.flatMap(team => {
    const before = valueAt(event.before, team.id, index);
    const after = event.action === 'delete' ? null : valueAt(event.after, team.id, index);
    if (event.action === 'baseline' && after === null) return [];
    return [{
      ts: Number(event.ts) || 0,
      action: event.action,
      source: 'Ata',
      activity: event.activityName || event.activityId || 'Modalidade removida',
      criterion: criteria[index] || `Critério ${index + 1}`,
      teamId: team.id,
      team: team.s,
      judge: event.juiz || 'Não informado',
      before,
      after,
      delta: event.action === 'delete' ? -(before || 0) : after === null ? 0 : after - (before || 0),
      motive: event.obs || '',
      actor: event.actor || 'Não informado',
      recordId: event.sourceId || '',
    }];
  })).flat();
};

const adjustmentRows = (event, teams) => {
  const adjustment = event.adjustment || {};
  const team = teams.find(item => item.id === adjustment.t);
  if (!team) return [];
  const value = Number(adjustment.v) || 0;
  return [{
    ts: Number(event.ts) || Number(adjustment.ts) || 0,
    action: event.action,
    source: 'Ajuste',
    activity: 'Lançamento de katricos',
    criterion: 'Ajuste manual',
    teamId: team.id,
    team: team.s,
    judge: '',
    before: event.action === 'delete' ? value : null,
    after: event.action === 'delete' ? null : value,
    delta: event.action === 'delete' ? -value : value,
    motive: adjustment.m || '',
    actor: event.actor || 'Não informado',
    recordId: adjustment.id || event.sourceId || '',
  }];
};

export function buildAuditRows({ events = [], atas = {}, avaliacoes = {}, adjustments = [], activities = [], teams = [] }) {
  const activityMap = new Map(activities.map(activity => [activity.id, activity]));
  const evaluationEvents = events.filter(event => event.type === 'evaluation');
  const adjustmentEvents = events.filter(event => event.type === 'adjustment');
  const rows = events.flatMap(event => {
    if (event.type === 'evaluation') {
      const activity = activityMap.get(event.activityId);
      return evaluationRows(event, teams, activity?.c || []);
    }
    return event.type === 'adjustment' ? adjustmentRows(event, teams) : [];
  });

  const knownEvaluationSources = new Set(evaluationEvents.flatMap(event => [event.sourceId, event.replacesSourceId]).filter(Boolean));
  for (const [id, evaluation] of Object.entries(avaliacoes)) {
    const sourceId = evaluation.id || `${evaluation.activityId}__${evaluation.juizId || id}`;
    if (knownEvaluationSources.has(sourceId)) continue;
    const activity = activityMap.get(evaluation.activityId);
    rows.push(...evaluationRows({
      type: 'evaluation',
      action: 'baseline',
      ts: evaluation.ts,
      actor: 'Registro anterior',
      sourceId,
      activityId: evaluation.activityId,
      activityName: activity?.n || evaluation.activityId,
      criteria: activity?.c || [],
      juiz: evaluation.juiz,
      after: evaluation.s,
      obs: evaluation.obs,
    }, teams));
  }
  for (const [activityId, legacy] of Object.entries(atas)) {
    const migrated = Object.values(avaliacoes).some(evaluation =>
      evaluation.activityId === activityId && evaluation.juizId === judgeKey(legacy.juiz));
    const sourceId = `ata:${activityId}`;
    if (migrated || knownEvaluationSources.has(sourceId)) continue;
    const activity = activityMap.get(activityId);
    rows.push(...evaluationRows({
      type: 'evaluation',
      action: 'baseline',
      ts: legacy.ts,
      actor: 'Registro anterior',
      sourceId,
      activityId,
      activityName: activity?.n || activityId,
      criteria: activity?.c || [],
      juiz: legacy.juiz,
      after: legacy.s,
      obs: legacy.obs,
    }, teams));
  }

  const knownAdjustments = new Set(adjustmentEvents
    .filter(event => event.action === 'create')
    .map(event => event.adjustment?.id || event.sourceId)
    .filter(Boolean));
  for (const adjustment of adjustments) {
    if (knownAdjustments.has(adjustment.id)) continue;
    rows.push(...adjustmentRows({
      type: 'adjustment',
      action: 'baseline',
      ts: adjustment.ts,
      actor: 'Registro anterior',
      adjustment,
    }, teams));
  }
  return rows.sort((a, b) => b.ts - a.ts);
}

export function filterAuditRows(rows, filters = {}) {
  const query = (filters.search || '').trim().toLocaleLowerCase('pt-BR');
  const from = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : -Infinity;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : Infinity;
  return rows.filter(row =>
    (!filters.team || row.teamId === filters.team)
    && (!filters.source || row.source === filters.source)
    && row.ts >= from && row.ts <= to
    && (!query || [row.action, row.source, row.activity, row.criterion, row.team, row.judge, row.motive, row.actor, row.recordId]
      .some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(query))));
}

const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
export const auditCsv = rows => {
  const header = ['Data e hora', 'Ação', 'Origem', 'Modalidade', 'Critério', 'Equipe', 'Juiz', 'Valor anterior', 'Valor atual', 'Variação', 'Motivo / observação', 'Responsável', 'ID do registro'];
  return `\uFEFF${[header, ...rows.map(row => [
    row.ts ? new Date(row.ts).toLocaleString('pt-BR') : '',
    row.action,
    row.source,
    row.activity,
    row.criterion,
    row.team,
    row.judge,
    row.before,
    row.after,
    row.delta,
    row.motive,
    row.actor,
    row.recordId,
  ])].map(line => line.map(csvCell).join(';')).join('\r\n')}`;
};
