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

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterFormValues) => authApi.register(data),
    onSuccess: (data) => {
      // Invalidate auth query to reflect session creation, then navigate to onboarding
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      router.push("/onboarding/passkey");
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Registration failed");
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setErrorMsg("");
    mutation.mutate(data);
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-6 text-white">Create an account</h3>
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
        <div>
          <label className="block text-sm font-medium text-zinc-300">Username</label>
          <input
            {...register("username")}
            type="text"
            className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2"
          />
          {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300">Display Name</label>
          <input
            {...register("displayName")}
            type="text"
            className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2"
          />
          {errors.displayName && <p className="mt-1 text-sm text-red-500">{errors.displayName.message}</p>}
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

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign up"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-500 hover:text-emerald-400">
          Sign in
        </Link>
      </div>
    </div>
  );
}
