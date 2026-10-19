// Regra única do placar: total = soma das atas + soma dos ajustes (positivos somam, negativos removem).
export const r2 = n => Math.round((+n || 0) * 100) / 100;
export const sum = a => r2((a || []).reduce((x, y) => x + (+y || 0), 0));
export const ataTotal = (atas, t) => r2(Object.values(atas).reduce((x, a) => x + sum(a.s?.[t]), 0));
export const ajusteTotal = (aj, t) => r2(aj.filter(a => a.t === t).reduce((x, a) => x + (+a.v || 0), 0));
export const totals = (ids, atas, aj) => Object.fromEntries(ids.map(t => [t, r2(ataTotal(atas, t) + ajusteTotal(aj, t))]));
// Posição automática: empatados dividem a mesma posição (1, 1, 3).
export const ranking = (ids, tot) =>
  ids.map(id => ({ id, pts: tot[id], pos: 1 + ids.filter(o => tot[o] > tot[id]).length })).sort((a, b) => b.pts - a.pts);
