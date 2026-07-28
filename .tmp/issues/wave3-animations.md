## Contexto

Adicionar animações sutis que tornam a LP mais profissional e engaging.

## Critérios de Aceite

- [ ] Fade-in ao scroll (Intersection Observer)
- [ ] Hero: animação de entrada do texto
- [ ] Features: stagger animation nos cards
- [ ] CTA: pulse sutil no botão
- [ ] Transições suaves nos hovers
- [ ] Smooth scroll entre seções
- [ ] Performance: sem layout shift

## Dependências

- Issue #7 (Integração no router) — Wave 3

## Arquivos Afetados

- `src/pages/public/LandingPage.jsx` (adicionar observers)
- `src/pages/public/LandingPage.css` (keyframes e transitions)

## Notas Técnicas

- Usar CSS only quando possível
- Intersection Observer para scroll animations
- `prefers-reduced-motion` para acessibilidade
- Não usar libs de animação externas
- Manter 60fps
