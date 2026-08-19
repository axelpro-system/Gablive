import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './LandingPage.css';

/* ============================================
   LANDING PAGE — Gablive
   Wave 1 + Wave 2 (Complete)
   ============================================ */

const FAQ_ITEMS = [
  {
    question: 'O GabLive substitui o Zoom ou o Vimeo?',
    answer: 'O GabLive não é uma ferramenta de videoconferência. Ele organiza a jornada comercial do webinar e pode usar YouTube ou Vimeo como fonte de vídeo, conectando registro, sala, CTAs, comportamento e conversão.',
  },
  {
    question: 'Quais formatos de webinar a plataforma suporta?',
    answer: 'A operação contempla webinars ao vivo, gravados e Just-in-Time. No formato JIT, cada participante entra em uma sessão que começa a partir da chegada dele, com interações sincronizadas.',
  },
  {
    question: 'O que significa analytics por timestamp?',
    answer: 'Significa relacionar eventos do funil ao tempo do vídeo. Assim, retenção, abertura da oferta, clique no CTA e outras ações podem ser analisadas no momento em que aconteceram.',
  },
  {
    question: 'Agências conseguem separar os dados de cada cliente?',
    answer: 'Sim. Cada organização é um tenant isolado por Row-Level Security. Webinars, leads, membros e métricas ficam associados ao contexto correto no banco de dados.',
  },
  {
    question: 'Preciso saber programar para configurar um webinar?',
    answer: 'Não. A proposta é permitir que o operador configure páginas, automações, CTAs e interações pelo painel. Integrações avançadas podem exigir apoio técnico, dependendo do fluxo.',
  },
  {
    question: 'Quando receberei acesso?',
    answer: 'A lista de espera será usada para organizar os primeiros acessos e comunicar a disponibilidade. Entrar na lista não cria cobrança nem compromisso de contratação.',
  },
];

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const toggleRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const focusable = panelRef.current?.querySelectorAll('a, button');
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    first?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className={`lp-navbar${isScrolled ? ' is-scrolled' : ''}`} aria-label="Navegação principal">
      <div className="lp-navbar__inner">
        <Link to="/" className="lp-navbar__logo" aria-label="GabLive — início">
          <img src="/logo.svg" alt="" width="126" height="30" />
        </Link>

        <ul className="lp-navbar__links">
          <li><a href="#features">Produto</a></li>
          <li><a href="#how-it-works">Como funciona</a></li>
          <li><a href="#agencies">Para agências</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>

        <div className="lp-navbar__actions">
          <Link to="/auth/login" className="lp-navbar__login">Entrar</Link>
          <a href="#waitlist" className="lp-navbar__cta lp-btn lp-btn--primary">
            Entrar na lista
            <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>

        <button
          ref={toggleRef}
          className="lp-navbar__mobile-toggle"
          type="button"
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isOpen}
          aria-controls="lp-mobile-menu"
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        id="lp-mobile-menu"
        ref={panelRef}
        className={`lp-navbar__mobile-panel${isOpen ? ' is-open' : ''}`}
        aria-hidden={!isOpen}
      >
        <a href="#features" onClick={closeMenu}>Produto</a>
        <a href="#how-it-works" onClick={closeMenu}>Como funciona</a>
        <a href="#agencies" onClick={closeMenu}>Para agências</a>
        <a href="#faq" onClick={closeMenu}>FAQ</a>
        <Link to="/auth/login" onClick={closeMenu}>Entrar</Link>
        <a href="#waitlist" className="lp-navbar__mobile-cta lp-btn lp-btn--primary" onClick={closeMenu}>
          Entrar na lista de espera
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>
    </nav>
  );
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="lp-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

