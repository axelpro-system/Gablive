export const PAGE_TEMPLATE_PRESETS = [
  {
    id: 'gablive-premium',
    name: 'GabLive Premium',
    description: 'Experiência escura e editorial para webinars de alto valor.',
    type: 'registration',
    subtype: 'fixed_form',
    tone: 'dark',
    theme: {
      primaryColor: '#E31C23',
      backgroundColor: '#0F0F10',
      textColor: '#F4F4F5',
    },
    blocks: [
      {
        type: 'hero',
        data: {
          title: 'Transforme conhecimento em resultados reais',
          subtitle: 'Participe desta experiência ao vivo e descubra o método que está mudando o mercado.',
          cta: 'Garantir minha vaga',
        },
      },
      { type: 'countdown', data: {} },
      {
        type: 'form',
        data: {
          title: 'Garanta sua vaga gratuita',
          buttonText: 'Quero participar',
          fields: ['name', 'email', 'phone'],
        },
      },
      {
        type: 'benefits',
        data: {
          title: 'O que você vai aprender',
          items: [
            { title: 'Estratégia comprovada', description: 'Um passo a passo prático para aplicar imediatamente.' },
            { title: 'Decisões mais claras', description: 'Critérios objetivos para avançar com segurança.' },
            { title: 'Execução consistente', description: 'Ferramentas para transformar intenção em resultado.' },
            { title: 'Próximos passos', description: 'Um plano claro para continuar depois do evento.' },
          ],
        },
      },
      {
        type: 'testimonials',
        data: {
          title: 'Quem participou recomenda',
          items: [
            { text: 'Conteúdo direto, profundo e aplicável. Saí com clareza sobre o que fazer.', name: 'Mariana Silva', role: 'Empreendedora' },
            { text: 'A melhor aula que assisti sobre o tema. Mudou minha forma de executar.', name: 'Rafael Costa', role: 'Consultor' },
          ],
        },
      },
    ],
  },
  {
    id: 'conversao-direta',
    name: 'Conversão Direta',
    description: 'Página curta para campanhas rápidas e máxima captação.',
    type: 'registration',
    subtype: 'fixed_form',
    tone: 'light',
    theme: {
      primaryColor: '#E31C23',
      backgroundColor: '#FFFFFF',
      textColor: '#111827',
    },
    blocks: [
      {
        type: 'hero',
        data: {
          title: 'A aula que vai acelerar o seu próximo resultado',
          subtitle: 'Em um encontro objetivo, você aprenderá o essencial para sair do ponto atual.',
          cta: 'Reservar minha vaga',
        },
      },
      {
        type: 'form',
        data: {
          title: 'Inscreva-se gratuitamente',
          buttonText: 'Reservar minha vaga',
          fields: ['name', 'email'],
        },
      },
      { type: 'countdown', data: {} },
      {
        type: 'benefits',
        data: {
          title: 'Você vai sair com',
          items: [
            { title: 'Clareza', description: 'Entenda exatamente onde concentrar seus esforços.' },
            { title: 'Plano de ação', description: 'Saia da aula sabendo qual é o próximo passo.' },
          ],
        },
      },
    ],
  },
  {
    id: 'masterclass',
    name: 'Masterclass',
    description: 'Página completa para aulas, lançamentos e eventos educacionais.',
    type: 'registration',
    subtype: 'button_form',
    tone: 'warm',
    theme: {
      primaryColor: '#B01018',
      backgroundColor: '#FFF8F7',
      textColor: '#271719',
    },
    blocks: [
      {
        type: 'hero',
        data: {
          title: 'Masterclass: domine os fundamentos e avance com confiança',
          subtitle: 'Uma aula completa, construída para quem quer aprender com profundidade e aplicar com consistência.',
          cta: 'Participar da masterclass',
        },
      },
      { type: 'countdown', data: {} },
      {
        type: 'benefits',
        data: {
          title: 'Conteúdo da masterclass',
          items: [
            { title: 'Fundamentos', description: 'A base necessária para tomar decisões melhores.' },
            { title: 'Método', description: 'O processo completo apresentado passo a passo.' },
            { title: 'Aplicação', description: 'Exemplos para levar o conhecimento à prática.' },
          ],
        },
      },
      {
        type: 'testimonials',
        data: {
          title: 'Resultados de alunos',
          items: [
            { text: 'Finalmente consegui organizar o conhecimento e aplicar de forma simples.', name: 'Ana Martins', role: 'Aluna' },
          ],
        },
      },
      {
        type: 'form',
        data: {
          title: 'Confirme sua participação',
          buttonText: 'Quero assistir à masterclass',
          fields: ['name', 'email', 'phone'],
        },
      },
    ],
  },
];
