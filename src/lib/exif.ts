import exifr from "exifr";

// Convert DMS (degrees, minutes, seconds) to decimal degrees
function dmsToDecimal(dms: number[] | number | undefined): number | undefined {
    if (!dms) return undefined;
    if (typeof dms === 'number') return dms;
    if (Array.isArray(dms) && dms.length === 3) {
        const [degrees, minutes, seconds] = dms;
        return degrees + minutes / 60 + seconds / 3600;
    }
    return undefined;
}

export async function getExifData(file: File) {
    try {
        // Parse ALL tags with explicit flags
        const output = await exifr.parse(file, {
            tiff: true,
            ifd0: true,
            gps: true,
            exif: true,
        });

        // Debug: Log all keys found
        const debugKeys = output ? Object.keys(output) : ["null"];
        console.log("EXIF Keys:", debugKeys);

        // Try standard GPS tags
        const lat = dmsToDecimal(output?.GPSLatitude || output?.latitude);
        const lng = dmsToDecimal(output?.GPSLongitude || output?.longitude);

        return {
            lat,
            lng,
            date: output?.DateTimeOriginal,
            debugKeys: debugKeys.join(", ") // Return keys for UI display
        };
    } catch (e) {
        console.error("Error parsing EXIF", e);
        return null;
    }
}


