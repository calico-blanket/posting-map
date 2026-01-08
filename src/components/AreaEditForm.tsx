"use client";
import { useState } from "react";
import { useMap } from "react-leaflet";
import { PostingArea, PostingStatus } from "@/lib/types";

interface AreaEditFormProps {
    area: PostingArea;
    onSave: (id: string, updates: Partial<PostingArea>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

export default function AreaEditForm({ area, onSave, onDelete }: AreaEditFormProps) {
    const map = useMap();
    const [status, setStatus] = useState<PostingStatus>(area.status);
    const [plannedCount, setPlannedCount] = useState<string>(area.plannedCount?.toString() || "");
    const [actualCount, setActualCount] = useState<string>(area.actualCount?.toString() || "");
    const [memo, setMemo] = useState(area.memo);
    const [isSaving, setIsSaving] = useState(false);

    // Stop propagation of clicks to the map to prevent dragging/closing issues
    // But also ensure our buttons get the click
    const handleFormClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsSaving(true);
        try {
            await onSave(area.id, {
                status,
                plannedCount: plannedCount ? parseInt(plannedCount) : null,
                actualCount: actualCount ? parseInt(actualCount) : null,
                memo
            });
            map.closePopup();
        } catch (error) {
            console.error("Failed to save", error);
            alert("保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("このエリアを削除しますか？")) return;
        setIsSaving(true);
        try {
            if (onDelete) await onDelete(area.id);
        } catch (error) {
            console.error("Failed to delete", error);
            alert("削除に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form
            onSubmit={handleSave}
            onClick={handleFormClick}
            className="min-w-[200px] p-1"
            onMouseDown={(e) => e.stopPropagation()} // Prevent map drag start
            onDoubleClick={(e) => e.stopPropagation()} // Prevent map zoom
        >
            <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">ステータス</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setStatus("planned"); }}
                        className={`flex-1 py-1 px-2 text-xs rounded border ${status === "planned"
                            ? "bg-teal-500 text-white border-teal-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        予定
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setStatus("completed"); }}
                        className={`flex-1 py-1 px-2 text-xs rounded border ${status === "completed"
                            ? "bg-green-500 text-white border-green-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        完了
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setStatus("cancelled"); }}
                        className={`flex-1 py-1 px-2 text-xs rounded border ${status === "cancelled"
                            ? "bg-gray-500 text-white border-gray-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        中止
                    </button>
                </div>
            </div>

            <div className="flex gap-2 mb-3">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">予定枚数</label>
                    <input
                        type="number"
                        value={plannedCount}
                        onChange={(e) => setPlannedCount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-teal-500 outline-none"
                        placeholder="0"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">完了枚数</label>
                    <input
                        type="number"
                        value={actualCount}
                        onChange={(e) => setActualCount(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-teal-500 outline-none"
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="mb-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">備考</label>
                <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm border border-gray-300 rounded p-1.5 focus:ring-1 focus:ring-teal-500 outline-none"
                    rows={3}
                    placeholder="注意事項など"
                />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                {onDelete && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="text-xs text-red-500 hover:text-red-700 underline"
                        disabled={isSaving}
                    >
                        削除
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded hover:bg-teal-700 disabled:opacity-50"
                >
                    {isSaving ? "保存中..." : "保存"}
                </button>
            </div>
        </form>
    );
}
