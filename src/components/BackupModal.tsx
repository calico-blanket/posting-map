"use client";

import { useState, useRef } from "react";
import { Loader2, Download, X, Upload, AlertTriangle } from "lucide-react";
import { getDocs, writeBatch, Timestamp, doc } from "firebase/firestore";
import { getPostingAreasCollection } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { PostingArea } from "@/lib/types";

interface BackupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BackupModal({ isOpen, onClose }: BackupModalProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleBackup = async () => {
        try {
            setIsExporting(true);

            const snapshot = await getDocs(getPostingAreasCollection());
            const areas = snapshot.docs.map(doc => doc.data());

            const dataStr = JSON.stringify(areas, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement("a");
            link.href = url;
            const date = new Date().toISOString().slice(0, 10);
            link.download = `posting-map-backup-${date}.json`;
            document.body.appendChild(link);
            link.click();

            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Backup failed", error);
            alert("バックアップの作成に失敗しました。");
        } finally {
            setIsExporting(false);
        }
    };

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("【警告】\nデータを復元すると、現在の地図データは全て消去され、バックアップファイルの内容で上書きされます。\n\n本当によろしいですか？")) {
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            setIsImporting(true);
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                throw new Error("Invalid data format: Root must be an array");
            }

            // Convert timestamps and validate
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const areas: PostingArea[] = data.map((item: any) => ({
                ...item,
                createdAt: new Timestamp(item.createdAt.seconds, item.createdAt.nanoseconds),
                updatedAt: new Timestamp(item.updatedAt.seconds, item.updatedAt.nanoseconds),
            }));

            // 1. Delete all existing documents
            const snapshot = await getDocs(getPostingAreasCollection());
            const deleteBatches = [];
            let currentDeleteBatch = writeBatch(db);
            let deleteCount = 0;

            snapshot.docs.forEach((doc) => {
                currentDeleteBatch.delete(doc.ref);
                deleteCount++;
                if (deleteCount % 400 === 0) {
                    deleteBatches.push(currentDeleteBatch.commit());
                    currentDeleteBatch = writeBatch(db);
                }
            });
            if (deleteCount % 400 !== 0) deleteBatches.push(currentDeleteBatch.commit());

            await Promise.all(deleteBatches);

            // 2. Insert new documents
            const insertBatches = [];
            let currentInsertBatch = writeBatch(db);
            let insertCount = 0;
            const collectionRef = getPostingAreasCollection();

            areas.forEach((area) => {
                // Use existing ID if present, otherwise auto-generate (though backup should have ID)
                const docRef = area.id ? doc(collectionRef, area.id) : doc(collectionRef);
                currentInsertBatch.set(docRef, area);
                insertCount++;
                if (insertCount % 400 === 0) {
                    insertBatches.push(currentInsertBatch.commit());
                    currentInsertBatch = writeBatch(db);
                }
            });
            if (insertCount % 400 !== 0) insertBatches.push(currentInsertBatch.commit());

            await Promise.all(insertBatches);

            alert("データの復元が完了しました。画面を更新します。");
            window.location.reload();

        } catch (error) {
            console.error("Restore failed", error);
            alert("データの復元に失敗しました。ファイルが正しいか確認してください。");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-800">データ管理</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Backup Section */}
                    <section>
                        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Download size={18} />
                            バックアップ（保存）
                        </h3>
                        <p className="text-gray-600 mb-4 text-sm">
                            現在の地図データをJSONファイルとしてダウンロードします。
                        </p>
                        <button
                            onClick={handleBackup}
                            disabled={isExporting || isImporting}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                            バックアップをダウンロード
                        </button>
                    </section>

                    <div className="border-t border-gray-100"></div>

                    {/* Restore Section */}
                    <section>
                        <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                            <Upload size={18} />
                            復元（インポート）
                        </h3>
                        <div className="bg-red-50 border border-red-100 rounded p-3 mb-4 text-sm text-red-800 flex gap-2 items-start">
                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                            <p>
                                バックアップファイルを読み込み、データを復元します。
                                <strong>現在のデータは全て消去され、上書きされます。</strong>
                            </p>
                        </div>

                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleRestore}
                            className="hidden"
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isExporting || isImporting}
                            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold py-2 px-4 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            バックアップファイルを選択して復元
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}
