"use client";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Settings } from "lucide-react";
import { signIn } from "@/lib/auth";
import BackupModal from "@/components/BackupModal";

const PostingMap = dynamic(() => import("@/components/PostingMap"), {
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
});

export default function PostingPage() {
  const { user, loading } = useAuth();
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
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

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-gray-400 w-8 h-8" /></div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
        <h1 className="text-xl font-bold text-gray-800">ポスティング管理マップ</h1>
        <p className="text-gray-600">利用するにはログインしてください</p>
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
        <div className="bg-white/90 px-4 py-2 rounded-full shadow-md backdrop-blur-sm border border-gray-200">
          <h1 className="font-bold text-gray-800 text-sm md:text-base">ポスティング管理マップ (共有)</h1>
        </div>
        <button
          onClick={() => setIsBackupModalOpen(true)}
          className="bg-white/90 p-2 rounded-full shadow-md backdrop-blur-sm border border-gray-200 hover:bg-gray-100 transition-colors text-gray-700"
          title="設定・バックアップ"
        >
          <Settings size={20} />
        </button>
      </div>
      <PostingMap />
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