function Hero() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-title">
      <div className="lp-hero__grid" aria-hidden="true" />
      <div className="lp-hero__beam" aria-hidden="true" />
      <div className="lp-hero__container">
        <div className="lp-hero__content">
          <p className="lp-hero__eyebrow">
            <span aria-hidden="true" />
            Webinar analytics para operações de venda
          </p>

          <h1 className="lp-hero__title" id="lp-hero-title">
            Saiba em que segundo do seu webinar a venda é decidida
          </h1>

          <p className="lp-hero__subtitle">
            Vídeo, página, CTA e conversão na mesma linha do tempo.
            O GabLive mostra o que acontece antes da venda — sem planilhas,
            integrações frágeis ou métricas isoladas.
          </p>

          <div className="lp-hero__actions">
            <a className="lp-hero__cta-primary lp-btn lp-btn--primary" href="#waitlist">
              Entrar na lista de espera
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="lp-hero__cta-secondary lp-btn lp-btn--ghost" href="#features">
              Explorar o produto
              <ChevronRight size={17} aria-hidden="true" />
            </a>
          </div>

          <ul className="lp-hero__signals" aria-label="Diferenciais principais">
            <li>Just-in-Time nativo</li>
            <li>Analytics por timestamp</li>
            <li>Multi-tenant para agências</li>
          </ul>
        </div>

        <div className="lp-hero__visual">
          <div className="lp-hero__visual-frame">
            <div className="lp-hero__visual-bar" aria-hidden="true">
              <span />
              <span />
              <span />
              <small>Conversão por timestamp</small>
            </div>
            <picture>
              <source
                type="image/avif"
                srcSet="/product-funnel-timestamp-800.avif 800w, /product-funnel-timestamp-1400.avif 1400w"
                sizes="(max-width: 1080px) calc(100vw - 40px), 68vw"
              />
              <source
                type="image/webp"
                srcSet="/product-funnel-timestamp-800.webp 800w, /product-funnel-timestamp-1400.webp 1400w"
                sizes="(max-width: 1080px) calc(100vw - 40px), 68vw"
              />
              <img
                src="/product-funnel-timestamp.png"
                width="1672"
                height="941"
                fetchPriority="high"
                decoding="async"
                alt="Visualização do GabLive conectando momentos do webinar, ações do espectador e conversões em uma linha do tempo"
              />
            </picture>
          </div>
          <div className="lp-hero__metric" aria-hidden="true">
            <span>Momento de conversão</span>
            <strong>42:18</strong>
            <small>CTA + pico de retenção</small>
          </div>
        </div>
      </div>
      <div className="lp-hero__fade" aria-hidden="true" />
    </section>
  );
}

