"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatsApi, Chat, ChatParticipant } from "@/lib/api/chats";
import { contactsApi } from "@/lib/api/contacts";
import { useAuth } from "@/hooks/useAuth";
import { X, Shield, ShieldAlert, UserMinus, UserPlus, Loader2, Trash2, LogOut } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";

interface ChatSettingsModalProps {
  chatId: string;
  onClose: () => void;
}

export function ChatSettingsModal({ chatId, onClose }: ChatSettingsModalProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ['chatDetails', chatId],
    queryFn: async () => {
      const res = await chatsApi.getChatDetails(chatId);
      setName(res.chat.name || "");
      setDescription(res.chat.description || "");
      return res.chat;
    },
  });

  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: contactsApi.getContacts,
    enabled: showAddMembers,
  });

  const updateMutation = useMutation({
    mutationFn: () => chatsApi.updateChat(chatId, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatDetails', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => chatsApi.deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      onClose();
      router.push("/");
    }
  });

  const leaveMutation = useMutation({
    mutationFn: () => chatsApi.removeParticipant(chatId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      onClose();
      router.push("/");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.removeParticipant(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatDetails', chatId] });
    }
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => chatsApi.updateParticipantRole(chatId, userId, 'admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatDetails', chatId] });
    }
  });

  const addMembersMutation = useMutation({
    mutationFn: () => chatsApi.addParticipants(chatId, selectedContacts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatDetails', chatId] });
      setShowAddMembers(false);
      setSelectedContacts([]);
    }
  });

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center backdrop-blur-sm">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const myParticipant = data.participants?.find(p => p.userId === currentUser?.id);
  const isAdmin = myParticipant?.role === 'admin';
  const isGroup = data.type === 'group';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <h2 className="text-lg font-bold text-white">
            {isGroup ? "Group Settings" : "Chat Details"}
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Info Section */}
          {isGroup && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Group Info</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isAdmin || updateMutation.isPending}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isAdmin || updateMutation.isPending}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 resize-none"
                  />
                </div>
                {isAdmin && (name !== data.name || description !== data.description) && (
                  <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Participants Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Participants ({data.participants?.length || 0})
              </h3>
              {isGroup && isAdmin && !showAddMembers && (
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-500 hover:text-emerald-400"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add
                </button>
              )}
            </div>

            {/* Add Members Flow */}
            {showAddMembers && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-white">Select Contacts</h4>
                  <button onClick={() => setShowAddMembers(false)} className="text-zinc-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {contactsData?.contacts.filter(c => c.status === 'accepted').map(contact => {
                    const contactUser = contact.contactUser;
                    const isAlreadyMember = data.participants?.some(p => p.userId === contactUser?.id);
                    if (isAlreadyMember || !contactUser) return null;

                    const isSelected = selectedContacts.includes(contactUser.id);
                    return (
                      <div 
                        key={contact.id} 
                        onClick={() => setSelectedContacts(prev => 
                          isSelected ? prev.filter(id => id !== contactUser.id) : [...prev, contactUser.id]
                        )}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          readOnly
                          className="w-4 h-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500/20 bg-zinc-900" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{contactUser.displayName}</p>
                          <p className="text-xs text-zinc-500 truncate">@{contactUser.username}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => addMembersMutation.mutate()}
                  disabled={selectedContacts.length === 0 || addMembersMutation.isPending}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {addMembersMutation.isPending ? "Adding..." : `Add ${selectedContacts.length} Member(s)`}
                </button>
              </div>
            )}

            <div className="space-y-1">
              {data.participants?.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/50 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                      {p.user?.avatarUrl ? (
                        <img src={p.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                          {p.user?.displayName?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                        {p.userId === currentUser?.id ? "You" : p.user?.displayName}
                        {p.role === 'admin' && (
                          <span title="Admin" className="flex items-center">
                            <Shield className="w-3.5 h-3.5 text-emerald-500" />
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">@{p.user?.username}</p>
                    </div>
                  </div>

                  {isGroup && isAdmin && p.userId !== currentUser?.id && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.role !== 'admin' && (
                        <button
                          onClick={() => promoteMutation.mutate(p.userId)}
                          disabled={promoteMutation.isPending}
                          className="p-2 text-zinc-400 hover:text-emerald-500 rounded-full hover:bg-zinc-950 transition-colors"
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
                        className="p-2 text-zinc-400 hover:text-red-500 rounded-full hover:bg-zinc-950 transition-colors"
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
             <button
                onClick={() => {
                  if (confirm("Are you sure you want to leave this chat?")) {
                    leaveMutation.mutate();
                  }
                }}
                disabled={leaveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-red-500 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {leaveMutation.isPending ? "Leaving..." : "Leave Group"}
              </button>

             {isGroup && isAdmin && (
              <button
                onClick={() => {
                  if (confirm("Are you absolutely sure you want to delete this group? This cannot be undone.")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleteMutation.isPending ? "Deleting..." : "Delete Group"}
              </button>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}
