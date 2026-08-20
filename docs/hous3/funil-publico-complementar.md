# Funcionalidades HOUS3 — funil público complementar

Destino: release atual. Persona principal: operador; secundária: lead.
Referências: `PRODUCT.md`, `docs/MANUAL-CRIAR-WEBINAR.md`, auditoria de JIT e funil.

---

# Como operador, quero definir quando a oferta some na sala, para o CTA não ficar no ar depois do pitch

## Descrição
### Contexto
Configurar webinário → Interações → Ofertas, durante o pitch.

### Problema atual
A sala já esconde a oferta se `hide_at_seconds` existir, mas o editor só tem “Mostrar em”. O operador não consegue encerrar o CTA.

### Resultado esperado
O operador informa o instante de saída. Sem valor, a oferta permanece até o lead fechar.

### Escopo
Inclui: campo opcional “Esconder em”; persistência; a sala respeita o intervalo.
Não inclui: esconder por clique de compra; A/B.

## Business Points
3 BP — reduz CTA residual no replay e depois da oferta.

## Design
Não.

## Requisitos funcionais
- RF-001 — O operador deve conseguir informar um instante opcional para esconder a oferta.
- RF-002 — Sem instante de saída, a oferta permanece visível depois de aparecer (até o lead dispensar).
- RF-003 — Com instante de saída, a sala deve ocultar a oferta quando o vídeo passar desse tempo.

## Destino
Release atual

---

# Como operador, quero ver os votos de cada enquete, para saber como a audiência respondeu

## Descrição
### Contexto
Interações → Enquetes, depois que a sala coletou votos.

### Problema atual
O lead vota. O painel só lista pergunta e opções. O total aparece no analytics, sem quebra por opção.

### Resultado esperado
Cada enquete mostra votos por opção e o total.

### Escopo
Inclui: totais por opção na lista da enquete.
Não inclui: gráfico; export CSV da enquete; apagar votos.

## Business Points
3 BP — fecha o ciclo da enquete no mesmo lugar em que ela é configurada.

## Design
Não.

## Requisitos funcionais
- RF-001 — A lista de enquetes deve apresentar a quantidade de votos de cada opção.
- RF-002 — A lista deve apresentar o total de votos da enquete.
- RF-003 — Sem votos, a enquete deve indicar que ainda não houve resposta.

## Destino
Release atual

---

# Como lead, quero que o replay expire a partir da minha sessão, para o prazo bater com o Just in Time

## Descrição
### Contexto
Pós-sessão → `/replay/:slug`.

### Problema atual
A validade usa `scheduled_at` do webinário. No JIT pessoal isso ignora `session_start_at`.

### Resultado esperado
O prazo conta a partir do início da sessão do lead (ou da data única, se não for JIT).

### Escopo
Inclui: expiração com `session_start_at` ou `scheduled_at`; replay desligado continua indisponível.
Não inclui: vender replay à parte.

## Business Points
3 BP — o replay deixa de mentir no evergreen.

## Design
Não.

## Requisitos funcionais
- RF-001 — Com replay ligado e relógio da sessão, o prazo deve começar nesse relógio.
- RF-002 — Sem relógio de sessão, o prazo deve usar a data do webinário único, se existir.
- RF-003 — Sem relógio e sem data, o replay permanece disponível enquanto estiver ligado.
- RF-004 — Replay desligado deve continuar indisponível.

## Destino
Release atual

---

# Como lead, quero ver quantas pessoas de verdade já se inscreveram, para a prova social não ser inventada

## Descrição
### Contexto
Página de inscrição, ao lado do formulário.

### Problema atual
Texto fixo “Mais de 2.500 pessoas”, independente da base.

### Resultado esperado
Número de inscrições confirmadas (fora da lista de espera). Sem inscritos, a linha some.

### Escopo
Inclui: contagem pública só do total, sem e-mail/nome.
Não inclui: ranking; nomes reais.

## Business Points
3 BP — tira prova social falsa da captação.

## Design
Não.

## Requisitos funcionais
- RF-001 — A inscrição deve mostrar o total de vagas confirmadas quando for maior que zero.
- RF-002 — Com zero confirmados, a prova social não deve aparecer.
- RF-003 — A contagem pública não deve expor e-mail, nome ou id de inscrito.

## Destino
Release atual

---

# Como lead, quero gravar na agenda o horário da minha sessão, para não usar uma data genérica no JIT

## Descrição
### Contexto
Tela de sucesso da inscrição.

### Problema atual
O link do Google Agenda usa `scheduled_at` e 2 horas fixas. No JIT sempre disponível a data é inválida ou irrelevante.

### Resultado esperado
O evento usa o início da sessão do lead e a duração configurada.

### Escopo
Inclui: Google Agenda com início/fim da sessão; some se não houver horário.
Não inclui: Outlook; e-mail `.ics`.

## Business Points
1 BP — correção localizada na confirmação.

## Design
Não.

## Requisitos funcionais
- RF-001 — Com horário de sessão, o lead deve conseguir abrir o Google Agenda nesse horário.
- RF-002 — A duração do evento deve seguir a duração da sessão do webinário.
- RF-003 — Sem horário de sessão, o botão de agenda não deve aparecer.
- RF-004 — Lead em lista de espera não deve ver o botão de agenda da sala.

## Destino
Release atual

---

# Como lead, quero ver o contador de audiência na sala de espera, para sentir que a sessão está prestes a começar

## Descrição
### Contexto
`/wait/:slug`, enquanto o countdown corre.

### Problema atual
A sala mostra audiência. A espera não, embora o produto descreva isso.

### Resultado esperado
O mesmo modo de audiência da sala (fixa, dinâmica ou real) aparece na espera, se não estiver em “não exibir”.

### Escopo
Inclui: reusar a config de audiência na espera.
Não inclui: chat na espera.

## Business Points
1 BP — alinhamento da espera com a sala.

## Design
Não.

## Requisitos funcionais
- RF-001 — Com audiência ligada, a espera deve mostrar o contador.
- RF-002 — No modo “não exibir”, a espera não deve mostrar o contador.

## Destino
Release atual
