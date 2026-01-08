"use client";

import { useState, useRef } from "react";
import { Loader2, Download, X, Upload, AlertTriangle } from "lucide-react";
import { getDocs, writeBatch, Timestamp, doc, collection } from "firebase/firestore";
import { getPostingAreasCollection } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { PostingArea } from "@/lib/types";
import { Spot, SpotContent } from "@/types/spot";
import { exportSpotsToCSV, parseCSVToSpots, CSVSpotData } from "@/lib/csv-utils";

import { useAuth } from "@/components/AuthProvider";

interface BackupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BackupModal({ isOpen, onClose }: BackupModalProps) {
    const { isAdmin } = useAuth();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [includePhotos, setIncludePhotos] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    if (!isAdmin) {
        return (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
                    <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={48} />
                    <h2 className="text-lg font-bold text-gray-800 mb-2">アクセス制限</h2>
                    <p className="text-gray-600 mb-6 text-sm">
                        バックアップ・復元機能は管理者のみ利用可能です。
                    </p>
                    <button
                        onClick={onClose}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-full"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        );
    }

    const handleBackup = async () => {
        try {
            setIsExporting(true);

            const firestore = db;
            if (!firestore) {
                alert("データベース未接続");
                return;
            }

            const snapshot = await getDocs(getPostingAreasCollection(firestore));
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

        const firestore = db;
        if (!firestore) {
            alert("データベース接続エラー");
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
            const snapshot = await getDocs(getPostingAreasCollection(firestore));
            const deleteBatches = [];
            let currentDeleteBatch = writeBatch(firestore);
            let deleteCount = 0;

            snapshot.docs.forEach((doc) => {
                currentDeleteBatch.delete(doc.ref);
                deleteCount++;
                if (deleteCount % 400 === 0) {
                    deleteBatches.push(currentDeleteBatch.commit());
                    currentDeleteBatch = writeBatch(firestore);
                }
            });
            if (deleteCount % 400 !== 0) deleteBatches.push(currentDeleteBatch.commit());

            await Promise.all(deleteBatches);

            // 2. Insert new documents
            const insertBatches = [];
            let currentInsertBatch = writeBatch(firestore);
            let insertCount = 0;
            const collectionRef = getPostingAreasCollection(firestore);

            areas.forEach((area) => {
                // Use existing ID if present, otherwise auto-generate (though backup should have ID)
                const docRef = area.id ? doc(collectionRef, area.id) : doc(collectionRef);
                currentInsertBatch.set(docRef, area);
                insertCount++;
                if (insertCount % 400 === 0) {
                    insertBatches.push(currentInsertBatch.commit());
                    currentInsertBatch = writeBatch(firestore);
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



    const handleSpotExport = async () => {
        try {
            setIsExporting(true);
            const firestore = db;
            if (!firestore) return;

            // Fetch Spots
            const spotsSnap = await getDocs(collection(firestore, "spots"));
            const spotsData = spotsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Spot));

            // Fetch Spot Contents
            const contentsSnap = await getDocs(collection(firestore, "spots_contents"));
            const contentsMap = new Map<string, SpotContent>();
            contentsSnap.docs.forEach(d => {
                contentsMap.set(d.id, d.data() as SpotContent);
            });

            // Combine and Filter
            const csvData: CSVSpotData[] = spotsData
                .filter(spot => spot.location && !isNaN(spot.location.lat) && !isNaN(spot.location.lng))
                .map(spot => {
                    const content = contentsMap.get(spot.id);
                    return {
                        ...spot,
                        memo: content?.memo || "",
                        photoUrls: includePhotos ? (content?.photoUrls || []) : []
                    };
                });

            const csvStr = exportSpotsToCSV(csvData);
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `posting-map-spots-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Spot export failed", error);
            alert("スポットのエクスポートに失敗しました");
        } finally {
            setIsExporting(false);
        }
    };

    const handleSpotImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("【警告】\nCSVファイルからスポット情報をインポートします。\nIDが一致するデータは上書きされ、新しいIDは新規作成されます。\n\nよろしいですか？")) {
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            setIsImporting(true);
            const firestore = db;
            if (!firestore) return;

            const text = await file.text();
            const spotsToImport = parseCSVToSpots(text);

            if (spotsToImport.length === 0) {
                alert("インポート可能なデータが見つかりませんでした。");
                return;
            }

            const batchArray = [];
            let currentBatch = writeBatch(firestore);
            let count = 0;

            for (const item of spotsToImport) {
                if (!item.id || !item.location || !item.createdAt || !item.createdBy) continue;

                // Split into Spot and Content
                const spotRef = doc(collection(firestore, "spots"), item.id);
                const contentRef = doc(collection(firestore, "spots_contents"), item.id);

                const spotData: Spot = {
                    id: item.id,
                    name: item.name,
                    category: item.category || 'info',
                    tags: item.tags || [],
                    location: item.location,
                    createdAt: item.createdAt,
                    createdBy: item.createdBy,
                    // Legacy/Thumbnail fields are omitted or set to null appropriately if needed, 
                    // but for now we trust the type definition handles optionals.
                };

                const contentData: SpotContent = {
                    id: item.id,
                    memo: item.memo || "",
                    photoUrls: item.photoUrls || []
                };

                currentBatch.set(spotRef, spotData, { merge: true });
                currentBatch.set(contentRef, contentData, { merge: true });

                count += 2; // 2 writes per spot
                if (count >= 400) {
                    batchArray.push(currentBatch.commit());
                    currentBatch = writeBatch(firestore);
                    count = 0;
                }
            }
            if (count > 0) batchArray.push(currentBatch.commit());

            await Promise.all(batchArray);
            alert(`${spotsToImport.length}件のスポットをインポートしました。`);
            window.location.reload();

        } catch (error) {
            console.error("Spot import failed", error);
            alert("インポートに失敗しました");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-800">データ管理</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto">
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

                    <div className="border-t border-gray-100"></div>

                    {/* Spot CSV Section */}
                    <SpotBackupControls
                        isExporting={isExporting}
                        isImporting={isImporting}
                        includePhotos={includePhotos}
                        setIncludePhotos={setIncludePhotos}
                        handleExport={handleSpotExport}
                        handleImport={handleSpotImport}
                    />

                    {/* Danger Zone */}
                    <DangerZone isExporting={isExporting || isImporting} onClose={onClose} />
                </div>
            </div>
        </div>
    );
}

function SpotBackupControls({
    isExporting,
    isImporting,
    includePhotos,
    setIncludePhotos,
    handleExport,
    handleImport
}: {
    isExporting: boolean;
    isImporting: boolean;
    includePhotos: boolean;
    setIncludePhotos: (val: boolean) => void;
    handleExport: () => void;
    handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <section>
            <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Download size={18} />
                スポット情報 (CSV)
            </h3>
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                    <input
                        type="checkbox"
                        id="includePhotos"
                        checked={includePhotos}
                        onChange={(e) => setIncludePhotos(e.target.checked)}
                        className="h-4 w-4 bg-gray-100 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="includePhotos" className="text-sm text-gray-700 cursor-pointer select-none">
                        写真データ(URL)を含めて出力する
                    </label>
                </div>
                <button
                    onClick={handleExport}
                    disabled={isExporting || isImporting}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    スポットをCSVエクスポート
                </button>

                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleImport}
                    className="hidden"
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExporting || isImporting}
                    className="w-full flex items-center justify-center gap-2 bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 font-bold py-2 px-4 rounded transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    CSVファイルを選択してインポート
                </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">
                ※ エクスポートされた作成者IDはインポート時に維持されます。
            </p>
        </section>
    );
}

function DangerZone({
    isExporting,
    onClose
}: {
    isExporting: boolean;
    onClose: () => void;
}) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAllAreas = async () => {
        if (!confirm("【危険】すべてのエリア（多角形）データを削除します。\nこの操作は取り消せません。\n\n本当によろしいですか？")) return;
        if (!confirm("【最終確認】\nバックアップは取りましたか？\n削除を実行してよろしいですか？")) return;

        try {
            setIsDeleting(true);
            const firestore = db;
            if (!firestore) return;

            const snapshot = await getDocs(getPostingAreasCollection(firestore));
            if (snapshot.empty) {
                alert("削除対象のデータがありません。");
                return;
            }

            const batches = [];
            let currentBatch = writeBatch(firestore);
            let count = 0;

            snapshot.docs.forEach((doc) => {
                currentBatch.delete(doc.ref);
                count++;
                if (count % 400 === 0) {
                    batches.push(currentBatch.commit());
                    currentBatch = writeBatch(firestore);
                }
            });
            if (count % 400 !== 0) batches.push(currentBatch.commit());

            await Promise.all(batches);
            alert("すべてのエリアデータを削除しました。");
            window.location.reload();

        } catch (error) {
            console.error("Failed to delete areas", error);
            alert("削除に失敗しました。");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteAllSpots = async () => {
        if (!confirm("【危険】すべてのスポット（ピン）データを削除します。\n写真データも含む全ての情報が失われます。\n\n本当によろしいですか？")) return;
        if (!confirm("【最終確認】\nバックアップ（CSVエクスポート）は取りましたか？\n削除を実行してよろしいですか？")) return;

        try {
            setIsDeleting(true);
            const firestore = db;
            if (!firestore) return;

            // Delete Spots
            const spotsSnap = await getDocs(collection(firestore, "spots"));
            const contentsSnap = await getDocs(collection(firestore, "spots_contents"));

            if (spotsSnap.empty && contentsSnap.empty) {
                alert("削除対象のデータがありません。");
                return;
            }

            const batches = [];
            let currentBatch = writeBatch(firestore);
            let count = 0;

            // Helper to add batch
            const addToBatch = (ref: any) => {
                currentBatch.delete(ref);
                count++;
                if (count >= 400) {
                    batches.push(currentBatch.commit());
                    currentBatch = writeBatch(firestore);
                    count = 0;
                }
            };

            spotsSnap.docs.forEach(doc => addToBatch(doc.ref));
            contentsSnap.docs.forEach(doc => addToBatch(doc.ref));

            if (count > 0) batches.push(currentBatch.commit());

            await Promise.all(batches);
            alert("すべてのスポットデータを削除しました。");
            window.location.reload();

        } catch (error) {
            console.error("Failed to delete spots", error);
            alert("削除に失敗しました。");
        } finally {
            setIsDeleting(false);
        }
    };

    const isDisabled = isExporting || isDeleting;

    return (
        <section className="mt-8 pt-6 border-t border-red-200">
            <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                <AlertTriangle size={18} />
                Danger Zone (危険地帯)
            </h3>
            <div className="border border-red-200 rounded-md p-4 bg-red-50">
                <p className="text-red-800 text-sm mb-4 font-bold">
                    削除したデータは復元できません。<br />
                    操作の前に必ず上記のエクスポート/バックアップを行ってください。
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleDeleteAllAreas}
                        disabled={isDisabled}
                        className="w-full bg-white border border-red-300 text-red-600 hover:bg-red-100 font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 className="animate-spin inline mr-2" /> : null}
                        すべてのエリアを削除
                    </button>
                    <button
                        onClick={handleDeleteAllSpots}
                        disabled={isDisabled}
                        className="w-full bg-white border border-red-300 text-red-600 hover:bg-red-100 font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 className="animate-spin inline mr-2" /> : null}
                        すべてのスポットを削除
                    </button>
                </div>
            </div>
        </section>
    );
}

// Add these to the main component body, and import new types/utils
