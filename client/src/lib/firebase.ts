import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAolxpBPKrxtcOXGCuFMlxRmh3zX82z8RA",
  authDomain: "project-thanga-malar.firebaseapp.com",
  projectId: "project-thanga-malar",
  storageBucket: "project-thanga-malar.firebasestorage.app",
  messagingSenderId: "494954665654",
  appId: "1:494954665654:web:6361f991eea99dccbab817",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    // Emulators already connected
  }
}