"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";
import { mediaApi } from "@/lib/api/media";
import { AUTH_QUERY_KEY, useAuth } from "@/hooks/useAuth";
import { User as UserIcon, Save, Camera, ShieldCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { usePresence } from "@/hooks/usePresence";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

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

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 sm:p-10 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage your public profile, avatar, and account preferences.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/80 space-x-6">
          <button className="pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 text-emerald-400">
            <UserIcon className="w-4 h-4" />
            Profile Details
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
          </button>
        </div>

        {/* Main Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-5">
              <div className="relative group shrink-0">
                <Avatar
                  src={avatarUrl}
                  name={displayName || user?.username}
                  size="xl"
                  showPresence
                  isOnline={isOnline(user?.id)}
                  className="shadow-xl"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 rounded-full text-zinc-200 shadow-xl transition-transform hover:scale-110 disabled:opacity-50"
                  title="Update Avatar"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {user?.displayName || user?.username}
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </h3>
                <p className="text-xs text-zinc-400 font-mono">@{user?.username}</p>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{user?.email}</p>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleProfileSubmit}>
            <CardContent className="space-y-5">
              <Input
                label="Display Name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                helperText="This is the name other users see in conversation headers."
              />

              <Textarea
                label="Bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief bio about yourself..."
                helperText="Brief summary displayed in your profile popover."
              />
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                variant="primary"
                leftIcon={<Save className="w-4 h-4" />}
                isLoading={updateProfileMutation.isPending}
              >
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
