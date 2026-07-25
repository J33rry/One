"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AUTH_QUERY_KEY } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState("");
  const [step, setStep] = useState<"password" | "webauthn">("password");
  const [mfaToken, setMfaToken] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: LoginFormValues) => authApi.loginPassword(data),
    onSuccess: (data) => {
      setMfaToken(data.mfaToken);
      setStep("webauthn");
      webauthnMutation.mutate(data.mfaToken);
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Invalid email or password");
    },
  });

  const webauthnMutation = useMutation({
    mutationFn: async (token: string) => {
      // 1. Get options
      const { options, mfaToken: newMfaToken } = await authApi.getLoginWebauthnOptions(token);
      
      // 2. Interact with browser authenticator
      const credential = await startAuthentication({ optionsJSON: options });
      
      // 3. Verify
      return authApi.verifyLoginWebauthn(newMfaToken, credential);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      router.push("/");
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "WebAuthn verification failed");
      setStep("password"); // Fallback if webauthn fails completely
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setErrorMsg("");
    passwordMutation.mutate(data);
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-6 text-white">Sign in to your account</h3>
      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-500/10 text-red-500 text-sm border border-red-500/20">
          {errorMsg}
        </div>
      )}

      {step === "password" ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Email address</label>
            <input
              {...register("email")}
              type="email"
              className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2"
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Password</label>
            <input
              {...register("password")}
              type="password"
              className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2"
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/forgot-password" className="text-emerald-500 hover:text-emerald-400">
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {passwordMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
          </button>
        </form>
      ) : (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-zinc-300">Waiting for passkey authentication...</p>
          <button 
            onClick={() => webauthnMutation.mutate(mfaToken)}
            disabled={webauthnMutation.isPending}
            className="mt-6 text-sm text-emerald-500 hover:text-emerald-400"
          >
            Try again
          </button>
        </div>
      )}

      {step === "password" && (
        <div className="mt-6 text-center text-sm text-zinc-400">
          Don't have an account?{" "}
          <Link href="/register" className="text-emerald-500 hover:text-emerald-400">
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}
