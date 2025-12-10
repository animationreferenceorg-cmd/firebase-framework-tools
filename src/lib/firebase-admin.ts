
import * as admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

let adminApp: App | null = null;
let adminStorage: Storage | null = null;
let adminDb: Firestore | null = null;

function initializeAdminApp(): App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    adminApp = admin.apps[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("Firebase Admin credentials are not fully set in environment variables. Admin SDK will not be initialized.");
    // Return a dummy object or handle as an error if critical for the build
    return null as any; 
  }
  
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        // Replace escaped newlines in private key
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    console.log("✅ Firebase Admin initialized successfully");
  } catch (err: any) {
    console.error("❌ Error initializing Firebase Admin SDK", err);
    // In a build process, it's better to throw to signal failure clearly
    throw new Error("Could not initialize Firebase Admin SDK. Check your environment variables.");
  }
  
  return adminApp;
}

function getAdminApp(): App {
  if (!adminApp) {
    return initializeAdminApp();
  }
  return adminApp;
}

function getFirebaseStorage(): Storage {
    getAdminApp(); // Ensure app is initialized
    if (!adminStorage) {
        adminStorage = getStorage();
    }
    return adminStorage;
}

function getFirestoreDB(): Firestore {
    getAdminApp(); // Ensure app is initialized
    if (!adminDb) {
        adminDb = getFirestore();
    }
    return adminDb;
}

export { getAdminApp, getFirebaseStorage, getFirestoreDB as getFirestore };
