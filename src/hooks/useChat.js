import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  capChatMessages,
  canSendChatMessage,
  CHAT_MESSAGE_CAP,
  CHAT_SEND_MIN_INTERVAL_MS,
} from '../lib/chatLimits';

export function useChat(webinarId, userName) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);
  const lastSendAtMsRef = useRef(null);

  // Fetch existing messages
  useEffect(() => {
    if (!webinarId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('webinar_id', webinarId)
        .order('sent_at', { ascending: true })
        .limit(100);

      setMessages(capChatMessages(data || [], CHAT_MESSAGE_CAP));
      setLoading(false);
    };

    fetchMessages();
  }, [webinarId]);

  // Subscribe to realtime
  useEffect(() => {
    if (!webinarId) return;

    const channel = supabase
      .channel(`chat:${webinarId}`)
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
      .subscribe();

    channelRef.current = channel;

    return () => {
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
        message: message.trim(),
      });

      if (error) throw error;

      lastSendAtMsRef.current = now;
      return { ok: true };
    },
    [webinarId, userName]
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
      const { data } = await supabase
        .from('simulated_messages')
        .select('*')
        .eq('webinar_id', webinarId)
        .order('timestamp_seconds', { ascending: true });

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
