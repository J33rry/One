"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "@/lib/api/contacts";
import { chatsApi } from "@/lib/api/chats";
import { useRouter } from "next/navigation";
import { X, Users, User, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  const [type, setType] = useState<"dm" | "group">("dm");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactsApi.getContacts(),
    enabled: isOpen,
  });

  // Only accepted contacts can be added to a new chat, and deduplicate by target user id
  const acceptedContacts = (contactsData?.contacts?.filter(c => c.status === 'accepted') || [])
    .filter((contact, index, self) => {
      if (!contact.contactUser) return false;
      return index === self.findIndex((c) => c.contactUser?.id === contact.contactUser?.id);
    });

  const createChatMutation = useMutation({
    mutationFn: (payload: { type: "dm" | "group"; name?: string; description?: string; participantIds: string[] }) =>
      chatsApi.createChat(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      onClose();
      resetForm();
      router.push(`/chats/${data.chat.id}`);
    },
    onError: (error: any) => {
      setErrorMsg(error.message || "Failed to create chat");
    },
  });

  const resetForm = () => {
    setType("dm");
    setGroupName("");
    setGroupDescription("");
    setSelectedUserIds([]);
    setErrorMsg("");
  };

  if (!isOpen) return null;

  const toggleUserSelection = (userId: string) => {
    if (type === "dm") {
      setSelectedUserIds([userId]);
    } else {
      setSelectedUserIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (selectedUserIds.length === 0) {
      setErrorMsg("Please select at least one contact.");
      return;
    }

    if (type === "group" && !groupName.trim()) {
      setErrorMsg("Please provide a name for the group chat.");
      return;
    }

    createChatMutation.mutate({
      type,
      name: type === "group" ? groupName.trim() : undefined,
      description: type === "group" && groupDescription.trim() ? groupDescription.trim() : undefined,
      participantIds: selectedUserIds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-lg font-bold text-white">New Chat</h3>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 p-1 gap-1 mx-6 mt-4 rounded-lg border">
          <button
            type="button"
            onClick={() => {
              setType("dm");
              setSelectedUserIds([]);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
              type === "dm" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            Direct Message
          </button>
          <button
            type="button"
            onClick={() => {
              setType("group");
              setSelectedUserIds([]);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
              type === "group" ? "bg-zinc-800 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            Group Chat
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

          {type === "group" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Project Team, Family"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Select {type === "dm" ? "Contact" : "Participants"} ({selectedUserIds.length})
            </label>

            {isLoadingContacts ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : acceptedContacts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 text-center text-sm text-zinc-500">
                No accepted contacts found. Add contacts first to start a chat!
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 border border-zinc-800 rounded-lg bg-zinc-950/40">
                {acceptedContacts.map((contact) => {
                  const targetUser = contact.contactUser;
                  if (!targetUser) return null;
                  const isSelected = selectedUserIds.includes(targetUser.id);

                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleUserSelection(targetUser.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-emerald-500/10" : "hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                          {targetUser.avatarUrl ? (
                            <img src={targetUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{targetUser.displayName}</p>
                          <p className="text-xs text-zinc-500">@{targetUser.username}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-zinc-700 bg-zinc-800"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createChatMutation.isPending || selectedUserIds.length === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {createChatMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
