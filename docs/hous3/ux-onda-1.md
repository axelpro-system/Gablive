# Funcionalidades HOUS3: UX Onda 1

**Destino:** release atual. Já implementadas na branch `fix/ux-onda-1`; falta a verificação manual no navegador.
**Personas:** Operador (principal) e Lead. Ver `docs/hous3/personas.md`.
**Origem:** auditoria `docs/audits/2026-09-24-ux-codigo.md` (Onda 1) → spec `.specs/features/ux-onda-1/spec.md` (os IDs UX1-xx aparecem em "Referências" como alias de rastreio).

**Fora do modelo de funcionalidade:** UX1-11 (os modais estavam sem fundo escurecido, por causa de uma classe CSS inexistente) e UX1-12 (os KPIs dos Relatórios estavam sem estilo) são **defeitos**, não capacidades novas. Nenhuma persona pediria "quero que o modal tenha fundo". Por isso ficam registrados como bug/task na spec e não entram no Track como funcionalidade.

---

# Como operador, quero que o horário do webinário apareça e seja gravado no meu fuso, para não mandar os leads para uma sessão no horário errado

## Descrição
### Contexto
Configurar webinário → aba Configuração, ao revisar ou ajustar a data depois de criar o webinário.

### Problema atual
O campo mostrava o horário em UTC e gravava lendo como hora local. No Brasil (UTC-3), um webinário marcado para 20:00 aparecia como 23:00. Se o operador mexesse só nos minutos, o horário gravado andava 3 horas, e a contagem regressiva, os lembretes por e-mail e a sala passavam a seguir o horário errado. Limpar o campo quebrava a tela.

### Resultado esperado
O operador vê e grava exatamente o horário que escolheu, e editar o webinário nunca desloca a sessão.

### Escopo
Inclui:
- exibir o horário gravado no fuso do navegador do operador;
- gravar o horário escolhido sem deslocamento;
- aceitar o campo vazio.

Não inclui:
- o seletor de fuso da tela de criação, que hoje é decorativo (Onda 2);
- exibir data, hora e fuso para o lead na inscrição (Onda 2).

### Pendências conhecidas
- O operador que atende leads de outro país deve poder gravar num fuso diferente do fuso do navegador? Decidir na Onda 2.

## Referências
- `docs/hous3/personas.md` (Operador, frustração com JIT e horário de sessão)
- `.specs/features/ux-onda-1/spec.md`: UX1-01, UX1-02, UX1-03
- `docs/audits/2026-09-24-ux-codigo.md`, achado 2

## Personas relacionadas
- Principal: Operador
- Secundárias: Lead (recebe o horário na espera, na sala e nos e-mails)

## Business Points
- 5 BP
- Justificativa: o horário errado derruba o comparecimento de um webinário inteiro e afeta todos os leads daquela sessão.

## Design
- Requer design? Não. Mantém o campo de data existente.

## Requisitos funcionais
- RF-001 — Ao abrir a aba Configuração, o campo de data e hora deve mostrar o horário gravado convertido para o fuso do navegador do operador.
- RF-002 — Ao salvar, o sistema deve gravar o instante correspondente ao horário local escolhido, sem deslocamento de fuso.
- RF-003 — Quando o operador altera apenas os minutos, a hora gravada deve permanecer a hora escolhida.
- RF-004 — Quando o campo é esvaziado, o sistema deve gravar o webinário sem data, sem erro na tela.

## Destino
- Release atual

---

# Como lead, quero ver o preço da oferta no formato de reais, para decidir a compra sem desconfiar do valor

## Descrição
### Contexto
Sala do webinário, no momento em que a oferta aparece durante o pitch.

### Problema atual
O preço aparecia como "R$ 497.00", com ponto decimal e sem separador de milhar. Justo no momento da decisão, o valor parece erro de sistema ou preço estrangeiro. O editor de interações do operador mostrava o mesmo formato.

### Resultado esperado
O lead lê "R$ 1.497,00", e o preço riscado segue o mesmo padrão.

### Escopo
Inclui:
- preço de oferta e preço original na sala;
- o mesmo formato na pré-visualização do editor de interações.

Não inclui:
- ofertas em outra moeda;
- parcelamento ("12x de…").

### Pendências conhecidas
- Existem ofertas em moeda diferente de BRL? Hoje o campo não tem moeda, então tudo é formatado em reais.

## Referências
- `docs/hous3/personas.md` (Lead)
- `.specs/features/ux-onda-1/spec.md`: UX1-04

## Personas relacionadas
- Principal: Lead
- Secundárias: Operador (confere o preço no editor)

## Business Points
- 3 BP
- Justificativa: afeta a leitura do preço exatamente no ponto de conversão, em todas as ofertas com preço.

