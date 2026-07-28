## Contexto

Depoimentos constroem confiança social. Precisa parecer autêntico.

## Critérios de Aceite

- [ ] 3-4 depoimentos com foto, nome, empresa, cargo
- [ ] Layout: carousel ou grid
- [ ] Aspas visuais
- [ ] Nomes e empresas placeholder realistas
- [ ] Avaliação visual (estrelas ou similar)
- [ ] Título: "Criadores que já convertem com o Gablive"

## Dependências

- Issue #1 (Estrutura base) — Wave 1

## Arquivos Afetados

- `src/pages/public/LandingPage.jsx` (seção Testimonials)
- `src/pages/public/LandingPage.css` (estilos dos depoimentos)

## Notas Técnicas

- Dados hardcoded (não precisa de API)
- Fotos: placeholder com iniciais ou UI Avatars
- Background: `--color-gray-50`
- Se carousel: CSS scroll-snap (sem lib extra)
