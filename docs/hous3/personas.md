# Personas — HOUS3 (Gablive)

Escopo técnico. Papel no sistema, não perfil de marketing.
Fontes: `PRODUCT.md`, `brand-identity/modules/20_positioning.md`, `brand-identity/modules/30_audience-niche.md`, `Claude.md`, funil público e dashboard atuais, `docs/hous3/*.md`.

**Anti-persona (não cadastrar como persona):** iniciante no primeiro webinário, sem roteiro validado e sem mídia recorrente. Não sente a dor de timestamp/conversão; puxa o produto para “simplicidade” e infla escopo.

Hierarquia resumida: **Administrador da organização** origina a conta → **Operador** executa o funil → **Lead** consome a inscrição/sala → o Administrador consome isolamento e papéis.

---

Persona: Operador (presenter)
Analogia: é quem monta e liga a máquina de conversão do webinário — roteiro, oferta e mídia — não quem só transmite vídeo.

Quem opera na prática: operador de lançamento, mentor ou especialista de marketing digital da org; no banco o papel é `presenter`. Em time pequeno, a mesma pessoa também olha métricas e tráfego.

Contexto
Opera webinário como canal já validado, não como primeiro experimento. ICP de faturamento R$50 mil–R$2 milhões/mês; cliente-tipo citado: mentor B2B a ~R$300 mil/mês, 2 a 3 webinários JIT por semana com o mesmo roteiro, tráfego pago recorrente. Ciclo: criar webinário → página de registro → interações (chat, oferta, vendas, enquete, audiência) → e-mails → publicar link → acompanhar leads e funil por timestamp. Volume típico: dezenas a centenas de mensagens simuladas (CSV), várias ofertas de teste, prova social copiada de outro lançamento. Depende de YouTube/Vimeo para o vídeo, Hotmart/Selflux para compra aprovada virar inscrição, e de quem cuida de mídia para UTM. Não decide o checkout (fica na plataforma de vendas). Não é desenvolvedor: configura pelo painel, sem montar Zapier.

Frustração
Apagar chat/oferta/venda um a um depois de importar CSV — perde tempo de pitch e deixa CTA errado no ar.
Descobrir só no analytics (ou no reclamação do lead) que o JIT “diário” não gerava sessão, que a fila de espera ainda entrava na sala, ou que a prova social da inscrição era número inventado.
Otimizar roteiro no achismo: “quero saber exatamente em que segundo as pessoas saem, pra cortar aquele trecho e aumentar conversão em 3 a 5 pontos percentuais” — na base de R$300 mil/mês isso é R$9 mil a R$15 mil/mês. Sem timestamp, o orçamento de mídia continua no escuro.
Enquete no ar sem ver votos por opção no mesmo lugar em que ela foi criada — o total solto no analytics não fecha o ciclo.

Soluções atuais
EverWebinar / WebinarJam / Demio — resolvem evergreen e CTA; quebram em multi-tenant real (uma conta por cliente) e em analytics colado depois, sem cruzar segundo do vídeo com clique; custam stack + retrabalho de conta.
Zoom + ClickFunnels + planilha + Data Studio — resolvem live e página; quebram no JIT nativo, no chat/prova social sincronizados e no funil por timestamp; custam horas de emenda por lançamento.
CSV + lixeira item a item no próprio Gablive (antes da exclusão em massa) — resolvia limpar roteiro; quebrava em lista longa; custava retrabalho e risco de oferta velha no ar.
WhatsApp com o gestor de tráfego para “como está o funil?” — resolve alinhamento rápido; quebra sem número por segundo; custa delay de decisão de mídia.

Campos de apoio
O que NÃO faz: não processa pagamento (Hotmart/Selflux); não é o lead na sala; em org com admin separado, não gerencia convite de usuários nem auditoria da plataforma.
Papéis acumulados: com frequência acumula gestor de tráfego (lê UTM e analytics). O sistema não precisa de login separado — precisa de métricas no painel do operador.
Hierarquia / relação com outras personas: Administrador da org origina a conta → Operador executa webinário e interações → Lead se inscreve e assiste → Operador consome leads/analytics.
Features/RFs relacionadas: exclusão em massa Chat/Oferta/Vendas (`docs/hous3/exclusao-em-massa-interacoes.md`); JIT sessão/recorrência/duração; esconder oferta; resultados de enquete; replay no relógio da sessão; prova social real; agenda da sessão (`docs/hous3/funil-publico-complementar.md`).
Fontes: `PRODUCT.md` (primary persona); módulo 20 (categoria webinar-funil vs Zoom); módulo 30 (ICP, citação do segundo do vídeo); auditoria de tela vs processo no Gablive.
Pendências: [PENDENTE] Qual volume médio de webinários simultâneos por operador nesta base (hoje o número forte é 2–3 JIT/semana no cliente-tipo, não na amostra real de tenants)?

---

Persona: Lead
Analogia: é o prospecto que entra pelo link de captação e precisa chegar na sala certo, no horário certo, sem pedir ajuda no WhatsApp do operador.

Quem opera na prática: inscrito do webinário (participante). No domínio do produto: **lead**. No banco o papel público não exige conta Gablive; o acesso é o `?reg=` da inscrição.

Contexto
Chega de anúncio, e-mail ou recuperação de acesso. Fluxo: `/register/:slug` → (espera) `/wait` → `/room` → às vezes `/replay`. Frequência: uma jornada por oferta, eventualmente replay nas horas configuradas. No JIT, cada um tem relógio próprio (`session_start_at`). Depende do e-mail de confirmação para abrir a sala em outro aparelho. Não decide capacidade, oferta nem enquete — só preenche dados (nome, e-mail, WhatsApp se exigido), consente LGPD e assiste. Restrição: sem `?reg=` válido não deveria persistir inscrição recuperada só pelo e-mail.