## Design
- Requer design? Não.

## Requisitos funcionais
- RF-001 — A sala deve exibir o preço da oferta no padrão monetário brasileiro (ex.: R$ 1.497,00).
- RF-002 — Quando houver preço original, ele deve aparecer riscado, no mesmo padrão.
- RF-003 — Quando o preço estiver vazio ou não for numérico, a sala não deve exibir a linha de preço.
- RF-004 — O editor de interações deve exibir os preços no mesmo formato da sala.

## Destino
- Release atual

---

# Como operador, quero saber se minhas alterações foram realmente salvas, para não publicar um funil achando que e-mails e configurações estão ativos

## Descrição
### Contexto
Configurar webinário → abas E-mails, Configuração e Tela de Entrada, antes de publicar o link.

### Problema atual
- Na aba E-mails, o sistema dizia "salvas com sucesso" mesmo quando a gravação falhava, e o operador saía achando que a régua de lembretes estava ativa.
- Na Configuração, uma falha ao salvar não mostrava nada.
- Na Tela de Entrada, não havia retorno nenhum. Se o carregamento falhasse, a tela ficava num carregamento infinito.

### Resultado esperado
Todo salvamento informa sucesso ou falha na própria tela, e uma falha de carregamento oferece nova tentativa.

### Escopo
Inclui:
- aviso de sucesso ou erro nas três abas;
- nova tentativa quando a Tela de Entrada não carrega.

Não inclui:
- aviso ao sair com alterações não salvas (Onda 4);
- troca do campo de HTML dos e-mails por um editor visual.

### Pendências conhecidas
- Nenhuma bloqueante.

## Referências
- `docs/hous3/personas.md` (Operador)
- `.specs/features/ux-onda-1/spec.md`: UX1-05, UX1-06, UX1-07, UX1-08

## Personas relacionadas
- Principal: Operador
- Secundárias: Lead (recebe ou deixa de receber os lembretes)

## Business Points
- 3 BP
- Justificativa: evita a régua de e-mails "fantasma", que reduz o comparecimento sem ninguém perceber.

## Design
- Requer design? Não. Reutiliza o aviso já usado em Configurações da conta.

## Requisitos funcionais
- RF-001 — Quando todos os e-mails forem salvos, o sistema deve exibir uma confirmação de sucesso.
- RF-002 — Quando qualquer e-mail falhar ao salvar, o sistema deve informar quantos falharam e não deve exibir a confirmação de sucesso.
- RF-003 — Ao salvar a Configuração, o sistema deve exibir sucesso ou falha na própria tela.
- RF-004 — Ao salvar a Tela de Entrada, o sistema deve exibir sucesso ou falha na própria tela.
- RF-005 — Quando a Tela de Entrada não puder ser carregada, o sistema deve informar a falha e oferecer "Tentar de novo".
- RF-006 — Quando o JIT tem recorrência e não há horário de sessão, o sistema deve impedir o salvamento e informar o que falta.

## Destino
- Release atual

---

# Como operador, quero confirmar antes de encerrar a transmissão ao vivo, para não derrubar a sala dos leads por um clique acidental

## Descrição
### Contexto
Configurar webinário → cabeçalho, durante uma transmissão ao vivo.

### Problema atual
Um único clique em "Encerrar ao vivo" encerrava a sala para todos os participantes, no meio do pitch se fosse o caso. Os erros apareciam numa janela nativa do navegador.

### Resultado esperado
Encerrar exige confirmação explícita. Iniciar continua com um clique.

### Escopo
Inclui:
- confirmação antes de encerrar;
- erro exibido ao lado do botão.

Não inclui:
- mostrar quantas pessoas estão assistindo na confirmação;
- agendar o encerramento.

### Pendências conhecidas
- A confirmação deve mostrar quantas pessoas estão na sala? Depende de uma contagem em tempo real que ainda não existe no painel.

## Referências
- `docs/hous3/personas.md` (Operador e Lead)
- `.specs/features/ux-onda-1/spec.md`: UX1-09, UX1-10

## Personas relacionadas
- Principal: Operador
- Secundárias: Lead (perde a sala se o encerramento for acidental)

## Business Points
- 3 BP
- Justificativa: evento raro, mas irreversível no ao vivo, e atinge a sessão inteira.

## Design
- Requer design? Não. Diálogo de confirmação no padrão de modal existente.

## Requisitos funcionais
- RF-001 — Ao clicar em "Encerrar ao vivo", o sistema deve pedir confirmação antes de alterar o status.
- RF-002 — Quando o operador cancela, o webinário deve continuar ao vivo.
- RF-003 — Durante a mudança de status, a confirmação não deve aceitar um segundo clique.
- RF-004 — Quando a mudança de status falha, o sistema deve informar a falha ao lado do controle, sem janela do navegador.
- RF-005 — "Iniciar ao vivo" não deve pedir confirmação.

