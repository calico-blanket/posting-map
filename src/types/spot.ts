import { Timestamp } from "firebase/firestore";

export type SpotCategory = 'prohibited' | 'caution' | 'info';

export const SPOT_TAGS: Record<SpotCategory, string[]> = {
    prohibited: ['ステッカーあり', '住人拒否', '管理人NG', '過去にクレーム'],
    caution: ['犬注意', 'ポスト場所不明', '投函口狭い', '足元注意', 'チラシ溢れ'],
    info: ['集合ポスト', '管理人許可済', 'その他']
};

export interface Spot {
    id: string;
    name?: string; // Building Name
    location: { lat: number; lng: number };
    category: SpotCategory;
    tags: string[];
    memo?: string; // Moved to SpotContent (optional here for legacy/transition)
    photoUrls?: string[]; // Moved to SpotContent (optional here for legacy/transition)
    // Legacy support (optional, can be removed if we migrate data)
    photoUrl?: string;
    thumbnailUrl?: string; // Small Base64 thumbnail
    createdAt: Timestamp;
    createdBy: {
        uid: string;
        displayName: string;
    };
}

export interface SpotContent {
    id: string;
    memo: string;
    photoUrls: string[];
}
