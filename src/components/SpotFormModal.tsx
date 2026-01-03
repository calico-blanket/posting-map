import { useState, useEffect, useRef } from "react";
import { SpotCategory, SPOT_TAGS, Spot } from "@/types/spot";
import { X, Check, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

interface SpotFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    // For creating new spot:
    initialFile?: File | null;
    initialLocation?: { lat: number; lng: number } | null;
    // For editing existing spot:
    initialData?: Spot | null;

    onSubmit: (data: {
        category: SpotCategory;
        tags: string[];
        memo: string;
        name: string;
        filesToUpload: File[]; // New files to process
        existingPhotoUrls: string[]; // URLs of photos to keep
    }) => Promise<void>;
}

type PhotoItem =
    | { type: "file"; file: File; startUrl: string }
    | { type: "url"; url: string };

export default function SpotFormModal({ isOpen, onClose, initialFile, initialData, onSubmit }: SpotFormModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [category, setCategory] = useState<SpotCategory>("caution");
    const [tags, setTags] = useState<string[]>([]);
    const [memo, setMemo] = useState("");
    const [name, setName] = useState("");

    // Photo management
    const [previewPhotos, setPreviewPhotos] = useState<PhotoItem[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit Mode
                setCategory(initialData.category);
                setTags(initialData.tags);
                setMemo(initialData.memo || "");
                setName(initialData.name || "");

                const existing: PhotoItem[] = [];
                // Handle legacy photoUrl
                if (initialData.photoUrl) existing.push({ type: "url", url: initialData.photoUrl });
                // Handle new photoUrls
                if (initialData.photoUrls) {
                    initialData.photoUrls.forEach(url => existing.push({ type: "url", url }));
                }
                setPreviewPhotos(existing);
            } else {
                // Create Mode
                setCategory("caution");
                setTags([]);
                setMemo("");
                setName("");
                if (initialFile) {
                    setPreviewPhotos([{ type: "file", file: initialFile, startUrl: URL.createObjectURL(initialFile) }]);
                } else {
                    setPreviewPhotos([]);
                }
            }
        }
    }, [isOpen, initialData, initialFile]);

    if (!isOpen) return null;

    const handleCategoryChange = (cat: SpotCategory) => {
        setCategory(cat);
        // Optional: Reset tags on category change? Or keep them?
        // User might switch category but want to keep "Sticker" tag. 
        // Let's keep common tags if we had them, but simplifies to clear for now as defined tags are strict per category in current logic.
        setTags([]);
    };

    const toggleTag = (tag: string) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (previewPhotos.length >= 2) return;
            setPreviewPhotos(prev => [...prev, { type: "file", file, startUrl: URL.createObjectURL(file) }]);
        }
    };

    const handleRemovePhoto = (index: number) => {
        setPreviewPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const filesToUpload = previewPhotos
                .filter((p): p is { type: "file"; file: File; startUrl: string } => p.type === "file")
                .map(p => p.file);

            const existingPhotoUrls = previewPhotos
                .filter((p): p is { type: "url"; url: string } => p.type === "url")
                .map(p => p.url);

            if (filesToUpload.length === 0 && existingPhotoUrls.length === 0) {
                alert("写真は最低1枚必要です");
                setIsSubmitting(false);
                return;
            }

            await onSubmit({ category, tags, memo, name, filesToUpload, existingPhotoUrls });
            // Reset is handled by parent closing modal usually, but nice to clean up:
            setTags([]);
            setMemo("");
            setName("");
            setCategory("caution");
            setPreviewPhotos([]);
        } catch (e) {
            console.error(e);
            alert("保存に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    const CategoryButton = ({ val, label, colorClass }: { val: SpotCategory, label: string, colorClass: string }) => (
        <button
            onClick={() => handleCategoryChange(val)}
            className={`flex-1 py-3 px-2 rounded-lg border-2 font-bold text-sm transition-all ${category === val
                ? `${colorClass} text-white border-transparent shadow-md transform scale-105`
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    <h2 className="font-bold text-lg text-gray-800">
                        {initialData ? "地点の編集" : "地点の登録"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 flex-1 overscroll-contain bg-white [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {/* Photo Preview & Add */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">写真 (最大2枚)</label>
                        <div className="grid grid-cols-2 gap-3">
                            {previewPhotos.map((photo, index) => (
                                <div key={index} className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100 group">
                                    <Image
                                        src={photo.type === "file" ? photo.startUrl : photo.url}
                                        alt={`Preview ${index}`}
                                        fill
                                        className="object-cover"
                                    />
                                    <button
                                        onClick={() => handleRemovePhoto(index)}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            {previewPhotos.length < 2 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-video rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-400 transition-all"
                                >
                                    <Plus size={24} />
                                    <span className="text-xs font-bold mt-1">追加</span>
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleAddPhoto}
                        />
                    </div>

                    {/* Step 1: Name */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1. 建物名・場所名 (任意)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="例: ライオンズマンション宝塚"
                        />
                    </div>

                    {/* Step 2: Category */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2. 分類を選択</label>
                        <div className="flex gap-2">
                            <CategoryButton val="prohibited" label="⛔ 配布禁止" colorClass="bg-red-500" />
                            <CategoryButton val="caution" label="⚠️ 注意事項" colorClass="bg-yellow-500" />
                            <CategoryButton val="info" label="ℹ️ その他" colorClass="bg-blue-500" />
                        </div>
                    </div>

                    {/* Step 3: Tags */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">3. 詳細タグ (複数選択可)</label>
                        <div className="flex flex-wrap gap-2">
                            {SPOT_TAGS[category].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${tags.includes(tag)
                                        ? "bg-slate-700 text-white border-slate-700 font-medium"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 4: Memo */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">4. メモ (任意)</label>
                        <textarea
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="補足情報があれば入力..."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? "保存中..." : <><Check size={18} /> 保存する</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
