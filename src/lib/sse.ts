// src/lib/sse.ts
import { useEffect } from "react";
import { API_BASE } from "./api";

export function useSessionSSE(sessionId: string, onEvent: (e: any) => void) {
  useEffect(() => {
    if (!sessionId) return;
    const es = new EventSource(`${API_BASE}/events/sessions/${sessionId}`, { withCredentials: true });
    es.onmessage = (msg) => {
      try { onEvent(JSON.parse(msg.data)); } catch { /* ignore */ }
    };
    es.onerror = () => { /* browser will auto-reconnect */ };
    return () => es.close();
  }, [sessionId, onEvent]);
}

export function useRequestSSE(requestId: string, onEvent: (e: any) => void) {
  useEffect(() => {
    if (!requestId) return;
    const es = new EventSource(`${API_BASE}/events/requests/${requestId}`, { withCredentials: true });
    es.onmessage = (msg) => { try { onEvent(JSON.parse(msg.data)); } catch {} };
    es.onerror = () => {};
    return () => es.close();
  }, [requestId, onEvent]);
}
