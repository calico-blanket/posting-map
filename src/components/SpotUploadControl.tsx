import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useMap } from "react-leaflet";
import exifr from "exifr";
import { useAuth } from "@/components/AuthProvider";

interface SpotUploadControlProps {
    onCapture: (file: File, location: { lat: number; lng: number }) => void;
}

export default function SpotUploadControl({ onCapture }: SpotUploadControlProps) {
    const map = useMap();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setIsLoading(true);

        try {
            // 1. Extract Location (EXIF)
            const getExifLocation = async (file: File): Promise<{ lat: number; lng: number } | null> => {
                try {
                    const gps = await exifr.gps(file);
                    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
                        console.log("EXIF GPS found:", gps);
                        return { lat: gps.latitude, lng: gps.longitude };
                    }
                    return null;
                } catch (e) {
                    console.warn("EXIF parsing error:", e);
                    return null;
                }
            };

            let location = await getExifLocation(file);

            if (location) {
                console.log("Location found in photo:", location);
                alert(`📍 写真の位置情報を検出: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
            } else {
                console.log("No EXIF location found, falling back to device location.");
                alert("⚠️ 写真に位置情報がありません。現在地を使用します。");
                // Fallback: Use Current Device Position or Map Center
                try {
                    const pos: GeolocationPosition = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                } catch (err) {
                    console.warn("Geolocation error", err);
                    const center = map.getCenter();
                    location = { lat: center.lat, lng: center.lng };
                }
            }

            if (location) {
                console.log("Final location before onCapture:", location);
                alert(`🎯 最終座標: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
                onCapture(file, location);
            }

        } catch (error) {
            console.error(error);
            alert("画像処理に失敗しました");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleClick = () => {
        if (!user) {
            alert("ログインしてください");
            return;
        }
        fileInputRef.current?.click();
    };

    return (
        <div className="leaflet-bottom leaflet-right" style={{ bottom: "20px", right: "10px", pointerEvents: "auto", zIndex: 1000 }}>
            <button
                onClick={handleClick}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                title="写真を投稿"
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
            </button>
            <input
                type="file"
                accept="image/*"
                // capture="environment" // Optional: Removing strictly environment for flexibility but keeping it is usually good for mobile
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
            />
        </div>
    );
}
