# Kommo CTWA Middleware

Middleware de rastreamento entre o **WhatsApp Cloud API (Meta)**, o **CRM Kommo** e a
**Meta Conversions API**. Fecha o ciclo de atribuição de anúncios Click-to-WhatsApp
(CTWA): captura o `ctwa_clid` quando o lead inicia a conversa, associa ao lead no
Kommo, e dispara eventos de conversão para a Meta conforme o lead avança no funil —
com um painel web mostrando o histórico completo de cada lead em tempo real.

**Produção:** https://institutolife.moovodonto.com.br — deploy automático via
GitHub Actions a cada push na branch `main` (ver `.github/workflows/deploy.yml`
e `deploy.sh` no servidor).

## Arquitetura

```
WhatsApp Cloud API ──webhook──▶ /webhooks/meta ──▶ leadService ──▶ kommoService
                                                        │                │
                                                        ▼                ▼
                                                   TimelineEvent      Kommo API
                                                        ▲                │
Kommo ──webhook (mudança de etapa)──▶ /webhooks/kommo ─┴── stageChangeService
                                                                         │
                                                                         ▼
                                                          eventMappingService (etapa->evento)
                                                                         │
                                                                         ▼
                                                     queueService (retry/backoff) ──▶ Meta CAPI
                                                                         │
                                                                         ▼
                                                                 SSE /api/stream ──▶ painel React
```

Camadas: `routes/` (HTTP) → `services/` (regras de negócio) → `repositories/`
(acesso a dados via Prisma). A fila de retry é em memória com persistência no banco
(`EventQueueJob`), pronta para ser trocada por BullMQ/Redis sem alterar a interface
pública de `queueService.js`.

## Stack

- **Backend:** Node.js (ESM) + Express
- **Banco:** SQLite por padrão (zero setup local) via Prisma ORM — troque para
  PostgreSQL em produção (veja abaixo)
- **Painel:** React + Tailwind v4, servido pelo próprio backend (build estático)
- **Fila:** em memória + persistida no banco, com backoff exponencial
- **Tempo real:** Server-Sent Events (`/api/stream`)

## Setup rápido (local, sem configurar nada além do .env)

```bash
npm install
cp .env.example .env        # preencha depois com suas credenciais reais
npm run prisma:generate
npm run prisma:migrate      # cria server/prisma/dev.db (SQLite)
npm run build:client        # gera client/dist, servido pelo backend
npm run dev                 # sobe o backend em http://localhost:3000
```

Abra `http://localhost:3000` — o painel é servido pelo mesmo servidor Express.

Para desenvolver o frontend com hot-reload separado (proxy para a API em :3000):

```bash
npm run dev            # terminal 1: backend
npm run dev:client     # terminal 2: frontend em http://localhost:5173
```

Para rodar os testes:

```bash
npm test
```

## Variáveis de ambiente (`.env`)

Copie `.env.example` para `.env` na raiz do projeto. Campos:

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão 3000) |
| `DATABASE_URL` | String de conexão do Prisma (SQLite por padrão) |
| `META_APP_SECRET` | App Secret do app da Meta — valida `X-Hub-Signature-256` |
| `META_VERIFY_TOKEN` | Token arbitrário usado na verificação do webhook |
| `META_CAPI_TOKEN` | Token de acesso usado para chamar a Conversions API |
| `META_PAGE_ID` | ID da página do WhatsApp Business |
| `META_DATASET_ID` | ID do dataset de Conversions API |
| `META_TEST_EVENT_CODE` | Código do Test Events (opcional, para o botão de teste) |
| `META_GRAPH_API_VERSION` | Versão da Graph API (padrão `v21.0`) |
| `KOMMO_SUBDOMAIN` | Subdomínio da conta Kommo |
| `KOMMO_ACCESS_TOKEN` | Token de acesso (integração de longa duração ou OAuth) |
| `KOMMO_CTWA_FIELD_ID` | ID do campo customizado de leads onde o `ctwa_clid` é gravado |
| `KOMMO_PIPELINE_ID` | Pipeline padrão para leads novos criados pelo middleware (opcional) |

**Nunca** comite o arquivo `.env` — ele já está no `.gitignore`.

## Como registrar o webhook na Meta

