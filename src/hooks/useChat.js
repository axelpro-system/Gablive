import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  capChatMessages,
  canSendChatMessage,
  CHAT_MESSAGE_CAP,
  CHAT_SEND_MIN_INTERVAL_MS,
} from '../lib/chatLimits';

export function useChat(webinarId, userName, userEmail) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);
  const lastSendAtMsRef = useRef(null);

  // Fetch history + subscribe to realtime, with reconnect-on-drop
  // (exponential backoff, capped). History is re-fetched on every
  // (re)connect so a dropped connection doesn't silently lose messages.
  useEffect(() => {
    if (!webinarId) return;

    let cancelled = false;
    let reconnectTimeoutId = null;
    let retryCount = 0;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('webinar_id', webinarId)
        .order('sent_at', { ascending: true })
        .limit(100);

      if (cancelled) return;
      setMessages(capChatMessages(data || [], CHAT_MESSAGE_CAP));
      setLoading(false);
    };

    const connect = () => {
      const channel = supabase
        .channel(`chat:${webinarId}:${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `webinar_id=eq.${webinarId}`,
          },
          (payload) => {
            setMessages((prev) =>
              capChatMessages([...prev, payload.new], CHAT_MESSAGE_CAP)
            );
          }
        )
        .subscribe((status) => {
          if (cancelled) return;

          if (status === 'SUBSCRIBED') {
            retryCount = 0;
            fetchMessages();
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            supabase.removeChannel(channel);
            const delayMs = Math.min(1000 * 2 ** retryCount, 15000);
            retryCount += 1;
            reconnectTimeoutId = setTimeout(() => {
              if (!cancelled) connect();
            }, delayMs);
          }
        });

      channelRef.current = channel;
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [webinarId]);

  const sendMessage = useCallback(
    async (message) => {
      if (!webinarId || !message.trim()) return { ok: false, reason: 'empty' };

      const now = Date.now();
      if (
        !canSendChatMessage(
          lastSendAtMsRef.current,
          now,
          CHAT_SEND_MIN_INTERVAL_MS
        )
      ) {
        return { ok: false, reason: 'throttled' };
      }

      const { error } = await supabase.from('chat_messages').insert({
        webinar_id: webinarId,
        user_name: userName || 'Anônimo',
        user_email: userEmail || null,
        message: message.trim(),
      });

      if (error) {
        if (error.code === '42501' || /row-level security/i.test(error.message || '')) {
          return { ok: false, reason: 'banned' };
        }
        throw error;
      }

      lastSendAtMsRef.current = now;
      return { ok: true };
    },
    [webinarId, userName, userEmail]
  );

  return {
    messages: capChatMessages(messages, CHAT_MESSAGE_CAP),
    loading,
    sendMessage,
  };
}

export function useSimulatedChat(webinarId, currentTimeSeconds) {
  const [allMessages, setAllMessages] = useState([]);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch simulated messages
  useEffect(() => {
    if (!webinarId) return;

    const fetchMessages = async () => {
      const { data } = await supabase.rpc('get_public_simulated_messages', {
        p_webinar_id: webinarId,
      });

      setAllMessages(data || []);
      setLoading(false);
    };

    fetchMessages();
  }, [webinarId]);

  // Show messages based on video time (also cap visual window)
  useEffect(() => {
    const visible = allMessages.filter(
      (msg) => msg.timestamp_seconds <= currentTimeSeconds
    );
    setVisibleMessages(capChatMessages(visible, CHAT_MESSAGE_CAP));
  }, [allMessages, currentTimeSeconds]);

  return { messages: visibleMessages, loading };
}
