"use client";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

interface LeafletDrawControlProps {
    onCreated: (layer: any) => void;
}

export default function LeafletDrawControl({ onCreated }: LeafletDrawControlProps) {
    const map = useMap();
    const controlRef = useRef<L.Control.Draw | null>(null);

    useEffect(() => {
        if (!map) return;

        L.drawLocal.draw.toolbar.buttons.polygon = "エリアを描画";
        L.drawLocal.draw.toolbar.actions.title = "描画をキャンセル";
        L.drawLocal.draw.toolbar.actions.text = "キャンセル";
        L.drawLocal.draw.toolbar.finish.title = "描画を終了";
        L.drawLocal.draw.toolbar.finish.text = "終了";
        L.drawLocal.draw.toolbar.undo.title = "最後の点を削除";
        L.drawLocal.draw.toolbar.undo.text = "最後の点を削除";

        const drawControl = new L.Control.Draw({
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    metric: true,
                    shapeOptions: {
                        color: "#3388ff",
                        weight: 4
                    }
                },
                polyline: false,
                circle: false,
                rectangle: false,
                marker: false,
                circlemarker: false,
            }
        });

        map.addControl(drawControl);
        controlRef.current = drawControl;

        const createdHandler = (e: any) => {
            const layer = e.layer;
            onCreated(layer);
            map.removeLayer(layer);
        };

        map.on(L.Draw.Event.CREATED, createdHandler);

        return () => {
            if (controlRef.current) {
                map.removeControl(controlRef.current);
            }
            map.off(L.Draw.Event.CREATED, createdHandler);
        };
    }, [map, onCreated]);

    return null;
}
