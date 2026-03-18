// ================================================================
//  firebase-auth.js  —  Emotion Skills Lab
//  Handles Google login, user storage, and progress sync
//  Place this file in the ROOT of your GitHub repo
// ================================================================

import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider, browserSessionPersistence, setPersistence }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp }
                                   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── YOUR FIREBASE CONFIG ─────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBZmdpwnQVFiibwEDLK2vXKCmwNX21DMuc",
  authDomain:        "emotion-skills-lab.firebaseapp.com",
  projectId:         "emotion-skills-lab",
  storageBucket:     "emotion-skills-lab.firebasestorage.app",
  messagingSenderId: "946830500447",
  appId:             "1:946830500447:web:fe6f839896b1feb8d531ea"
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// Session only — clears when browser is fully closed
setPersistence(auth, browserSessionPersistence);

// ── SIGN IN ──────────────────────────────────────────────────────
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    await saveUserToFirestore(result.user);
    return result.user;
  } catch(e) {
    console.error("Sign-in error:", e);
    return null;
  }
}

// ── SIGN OUT ─────────────────────────────────────────────────────
export async function signOutUser() {
  try { await signOut(auth); } catch(e) {}
}

// ── SAVE USER ON FIRST LOGIN ─────────────────────────────────────
async function saveUserToFirestore(user) {
  try {
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:        user.uid,
        email:      user.email,
        name:       user.displayName,
        photo:      user.photoURL,
        firstLogin: serverTimestamp(),
        lastLogin:  serverTimestamp(),
        progress:   {}
      });
    } else {
      await updateDoc(ref, { lastLogin: serverTimestamp() });
    }
  } catch(e) { console.error("Firestore save error:", e); }
}

// ── SAVE ACTIVITY PROGRESS TO CLOUD ─────────────────────────────
// Called by each activity when a stage is reached
export async function saveActivityProgress(activityId, stage, done) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const ref = doc(db, "users", user.uid);
    const update = {};
    update[`progress.act${activityId}_stage`] = stage;
    update[`progress.act${activityId}_done`]  = done || false;
    update[`progress.act${activityId}_updated`] = serverTimestamp();
    await updateDoc(ref, update);
  } catch(e) { console.error("Progress save error:", e); }
}

// ── LOAD ALL PROGRESS FROM CLOUD ────────────────────────────────
export async function loadAllProgress() {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) return snap.data().progress || {};
    return {};
  } catch(e) { return null; }
}

// ── GET CURRENT USER ─────────────────────────────────────────────
export function getCurrentUser() {
  return auth.currentUser;
}

// ── LISTEN TO AUTH STATE CHANGES ────────────────────────────────
export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}
