/// <reference types="vite/client" />
import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  getIdTokenResult,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  query,
  where,
  orderBy
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAwoUbKx6ClQ6hod6vQ0yaC1AXSsNQE5vk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nucleo-familiar-5bb3c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nucleo-familiar-5bb3c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nucleo-familiar-5bb3c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "706188936407",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:706188936407:web:0c82e4e52c8b543fdc1c92"
};

const isRealFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

const app = isRealFirebaseConfigured 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) 
  : null;

export const auth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;

export { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  query,
  where,
  orderBy,
  getIdTokenResult,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential
};
export type { FirebaseUser };
export const isFirebaseEnabled = isRealFirebaseConfigured;
