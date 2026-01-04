import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useMap } from "react-leaflet";
import { useAuth } from "@/components/AuthProvider";
import { getExifData } from "@/lib/exif";

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
            let location = null;
            const exifData = await getExifData(file);
            console.log("EXIF Data result:", exifData);

            if (exifData && typeof exifData.lat === 'number' && typeof exifData.lng === 'number' && !isNaN(exifData.lat) && !isNaN(exifData.lng)) {
                location = { lat: exifData.lat, lng: exifData.lng };
            }

            if (location) {
                console.log("Location found in photo:", location);
            } else {
                console.log("No EXIF location found, falling back to device location.");
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
        <div className="leaflet-bottom leaflet-right flex flex-col items-end gap-2" style={{ bottom: "20px", right: "10px", pointerEvents: "auto", zIndex: 1000 }}>
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
