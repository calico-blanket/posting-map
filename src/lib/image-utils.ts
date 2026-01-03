
export const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 800; // Reduced for Firestore storage
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Compression failed"));
            }, "image/jpeg", 0.6); // Slightly lower quality
        };
        img.onerror = (err) => reject(err);
    });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const createThumbnail = async (file: File | string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (typeof file === 'string') {
            img.src = file; // Base64 string
        } else {
            img.src = URL.createObjectURL(file);
        }

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 150; // Very small size for thumbnails
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Higher compression for thumbnails
            const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
            resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
    });
};
