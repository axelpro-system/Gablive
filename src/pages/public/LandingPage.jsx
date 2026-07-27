import { Link } from 'react-router-dom';
import {
  Video,
  Zap,
  MessageCircle,
  Target,
  BarChart3,
  Building2,
  ChevronRight,
  Play,
} from 'lucide-react';
import './LandingPage.css';

/* ============================================
   LANDING PAGE — Gablive
   Hero + Features (Wave 1)
   ============================================ */

const FEATURES = [
  {
    icon: Video,
    title: 'Webinários ao vivo',
    desc: 'Transmita ao vivo para sua audiência com qualidade profissional. Suporte a YouTube e Vimeo.',
  },
  {
    icon: Zap,
    title: 'Just-in-Time',
    desc: 'Webinários evergreen que iniciam quando o participante entra. Sem espera, sem fricção.',
  },
  {
    icon: MessageCircle,
    title: 'Chat ao vivo',
    desc: 'Interação em tempo real com seus participantes. Mensagens, enquetes e prova social.',
  },
  {
    icon: Target,
    title: 'CTAs Inteligentes',
    desc: 'Ofertas que aparecem no momento certo do webinar. Banners com preço e promoção.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Acompanhe registros, taxa de comparecimento, conversão e tempo médio de exibição.',
  },
  {
    icon: Building2,
    title: 'Multi-tenant',
    desc: 'Isolamento total por organização com segurança RLS. Seus dados protegidos.',
  },
];

function Navbar() {
  return (
    <nav className="lp-navbar">
      <Link to="/" className="lp-navbar__logo">
        gab<span>live</span>
      </Link>

      <ul className="lp-navbar__links">
        <li><a href="#features">Produto</a></li>
        <li><a href="#pricing">Preços</a></li>
        <li><a href="#testimonials">Depoimentos</a></li>
      </ul>

      <Link to="/auth/register" className="lp-navbar__cta">
        Começar Agora
        <ChevronRight size={16} />
      </Link>

      <button className="lp-navbar__mobile-toggle" aria-label="Menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </nav>
  );
}

function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-hero__container">
        <div className="lp-hero__content">
          <div className="lp-hero__badge">
            <Zap size={14} />
            Plataforma de Webinários
          </div>

          <h1 className="lp-hero__title">
            Converta mais com <span>webinários ao vivo</span>
          </h1>

          <p className="lp-hero__subtitle">
            Crie webinários que vendem. Ao vivo, gravados ou Just-in-Time.
            Com chat, CTAs inteligentes e analytics completos.
          </p>

          <div className="lp-hero__actions">
            <Link to="/auth/register" className="lp-hero__cta-primary">
              Começar Grátis
              <ChevronRight size={18} />
            </Link>
            <a href="#demo" className="lp-hero__cta-secondary">
              <Play size={18} />
              Ver Demo
            </a>
          </div>
        </div>

        <div className="lp-hero__mockup">
          <div className="lp-hero__mockup-bar">
            <span className="lp-hero__mockup-dot lp-hero__mockup-dot--red" />
            <span className="lp-hero__mockup-dot lp-hero__mockup-dot--yellow" />
            <span className="lp-hero__mockup-dot lp-hero__mockup-dot--green" />
          </div>
          <div className="lp-hero__mockup-content">
            <div className="lp-hero__mockup-video">
              <div className="lp-hero__mockup-play">
                <Play size={20} color="#fff" fill="#fff" />
              </div>
            </div>
            <div className="lp-hero__mockup-chat">
              <div className="lp-hero__mockup-msg">
                <span className="lp-hero__mockup-msg-dot" />
                Ana: Adorei essa aula!
              </div>
              <div className="lp-hero__mockup-msg">
                <span className="lp-hero__mockup-msg-dot" />
                Pedro: Quando abre a oferta?
              </div>
              <div className="lp-hero__mockup-msg">
                <span className="lp-hero__mockup-msg-dot" />
                Maria: Já comprei! 🎉
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="lp-features" id="features">
      <div className="lp-features__container">
        <div className="lp-features__header">
          <h2 className="lp-features__title">Tudo que você precisa para converter</h2>
          <p className="lp-features__subtitle">
            Ferramentas completas para criar, apresentar e converter com webinários.
          </p>
        </div>

        <div className="lp-features__grid">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div className="lp-feature-card" key={title}>
              <div className="lp-feature-card__icon">
                <Icon size={24} />
              </div>
              <h3 className="lp-feature-card__title">{title}</h3>
              <p className="lp-feature-card__desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="lp">
      <Navbar />
      <Hero />
      <Features />
      {/* Wave 2: Pricing, Testimonials, CTA, Footer */}
    </div>
  );
}
