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
import { Mail, Lock, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: LoginFormValues) => authApi.loginPassword(data),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      router.push("/");
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Invalid email or password");
    },
  });

  const googleMutation = useMutation({
    mutationFn: (idToken: string) => authApi.loginGoogle(idToken),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      router.push("/");
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Google Sign-In failed");
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setErrorMsg("");
    passwordMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5">
        <h2 className="font-display text-2xl font-semibold text-fg tracking-tight">Sign in to your account</h2>
        <p className="text-xs text-muted">Welcome back! Please enter your details.</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
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

        <div>
          <Input
            {...register("password")}
            label="Password"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            error={errors.password?.message}
          />
          <div className="flex justify-end mt-1.5">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full mt-2"
          isLoading={passwordMutation.isPending}
        >
          Sign in
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[10px] tracking-[0.2em] uppercase font-mono">
          <span className="px-3 bg-surface text-faint">Or continue with</span>
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

      <div className="text-center text-xs text-muted pt-2">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-accent hover:text-accent-hover transition-colors"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
