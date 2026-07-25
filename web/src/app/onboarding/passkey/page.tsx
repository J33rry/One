"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { AUTH_QUERY_KEY, useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Fingerprint } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

export default function PasskeyOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState("");
  const { user, isPasskeyEnrolled, isLoading } = useAuth();

  const registerPasskeyMutation = useMutation({
    mutationFn: async () => {
      // 1. Get options
      const { options } = await authApi.getRegisterPasskeyOptions();
      
      // 2. Interact with browser authenticator
      const credential = await startRegistration({ optionsJSON: options });
      
      // 3. Verify
      return authApi.verifyRegisterPasskey(credential);
    },
    onSuccess: () => {
      // Update session to reflect passkey enrolled
      if (user) {
        queryClient.setQueryData(AUTH_QUERY_KEY, { user: { ...user, passkeyEnrolled: true } });
      }
      router.push("/");
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Failed to register passkey. Please try again.");
    },
  });

  if (isLoading || !user) return null; // AuthGuard handles redirect

  return (
    <div className="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <Fingerprint className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Secure your account
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          One uses passkeys instead of passwords for maximum security. You must register a passkey to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-zinc-800">
          {errorMsg && (
            <div className="mb-4 p-3 rounded bg-red-500/10 text-red-500 text-sm border border-red-500/20">
              {errorMsg}
            </div>
          )}

          <button
            onClick={() => registerPasskeyMutation.mutate()}
            disabled={registerPasskeyMutation.isPending}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-zinc-900 bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-zinc-900 disabled:opacity-50"
          >
            {registerPasskeyMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                Register Passkey
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
