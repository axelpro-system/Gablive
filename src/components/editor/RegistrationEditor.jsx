import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BLOCK_TYPES } from '../../lib/constants';
import {
  ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Clock3, FileText,
  FormInput, GripVertical, Layout, Monitor, Plus, Save, Smartphone,
  Sparkles, Tablet, Trash2, Type,
} from 'lucide-react';
import './RegistrationEditor.css';

const BLOCK_LIBRARY = [
  { type: BLOCK_TYPES.HERO, label: 'Hero', description: 'Título, texto e botão', icon: Sparkles },
  { type: BLOCK_TYPES.TEXT, label: 'Texto', description: 'Conteúdo livre', icon: Type },
  { type: BLOCK_TYPES.COUNTDOWN, label: 'Contagem', description: 'Cronômetro do evento', icon: Clock3 },
  { type: BLOCK_TYPES.FORM, label: 'Formulário', description: 'Captura de participantes', icon: FormInput },
  { type: BLOCK_TYPES.BENEFITS, label: 'Benefícios', description: 'Lista de vantagens', icon: CheckCircle2 },
  { type: BLOCK_TYPES.TESTIMONIALS, label: 'Depoimentos', description: 'Prova social', icon: FileText },
];

const DEFAULT_THEME = {
  primaryColor: '#E31C23',
  backgroundColor: '#0F0F10',
  textColor: '#F4F4F5',
};

const VIEWPORTS = {
  desktop: { label: 'Desktop', icon: Monitor },
  tablet: { label: 'Tablet', icon: Tablet },
  mobile: { label: 'Celular', icon: Smartphone },
};

function createBlock(type) {
  const defaults = {
    [BLOCK_TYPES.HERO]: {
      title: 'Novo título',
      subtitle: 'Explique por que vale a pena participar deste webinar.',
      cta: 'Garantir minha vaga',
    },
    [BLOCK_TYPES.TEXT]: { content: 'Adicione seu conteúdo aqui.' },
    [BLOCK_TYPES.FORM]: { fields: ['name', 'email'] },
    [BLOCK_TYPES.BENEFITS]: {
      title: 'O que você vai aprender',
      items: [
        { title: 'Benefício principal', description: 'Descreva o resultado que o participante terá.' },
      ],
    },
    [BLOCK_TYPES.TESTIMONIALS]: {
      title: 'O que dizem os participantes',
      items: [
        { name: 'Nome do participante', role: 'Profissão', text: 'Adicione um depoimento real aqui.' },
      ],
    },
  };

  return { type, data: defaults[type] || {} };
}