function ProductStory() {
  return (
    <section className="lp-story" id="features" aria-labelledby="lp-story-title">
      <header className="lp-story__intro">
        <p className="lp-story__kicker">Uma linha do tempo. A operação inteira.</p>
        <h2 id="lp-story-title">Analytics de webinar sempre existiu. Só nunca foi analytics de verdade.</h2>
        <p>
          Visualizações isoladas não explicam conversão. O GabLive conecta o
          que o participante viu, fez e comprou — no mesmo contexto.
        </p>
      </header>

      <article className="lp-story__chapter lp-story__chapter--integrated">
        <div className="lp-story__copy">
          <span className="lp-story__index">01 / Operação integrada</span>
          <h3>O funil deixa de ser uma coleção de ferramentas</h3>
          <p>
            Página de registro, sala, vídeo, chat, oferta e follow-up operam
            juntos. Cada evento passa a pertencer ao mesmo fluxo de dados.
          </p>
          <ul>
            <li>Páginas e lembretes conectados ao webinar</li>
            <li>CTAs sincronizados com a apresentação</li>
            <li>Leads e comportamento em uma única operação</li>
          </ul>
        </div>
        <figure className="lp-story__image">
          <picture>
            <source
              type="image/avif"
              srcSet="/product-integrated-funnel-800.avif 800w, /product-integrated-funnel-1400.avif 1400w"
              sizes="(max-width: 960px) calc(100vw - 40px), 58vw"
            />
            <source
              type="image/webp"
              srcSet="/product-integrated-funnel-800.webp 800w, /product-integrated-funnel-1400.webp 1400w"
              sizes="(max-width: 960px) calc(100vw - 40px), 58vw"
            />
            <img
              src="/product-integrated-funnel.png"
              width="1486"
              height="1080"
              loading="lazy"
              decoding="async"
              alt="Representação do GabLive unificando ferramentas fragmentadas em um funil controlado"
            />
          </picture>
        </figure>
      </article>

      <article className="lp-story__chapter lp-story__chapter--analytics">
        <div className="lp-story__analytics-ui" aria-label="Exemplo visual de analytics por timestamp">
          <div className="lp-story__ui-head">
            <div><small>Webinar evergreen</small><strong>Funil principal</strong></div>
            <span>Últimos 30 dias</span>
          </div>
          <div className="lp-story__ui-metrics">
            <div><small>Inscritos</small><strong>—</strong><span>Dados da operação</span></div>
            <div><small>Assistiram à oferta</small><strong>—</strong><span>Por timestamp</span></div>
            <div><small>Cliques no CTA</small><strong>—</strong><span>Evento atribuído</span></div>
          </div>
          <div className="lp-story__chart">
            <div className="lp-story__chart-labels"><span>Retenção</span><span>Evento de conversão</span></div>
            <svg viewBox="0 0 800 230" role="img" aria-label="Curva ilustrativa de retenção ao longo do webinar">
              <defs>
                <linearGradient id="retentionArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#141413" stopOpacity=".22" />
                  <stop offset="100%" stopColor="#141413" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="lp-story__chart-area" d="M0 45 C90 52 130 80 210 76 S340 112 420 105 S520 155 610 145 S710 177 800 165 L800 230 L0 230 Z" />
              <path className="lp-story__chart-line" d="M0 45 C90 52 130 80 210 76 S340 112 420 105 S520 155 610 145 S710 177 800 165" />
              <line className="lp-story__chart-event" x1="515" y1="20" x2="515" y2="215" />
              <circle className="lp-story__chart-point" cx="515" cy="149" r="6" />
            </svg>
            <div className="lp-story__timeline">
              <span>00:00</span><span>15:00</span><span>30:00</span><strong>42:18</strong><span>60:00</span>
            </div>
          </div>
        </div>
        <div className="lp-story__copy">
          <span className="lp-story__index">02 / Analytics por timestamp</span>
          <h3>Descubra o momento que mudou a decisão</h3>
          <p>
            Compare retenção, abertura da oferta e clique no CTA na mesma
            escala temporal. Ajuste roteiro e mídia a partir do mecanismo,
            não de uma média geral.
          </p>
          <a href="#waitlist">Quero enxergar meu funil <ArrowRight size={17} aria-hidden="true" /></a>
        </div>
      </article>

      <article className="lp-story__chapter lp-story__chapter--jit">
        <div className="lp-story__copy">
          <span className="lp-story__index">03 / Just-in-Time</span>
          <h3>O próximo webinar começa quando o lead chega</h3>
          <p>
            Uma experiência evergreen com sensação de evento: sala de espera,
            chat, enquetes, prova social e oferta seguem a linha do tempo
            configurada pela operação.
          </p>
          <ul>
            <li>Atraso inicial configurável</li>
            <li>Interações sincronizadas ao vídeo</li>
            <li>Replay e follow-up automatizados</li>
          </ul>
        </div>
        <div className="lp-story__jit-ui" aria-label="Exemplo de configuração Just-in-Time">
          <div className="lp-story__jit-head">
            <span><i aria-hidden="true" /> Webinar ativo</span>
            <small>Just-in-Time</small>
          </div>
          <div className="lp-story__jit-clock">
            <small>Próxima sessão</small>
            <strong>começa em 02:00</strong>
            <span>Entrada contínua · experiência sincronizada</span>
          </div>
          <div className="lp-story__jit-track">
            <div className="lp-story__jit-line"><span className="is-active" /><span /><span /><span /></div>
            <div className="lp-story__jit-events">
              <div><strong>00:00</strong><span>Início</span></div>
              <div><strong>18:30</strong><span>Enquete</span></div>
              <div><strong>42:18</strong><span>Oferta</span></div>
              <div><strong>58:00</strong><span>Follow-up</span></div>
            </div>
          </div>
          <div className="lp-story__jit-footer">
            <span>Chat sincronizado</span><span>CTA programado</span><span>Analytics ativo</span>
          </div>
        </div>
      </article>
    </section>
  );
}

