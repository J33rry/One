"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";

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
    onError: (error: any) => {
      setErrorMsg(error.message || "Failed to send reset email");
    },
  });

  const onSubmit = (data: ForgotFormValues) => {
    setErrorMsg("");
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Reset your password</h2>
        <p className="text-xs text-zinc-400">Enter your email and we'll send a password recovery link.</p>
      </div>

      {success ? (
        <div className="text-center space-y-4 py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            If that email exists in our system, we've sent a password reset link to it. Please check your inbox.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Return to login
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              {...register("email")}
              label="Email address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={mutation.isPending}
            >
              Send reset link
            </Button>
          </form>

          <div className="text-center text-xs text-zinc-400 pt-2">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
