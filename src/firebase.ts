import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB6JrdWn_aYc1qKof6yOgi9nU8yCjOhcM8",
  authDomain: "ebulfez-2652d.firebaseapp.com",
  projectId: "ebulfez-2652d",
  storageBucket: "ebulfez-2652d.firebasestorage.app",
  messagingSenderId: "602014159343",
  appId: "1:602014159343:web:6cb6823aaa39684269261a",
  measurementId: "G-WKND2EQK11"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Admin email for reference
export const ADMIN_EMAIL = "21ebulfez21@gmail.com";