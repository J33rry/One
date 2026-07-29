"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatsApi } from "@/lib/api/chats";
import { contactsApi } from "@/lib/api/contacts";
import { useAuth } from "@/hooks/useAuth";
import { Shield, ShieldAlert, UserMinus, UserPlus, Trash2, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { usePresence } from "@/hooks/usePresence";
import { useToast } from "@/components/ui/Toast";

interface ChatSettingsModalProps {
  chatId: string;
  onClose: () => void;
}

export function ChatSettingsModal({ chatId, onClose }: ChatSettingsModalProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isOnline } = usePresence();
  const { toast } = useToast();

  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["chatDetails", chatId],
    queryFn: async () => {
      const res = await chatsApi.getChatDetails(chatId);
      setName(res.chat.name || "");
      setDescription(res.chat.description || "");
      return res.chat;
    },
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: contactsApi.getContacts,
    enabled: showAddMembers,
  });

  const updateMutation = useMutation({
    mutationFn: () => chatsApi.updateChat(chatId, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      toast("Group details updated!", "success");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => chatsApi.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      onClose();
      router.push("/");
      toast("Group deleted", "info");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => chatsApi.removeParticipant(chatId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      onClose();
      router.push("/");
      toast("Left group", "info");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.removeParticipant(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
      toast("Member removed", "info");
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.updateParticipantRole(chatId, userId, "admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
      toast("Promoted to admin", "success");
    },
  });

  const addMembersMutation = useMutation({
    mutationFn: () => chatsApi.addParticipants(chatId, selectedContacts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
      setShowAddMembers(false);
      setSelectedContacts([]);
      toast("Members added", "success");
    },
  });

  if (isLoading || !data) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Loading...">
        <div className="p-8 text-center text-xs text-zinc-500">Loading details...</div>
      </Modal>
    );
  }

  const myParticipant = data.participants?.find((p) => p.userId === currentUser?.id);
  const isAdmin = myParticipant?.role === "admin";
  const isGroup = data.type === "group";

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isGroup ? "Group Settings" : "Chat Details"}
      maxWidth="md"
    >
      <div className="p-6 space-y-6">
        {/* Info Section */}
        {isGroup && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Group Info
            </h3>
            <div className="space-y-3">
              <Input
                label="Group Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isAdmin || updateMutation.isPending}
              />
              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isAdmin || updateMutation.isPending}
                rows={2}
              />
              {isAdmin && (name !== data.name || description !== data.description) && (
                <Button
                  variant="primary"
                  className="w-full"
                  isLoading={updateMutation.isPending}
                  onClick={() => updateMutation.mutate()}
                >
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Participants Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              Participants ({data.participants?.length || 0})
            </h3>
            {isGroup && isAdmin && !showAddMembers && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Members
              </button>
            )}
          </div>

          {/* Add Members Drawer */}
          {showAddMembers && (
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-white">Select Contacts</h4>
                <button
                  onClick={() => setShowAddMembers(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1">
                {contactsData?.contacts
                  .filter((c) => c.status === "accepted")
                  .map((contact) => {
                    const contactUser = contact.contactUser;
                    const isAlreadyMember = data.participants?.some(
                      (p) => p.userId === contactUser?.id
                    );
                    if (isAlreadyMember || !contactUser) return null;

                    const isSelected = selectedContacts.includes(contactUser.id);
                    return (
                      <div
                        key={contact.id}
                        onClick={() =>
                          setSelectedContacts((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== contactUser.id)
                              : [...prev, contactUser.id]
                          )
                        }
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/60 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="w-4 h-4 rounded border-zinc-700 text-emerald-500 bg-zinc-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {contactUser.displayName}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            @{contactUser.username}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <Button
                variant="primary"
                className="w-full"
                disabled={selectedContacts.length === 0}
                isLoading={addMembersMutation.isPending}
                onClick={() => addMembersMutation.mutate()}
              >
                Add {selectedContacts.length} Member(s)
              </Button>
            </div>
          )}

          {/* Member List */}
          <div className="space-y-1">
            {data.participants?.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/40 group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={p.user?.avatarUrl}
                    name={p.user?.displayName || p.user?.username}
                    size="md"
                    showPresence
                    isOnline={isOnline(p.userId)}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                      {p.userId === currentUser?.id ? "You" : p.user?.displayName}
                      {p.role === "admin" && <Shield className="w-3.5 h-3.5 text-emerald-400" />}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">
                      @{p.user?.username}
                    </p>
                  </div>
                </div>

                {isGroup && isAdmin && p.userId !== currentUser?.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.role !== "admin" && (
                      <button
                        onClick={() => promoteMutation.mutate(p.userId)}
                        disabled={promoteMutation.isPending}
                        className="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 transition-colors"
                        title="Make Admin"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${p.user?.displayName} from the group?`)) {
                          removeMemberMutation.mutate(p.userId);
                        }
                      }}
                      disabled={removeMemberMutation.isPending}
                      className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Remove Member"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <Button
            variant="outline"
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
            leftIcon={<LogOut className="w-4 h-4" />}
            isLoading={leaveMutation.isPending}
            onClick={() => {
              if (confirm("Are you sure you want to leave this chat?")) {
                leaveMutation.mutate();
              }
            }}
          >
            Leave Conversation
          </Button>

          {isGroup && isAdmin && (
            <Button
              variant="danger"
              className="w-full"
              leftIcon={<Trash2 className="w-4 h-4" />}
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (
                  confirm(
                    "Are you absolutely sure you want to delete this group? This cannot be undone."
                  )
                ) {
                  deleteMutation.mutate();
                }
              }}
            >
              Delete Group
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
