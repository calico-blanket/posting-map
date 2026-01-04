import { signInWithPopup, signInAnonymously, signOut as firebaseSignOut, User } from "firebase/auth";
import { auth, provider } from "./firebase";

// Allow-list from environment variable
const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "").split(",").map(e => e.trim()).filter(e => e);

export const signIn = async (): Promise<User> => {
    if (!auth || !provider) {
        throw new Error("Firebase Auth not configured");
    }
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(user.email || "")) {
            await firebaseSignOut(auth);
            throw new Error("Access denied: Email not in allow-list.");
        }

        return user;
    } catch (error) {
        console.error("Login failed", error);
        throw error;
    }
};

export const signInGuest = async (): Promise<User> => {
    if (!auth) {
        throw new Error("Firebase Auth not configured");
    }
    try {
        const result = await signInAnonymously(auth);
        return result.user;
    } catch (error) {
        console.error("Guest login failed", error);
        throw error;
    }
};

export const signOut = () => {
    if (!auth) return Promise.resolve();
    return firebaseSignOut(auth);
};
