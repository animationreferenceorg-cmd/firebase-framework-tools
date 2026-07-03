
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

  try {
    if (projectId && clientEmail && privateKey) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          // Replace escaped newlines in private key
          privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log("✅ Firebase Admin initialized successfully with cert credentials");
    } else {
      // Fallback to default credentials (e.g. production Cloud Run / Firebase App Hosting environment)
      adminApp = admin.initializeApp({
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log("✅ Firebase Admin initialized successfully with default credentials");
    }
  } catch (err: any) {
    console.error("❌ Error initializing Firebase Admin SDK", err);
    throw new Error("Could not initialize Firebase Admin SDK. Check your environment configuration.");
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
