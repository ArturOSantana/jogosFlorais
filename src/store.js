import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

const e = import.meta.env;
const cfg = { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: e.VITE_FIREBASE_APP_ID };
const adminEmail = (e.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
const adminUsername = (e.VITE_ADMIN_USERNAME || 'terezinha.santa').trim().toLowerCase();
export const cloud = Boolean(cfg.apiKey && cfg.projectId);
let db, auth;
if (cloud) { const app = initializeApp(cfg); db = getFirestore(app); auth = getAuth(app); }

// Sem .env preenchido o site roda em modo local (localStorage), só para testar.
const S = { atas: {}, aj: [], eq: {} };
const KEY = 'katricos-local';
let emit = () => {};
if (!cloud) { try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {} }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} emit(S); };

export function watch(cb) {
  emit = cb;
  if (!cloud) return cb(S);
  const sub = (name, fn) => onSnapshot(collection(db, name), s => { fn(s.docs); cb(S); }, err => console.error(name, err));
  sub('atas', d => { S.atas = {}; d.forEach(x => (S.atas[x.id] = x.data())); });
  sub('ajustes', d => { S.aj = d.map(x => ({ id: x.id, ...x.data() })).sort((a, b) => b.ts - a.ts); });
  sub('equipes', d => { S.eq = {}; d.forEach(x => (S.eq[x.id] = x.data())); });
}
export const onAdmin = cb => (cloud ? onAuthStateChanged(auth, u => cb(Boolean(adminEmail && u?.email?.toLowerCase() === adminEmail))) : cb(true));
export const login = (username, pass) => {
  if (!adminEmail || username.trim().toLowerCase() !== adminUsername) return Promise.reject(new Error('admin-config'));
  return signInWithEmailAndPassword(auth, adminEmail, pass);
};
export const logout = () => signOut(auth);
export const saveAta = (id, o) => (cloud ? setDoc(doc(db, 'atas', id), o) : ((S.atas[id] = o), persist()));
export const saveEq = (id, o) => (cloud ? setDoc(doc(db, 'equipes', id), o) : ((S.eq[id] = o), persist()));
export const addAj = o => (cloud ? addDoc(collection(db, 'ajustes'), o) : (S.aj.unshift({ ...o, id: 'l' + o.ts }), persist()));
export const delAj = id => (cloud ? deleteDoc(doc(db, 'ajustes', id)) : ((S.aj = S.aj.filter(a => a.id !== id)), persist()));
