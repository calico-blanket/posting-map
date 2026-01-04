import EXIF from "exif-js";

// Helper: Convert DMS to Decimal
function convertDMSToDD(dms: number[], ref: string): number | undefined {
    if (!dms || dms.length < 3 || !ref) return undefined;
    const decimal = dms[0] + dms[1] / 60 + dms[2] / 3600;
    return (ref === "S" || ref === "W") ? -decimal : decimal;
}

export async function getExifData(file: File) {
    return new Promise<{ lat: number | undefined; lng: number | undefined; date: any; debugKeys: string } | null>((resolve) => {
        // @ts-ignore - EXIF.getData types can be tricky with File objects
        EXIF.getData(file, function (this: any) {
            try {
                // Get all tags for debugging
                const allTags = EXIF.getAllTags(this);
                const debugKeys = allTags ? Object.keys(allTags).join(", ") : "none";

                // Extract GPS Data
                const latDMS = EXIF.getTag(this, "GPSLatitude");
                const latRef = EXIF.getTag(this, "GPSLatitudeRef");
                const lngDMS = EXIF.getTag(this, "GPSLongitude");
                const lngRef = EXIF.getTag(this, "GPSLongitudeRef");
                const dateTime = EXIF.getTag(this, "DateTimeOriginal") || EXIF.getTag(this, "DateTime");

                console.log("EXIF-JS Raw:", { latDMS, latRef, lngDMS, lngRef, dateTime });

                const lat = convertDMSToDD(latDMS, latRef);
                const lng = convertDMSToDD(lngDMS, lngRef);

                resolve({
                    lat,
                    lng,
                    date: dateTime, // Note: exif-js returns string "YYYY:MM:DD HH:MM:SS" usually
                    debugKeys
                });
            } catch (e) {
                console.error("Error parsing EXIF with exif-js", e);
                resolve(null);
            }
        });
    });
}


