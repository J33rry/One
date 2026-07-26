"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Lock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const resetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetFormValues) => {
      if (!token) throw new Error("Missing reset token");

      return authApi.resetPassword({
        resetToken: token,
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
      <div className="text-center space-y-4 py-4">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-sm text-red-400 font-medium">
          Invalid or missing reset token.
        </p>
        <p className="text-xs text-zinc-400">
          Please request a new password reset link from the login page.
        </p>
        <Link href="/forgot-password">
          <Button variant="secondary" className="mt-2 w-full">
            Request new link
          </Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Password reset successful!</h2>
        <p className="text-xs text-zinc-400">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="primary" className="w-full">
              Go to Sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Choose a new password</h2>
        <p className="text-xs text-zinc-400">Enter your new secure password below.</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          {...register("password")}
          label="New Password"
          type="password"
          placeholder="At least 8 characters"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={resetMutation.isPending}
        >
          Reset password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
