"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Popup, useMap, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PostingArea, PostingStatus } from "@/lib/types";
import { Spot } from "@/types/spot";
import LeafletDrawControl from "./LeafletDrawControl";
import AreaEditForm from "./AreaEditForm";
import SpotUploadControl from "./SpotUploadControl";
import SpotMarker from "./SpotMarker";
import { useAuth } from "./AuthProvider";
import { getPostingAreasCollection } from "@/lib/firestore";
import { addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, collection, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import L from "leaflet";
import { Loader2, MapPin } from "lucide-react";
import SpotFormModal from "./SpotFormModal";
import { compressImage, blobToBase64, createThumbnail } from "@/lib/image-utils";

// Initial View: Takarazuka/Kobe
const INITIAL_CENTER: [number, number] = [34.79, 135.35];
const INITIAL_ZOOM = 12;

const STATUS_COLORS: Record<PostingStatus, string> = {
    planned: "#14b8a6", // teal-500
    completed: "#22c55e", // green-500
    cancelled: "#6b7280", // gray-500
};

function UserLocation() {
    const [pos, setPos] = useState<L.LatLngExpression | null>(null);

    useEffect(() => {
        if (!("geolocation" in navigator)) return;
        const watchId = navigator.geolocation.watchPosition(
            (p) => setPos([p.coords.latitude, p.coords.longitude]),
            (e) => console.log(e),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    if (!pos) return null;

    const pulsingIcon = L.divIcon({
        className: "custom-pin",
        html: `<div style="
            width: 16px; 
            height: 16px; 
            background: #14b8a6; 
            border: 2px solid white; 
            border-radius: 50%; 
            box-shadow: 0 0 4px rgba(0,0,0,0.3);
            position: relative;
            ">
            <div style="
                position: absolute;
                inset: -4px;
                border-radius: 50%;
                background: #14b8a6;
                opacity: 0.4;
                animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <style>
            @keyframes ping {
                75%, 100% { transform: scale(2); opacity: 0; }
            }
            </style>
        </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    return <Marker position={pos} icon={pulsingIcon} />;
}

function MapControls() {
    const map = useMap();
    const [loading, setLoading] = useState(false);

    const handleGoToLocation = () => {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                map.flyTo([pos.coords.latitude, pos.coords.longitude], 16);
                setLoading(false);
            },
            (err) => {
                console.error(err);
                alert("位置情報を取得できませんでした");
                setLoading(false);
            }
        );
    };

    return (
        <div className="leaflet-bottom leaflet-left" style={{ bottom: "80px", left: "10px", pointerEvents: "auto", zIndex: 1000 }}>
            <button
                onClick={handleGoToLocation}
                className="bg-white p-2 rounded shadow-md border hover:bg-gray-100 flex items-center gap-2 text-sm font-bold text-gray-700"
                type="button"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-teal-600" />}
                Currently
            </button>
        </div>
    );
}

function AutoCenter() {
    const map = useMap();
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                map.setView([pos.coords.latitude, pos.coords.longitude], 16);
            },
            (err) => console.warn(err),
            { enableHighAccuracy: true }
        );
    }, [map]);
    return null;
}

export default function PostingMap() {
    const { user } = useAuth();
    const [spots, setSpots] = useState<Spot[]>([]);
    const [areas, setAreas] = useState<PostingArea[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [editingSpot, setEditingSpot] = useState<Spot | null>(null);

    useEffect(() => {
        // Areas listener
        const unsubscribeAreas = onSnapshot(getPostingAreasCollection(), (snapshot) => {
            const data = snapshot.docs.map(d => d.data());
            setAreas(data);
        }, (error) => {
            console.error("Firestore Error:", error);
        });

        // Spots listener
        const unsubscribeSpots = onSnapshot(collection(db, "spots"), (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Spot));
            setSpots(data);
        });

        return () => {
            unsubscribeAreas();
            unsubscribeSpots();
        };
    }, []);

    const handleCreated = async (layer: any) => {
        if (!user) {
            alert("ログインしてください");
            return;
        }

        const geoJson = layer.toGeoJSON();

        try {
            await addDoc(getPostingAreasCollection(), {
                // @ts-ignore
                geometry: geoJson.geometry,
                status: "planned",
                memo: "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                updatedBy: {
                    uid: user.uid,
                    displayName: user.displayName || "Unknown",
                    photoURL: user.photoURL || ""
                }
            } as any);
        } catch (e) {
            console.error(e);
            alert("エリアの作成に失敗しました");
        }
    };

    const handleSaveArea = async (id: string, updates: Partial<PostingArea>) => {
        if (!user) {
            alert("ログインしていません");
            return;
        }
        try {
            const ref = doc(db, "posting_areas", id);
            await updateDoc(ref, {
                ...updates,
                updatedAt: serverTimestamp(),
                updatedBy: {
                    uid: user.uid,
                    displayName: user.displayName || "Unknown",
                    photoURL: user.photoURL || ""
                }
            });
        } catch (error) {
            console.error("Error in handleSaveArea:", error);
            throw error;
        }
    };

    const handleDeleteArea = async (id: string) => {
        if (!user) {
            console.error("Delete failed: User not logged in");
            return;
        }
        try {
            await deleteDoc(doc(db, "posting_areas", id));
        } catch (error) {
            console.error("Error in handleDeleteArea:", error);
            throw error;
        }
    };

    // Spot Management Handlers
    const handleSpotCapture = (file: File, location: { lat: number; lng: number }) => {
        setPendingFile(file);
        setPendingLocation(location);
        setModalMode("create");
        setEditingSpot(null);
        setIsModalOpen(true);
    };

    const handleSpotEdit = (spot: Spot) => {
        if (user?.uid !== spot.createdBy.uid) {
            // Optional: prevent editing others' spots? For now, allow or warn.
            // alert("他人の投稿は編集できません"); return;
        }
        setEditingSpot(spot);
        setModalMode("edit");
        setPendingFile(null); // No initial file for edit
        setIsModalOpen(true);
    };

    const handleSpotDelete = async (spot: Spot) => {
        if (!confirm("本当に削除しますか？")) return;
        try {
            await deleteDoc(doc(db, "spots", spot.id));
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました");
        }
    };

    const handleSpotSubmit = async (data: {
        category: any;
        tags: string[];
        memo: string;
        name: string;
        filesToUpload: File[];
        existingPhotoUrls: string[];
    }) => {
        if (!user) return;

        try {
            // Process new files
            const newPhotoUrls: string[] = [];
            for (const file of data.filesToUpload) {
                const compressed = await compressImage(file);
                const base64 = await blobToBase64(compressed);
                newPhotoUrls.push(base64);
            }

            // Combine with existing
            const finalPhotoUrls = [...data.existingPhotoUrls, ...newPhotoUrls];

            // Generate Thumbnail from the first available photo (new or existing)
            let thumbnailUrl = "";
            if (finalPhotoUrls.length > 0) {
                // finalPhotoUrls[0] is a Base64 string
                try {
                    thumbnailUrl = await createThumbnail(finalPhotoUrls[0]);
                } catch (e) {
                    console.error("Thumbnail generation failed", e);
                }
            }

            const batch = writeBatch(db);
            const spotsRef = collection(db, "spots");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let docRef: any;

            if (modalMode === "create") {
                docRef = doc(spotsRef); // Auto ID
            } else if (modalMode === "edit" && editingSpot) {
                docRef = doc(spotsRef, editingSpot.id);
            }

            if (!docRef) return;

            // 1. Light Data (spots collection)
            const spotData: any = {
                category: data.category,
                tags: data.tags,
                name: data.name,
                thumbnailUrl: thumbnailUrl, // New lightweight field
                // Reduced usage of heavy fields in main doc
                // We keep 'memo' in main doc? Or move to content? 
                // Let's keep a truncated memo or just move it. 
                // Creating a migration plan: 
                // New system: 'spots' doc has NO photoUrls (or empty).
                // 'spots_contents' has photoUrls.
                updatedAt: serverTimestamp(),
            };

            if (modalMode === "create") {
                spotData.location = pendingLocation;
                spotData.createdAt = serverTimestamp();
                spotData.createdBy = {
                    uid: user.uid,
                    displayName: user.displayName || "Unknown"
                };
            }

            batch.set(docRef, spotData, { merge: true });

            // 2. Heavy Data (spots_contents collection)
            const contentRef = doc(db, "spots_contents", docRef.id);
            const contentData = {
                memo: data.memo,
                photoUrls: finalPhotoUrls,
                updatedAt: serverTimestamp()
            };
            batch.set(contentRef, contentData, { merge: true });

            await batch.commit();

            setIsModalOpen(false);
            setPendingFile(null);
            setEditingSpot(null);

        } catch (e) {
            console.error(e);
            alert("保存エラーが発生しました");
        }
    };

    const getPositions = (geometry: any) => {
        if (!geometry || geometry.type !== "Polygon" || !geometry.coordinates || !Array.isArray(geometry.coordinates[0])) {
            console.warn("Invalid geometry data:", geometry);
            return [];
        }
        return geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
    };

    return (
        <>
            <MapContainer center={INITIAL_CENTER} zoom={INITIAL_ZOOM} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <LeafletDrawControl onCreated={handleCreated} />

                <MapControls />
                <SpotUploadControl onCapture={handleSpotCapture} />
                <UserLocation />
                <AutoCenter />

                {areas.map(area => (
                    <Polygon
                        key={area.id}
                        positions={getPositions(area.geometry)}
                        pathOptions={{
                            color: STATUS_COLORS[area.status] || "blue",
                            fillOpacity: 0.4
                        }}
                    >
                        <Popup>
                            <AreaEditForm
                                area={area}
                                onSave={handleSaveArea}
                                onDelete={handleDeleteArea}
                            />
                        </Popup>
                    </Polygon>
                ))}

                {spots.map(spot => (
                    <SpotMarker
                        key={spot.id}
                        spot={spot}
                        onEdit={handleSpotEdit}
                        onDelete={handleSpotDelete}
                    />
                ))}
            </MapContainer>

            <SpotFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialFile={pendingFile}
                initialLocation={pendingLocation}
                initialData={editingSpot}
                onSubmit={handleSpotSubmit}
            />
        </>
    );
}
