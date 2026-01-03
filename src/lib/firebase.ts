import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
    if (typeof window !== "undefined") {
        console.error("Firebase Config is missing! Please check .env.local", firebaseConfig);
        alert("Firebase Config Error: API Key is missing. Check console.");
    }
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
import { getStorage, FirebaseStorage } from "firebase/storage";

let storage: FirebaseStorage | null = null;
try {
    storage = getStorage(app);
} catch (e) {
    console.warn("Firebase Storage initialization failed (likely missing storageBucket in .env.local). Photo upload will not work.", e);
}

export { storage };
