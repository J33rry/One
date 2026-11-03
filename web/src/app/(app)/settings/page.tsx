"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Pencil,
  Loader2,
  Monitor,
  ShieldCheck,
  Lock,
  UserX,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { authApi } from "@/lib/api/auth";
import { mediaApi } from "@/lib/api/media";
import { AUTH_QUERY_KEY, useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { useThemeChoice, ThemeChoice } from "@/components/ui/ThemeToggle";
import { usePresence } from "@/hooks/usePresence";
import { useToast } from "@/components/ui/Toast";

/** A tiny app window used as the preview on each theme card. */
function ThemePreview({ mode }: { mode: "light" | "dark" }) {
  const dark = mode === "dark";
  return (
    <div className={clsx("flex h-full w-full overflow-hidden", dark ? "bg-[#2a2933]" : "bg-white")}>
      <div className={clsx("flex w-5 flex-col items-center gap-1.5 pt-2", dark ? "bg-[#1c1b22]" : "bg-[#8d8ef6]")}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={clsx("h-1.5 w-1.5 rounded-full", dark ? "bg-white/40" : "bg-white/80")} />
        ))}
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <span className={clsx("block h-2 w-1/3 rounded-full", dark ? "bg-white/25" : "bg-[#d9d9fb]")} />
        <span className={clsx("block h-2 w-full rounded-full", dark ? "bg-white/15" : "bg-[#e7e7fd]")} />
        <span className={clsx("block h-2 w-2/3 rounded-full", dark ? "bg-white/15" : "bg-[#e7e7fd]")} />
      </div>
    </div>
  );
}

const THEMES: { value: ThemeChoice; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "A clean, bright look." },
  { value: "dark", label: "Dark", hint: "A focused, low-light look." },
  { value: "system", label: "System", hint: "Match your device setting." },
];

