import { useState, useCallback, useRef } from 'react';
import { BankTransaction } from '../types';

interface StreamingState {
  transactions: BankTransaction[];
  isStreaming: boolean;
  aiRemaining: number;
  error: string | null;
}

export function useStreamingUpload() {
  const [state, setState] = useState<StreamingState>({
    transactions: [],
    isStreaming: false,
    aiRemaining: 0,
    error: null
  });

  // Track the current in-flight request so we can cancel it on re-upload or reset
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ transactions: [], isStreaming: false, aiRemaining: 0, error: null });
  }, []);

  const startUpload = useCallback(async (file: File): Promise<void> => {
    // Cancel any previous in-flight upload
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ transactions: [], isStreaming: true, aiRemaining: 0, error: null });

    const formData = new FormData();
    formData.append('file', file);

    const baseURL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

    let response: Response;
    try {
      response = await fetch(`${baseURL}/bank/upload/stream`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // intentionally cancelled
      setState(prev => ({ ...prev, isStreaming: false, error: 'Network error — could not reach server' }));
      return;
    }

    if (!response.ok || !response.body) {
      let msg = `Upload failed (${response.status})`;
      try {
        const body = await response.json();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }
      setState(prev => ({ ...prev, isStreaming: false, error: msg }));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // These MUST live outside the read() loop — an SSE event can span multiple chunks
    let buffer = '';
    let eventName = '';
    let dataStr = '';

    const handleEvent = (name: string, data: any) => {
      if (name === 'transactions') {
        setState(prev => ({
          ...prev,
          transactions: data.transactions as BankTransaction[],
          aiRemaining: (data.transactions as BankTransaction[]).filter((t: any) => t.aiPending).length
        }));
      } else if (name === 'status') {
        setState(prev => ({ ...prev, aiRemaining: data.remaining ?? prev.aiRemaining }));
      } else if (name === 'categories') {
        const updates = new Map<string, any>(
          (data.updates as any[]).map((u: any) => [u.id, u])
        );
        setState(prev => ({
          ...prev,
          aiRemaining: 0,
          transactions: prev.transactions.map(t => {
            const u = updates.get(t.id);
            if (!u) return t;
            return {
              ...t,
              autoCategory: u.category ?? t.autoCategory,
              userCategory: u.category ?? t.userCategory,
              isRecurring: u.isRecurring ?? t.isRecurring,
              recurringFrequency: u.recurringFrequency ?? t.recurringFrequency,
              confidenceScore: u.confidence ?? 0.7,
              aiPending: false
            };
          })
        }));
      } else if (name === 'done') {
        setState(prev => ({ ...prev, isStreaming: false, aiRemaining: 0 }));
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process all complete lines from the buffer; leave any partial line for next chunk
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          if (line.startsWith('event: ')) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          } else if (line === '' && eventName && dataStr) {
            // Blank line = end of SSE event
            try {
              handleEvent(eventName, JSON.parse(dataStr));
            } catch { /* malformed JSON — skip */ }
            eventName = '';
            dataStr = '';
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: 'Stream interrupted — check that the server is running'
        }));
      }
    } finally {
      setState(prev => ({ ...prev, isStreaming: false }));
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<BankTransaction>) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  }, []);

  return {
    transactions: state.transactions,
    isStreaming: state.isStreaming,
    aiRemaining: state.aiRemaining,
    error: state.error,
    startUpload,
    updateTransaction,
    reset
  };
}
