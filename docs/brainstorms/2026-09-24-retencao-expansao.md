# Sessão de brainstorming: como fazer operadores e agências continuarem no Gablive, pagarem mais e trazerem novos clientes?

**Data**: 2026-09-24
**Objetivo**: estratégia
**Facilitador**: Atlas (analyst)
**Participantes**: uma única sessão de modelo, que analisou o tema sob quatro pontos de vista: produto (PM), experiência (UX), crescimento (Growth) e arquitetura. Nenhum agente externo foi acionado e nenhum humano participou.
**Contexto usado**: `PRODUCT.md`, `investor-materials/facts.md`, `specs/backlog-v1.5-v2-SPEC.md`, `supabase/functions/`, `supabase/migrations/`

## Contexto: o que o repositório mostra hoje

- **Ainda não existe cobrança.** Não há tabela de plano ou assinatura, e o Firepay está previsto na v2, em modo mock. Em `investor-materials/facts.md`, preço, MRR, churn e clientes pagantes estão todos como `[A PREENCHER]`.
- **A atribuição de vendas já existe.** A Edge Function `purchase-webhook` recebe vendas da Hotmart e da SellFlux. É a base para provar ROI.
- **O tempo assistido é medido por inscrito.** A migration `023_registration_watch_seconds.sql` guarda o total de segundos assistidos, mas não guarda o momento em que cada pessoa saiu (curva de abandono).
- **A IA usa a chave do próprio cliente.** A função `save-org-gemini-key` salva a chave Gemini de cada organização. Isso enfraquece a ideia de "tokens de IA" como receita: quem paga o provedor é o cliente, não o Gablive.
- **Já existem estruturas multi-tenant, usuários com papéis, arquivamento e templates de webinar** (migration `030`). Tudo isso serve de base para o custo de troca e para expansão por assento ou por tenant.

**Conclusão central:** hoje não é possível medir retenção nem expansão, porque não há cobrança nem eventos de valor por organização. Toda estratégia precisa começar por aí.

## SWOT de retenção e expansão

| | Positivo | Negativo |
|---|---|---|
| **Interno** | **Forças:** multi-tenant nativo com RLS; JIT evergreen (o webinar roda sem o operador); atribuição de vendas via webhook; ferramentas de IA na sala | **Fraquezas:** sem cobrança e sem planos; nenhum dado de uso ou de saúde por organização; analytics sem curva de abandono; nenhum caso real (`PRODUCT.md` proíbe inventar depoimentos) |
| **Externo** | **Oportunidades:** agências gerenciam vários clientes (expansão natural por tenant); WebinarJam e EverWebinar não têm multi-tenant nativo; benchmarks entre organizações (efeito de rede de dados) | **Ameaças:** uso sazonal (lançamentos acontecem poucas vezes por ano, então o cliente cancela entre um e outro); é fácil trocar por Zoom + ClickFunnels; a chave de IA própria reduz o custo de troca |

**Maior risco estratégico:** o churn entre lançamentos. Um operador que só faz lançamentos pontuais paga, usa por um mês e cancela. O JIT evergreen é o antídoto natural, porque transforma o uso pontual em uso contínuo.

## Ideias geradas: 20

### A. Base de medição (4 ideias)

1. **Eventos de valor por organização:** webinar publicado, inscritos, presença, clique em CTA e venda atribuída. É isso que define uma "organização saudável". (PM)
2. **Health score por organização** no `AdminGatewayPage`: dias desde o último webinar ativo, inscritos por semana e vendas atribuídas, com um alerta de risco de churn. (PO)
3. **Métrica-norte: receita atribuída ao Gablive por organização por mês.** Ela já pode ser medida com o `purchase-webhook`. (Growth)
4. **Curva de abandono por timestamp:** registrar os marcos de tempo assistido, e não só o total. Isso sustenta a promessa da própria landing ("Analytics de webinar por timestamp"). (Arquitetura)

### B. Retenção por valor recorrente (4 ideias)

5. **Relatório mensal automático por e-mail**, enviado pelo Resend: "seu webinar gerou X inscritos, Y cliques e R$ Z em vendas". Isso lembra o cliente do valor que recebe todo mês. (Growth)
6. **O onboarding leva ao JIT evergreen:** o primeiro webinar criado já sai configurado para rodar sempre. O valor passa a ser contínuo, sem trabalho do operador. (PM)
7. **Diagnóstico com recomendação:** "37% saíram no minuto 18; mova o CTA para o minuto 15". É um motivo para o cliente voltar ao painel. (UX)
8. **Alertas proativos:** queda na taxa de presença, e-mails com bounce, webinar evergreen sem inscrições há 7 dias. (PO)

### C. Custo de troca saudável (4 ideias)

9. **Integrações de vendas e CRM como âncora** (Hotmart, SellFlux e, depois, ActiveCampaign e ManyChat). Cada integração ativa torna a troca mais cara. (Arquitetura)
10. **Biblioteca de templates e páginas da organização**, que se acumula ao longo do tempo (v1 "Páginas"). (Arquitetura)
11. **Histórico comparativo entre edições** do mesmo webinar, um dado que só existe dentro do Gablive. (PM)
12. **Domínio próprio:** a URL que o cliente divulga passa a morar no Gablive. (Arquitetura)

### D. Expansão de receita por conta (4 ideias)

