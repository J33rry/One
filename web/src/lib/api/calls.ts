import { apiClient } from './client';
import { User } from './users';

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  joinedAt: string | null;
  leftAt: string | null;
  user?: User;
  username?: string;
  displayName?: string;
}

export interface Call {
  id: string;
  chatId: string;
  initiatorId: string;
  roomName: string;
  type: 'audio' | 'video';
  startedAt: string;
  endedAt: string | null;
  initiator?: User;
  chatName?: string;
  chatType?: string;
  participants?: CallParticipant[];
}

export interface CallWithToken {
  call: Call;
  token: string;
  livekitUrl: string;
}

export interface JoinCallResponse {
  participant: CallParticipant;
  token: string;
  livekitUrl: string;
}

export interface TokenResponse {
  token: string;
  livekitUrl: string;
}

export const callsApi = {
  initiateCall: (chatId: string, type: 'audio' | 'video') =>
    apiClient<CallWithToken>(`/chats/${chatId}/calls`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

  getCallHistory: (chatId: string) =>
    apiClient<{ calls: Call[] }>(`/chats/${chatId}/calls`),

  joinCall: (callId: string) =>
    apiClient<JoinCallResponse>(`/calls/${callId}/join`, {
      method: 'POST',
    }),

  leaveCall: (callId: string) =>
    apiClient<void>(`/calls/${callId}/leave`, {
      method: 'POST',
    }),

  endCall: (callId: string) =>
    apiClient<void>(`/calls/${callId}/end`, {
      method: 'POST',
    }),

  getParticipants: (callId: string) =>
    apiClient<{ participants: CallParticipant[] }>(`/calls/${callId}/participants`),

  getToken: (callId: string) =>
    apiClient<TokenResponse>(`/calls/${callId}/token`, {
      method: 'POST',
    }),

  getChatCallHistory: (chatId: string) => apiClient<{
    calls: Call[];
  }>(`/chats/${chatId}/calls`),

  getUserCallHistory: () => apiClient<{
    calls: Call[];
  }>(`/calls`),
};
