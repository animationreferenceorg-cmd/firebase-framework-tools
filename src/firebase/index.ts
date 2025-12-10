
import { initializeFirebase as initialize } from '@/lib/firebase';
import { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
import { FirebaseClientProvider } from './client-provider';

let firebaseApp: ReturnType<typeof initialize>;
export function initializeFirebase() {
    if (!firebaseApp) {
        firebaseApp = initialize();
    }
    return firebaseApp;
}

export { FirebaseProvider, FirebaseClientProvider, useFirebase, useFirebaseApp, useFirestore, useAuth };
