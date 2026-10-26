import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { resolveAdminEmail } from './auth.js';
import { DEFAULT_MEGA, startRoundClock } from './megasenha.js';

const e = import.meta.env;
const cfg = { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: e.VITE_FIREBASE_APP_ID };
export const firebaseProjectId = cfg.projectId;
const adminEmails = (e.VITE_ADMIN_EMAILS || e.VITE_ADMIN_EMAIL || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);
const configuredAdminUsername = (e.VITE_ADMIN_USERNAME || '').trim().toLowerCase();
export const cloud = Boolean(cfg.apiKey && cfg.projectId);
let db, auth;
if (cloud) { const app = initializeApp(cfg); db = getFirestore(app); auth = getAuth(app); }

// Sem .env preenchido o site roda em modo local (localStorage), só para testar.
const S = { atas: {}, avaliacoes: {}, aj: [], audit: [], auditLoaded: !cloud, auditError: null, eq: {}, customAtas: [], mega: DEFAULT_MEGA, megaLoaded: !cloud, dataLoaded: !cloud, placar: { paused: false, snapshot: null, loaded: !cloud } };
const KEY = 'katricos-local';
let emit = () => {};
let stopMegaWatch, stopAuditWatch;
if (!cloud) {
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (err) { console.error('Não foi possível carregar os dados locais.', err); }
  S.avaliacoes ||= {};
  S.audit ||= [];
  S.auditLoaded = true;
}
const persist = update => Promise.resolve().then(() => {
  const next = update(S);
  localStorage.setItem(KEY, JSON.stringify(next));
  Object.assign(S, next);
  emit(S);
});

