import './style.css';
import { TEAMS, R0, G, M, idOf } from './data.js';
import { totals, ranking, ataTotal, ajusteTotal, sum, r2, scoreSource } from './scoring.js';
import * as st from './store.js';

const ids = TEAMS.map(t => t.id), T = Object.fromEntries(TEAMS.map(t => [t.id, t]));
let S = { atas: {}, aj: [], eq: {}, dataLoaded: !st.cloud, placar: { paused: false, snapshot: null, loaded: !st.cloud } }, tab = 'placar', admin = false, K = { t: 'pp', v: 5, m: '' }, A = M[0].id, pend = false;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(r2(n));
const eq = t => {
  const saved = S.eq[t] || {};
  return { ...R0[t], ...saved, m: Array.isArray(saved.m) ? saved.m : R0[t].m };
};
const col = t => `style="--c:var(--${t})"`;
const toast = m => { const e = $('#toast'); e.textContent = m; e.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove('on'), 2400); };
const guard = p => Promise.resolve(p).then(() => { toast('Salvo'); return true; }).catch(err => { console.error('Não foi possível salvar.', err); toast('Não foi possível salvar. Verifique sua conexão e seu acesso de administrador.'); return false; });

const hist = (n, del) => S.aj.length
  ? `<ul class=hist>${S.aj.slice(0, n).map(a => `<li><b style="color:var(--${a.t})">${sgn(a.v)}</b><span>${T[a.t].s}${a.m ? ': ' + esc(a.m) : ''}</span><time>${new Date(a.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>${del && admin ? `<button class=x data-a=del data-id="${a.id}" aria-label="Remover lançamento">✕</button>` : '<span></span>'}</li>`).join('')}</ul>`
  : '<p class=mute>Nenhum lançamento ainda.</p>';

function vPlacar() {
  const shown = scoreSource(S, admin, st.cloud);
  if (!shown) return `<h1>Katricos</h1><p class=${S.placar.loaded && S.placar.paused ? 'note' : 'mute'} role=status>${S.placar.loaded && S.placar.paused ? 'O placar está pausado pela organização.' : 'Carregando placar...'}</p>`;
  const frozen = st.cloud && !admin && S.placar.paused;
  const tot = totals(ids, shown.atas, shown.aj), rk = ranking(ids, tot), mx = Math.max(1, ...ids.map(i => Math.abs(tot[i]))), started = Object.keys(shown.atas).length || shown.aj.length;
  return `<div class=hero style="display:flex;align-items:center;gap:14px"><img src="/img/jogos.png" alt="" height=72><div><h1>Katricos</h1><p class=mute style="margin:0">Jogos Florais 2026</p></div></div>
${frozen ? `<p class=note role=status>Atualização do placar pausada pela organização.</p>` : ''}
${admin ? `<button class=btn data-a=togglePause ${!S.dataLoaded ? 'disabled' : ''}>${S.placar.paused ? 'Retomar atualização para leitores' : 'Pausar atualização para leitores'}</button>${!S.dataLoaded ? '<p class=mute>Aguarde o carregamento dos dados para pausar o placar.</p>' : !S.placar.paused ? '<p class=mute>Leitores acompanham a pontuação em tempo real.</p>' : ''}` : ''}
<section class=stage><i class=rod></i><div class=banners>${TEAMS.map(t => { const p = rk.find(r => r.id === t.id); return `<article class=bn style="--c:var(--${t.id});--k:${Math.max(0, tot[t.id]) / mx}"><span class=pos>${started ? p.pos + 'º' : '–'}</span><img src="/img/${t.id}.jpg" alt="${t.n}"><div class=nm>${t.s}</div><div class=big>${r2(tot[t.id])}</div><div class=un>katricos</div></article>`; }).join('')}</div></section>
${admin ? `<table class=comp><thead><tr><th></th>${TEAMS.map(t => `<th style="color:var(--${t.id})">${t.s}</th>`).join('')}</tr></thead><tbody>
<tr><th>Atas</th>${ids.map(i => `<td>${ataTotal(S.atas, i)}</td>`).join('')}</tr>
<tr><th>Ajustes</th>${ids.map(i => `<td>${sgn(ajusteTotal(S.aj, i))}</td>`).join('')}</tr></tbody></table>
<h2>Últimos lançamentos</h2>${hist(5, false)}` : ''}
`;
}
function vInfo() {
  return `<h2>Instagram das equipes</h2><div class=ig-links>${TEAMS.map(t => `<a class=ig-link ${col(t.id)} href="${esc(t.ig)}" target=_blank rel="noopener noreferrer"><span>${t.n}</span><strong>Ver Instagram ↗</strong></a>`).join('')}</div>
<section class=documents><h2>Documentos</h2><a class=doc-link href="/Regulamento%202026.pdf" target=_blank rel="noopener noreferrer">Ler o regulamento 2026 (PDF) ↗</a>
</section>`;
}
function vKat() {
  const v = K.v, lbl = !v ? 'Informe um valor' : v > 0 ? `Dar ${v} katricos para ${T[K.t].s}` : `Tirar ${Math.abs(v)} katricos de ${T[K.t].s}`;
  return `<h2>Lançar katricos</h2><p class=mute>Positivo dá katricos. Negativo tira.</p>
<div class=tbs>${TEAMS.map(t => `<button class="tb ${K.t === t.id ? 'on' : ''}" ${col(t.id)} data-a=team data-id=${t.id}>${t.s}</button>`).join('')}</div>
<div class=chips>${[-10, -5, -1, 1, 5, 10].map(n => `<button class="chip ${v === n ? 'on' : ''}" data-a=val data-n=${n}>${sgn(n)}</button>`).join('')}</div>
<label for=kv>Valor</label><input id=kv type=number step=1 inputmode=numeric value="${v}" data-i=v>
<label for=km>Motivo</label><input id=km value="${esc(K.m)}" data-i=m>
<button class=btn data-a=launch ${admin && v ? '' : 'disabled'}>${lbl}</button>
<h2>Histórico</h2>${hist(80, true)}`;
}
function vAta() {
  const m = M.find(x => x.id === A), d = S.atas[A] || {}, s = d.s || {}, done = M.filter(x => S.atas[x.id]);
  const opts = G.map(([g, l]) => `<optgroup label="${g}">${l.map(([n]) => `<option value="${idOf(n)}" ${idOf(n) === A ? 'selected' : ''}>${S.atas[idOf(n)] ? '✓ ' : ''}${n}</option>`).join('')}</optgroup>`).join('');
  const dis = admin ? '' : 'disabled', head = `<th></th>${TEAMS.map(t => `<th style="color:var(--${t.id})">${t.s}</th>`).join('')}`;
  return `<h2>Ata dos juízes</h2><p class=mute>${done.length} de ${M.length} atas registradas.</p>
<label for=am>Modalidade</label><select id=am data-c=ata>${opts}</select>
<div class=tw style="margin-top:12px"><table class=ata><thead><tr>${head}</tr></thead><tbody>${m.c.map((c, i) => `<tr><th scope=row>${c}</th>${ids.map(t => `<td><input type=number step=.5 inputmode=decimal data-t=${t} data-i=live value="${s[t]?.[i] ?? ''}" aria-label="${c}, ${T[t].s}" ${dis}></td>`).join('')}</tr>`).join('')}</tbody>
<tfoot><tr><th scope=row>Total</th>${ids.map(t => `<td id=tt-${t}>${sum(s[t])}</td>`).join('')}</tr></tfoot></table></div>
<label for=juiz>Juiz</label><input id=juiz value="${esc(d.juiz)}" ${dis}>
<label for=obs>Observações</label><textarea id=obs rows=3 ${dis}>${esc(d.obs)}</textarea>
<button class=btn data-a=saveAta ${dis}>Salvar ata</button>
<h2>Atas registradas</h2>${done.length ? `<div class=tw><table class=ata><thead><tr>${head}${admin ? '<th>Ação</th>' : ''}</tr></thead><tbody>${done.map(x => { const a = S.atas[x.id], v = ids.map(t => sum(a.s[t])), mx = Math.max(...v); return `<tr><th scope=row><a href="#" data-a=openAta data-id=${x.id} style="color:inherit">${x.n}</a></th>${v.map(n => `<td style="${n === mx && n > 0 ? 'font-weight:800' : ''}">${n}</td>`).join('')}${admin ? `<td><button class=x data-a=delAta data-id="${x.id}" aria-label="Apagar ata ${esc(x.n)}">✕</button></td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : '<p class=mute>Nenhuma ata salva ainda.</p>'}`;
}
function vEq() {
  return `<h2>Equipes</h2><p class=mute>Consulte os integrantes e, como administrador, altere os nomes e cargos quando necessário.</p>${TEAMS.map(t => { const e = eq(t.id), count = e.m.filter(Boolean).length + Number(Boolean(e.l)) + Number(Boolean(e.v)); return `<details data-team=${t.id} ${col(t.id)}><summary><img src="/img/${t.id}.jpg" alt=""><span>${t.n}<br><small class=mute>${count} integrantes</small></span></summary>
<p><a class=team-ig href="${esc(t.ig)}" target=_blank rel="noopener noreferrer">Instagram oficial de ${t.n} ↗</a></p>
${admin ? `<div class=team-editor><div class=team-fields><label>Líder<input data-role=l value="${esc(e.l)}" aria-label="Líder da equipe ${t.s}"></label><label>Vice-líder<input data-role=v value="${esc(e.v)}" aria-label="Vice-líder da equipe ${t.s}"></label></div>
<h3>Integrantes</h3><ul class=names>${e.m.map((n, i) => `<li><input data-member value="${esc(n)}" aria-label="Integrante ${i + 1} da equipe ${t.s}"><button class=x data-a=rm data-id=${t.id} data-n=${i} aria-label="Remover integrante ${i + 1}">✕</button></li>`).join('')}</ul>
<div class=row><input id=ad-${t.id} aria-label="Novo integrante de ${t.s}" placeholder="Nome do integrante"><button class=btn data-a=add data-id=${t.id}>Adicionar</button></div><button class=btn data-a=saveTeam data-id=${t.id}>Salvar alterações</button></div>` : `<p><b>Líder:</b> ${esc(e.l || 'Não informado')}<br><b>Vice-líder:</b> ${esc(e.v || 'Não informado')}</p><ul class=names>${e.m.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`}</details>`; }).join('')}`;
}
function render() {
  if (st.cloud && !admin && !['placar', 'info'].includes(tab)) tab = 'placar';
  const tabs = [['placar', 'Placar'], ['info', 'Informações'], ['kat', 'Katricos'], ['ata', 'Atas'], ['eq', 'Equipes']];
  $('#tabs').innerHTML = (admin || !st.cloud ? tabs : tabs.slice(0, 2)).map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-a=tab data-id=${k}>${n}</button>`).join('');
  $('#tabs').classList.toggle('readonly', st.cloud && !admin);
  $('#who').textContent = !st.cloud ? 'Modo local' : admin ? 'Sair' : 'Entrar';
  const note = !st.cloud ? '<p class=note>Firebase não configurado: os dados ficam só neste aparelho.</p>' : '';
  $('#app').innerHTML = note + { placar: vPlacar, info: vInfo, kat: vKat, ata: vAta, eq: vEq }[tab]();
}
const refresh = () => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) { pend = true; return; } render(); };
document.addEventListener('focusout', () => { if (pend) { pend = false; setTimeout(refresh, 60); } });
const readTeamEditor = id => {
  const form = document.querySelector(`[data-team="${id}"]`);
  return {
    l: form.querySelector('[data-role="l"]').value.trim(),
    v: form.querySelector('[data-role="v"]').value.trim(),
    m: [...form.querySelectorAll('[data-member]')].map(input => input.value.trim()).filter(Boolean),
  };
};

const act = {
  tab: d => { if (st.cloud && !admin && !['placar', 'info'].includes(d.id)) return; tab = d.id; render(); scrollTo(0, 0); },
  team: d => { K.t = d.id; render(); },
  val: d => { K.v = +d.n; render(); },
  launch: () => { if (!K.v) return; const o = { t: K.t, v: K.v, m: K.m.trim(), ts: Date.now() }; guard(st.addAj(o)).then(saved => { if (saved) { K.m = ''; render(); } }); },
  del: d => { if (admin && confirm('Apagar este lançamento de katricos?')) guard(st.delAj(d.id)); },
  delAta: d => {
    if (!admin || !confirm('Apagar esta ata? Esta ação não pode ser desfeita.')) return;
    guard(st.delAta(d.id)).then(saved => {
      if (saved) {
        if (A === d.id) A = M[0].id;
        render();
      }
    });
  },
  togglePause: () => {
    if (!admin || !S.dataLoaded) return;
    guard(st.setPlacarPaused(!S.placar.paused));
  },
  openAta: d => { A = d.id; render(); scrollTo(0, 0); },
  saveAta: () => { const s = { pp: [], sl: [], gg: [] }; document.querySelectorAll('input[data-t]').forEach(i => s[i.dataset.t].push(+i.value || 0)); guard(st.saveAta(A, { s, juiz: $('#juiz').value.trim(), obs: $('#obs').value.trim(), ts: Date.now() })); },
  saveTeam: d => { if (admin) guard(st.saveEq(d.id, readTeamEditor(d.id))); },
  add: d => {
    if (!admin) return;
    const name = $('#ad-' + d.id).value.trim();
    if (!name) return;
    const team = readTeamEditor(d.id);
    team.m.push(name);
    guard(st.saveEq(d.id, team)).then(saved => { if (saved) render(); });
  },
  rm: d => {
    if (!admin) return;
    const team = readTeamEditor(d.id);
    team.m.splice(+d.n, 1);
    guard(st.saveEq(d.id, team)).then(saved => { if (saved) render(); });
  },
};
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) { e.preventDefault(); const k = b.closest('details')?.open; act[b.dataset.a]?.(b.dataset); if (k && tab === 'eq') document.querySelectorAll('details').forEach(x => x.open = x.contains(b)); } });
document.addEventListener('input', e => {
  const i = e.target.dataset.i;
  if (i === 'v') K.v = +e.target.value; if (i === 'm') K.m = e.target.value;
  if (i === 'live') ids.forEach(t => { let x = 0; document.querySelectorAll(`input[data-t=${t}]`).forEach(n => x += +n.value || 0); $('#tt-' + t).textContent = r2(x); });
});
document.addEventListener('change', e => {
  if (e.target.dataset.c === 'ata') { A = e.target.value; render(); }
  if (e.target.dataset.i === 'v') render();
});

$('#who').onclick = () => {
  if (!st.cloud) return;
  if (admin) return st.logout();
  const d = document.createElement('dialog');
  d.innerHTML = '<form method=dialog><h2>Entrar</h2><label for=em>Login</label><input id=em type=text autocomplete=username><label for=pw>Senha</label><input id=pw type=password autocomplete=current-password><button class=btn>Entrar</button></form>';
  document.body.append(d); d.showModal();
  d.querySelector('form').onsubmit = async ev => { ev.preventDefault(); try { await st.login(d.querySelector('#em').value, d.querySelector('#pw').value); d.close(); d.remove(); } catch (err) { toast(err.message === 'admin-config' ? 'Configure o e-mail administrador no Firebase.' : 'Login ou senha incorretos.'); } };
  d.onclick = ev => { if (ev.target === d) { d.close(); d.remove(); } };
};
st.onAdmin(a => { admin = a; refresh(); });
st.watch(s => { S = s; refresh(); });
render();
