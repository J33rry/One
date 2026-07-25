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
import { GoogleLogin } from "@react-oauth/google";

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
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      router.push("/");
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Registration failed");
    },
  });

  const googleMutation = useMutation({
    mutationFn: (idToken: string) => authApi.loginGoogle(idToken),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      router.push("/");
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Google Sign-In failed");
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setErrorMsg("");
    mutation.mutate(data);
  };

  return (
    <div>
      <h3 className="text-xl font-bold mb-6 text-white text-center">Create an account</h3>
      {errorMsg && (
        <div className="mb-4 p-3 rounded bg-red-500/10 text-red-500 text-sm border border-red-500/20 text-center">
          {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">Email address</label>
          <input
            {...register("email")}
            type="email"
            className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 outline-none"
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300">Username</label>
          <input
            {...register("username")}
            type="text"
            className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 outline-none"
          />
          {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300">Display Name</label>
          <input
            {...register("displayName")}
            type="text"
            className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 outline-none"
          />
          {errors.displayName && <p className="mt-1 text-sm text-red-500">{errors.displayName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300">Password</label>
          <input
            {...register("password")}
            type="password"
            className="mt-1 block w-full rounded-md border-zinc-700 bg-zinc-800 text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 outline-none"
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign up"}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-zinc-900 text-zinc-400">Or continue with</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                googleMutation.mutate(credentialResponse.credential);
              }
            }}
            onError={() => {
              setErrorMsg("Google Sign-In failed");
            }}
            theme="filled_black"
            shape="rectangular"
          />
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-500 hover:text-emerald-400 transition-colors">
          Sign in
        </Link>
      </div>
    </div>
  );
}
