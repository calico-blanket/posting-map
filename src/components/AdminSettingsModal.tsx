"use client";
import { useState, useEffect } from "react";
import { X, Plus, Trash2, Shield, Loader2 } from "lucide-react";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

interface AdminSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminSettingsModal({ isOpen, onClose }: AdminSettingsModalProps) {
    const { isAdmin, user } = useAuth();
    const [firestoreAdmins, setFirestoreAdmins] = useState<string[]>([]);
    const [newEmail, setNewEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Root admins from ENV (cannot be removed via UI)
    const envAdmins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
        .split(",")
        .map(e => e.trim())
        .filter(e => e);

    useEffect(() => {
        if (!isOpen) return;

        const firestore = db;
        if (!firestore) return;

        // Listen to system/settings
        const unsub = onSnapshot(doc(firestore, "system", "settings"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFirestoreAdmins(data.adminEmails || []);
            } else {
                setFirestoreAdmins([]);
            }
        });

        return () => unsub();
    }, [isOpen]);

    if (!isOpen || !isAdmin) return null;

    const handleAdd = async () => {
        const email = newEmail.trim();
        if (!email) return;
        if (firestoreAdmins.includes(email) || envAdmins.includes(email)) {
            alert("既に登録されています");
            return;
        }

        const firestore = db;
        if (!firestore) {
            alert("DB未接続");
            return;
        }

        setIsLoading(true);
        try {
            const ref = doc(firestore, "system", "settings");
            const snap = await getDoc(ref);

            if (snap.exists()) {
                await updateDoc(ref, {
                    adminEmails: arrayUnion(email)
                });
            } else {
                await setDoc(ref, {
                    adminEmails: [email]
                });
            }
            setNewEmail("");
        } catch (e) {
            console.error(e);
            alert("追加に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (email: string) => {
        if (!confirm(`${email} を管理者から削除しますか？`)) return;

        const firestore = db;
        if (!firestore) {
            alert("DB未接続");
            return;
        }

        setIsLoading(true);
        try {
            const ref = doc(firestore, "system", "settings");
            await updateDoc(ref, {
                adminEmails: arrayRemove(email)
            });
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Shield size={20} className="text-blue-600" />
                        管理者設定
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="mb-6">
                        <p className="text-xs text-gray-500 mb-2">新しい管理者を追加</p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="example@gmail.com"
                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!newEmail.trim() || isLoading}
                                className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 mb-2 font-bold bg-gray-100 p-1 rounded inline-block">現在の管理者一覧</p>

                        {/* Env Admins (Immutable) */}
                        {envAdmins.map(email => (
                            <div key={email} className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-gray-400" />
                                    <span className="text-sm text-gray-600">{email}</span>
                                    <span className="text-[10px] bg-gray-200 text-gray-500 px-1 rounded">初期設定</span>
                                </div>
                            </div>
                        ))}

                        {/* Firestore Admins (Mutable) */}
                        {firestoreAdmins.map(email => (
                            <div key={email} className="flex items-center justify-between p-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-blue-500" />
                                    <span className="text-sm text-gray-800">{email}</span>
                                </div>
                                <button
                                    onClick={() => handleRemove(email)}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                    title="削除"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {firestoreAdmins.length === 0 && (
                            <p className="text-sm text-gray-400 p-2 text-center">追加された管理者はいません</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
