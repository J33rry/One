"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import {
  PebbleButton,
  PebbleError,
  PebbleField,
  PebbleHeading,
  PebbleLinkButton,
  PebbleStatus,
  pebbleLinkClass,
} from "@/components/login/PebbleAuth";

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
    onError: (error: Error) => {
      setErrorMsg(error.message || "Failed to reset password");
    },
  });

  const onSubmit = (data: ResetFormValues) => {
    setErrorMsg("");
    resetMutation.mutate(data);
  };

  if (!token) {
    return (
      <PebbleStatus
        tone="error"
        title="This link isn't valid"
        action={<PebbleLinkButton href="/forgot-password">Request a new link</PebbleLinkButton>}
      >
        The reset link is missing or has expired. Request a new one and we&apos;ll send it to your inbox.
      </PebbleStatus>
    );
  }

  if (success) {
    return (
      <PebbleStatus
        tone="success"
        title="Password updated"
        action={<PebbleLinkButton href="/login">Go to sign in</PebbleLinkButton>}
      >
        Your password has been reset. You can now sign in with your new password.
      </PebbleStatus>
    );
  }

  return (
    <>
      <PebbleHeading title="Choose a new password" subtitle="Pick something secure you haven't used before" />
      <PebbleError message={errorMsg} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
        <PebbleField
          {...register("password")}
          label="New password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
        />

        <PebbleButton loading={resetMutation.isPending}>Reset password</PebbleButton>
      </form>

      <p className="mt-8 text-center text-[15px] text-[#5d5a70]">
        Remembered it?{" "}
        <Link href="/login" className={pebbleLinkClass}>
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#7b7cf6]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
