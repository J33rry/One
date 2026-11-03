"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { foldersApi, ChatFolder } from "@/lib/api/folders";
import { chatsApi, Chat } from "@/lib/api/chats";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, Check, Loader2, FolderOpen } from "lucide-react";
import clsx from "clsx";

interface FolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FolderManagerModal({ isOpen, onClose }: FolderManagerModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: foldersData } = useQuery({
    queryKey: ["folders"],
    queryFn: () => foldersApi.getFolders(),
    enabled: isOpen,
  });
  const { data: chatsData } = useQuery({
    queryKey: ["chats"],
    queryFn: () => chatsApi.getChats(),
    enabled: isOpen,
  });

  const folders: ChatFolder[] = foldersData?.folders || [];
  const chats: Chat[] = chatsData?.chats || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    queryClient.invalidateQueries({ queryKey: ["chats"] });
  };

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      foldersApi.createFolder({ name, position: folders.length }),
    onSuccess: () => {
      setNewName("");
      refresh();
      toast("Folder created", "success");
    },
    onError: () => toast("Could not create folder — is the name already used?", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (folderId: string) => foldersApi.deleteFolder(folderId),
    onSuccess: () => {
      setEditingId(null);
      refresh();
      toast("Folder deleted", "success");
    },
  });

  const toggleChatMutation = useMutation({
    mutationFn: ({
      folderId,
      chatId,
      inFolder,
    }: {
      folderId: string;
      chatId: string;
      inFolder: boolean;
    }) =>
      inFolder
        ? foldersApi.removeChat(folderId, chatId)
        : foldersApi.addChat(folderId, chatId),
    onSuccess: refresh,
  });

  const chatTitle = (chat: Chat) => {
    if (chat.type === "group") return chat.name || "Unnamed Group";
    const other = chat.participants?.find((p) => p.userId !== currentUser?.id);
    return other?.user?.displayName || "Unknown User";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Folders" maxWidth="md">
      <div className="space-y-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (name) createMutation.mutate(name);
          }}
          className="flex gap-2"
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New folder name"
            maxLength={50}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!newName.trim() || createMutation.isPending}
            isLoading={createMutation.isPending}
          >
            Create
          </Button>
        </form>

        {folders.length === 0 ? (
          <p className="text-xs text-faint italic text-center py-6">
            No folders yet. Create one to group your chats.
          </p>
        ) : (
          <ul className="space-y-2">
            {folders.map((f) => {
              const isEditing = editingId === f.id;
              return (
                <li
                  key={f.id}
                  className="rounded-2xl border border-border bg-surface-2/30 overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3">
                    <FolderOpen className="w-4 h-4 text-accent shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-fg truncate">
                      {f.name}
                    </span>
                    <button
                      onClick={() => setEditingId(isEditing ? null : f.id)}
                      className="text-[11px] text-muted hover:text-fg px-2.5 py-1 rounded-lg hover:bg-surface-3/40 transition-colors"
                    >
                      {isEditing ? "Done" : "Choose chats"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete the folder "${f.name}"? Your chats are not deleted.`)) {
                          deleteMutation.mutate(f.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isEditing && (
                    <ul className="border-t border-border max-h-56 overflow-y-auto">
                      {chats.map((chat) => {
                        const inFolder = (chat.folderIds || []).includes(f.id);
                        return (
                          <li key={chat.id}>
                            <button
                              onClick={() =>
                                toggleChatMutation.mutate({
                                  folderId: f.id,
                                  chatId: chat.id,
                                  inFolder,
                                })
                              }
                              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-3/30 transition-colors"
                            >
                              <span
                                className={clsx(
                                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                  inFolder
                                    ? "bg-accent border-accent text-accent-fg"
                                    : "border-border-strong",
                                )}
                              >
                                {inFolder && <Check className="w-3 h-3" />}
                              </span>
                              <span className="text-xs text-fg truncate">
                                {chatTitle(chat)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                      {chats.length === 0 && (
                        <li className="px-3 py-3 text-xs text-faint italic">
                          No chats to add.
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {toggleChatMutation.isPending && (
          <div className="flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted" />
          </div>
        )}
      </div>
    </Modal>
  );
}
