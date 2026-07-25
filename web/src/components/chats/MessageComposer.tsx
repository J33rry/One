"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "@/lib/api/messages";
import { mediaApi } from "@/lib/api/media";
import { Paperclip, Send, Loader2, X, File as FileIcon, Check } from "lucide-react";
import { useTyping } from "@/hooks/useTyping";
import { useMessageActions } from "@/hooks/useMessageActions";
import clsx from "clsx";

interface MessageComposerProps {
  chatId: string;
}

export function MessageComposer({ chatId }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const queryClient = useQueryClient();
  const { sendTypingStart } = useTyping(chatId);
  const { editingMessage, replyingToMessage, clearActions } = useMessageActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || "");
      setSelectedFile(null); // Editing doesn't support file change right now
    } else {
      setContent("");
    }
  }, [editingMessage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (editingMessage || replyingToMessage) {
          clearActions();
          setContent("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingMessage, replyingToMessage, clearActions]);

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

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, mediaId, type }: { text: string; mediaId?: string; type: 'text' | 'image' | 'video' | 'audio' | 'file' }) => {
      return messagesApi.sendMessage(chatId, { 
        type, 
        content: text || undefined, 
        mediaId,
        replyToMessageId: replyingToMessage?.id
      });
    },
    onSuccess: () => {
      setContent("");
      setSelectedFile(null);
      setIsUploading(false);
      setUploadProgress(0);
      clearActions();
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (err) => {
      console.error("Send failed", err);
      alert("Failed to send message");
      setIsUploading(false);
      setUploadProgress(0);
    }
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      if (!editingMessage) throw new Error("No message to edit");
      return messagesApi.editMessage(chatId, editingMessage.id, text);
    },
    onSuccess: () => {
      setContent("");
      clearActions();
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (err) => {
      console.error("Edit failed", err);
      alert("Failed to edit message");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendMessageMutation.isPending || editMessageMutation.isPending || isUploading) return;
    
    if (editingMessage) {
      if (!content.trim()) return; // Can't edit to empty text right now
      editMessageMutation.mutate({ text: content.trim() });
      return;
    }

    if (!content.trim() && !selectedFile) return;
    
    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const media = await mediaApi.upload(selectedFile, setUploadProgress);
        
        let type: 'image' | 'video' | 'audio' | 'file' = 'file';
        if (selectedFile.type.startsWith('image/')) type = 'image';
        else if (selectedFile.type.startsWith('video/')) type = 'video';
        else if (selectedFile.type.startsWith('audio/')) type = 'audio';

        sendMessageMutation.mutate({ text: content.trim(), mediaId: media.id, type });
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload file");
        setIsUploading(false);
      }
    } else {
      sendMessageMutation.mutate({ text: content.trim(), type: 'text' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    sendTypingStart();
  };

  return (
    <div className="p-4 border-t border-zinc-800 bg-zinc-950 shrink-0 flex flex-col" ref={containerRef}>
      <form onSubmit={handleSubmit} className={clsx(
        "flex flex-col bg-zinc-900 border transition-colors relative",
        editingMessage ? "border-emerald-500/50 rounded-xl" : 
        replyingToMessage ? "border-blue-500/50 rounded-xl" : 
        "border-zinc-800 rounded-2xl focus-within:border-emerald-500/50"
      )}>
        
        {/* Reply/Edit Banner */}
        {replyingToMessage && (
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 rounded-t-xl">
            <div className="flex flex-col min-w-0 pr-4">
              <span className="text-xs font-semibold text-blue-400 mb-0.5">Replying to {replyingToMessage.sender?.displayName || "User"}</span>
              <span className="text-sm text-zinc-400 truncate">{replyingToMessage.content || "Media message"}</span>
            </div>
            <button type="button" onClick={() => clearActions()} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {editingMessage && (
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 rounded-t-xl">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-emerald-500">Editing Message</span>
            </div>
            <button type="button" onClick={() => { clearActions(); setContent(""); }} className="p-1.5 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Preview Area */}
        {selectedFile && !editingMessage && (
          <div className="relative self-start ml-4 mt-4 mb-2 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 inline-flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover" />
            ) : (
              <div className="p-4 flex flex-col items-center justify-center w-24 h-24 text-zinc-400">
                <FileIcon className="w-8 h-8 mb-1" />
                <span className="text-[10px] max-w-[80px] truncate text-center">{selectedFile.name}</span>
              </div>
            )}
            
            {!isUploading && (
              <button 
                type="button" 
                onClick={clearFile}
                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 rounded-full text-white transition-colors"
                title="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span className="text-[10px] font-bold">{uploadProgress}%</span>
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
                className="p-2 text-zinc-400 hover:text-emerald-400 transition-colors rounded-full disabled:opacity-50" 
                title="Attach media"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </>
          )}
          
          <textarea
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? "Edit message..." : selectedFile ? "Add a caption..." : "Message..."}
            className="flex-1 bg-transparent border-0 text-white placeholder-zinc-500 resize-none max-h-32 min-h-[40px] focus:ring-0 py-2.5 px-2 text-sm leading-tight"
            rows={1}
            disabled={isUploading || editMessageMutation.isPending}
            autoFocus={!!editingMessage || !!replyingToMessage}
          />
          
          <button 
            type="submit" 
            disabled={(editingMessage ? !content.trim() : (!content.trim() && !selectedFile)) || sendMessageMutation.isPending || editMessageMutation.isPending || isUploading}
            className={clsx(
              "p-2 text-white rounded-full transition-colors shrink-0 mb-0.5 disabled:opacity-50",
              editingMessage ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {(sendMessageMutation.isPending || editMessageMutation.isPending || isUploading) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editingMessage ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
