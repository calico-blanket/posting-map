"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signOut } from "@/lib/auth";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (!auth) {
            console.warn("Auth not configured");
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const allowedEmails = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || "")
                    .split(",")
                    .map((e) => e.trim())
                    .filter((e) => e);

                if (allowedEmails.length > 0 && !allowedEmails.includes(currentUser.email || "")) {
                    await signOut();
                    setUser(null);
                    setIsAdmin(false);
                } else {
                    setUser(currentUser);

                    // Check Admin
                    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
                        .split(",")
                        .map((e) => e.trim())
                        .filter((e) => e);

                    if (currentUser.email && adminEmails.includes(currentUser.email)) {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                }
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
