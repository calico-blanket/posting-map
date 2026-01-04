import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Helper to get config
const getFirebaseConfig = () => {
    // 1. Check Env Vars
    const envConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (envConfig.apiKey) return { config: envConfig, source: "env" };

    // 2. Check Local Storage (Client only)
    if (typeof window !== "undefined") {
        try {
            const local = localStorage.getItem("firebase_config");
            if (local) {
                const parsed = JSON.parse(local);
                if (parsed.apiKey) return { config: parsed, source: "storage" };
            }
        } catch (e) {
            console.error("Failed to parse local firebase config", e);
        }
    }

    return { config: null, source: "none" };
};

const { config, source } = getFirebaseConfig();
export const isConfigured = !!config;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let provider: GoogleAuthProvider | undefined;

if (config) {
    // Prevent double initialization in hot-reload or strict mode
    if (getApps().length === 0) {
        app = initializeApp(config);
    } else {
        app = getApps()[0];
    }

    auth = getAuth(app);
    db = getFirestore(app);
    provider = new GoogleAuthProvider();
    console.log(`Firebase initialized from ${source}`);
} else {
    // Export undefined or mock to prevent immediate crash on import
    console.warn("Firebase not configured. Redirecting to setup...");
}

export { auth, db, provider };

// Storage isn't used, removing the block to avoid confusion/errors.
// If needed later, re-add with null checks.
export const storage = null;
