import { auth, db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let cachedUserData = null;
let currentUserId = null;

// Initialize and listen to auth changes to cache user data
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUserId = user.uid;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      cachedUserData = snap.data();
    }
  } else {
    currentUserId = null;
    cachedUserData = null;
  }
});

// Generic getter
export async function getUserDataField(field) {
  if (currentUserId && cachedUserData) {
    return cachedUserData[field];
  }
  // Fallback to localStorage for guests
  const localVal = localStorage.getItem(field);
  return localVal ? JSON.parse(localVal) : null;
}

// Generic setter & cloud sync
export async function setUserDataField(field, value) {
  // Always update localStorage as a local cache/fallback
  localStorage.setItem(field, JSON.stringify(value));

  if (currentUserId) {
    if (!cachedUserData) cachedUserData = {};
    cachedUserData[field] = value;

    const userRef = doc(db, "users", currentUserId);
    try {
      await updateDoc(userRef, { [field]: value });
    } catch (e) {
      // If doc doesn't exist yet, create it
      await setDoc(userRef, { [field]: value }, { merge: true });
    }
  }
}