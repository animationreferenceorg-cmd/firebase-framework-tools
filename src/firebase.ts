import { app, auth, db, storage, analytics } from "@/lib/firebase";

export const useFirebase = () => {
    return {
        app,
        auth,
        db,
        storage,
        analytics
    };
};

// Re-export specific instances if needed by other components importing from @/firebase
export { app, auth, db, storage, analytics };
