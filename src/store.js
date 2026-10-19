import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { resolveAdminEmail } from './auth.js';

const e = import.meta.env;
const cfg = { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: e.VITE_FIREBASE_APP_ID };
const adminEmails = (e.VITE_ADMIN_EMAILS || e.VITE_ADMIN_EMAIL || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);
const configuredAdminUsername = (e.VITE_ADMIN_USERNAME || '').trim().toLowerCase();
export const cloud = Boolean(cfg.apiKey && cfg.projectId);
let db, auth;
if (cloud) { const app = initializeApp(cfg); db = getFirestore(app); auth = getAuth(app); }

// Sem .env preenchido o site roda em modo local (localStorage), só para testar.
const S = { atas: {}, aj: [], eq: {}, dataLoaded: !cloud, placar: { paused: false, snapshot: null, loaded: !cloud } };
const KEY = 'katricos-local';
let emit = () => {};
if (!cloud) {
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch (err) { console.error('Não foi possível carregar os dados locais.', err); }
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
    S.dataLoaded = ready.size === 3;
    cb(S);
  }, err => console.error(name, err));
  sub('atas', d => { S.atas = {}; d.forEach(x => (S.atas[x.id] = x.data())); });
  sub('ajustes', d => { S.aj = d.map(x => ({ id: x.id, ...x.data() })).sort((a, b) => b.ts - a.ts); });
  sub('equipes', d => { S.eq = {}; d.forEach(x => (S.eq[x.id] = x.data())); });
  onSnapshot(doc(db, 'config', 'placar'), snap => {
    S.placar = { ...(snap.exists() ? snap.data() : {}), loaded: true };
    cb(S);
  }, err => console.error('config/placar', err));
}
export const onAdmin = cb => (cloud ? onAuthStateChanged(auth, u => cb(adminEmails.includes(u?.email?.trim().toLowerCase()))) : cb(true));
export const login = (username, pass) => {
  const email = resolveAdminEmail(username, adminEmails, ['terezinha.santa', configuredAdminUsername]);
  if (!email || !adminEmails.includes(email)) return Promise.reject(new Error('admin-config'));
  return signInWithEmailAndPassword(auth, email, pass);
};
export const logout = () => signOut(auth);
export const saveAta = (id, o) => (cloud ? setDoc(doc(db, 'atas', id), o) : persist(s => ({ ...s, atas: { ...s.atas, [id]: o } })));
export const delAta = id => (cloud ? deleteDoc(doc(db, 'atas', id)) : persist(s => {
  const atas = { ...s.atas };
  delete atas[id];
  return { ...s, atas };
}));
export const setPlacarPaused = paused => {
  const snapshot = paused ? { atas: S.atas, aj: S.aj, ts: Date.now() } : null;
  return cloud
    ? setDoc(doc(db, 'config', 'placar'), { paused, snapshot })
    : persist(s => ({ ...s, placar: { paused, snapshot, loaded: true } }));
};
export const saveEq = (id, o) => (cloud ? setDoc(doc(db, 'equipes', id), o) : persist(s => ({ ...s, eq: { ...s.eq, [id]: o } })));
export const addAj = o => (cloud ? addDoc(collection(db, 'ajustes'), o) : persist(s => ({ ...s, aj: [{ ...o, id: 'l' + crypto.randomUUID() }, ...s.aj] })));
export const delAj = id => (cloud ? deleteDoc(doc(db, 'ajustes', id)) : persist(s => ({ ...s, aj: s.aj.filter(a => a.id !== id) })));
