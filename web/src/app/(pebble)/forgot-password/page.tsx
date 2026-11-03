"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import {
  PebbleButton,
  PebbleError,
  PebbleField,
  PebbleHeading,
  PebbleLinkButton,
  PebbleNote,
  PebbleStatus,
  pebbleLinkClass,
} from "@/components/login/PebbleAuth";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotFormValues) => authApi.forgotPassword(data.email),
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Failed to send reset email");
    },
  });

  const onSubmit = (data: ForgotFormValues) => {
    setErrorMsg("");
    mutation.mutate(data);
  };

  if (success) {
    return (
      <PebbleStatus
        tone="success"
        title="Check your inbox"
        action={
          <PebbleLinkButton href="/login" variant="outline">
            Return to sign in
          </PebbleLinkButton>
        }
      >
        If that email exists in our system, we&apos;ve sent a password reset link to it.
      </PebbleStatus>
    );
  }

  return (
    <>
      <PebbleHeading title="Reset your password" subtitle="Enter your email and we'll send you a recovery link" />
      <PebbleNote>Note: the password reset email currently only works for testing purposes.</PebbleNote>
      <PebbleError message={errorMsg} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
        <PebbleField
          {...register("email")}
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
        />

        <PebbleButton loading={mutation.isPending}>Send reset link</PebbleButton>
      </form>

      <p className="mt-8 text-center text-[15px] text-[#5d5a70]">
        Remember your password?{" "}
        <Link href="/login" className={pebbleLinkClass}>
          Sign in
        </Link>
      </p>
    </>
  );
}
