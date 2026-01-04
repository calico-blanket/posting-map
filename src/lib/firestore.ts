import { db } from "./firebase";
import { PostingArea } from "./types";
import { collection, Firestore, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from "firebase/firestore";

export const postingAreaConverter: FirestoreDataConverter<PostingArea> = {
    toFirestore(area: PostingArea) {
        // Explicitly construct the object to ensure geometry is stringified and no other nested arrays slip through
        return {
            geometry: JSON.stringify(area.geometry),
            status: area.status,
            memo: area.memo,
            createdAt: area.createdAt,
            updatedAt: area.updatedAt,
            updatedBy: area.updatedBy
        };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PostingArea {
        const data = snapshot.data(options);
        return {
            ...data,
            id: snapshot.id,
            geometry: typeof data.geometry === 'string' ? JSON.parse(data.geometry) : data.geometry
        } as PostingArea;
    }
};

export const getPostingAreasCollection = (firestore: Firestore) =>
    collection(firestore, "posting_areas").withConverter(postingAreaConverter);
