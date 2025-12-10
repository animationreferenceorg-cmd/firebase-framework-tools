
// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, type Analytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAnbGJpTKPNBzLMb81bU7e8AY5k0x6E5Kg",
  authDomain: "aniamtion-reference.firebaseapp.com",
  projectId: "aniamtion-reference",
  storageBucket: "aniamtion-reference.firebasestorage.app",
  messagingSenderId: "308612236683",
  appId: "1:308612236683:web:8196cfc28c571288389b8e",
  measurementId: "G-PR79SNDBLG"
};

// Function to check if all required Firebase config values are present
export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
}

function initializeFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore; storage: FirebaseStorage; analytics: Analytics | null; } {
    if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured. Please check your configuration.");
    }
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
    return { app, auth, db, storage, analytics };
}

const { app, auth, db, storage, analytics } = initializeFirebase();

export { app, auth, db, storage, analytics, initializeFirebase };