export function watch(cb) {
  emit = cb;
  if (!cloud) return cb(S);
  const ready = new Set();
  const sub = (name, fn) => onSnapshot(collection(db, name), s => {
    fn(s.docs);
    ready.add(name);
    S.dataLoaded = ready.size === 5;
    cb(S);
  }, err => console.error(name, err));
  sub('atas', d => { S.atas = {}; d.forEach(x => (S.atas[x.id] = x.data())); });
  sub('avaliacoes', d => { S.avaliacoes = {}; d.forEach(x => (S.avaliacoes[x.id] = { id: x.id, ...x.data() })); });
  sub('ajustes', d => { S.aj = d.map(x => ({ id: x.id, ...x.data() })).sort((a, b) => b.ts - a.ts); });
  sub('equipes', d => { S.eq = {}; d.forEach(x => (S.eq[x.id] = x.data())); });
  sub('modalidades', d => { S.customAtas = d.map(x => ({ id: x.id, ...x.data() })); });
  onSnapshot(doc(db, 'config', 'placar'), snap => {
    S.placar = { ...(snap.exists() ? snap.data() : {}), loaded: true };
    cb(S);
  }, err => console.error('config/placar', err));
}
export const watchPublicMega = cb => {
  if (!cloud) {
    cb(S.mega);
    return () => {};
  }
  return onSnapshot(doc(db, 'megasenha', 'state'), snap => {
    cb(snap.exists() ? { ...DEFAULT_MEGA, ...snap.data() } : DEFAULT_MEGA, null);
  }, err => {
    console.error('megasenha/state', err);
    cb(null, err);
  });
};
export const onAdmin = cb => (cloud ? onAuthStateChanged(auth, u => {
  const isAdmin = adminEmails.includes(u?.email?.trim().toLowerCase());
  cb(isAdmin);
  if (stopMegaWatch) { stopMegaWatch(); stopMegaWatch = undefined; }
  if (stopAuditWatch) { stopAuditWatch(); stopAuditWatch = undefined; }
  if (isAdmin) {
    S.auditLoaded = false;
    S.auditError = null;
    stopAuditWatch = onSnapshot(collection(db, 'auditoriaPontos'), snapshot => {
      S.audit = snapshot.docs.map(x => ({ id: x.id, ...x.data() })).sort((a, b) => b.ts - a.ts);
      S.auditLoaded = true;
      S.auditError = null;
      emit(S);
    }, err => {
      console.error('auditoriaPontos', err);
      S.auditError = err.message;
      emit(S);
    });
    stopMegaWatch = onSnapshot(doc(db, 'megasenha', 'state'), snap => {
      S.mega = snap.exists() ? { ...DEFAULT_MEGA, ...snap.data() } : DEFAULT_MEGA;
      S.megaLoaded = true;
      emit(S);
    }, err => console.error('megasenha/state', err));
  } else {
    S.mega = DEFAULT_MEGA;
    S.megaLoaded = false;
    S.audit = [];
    S.auditLoaded = false;
    S.auditError = null;
    emit(S);
  }
}) : cb(true, null));
export const login = (username, pass) => {
  const email = resolveAdminEmail(username, adminEmails, ['terezinha.santa', configuredAdminUsername]);
  if (!email || !adminEmails.includes(email)) return Promise.reject(new Error('admin-config'));
  return signInWithEmailAndPassword(auth, email, pass);
};
export const logout = () => signOut(auth);
export const avaliacaoId = (activityId, judgeId) => `${activityId}__${judgeId}`;
const auditEvent = event => ({
  ...event,
  ts: Date.now(),
  actor: cloud ? auth.currentUser?.email || 'Administrador' : 'Modo local',
  actorUid: cloud ? auth.currentUser?.uid || '' : 'local',
});
const addAuditToBatch = (batch, event) => batch.set(doc(collection(db, 'auditoriaPontos')), auditEvent(event));
export const saveAvaliacao = (activityId, judgeId, o, event) => {
  const id = avaliacaoId(activityId, judgeId), data = { ...o, activityId, juizId: judgeId };
  if (cloud) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'avaliacoes', id), data);
    addAuditToBatch(batch, { ...event, type: 'evaluation', action: 'save', sourceId: id, activityId });
    return batch.commit();
  }
  const entry = { id, ...auditEvent({ ...event, type: 'evaluation', action: 'save', sourceId: id, activityId }) };
  return persist(s => ({
    ...s,
    avaliacoes: { ...s.avaliacoes, [id]: { id, ...data } },
    audit: [entry, ...(s.audit || [])],
  }));
};
export const saveCustomAta = (id, o) => (cloud
  ? setDoc(doc(db, 'modalidades', id), o).then(() => {
    S.customAtas = [...S.customAtas.filter(a => a.id !== id), { id, ...o }];
    emit(S);
  })
  : persist(s => ({ ...s, customAtas: [...s.customAtas.filter(a => a.id !== id), { id, ...o }] })));
