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
        const output = await exifr.parse(file, ["GPSLatitude", "GPSLongitude", "DateTimeOriginal"]);
        const lat = dmsToDecimal(output?.GPSLatitude);
        const lng = dmsToDecimal(output?.GPSLongitude);

        return {
            lat,
            lng,
            date: output?.DateTimeOriginal,
        };
    } catch (e) {
        console.error("Error parsing EXIF", e);
        return null;
    }
}


