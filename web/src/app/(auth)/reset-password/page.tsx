"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetFormValues) => {
      if (!token) throw new Error("Missing reset token");

      // 1. Get WebAuthn options using the email reset token
      const { options, mfaToken } = await authApi.getResetPasswordOptions(token);
      
      // 2. Interact with browser authenticator
      const credential = await startAuthentication({ optionsJSON: options });
      
      // 3. Verify and set new password
      return authApi.verifyResetPassword({
        mfaToken,
        credential,
        newPassword: data.password,
      });
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Failed to reset password");
    },
  });

  const onSubmit = (data: ResetFormValues) => {
    setErrorMsg("");
    resetMutation.mutate(data);
  };

  if (!token) {
    return (
      <div className="text-center text-red-500 py-4">
        Invalid or missing reset token. Please request a new password reset link.
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-emerald-500 mb-6 font-medium">
          Password reset successful!
        </p>
        <Link href="/login" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700">
          Go to Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h3 className="text-xl font-bold mb-6 text-white">Choose a new password</h3>
      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-500/10 text-red-500 text-sm border border-red-500/20">
          {errorMsg}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">New Password</label>
          <input
            {...register("password")}
            type="password"
            className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2"
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={resetMutation.isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {resetMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset password"}
        </button>
      </form>
      
      {resetMutation.isPending && (
        <p className="mt-4 text-center text-sm text-zinc-400">
          Please confirm your passkey in the prompt...
        </p>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
