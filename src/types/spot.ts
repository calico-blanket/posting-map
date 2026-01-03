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
    memo: string;
    photoUrls: string[]; // Storage URLs (Array, max 2)
    // Legacy support (optional, can be removed if we migrate data)
    photoUrl?: string;
    thumbnailUrl?: string; // Reserved for future use
    createdAt: Timestamp;
    createdBy: {
        uid: string;
        displayName: string;
    };
}
