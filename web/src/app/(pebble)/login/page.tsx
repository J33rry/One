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
import { Mail, Lock } from "lucide-react";
import {
  PebbleButton,
  PebbleDivider,
  PebbleError,
  PebbleField,
  PebbleHeading,
  pebbleLinkClass,
} from "@/components/login/PebbleAuth";

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
    <>
      <PebbleHeading title="Welcome back" subtitle="Sign in to continue to your account" />
      <PebbleError message={errorMsg} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6" noValidate>
        <PebbleField
          {...register("email")}
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="Email"
          error={errors.email?.message}
        />

        <div>
          <PebbleField
            {...register("password")}
            label="Password"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            error={errors.password?.message}
          />
          <div className="flex justify-end pt-3">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#6a6bef] transition-colors hover:text-[#4f50d6]"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <PebbleButton loading={passwordMutation.isPending}>Continue</PebbleButton>
      </form>

      <PebbleDivider />

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
          theme="outline"
          shape="pill"
        />
      </div>

      <p className="mt-8 text-center text-[15px] text-[#5d5a70]">
        New to pebble?{" "}
        <Link href="/register" className={pebbleLinkClass}>
          Create an account
        </Link>
      </p>
    </>
  );
}
