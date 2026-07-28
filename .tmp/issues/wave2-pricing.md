## Contexto

Seção de pricing mostra os planos disponíveis. Precisa ser clara e guiar o usuário para o plano certo.

## Critérios de Aceite

- [ ] 3 planos: Starter, Pro, Enterprise
- [ ] Cards com preço, features listadas, CTA
- [ ] Destaque visual no plano "Pro" (mais popular)
- [ ] Toggle mensal/annual com desconto
- [ ] Features: limites de webinários, participantes, storage, suporte
- [ ] CTA: "Começar Agora" em todos os planos

## Dependências

- Issue #1 (Estrutura base) — Wave 1

## Arquivos Afetados

- `src/pages/public/LandingPage.jsx` (seção Pricing)
- `src/pages/public/LandingPage.css` (estilos dos cards de pricing)

## Notas Técnicas

- Preços placeholder (serão definidos depois)
- Plano Pro com borda `--color-primary-500` e badge "Mais Popular"
- Background: branco ou `--color-gray-50`
- Toggle: switch customizado com CSS
