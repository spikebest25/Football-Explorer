import { auth, db, googleProvider } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const DEFAULT_USER_DATA = {
  coins: 1000,
  collection: [],
  favorites: [],
  packsOpened: 0,
  bestPull: "None",
  duplicateProtection: 0,
  luckyBooster: false,
  iconBooster: false,
  dailyReward: ""
};

// Helper to grab existing local storage data from guest session
function getLocalGuestData() {
  return {
    coins: Number(localStorage.getItem("coins")) || 1000,
    collection: JSON.parse(localStorage.getItem("collection")) || [],
    favorites: JSON.parse(localStorage.getItem("favorites")) || [],
    packsOpened: Number(localStorage.getItem("packsOpened")) || 0,
    bestPull: localStorage.getItem("bestPull") || "None",
    duplicateProtection: Number(localStorage.getItem("duplicateProtection")) || 0,
    luckyBooster: localStorage.getItem("luckyBooster") === "true",
    iconBooster: localStorage.getItem("iconBooster") === "true",
    dailyReward: localStorage.getItem("dailyReward") || ""
  };
}

// ==========================================
// GET OR CREATE USER DOCUMENT IN FIRESTORE
// ==========================================
export async function getUserProfile(user) {
  if (!user) return null;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    // Migrate local guest progress to the new cloud profile!
    const guestData = getLocalGuestData();
    const newProfile = {
      email: user.email,
      createdAt: new Date().toISOString(),
      ...guestData
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }
}

// ==========================================
// UPDATE USER PROFILE DATA IN FIRESTORE
// ==========================================
export async function syncUserData(userId, dataToUpdate) {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  try {
    await updateDoc(userRef, dataToUpdate);
  } catch (error) {
    console.error("Error syncing user data to Firestore:", error);
  }
}

// ==========================================
// AUTH ACTIONS
// ==========================================
export async function signUpWithEmail(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await getUserProfile(userCredential.user);
  return userCredential.user;
}

export async function loginWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await getUserProfile(userCredential.user); // Ensures existing or guest data is handled
  return userCredential.user;
}

export async function loginWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  await getUserProfile(userCredential.user);
  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}

// ==========================================
// AUTH STATE OBSERVER
// ==========================================
export function listenToAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await getUserProfile(user);
      callback(user, profile);
    } else {
      callback(null, null);
    }
  });
}