function SettingsRow({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const body = (
    <>
      <span
        className={clsx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          danger ? "bg-danger/10 text-danger" : "bg-surface-2 text-accent"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={clsx("block text-[17px] font-semibold", danger ? "text-danger" : "text-fg")}>{title}</span>
        <span className="block text-[15px] text-muted">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
    </>
  );
  const className =
    "flex w-full items-center gap-4 rounded-2xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-sm)] hover:ring-1 hover:ring-border-strong transition-shadow";
  return href ? (
    <Link href={href} className={className}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>{body}</button>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { isOnline } = usePresence();
  const { toast } = useToast();
  const [theme, setTheme] = useThemeChoice();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  const resetForm = () => {
    setDisplayName(user?.displayName || "");
    setBio(user?.bio || "");
    setAvatarUrl(user?.avatarUrl || "");
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the form from the loaded profile
    if (user) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isDirty =
    displayName !== (user?.displayName || "") ||
    bio !== (user?.bio || "") ||
    avatarUrl !== (user?.avatarUrl || "");

  const updateProfileMutation = useMutation({
    mutationFn: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
      usersApi.updateMe(data),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      toast("Profile updated successfully!", "success");
    },
    onError: (error: Error) => {
      toast(error.message || "Failed to update profile", "error");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
    });
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const media = await mediaApi.upload(file, () => {});
      setAvatarUrl(media.storageId);
      toast("Avatar uploaded! Remember to save changes.", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to upload avatar", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resetPasswordMutation = useMutation({
    mutationFn: () => authApi.forgotPassword(user!.email),
    onSuccess: () => toast(`Password reset link sent to ${user?.email}`, "success"),
    onError: (error: Error) => toast(error.message || "Couldn't send the reset link", "error"),
  });

  const online = isOnline(user?.id);
  const fieldClass =
    "w-full rounded-xl border border-border-strong bg-surface py-2.5 pl-4 pr-11 text-[16px] text-fg placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

  return (
    <div className="flex-1 overflow-y-auto bg-bg select-none">
      <div className="mx-auto max-w-6xl space-y-6 p-5 sm:p-8">
        <header>
          <h1 className="text-[40px] font-semibold leading-tight text-fg tracking-tight">Settings</h1>
          <p className="text-lg text-muted">Customize your Pebble experience</p>
        </header>

        {/* Profile */}
        <form
          onSubmit={handleProfileSubmit}
          className="grid gap-8 rounded-[28px] bg-surface-2/60 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row lg:border-r lg:border-border-strong lg:pr-8">
            <div className="relative shrink-0">
              <Avatar src={avatarUrl} name={displayName || user?.username} size="2xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-accent shadow-[var(--shadow-md)] hover:scale-105 transition-transform disabled:opacity-60"
                title="Change photo"
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Pencil className="h-5 w-5" />}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleAvatarSelect} accept="image/*" className="hidden" />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <h2 className="text-[30px] font-semibold leading-tight text-fg tracking-tight truncate">
                {user?.displayName || user?.username}
              </h2>
              <p className="text-lg text-muted truncate">@{user?.username}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-[16px] text-muted">
                <span className={clsx("h-3 w-3 rounded-full", online ? "bg-success" : "bg-faint")} />
                {online ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-[15px] font-semibold text-fg">
                Display name
              </label>
              <div className="relative">
                <input
                  id="displayName"
                  ref={nameRef}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className={fieldClass}
                />
                <Pencil
                  className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 cursor-text text-accent"
                  onClick={() => nameRef.current?.focus()}
                />
              </div>
            </div>
            <div>
              <label htmlFor="bio" className="mb-1.5 block text-[15px] font-semibold text-fg">
                Bio
              </label>
              <div className="relative">
                <textarea
                  id="bio"
                  ref={bioRef}
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A line or two about yourself"
                  className={clsx(fieldClass, "resize-none leading-snug")}
                />
                <Pencil
                  className="absolute right-4 top-4 h-4 w-4 cursor-text text-accent"
                  onClick={() => bioRef.current?.focus()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={resetForm}
                disabled={!isDirty || updateProfileMutation.isPending}
                className="rounded-xl bg-surface-3 px-6 py-2.5 text-[16px] font-medium text-accent hover:bg-surface-3/70 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isDirty || updateProfileMutation.isPending || isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-[16px] font-medium text-accent-fg hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        </form>

        {/* Appearance */}
        <section className="grid gap-6 rounded-[28px] bg-surface-2/60 p-6 sm:p-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex gap-4 lg:border-r lg:border-border-strong lg:pr-6">
            <Monitor className="h-7 w-7 shrink-0 text-accent" />
            <div>
              <h2 className="text-[24px] font-semibold text-fg tracking-tight">Appearance</h2>
              <p className="text-muted">Choose how Pebble looks for you.</p>
            </div>
          </div>
          <div role="radiogroup" aria-label="Theme" className="grid gap-4 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(t.value)}
                  className={clsx(
                    "rounded-2xl border-2 bg-surface p-4 text-left transition-colors",
                    active ? "border-accent" : "border-transparent hover:border-border-strong"
                  )}
                >
                  <div className="mx-auto h-[72px] w-[124px] overflow-hidden rounded-lg shadow-[var(--shadow-sm)] ring-1 ring-border">
                    {t.value === "system" ? (
                      <div className="relative h-full w-full">
                        <ThemePreview mode="light" />
                        <div className="absolute inset-0 [clip-path:polygon(70%_0,100%_0,100%_100%,35%_100%)]">
                          <ThemePreview mode="dark" />
                        </div>
                      </div>
                    ) : (
                      <ThemePreview mode={t.value} />
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <span
                      className={clsx(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2",
                        active ? "border-accent" : "border-muted"
                      )}
                    >
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                    </span>
                    <span className="text-[17px] font-semibold text-fg">{t.label}</span>
                  </div>
                  <p className="mt-0.5 pl-[30px] text-sm text-muted">{t.hint}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Privacy & security */}
        <section className="grid gap-6 rounded-[28px] bg-surface-2/60 p-6 sm:p-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex gap-4 lg:border-r lg:border-border-strong lg:pr-6">
            <ShieldCheck className="h-7 w-7 shrink-0 text-accent" />
            <div>
              <h2 className="text-[24px] font-semibold text-fg tracking-tight">Privacy &amp; security</h2>
              <p className="text-muted">Manage your account, privacy, and security preferences.</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <SettingsRow
              icon={Lock}
              title="Account security"
              description={
                resetPasswordMutation.isSuccess
                  ? `Check ${user?.email} for a link to set a new password.`
                  : `Email yourself a link to change your password.`
              }
              onClick={() => !resetPasswordMutation.isPending && resetPasswordMutation.mutate()}
            />
            <SettingsRow
              icon={UserX}
              title="Blocked people"
              description="See who you've blocked and unblock them."
              href="/contacts#blocked"
            />
            <SettingsRow
              icon={LogOut}
              title="Log out"
              description="Sign out of Pebble on this device."
              onClick={() => logout()}
              danger
            />
          </div>
        </section>
      </div>
    </div>
  );
}
