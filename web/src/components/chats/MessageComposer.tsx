"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "@/lib/api/messages";
import { mediaApi } from "@/lib/api/media";
import { Paperclip, Send, Loader2, X, File as FileIcon, Check, Smile, ArrowUp } from "lucide-react";
import { useTyping } from "@/hooks/useTyping";
import { useMessageActions } from "@/hooks/useMessageActions";
import clsx from "clsx";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";

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

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setContent((prev) => prev + emojiData.emoji);
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div
      className="p-4 bg-transparent shrink-0 flex flex-col relative z-20"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-4 z-40 glass-panel border-2 border-dashed border-accent rounded-3xl flex flex-col items-center justify-center text-accent pointer-events-none shadow-[0_0_30px_rgba(211,161,94,0.2)]">
          <Paperclip className="w-10 h-10 mb-3 animate-bounce" />
          <p className="text-sm font-bold tracking-wide">Drop file to attach</p>
        </div>
      )}

      {/* Emoji Picker Floating Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-4 left-4 z-50 shadow-2xl rounded-3xl overflow-hidden border border-border glass-panel">
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
          "flex flex-col glass-pill transition-all duration-300 shadow-lg mx-auto w-full max-w-4xl relative overflow-visible",
          editingMessage
            ? "ring-2 ring-accent/50 shadow-[0_0_20px_rgba(211,161,94,0.2)]"
            : replyingToMessage
            ? "ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
            : "ring-1 ring-border focus-within:ring-2 focus-within:ring-accent/50 focus-within:shadow-[0_0_20px_rgba(211,161,94,0.1)]"
        )}
      >
        {/* Reply Active Banner */}
        {replyingToMessage && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-blue-500/10 border-b border-blue-500/20 rounded-t-[9999px]">
            <div className="flex flex-col min-w-0 pr-4">
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400">
                Replying to {replyingToMessage.sender?.displayName || "User"}
              </span>
              <span className="text-xs text-muted truncate mt-0.5">
                {replyingToMessage.content || "Media attachment"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => clearActions()}
              className="p-1.5 bg-blue-500/20 rounded-full text-blue-400 hover:text-white hover:bg-blue-500/40 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit Active Banner */}
        {editingMessage && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-accent/10 border-b border-accent/20 rounded-t-[9999px]">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold tracking-widest uppercase text-accent">
                Editing Message
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearActions();
                setContent("");
              }}
              className="p-1.5 bg-accent/20 rounded-full text-accent hover:text-white hover:bg-accent/40 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selected File Preview Box */}
        {selectedFile && !editingMessage && (
          <div className="relative self-start ml-6 mt-3 mb-1 rounded-2xl overflow-hidden bg-black/40 border border-border inline-flex items-center justify-center shadow-inner">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover" />
            ) : (
              <div className="p-4 flex flex-col items-center justify-center w-24 h-24 text-muted">
                <FileIcon className="w-7 h-7 mb-2 text-accent" />
                <span className="text-[10px] max-w-[80px] truncate text-center font-mono">
                  {selectedFile.name}
                </span>
              </div>
            )}

            {!isUploading && (
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md hover:bg-danger rounded-full text-white transition-all shadow-md"
                title="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                <span className="text-[10px] font-bold font-mono text-accent">{uploadProgress}%</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2 p-2 px-3">
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
                className="p-3 text-muted hover:text-accent transition-colors rounded-full hover:bg-surface-3/30 disabled:opacity-50"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-3 text-muted hover:text-accent transition-colors rounded-full hover:bg-surface-3/30"
            title="Emoji Picker"
          >
            <Smile className="w-5 h-5" />
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
                : "Message..."
            }
            className="flex-1 bg-transparent border-0 text-fg placeholder-faint resize-none max-h-32 min-h-[44px] focus:ring-0 py-3 px-2 text-[15px] leading-relaxed font-medium"
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
              "w-11 h-11 flex items-center justify-center rounded-full transition-all duration-300 shrink-0 shadow-lg",
              editingMessage || (content.trim() || selectedFile)
                ? "bg-accent hover:bg-accent-hover text-accent-fg shadow-[0_0_15px_rgba(211,161,94,0.4)]"
                : "bg-surface-3/50 text-muted cursor-not-allowed shadow-none"
            )}
            title="Send"
          >
            {sendMessageMutation.isPending ||
            editMessageMutation.isPending ||
            isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : editingMessage ? (
              <Check className="w-5 h-5" />
            ) : (
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
