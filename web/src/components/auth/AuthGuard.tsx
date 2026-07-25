"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
const PASSKEY_ONBOARDING_ROUTE = '/onboarding/passkey';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isPasskeyEnrolled, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isOnboardingRoute = pathname === PASSKEY_ONBOARDING_ROUTE;

    if (!isAuthenticated) {
      if (!isPublicRoute) {
        router.push('/login');
      }
    } else {
      // Authenticated users
      if (!isPasskeyEnrolled) {
        if (!isOnboardingRoute) {
          router.push(PASSKEY_ONBOARDING_ROUTE);
        }
      } else {
        // Fully authenticated and enrolled
        if (isPublicRoute || isOnboardingRoute) {
          router.push('/');
        }
      }
    }
  }, [isAuthenticated, isPasskeyEnrolled, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Prevent flash of content during redirect
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isOnboardingRoute = pathname === PASSKEY_ONBOARDING_ROUTE;

  if (!isAuthenticated && !isPublicRoute) return null;
  if (isAuthenticated && !isPasskeyEnrolled && !isOnboardingRoute) return null;
  if (isAuthenticated && isPasskeyEnrolled && (isPublicRoute || isOnboardingRoute)) return null;

  return <>{children}</>;
}
