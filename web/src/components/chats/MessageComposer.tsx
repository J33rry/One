"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { messagesApi } from "@/lib/api/messages";
import { mediaApi } from "@/lib/api/media";
import { chatsApi, ChatParticipant } from "@/lib/api/chats";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Paperclip, Send, Loader2, X, File as FileIcon, Check, Smile, Mic, Square } from "lucide-react";
import { formatDuration } from "@/lib/utils/time";
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
  const [recordingSeconds, setRecordingSeconds] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // Mention autocomplete. `mentionAnchor` is the index of the '@' being typed.
  const [mentionAnchor, setMentionAnchor] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const queryClient = useQueryClient();
  const { sendTypingStart } = useTyping(chatId);
  const { editingMessage, replyingToMessage, clearActions } = useMessageActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user: currentUser } = useAuth();

  // Already warm — ChatMain fetches this on the same key.
  const { data: chatData } = useQuery({
    queryKey: ["chats", chatId],
    queryFn: () => chatsApi.getChatDetails(chatId),
  });

  // Only this chat's participants can be mentioned, matching the server.
  const mentionCandidates: ChatParticipant[] =
    mentionAnchor === null
      ? []
      : (chatData?.chat?.participants || [])
          .filter((p) => p.userId !== currentUser?.id)
          .filter((p) => {
            const q = mentionQuery.toLowerCase();
            if (!q) return true;
            return (
              (p.user?.username || "").toLowerCase().startsWith(q) ||
              (p.user?.displayName || "").toLowerCase().includes(q)
            );
          })
          .slice(0, 6);

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
    // The mention popover must claim these keys BEFORE the Enter-to-send
    // branch below, or picking a suggestion would send a half-typed mention.
    if (mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionAnchor(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    sendTypingStart();

    // Detect an in-progress @mention immediately left of the caret.
    const caret = e.target.selectionStart ?? value.length;
    const match = /(?:^|[^\w@])@([a-zA-Z0-9_]*)$/.exec(value.slice(0, caret));
    if (match) {
      setMentionAnchor(caret - match[1].length - 1);
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionAnchor(null);
    }
  };

  const applyMention = (p: ChatParticipant) => {
    if (mentionAnchor === null) return;
    const username = p.user?.username;
    if (!username) return;

    const caret = textareaRef.current?.selectionStart ?? content.length;
    const next =
      content.slice(0, mentionAnchor) + `@${username} ` + content.slice(caret);

    setContent(next);
    setMentionAnchor(null);

    // Put the caret just after the inserted mention.
    const pos = mentionAnchor + username.length + 2;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setContent((prev) => prev + emojiData.emoji);
    if (textareaRef.current) textareaRef.current.focus();
  };

  // Voice messages: record with MediaRecorder, then hand the clip to the same
  // attachment path as any other file so it uploads and sends as audio.
  const isRecording = recordingSeconds !== null;

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setRecordingSeconds((s) => (s ?? 0) + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  useEffect(() => () => recorderRef.current?.stop(), []);

  const toggleRecording = async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        setRecordingSeconds(null);
        if (!chunks.length) return;
        const type = recorder.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        setSelectedFile(new File(chunks, `voice-message.${ext}`, { type }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordingSeconds(0);
    } catch {
      alert("Microphone access is needed to record a voice message.");
    }
  };

  return (
    <div
      className="px-4 md:px-6 pb-4 pt-2 shrink-0 flex flex-col relative z-20"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-2 z-40 bg-surface-2 border-2 border-dashed border-accent rounded-2xl flex flex-col items-center justify-center text-accent pointer-events-none">
          <Paperclip className="w-10 h-10 mb-3 animate-bounce" />
          <p className="text-sm font-bold tracking-wide">Drop file to attach</p>
        </div>
      )}

      {/* Emoji Picker Floating Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-6 z-50 shadow-[var(--shadow-lg)] rounded-3xl overflow-hidden border border-border">
          <EmojiPicker
            theme={Theme.AUTO}
            onEmojiClick={handleEmojiSelect}
            lazyLoadEmojis={true}
            searchDisabled={false}
          />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={clsx(
          "flex flex-col rounded-2xl bg-surface-2 transition-shadow w-full relative overflow-visible",
          editingMessage || replyingToMessage
            ? "ring-2 ring-accent/50"
            : "focus-within:ring-2 focus-within:ring-accent/40"
        )}
      >
        {/* Reply Active Banner */}
        {replyingToMessage && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex flex-col min-w-0 pr-4 border-l-[3px] border-accent pl-3">
              <span className="text-xs font-semibold text-accent">
                Replying to {replyingToMessage.sender?.displayName || "User"}
              </span>
              <span className="text-xs text-muted truncate mt-0.5">
                {replyingToMessage.content || "Media attachment"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => clearActions()}
              className="p-1.5 rounded-full text-muted hover:text-fg hover:bg-surface-3 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit Active Banner */}
        {editingMessage && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex flex-col min-w-0 border-l-[3px] border-accent pl-3">
              <span className="text-xs font-semibold text-accent">
                Editing Message
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearActions();
                setContent("");
              }}
              className="p-1.5 rounded-full text-muted hover:text-fg hover:bg-surface-3 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Selected File Preview Box */}
        {selectedFile && !editingMessage && (
          <div className="relative self-start ml-4 mt-3 mb-1 rounded-2xl overflow-hidden bg-surface border border-border inline-flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover" />
            ) : (
              <div className="p-4 flex flex-col items-center justify-center w-24 h-24 text-muted">
                <FileIcon className="w-7 h-7 mb-2 text-accent" />
                <span className="text-[11px] max-w-[80px] truncate text-center">
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

        <div className="flex items-end gap-1 py-1.5 px-2">
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
                className="p-2.5 text-accent hover:bg-surface-3 transition-colors rounded-xl disabled:opacity-50"
                title="Attach file"
              >
                <Paperclip className="w-6 h-6" strokeWidth={1.8} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 text-muted hover:text-accent transition-colors rounded-xl hover:bg-surface-3"
            title="Emoji"
          >
            <Smile className="w-6 h-6" strokeWidth={1.8} />
          </button>

          {mentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-64 py-1 rounded-2xl bg-surface border border-border shadow-[var(--shadow-lg)] z-40 overflow-hidden">
              {mentionCandidates.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  // onMouseDown, not onClick: onClick fires after the textarea
                  // blurs and the popover has already closed.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyMention(p);
                  }}
                  onMouseEnter={() => setMentionIndex(i)}
                  className={clsx(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                    i === mentionIndex
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:bg-surface-2",
                  )}
                >
                  <Avatar
                    src={p.user?.avatarUrl}
                    name={p.user?.displayName || p.user?.username}
                    size="sm"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-fg truncate">
                      {p.user?.displayName}
                    </span>
                    <span className="block text-[10px] text-muted truncate">
                      @{p.user?.username}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

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
                : "Your message"
            }
            className="flex-1 bg-transparent border-0 text-fg placeholder:text-muted resize-none max-h-32 min-h-[44px] focus:outline-none py-2.5 px-2 text-[16px] leading-relaxed"
            rows={1}
            disabled={isUploading || editMessageMutation.isPending}
            autoFocus={!!editingMessage || !!replyingToMessage}
          />

          {isRecording ? (
            <span className="self-center flex items-center gap-2 px-2 text-sm font-medium text-danger tabular-nums">
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
              {formatDuration(recordingSeconds)}
            </span>
          ) : null}

          {!editingMessage && (
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isUploading || (!!selectedFile && !isRecording)}
              className={clsx(
                "p-2.5 rounded-xl transition-colors disabled:opacity-40",
                isRecording ? "text-danger hover:bg-surface-3" : "text-accent hover:bg-surface-3"
              )}
              title={isRecording ? "Stop recording" : "Record voice message"}
            >
              {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" strokeWidth={1.8} />}
            </button>
          )}

          <button
            type="submit"
            disabled={
              isRecording ||
              (editingMessage ? !content.trim() : !content.trim() && !selectedFile) ||
              sendMessageMutation.isPending ||
              editMessageMutation.isPending ||
              isUploading
            }
            className="p-2.5 rounded-xl text-accent hover:bg-surface-3 transition-colors disabled:text-faint disabled:hover:bg-transparent"
            title="Send"
          >
            {sendMessageMutation.isPending ||
            editMessageMutation.isPending ||
            isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : editingMessage ? (
              <Check className="w-6 h-6" />
            ) : (
              <Send className="w-6 h-6" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