export default function RegistrationEditor({ webinarId }) {
  const [page, setPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewport, setViewport] = useState('desktop');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const fetchPage = async () => {
      let { data, error } = await supabase
        .from('registration_pages')
        .select('*')
        .eq('webinar_id', webinarId)
        .single();

      if (error?.code === 'PGRST116') {
        const defaultBlocks = [
          createBlock(BLOCK_TYPES.HERO),
          createBlock(BLOCK_TYPES.COUNTDOWN),
          createBlock(BLOCK_TYPES.FORM),
        ];
        const { data: created } = await supabase
          .from('registration_pages')
          .insert({ webinar_id: webinarId, blocks: defaultBlocks, theme: DEFAULT_THEME })
          .select()
          .single();
        data = created;
      }

      if (data) {
        const storedBlocks = typeof data.blocks === 'string' ? JSON.parse(data.blocks) : data.blocks;
        const storedTheme = typeof data.theme === 'string' ? JSON.parse(data.theme) : data.theme;
        setPage(data);
        setBlocks(storedBlocks || []);
        setTheme(storedTheme || DEFAULT_THEME);
      }
      setLoading(false);
    };

    fetchPage();
  }, [webinarId]);

  const markChanged = () => {
    setDirty(true);
    setFeedback('');
  };

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    setFeedback('');
    const { error } = await supabase
      .from('registration_pages')
      .update({ blocks, theme })
      .eq('id', page.id);

    setSaving(false);
    if (error) {
      setFeedback('Não foi possível salvar. Tente novamente.');
      return;
    }
    setDirty(false);
    setFeedback('Alterações salvas');
  };

  const addBlock = (type) => {
    const nextBlocks = [...blocks, createBlock(type)];
    setBlocks(nextBlocks);
    setSelectedIndex(nextBlocks.length - 1);
    markChanged();
  };

  const removeBlock = (index) => {
    if (!window.confirm('Remover este bloco da página?')) return;
    const nextBlocks = blocks.filter((_, blockIndex) => blockIndex !== index);
    setBlocks(nextBlocks);
    setSelectedIndex(Math.max(0, Math.min(index, nextBlocks.length - 1)));
    markChanged();
  };

  const updateBlock = (index, data) => {
    setBlocks((current) => current.map((block, blockIndex) => (
      blockIndex === index ? { ...block, data: { ...block.data, ...data } } : block
    )));
    markChanged();
  };

  const moveBlock = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const nextBlocks = [...blocks];
    [nextBlocks[index], nextBlocks[target]] = [nextBlocks[target], nextBlocks[index]];
    setBlocks(nextBlocks);
    setSelectedIndex(target);
    markChanged();
  };

  const updateTheme = (key, value) => {
    setTheme((current) => ({ ...current, [key]: value }));
    markChanged();
  };

  if (loading) {
    return (
      <div className="builder-loading">
        <div className="spinner" />
        <span>Carregando construtor...</span>
      </div>
    );
  }

  const selectedBlock = blocks[selectedIndex] || null;

  return (
    <div className="page-builder">
      <header className="builder-toolbar">
        <div className="builder-toolbar-start">
          <button className="builder-icon-button" type="button" aria-label="Voltar"
            onClick={() => window.history.back()}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h3>Construtor de página</h3>
            <span className={dirty ? 'builder-status builder-status--dirty' : 'builder-status'}>
              {dirty ? 'Alterações não salvas' : feedback || 'Tudo salvo'}
            </span>
          </div>
        </div>

        <div className="builder-viewports" aria-label="Tamanho do preview">
          {Object.entries(VIEWPORTS).map(([key, option]) => {
            const Icon = option.icon;
            return (
              <button
                key={key}
                type="button"
                className={viewport === key ? 'active' : ''}
                onClick={() => setViewport(key)}
                aria-label={`Visualizar em ${option.label}`}
                aria-pressed={viewport === key}
              >
                <Icon size={17} />
              </button>
            );
          })}
        </div>

        <button className="btn btn-primary builder-save" onClick={handleSave}
          disabled={saving || !dirty}>
          {saving ? <span className="spinner spinner-sm" /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </header>

      <div className="builder-workspace">
        <aside className="builder-library" aria-label="Biblioteca de blocos">
          <div className="builder-panel-heading">
            <div>
              <span className="builder-eyebrow">Adicionar</span>
              <h4>Blocos</h4>
            </div>
            <Plus size={18} aria-hidden="true" />
          </div>
          <div className="builder-block-library">
            {BLOCK_LIBRARY.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.type} type="button" className="builder-library-item"
                  onClick={() => addBlock(item.type)}>
                  <span className="builder-library-icon"><Icon size={18} /></span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <Plus size={15} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </aside>

        <main className="builder-canvas">
          <div className={`builder-preview builder-preview--${viewport}`}
            style={{
              '--preview-primary': theme.primaryColor,
              '--preview-background': theme.backgroundColor,
              '--preview-text': theme.textColor,
            }}>
            {blocks.length === 0 ? (
              <div className="builder-preview-empty">
                <Layout size={36} />
                <strong>Sua página está vazia</strong>
                <span>Adicione um bloco pelo painel à esquerda.</span>
              </div>
            ) : blocks.map((block, index) => (
              <PreviewBlock
                key={`${block.type}-${index}`}
                block={block}
                selected={selectedIndex === index}
                onSelect={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        </main>

        <aside className="builder-properties" aria-label="Propriedades">
          <div className="builder-panel-heading">
            <div>
              <span className="builder-eyebrow">Editar</span>
              <h4>{selectedBlock ? getBlockLabel(selectedBlock.type) : 'Página'}</h4>
            </div>
            {selectedBlock && <GripVertical size={18} aria-hidden="true" />}
          </div>

          {selectedBlock ? (
            <>
              <div className="builder-properties-body">
                <BlockFields block={selectedBlock} index={selectedIndex} onChange={updateBlock} />
              </div>
              <div className="builder-block-actions">
                <button type="button" onClick={() => moveBlock(selectedIndex, -1)}
                  disabled={selectedIndex === 0}>
                  <ArrowUp size={15} /> Subir
                </button>
                <button type="button" onClick={() => moveBlock(selectedIndex, 1)}
                  disabled={selectedIndex === blocks.length - 1}>
                  <ArrowDown size={15} /> Descer
                </button>
                <button type="button" className="danger" onClick={() => removeBlock(selectedIndex)}>
                  <Trash2 size={15} /> Remover
                </button>
              </div>
            </>
          ) : (
            <p className="builder-panel-empty">Selecione um bloco no preview para editar.</p>
          )}

          <div className="builder-theme">
            <span className="builder-eyebrow">Tema da página</span>
            <ColorField label="Cor principal" value={theme.primaryColor}
              onChange={(value) => updateTheme('primaryColor', value)} />
            <ColorField label="Fundo" value={theme.backgroundColor}
              onChange={(value) => updateTheme('backgroundColor', value)} />
            <ColorField label="Texto" value={theme.textColor}
              onChange={(value) => updateTheme('textColor', value)} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function getBlockLabel(type) {
  return BLOCK_LIBRARY.find((item) => item.type === type)?.label || type;
}

function Field({ label, children }) {
  return (
    <label className="builder-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function BlockFields({ block, index, onChange }) {
  if (block.type === BLOCK_TYPES.HERO) {
    return (
      <>
        <Field label="Título">
          <input className="input" value={block.data.title || ''}
            onChange={(event) => onChange(index, { title: event.target.value })} />
        </Field>
        <Field label="Subtítulo">
          <textarea className="input textarea" rows={3} value={block.data.subtitle || ''}
            onChange={(event) => onChange(index, { subtitle: event.target.value })} />
        </Field>
        <Field label="Texto do botão">
          <input className="input" value={block.data.cta || ''}
            onChange={(event) => onChange(index, { cta: event.target.value })} />
        </Field>
      </>
    );
  }

  if (block.type === BLOCK_TYPES.TEXT) {
    return (
      <Field label="Conteúdo">
        <textarea className="input textarea" rows={8} value={block.data.content || ''}
          onChange={(event) => onChange(index, { content: event.target.value })} />
      </Field>
    );
  }

  if (block.type === BLOCK_TYPES.FORM) {
    const fields = block.data.fields || ['name', 'email'];
    const hasPhone = fields.includes('phone');
    return (
      <>
        <Field label="Título do formulário">
          <input className="input" value={block.data.title || ''}
            placeholder="Garanta sua vaga"
            onChange={(event) => onChange(index, { title: event.target.value })} />
        </Field>
        <Field label="Texto do botão">
          <input className="input" value={block.data.buttonText || ''}
            placeholder="Quero participar"
            onChange={(event) => onChange(index, { buttonText: event.target.value })} />
        </Field>
        <label className="builder-checkbox">
          <input type="checkbox" checked={hasPhone}
            onChange={(event) => {
              const nextFields = event.target.checked
                ? [...new Set([...fields, 'phone'])]
                : fields.filter((field) => field !== 'phone');
              onChange(index, { fields: nextFields });
            }} />
          <span>
            <strong>Solicitar telefone</strong>
            <small>Adiciona o campo de telefone ao formulário.</small>
          </span>
        </label>
      </>
    );
  }

  if (block.type === BLOCK_TYPES.BENEFITS) {
    const items = block.data.items || [];
    const updateItem = (itemIndex, patch) => {
      onChange(index, {
        items: items.map((item, currentIndex) => (
          currentIndex === itemIndex ? { ...item, ...patch } : item
        )),
      });
    };
    return (
      <>
        <Field label="Título da seção">
          <input className="input" value={block.data.title || ''}
            placeholder="O que você vai aprender"
            onChange={(event) => onChange(index, { title: event.target.value })} />
        </Field>
        <div className="builder-repeater">
          {items.map((item, itemIndex) => (
            <div className="builder-repeater-item" key={itemIndex}>
              <div className="builder-repeater-heading">
                <strong>Benefício {itemIndex + 1}</strong>
                <button type="button" onClick={() => onChange(index, {
                  items: items.filter((_, currentIndex) => currentIndex !== itemIndex),
                })} aria-label={`Remover benefício ${itemIndex + 1}`}>
                  <Trash2 size={14} />
                </button>
              </div>
              <input className="input" value={item.title || ''} placeholder="Título"
                onChange={(event) => updateItem(itemIndex, { title: event.target.value })} />
              <textarea className="input textarea" rows={3} value={item.description || ''}
                placeholder="Descrição"
                onChange={(event) => updateItem(itemIndex, { description: event.target.value })} />
            </div>
          ))}
          <button type="button" className="builder-add-item" onClick={() => onChange(index, {
            items: [...items, { title: 'Novo benefício', description: 'Descreva este benefício.' }],
          })}>
            <Plus size={14} /> Adicionar benefício
          </button>
        </div>
      </>
    );
  }

  if (block.type === BLOCK_TYPES.TESTIMONIALS) {
    const items = block.data.items || [];
    const updateItem = (itemIndex, patch) => {
      onChange(index, {
        items: items.map((item, currentIndex) => (
          currentIndex === itemIndex ? { ...item, ...patch } : item
        )),
      });
    };
    return (
      <>
        <Field label="Título da seção">
          <input className="input" value={block.data.title || ''}
            placeholder="O que dizem os participantes"
            onChange={(event) => onChange(index, { title: event.target.value })} />
        </Field>
        <div className="builder-repeater">
          {items.map((item, itemIndex) => (
            <div className="builder-repeater-item" key={itemIndex}>
              <div className="builder-repeater-heading">
                <strong>Depoimento {itemIndex + 1}</strong>
                <button type="button" onClick={() => onChange(index, {
                  items: items.filter((_, currentIndex) => currentIndex !== itemIndex),
                })} aria-label={`Remover depoimento ${itemIndex + 1}`}>
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea className="input textarea" rows={4} value={item.text || ''}
                placeholder="Texto do depoimento"
                onChange={(event) => updateItem(itemIndex, { text: event.target.value })} />
              <input className="input" value={item.name || ''} placeholder="Nome"
                onChange={(event) => updateItem(itemIndex, { name: event.target.value })} />
              <input className="input" value={item.role || ''} placeholder="Profissão ou empresa"
                onChange={(event) => updateItem(itemIndex, { role: event.target.value })} />
            </div>
          ))}
          <button type="button" className="builder-add-item" onClick={() => onChange(index, {
            items: [...items, {
              name: 'Nome do participante',
              role: 'Profissão',
              text: 'Escreva o depoimento aqui.',
            }],
          })}>
            <Plus size={14} /> Adicionar depoimento
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="builder-property-note">
      <Layout size={20} />
      <p>Este bloco utiliza as configurações do webinar. Opções avançadas serão adicionadas na próxima etapa.</p>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="builder-color-field">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)}
          aria-label={label} />
        <input className="input" value={value}
          onChange={(event) => onChange(event.target.value)} />
      </div>
    </Field>
  );
}

function PreviewBlock({ block, selected, onSelect }) {
  const className = `builder-preview-block builder-preview-${block.type} ${selected ? 'selected' : ''}`;

  return (
    <section className={className} onClick={onSelect} tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}>
      {selected && <span className="builder-selection-label">{getBlockLabel(block.type)}</span>}
      {block.type === BLOCK_TYPES.HERO && (
        <>
          <span className="builder-preview-kicker">WEBINAR GRATUITO</span>
          <h1>{block.data.title || 'Título do webinar'}</h1>
          <p>{block.data.subtitle || 'Descrição do seu evento.'}</p>
          {block.data.cta && <button type="button">{block.data.cta}</button>}
        </>
      )}
      {block.type === BLOCK_TYPES.TEXT && <p>{block.data.content || 'Adicione seu texto aqui.'}</p>}
      {block.type === BLOCK_TYPES.COUNTDOWN && (
        <div className="builder-countdown">
          {['02', '18', '45'].map((value, index) => (
            <span key={`${value}-${index}`}><strong>{value}</strong><small>{['HORAS', 'MIN', 'SEG'][index]}</small></span>
          ))}
        </div>
      )}
      {block.type === BLOCK_TYPES.FORM && (
        <div className="builder-form-preview">
          <h2>{block.data.title || 'Garanta sua vaga'}</h2>
          <input readOnly placeholder="Seu nome" />
          <input readOnly placeholder="Seu melhor e-mail" />
          {(block.data.fields || []).includes('phone') && <input readOnly placeholder="Seu telefone" />}
          <button type="button">{block.data.buttonText || 'Quero participar'}</button>
        </div>
      )}
      {block.type === BLOCK_TYPES.BENEFITS && (
        <>
          <h2>{block.data.title || 'O que você vai aprender'}</h2>
          <div className="builder-benefits-preview">
            {(block.data.items || []).map((item, index) => (
              <article key={index}><CheckCircle2 size={20} /><strong>{item.title}</strong><p>{item.description}</p></article>
            ))}
          </div>
        </>
      )}
      {block.type === BLOCK_TYPES.TESTIMONIALS && (
        <>
          <h2>{block.data.title || 'Depoimentos'}</h2>
          {(block.data.items || []).map((item, index) => (
            <blockquote key={index}>
              “{item.text}”
              <strong>{item.name}</strong>
              {item.role && <small>{item.role}</small>}
            </blockquote>
          ))}
        </>
      )}
    </section>
  );
}