Frustração
Cair na sala no meio ou numa espera que não acaba, quando o JIT promete “começa quando eu entro” e a sessão diária/semanal não estava ligada no relógio.
Estar na lista de espera e mesmo assim receber link de sala — ou o contrário: vaga confirmada e o e-mail não abrir a sessão em outro celular.
Ver “mais de 2.500 pessoas” na inscrição e perceber que o número não tem a ver com aquele webinário.
Não conseguir colocar a sessão na agenda porque o convite usava data genérica do webinário, não o horário da sessão dele.

Soluções atuais
Grupo de WhatsApp do lançamento pedindo “manda o link de novo” — resolve acesso; quebra a cada aparelho novo; custa atendimento do operador.
E-mail anterior / procurar no spam — resolve se o link tiver `?reg=`; quebra se o recover não reenviar ou se o token for de waitlist.
Google Agenda manual (copiar data da landing) — resolve quem tem data única; quebra no JIT; custa no-show.
Assistir o replay no YouTube aberto, fora da sala — resolve o vídeo; quebra oferta, chat e prazo de replay da plataforma.

Campos de apoio
O que NÃO faz: não configura webinário, não vê leads de outros, não aprova capacidade.
Hierarquia / relação com outras personas: Operador publica o link → Lead se inscreve e assiste → Operador consome o comportamento (assistência, CTA, voto).
Features/RFs relacionadas: registro + recover; fila de espera sem acesso à sala; JIT espera/sessão/duração; replay a partir da sessão; prova social real; agenda da sessão; audiência na espera.
Fontes: `Claude.md` (register_participant, recover só reenvia e-mail); funil `/register` `/wait` `/room` `/replay`; auditoria de waitlist e JIT.
Pendências: [PENDENTE] Qual taxa real de recover (“já sou inscrito, manda o link”) por webinário nesta base?

---

Persona: Administrador da organização
Analogia: é o dono da conta-tenant — quem separa cliente/marca e decide quem pode operar, não quem edita cada CTA.

Quem opera na prática: dono da agência, sócio da operação ou admin da org. No banco: `admin` (rótulo no painel: Administrador). Em mentor solo, a mesma pessoa é também Operador.

Contexto
ICP secundário: agências de lançamento que operam funil para terceiros e precisam de conta multi-cliente. Ciclo: abrir org → convitar operadores → (às vezes) templates de página, auditoria, integrações de venda no nível da org. Volume-alvo do posicionamento: “quem opera 15 webinários pra 15 clientes diferentes”. Restrição dura: isolamento por `org_id` + RLS; vazamento cross-tenant é falha crítica. Depende do Operador para o roteiro; o Lead nunca vê este painel. Maturidade: não precisa programar, mas exige que um login não misture leads de Cliente A com Cliente B.

Frustração
Plataforma de webinar-funil pensada para infoprodutor solo — “ninguém pensou em quem opera 15 webinários pra 15 clientes”. Conta separada por cliente, retrabalho de login, risco de mandar o link do cliente errado.
Não saber quem da equipe alterou webinário, integração ou convite — auditoria existe no Gablive precisamente porque essa cobrança aparece em operação multi-pessoa.
Integração de venda (Hotmart/Selflux) configurada no tenant errado ou com webhook que “compra aprovada não inscreveu” — o custo é lead pago que não entra no webinário.

Soluções atuais
Uma conta EverWebinar/WebinarJam por cliente — resolve isolamento tosco; quebra no custo operacional e no padrão de página; custa N logins e N faturas.
Planilha de “qual conta / qual slug / qual hottok” — resolve mapa mental; quebra em credencial desatualizada; custa incidente de webhook.
Grupo de WhatsApp da agência para “quem tem acesso a essa conta?” — resolve combinado; quebra quando alguém sai do time sem revogar; custa risco de acesso residual.

Campos de apoio
O que NÃO faz: não é o Lead; em time grande, não monta cada interação (isso é o Operador). Não é admin da plataforma Gablive (`/admin` de gateway).
Papéis acumulados: no mentor solo, Administrador = Operador. O sistema distingue `admin` vs `presenter`; a mesma pessoa física pode ter admin.
Hierarquia / relação com outras personas: Administrador origina org e convites → Operador executa webinários → Lead consome o funil público → Administrador consome isolamento, usuários e (quando há) auditoria.
Features/RFs relacionadas: multi-tenant/RLS; Users/convite; Audit; Integrations Hotmart/Selflux; templates de página da org; Settings da org.
Fontes: módulo 20 (multi-tenant, 15 webinários / 15 clientes); `PRODUCT.md` (secondary audience); `Claude.md` (gablive-rls-tenant, gablive-sales-integrations).
Pendências: [PENDENTE] Nesta base, quantas orgs são solo (admin=operador) vs agência com 2+ operadores?

---

Checklist antes de usar no Track
Há pelo menos uma persona por feature do roadmap atual (Operador e Lead cobrem o funil; Administrador cobre tenant).
Nenhum nome é “usuário” / “cliente” genérico.
Contexto tem número (faturamento, 2–3 JIT/semana, 15×15 no discurso de agência).
Frustração não é “falta de sistema”.
Soluções atuais nomeiam ferramenta e o que ela ainda faz bem.
Pendências estão como pergunta, não como regra.