function HowItWorks() {
  return (
    <>
      <section className="lp-flow" id="how-it-works" aria-labelledby="lp-flow-title">
        <div className="lp-flow__head">
          <p>Como funciona</p>
          <h2 id="lp-flow-title">Da configuração à decisão de mídia, sem trocar de contexto.</h2>
        </div>
        <ol className="lp-flow__list">
          <li>
            <span>01</span>
            <div>
              <small>Configuração</small>
              <h3>Modele a experiência</h3>
              <p>Defina formato, página, identidade, sala de espera e automações do webinar.</p>
            </div>
            <strong>Ao vivo · Gravado · JIT</strong>
          </li>
          <li>
            <span>02</span>
            <div>
              <small>Orquestração</small>
              <h3>Programe os momentos de venda</h3>
              <p>Sincronize chat, enquetes, prova social e ofertas com pontos específicos do vídeo.</p>
            </div>
            <strong>Timeline única</strong>
          </li>
          <li>
            <span>03</span>
            <div>
              <small>Distribuição</small>
              <h3>Publique uma jornada contínua</h3>
              <p>Registro, lembretes, apresentação, replay e follow-up compartilham a mesma operação.</p>
            </div>
            <strong>Sem código</strong>
          </li>
          <li>
            <span>04</span>
            <div>
              <small>Otimização</small>
              <h3>Leia o comportamento no tempo</h3>
              <p>Relacione retenção, interações e cliques para encontrar os pontos que mudam conversão.</p>
            </div>
            <strong>Dados acionáveis</strong>
          </li>
        </ol>
        <a className="lp-flow__cta lp-btn lp-btn--primary" href="#waitlist">
          Quero operar com esse nível de controle
          <ArrowRight size={18} aria-hidden="true" />
        </a>
      </section>

      <section className="lp-agencies" id="agencies" aria-labelledby="lp-agencies-title">
        <div className="lp-agencies__inner">
          <div className="lp-agencies__copy">
            <p>Para agências</p>
            <h2 id="lp-agencies-title">Vários clientes. Uma central. Nenhum dado misturado.</h2>
            <p>
              O multi-tenant é parte da arquitetura, não uma pasta com etiquetas.
              Cada organização mantém webinars, leads, equipe e analytics isolados
              no banco de dados.
            </p>
            <dl>
              <div>
                <dt>Isolamento real</dt>
                <dd>Row-Level Security aplicada aos dados de cada organização.</dd>
              </div>
              <div>
                <dt>Troca de contexto</dt>
                <dd>Administre operações distintas a partir do mesmo acesso.</dd>
              </div>
              <div>
                <dt>Visão consolidada</dt>
                <dd>Compare funis sem transformar clientes em uma planilha única.</dd>
              </div>
            </dl>
          </div>
          <figure className="lp-agencies__visual">
            <picture>
              <source
                type="image/avif"
                srcSet="/product-multitenant-800.avif 800w, /product-multitenant-1400.avif 1400w"
                sizes="(max-width: 960px) calc(100vw - 40px), 58vw"
              />
              <source
                type="image/webp"
                srcSet="/product-multitenant-800.webp 800w, /product-multitenant-1400.webp 1400w"
                sizes="(max-width: 960px) calc(100vw - 40px), 58vw"
              />
              <img
                src="/product-multitenant.png"
                width="1672"
                height="941"
                loading="lazy"
                decoding="async"
                alt="Central de comando representando múltiplas operações de webinar isoladas no GabLive"
              />
            </picture>
            <figcaption>
              <span>Organização ativa</span>
              <strong>Contexto isolado</strong>
              <small>Webinars · Leads · Analytics · Equipe</small>
            </figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="lp-faq" id="faq" aria-labelledby="lp-faq-title">
      <div className="lp-faq__head">
        <p>Dúvidas objetivas</p>
        <h2 id="lp-faq-title">Antes de entrar na lista.</h2>
      </div>
      <div className="lp-faq__items">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <article className={`lp-faq__item${isOpen ? ' is-open' : ''}`} key={item.question}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  id={`faq-button-${index}`}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span>{item.question}</span>
                  <ChevronDown size={20} aria-hidden="true" />
                </button>
              </h3>
              <div
                className="lp-faq__answer"
                id={`faq-panel-${index}`}
                role="region"
                aria-labelledby={`faq-button-${index}`}
                hidden={!isOpen}
              >
                <p>{item.answer}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Waitlist() {
  const supabase = useSupabase();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new window.FormData(form);
    const email = String(data.get('email') || '').trim().toLowerCase();
    const name = String(data.get('name') || '').trim();
    const company = String(data.get('company') || '').trim();
    const honeypot = String(data.get('website') || '');

    if (honeypot) return;
    if (!email || email.length > 254 || !email.includes('@')) {
      setStatus('error');
      setMessage('Informe um e-mail válido.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const { error } = await supabase.from('waitlist_entries').insert({
      email,
      name: name || null,
      company: company || null,
      source: 'landing-page',
    });

    if (error) {
      if (error.code === '23505') {
        setStatus('success');
        setMessage('Este e-mail já está na lista. Avisaremos quando o acesso estiver disponível.');
        return;
      }
      setStatus('error');
      setMessage('Não foi possível registrar agora. Tente novamente em alguns instantes.');
      return;
    }

    form.reset();
    setStatus('success');
    setMessage('Entrada confirmada. Avisaremos quando o acesso estiver disponível.');
  };

  return (
    <section className="lp-waitlist" id="waitlist" aria-labelledby="lp-waitlist-title">
      <div className="lp-waitlist__inner">
        <div className="lp-waitlist__copy">
          <p>Acesso antecipado</p>
          <h2 id="lp-waitlist-title">Pare de decidir mídia com uma média.</h2>
          <p>
            Entre na lista para acompanhar a disponibilidade do GabLive e
            receber as informações dos primeiros acessos.
          </p>
          <ul>
            <li>Sem cobrança</li>
            <li>Sem compromisso de contratação</li>
            <li>Comunicação apenas sobre o produto</li>
          </ul>
        </div>

        {status === 'success' ? (
          <div className="lp-waitlist__success" role="status">
            <CheckCircle2 size={28} aria-hidden="true" />
            <h3>Você está na lista.</h3>
            <p>{message}</p>
          </div>
        ) : (
          <form className="lp-waitlist__form" onSubmit={handleSubmit} noValidate>
            <div className="lp-waitlist__field">
              <label htmlFor="waitlist-name">Nome</label>
              <input id="waitlist-name" name="name" type="text" autoComplete="name" maxLength="120" placeholder="Como devemos chamar você?" />
            </div>
            <div className="lp-waitlist__field">
              <label htmlFor="waitlist-email">E-mail profissional <span aria-hidden="true">*</span></label>
              <input id="waitlist-email" name="email" type="email" autoComplete="email" maxLength="254" placeholder="voce@empresa.com" required />
            </div>
            <div className="lp-waitlist__field">
              <label htmlFor="waitlist-company">Empresa ou operação</label>
              <input id="waitlist-company" name="company" type="text" autoComplete="organization" maxLength="160" placeholder="Nome da operação" />
            </div>
            <div className="lp-waitlist__honeypot" aria-hidden="true">
              <label htmlFor="waitlist-website">Website</label>
              <input id="waitlist-website" name="website" type="text" tabIndex="-1" autoComplete="off" />
            </div>
            <button type="submit" className="lp-btn lp-btn--primary" disabled={status === 'loading'}>
              {status === 'loading' ? 'Registrando…' : 'Entrar na lista de espera'}
              {status !== 'loading' && <ArrowRight size={18} aria-hidden="true" />}
            </button>
            <p className="lp-waitlist__privacy" id="privacy">
              Ao enviar, você concorda com o uso dos dados para comunicações sobre o GabLive.
            </p>
            {message && <p className="lp-waitlist__error" role="alert">{message}</p>}
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer__container">
        <div className="lp-footer__grid">
          <div className="lp-footer__brand">
            <Link to="/" className="lp-footer__logo" aria-label="GabLive — início">
              <img src="/logo.svg" alt="" width="126" height="30" />
            </Link>
            <p className="lp-footer__tagline">
              Webinar analytics para operações que vendem conhecimento.
            </p>
          </div>

          <div className="lp-footer__col">
            <h3>Produto</h3>
            <ul>
              <li><a href="#features">Visão geral</a></li>
              <li><a href="#how-it-works">Como funciona</a></li>
              <li><a href="#agencies">Para agências</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>

          <div className="lp-footer__col">
            <h3>Acesso</h3>
            <ul>
              <li><a href="#waitlist">Lista de espera</a></li>
              <li><Link to="/auth/login">Entrar</Link></li>
            </ul>
          </div>

          <div className="lp-footer__col">
            <h3>Legal</h3>
            <ul>
              <li><a href="#privacy">Privacidade</a></li>
              <li><a href="mailto:contato@gablive.com.br">Contato</a></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <span>&copy; 2026 Gablive. Todos os direitos reservados.</span>
          <span>Dados para decidir. Controle para operar.</span>
        </div>
      </div>
    </footer>
  );
}

function CookieBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem('gablive-cookie-notice') !== 'accepted');
  }, []);

  const accept = () => {
    window.localStorage.setItem('gablive-cookie-notice', 'accepted');
    setVisible(false);
  };

  return (
    <aside className={`lp-cookie${visible ? ' is-visible' : ''}`} aria-label="Aviso de privacidade">
      <p>
        Usamos apenas recursos essenciais para o funcionamento da página.
        <a href="#privacy"> Saiba como tratamos seus dados.</a>
      </p>
      <button type="button" className="lp-btn lp-btn--primary" onClick={accept}>Entendi</button>
    </aside>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) return undefined;

    const elements = document.querySelectorAll(
      '.lp-story__intro, .lp-story__chapter, .lp-flow__head, .lp-flow__list li, .lp-agencies__copy, .lp-agencies__visual, .lp-faq__head, .lp-faq__items, .lp-waitlist__copy, .lp-waitlist__form',
    );
    elements.forEach((element) => element.classList.add('lp-reveal'));

    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    elements.forEach((element, index) => {
      element.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 60}ms`);
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      elements.forEach((element) => {
        element.classList.remove('lp-reveal', 'is-visible');
        element.style.removeProperty('--reveal-delay');
      });
    };
  }, []);

  return (
    <div className="lp">
      <a className="lp-skip" href="#main-content">Pular para o conteúdo</a>
      <ReadingProgress />
      <Navbar />
      <main id="main-content">
        <Hero />
        <ProductStory />
        <HowItWorks />
        <FAQ />
        <Waitlist />
      </main>
      <Footer />
      <CookieBar />
    </div>
  );
}
