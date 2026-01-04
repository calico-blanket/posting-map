import EXIF from "exif-js";

// Helper: Convert DMS to Decimal
function convertDMSToDD(dms: number[], ref: string): number | undefined {
    if (!dms || dms.length < 3) return undefined;

    // Helper to ensure number
    const val = (v: any) => {
        if (typeof v === 'number') return v;
        if (v && typeof v.numerator === 'number' && typeof v.denominator === 'number') {
            return v.numerator / v.denominator;
        }
        return Number(v);
    };

    const d = val(dms[0]);
    const m = val(dms[1]);
    const s = val(dms[2]);

    if (isNaN(d) || isNaN(m) || isNaN(s)) return undefined;

    const decimal = d + m / 60 + s / 3600;

    // Ref check: If missing, default to positive but warn? 
    // Usually Ref is 'N', 'S', 'E', 'W'. 
    if (!ref) return decimal; // Fallback if ref is missing (some cameras might omit positive ref?)

    const r = ref.toUpperCase().trim();
    return (r === "S" || r === "W") ? -decimal : decimal;
}

export async function getExifData(file: File) {
    return new Promise<{ lat: number | undefined; lng: number | undefined; date: any; debugKeys: string; raw?: any } | null>((resolve) => {
        // @ts-ignore
        EXIF.getData(file, function (this: any) {
            try {
                const allTags = EXIF.getAllTags(this);
                const debugKeys = allTags ? Object.keys(allTags).join(", ") : "none";

                const latDMS = EXIF.getTag(this, "GPSLatitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lngDMS = EXIF.getTag(this, "GPSLongitude");
                const lngRef = EXIF.getTag(this, "GPSLongitudeRef");
                const dateTime = EXIF.getTag(this, "DateTimeOriginal") || EXIF.getTag(this, "DateTime");

                // const lat = convertDMSToDD(latDMS, latRef);
                // const lng = convertDMSToDD(lngDMS, lngRef);

                // Let's rely on robust conversion with logging
                let lat = convertDMSToDD(latDMS, latRef);
                let lng = convertDMSToDD(lngDMS, lngRef);

                resolve({
                    lat,
                    lng,
                    date: dateTime,
                    debugKeys,
                    raw: {
                        latDMS: Array.isArray(latDMS) ? latDMS.map((v: any) => typeof v === 'object' ? `${v.numerator}/${v.denominator}` : v) : latDMS,
                        latRef,
                        lngDMS: Array.isArray(lngDMS) ? lngDMS.map((v: any) => typeof v === 'object' ? `${v.numerator}/${v.denominator}` : v) : lngDMS,
                        lngRef
                    }
                });
            } catch (e) {
                console.error("Error parsing EXIF with exif-js", e);
                resolve(null);
            }
        });
    });
}