## Destino
- Release atual

---

# Como lead, quero ver o motivo quando minha inscrição não é aceita, para corrigir e me inscrever sem desistir

## Descrição
### Contexto
Página de inscrição `/register/:slug`, depois de tocar em "enviar", geralmente no celular.

### Problema atual
A mensagem de erro dependia de um estilo que só carrega nas telas de login e podia aparecer sem formatação. Ela ficava no topo do cartão: no celular, depois do toque em enviar, ficava fora da tela, e o lead não entendia por que nada aconteceu.

### Resultado esperado
O erro aparece destacado, é anunciado para leitor de tela e a página rola até ele.

### Escopo
Inclui:
- estilo próprio do erro na página de inscrição;
- rolagem até a mensagem;
- anúncio para leitor de tela.

Não inclui:
- tratar "já inscrito" como sucesso com acesso direto à sala (Onda 2);
- revisar o texto das mensagens.

### Pendências conhecidas
- Nenhuma bloqueante.

## Referências
- `docs/hous3/personas.md` (Lead)
- `.specs/features/ux-onda-1/spec.md`: UX1-14

## Personas relacionadas
- Principal: Lead
- Secundárias: Operador (perde inscrições quando o lead desiste)

## Business Points
- 3 BP
- Justificativa: atrito direto na captação, a primeira etapa do funil, com tráfego pago.

## Design
- Requer design? Não.

## Requisitos funcionais
- RF-001 — Quando a inscrição for recusada, a página deve exibir o motivo em destaque, junto ao formulário.
- RF-002 — Ao exibir o erro, a página deve rolar até a mensagem.
- RF-003 — A mensagem de erro deve ser anunciada por tecnologias assistivas.
- RF-004 — O erro deve ter a mesma aparência em qualquer ordem de navegação (com ou sem passagem pelas telas de login).

## Destino
- Release atual

---

# Como lead, quero ler as respostas do assistente de IA no chat, para tirar dúvidas durante a oferta

## Descrição
### Contexto
Sala do webinário → chat, quando o agente de IA está ativo.

### Problema atual
A resposta da IA usava texto quase branco sobre fundo rosa claro e ficava praticamente ilegível.

### Resultado esperado
A resposta da IA tem contraste de leitura adequado (pelo menos 4.5:1).

### Escopo
Inclui: a cor do texto da mensagem da IA.
Não inclui: layout do chat, rolagem automática (Onda 2).

### Pendências conhecidas
- Nenhuma.

## Referências
- `.specs/features/ux-onda-1/spec.md`: UX1-13

## Personas relacionadas
- Principal: Lead

## Business Points
- 1 BP
- Justificativa: melhoria localizada, que só vale nos webinários com agente de IA ligado.

## Design
- Requer design? Não.

## Requisitos funcionais
- RF-001 — A mensagem do assistente de IA deve ter contraste mínimo de 4.5:1 entre texto e fundo.

## Destino
- Release atual

---

# Como operador, quero ter confirmação ao copiar o link de inscrição, para divulgar o link certo sem precisar colar e conferir

## Descrição
### Contexto
Lista de webinários → menu de ações (⋮), ao divulgar o webinário.

### Problema atual
"Copiar link" não dava nenhum retorno, e uma falha da área de transferência passava despercebida. O menu não fechava ao clicar fora nem com Esc, e o botão ⋮ não tinha nome para leitor de tela.

### Resultado esperado
O operador vê "Link de inscrição copiado" (ou o erro), e o menu se comporta como um menu comum.

### Escopo
Inclui:
- aviso de sucesso ou falha ao copiar;
- fechar o menu com clique fora e com Esc;
- nome acessível no botão ⋮.

Não inclui:
- botão de copiar link na tela de edição (Onda 4);
- navegação por setas dentro do menu.

### Pendências conhecidas
- Nenhuma.

## Referências
- `.specs/features/ux-onda-1/spec.md`: UX1-15, UX1-16

## Personas relacionadas
- Principal: Operador

## Business Points
- 1 BP
- Justificativa: melhoria incremental numa ação frequente, sem risco de perda.

## Design
- Requer design? Não.

## Requisitos funcionais
- RF-001 — Ao copiar o link com sucesso, o sistema deve exibir uma confirmação temporária.
- RF-002 — Quando a cópia falha, o sistema deve informar a falha e orientar onde copiar o link.
- RF-003 — O menu de ações deve fechar ao clicar fora dele.
- RF-004 — O menu de ações deve fechar ao pressionar Esc.
- RF-005 — O botão do menu deve informar a leitores de tela o webinário a que pertence e se está aberto.

## Destino
- Release atual
