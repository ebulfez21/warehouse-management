import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDBRbxFUjkzWo1RBeCHVcUqN4xGLb2TlPM",
  authDomain: "warehouse-management-8329b.firebaseapp.com",
  projectId: "warehouse-management-8329b",
  storageBucket: "warehouse-management-8329b.firebasestorage.app",
  messagingSenderId: "242383441072",
  appId: "1:242383441072:web:de0c9506a4a06be63ebf75",
  measurementId: "G-Y1QWXHWB3R"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Admin email for reference
export const ADMIN_EMAIL = "test_warehouse@gmail.com";