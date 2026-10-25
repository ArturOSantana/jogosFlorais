import './style.css';
import { TEAMS, R0, G, M, idOf } from './data.js';
import { totals, ranking, ataTotal, ajusteTotal, sum, r2, scoreSource } from './scoring.js';
import { DEFAULT_MEGA, normalizeMega, remainingMs, countdownPlayingMs, recordOutcome, finishRound, prepareRound, markCurrentWordUsed, deleteRound } from './megasenha.js';
import * as st from './store.js';

const ids = TEAMS.map(t => t.id), T = Object.fromEntries(TEAMS.map(t => [t.id, t]));
const projectorMode = location.pathname.replace(/\/+$/, '') === '/megasenha/telao';
let S = { atas: {}, aj: [], eq: {}, customAtas: [], mega: DEFAULT_MEGA, megaLoaded: !st.cloud, dataLoaded: !st.cloud, placar: { paused: false, snapshot: null, loaded: !st.cloud } }, tab = 'placar', admin = false, K = { t: 'pp', v: 5, m: '' }, A = M[0].id, pend = false, ataDraft = { n: '', c: [''] };
let MD = { teamId: 'pp', listId: '', clueGiver: '', durationSeconds: null, pointsPerCorrect: null, penalty: null, skipLimit: null, newListName: '', newListWords: '' }, timerEndedRoundId = '', timerStartedRoundId = '', timerSecond = -1, projectorError = null, stopProjectorWatch;
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
  const activities = [...M, ...S.customAtas], m = activities.find(x => x.id === A) || activities[0], d = S.atas[m.id] || {}, s = d.s || {}, done = activities.filter(x => S.atas[x.id]);
  const opts = G.map(([g, l]) => `<optgroup label="${g}">${l.map(([n]) => `<option value="${idOf(n)}" ${idOf(n) === m.id ? 'selected' : ''}>${S.atas[idOf(n)] ? '✓ ' : ''}${n}</option>`).join('')}</optgroup>`).join('') +
    (S.customAtas.length ? `<optgroup label="Personalizadas">${S.customAtas.map(x => `<option value="${x.id}" ${x.id === m.id ? 'selected' : ''}>${S.atas[x.id] ? '✓ ' : ''}${esc(x.n)}</option>`).join('')}</optgroup>` : '');
  const dis = admin ? '' : 'disabled', head = `<th></th>${TEAMS.map(t => `<th style="color:var(--${t.id})">${t.s}</th>`).join('')}`;
  return `<h2>Ata dos juízes</h2><p class=mute>${done.length} de ${activities.length} atas registradas.</p>
<label for=am>Modalidade</label><select id=am data-c=ata>${opts}</select>
<div class=tw style="margin-top:12px"><table class=ata><thead><tr>${head}</tr></thead><tbody>${m.c.map((c, i) => `<tr><th scope=row>${esc(c)}</th>${ids.map(t => `<td><input type=number step=.5 inputmode=decimal data-t=${t} data-i=live value="${s[t]?.[i] ?? ''}" aria-label="${esc(c)}, ${T[t].s}" ${dis}></td>`).join('')}</tr>`).join('')}</tbody>
<tfoot><tr><th scope=row>Total</th>${ids.map(t => `<td id=tt-${t}>${sum(s[t])}</td>`).join('')}</tr></tfoot></table></div>
<label for=juiz>Juiz</label><input id=juiz value="${esc(d.juiz)}" ${dis}>
<label for=obs>Observações</label><textarea id=obs rows=3 ${dis}>${esc(d.obs)}</textarea>
<button class=btn data-a=saveAta ${dis}>Salvar ata</button>
${admin ? `<section class=custom-ata><h2>Adicionar ata</h2><p class=mute>Crie uma modalidade com os critérios que serão pontuados para cada equipe.</p>
<label for=custom-name>Nome da ata</label><input id=custom-name maxlength=100 data-draft-name value="${esc(ataDraft.n)}">
<h3>Critérios</h3>${ataDraft.c.map((c, i) => `<div class=row><input maxlength=120 aria-label="Critério ${i + 1}" data-draft-criterion="${i}" value="${esc(c)}" placeholder="Nome do critério">${ataDraft.c.length > 1 ? `<button class=x data-a=removeCriterion data-n="${i}" aria-label="Remover critério ${i + 1}">✕</button>` : ''}</div>`).join('')}
<button class=btn data-a=addCriterion>Adicionar critério</button><button class=btn data-a=saveCustomAta>Salvar nova ata</button></section>` : ''}
<h2>Atas registradas</h2>${done.length ? `<div class=tw><table class=ata><thead><tr>${head}${admin ? '<th>Ação</th>' : ''}</tr></thead><tbody>${done.map(x => { const a = S.atas[x.id], v = ids.map(t => sum(a.s[t])), mx = Math.max(...v); return `<tr><th scope=row><a href="#" data-a=openAta data-id=${x.id} style="color:inherit">${esc(x.n)}</a></th>${v.map(n => `<td style="${n === mx && n > 0 ? 'font-weight:800' : ''}">${n}</td>`).join('')}${admin ? `<td><button class=x data-a=delAta data-id="${x.id}" aria-label="Apagar ata ${esc(x.n)}">✕</button></td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : '<p class=mute>Nenhuma ata salva ainda.</p>'}`;
}
function vEq() {
  return `<h2>Equipes</h2><p class=mute>Consulte os integrantes e, como administrador, altere os nomes e cargos quando necessário.</p>${TEAMS.map(t => { const e = eq(t.id), count = e.m.filter(Boolean).length + Number(Boolean(e.l)) + Number(Boolean(e.v)); return `<details data-team=${t.id} ${col(t.id)}><summary><img src="/img/${t.id}.jpg" alt=""><span>${t.n}<br><small class=mute>${count} integrantes</small></span></summary>
<p><a class=team-ig href="${esc(t.ig)}" target=_blank rel="noopener noreferrer">Instagram oficial de ${t.n} ↗</a></p>
${admin ? `<div class=team-editor><div class=team-fields><label>Líder<input data-role=l value="${esc(e.l)}" aria-label="Líder da equipe ${t.s}"></label><label>Vice-líder<input data-role=v value="${esc(e.v)}" aria-label="Vice-líder da equipe ${t.s}"></label></div>
<h3>Integrantes</h3><ul class=names>${e.m.map((n, i) => `<li><input data-member value="${esc(n)}" aria-label="Integrante ${i + 1} da equipe ${t.s}"><button class=x data-a=rm data-id=${t.id} data-n=${i} aria-label="Remover integrante ${i + 1}">✕</button></li>`).join('')}</ul>
<div class=row><input id=ad-${t.id} aria-label="Novo integrante de ${t.s}" placeholder="Nome do integrante"><button class=btn data-a=add data-id=${t.id}>Adicionar</button></div><button class=btn data-a=saveTeam data-id=${t.id}>Salvar alterações</button></div>` : `<p><b>Líder:</b> ${esc(e.l || 'Não informado')}<br><b>Vice-líder:</b> ${esc(e.v || 'Não informado')}</p><ul class=names>${e.m.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`}</details>`; }).join('')}`;
}
function vMega() {
  const mega = normalizeMega(S.mega), round = mega.round;
  const active = round && ['ready', 'countdown', 'running', 'paused'].includes(round.status);
  const selectedList = mega.lists.find(list => list.id === MD.listId) || mega.lists[0];
  if (selectedList && selectedList.id !== MD.listId) MD.listId = selectedList.id;
  const duration = MD.durationSeconds ?? mega.durationSeconds, points = MD.pointsPerCorrect ?? mega.pointsPerCorrect, penalty = MD.penalty ?? mega.penalty, skips = MD.skipLimit ?? mega.skipLimit;
  const lists = mega.lists.map(list => `<option value="${esc(list.id)}" ${selectedList?.id === list.id ? 'selected' : ''}>${esc(list.name)}</option>`).join('');
  const roundView = !round ? `<p class=mute>Escolha uma equipe e uma lista para iniciar.</p>` : `
<section class=mega-round>
<div class=mega-round-head><div><strong>${esc(T[round.teamId]?.n || 'Equipe')}</strong>${round.clueGiver ? `<span class=mute> · Dicas: ${esc(round.clueGiver)}</span>` : ''}</div><span class=mega-clock aria-live=polite>${Math.ceil(remainingMs(round) / 1000)}s</span></div>
<p class=mute>Senha ${Math.min(round.index + 1, round.words.length)} de ${round.words.length} · ${round.correct} acertos · ${round.skipped} puladas · ${round.errors} erros</p>
${round.status === 'running' || round.status === 'paused' ? `<div class=mega-word><span>${round.status === 'paused' ? 'Senha (oculta no telão durante a pausa)' : 'Senha atual'}</span><strong>${esc(round.words[round.index] || '')}</strong></div>` : `<div class="mega-word hidden"><strong>${round.status === 'finished' ? 'Rodada encerrada' : round.status === 'countdown' ? 'Prepare-se!' : round.status === 'ready' ? 'Próxima equipe' : 'Pronto para jogar'}</strong></div>`}
${round.status === 'ready' ? '<button class=btn data-a=startMega>Iniciar · contagem 3, 2, 1</button><button class=btn data-a=nextMega>Cancelar preparação</button>' : ''}
${round.status === 'countdown' ? '<p class=note>Contagem regressiva em andamento no telão.</p><button class=btn data-a=nextMega>Cancelar contagem</button>' : ''}
${round.status === 'running' ? `<div class=mega-actions><button class="tb mega-correct" data-a=megaCorrect>Acertou</button><button class="tb mega-skip" data-a=megaSkip ${round.skipLimit > 0 && round.skipped >= round.skipLimit ? 'disabled' : ''}>Pular${round.skipLimit > 0 ? ` (${round.skipLimit - round.skipped} restantes)` : ''}</button><button class="tb mega-error" data-a=megaError>Errou</button></div>
<div class=mega-actions><button class=tb data-a=adjustMegaTime data-n=10>+10s</button><button class=tb data-a=adjustMegaTime data-n=-10>−10s</button><button class=tb data-a=pauseMega>Pausar</button></div><button class=btn data-a=finishMega>Encerrar rodada</button>` : ''}
${round.status === 'paused' ? '<button class=btn data-a=resumeMega>Retomar</button><button class=btn data-a=finishMega>Encerrar rodada</button>' : ''}
${round.status === 'paused' ? `<div class=mega-actions><button class=tb data-a=adjustMegaTime data-n=10>+10s</button><button class=tb data-a=adjustMegaTime data-n=-10>−10s</button></div>` : ''}
${round.status === 'finished' ? `<p class=note>${round.correct} acertos · ${round.skipped} puladas · ${round.errors} erros</p><button class=btn data-a=nextMega>Preparar próxima equipe</button>` : ''}
${round.status === 'running' ? '<p class=mute>Atalhos: A = acertou · P = pular · E = errou · Espaço = pausar/retomar</p>' : ''}
</section>`;
  const editor = selectedList ? `<label for=mega-list-name>Nome da lista</label><input id=mega-list-name value="${esc(selectedList.name)}">
<label for=mega-list-words>Palavras (uma por linha)</label><textarea id=mega-list-words rows=6>${selectedList.words.map(esc).join('\n')}</textarea>
<p class=mute>${(selectedList.usedWords || []).length} de ${selectedList.words.length} palavras já usadas.</p>
<div class=row><button class=btn data-a=saveMegaList>Salvar lista</button><button class=x data-a=deleteMegaList>Excluir lista</button></div><button class=btn data-a=resetMegaList>Marcar todas como não usadas</button>` : '<p class=mute>Cadastre uma lista com palavras para jogar.</p>';
  const setup = `<h2>Placar do Mega Senha</h2><div class=mega-scores>${TEAMS.map(team => `<label style="--c:var(--${team.id})">${team.s}<input type=number step=1 data-mega-score="${team.id}" value="${mega.scores[team.id] || 0}"><button class=x data-a=saveMegaScore data-id="${team.id}">Corrigir placar</button></label>`).join('')}</div>
<h2>Configurar rodada</h2><label for=mega-team>Equipe</label><select id=mega-team data-mega-setting=teamId>${TEAMS.map(team => `<option value="${team.id}" ${MD.teamId === team.id ? 'selected' : ''}>${team.n}</option>`).join('')}</select>
<label for=mega-giver>Quem dá as dicas</label><input id=mega-giver maxlength=100 value="${esc(MD.clueGiver)}" data-mega-setting=clueGiver>
<label for=mega-list>Lista de palavras</label><select id=mega-list data-mega-setting=listId><option value="">Selecione</option>${lists}</select>
<div class=team-fields><label for=mega-duration>Tempo (segundos)<input id=mega-duration type=number min=1 max=3600 value="${esc(duration)}" data-mega-setting=durationSeconds></label><label for=mega-points>Pontos por acerto<input id=mega-points type=number min=0 step=1 value="${esc(points)}" data-mega-setting=pointsPerCorrect></label></div>
<label for=mega-penalty>Penalidade por erro</label><input id=mega-penalty type=number min=0 step=1 value="${esc(penalty)}" data-mega-setting=penalty>
<label for=mega-skip-limit>Limite de pulos (0 = ilimitado)</label><input id=mega-skip-limit type=number min=0 step=1 value="${esc(skips)}" data-mega-setting=skipLimit>
<button class=btn data-a=saveMegaSettings>Salvar configurações</button>
${!round || round.status === 'finished' ? `<button class=btn data-a=prepareMega ${selectedList?.words?.length ? '' : 'disabled'}>Preparar rodada</button>` : ''}
<h2>Listas de palavras</h2><label for=mega-new-name>Nova lista</label><input id=mega-new-name maxlength=80 value="${esc(MD.newListName)}" data-mega-draft=name>
<label for=mega-new-words>Palavras (uma por linha)</label><textarea id=mega-new-words rows=5 data-mega-draft=words>${esc(MD.newListWords)}</textarea>
<button class=btn data-a=createMegaList>Criar lista</button>
${selectedList ? `<h2>Editar lista selecionada</h2>${editor}` : ''}
<h2>Partidas recentes</h2>${mega.history.length ? `<ul class=hist>${mega.history.map(game => `<li><b>${esc(T[game.teamId]?.s || 'Equipe')}</b><span>${game.correct} acertos · ${game.skipped} puladas · ${game.errors} erros</span><time>${game.finishedAt ? new Date(game.finishedAt).toLocaleString('pt-BR') : ''}</time><button class=x data-a=deleteMegaRound data-id="${esc(game.id)}" aria-label="Apagar rodada da equipe ${esc(T[game.teamId]?.n || 'Equipe')}">✕</button></li>`).join('')}</ul>` : '<p class=mute>Nenhuma partida registrada.</p>'}`;
  return `<h1>Mega Senha</h1><p><a class=doc-link href="/megasenha/telao" target=_blank rel="noopener noreferrer">Abrir telão ↗</a></p>
${!S.megaLoaded ? '<p class=note role=status>Carregando os dados do jogo...</p>' : ''}
${active ? `<div class=mega-live-scores>${TEAMS.map(team => `<span style="--c:var(--${team.id})">${team.s}: <b>${mega.scores[team.id] || 0}</b></span>`).join('')}</div>` : ''}
${roundView}
${active ? '<p class=note>As listas e configurações ficam ocultas durante a rodada para evitar revelar outras senhas.</p>' : setup}
`;
}
function vMegaProjector() {
  if (projectorError) {
    const permissionDenied = projectorError.code === 'permission-denied';
    const message = permissionDenied
      ? 'O Firestore recusou a leitura do telão.'
      : 'Não foi possível sincronizar o telão. Verifique a conexão e tente novamente.';
    $('#app').innerHTML = `<div class="projector projector-error" role=alert><p>${message}</p>${permissionDenied ? `<p>Projeto conectado: <b>${esc(st.firebaseProjectId || 'não identificado')}</b></p><p>No Firestore desse projeto, publique a regra <code>match /megasenha/{id} { allow get: if id == 'state'; }</code> e tente novamente.</p>` : ''}<button class=btn data-a=retryProjector>Tentar novamente</button></div>`;
    return;
  }
  const mega = normalizeMega(S.mega), round = mega.round;
  const now = Date.now();
  const countdownMs = round?.status === 'countdown' ? remainingMs(round, now) : null;
  const countdownPlayedMs = countdownPlayingMs(round, now);
  const playing = round?.status === 'running' || countdownPlayedMs !== null;
  const paused = round?.status === 'paused';
  const ms = round?.status === 'countdown'
    ? countdownMs > 0 ? countdownMs : countdownPlayedMs
    : round ? remainingMs(round, now) : 0;
  const seconds = Math.ceil(Math.max(0, ms || 0) / 1000);
  const rankingRows = Object.entries(mega.scores)
    .map(([id, points]) => ({ id, points: Number(points) || 0 }))
    .sort((a, b) => b.points - a.points);
  const stateText = !round ? 'Aguardando próxima equipe' : round.status === 'ready'
    ? `Próxima equipe: ${T[round.teamId]?.n || 'Equipe'}`
    : round.status === 'finished' ? `Fim da rodada · ${round.correct} acertos` : '';
  const showWord = playing && round && countdownMs <= 0;
  $('#app').innerHTML = `<div class=projector>
<header class=projector-head><span>${round ? esc(T[round.teamId]?.n || 'Equipe') : 'Jogos Florais'}</span>${round?.clueGiver ? `<span>Dicas: ${esc(round.clueGiver)}</span>` : ''}</header>
<section class=projector-center>
${stateText ? `<p class=projector-state>${esc(stateText)}</p>` : ''}
${round?.status === 'countdown' && countdownMs > 0 ? `<p class=projector-count>${Math.ceil(countdownMs / 1000)}</p>` : ''}
${playing && round && (showWord || round.status === 'running') ? `<p class=projector-word>${esc(round.words[round.index] || '')}</p>` : ''}
${paused ? '<p class=projector-state>⏸ PAUSADO</p>' : ''}
${(playing || paused) ? `<p class="projector-time ${seconds <= 10 && playing ? 'alerta' : ''}">${seconds}</p>` : ''}
</section>
<footer class=projector-footer>${rankingRows.map(team => `<span>${esc(T[team.id]?.s || team.id)}: <b>${team.points}</b></span>`).join('')}</footer>
</div>`;
}
function render() {
  if (projectorMode) { vMegaProjector(); return; }
  if (st.cloud && !admin && !['placar', 'info'].includes(tab)) tab = 'placar';
  if (st.cloud && admin && tab === 'info') tab = 'placar';
  const tabs = [['placar', 'Placar'], ['info', 'Informações'], ['kat', 'Katricos'], ['ata', 'Atas'], ['eq', 'Equipes'], ['mega', 'Mega Senha']];
  const visibleTabs = st.cloud && admin ? tabs.filter(([k]) => k !== 'info') : admin || !st.cloud ? tabs : tabs.slice(0, 2);
  $('#tabs').innerHTML = visibleTabs.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-a=tab data-id=${k}>${n}</button>`).join('');
  $('#tabs').classList.toggle('readonly', st.cloud && !admin);
  $('#who').textContent = !st.cloud ? 'Modo local' : admin ? 'Sair' : 'Entrar';
  const note = !st.cloud ? '<p class=note>Firebase não configurado: os dados ficam só neste aparelho.</p>' : '';
  $('#app').innerHTML = note + { placar: vPlacar, info: vInfo, kat: vKat, ata: vAta, eq: vEq, mega: vMega }[tab]();
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
  retryProjector: () => {
    if (projectorMode && st.cloud) subscribeProjector();
  },
  tab: d => { if (st.cloud && ((!admin && !['placar', 'info'].includes(d.id)) || (admin && d.id === 'info'))) return; tab = d.id; render(); scrollTo(0, 0); },
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
  saveMegaSettings: () => {
    if (!admin || !S.megaLoaded) return;
    const mega = normalizeMega(S.mega);
    const durationSeconds = Number(MD.durationSeconds ?? mega.durationSeconds), pointsPerCorrect = Number(MD.pointsPerCorrect ?? mega.pointsPerCorrect), penalty = Number(MD.penalty ?? mega.penalty), skipLimit = Number(MD.skipLimit ?? mega.skipLimit);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 3600 || !Number.isFinite(pointsPerCorrect) || pointsPerCorrect < 0 || !Number.isFinite(penalty) || penalty < 0 || !Number.isInteger(skipLimit) || skipLimit < 0) {
      toast('Informe tempo entre 1 e 3600 segundos e pontos/penalidade não negativos.');
      return;
    }
    guard(st.saveMega({ ...mega, durationSeconds, pointsPerCorrect, penalty, skipLimit })).then(saved => { if (saved) render(); });
  },
  createMegaList: () => {
    if (!admin || !S.megaLoaded) return;
    const name = MD.newListName.trim(), words = [...new Set(MD.newListWords.split(/\r?\n/).map(word => word.trim()).filter(Boolean))];
    if (!name || !words.length) { toast('Informe o nome da lista e ao menos uma palavra.'); return; }
    const mega = normalizeMega(S.mega), id = idOf(name);
    if (!id || mega.lists.some(list => list.id === id)) { toast('Já existe uma lista com esse nome.'); return; }
    const next = { ...mega, lists: [...mega.lists, { id, name, words }] };
    MD.listId = id;
    MD.newListName = '';
    MD.newListWords = '';
    guard(st.saveMega(next)).then(saved => { if (saved) render(); });
  },
  saveMegaList: () => {
    if (!admin || !S.megaLoaded) return;
    const mega = normalizeMega(S.mega), list = mega.lists.find(item => item.id === MD.listId);
    if (!list) return;
    const name = $('#mega-list-name').value.trim(), words = [...new Set($('#mega-list-words').value.split(/\r?\n/).map(word => word.trim()).filter(Boolean))], id = idOf(name);
    if (!name || !words.length) { toast('Informe o nome da lista e ao menos uma palavra.'); return; }
    if (!id || mega.lists.some(item => item.id !== list.id && item.id === id)) { toast('Já existe uma lista com esse nome.'); return; }
    const next = { ...mega, lists: mega.lists.map(item => item.id === list.id ? { ...item, id, name, words, usedWords: (item.usedWords || []).filter(word => words.includes(word)) } : item) };
    MD.listId = id;
    guard(st.saveMega(next)).then(saved => { if (saved) render(); });
  },
  deleteMegaList: () => {
    if (!admin || !S.megaLoaded) return;
    const mega = normalizeMega(S.mega);
    if (mega.round && mega.round.status !== 'finished' && mega.round.listId === MD.listId) { toast('Encerre a rodada antes de excluir esta lista.'); return; }
    if (!confirm('Excluir esta lista de palavras?')) return;
    guard(st.saveMega({ ...mega, lists: mega.lists.filter(list => list.id !== MD.listId) })).then(saved => {
      if (saved) { MD.listId = ''; render(); }
    });
  },
  resetMegaList: () => {
    if (!admin || !S.megaLoaded) return;
    const mega = normalizeMega(S.mega), list = mega.lists.find(item => item.id === MD.listId);
    if (!list) return;
    guard(st.saveMega({ ...mega, lists: mega.lists.map(item => item.id === list.id ? { ...item, usedWords: [] } : item) }));
  },
  prepareMega: () => {
    if (!admin || !S.megaLoaded) return;
    const mega = normalizeMega(S.mega), list = mega.lists.find(item => item.id === MD.listId);
    if ((mega.round && mega.round.status !== 'finished') || !list?.words?.length) { toast('Selecione uma lista com palavras e encerre a rodada anterior.'); return; }
    const durationSeconds = Number(MD.durationSeconds ?? mega.durationSeconds), pointsPerCorrect = Number(MD.pointsPerCorrect ?? mega.pointsPerCorrect), penalty = Number(MD.penalty ?? mega.penalty), skipLimit = Number(MD.skipLimit ?? mega.skipLimit);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 3600 || !Number.isFinite(pointsPerCorrect) || pointsPerCorrect < 0 || !Number.isFinite(penalty) || penalty < 0 || !Number.isInteger(skipLimit) || skipLimit < 0) {
      toast('Revise o tempo, limite de pulos e pontuação da rodada.');
      return;
    }
    const configured = { ...mega, durationSeconds, pointsPerCorrect, penalty, skipLimit };
    const next = prepareRound(configured, { teamId: MD.teamId, listId: list.id, clueGiver: MD.clueGiver.trim() });
    if (!next) { toast('Todas as palavras desta lista já foram usadas. Redefina o uso ou escolha outra lista.'); return; }
    timerEndedRoundId = '';
    guard(st.saveMega(next)).then(saved => { if (saved) render(); });
  },
  startMega: () => {
    const mega = normalizeMega(S.mega);
    if (!admin || !mega.round || mega.round.status !== 'ready') return;
    const round = { ...mega.round, status: 'countdown', remainingMs: 3000, startedAt: null };
    guard(st.saveMega(markCurrentWordUsed({ ...mega, round }), true)).then(saved => { if (saved) render(); });
  },
  megaCorrect: () => {
    const mega = normalizeMega(S.mega), next = recordOutcome(mega, 'correct');
    if (next === mega) { toast('O tempo da rodada acabou.'); return; }
    guard(st.saveMega(next, true)).then(saved => { if (saved) render(); });
  },
  megaSkip: () => {
    const mega = normalizeMega(S.mega), next = recordOutcome(mega, 'skip');
    if (next === mega) {
      toast(remainingMs(mega.round) <= 0 ? 'O tempo da rodada acabou.' : 'O limite de pulos desta rodada foi atingido.');
      return;
    }
    guard(st.saveMega(next, true)).then(saved => { if (saved) render(); });
  },
  megaError: () => {
    const mega = normalizeMega(S.mega), next = recordOutcome(mega, 'error');
    if (next === mega) { toast('O tempo da rodada acabou.'); return; }
    guard(st.saveMega(next, true)).then(saved => { if (saved) render(); });
  },
  pauseMega: () => {
    const mega = normalizeMega(S.mega), round = mega.round;
    if (!round || round.status !== 'running') return;
    const nextRound = { ...round, status: 'paused', remainingMs: remainingMs(round), startedAt: null };
    guard(st.saveMega({ ...mega, round: nextRound })).then(saved => { if (saved) render(); });
  },
  resumeMega: () => {
    const mega = normalizeMega(S.mega), round = mega.round;
    if (!round || round.status !== 'paused' || remainingMs(round) <= 0) return;
    guard(st.saveMega({ ...mega, round: { ...round, status: 'running', startedAt: null } }, true)).then(saved => { if (saved) render(); });
  },
  finishMega: () => {
    const mega = normalizeMega(S.mega);
    if (!mega.round) return;
    if (!confirm('Encerrar esta rodada?')) return;
    guard(st.saveMega(finishRound(mega))).then(saved => { if (saved) render(); });
  },
  deleteMegaRound: d => {
    const mega = normalizeMega(S.mega);
    if (!admin || !S.megaLoaded || !mega.history.some(round => round.id === d.id)) return;
    if (!confirm('Apagar esta rodada do histórico? Esta ação não pode ser desfeita.')) return;
    guard(st.saveMega(deleteRound(mega, d.id))).then(saved => { if (saved) render(); });
  },
  nextMega: () => {
    const mega = normalizeMega(S.mega);
    if (!mega.round || !['ready', 'countdown', 'finished'].includes(mega.round.status)) return;
    timerStartedRoundId = '';
    guard(st.saveMega({ ...mega, round: null })).then(saved => { if (saved) render(); });
  },
  adjustMegaTime: d => {
    const mega = normalizeMega(S.mega), round = mega.round, adjustment = Number(d.n) * 1000;
    if (!round || !['running', 'paused'].includes(round.status) || !Number.isFinite(adjustment)) return;
    const nextRound = { ...round, remainingMs: Math.max(0, remainingMs(round) + adjustment) };
    if (round.status === 'running') nextRound.startedAt = null;
    guard(st.saveMega({ ...mega, round: nextRound }, round.status === 'running')).then(saved => { if (saved) render(); });
  },
  saveMegaScore: d => {
    const mega = normalizeMega(S.mega), input = document.querySelector(`[data-mega-score="${d.id}"]`), score = Number(input?.value);
    if (!Number.isFinite(score)) { toast('Informe um placar válido.'); return; }
    guard(st.saveMega({ ...mega, scores: { ...mega.scores, [d.id]: score } })).then(saved => { if (saved) render(); });
  },
  openAta: d => { A = d.id; render(); scrollTo(0, 0); },
  saveAta: () => { const s = { pp: [], sl: [], gg: [] }; document.querySelectorAll('input[data-t]').forEach(i => s[i.dataset.t].push(+i.value || 0)); guard(st.saveAta(A, { s, juiz: $('#juiz').value.trim(), obs: $('#obs').value.trim(), ts: Date.now() })); },
  addCriterion: () => { ataDraft.c.push(''); render(); },
  removeCriterion: d => { if (ataDraft.c.length > 1) ataDraft.c.splice(+d.n, 1); render(); },
  saveCustomAta: () => {
    const name = ataDraft.n.trim(), criteria = ataDraft.c.map(c => c.trim()).filter(Boolean), id = idOf(name);
    if (!name || !id || !criteria.length) { toast('Informe o nome da ata e pelo menos um critério.'); return; }
    if ([...M, ...S.customAtas].some(a => a.id === id)) { toast('Já existe uma ata com esse nome.'); return; }
    guard(st.saveCustomAta(id, { n: name, c: criteria })).then(saved => {
      if (saved) { A = id; ataDraft = { n: '', c: [''] }; render(); }
    });
  },
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
function subscribeProjector() {
  if (stopProjectorWatch) stopProjectorWatch();
  projectorError = null;
  vMegaProjector();
  stopProjectorWatch = st.watchPublicMega((mega, error) => {
    projectorError = error;
    if (!error) { S.mega = normalizeMega(mega); S.megaLoaded = true; }
    vMegaProjector();
  });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) { e.preventDefault(); const k = b.closest('details')?.open; act[b.dataset.a]?.(b.dataset); if (k && tab === 'eq') document.querySelectorAll('details').forEach(x => x.open = x.contains(b)); } });
