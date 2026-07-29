"use client";

import { create } from 'zustand';
import { callsApi, Call } from '@/lib/api/calls';
import { socketClient } from '@/lib/ws/socket';

export type CallState = 'idle' | 'ringing-outgoing' | 'ringing-incoming' | 'connecting' | 'connected' | 'ended';

export interface IncomingCallPayload {
  callId: string;
  chatId: string;
  type: 'audio' | 'video';
  roomName: string;
  initiator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

interface CallStore {
  // State
  callState: CallState;
  activeCall: Call | null;
  livekitToken: string | null;
  livekitUrl: string | null;
  incomingCall: IncomingCallPayload | null;
  error: string | null;

  // Actions
  startCall: (chatId: string, type: 'audio' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => Promise<void>;
  leaveCall: () => Promise<void>;
  setConnected: () => void;
  handleIncomingCall: (payload: IncomingCallPayload) => void;
  handleCallEnded: (callId: string) => void;
  handleCallRejected: (callId: string, userId: string) => void;
  reset: () => void;
}

const initialState = {
  callState: 'idle' as CallState,
  activeCall: null as Call | null,
  livekitToken: null as string | null,
  livekitUrl: null as string | null,
  incomingCall: null as IncomingCallPayload | null,
  error: null as string | null,
};

export const useCallStore = create<CallStore>((set, get) => ({
  ...initialState,

  startCall: async (chatId, type) => {
    try {
      set({ callState: 'ringing-outgoing', error: null });
      const { call, token, livekitUrl } = await callsApi.initiateCall(chatId, type);
      set({
        callState: 'connecting',
        activeCall: call,
        livekitToken: token,
        livekitUrl: livekitUrl.replace(/^http/, 'ws'),
      });
    } catch (err) {
      set({ callState: 'idle', error: err instanceof Error ? err.message : 'Failed to start call' });
    }
  },

  acceptCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    try {
      set({ callState: 'connecting', error: null });
      const { token, livekitUrl } = await callsApi.joinCall(incomingCall.callId);
      set({
        activeCall: {
          id: incomingCall.callId,
          chatId: incomingCall.chatId,
          type: incomingCall.type,
          roomName: incomingCall.roomName,
          initiatorId: incomingCall.initiator.id,
          startedAt: new Date().toISOString(),
          endedAt: null,
        },
        livekitToken: token,
        livekitUrl: livekitUrl.replace(/^http/, 'ws'),
        callState: 'connecting',
        incomingCall: null,
      });
    } catch (err) {
      set({ callState: 'idle', incomingCall: null, error: err instanceof Error ? err.message : 'Failed to join call' });
    }
  },

  rejectCall: () => {
    const { incomingCall } = get();
    if (incomingCall) {
      socketClient.send('call:rejected', { callId: incomingCall.callId });
    }
    set({ incomingCall: null, callState: 'idle' });
  },

  endCall: async () => {
    const { activeCall } = get();
    if (activeCall) {
      try {
        await callsApi.endCall(activeCall.id);
      } catch {
        // Best-effort — the room will be cleaned up server-side
      }
    }
    set({ ...initialState });
  },

  leaveCall: async () => {
    const { activeCall } = get();
    if (activeCall) {
      try {
        await callsApi.leaveCall(activeCall.id);
      } catch {
        // Best-effort
      }
    }
    set({ ...initialState });
  },

  setConnected: () => {
    set({ callState: 'connected' });
  },

  handleIncomingCall: (payload) => {
    const { callState } = get();
    // Don't show incoming call if already in a call
    if (callState !== 'idle') return;
    set({ incomingCall: payload, callState: 'ringing-incoming' });
  },

  handleCallEnded: (callId) => {
    const { activeCall, incomingCall } = get();
    if (activeCall?.id === callId || incomingCall?.callId === callId) {
      set({ ...initialState });
    }
  },

  handleCallRejected: (callId) => {
    const { activeCall, endCall } = get();
    // In a 1:1 context, if our active call is rejected, we end it entirely.
    if (activeCall?.id === callId) {
      endCall();
    }
  },

  reset: () => set({ ...initialState }),
}));
