"use client";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Settings, Shield } from "lucide-react";
import { signIn, signInGuest } from "@/lib/auth";
import BackupModal from "@/components/BackupModal";
import AdminSettingsModal from "@/components/AdminSettingsModal";

const PostingMap = dynamic(() => import("@/components/PostingMap"), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
});

export default function PostingPage() {
  const { user, loading, isAdmin } = useAuth();
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Auth check handled by AuthProvider mostly, but we trigger login here if needed
    // or just let user click login button.
  }, [user, loading]);

  const handleLogin = async () => {
    try {
      await signIn();
    } catch (e) {
      alert("Login failed");
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInGuest();
    } catch (e) {
      alert("Guest login failed");
    }
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-gray-400 w-8 h-8" /></div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 gap-4 p-4">
        <h1 className="text-xl font-bold text-gray-800">ポスティング管理マップ</h1>
        <p className="text-gray-600 mb-2 text-center">利用するにはログインしてください</p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleLogin}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded shadow-sm hover:bg-gray-50 transition"
          >
            <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />
            Googleでログイン
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs">または</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            onClick={handleGuestLogin}
            className="px-4 py-3 bg-gray-800 text-white font-bold rounded shadow hover:bg-gray-900 transition"
          >
            ゲストとして利用（ログイン不要）
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">
          ゲスト利用の場合でも、作成したデータは<br />共有されます。
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1.5 w-[95%] max-w-md justify-center pointer-events-none">
        <div className="bg-white/95 px-3 py-1.5 rounded-full shadow-sm backdrop-blur-md border border-gray-200 flex items-center gap-2 pointer-events-auto">
          <h1 className="font-bold text-gray-800 text-[10px] xs:text-xs md:text-sm whitespace-nowrap">ポスティング管理マップ</h1>
          {isAdmin && <span className="text-blue-500 font-bold text-xs" title="管理者">★</span>}

          <div className="w-px h-4 bg-gray-200 mx-1"></div>

          <div className="flex items-center gap-1">
            {isAdmin && (
              <button
                onClick={() => setIsAdminSettingsOpen(true)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-blue-600"
                title="管理者設定"
              >
                <Shield size={16} />
              </button>
            )}

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
              title="設定・バックアップ"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
      <PostingMap />
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
      <AdminSettingsModal
        isOpen={isAdminSettingsOpen}
        onClose={() => setIsAdminSettingsOpen(false)}
      />
    </div>
  );
}
