"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const forgotSchema = z.object({
  email: z.string().email(),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotFormValues>({
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
    <div>
      <h3 className="text-xl font-bold mb-6 text-white">Reset your password</h3>
      
      {success ? (
        <div className="text-center">
          <p className="text-emerald-500 mb-6">
            If that email exists in our system, we've sent a password reset link to it.
          </p>
          <Link href="/login" className="text-emerald-500 hover:text-emerald-400 text-sm font-medium">
            Return to login
          </Link>
        </div>
      ) : (
        <>
          {errorMsg && (
            <div className="mb-4 p-3 rounded bg-red-500/10 text-red-500 text-sm border border-red-500/20">
              {errorMsg}
            </div>
          )}
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

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send reset link"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            Remember your password?{" "}
            <Link href="/login" className="text-emerald-500 hover:text-emerald-400">
              Sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
