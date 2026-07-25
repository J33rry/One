"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { usersApi } from "@/lib/api/users";
import { mediaApi } from "@/lib/api/media";
import { AUTH_QUERY_KEY, useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Loader2, Plus, Edit2, Trash2, Fingerprint, User as UserIcon, Shield, Check, Save, Camera } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { startRegistration } from "@simplewebauthn/browser";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"profile" | "passkeys">("profile");

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Passkeys state
  const [passkeyErrorMsg, setPasskeyErrorMsg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  // Profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
      usersApi.updateMe(data),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, { user: data.user });
      setProfileSuccess("Profile updated successfully!");
      setTimeout(() => setProfileSuccess(""), 4000);
    },
    onError: (error: any) => {
      setProfileError(error.message || "Failed to update profile");
    },
  });

  // Passkeys query & mutations
  const { data: passkeysData, isLoading: isLoadingPasskeys } = useQuery({
    queryKey: ['passkeys'],
    queryFn: () => authApi.getPasskeys(),
  });
  const passkeys = passkeysData?.passkeys;

  const addPasskeyMutation = useMutation({
    mutationFn: async () => {
      const { options } = await authApi.getAddPasskeyOptions();
      const credential = await startRegistration({ optionsJSON: options });
      return authApi.verifyAddPasskey(credential);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
    onError: (error: any) => {
      setPasskeyErrorMsg(error.message || "Failed to add passkey");
    }
  });

  const renameMutation = useMutation({
    mutationFn: (data: { id: string, name: string }) => authApi.renamePasskey(data.id, data.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
      setEditingId(null);
    },
    onError: (error: any) => {
      setPasskeyErrorMsg(error.message || "Failed to rename passkey");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.deletePasskey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
    onError: (error: any) => {
      setPasskeyErrorMsg(error.message || "Failed to delete passkey");
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
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
      setProfileError("");
      const media = await mediaApi.upload(file, () => {});
      setAvatarUrl(media.storageId);
      setProfileSuccess("Avatar uploaded! Remember to save changes.");
    } catch (err: any) {
      setProfileError(err.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your account profile and security credentials.</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 space-x-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "profile" ? "text-emerald-500" : "text-zinc-400 hover:text-white"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Profile Details
            {activeTab === "profile" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("passkeys")}
            className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "passkeys" ? "text-emerald-500" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4" />
            Passkeys & Security
            {activeTab === "passkeys" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-6 pb-6 border-b border-zinc-800">
              <div className="relative h-20 w-20 shrink-0">
                <div className="h-20 w-20 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center overflow-hidden shadow-inner">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-emerald-500">
                      {displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-zinc-300 transition-colors shadow-lg disabled:opacity-50"
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
                <h3 className="text-lg font-bold text-white">{user?.displayName || user?.username}</h3>
                <p className="text-xs text-zinc-400">@{user?.username}</p>
                <p className="text-xs text-zinc-500 mt-1">{user?.email}</p>
              </div>
            </div>

            {profileError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "passkeys" && (
          <div className="bg-zinc-900 shadow-xl rounded-xl border border-zinc-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Registered Passkeys</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Manage WebAuthn passkeys used for secure authentication.</p>
              </div>
              <button
                onClick={() => addPasskeyMutation.mutate()}
                disabled={addPasskeyMutation.isPending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {addPasskeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Passkey
              </button>
            </div>

            {passkeyErrorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {passkeyErrorMsg}
              </div>
            )}

            {isLoadingPasskeys ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800/60 border border-zinc-800/80 rounded-lg bg-zinc-950/30 overflow-hidden">
                {passkeys?.map((passkey) => (
                  <li key={passkey.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/40">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                        <Fingerprint className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        {editingId === passkey.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-zinc-950 border border-zinc-800 rounded text-sm text-white px-2 py-1 focus:outline-none focus:border-emerald-500"
                              autoFocus
                            />
                            <button
                              onClick={() => renameMutation.mutate({ id: passkey.id, name: editName })}
                              disabled={renameMutation.isPending}
                              className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-500"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded hover:bg-zinc-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-white">
                            {passkey.deviceName || "Unknown Device"}
                          </p>
                        )}
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Added {format(new Date(passkey.createdAt), 'PP')}
                          {passkey.lastUsedAt && ` • Last used ${format(new Date(passkey.lastUsedAt), 'PP')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId !== passkey.id && (
                        <button
                          onClick={() => {
                            setEditingId(passkey.id);
                            setEditName(passkey.deviceName || "");
                          }}
                          className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(passkey.id)}
                        disabled={deleteMutation.isPending || (passkeys ? passkeys.length <= 1 : true)}
                        className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                        title={passkeys && passkeys.length <= 1 ? "Cannot delete your only passkey" : "Delete passkey"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
                {passkeys?.length === 0 && (
                  <li className="py-6 text-sm text-zinc-500 text-center">No passkeys found.</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
