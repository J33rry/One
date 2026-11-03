"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PebbleSplash } from "@/components/login/PebbleSplash";

const PUBLIC_ROUTES = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    // The pebble splash covers the first auth check, then fades over the page.
    const [splashDone, setSplashDone] = useState(false);
    const hideSplash = useCallback(() => setSplashDone(true), []);

    useEffect(() => {
        if (isLoading) return;

        const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

        if (!isAuthenticated && !isPublicRoute) {
            router.push("/login");
        } else if (isAuthenticated && isPublicRoute) {
            router.push("/");
        }
    }, [isAuthenticated, isLoading, pathname, router]);

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const allowed = !isLoading && isAuthenticated !== isPublicRoute;

    return (
        <>
            {allowed && children}
            {!splashDone && <PebbleSplash ready={!isLoading} onDone={hideSplash} />}
        </>
    );
}
