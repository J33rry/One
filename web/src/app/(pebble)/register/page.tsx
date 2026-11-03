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
import { Mail, Lock, User, AtSign } from "lucide-react";
import {
  PebbleButton,
  PebbleDivider,
  PebbleError,
  PebbleField,
  PebbleHeading,
  pebbleLinkClass,
} from "@/components/login/PebbleAuth";

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
    onError: (error: Error) => {
      setErrorMsg(error.message || "Registration failed");
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

  const onSubmit = (data: RegisterFormValues) => {
    setErrorMsg("");
    mutation.mutate(data);
  };

  return (
    <>
      <PebbleHeading title="Create an account" subtitle="Start your first conversation on pebble" />
      <PebbleError message={errorMsg} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
        <PebbleField
          {...register("email")}
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <PebbleField
            {...register("username")}
            label="Username"
            icon={AtSign}
            type="text"
            autoComplete="username"
            placeholder="username"
            error={errors.username?.message}
          />
          <PebbleField
            {...register("displayName")}
            label="Display name"
            icon={User}
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            error={errors.displayName?.message}
          />
        </div>

        <PebbleField
          {...register("password")}
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
        />

        <div className="pt-2">
          <PebbleButton loading={mutation.isPending}>Create account</PebbleButton>
        </div>
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
          text="signup_with"
          theme="outline"
          shape="pill"
        />
      </div>

      <p className="mt-8 text-center text-[15px] text-[#5d5a70]">
        Already on pebble?{" "}
        <Link href="/login" className={pebbleLinkClass}>
          Sign in
        </Link>
      </p>
    </>
  );
}
