"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isConfigured } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function SetupGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        if (!isConfigured && pathname !== "/setup") {
            router.replace("/setup");
        } else if (isConfigured && pathname === "/setup") {
            // If already configured, maybe redirect home? 
            // Or allow re-setup? Let's allow re-setup but typically redirect.
            // For now, no auto-redirect OUT of setup, user can navigate manually.
        }
        setChecked(true);
    }, [pathname, router]);

    if (!checked) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    if (!isConfigured && pathname !== "/setup") {
        return null;
    }

    return <>{children}</>;
}
