import { Timestamp } from "firebase/firestore";

export type PostingStatus = "planned" | "completed" | "cancelled";

export interface PostingArea {
    id: string;
    geometry: {
        type: "Polygon";
        coordinates: number[][][]; // [ [lng, lat], [lng, lat], ... ]
    };
    status: PostingStatus;
    plannedCount?: number | null;
    actualCount?: number | null;
    memo: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    updatedBy: {
        uid: string;
        displayName: string;
        photoURL: string;
    };
}
