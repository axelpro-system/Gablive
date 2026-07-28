## Contexto

A LP precisa estar acessível em `/` (homepage) do app.

## Critérios de Aceite

- [ ] Rota `/` renderiza LandingPage
- [ ] Rota existente `/` (se houver) redireciona ou é substituída
- [ ] SEO: título da página "Gablive - Plataforma de Webinários"
- [ ] Meta description configurada
- [ ] Favicon funciona

## Dependências

- Issues #1, #2, #3 (Wave 1)
- Issues #4, #5, #6 (Wave 2)

## Arquivos Afetados

- `src/App.jsx` ou `src/routes.jsx` (adicionar rota)
- `index.html` (meta tags)

## Notas Técnicas

- Verificar se já existe rota `/` e ajustar
- Usar React Router 7 patterns
- Meta tags: viewport, og:image, twitter:card