13. **Preço por organização cliente para agências:** cada novo cliente da agência vira receita de expansão automaticamente. (PM)
14. **Add-ons:** domínio próprio, remoção da marca, split test e volume extra de e-mails. (Growth)
15. **Assentos por papel** (admin, operador, atendente) com base no `UsersPage`, que já existe. (PM)
16. **Carta fora da curva: preço atrelado ao resultado.** Uma pequena porcentagem sobre as vendas atribuídas, no lugar da mensalidade, para quem só faz lançamentos. Isso ataca de frente o churn sazonal, mas é arriscado. (Growth)

### E. Expansão por rede (4 ideias)

17. **"Powered by Gablive"** nas páginas públicas dos planos de entrada. Os visitantes dos clientes viram canal de aquisição. (Growth)
18. **Programa de parceiros para agências:** white-label no plano mais alto e comissão por indicação. (Growth)
19. **Carta fora da curva: benchmark anônimo entre organizações.** Por exemplo: "sua presença está 12 pontos abaixo da mediana de webinars do seu nicho". Só é possível porque o produto é multi-tenant, e cria um efeito de rede de dados. (PM)
20. **Cliente zero:** rodar lançamentos reais no Gablive para gerar o primeiro caso verificável, já que `PRODUCT.md` proíbe inventar depoimentos. (Growth)

## Recomendações priorizadas

As notas são **estimativas minhas**, sem dados de uso por trás. Valor e esforço vão de 1 a 10, e ROI = valor ÷ esforço. A ordem abaixo segue a dependência entre as ideias, não apenas o ROI.

| # | Ideia | Valor | Esforço | ROI |
|---|---|---|---|---|
| 1 | Eventos de valor + health score + métrica-norte (1, 2, 3) | 9 | 4 | 2,25 |
| 2 | Decisão do modelo de preço: por tenant + add-ons (13, 14) | 9 | 5 | 1,80 |
| 3 | Relatório mensal de resultado (5) | 8 | 3 | 2,67 |
| 4 | Onboarding que leva ao JIT evergreen (6) | 8 | 3 | 2,67 |
| 5 | Cliente zero com caso real (20) | 7 | 3 | 2,33 |
| 6 | Curva de abandono + diagnóstico (4, 7) | 8 | 5 | 1,60 |
| 7 | Integrações de vendas e CRM como âncora (9) | 8 | 4 | 2,00 |

### 1. Instrumentação de valor por organização
**Por que importa:** sem ela, retenção e expansão não podem ser medidas nem gerenciadas. É pré-requisito de todas as outras.
**Próximos passos:**
- Definir de 5 a 7 eventos de valor e criar a tabela `org_value_events`, com RLS por `org_id`.
- Criar uma RPC que agregue o health score e exibi-lo no `AdminGatewayPage`.
- Registrar em `investor-materials/facts.md` a métrica-norte "receita atribuída por organização por mês".

### 2. Modelo de preço
**Por que importa:** a expansão só acontece se o preço cresce junto com o uso. Tokens de IA não servem como eixo principal, porque o cliente usa a própria chave Gemini.
**Próximos passos:**
- Decidir o eixo principal: por tenant (agência), por assento, por inscritos ou um modelo híbrido. Recomendação inicial: **por organização cliente, com uma franquia de inscritos**.
- Listar quais recursos existentes viram add-on.
- Levar a decisão ao @pm para o PRD de cobrança (hoje o Firepay está em mock na v2).

### 3. Relatório mensal de resultado
**Por que importa:** é barato de fazer, porque o Resend, a fila de e-mail e o `purchase-webhook` já existem, e combate o churn silencioso.
**Próximos passos:**
- Criar um job mensal que reutilize o `process-email-queue`.
- Escrever um template com inscritos, presença, cliques e vendas atribuídas no período.
- Adicionar opt-out por organização.

### 4. Onboarding que leva ao JIT evergreen
**Por que importa:** é o principal antídoto contra o churn sazonal de lançamentos.
**Próximos passos:**
- Na tela `CreateWebinarPage`, sugerir o modo JIT como padrão depois do primeiro webinar ao vivo.
- Oferecer a ação "converter este ao vivo em evergreen" ao final do evento, reaproveitando a gravação.

### 5. Cliente zero
**Por que importa:** a retenção depende de o cliente acreditar no ROI, e hoje não existe nenhuma prova.
**Próximos passos:**
- Escolher 1 ou 2 lançamentos reais para rodar no Gablive, com a atribuição de vendas ligada.
- Documentar os números reais em `investor-materials/facts.md`.

## Principais insights

1. **O inimigo da retenção é a sazonalidade, não a concorrência.** O JIT evergreen e o preço por resultado são as duas respostas estruturais.
2. **A expansão mais natural é por agência e por tenant**, porque o multi-tenant já existe e o principal concorrente direto não o oferece.
3. **Tokens de IA não são alavanca de receita** enquanto a chave pertencer ao cliente. Ou o Gablive passa a revender a IA, ou ela vira apenas um recurso de retenção.
4. **Medição vem primeiro.** Sem eventos de valor, qualquer iniciativa desta lista fica sem feedback.

## Dados da sessão

- **Ideias geradas:** 20
- **Categorias:** 5
- **Recomendações com próximos passos:** 5 detalhadas (7 no ranking)
- **Próximo agente sugerido:** @pm, para transformar as recomendações 1 e 2 em PRD