document.addEventListener('input', e => {
  const i = e.target.dataset.i;
  if (i === 'v') K.v = +e.target.value; if (i === 'm') K.m = e.target.value;
  if (e.target.dataset.megaSetting === 'clueGiver') MD.clueGiver = e.target.value;
  if (e.target.dataset.megaSetting && !['teamId', 'listId', 'clueGiver'].includes(e.target.dataset.megaSetting)) MD[e.target.dataset.megaSetting] = e.target.value === '' ? '' : Number(e.target.value);
  if (e.target.dataset.megaDraft === 'name') MD.newListName = e.target.value;
  if (e.target.dataset.megaDraft === 'words') MD.newListWords = e.target.value;
  if (e.target.hasAttribute('data-draft-name')) ataDraft.n = e.target.value;
  if (e.target.hasAttribute('data-draft-criterion')) ataDraft.c[+e.target.dataset.draftCriterion] = e.target.value;
  if (i === 'live') ids.forEach(t => { let x = 0; document.querySelectorAll(`input[data-t=${t}]`).forEach(n => x += +n.value || 0); $('#tt-' + t).textContent = r2(x); });
});
document.addEventListener('change', e => {
  if (e.target.dataset.c === 'ata') { A = e.target.value; render(); }
  if (e.target.dataset.i === 'v') render();
  if (e.target.dataset.megaSetting === 'teamId') MD.teamId = e.target.value;
  if (e.target.dataset.megaSetting === 'listId') { MD.listId = e.target.value; render(); }
});
setInterval(() => {
  const round = S.mega?.round;
  if (projectorMode) { vMegaProjector(); return; }
  if (!admin || !round) return;
  if (round.status === 'countdown' && !round.startedAt) {
    if (timerStartedRoundId === round.id) return;
    timerStartedRoundId = round.id;
    guard(st.saveMega(normalizeMega(S.mega), true)).then(saved => {
      if (!saved) timerStartedRoundId = '';
    });
    return;
  }
  if (round.status === 'countdown' && remainingMs(round) <= 0) {
    if (timerEndedRoundId === `start-${round.id}`) return;
    timerEndedRoundId = `start-${round.id}`;
    const mega = normalizeMega(S.mega);
    guard(st.saveMega({ ...mega, round: { ...round, status: 'running', remainingMs: round.durationSeconds * 1000, startedAt: null } }, true)).then(saved => {
      if (saved) render();
      else timerEndedRoundId = '';
    });
    return;
  }
  if (round.status !== 'running') return;
  if (remainingMs(round) <= 0) {
    if (timerEndedRoundId === round.id) return;
    timerEndedRoundId = round.id;
    guard(st.saveMega(finishRound(normalizeMega(S.mega)))).then(saved => { if (saved) render(); else timerEndedRoundId = ''; });
    return;
  }
  if (tab === 'mega') {
    const second = Math.ceil(remainingMs(round) / 1000);
    if (second !== timerSecond) { timerSecond = second; refresh(); }
  }
}, 250);

document.addEventListener('keydown', event => {
  if (event.repeat || projectorMode || !admin || tab !== 'mega' || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName || '')) return;
  const actions = { a: 'megaCorrect', p: 'megaSkip', e: 'megaError' };
  const action = actions[event.key.toLowerCase()];
  if (action) act[action]();
  if (event.code === 'Space') {
    event.preventDefault();
    const round = S.mega?.round;
    if (round?.status === 'running') act.pauseMega();
    else if (round?.status === 'paused') act.resumeMega();
  }
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
if (projectorMode) {
  document.body.classList.add('mega-projector');
  document.title = 'Mega Senha · Telão';
  if (st.cloud) {
    subscribeProjector();
  } else {
    st.watch(s => { S = s; vMegaProjector(); });
  }
} else {
  st.onAdmin(a => { admin = a; refresh(); });
  st.watch(s => { S = s; refresh(); });
}
render();
