import { Spot, SpotContent } from "@/types/spot";
import { Timestamp } from "firebase/firestore";

// Combined type for export/import
export type CSVSpotData = Spot & {
    memo: string;
    photoUrls: string[];
};

export const CSV_HEADERS = [
    "id",
    "name",
    "category",
    "tags",
    "lat",
    "lng",
    "memo",
    "photoUrls",
    "createdAt",
    "createdByUid",
    "createdByDisplayName"
];

function escapeCSVField(field: string | number | null | undefined): string {
    if (field === undefined || field === null) return "";
    const stringField = String(field);
    if (stringField.includes(",") || stringField.includes("\"") || stringField.includes("\n")) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
}

export function exportSpotsToCSV(spots: CSVSpotData[]): string {
    const headerRow = CSV_HEADERS.join(",");
    const rows = spots.map(spot => {
        return [
            escapeCSVField(spot.id),
            escapeCSVField(spot.name),
            escapeCSVField(spot.category),
            escapeCSVField(spot.tags.join("|")), // Pipe separated tags
            escapeCSVField(spot.location.lat),
            escapeCSVField(spot.location.lng),
            escapeCSVField(spot.memo),
            escapeCSVField(spot.photoUrls.join("|")), // Pipe separated URLs
            escapeCSVField(spot.createdAt.toDate().toISOString()),
            escapeCSVField(spot.createdBy.uid),
            escapeCSVField(spot.createdBy.displayName)
        ].join(",");
    });
    return [headerRow, ...rows].join("\n");
}

export function parseCSVToSpots(csvText: string): Partial<CSVSpotData>[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",");
    // Simple verification of headers could be added here

    const result: Partial<CSVSpotData>[] = [];

    // Helper to split a CSV line respecting quotes
    const splitCSVLine = (line: string): string[] => {
        const matches = [];
        let match;
        const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
        while ((match = regex.exec(line)) !== null) {
            // Index 1 is quoted value, Index 2 is unquoted value
            let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
            matches.push(val);
        }
        // Remove the last empty match if it exists due to logic
        if (matches.length > CSV_HEADERS.length) {
            // Sometimes regex creates an empty match at end
        }
        return matches;
    };

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = splitCSVLine(line);

        // Map values to object based on CSV_HEADERS order
        // "id","name","category","tags","lat","lng","memo","photoUrls","createdAt","createdByUid","createdByDisplayName"
        if (values.length < CSV_HEADERS.length) continue; // Skip incomplete lines

        try {
            const spot: any = {
                id: values[0],
                name: values[1],
                category: values[2],
                tags: values[3] ? values[3].split("|").filter(t => t) : [],
                location: {
                    lat: parseFloat(values[4]),
                    lng: parseFloat(values[5])
                },
                memo: values[6],
                photoUrls: values[7] ? values[7].split("|").filter(u => u) : [],
                // createdAt will need to be converted to Timestamp during actual import logic if needed,
                // or we parse it here. For now let's keep it generally compliant.
                createdAt: Timestamp.fromDate(new Date(values[8])),
                createdBy: {
                    uid: values[9],
                    displayName: values[10]
                }
            };
            result.push(spot);
        } catch (e) {
            console.warn(`Failed to parse CSV line ${i}:`, e);
        }
    }

    return result;
}
