import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Ban, ShieldOff, RefreshCw } from 'lucide-react';
import './ChatModerationPanel.css';

export default function ChatModerationPanel({ webinarId }) {
  const [messages, setMessages] = useState([]);
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const [messagesRes, bansRes] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('id, user_name, user_email, message, sent_at, is_ai')
        .eq('webinar_id', webinarId)
        .order('sent_at', { ascending: false })
        .limit(200),
      supabase
        .from('chat_banned_participants')
        .select('id, email, banned_at')
        .eq('webinar_id', webinarId)
        .order('banned_at', { ascending: false }),
    ]);

    if (messagesRes.error || bansRes.error) {
      setError('Não foi possível carregar o chat.');
    } else {
      setMessages(messagesRes.data || []);
      setBans(bansRes.data || []);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    if (webinarId) load();
  }, [webinarId, load]);

  const deleteMessage = async (id) => {
    const { error: deleteError } = await supabase.from('chat_messages').delete().eq('id', id);
    if (deleteError) {
      setError('Não foi possível excluir a mensagem.');
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const banParticipant = async (email) => {
    if (!email) return;
    const normalized = email.toLowerCase();
    const { data, error: banError } = await supabase
      .from('chat_banned_participants')
      .insert({ webinar_id: webinarId, email: normalized })
      .select('id, email, banned_at')
      .single();
    if (banError) {
      setError('Não foi possível banir este participante.');
      return;
    }
    setBans((prev) => [data, ...prev]);
  };

  const unbanParticipant = async (id) => {
    const { error: unbanError } = await supabase.from('chat_banned_participants').delete().eq('id', id);
    if (unbanError) {
      setError('Não foi possível remover o banimento.');
      return;
    }
    setBans((prev) => prev.filter((b) => b.id !== id));
  };

  const isBanned = (email) => email && bans.some((b) => b.email === email.toLowerCase());

  if (loading) {
    return <div className="chat-mod-loading">Carregando chat...</div>;
  }

  return (
    <div className="chat-mod-panel">
      <div className="chat-mod-header">
        <h3>Moderação do Chat ao Vivo</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {error && <p className="chat-mod-error">{error}</p>}

      <div className="chat-mod-layout">
        <div className="chat-mod-messages">
          {messages.length === 0 ? (
            <p className="chat-mod-empty">Nenhuma mensagem ainda.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="chat-mod-message">
                <div className="chat-mod-message-body">
                  <span className="chat-mod-message-author">
                    {msg.is_ai ? '🤖 ' : ''}{msg.user_name}
                  </span>
                  <span className="chat-mod-message-text">{msg.message}</span>
                </div>
                <div className="chat-mod-message-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title="Excluir mensagem"
                    onClick={() => deleteMessage(msg.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                  {msg.user_email && !msg.is_ai && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={isBanned(msg.user_email)}
                      title={isBanned(msg.user_email) ? 'Já banido' : 'Banir participante'}
                      onClick={() => banParticipant(msg.user_email)}
                    >
                      <Ban size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="chat-mod-bans">
          <h4>Participantes banidos</h4>
          {bans.length === 0 ? (
            <p className="chat-mod-empty">Nenhum participante banido.</p>
          ) : (
            bans.map((ban) => (
              <div key={ban.id} className="chat-mod-ban-row">
                <span>{ban.email}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  title="Remover banimento"
                  onClick={() => unbanParticipant(ban.id)}
                >
                  <ShieldOff size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
