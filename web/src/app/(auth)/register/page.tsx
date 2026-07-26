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
import { GoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, Lock, User, AtSign, AlertCircle } from "lucide-react";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  displayName: z.string().min(1, "Display name is required").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
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
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Create an account</h2>
        <p className="text-xs text-zinc-400">Get started with secure end-to-end messaging.</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        <Input
          {...register("email")}
          label="Email address"
          type="email"
          placeholder="you@example.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
        />

        <Input
          {...register("username")}
          label="Username"
          type="text"
          placeholder="username"
          leftIcon={<AtSign className="w-4 h-4" />}
          error={errors.username?.message}
        />

        <Input
          {...register("displayName")}
          label="Display Name"
          type="text"
          placeholder="Jane Doe"
          leftIcon={<User className="w-4 h-4" />}
          error={errors.displayName?.message}
        />

        <Input
          {...register("password")}
          label="Password"
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
          isLoading={mutation.isPending}
        >
          Sign up
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase font-mono">
          <span className="px-3 bg-zinc-900 text-zinc-500">Or continue with</span>
        </div>
      </div>

      <div className="flex justify-center">
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

      <div className="text-center text-xs text-zinc-400 pt-2">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
