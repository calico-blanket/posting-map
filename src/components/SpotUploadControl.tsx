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
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const addLog = (msg: string) => setDebugLog(prev => [...prev, msg].slice(-5));

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setIsLoading(true);
        addLog(`File: ${file.type}, ${file.size} bytes`);

        try {
            let location = null;
            const exifData = await getExifData(file);
            addLog(`EXIF raw: ${JSON.stringify(exifData)}`);
            console.log("EXIF Data result:", exifData);

            if (exifData && typeof exifData.lat === 'number' && typeof exifData.lng === 'number' && !isNaN(exifData.lat) && !isNaN(exifData.lng)) {
                location = { lat: exifData.lat, lng: exifData.lng };
                addLog(`Loc ok: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`);
            } else {
                addLog(`Loc invalid/missing`);
            }

            if (location) {
                console.log("Location found in photo:", location);
            } else {
                console.log("No EXIF location found, falling back to device location.");
                // Fallback: Use Current Device Position or Map Center
                try {
                    addLog("Trying Geolocation...");
                    const pos: GeolocationPosition = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    addLog(`Geo ok: ${location.lat.toFixed(5)}`);
                } catch (err) {
                    console.warn("Geolocation error", err);
                    addLog("Geo failed, using map center");
                    const center = map.getCenter();
                    location = { lat: center.lat, lng: center.lng };
                }
            }

            if (location) {
                console.log("Final location before onCapture:", location);
                onCapture(file, location);
            }

        } catch (error) {
            console.error(error);
            addLog(`Error: ${error}`);
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
            {/* Debug Console */}
            {debugLog.length > 0 && (
                <div className="bg-black/70 text-white text-[10px] p-2 rounded max-w-[200px] pointer-events-none mb-2">
                    {debugLog.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            )}

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