export const delAta = (id, activityName, criteria = []) => (cloud
  ? getDocs(query(collection(db, 'avaliacoes'), where('activityId', '==', id))).then(snapshot => {
    const batch = writeBatch(db);
    snapshot.docs.forEach(x => {
      const evaluation = x.data();
      addAuditToBatch(batch, {
        type: 'evaluation',
        action: 'delete',
        sourceId: x.id,
        activityId: id,
        activityName,
        criteria,
        juiz: evaluation.juiz,
        before: evaluation.s,
        obs: evaluation.obs || '',
      });
      batch.delete(x.ref);
    });
    const legacy = S.atas[id];
    if (legacy && !snapshot.docs.some(x => x.data().juizId === encodeURIComponent(String(legacy.juiz || '').trim().toLocaleLowerCase('pt-BR')))) {
      addAuditToBatch(batch, {
        type: 'evaluation',
        action: 'delete',
        sourceId: `ata:${id}`,
        activityId: id,
        activityName,
        criteria,
        juiz: legacy.juiz || 'Registro anterior',
        before: legacy.s,
        obs: legacy.obs || '',
      });
    }
    batch.delete(doc(db, 'atas', id));
    return batch.commit();
  })
  : persist(s => {
    const atas = { ...s.atas }, avaliacoes = { ...s.avaliacoes };
    const events = [];
    Object.entries(avaliacoes).forEach(([key, evaluation]) => {
      if (evaluation.activityId !== id) return;
      events.push({
        id: `audit-${crypto.randomUUID()}`,
        ...auditEvent({ type: 'evaluation', action: 'delete', sourceId: evaluation.id || key, activityId: id, activityName, criteria, juiz: evaluation.juiz, before: evaluation.s, obs: evaluation.obs || '' }),
      });
    });
    const legacy = atas[id];
    const legacyMigrated = legacy && Object.values(avaliacoes).some(evaluation =>
      evaluation.activityId === id && evaluation.juizId === encodeURIComponent(String(legacy.juiz || '').trim().toLocaleLowerCase('pt-BR')));
    if (legacy && !legacyMigrated) events.push({
      id: `audit-${crypto.randomUUID()}`,
      ...auditEvent({ type: 'evaluation', action: 'delete', sourceId: `ata:${id}`, activityId: id, activityName, criteria, juiz: legacy.juiz || 'Registro anterior', before: legacy.s, obs: legacy.obs || '' }),
    });
    delete atas[id];
    Object.keys(avaliacoes).forEach(key => { if (avaliacoes[key].activityId === id) delete avaliacoes[key]; });
    return { ...s, atas, avaliacoes, audit: [...events, ...(s.audit || [])] };
  }));
export const setPlacarPaused = paused => {
  const snapshot = paused ? { atas: S.atas, avaliacoes: S.avaliacoes, aj: S.aj, ts: Date.now() } : null;
  return cloud
    ? setDoc(doc(db, 'config', 'placar'), { paused, snapshot })
    : persist(s => ({ ...s, placar: { paused, snapshot, loaded: true } }));
};
export const saveEq = (id, o) => (cloud ? setDoc(doc(db, 'equipes', id), o) : persist(s => ({ ...s, eq: { ...s.eq, [id]: o } })));
export const saveMega = (data, startClock = false) => {
  if (!cloud) {
    const localData = startClock ? startRoundClock(data, Date.now()) : data;
    return persist(s => ({ ...s, mega: localData }));
  }
  const saved = startClock ? startRoundClock(data, serverTimestamp()) : data;
  return setDoc(doc(db, 'megasenha', 'state'), saved);
};
export const addAj = o => {
  if (cloud) {
    const batch = writeBatch(db), adjustmentRef = doc(collection(db, 'ajustes'));
    batch.set(adjustmentRef, o);
    addAuditToBatch(batch, { type: 'adjustment', action: 'create', adjustment: { ...o, id: adjustmentRef.id }, sourceId: adjustmentRef.id });
    return batch.commit();
  }
  const adjustment = { ...o, id: 'l' + crypto.randomUUID() };
  const entry = { id: `audit-${crypto.randomUUID()}`, ...auditEvent({ type: 'adjustment', action: 'create', adjustment, sourceId: adjustment.id }) };
  return persist(s => ({ ...s, aj: [adjustment, ...s.aj], audit: [entry, ...(s.audit || [])] }));
};
export const delAj = id => {
  const adjustment = S.aj.find(item => item.id === id);
  if (!adjustment) return Promise.reject(new Error(`Lançamento de katricos não encontrado: ${id}`));
  if (cloud) {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'ajustes', id));
    addAuditToBatch(batch, { type: 'adjustment', action: 'delete', adjustment: { ...adjustment, id }, sourceId: id });
    return batch.commit();
  }
  const entry = { id: `audit-${crypto.randomUUID()}`, ...auditEvent({ type: 'adjustment', action: 'delete', adjustment, sourceId: id }) };
  return persist(s => ({ ...s, aj: s.aj.filter(item => item.id !== id), audit: [entry, ...(s.audit || [])] }));
};
