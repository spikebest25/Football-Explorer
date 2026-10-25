import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDmc4OELxfVhn6tT_TkTN-zypauqhN_Xk",
  authDomain: "footballexplorer-7a98f.firebaseapp.com",
  projectId: "footballexplorer-7a98f",
  storageBucket: "footballexplorer-7a98f.firebasestorage.app",
  messagingSenderId: "1080077832660",
  appId: "1:1080077832660:web:508b4b0c5bc12c44e7c641",
  measurementId: "G-ZN3X25F79B",
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
