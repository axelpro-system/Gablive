import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, ExternalLink, BarChart3, Plus, Trash2, Save, ShoppingCart, Users2 } from 'lucide-react';
import { AUDIENCE_MODE } from '../../lib/constants';
import './InteractionsEditor.css';

export default function InteractionsEditor({ webinarId }) {
  const [activeSubTab, setActiveSubTab] = useState('chat');
  const [loading, setLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState({ author_name: '', message: '', timestamp_seconds: 0 });

  // CTA (Oferta) state
  const [ctas, setCtas] = useState([]);
  const [newCta, setNewCta] = useState({
    title: '', description: '', button_text: 'Comprar Agora', button_url: '', show_at_seconds: 0,
    original_price: '', sale_price: '', pitch_start_seconds: '', banner_desktop_url: '', banner_mobile_url: '',
  });

  // Poll state
  const [polls, setPolls] = useState([]);
  const [newPoll, setNewPoll] = useState({ question: '', options: ['Sim', 'Não'], show_at_seconds: 0, active: true });

  // Sales notifications (prova social) state
  const [sales, setSales] = useState([]);
  const [newSale, setNewSale] = useState({ buyer_name: '', buyer_location: '', product_name: '', show_at_seconds: 0 });

  // Audience config state
  const [audience, setAudience] = useState(null);
  const [savingAudience, setSavingAudience] = useState(false);

  useEffect(() => {
    fetchData();
  }, [webinarId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch simulated messages
    const { data: chatData } = await supabase
      .from('simulated_messages')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('timestamp_seconds', { ascending: true });
    if (chatData) setMessages(chatData);
    
    // Fetch CTAs
    const { data: ctaData } = await supabase
      .from('cta_configs')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('show_at_seconds', { ascending: true });
    if (ctaData) setCtas(ctaData);
    
    // Fetch Polls
    const { data: pollData } = await supabase
      .from('polls')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('show_at_seconds', { ascending: true });
    if (pollData) setPolls(pollData);

    // Fetch sales notifications
    const { data: salesData } = await supabase
      .from('sales_notifications')
      .select('*')
      .eq('webinar_id', webinarId)
      .order('show_at_seconds', { ascending: true });
    if (salesData) setSales(salesData);

    // Fetch audience config
    const { data: audienceData } = await supabase
      .from('audience_configs')
      .select('*')
      .eq('webinar_id', webinarId)
      .maybeSingle();
    if (audienceData) {
      setAudience(audienceData);
    } else {
      const { data: created } = await supabase
        .from('audience_configs')
        .insert({ webinar_id: webinarId })
        .select()
        .single();
      setAudience(created);
    }

    setLoading(false);
  };

  const addMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.author_name || !newMsg.message) return;
    
    const { data } = await supabase.from('simulated_messages').insert({
      webinar_id: webinarId,
      ...newMsg
    }).select().single();
    
    if (data) {
      setMessages([...messages, data].sort((a,b) => a.timestamp_seconds - b.timestamp_seconds));
      setNewMsg({ author_name: '', message: '', timestamp_seconds: newMsg.timestamp_seconds + 30 });
    }
  };

  const deleteMessage = async (id) => {
    await supabase.from('simulated_messages').delete().eq('id', id);
    setMessages(messages.filter(m => m.id !== id));
  };

  const addCta = async (e) => {
    e.preventDefault();
    if (!newCta.title || !newCta.button_url) return;

    const { data } = await supabase.from('cta_configs').insert({
      webinar_id: webinarId,
      ...newCta,
      original_price: newCta.original_price ? parseFloat(newCta.original_price) : null,
      sale_price: newCta.sale_price ? parseFloat(newCta.sale_price) : null,
      pitch_start_seconds: newCta.pitch_start_seconds ? parseInt(newCta.pitch_start_seconds, 10) : null,
    }).select().single();

    if (data) {
      setCtas([...ctas, data].sort((a,b) => a.show_at_seconds - b.show_at_seconds));
      setNewCta({
        title: '', description: '', button_text: 'Comprar Agora', button_url: '', show_at_seconds: 0,
        original_price: '', sale_price: '', pitch_start_seconds: '', banner_desktop_url: '', banner_mobile_url: '',
      });
    }
  };

  const deleteCta = async (id) => {
    await supabase.from('cta_configs').delete().eq('id', id);
    setCtas(ctas.filter(c => c.id !== id));
  };

  const addSale = async (e) => {
    e.preventDefault();
    if (!newSale.buyer_name || !newSale.product_name) return;

    const { data } = await supabase.from('sales_notifications').insert({
      webinar_id: webinarId,
      ...newSale,
    }).select().single();

    if (data) {
      setSales([...sales, data].sort((a, b) => a.show_at_seconds - b.show_at_seconds));
      setNewSale({ buyer_name: '', buyer_location: '', product_name: '', show_at_seconds: newSale.show_at_seconds + 60 });
    }
  };

  const deleteSale = async (id) => {
    await supabase.from('sales_notifications').delete().eq('id', id);
    setSales(sales.filter((s) => s.id !== id));
  };

  const saveAudience = async (e) => {
    e.preventDefault();
    setSavingAudience(true);
    await supabase
      .from('audience_configs')
      .update({
        mode: audience.mode,
        fixed_count: audience.fixed_count,
        dynamic_min: audience.dynamic_min,
        dynamic_max: audience.dynamic_max,
      })
      .eq('id', audience.id);
    setSavingAudience(false);
  };

  const addPoll = async (e) => {
    e.preventDefault();
    if (!newPoll.question || newPoll.options.length < 2) return;
    
    const { data } = await supabase.from('polls').insert({
      webinar_id: webinarId,
      ...newPoll
    }).select().single();
    
    if (data) {
      setPolls([...polls, data].sort((a,b) => a.show_at_seconds - b.show_at_seconds));
      setNewPoll({ question: '', options: ['Sim', 'Não'], show_at_seconds: 0, active: true });
    }
  };

  const deletePoll = async (id) => {
    await supabase.from('polls').delete().eq('id', id);
    setPolls(polls.filter(p => p.id !== id));
  };

  const formatSeconds = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="spinner spinner-sm" />;

  return (
    <div className="interactions-editor">
      <div className="interactions-tabs">
        <button className={`btn btn-sm ${activeSubTab === 'chat' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveSubTab('chat')}>
          <MessageSquare size={16} /> Chat Simulado
        </button>
        <button className={`btn btn-sm ${activeSubTab === 'cta' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveSubTab('cta')}>
          <ExternalLink size={16} /> Ofertas (CTAs)
        </button>
        <button className={`btn btn-sm ${activeSubTab === 'polls' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveSubTab('polls')}>
          <BarChart3 size={16} /> Enquetes
        </button>
        <button className={`btn btn-sm ${activeSubTab === 'sales' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveSubTab('sales')}>
          <ShoppingCart size={16} /> Vendas
        </button>
        <button className={`btn btn-sm ${activeSubTab === 'audience' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveSubTab('audience')}>
          <Users2 size={16} /> Audiência
        </button>
      </div>

      <div className="interactions-content">
        {activeSubTab === 'chat' && (
          <div className="interaction-section card">
            <div className="card-header">
              <h4>Timeline do Chat Simulado</h4>
            </div>
            <div className="card-body">
              <form onSubmit={addMessage} className="add-form">
                <div className="form-row" style={{ gridTemplateColumns: '80px 1fr 2fr auto' }}>
                  <input type="number" className="input" placeholder="Segs." value={newMsg.timestamp_seconds} onChange={e => setNewMsg({...newMsg, timestamp_seconds: parseInt(e.target.value) || 0})} min="0" required />
                  <input type="text" className="input" placeholder="Nome do autor" value={newMsg.author_name} onChange={e => setNewMsg({...newMsg, author_name: e.target.value})} required />
                  <input type="text" className="input" placeholder="Mensagem..." value={newMsg.message} onChange={e => setNewMsg({...newMsg, message: e.target.value})} required />
                  <button type="submit" className="btn btn-primary"><Plus size={16} /> Adicionar</button>
                </div>
              </form>

              <div className="timeline-list mt-4">
                {messages.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma mensagem simulada.</p> : (
                  messages.map(msg => (
                    <div key={msg.id} className="timeline-item">
                      <span className="timeline-time">{formatSeconds(msg.timestamp_seconds)}</span>
                      <div className="timeline-content">
                        <strong>{msg.author_name}</strong>: {msg.message}
                      </div>
                      <button className="btn btn-ghost btn-xs btn-icon danger" onClick={() => deleteMessage(msg.id)}><Trash2 size={14} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'cta' && (
          <div className="interaction-section card">
            <div className="card-header">
              <h4>Ofertas e Banners (CTAs)</h4>
            </div>
            <div className="card-body">
              <form onSubmit={addCta} className="add-form flex-col">
                <div className="form-row">
                  <input type="number" className="input" placeholder="Mostrar em (segs)" value={newCta.show_at_seconds} onChange={e => setNewCta({...newCta, show_at_seconds: parseInt(e.target.value) || 0})} required />
                  <input type="text" className="input" placeholder="Título (Ex: Curso Completo)" value={newCta.title} onChange={e => setNewCta({...newCta, title: e.target.value})} required />
                </div>
                <div className="form-row">
                  <input type="text" className="input" placeholder="Texto do Botão" value={newCta.button_text} onChange={e => setNewCta({...newCta, button_text: e.target.value})} required />
                  <input type="url" className="input" placeholder="URL do Botão (Checkout)" value={newCta.button_url} onChange={e => setNewCta({...newCta, button_url: e.target.value})} required />
                </div>
                <div className="form-row">
                  <input type="number" step="0.01" className="input" placeholder="Preço original (R$)" value={newCta.original_price} onChange={e => setNewCta({...newCta, original_price: e.target.value})} />
                  <input type="number" step="0.01" className="input" placeholder="Preço da oferta (R$)" value={newCta.sale_price} onChange={e => setNewCta({...newCta, sale_price: e.target.value})} />
                  <input type="number" className="input" placeholder="Início do pitch (segs)" value={newCta.pitch_start_seconds} onChange={e => setNewCta({...newCta, pitch_start_seconds: e.target.value})} />
                </div>
                <div className="form-row">
                  <input type="url" className="input" placeholder="Banner desktop (URL)" value={newCta.banner_desktop_url} onChange={e => setNewCta({...newCta, banner_desktop_url: e.target.value})} />
                  <input type="url" className="input" placeholder="Banner mobile (URL)" value={newCta.banner_mobile_url} onChange={e => setNewCta({...newCta, banner_mobile_url: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-primary"><Plus size={16} /> Adicionar Oferta</button>
              </form>

              <div className="timeline-list mt-4">
                {ctas.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma oferta configurada.</p> : (
                  ctas.map(cta => (
                    <div key={cta.id} className="timeline-item">
                      <span className="timeline-time">{formatSeconds(cta.show_at_seconds)}</span>
                      <div className="timeline-content flex-col">
                        <strong>{cta.title}</strong>
                        {cta.sale_price != null && (
                          <span className="text-xs text-gray-500">
                            {cta.original_price != null && <s>R$ {Number(cta.original_price).toFixed(2)}</s>} R$ {Number(cta.sale_price).toFixed(2)}
                          </span>
                        )}
                        <a href={cta.button_url} target="_blank" rel="noreferrer" className="text-xs text-primary-600">{cta.button_text}</a>
                      </div>
                      <button className="btn btn-ghost btn-xs btn-icon danger" onClick={() => deleteCta(cta.id)}><Trash2 size={14} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'polls' && (
          <div className="interaction-section card">
            <div className="card-header">
              <h4>Enquetes</h4>
            </div>
            <div className="card-body">
              <form onSubmit={addPoll} className="add-form flex-col">
                <div className="form-row">
                  <input type="number" className="input" placeholder="Mostrar em (segs)" value={newPoll.show_at_seconds} onChange={e => setNewPoll({...newPoll, show_at_seconds: parseInt(e.target.value) || 0})} required />
                  <input type="text" className="input" placeholder="Pergunta da Enquete" value={newPoll.question} onChange={e => setNewPoll({...newPoll, question: e.target.value})} required />
                </div>
                <div className="form-row">
                  <input type="text" className="input" placeholder="Opções separadas por vírgula" value={newPoll.options.join(',')} onChange={e => setNewPoll({...newPoll, options: e.target.value.split(',').map(o=>o.trim()).filter(Boolean)})} required />
                </div>
                <button type="submit" className="btn btn-primary"><Plus size={16} /> Adicionar Enquete</button>
              </form>

              <div className="timeline-list mt-4">
                {polls.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma enquete configurada.</p> : (
                  polls.map(poll => (
                    <div key={poll.id} className="timeline-item">
                      <span className="timeline-time">{formatSeconds(poll.show_at_seconds)}</span>
                      <div className="timeline-content flex-col">
                        <strong>{poll.question}</strong>
                        <span className="text-xs text-gray-500">{poll.options.join(' | ')}</span>
                      </div>
                      <button className="btn btn-ghost btn-xs btn-icon danger" onClick={() => deletePoll(poll.id)}><Trash2 size={14} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'sales' && (
          <div className="interaction-section card">
            <div className="card-header">
              <h4>Prova Social — Notificações de Venda</h4>
            </div>
            <div className="card-body">
              <form onSubmit={addSale} className="add-form flex-col">
                <div className="form-row">
                  <input type="number" className="input" placeholder="Mostrar em (segs)" value={newSale.show_at_seconds} onChange={e => setNewSale({...newSale, show_at_seconds: parseInt(e.target.value) || 0})} required />
                  <input type="text" className="input" placeholder="Nome do comprador" value={newSale.buyer_name} onChange={e => setNewSale({...newSale, buyer_name: e.target.value})} required />
                  <input type="text" className="input" placeholder="Cidade/UF (opcional)" value={newSale.buyer_location} onChange={e => setNewSale({...newSale, buyer_location: e.target.value})} />
                </div>
                <div className="form-row">
                  <input type="text" className="input" placeholder="Produto" value={newSale.product_name} onChange={e => setNewSale({...newSale, product_name: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-primary"><Plus size={16} /> Adicionar Venda</button>
              </form>

              <div className="timeline-list mt-4">
                {sales.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma venda simulada.</p> : (
                  sales.map(sale => (
                    <div key={sale.id} className="timeline-item">
                      <span className="timeline-time">{formatSeconds(sale.show_at_seconds)}</span>
                      <div className="timeline-content flex-col">
                        <strong>{sale.buyer_name}{sale.buyer_location ? ` (${sale.buyer_location})` : ''}</strong>
                        <span className="text-xs text-gray-500">comprou {sale.product_name}</span>
                      </div>
                      <button className="btn btn-ghost btn-xs btn-icon danger" onClick={() => deleteSale(sale.id)}><Trash2 size={14} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'audience' && audience && (
          <div className="interaction-section card">
            <div className="card-header">
              <h4>Contador de Audiência</h4>
            </div>
            <div className="card-body">
              <form onSubmit={saveAudience} className="add-form flex-col">
                <div className="type-selector">
                  <button type="button" className={`type-option ${audience.mode === AUDIENCE_MODE.NONE ? 'selected' : ''}`} onClick={() => setAudience({...audience, mode: AUDIENCE_MODE.NONE})}>
                    <span className="type-option-label">Não exibir</span>
                  </button>
                  <button type="button" className={`type-option ${audience.mode === AUDIENCE_MODE.FIXED ? 'selected' : ''}`} onClick={() => setAudience({...audience, mode: AUDIENCE_MODE.FIXED})}>
                    <span className="type-option-label">Audiência fixa</span>
                  </button>
                  <button type="button" className={`type-option ${audience.mode === AUDIENCE_MODE.DYNAMIC ? 'selected' : ''}`} onClick={() => setAudience({...audience, mode: AUDIENCE_MODE.DYNAMIC})}>
                    <span className="type-option-label">Audiência dinâmica</span>
                  </button>
                </div>

                {audience.mode === AUDIENCE_MODE.FIXED && (
                  <div className="form-row">
                    <input type="number" className="input" placeholder="Número fixo de pessoas" value={audience.fixed_count} onChange={e => setAudience({...audience, fixed_count: parseInt(e.target.value) || 0})} />
                  </div>
                )}

                {audience.mode === AUDIENCE_MODE.DYNAMIC && (
                  <div className="form-row">
                    <input type="number" className="input" placeholder="Mínimo" value={audience.dynamic_min} onChange={e => setAudience({...audience, dynamic_min: parseInt(e.target.value) || 0})} />
                    <input type="number" className="input" placeholder="Máximo" value={audience.dynamic_max} onChange={e => setAudience({...audience, dynamic_max: parseInt(e.target.value) || 0})} />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" disabled={savingAudience}>
                  {savingAudience ? <span className="spinner spinner-sm" /> : <><Save size={16} /> Salvar</>}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