1. No [Meta for Developers](https://developers.facebook.com/apps), abra seu app →
   **WhatsApp → Configuração**.
2. Em **Webhook**, clique em **Editar** e informe:
   - **URL de callback:** `https://SEU_DOMINIO/webhooks/meta`
   - **Verify token:** o mesmo valor de `META_VERIFY_TOKEN` no seu `.env`
3. A Meta fará uma requisição `GET` para validar (`hub.challenge`) — o endpoint já
   está implementado em `metaWebhook.routes.js`.
4. Assine o campo **messages** (Webhook fields) para receber as mensagens de entrada.
5. Em **App → Configurações → Básico**, copie a **Chave secreta do app** para
   `META_APP_SECRET` — é usada para validar a assinatura `X-Hub-Signature-256` de
   cada webhook recebido (requisições com assinatura inválida são rejeitadas com 401).

> Em desenvolvimento local, exponha sua porta com uma ferramenta de túnel (ex.: ngrok)
> para obter uma URL HTTPS pública que a Meta consiga chamar.

## Como obter o PAGE_ID e o token da Conversions API

1. **PAGE_ID:** no [Business Manager](https://business.facebook.com), vá em
   **Configurações do negócio → Contas → WhatsApp** e copie o **Phone Number ID /
   Page ID** associado à sua conta do WhatsApp Business usada nos anúncios CTWA.
2. **META_DATASET_ID:** no [Events Manager](https://business.facebook.com/events_manager2),
   use o **Pixel/dataset já vinculado à Página do seu WhatsApp Business** (aparece com o
   campo "Identificação da Página" preenchido com o mesmo valor do seu `META_PAGE_ID`).
   **Não** crie um dataset novo do zero do tipo "Conversions API Gateway" genérico sem
   integração — na prática, um dataset assim aceita leitura mas rejeita todo `POST
   /events` com erro genérico (`code 100, subcode 33`), mesmo com token e permissões
   corretos, porque não está conectado a nenhuma integração ativa. Use "Gerenciar
   integrações" na tela do dataset para confirmar que ele está de fato ligado ao
   WhatsApp Business/CTWA.
3. **META_CAPI_TOKEN:** na mesma fonte de dados, vá em **Configurações → Gerar token de
   acesso** (ou use um token de **System User** com a permissão
   `whatsapp_business_messaging` / `business_management`, gerado em
   **Business Settings → System Users** — nesse caso, confirme em **Fontes de dados →
   [seu dataset] → Pessoas** e **→ Apps** que o system user e o app do token têm
   controle total sobre esse dataset específico).
4. **META_TEST_EVENT_CODE:** no Events Manager da fonte de dados, aba **Testar eventos**
   — usado apenas pelo botão "Enviar evento de teste" do painel, não afeta dados reais.

## Como conectar o webhook do Kommo

1. No Kommo, vá em **Configurações → Integrações → Webhooks** (ou crie um Salesbot/
   widget que dispare webhook em mudança de etapa, dependendo do plano da conta).
2. Cadastre a URL: `https://SEU_DOMINIO/webhooks/kommo`
3. Assine o evento de **mudança de status de lead** ("Lead alterado" / "Status
   alterado"). O Kommo envia o payload como `application/x-www-form-urlencoded` com
   notação de colchetes (`leads[status][0][id]`, `[status_id]`, `[pipeline_id]`) — já
   tratado pelo Express (`express.urlencoded({ extended: true })`).
4. **KOMMO_ACCESS_TOKEN:** crie uma **integração privada de longa duração** em
   **Configurações → Integrações → Criar integração** (ou use um token OAuth de uma
   integração já existente) com escopo de leitura/escrita em Leads e Contacts.
5. **KOMMO_CTWA_FIELD_ID:** crie um campo customizado de texto em **Leads** (ex.:
   "CTWA CLID") em **Configurações → Campos personalizados**, e copie o ID do campo
   (visível na URL ao editar o campo, ou via `GET /api/v4/leads/custom_fields`).

> **Limitação conhecida (MVP):** o middleware só reconcilia mudanças de etapa para
> leads que ele mesmo já associou (`kommo_lead_id` preenchido, via sincronização no
> primeiro contato). Se um lead for criado manualmente no Kommo antes de qualquer
> contato via WhatsApp, mudanças de etapa nesse lead serão ignoradas (logadas como
> aviso) até que o middleware o associe.

## Motor de eventos (mapa etapa → evento Meta)

O mapa `ETAPA_DO_KOMMO -> EVENTO_META` fica na tabela `EventMapping` e é totalmente
editável pelo painel (aba **Diagnóstico**). Diferente de uma versão anterior deste
projeto, **não há mapa pré-populado**: `pipeline_id`/`status_id` são específicos de
cada conta Kommo, então um exemplo genérico nunca casaria com nada. Configure pelo
seletor do painel, que lista as etapas reais da sua conta (via `GET
/api/kommo/statuses`).

> **O casamento é feito por `(pipeline_id, status_id)`, nunca pelo nome da etapa.**
> Contas Kommo podem ter duas etapas com o mesmo nome — por exemplo, uma etapa
> intermediária "Venda Realizada" no meio do funil E o status final "Ganho" do
> kanban, também chamado "Venda Realizada" (Kommo usa os IDs legados `142`/`143`
> para os status "Ganho"/"Perdido" de cada pipeline). Casar por nome dispararia o
> evento na etapa errada; o seletor do painel mostra o ID de cada etapa
> exatamente para evitar essa ambiguidade.

> **Nomes de evento válidos para `action_source: "business_messaging"`:** a Meta
> aceita apenas um vocabulário restrito de nomes de evento para conversões de
> mensageria — nomes intuitivos como `"Lead"`, `"Schedule"` ou `"Contact"` são
> **rejeitados** com erro 400 (`error_subcode 2804066`, "nome do evento inválido").
> Confirmado empiricamente contra a API real, os válidos são:
> `LeadSubmitted`, `QualifiedLead`, `AppointmentBooked`, `InitiateCheckout`,
> `AddToCart`, `ViewContent`, `Purchase`. O editor do painel já restringe a esses
> valores. Ao mapear uma etapa nova, use o botão "Enviar evento de teste" pra
> validar antes de ativar em produção — o erro de nome inválido é claro e imediato.

Regras aplicadas pelo motor (`stageChangeService` + `metaCapiService`):

- `action_source` é sempre `"business_messaging"` e `messaging_channel` sempre
  `"whatsapp"` — obrigatórios para a Meta atribuir o evento ao anúncio CTWA.
- Se o lead não tiver `ctwa_clid` salvo, o evento **não é enviado** — fica registrado
  na timeline como `skipped: sem ctwa_clid`.
- `event_id` é determinístico (`{leadId}_{eventoSlug}`, mais o `dedup_token` quando
  disponível), garantindo deduplicação em reenvios/retries.
- Falhas de rede/HTTP entram na fila com retry e backoff exponencial (30s, 60s, 120s…
  até 30min, 5 tentativas por padrão), tudo registrado na timeline.
- `test_event_code` **nunca** é aplicado automaticamente no fluxo de produção
  (mudança de etapa real) — só é usado quando explicitamente acionado pelo botão
  "Enviar evento de teste" do painel. Configurar `META_TEST_EVENT_CODE` no `.env`
  não desvia eventos reais.

## Ver as conversões no Gerenciador de Anúncios

Os eventos enviados aparecem imediatamente no **Gerenciador de Eventos** (por nome de
evento, em tempo quase real). Para vê-los **por campanha** no Gerenciador de Anúncios,
a coluna "Resultados" só mostra o evento de otimização do conjunto de anúncios — para
ver `LeadSubmitted`/`AppointmentBooked`/`QualifiedLead`/`Purchase` separadamente por
campanha, crie uma **Conversão Personalizada** para cada nome de evento (Gerenciador de
Eventos → Conversões Personalizadas) e adicione-as como colunas/breakdown no
Gerenciador de Anúncios.

## Enriquecimento de dados do anúncio (campanha/conjunto/criativo)

Ao capturar um lead via anúncio, o middleware busca automaticamente **campanha,
conjunto de anúncios e criativo** na Graph API (usando o `ad_source_id` do webhook) e
grava no lead — visível na lista de leads e na timeline. Isso requer que a **conta de
anúncio** esteja atribuída ao mesmo system user do `META_CAPI_TOKEN`, em
**business.facebook.com/settings → Contas de anúncio → [sua conta] → Pessoas/Usuários
do sistema**, com acesso de leitura de anúncios (`ads_read`).

**Limitação importante:** dispositivo, cidade/estado, posicionamento (Feed/Stories/
Reels) e UTMs de fonte/meio **não são recuperáveis** por esse pipeline — a Meta não
expõe esses dados por lead/clique individual via API para terceiros, por política de
privacidade. Eles só existem agregados dentro do próprio Gerenciador de Anúncios
(relatórios de breakdown), nunca associados a um lead específico.

## Trocando para PostgreSQL

O schema (`server/prisma/schema.prisma`) usa SQLite por padrão para rodar local sem
setup. Para produção com PostgreSQL:

1. Edite `server/prisma/schema.prisma`, trocando `provider = "sqlite"` para
   `provider = "postgresql"` no bloco `datasource db`.
2. Aponte `DATABASE_URL` no `.env` para sua instância Postgres.
3. Rode `npm run prisma:migrate` novamente para recriar as migrações para o novo
   provider.

## Painel

- **Aba Logs:** métricas no topo (total de leads, % com `ctwa_clid`, eventos enviados
  hoje, taxa de sucesso da CAPI), lista de leads à esquerda, feed global de eventos (ou
  timeline vertical de um lead selecionado) à direita, com filtros por status, tipo,
  período e busca por telefone/`ctwa_clid`. Atualiza em tempo real via SSE.
- **Aba Diagnóstico:** saúde das integrações (Kommo/Meta), últimos erros, botão para
  enviar um evento de teste (Test Events) e o editor do mapa etapa → evento.

## Estrutura de pastas

```
server/
  prisma/schema.prisma       # Lead, TimelineEvent, EventMapping, EventQueueJob
  src/
    routes/                  # HTTP: webhooks, leads, events, metrics, health...
    services/                # regras de negócio (ctwaExtractor, kommoService,
                              # metaCapiService, queueService, stageChangeService...)
    repositories/            # acesso a dados via Prisma
    lib/                     # signature, logger, eventBus (SSE)
  tests/                     # vitest: extração ctwa, payload CAPI, mapeamento
client/
  src/
    components/               # LeadsList, LeadTimeline, LogsFeed, Diagnostics...
    App.jsx, api.js
```

## Segurança

- Assinatura `X-Hub-Signature-256` validada com `crypto.timingSafeEqual` antes de
  processar qualquer webhook da Meta.
- O logger (`src/lib/logger.js`) redige automaticamente qualquer chave que pareça
  token/secret/senha antes de logar — tokens nunca aparecem em texto puro nos logs.
- Erros nunca são engolidos silenciosamente: toda falha é logada e registrada na
  timeline do lead correspondente.
