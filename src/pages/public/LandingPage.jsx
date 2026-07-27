import { useEffect } from 'react';
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
  Check,
  Star,
  ArrowRight,
} from 'lucide-react';
import './LandingPage.css';

/* ============================================
   LANDING PAGE — Gablive
   Wave 1 + Wave 2 (Complete)
   ============================================ */

const PLANS = [
  {
    name: 'Starter',
    price: 'R$ 97',
    period: '/mês',
    desc: 'Para quem está começando',
    features: [
      '3 webinários/mês',
      '100 participantes por webinar',
      'Chat ao vivo',
      'Página de registro',
      'Analytics básico',
      'Suporte por e-mail',
    ],
    cta: 'Começar Grátis',
    popular: false,
  },
  {
    name: 'Pro',
    price: 'R$ 297',
    period: '/mês',
    desc: 'Para quem quer escalar',
    features: [
      'Webinários ilimitados',
      '500 participantes por webinar',
      'Chat + CTAs inteligentes',
      'Just-in-Time (evergreen)',
      'Analytics completo',
      'Notificações de prova social',
      'Suporte prioritário',
    ],
    cta: 'Começar Agora',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'R$ 997',
    period: '/mês',
    desc: 'Para grandes operações',
    features: [
      'Tudo do Pro',
      'Participantes ilimitados',
      'Multi-tenant com RLS',
      'API personalizada',
      'Integração CRM',
      'Suporte dedicado',
      'SLA garantido',
    ],
    cta: 'Falar com Vendas',
    popular: false,
  },
];

const TESTIMONIALS = [
  {
    name: 'Ana Silva',
    role: 'CEO, TechCourse',
    text: 'O Gablive transformou nosso funil de vendas. Taxa de conversão aumentou 340% depois que migramos para webinários Just-in-Time.',
    rating: 5,
  },
  {
    name: 'Pedro Santos',
    role: 'Diretor de Marketing, EduPlatform',
    text: 'O chat ao vivo e as notificações de prova social fazem uma diferença enorme. Nossos participantes sentem que estão em um evento real.',
    rating: 5,
  },
  {
    name: 'Maria Oliveira',
    role: 'Fundadora, ScaleUP',
    text: 'Finalmente uma plataforma de webinars brasileira que funciona. Analytics completos e suporte excepcional.',
    rating: 5,
  },
];

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

function Pricing() {
  return (
    <section className="lp-pricing" id="pricing">
      <div className="lp-pricing__container">
        <div className="lp-pricing__header">
          <h2 className="lp-pricing__title">Planos para cada fase</h2>
          <p className="lp-pricing__subtitle">
            Comece grátis. Escale quando estiver pronto.
          </p>
        </div>

        <div className="lp-pricing__grid">
          {PLANS.map((plan) => (
            <div
              className={`lp-pricing-card ${plan.popular ? 'lp-pricing-card--popular' : ''}`}
              key={plan.name}
            >
              {plan.popular && (
                <span className="lp-pricing-card__badge">Mais Popular</span>
              )}
              <h3 className="lp-pricing-card__name">{plan.name}</h3>
              <p className="lp-pricing-card__desc">{plan.desc}</p>
              <div className="lp-pricing-card__price">
                <span className="lp-pricing-card__amount">{plan.price}</span>
                <span className="lp-pricing-card__period">{plan.period}</span>
              </div>
              <ul className="lp-pricing-card__features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={16} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth/register"
                className={`lp-pricing-card__cta ${plan.popular ? 'lp-pricing-card__cta--primary' : ''}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="lp-testimonials" id="testimonials">
      <div className="lp-testimonials__container">
        <div className="lp-testimonials__header">
          <h2 className="lp-testimonials__title">
            Criadores que já convertem com o Gablive
          </h2>
          <p className="lp-testimonials__subtitle">
            Veja o que nossos clientes dizem sobre a plataforma.
          </p>
        </div>

        <div className="lp-testimonials__grid">
          {TESTIMONIALS.map((t) => (
            <div className="lp-testimonial-card" key={t.name}>
              <div className="lp-testimonial-card__stars">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={16} fill="var(--gablive-brand-red)" color="var(--gablive-brand-red)" />
                ))}
              </div>
              <p className="lp-testimonial-card__text">&ldquo;{t.text}&rdquo;</p>
              <div className="lp-testimonial-card__author">
                <div className="lp-testimonial-card__avatar">
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <strong className="lp-testimonial-card__name">{t.name}</strong>
                  <span className="lp-testimonial-card__role">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="lp-cta" id="cta">
      <div className="lp-cta__container">
        <h2 className="lp-cta__title">Pronto para converter?</h2>
        <p className="lp-cta__subtitle">
          Comece gratuitamente. Sem cartão de crédito. Cancele quando quiser.
        </p>
        <Link to="/auth/register" className="lp-cta__btn">
          Comece Grátis Agora
          <ArrowRight size={20} />
        </Link>
        <span className="lp-cta__note">Sem cartão de crédito necessário</span>
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
            <Link to="/" className="lp-footer__logo">
              gab<span>live</span>
            </Link>
            <p className="lp-footer__tagline">
              Plataforma de webinários para funil de vendas.
            </p>
          </div>

          <div className="lp-footer__col">
            <h4>Produto</h4>
            <ul>
              <li><a href="#features">Funcionalidades</a></li>
              <li><a href="#pricing">Preços</a></li>
              <li><a href="#demo">Demo</a></li>
              <li><a href="#testimonials">Depoimentos</a></li>
            </ul>
          </div>

          <div className="lp-footer__col">
            <h4>Recursos</h4>
            <ul>
              <li><a href="#">Documentação</a></li>
              <li><a href="#">API</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Suporte</a></li>
            </ul>
          </div>

          <div className="lp-footer__col">
            <h4>Empresa</h4>
            <ul>
              <li><a href="#">Sobre</a></li>
              <li><a href="#">Contato</a></li>
              <li><a href="#">Termos de Uso</a></li>
              <li><a href="#">Privacidade</a></li>
            </ul>
          </div>
        </div>

        <div className="lp-footer__bottom">
          <span>&copy; 2026 Gablive. Todos os direitos reservados.</span>
          <div className="lp-footer__social">
            <a href="#" aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="#" aria-label="YouTube">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="#" aria-label="LinkedIn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const sections = document.querySelectorAll('.lp-features, .lp-pricing, .lp-testimonials, .lp-cta');
    sections.forEach((s) => { s.style.opacity = '0'; s.style.transform = 'translateY(24px)'; s.style.transition = 'opacity 0.6s ease, transform 0.6s ease'; });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <CtaFinal />
      <Footer />
    </div>
  );
}
