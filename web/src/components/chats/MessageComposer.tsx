"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "@/lib/api/messages";
import { mediaApi } from "@/lib/api/media";
import { Paperclip, Send, Loader2, X, File as FileIcon, Check, Smile } from "lucide-react";
import { useTyping } from "@/hooks/useTyping";
import { useMessageActions } from "@/hooks/useMessageActions";
import clsx from "clsx";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface MessageComposerProps {
  chatId: string;
}

export function MessageComposer({ chatId }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const queryClient = useQueryClient();
  const { sendTypingStart } = useTyping(chatId);
  const { editingMessage, replyingToMessage, clearActions } = useMessageActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || "");
      setSelectedFile(null);
    } else {
      setContent("");
    }
  }, [editingMessage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedFile) {
      if (selectedFile.type.startsWith("image/") || selectedFile.type.startsWith("video/")) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const clearFile = () => {
    if (isUploading) return;
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  // Drag and Drop support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      text,
      mediaId,
      type,
    }: {
      text: string;
      mediaId?: string;
      type: "text" | "image" | "video" | "audio" | "file";
    }) => {
      return messagesApi.sendMessage(chatId, {
        type,
        content: text || undefined,
        mediaId,
        replyToMessageId: replyingToMessage?.id,
      });
    },
    onSuccess: () => {
      setContent("");
      setSelectedFile(null);
      setIsUploading(false);
      setUploadProgress(0);
      setShowEmojiPicker(false);
      clearActions();
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (err) => {
      console.error("Send failed", err);
      alert("Failed to send message");
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      if (!editingMessage) throw new Error("No message to edit");
      return messagesApi.editMessage(chatId, editingMessage.id, text);
    },
    onSuccess: () => {
      setContent("");
      clearActions();
      queryClient.invalidateQueries({ queryKey: ["messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
    onError: (err) => {
      console.error("Edit failed", err);
      alert("Failed to edit message");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendMessageMutation.isPending || editMessageMutation.isPending || isUploading) return;

    if (editingMessage) {
      if (!content.trim()) return;
      editMessageMutation.mutate({ text: content.trim() });
      return;
    }

    if (!content.trim() && !selectedFile) return;

    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const media = await mediaApi.upload(selectedFile, setUploadProgress);

        let type: "image" | "video" | "audio" | "file" = "file";
        if (selectedFile.type.startsWith("image/")) type = "image";
        else if (selectedFile.type.startsWith("video/")) type = "video";
        else if (selectedFile.type.startsWith("audio/")) type = "audio";

        sendMessageMutation.mutate({ text: content.trim(), mediaId: media.id, type });
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload file");
        setIsUploading(false);
      }
    } else {
      sendMessageMutation.mutate({ text: content.trim(), type: "text" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    sendTypingStart();
  };

  const handleEmojiSelect = (emojiData: any) => {
    setContent((prev) => prev + emojiData.emoji);
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div
      className="p-3 border-t border-zinc-800/80 bg-zinc-950 shrink-0 flex flex-col relative"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-emerald-950/80 backdrop-blur-md border-2 border-dashed border-emerald-500 rounded-2xl flex flex-col items-center justify-center text-emerald-300 pointer-events-none">
          <Paperclip className="w-8 h-8 mb-2 animate-bounce" />
          <p className="text-sm font-bold">Drop file to attach</p>
        </div>
      )}

      {/* Emoji Picker Floating Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-3 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-zinc-800">
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={handleEmojiSelect}
            lazyLoadEmojis={true}
            searchDisabled={false}
          />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={clsx(
          "flex flex-col bg-zinc-900/90 border transition-all duration-200 shadow-lg",
          editingMessage
            ? "border-emerald-500/60 rounded-2xl"
            : replyingToMessage
            ? "border-blue-500/60 rounded-2xl"
            : "border-zinc-800 focus-within:border-emerald-500/60 rounded-2xl"
        )}
      >
        {/* Reply Active Banner */}
        {replyingToMessage && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-950/30 border-b border-zinc-800 rounded-t-2xl">
            <div className="flex flex-col min-w-0 pr-4">
              <span className="text-[11px] font-semibold text-blue-400">
                Replying to {replyingToMessage.sender?.displayName || "User"}
              </span>
              <span className="text-xs text-zinc-300 truncate">
                {replyingToMessage.content || "Media attachment"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => clearActions()}
              className="p-1 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit Active Banner */}
        {editingMessage && (
          <div className="flex items-center justify-between px-4 py-2 bg-emerald-950/30 border-b border-zinc-800 rounded-t-2xl">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-emerald-400">
                Editing Message
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearActions();
                setContent("");
              }}
              className="p-1 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selected File Preview Box */}
        {selectedFile && !editingMessage && (
          <div className="relative self-start ml-4 mt-3 mb-1 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 inline-flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover" />
            ) : (
              <div className="p-4 flex flex-col items-center justify-center w-24 h-24 text-zinc-400">
                <FileIcon className="w-7 h-7 mb-1 text-emerald-400" />
                <span className="text-[10px] max-w-[80px] truncate text-center font-mono">
                  {selectedFile.name}
                </span>
              </div>
            )}

            {!isUploading && (
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-500 rounded-full text-white transition-colors"
                title="Remove file"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-1.5 text-white">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span className="text-[10px] font-bold font-mono">{uploadProgress}%</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2 p-2">
          {!editingMessage && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-zinc-400 hover:text-emerald-400 transition-colors rounded-xl hover:bg-zinc-800/60 disabled:opacity-50"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-zinc-400 hover:text-emerald-400 transition-colors rounded-xl hover:bg-zinc-800/60"
            title="Emoji Picker"
          >
            <Smile className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage
                ? "Edit message..."
                : selectedFile
                ? "Add a caption..."
                : "Type a message..."
            }
            className="flex-1 bg-transparent border-0 text-white placeholder-zinc-500 resize-none max-h-32 min-h-[38px] focus:ring-0 py-2 px-2 text-sm leading-relaxed"
            rows={1}
            disabled={isUploading || editMessageMutation.isPending}
            autoFocus={!!editingMessage || !!replyingToMessage}
          />

          <button
            type="submit"
            disabled={
              (editingMessage ? !content.trim() : !content.trim() && !selectedFile) ||
              sendMessageMutation.isPending ||
              editMessageMutation.isPending ||
              isUploading
            }
            className={clsx(
              "p-2 text-white rounded-xl transition-all duration-150 shrink-0 mb-0.5 disabled:opacity-40 disabled:pointer-events-none active:scale-95 shadow-md",
              editingMessage
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
            )}
            title="Send"
          >
            {sendMessageMutation.isPending ||
            editMessageMutation.isPending ||
            isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editingMessage ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
