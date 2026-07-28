## Contexto

Verificar que a LP funciona em todos os devices e que as features estão presentes.

## Critérios de Aceite

- [ ] Teste: página carrega em `/`
- [ ] Teste: hero visível com CTA
- [ ] Teste: 6 features visíveis
- [ ] Teste: 3 planos de pricing
- [ ] Teste: 3 depoimentos
- [ ] Teste: CTA final visível
- [ ] Teste: footer com links
- [ ] Teste: responsivo (mobile viewport)
- [ ] Teste: scroll suave funciona

## Dependências

- Issue #7 (Integração no router) — Wave 3
- Issue #8 (Animações) — Wave 3

## Arquivos Afetados

- `tests/e2e/landing-page.spec.js` (novo)

## Notas Técnicas

- Usar Playwright ou test runner existente
- Testar em viewport mobile e desktop
- Verificar que não há erros no console
