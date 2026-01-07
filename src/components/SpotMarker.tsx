import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Spot, SpotCategory, SpotContent } from "@/types/spot";
import { ClipboardEdit, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SpotMarkerProps {
    spot: Spot;
    onEdit: (spot: Spot) => void;
    onDelete: (spot: Spot) => void;
}

const CATEGORY_COLORS: Record<SpotCategory, string> = {
    prohibited: "#ef4444", // red-500
    caution: "#eab308",    // yellow-500
    info: "#3b82f6"        // blue-500
};

const CATEGORY_ICONS: Record<SpotCategory, string> = {
    prohibited: "⛔",
    caution: "⚠️",
    info: "ℹ️"
};

const createCustomIcon = (category: SpotCategory) => {
    const color = CATEGORY_COLORS[category];
    const emoji = CATEGORY_ICONS[category];

    return L.divIcon({
        className: "custom-spot-marker",
        html: `
            <div style="
                background-color: ${color};
                width: 20px;
                height: 20px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
                <div style="transform: rotate(45deg); font-size: 10px;">${emoji}</div>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -20]
    });
};

export default function SpotMarker({ spot, onEdit, onDelete }: SpotMarkerProps) {
    const [details, setDetails] = useState<SpotContent | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    if (!spot.location || isNaN(spot.location.lat) || isNaN(spot.location.lng)) return null;

    const handlePopupOpen = async () => {
        // If details already loaded or legacy data exists, don't fetch
        if (details) return;
        if (spot.photoUrls && spot.photoUrls.length > 0) return;

        setIsLoadingDetails(true);
        setIsLoadingDetails(true);
        try {
            const firestore = db;
            if (!firestore) return;

            const snap = await getDoc(doc(firestore, "spots_contents", spot.id));
            if (snap.exists()) {
                setDetails(snap.data() as SpotContent);
            } else {
                // No content found (maybe just created or legacy w/o content doc)
                setDetails({ id: spot.id, memo: "", photoUrls: [] });
            }
        } catch (e) {
            console.error("Failed to fetch details", e);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Determine display data
    // Legacy support: spot.photoUrls wins if present (old data).
    // New data: details.photoUrls wins if loaded.
    // Fallback: spot.thumbnailUrl (blurred/small) if available.

    const legacyPhotos = spot.photoUrls || (spot.photoUrl ? [spot.photoUrl] : []);
    const hasLegacyData = legacyPhotos.length > 0;

    const displayPhotos = hasLegacyData
        ? legacyPhotos
        : (details?.photoUrls ?? (spot.thumbnailUrl ? [spot.thumbnailUrl] : []));

    const displayMemo = hasLegacyData
        ? (spot.memo || "")
        : (details?.memo ?? (spot.memo || ""));

    // Check if we are showing a temporary thumbnail
    const isShowingThumbnail = !hasLegacyData && !details && !!spot.thumbnailUrl;

    return (
        <Marker
            position={[spot.location.lat, spot.location.lng]}
            icon={createCustomIcon(spot.category)}
            eventHandlers={{
                click: handlePopupOpen
            }}
        >
            <Popup className="spot-popup">
                <div className="w-64">
                    {/* Photos Area */}
                    <div className="flex gap-1 overflow-x-auto mb-2 min-h-[100px] relative">
                        {isLoadingDetails && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                                <Loader2 className="animate-spin text-blue-500" />
                            </div>
                        )}

                        {displayPhotos.map((url, idx) => (
                            <div key={idx} className="relative w-full h-40 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={url}
                                    alt={`Spot photo ${idx + 1}`}
                                    className={`w-full h-full object-cover ${isShowingThumbnail ? 'blur-sm scale-110' : ''}`}
                                />
                                {isShowingThumbnail && idx === 0 && !isLoadingDetails && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold shadow-black drop-shadow-md">
                                        Loading...
                                    </div>
                                )}
                            </div>
                        ))}

                        {displayPhotos.length === 0 && !isLoadingDetails && (
                            <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                No Photo
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded textxs font-bold text-white text-xs ${spot.category === 'prohibited' ? 'bg-red-500' :
                            spot.category === 'caution' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}>
                            {spot.category === 'prohibited' ? '配布禁止' :
                                spot.category === 'caution' ? '要注意' : 'その他'}
                        </span>
                        {/* Spot Name */}
                        {spot.name && (
                            <span className="font-bold text-sm text-gray-800 flex-1 truncate">
                                {spot.name}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                        {spot.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                                #{tag}
                            </span>
                        ))}
                    </div>

                    {displayMemo && (
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded mb-2 whitespace-pre-wrap">
                            {displayMemo}
                        </p>
                    )}

                    {/* Coordinates Display */}
                    <div className="text-[10px] text-gray-400 font-mono mb-2">
                        {spot.location.lat.toFixed(6)}, {spot.location.lng.toFixed(6)}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                        <span>by {spot.createdBy?.displayName}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent popup close? No, popup events are tricky.
                                    // Actually react-leaflet popup might close on inside click if not careful, but button click is usually fine.
                                    // Needs full details for edit
                                    if (!hasLegacyData && !details) {
                                        alert("詳細データを読み込み中です...");
                                        return;
                                    }
                                    const fullSpot: Spot = {
                                        ...spot,
                                        memo: displayMemo,
                                        photoUrls: displayPhotos
                                    };
                                    onEdit(fullSpot);
                                }}
                                className="text-blue-500 hover:bg-blue-50 p-1 rounded"
                                title="編集"
                            >
                                <ClipboardEdit size={14} />
                            </button>
                            <button onClick={() => onDelete(spot)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="削除">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}
