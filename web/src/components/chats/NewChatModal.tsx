"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "@/lib/api/contacts";
import { chatsApi } from "@/lib/api/chats";
import { useRouter } from "next/navigation";
import { Users, User, Check, AlertCircle, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { usePresence } from "@/hooks/usePresence";
import clsx from "clsx";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOnline } = usePresence();

  const [type, setType] = useState<"dm" | "group">("dm");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: contactsData, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.getContacts(),
    enabled: isOpen,
  });

  const acceptedContacts = (
    contactsData?.contacts?.filter((c) => c.status === "accepted") || []
  ).filter((contact, index, self) => {
    if (!contact.contactUser) return false;
    return index === self.findIndex((c) => c.contactUser?.id === contact.contactUser?.id);
  });

  const filteredContacts = acceptedContacts.filter((c) => {
    if (!searchFilter.trim()) return true;
    const name = (c.contactUser?.displayName || "").toLowerCase();
    const username = (c.contactUser?.username || "").toLowerCase();
    const query = searchFilter.toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  const createChatMutation = useMutation({
    mutationFn: (payload: {
      type: "dm" | "group";
      name?: string;
      description?: string;
      participantIds: string[];
    }) => chatsApi.createChat(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      onClose();
      resetForm();
      router.push(`/chats/${data.chat.id}`);
    },
    onError: (error: Error) => {
      setErrorMsg(error.message || "Failed to create chat");
    },
  });

  const resetForm = () => {
    setType("dm");
    setGroupName("");
    setGroupDescription("");
    setSelectedUserIds([]);
    setSearchFilter("");
    setErrorMsg("");
  };

  const toggleUserSelection = (userId: string) => {
    if (type === "dm") {
      setSelectedUserIds([userId]);
    } else {
      setSelectedUserIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
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
      description:
        type === "group" && groupDescription.trim() ? groupDescription.trim() : undefined,
      participantIds: selectedUserIds,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="New Conversation"
      maxWidth="md"
    >
      <div className="flex flex-col gap-4 p-6">
        {/* Type Toggle Tabs */}
        <div className="flex border border-border bg-surface-2/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setType("dm");
              setSelectedUserIds([]);
            }}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
              type === "dm"
                ? "bg-surface text-fg shadow-md border border-border"
                : "text-muted hover:text-fg"
            )}
          >
            <User className="w-4 h-4 text-accent" />
            Direct Message
          </button>
          <button
            type="button"
            onClick={() => {
              setType("group");
              setSelectedUserIds([]);
            }}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all",
              type === "group"
                ? "bg-surface text-fg shadow-md border border-border"
                : "text-muted hover:text-fg"
            )}
          >
            <Users className="w-4 h-4 text-accent" />
            Group Chat
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "group" && (
            <div className="space-y-3">
              <Input
                label="Group Name *"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Project Team, Family"
              />
              <Textarea
                label="Description (Optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="What's this group about?"
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Select {type === "dm" ? "Contact" : "Participants"} ({selectedUserIds.length})
              </label>
            </div>

            <Input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search contacts..."
              leftIcon={<Search className="w-3.5 h-3.5 text-faint" />}
            />

            {isLoadingContacts ? (
              <div className="py-8 text-center text-xs text-faint">Loading contacts...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="py-8 text-center text-xs text-faint">
                {acceptedContacts.length === 0
                  ? "No contacts found. Add contacts first to start a chat!"
                  : "No matching contacts."}
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-border border border-border rounded-xl bg-surface-2/40 p-1">
                {filteredContacts.map((contact) => {
                  const targetUser = contact.contactUser;
                  if (!targetUser) return null;
                  const isSelected = selectedUserIds.includes(targetUser.id);
                  const isUserOnline = isOnline(targetUser.id);

                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleUserSelection(targetUser.id)}
                      className={clsx(
                        "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors",
                        isSelected ? "bg-accent/10 border border-accent/30" : "hover:bg-surface-2/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={targetUser.avatarUrl}
                          name={targetUser.displayName}
                          size="md"
                          showPresence
                          isOnline={isUserOnline}
                        />
                        <div>
                          <p className="text-xs font-semibold text-fg">
                            {targetUser.displayName}
                          </p>
                          <p className="text-[11px] text-faint font-mono">
                            @{targetUser.username}
                          </p>
                        </div>
                      </div>

                      <div
                        className={clsx(
                          "w-5 h-5 rounded-md flex items-center justify-center border transition-colors",
                          isSelected
                            ? "bg-accent border-accent text-accent-fg"
                            : "border-border bg-surface-2"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createChatMutation.isPending}
              disabled={selectedUserIds.length === 0}
            >
              Create Chat
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
