"use client";

import { useCallback } from "react";
import { useSocketEvent } from "./useSocket";
import { useCallStore, IncomingCallPayload } from "./useCall";

/**
 * Hook that wires WebSocket call events to the Zustand call store.
 * Mount this once at the app layout level alongside useSocket().
 */
export function useCallEvents() {
  const { handleIncomingCall, handleCallEnded, handleCallRejected } = useCallStore();

  const onIncomingCall = useCallback(
    (payload: IncomingCallPayload) => {
      handleIncomingCall(payload);
    },
    [handleIncomingCall]
  );

  const onCallEnded = useCallback(
    (payload: { callId: string }) => {
      handleCallEnded(payload.callId);
    },
    [handleCallEnded]
  );

  const onCallRejected = useCallback(
    (payload: { callId: string; userId: string }) => {
      handleCallRejected(payload.callId, payload.userId);
    },
    [handleCallRejected]
  );

  useSocketEvent("call:incoming", onIncomingCall);
  useSocketEvent("call:ended", onCallEnded);
  useSocketEvent("call:rejected", onCallRejected);
}
