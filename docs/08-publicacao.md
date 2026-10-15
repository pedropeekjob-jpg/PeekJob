# 08 · Publicar (API + web)

Em produção a API serve também a web, no mesmo endereço. Assim o cookie de sessão é do próprio site e o login funciona em todos os browsers, incluindo o Safari no iPhone, que bloqueia cookies entre domínios diferentes.

A demo no GitHub Pages continua em **modo demonstração** (dados de exemplo no browser).

## Ambientes

| | UAT (testes com o cliente) | Produção |
|---|---|---|
| Serviço no Render | `peekjob-uat` (plano gratuito) | `peekjob-prod` (plano pago, não adormece) |
| Publica quando | há um push para `main` (depois do CI) | o ramo `production` avança (workflow **Promover para produção**) |
| Base de dados | ramo `uat` do projeto Neon | ramo `production` do projeto Neon (com cópias de segurança) |
| Acesso | palavra-passe (`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`); sem ela não arranca | público |
| Google | fora (`noindex`, robots fechado, sem sitemap) | indexado, Search Console |
| Emails | assunto com `[UAT]` | normais |
| Dados de demonstração | sim (`SEED_DEMO=true`) | não; lista curada real |
| Na web | faixa "UAT · ambiente de testes" | — |

**Promover para produção:** GitHub → Actions → *Promover para produção* → *Run workflow*. Sem indicar um commit, promove o último de `main`. Só avança se o CI tiver passado nesse commit e nunca reescreve o histórico de produção.

## Serviços (todos com plano gratuito, na UE)

| Peça | Serviço sugerido | Notas do plano gratuito |
|---|---|---|
| Base de dados | **Neon** (PostgreSQL gerido), região Frankfurt | 0,5 GB; suporta `pg_trgm` e `unaccent` |
| Emails | **Resend** | 3000 emails/mês. Sem domínio verificado só envia para o email da própria conta |
| API + web | **Render** (Docker), região Frankfurt | Adormece após 15 min sem uso; o primeiro pedido demora ~1 min |

Para o cliente testar à vontade convém um domínio (ex.: `peekjob.pt`): serve para os emails (Resend) e para o endereço do site (Render). O plano pago mais baixo do Render evita o adormecimento.

## Passo a passo

1. **Neon:** criar o projeto (região *AWS Europe Central 1 – Frankfurt*) e copiar a *connection string* (termina em `?sslmode=require`).
2. **Resend:** criar uma chave de API (*API Keys → Create*). Para enviar a qualquer pessoa, adicionar e verificar o domínio (*Domains*, registos DNS). Para um primeiro teste, usar `MAIL_FROM="PeekJob <onboarding@resend.dev>"`; nesse caso os emails só chegam ao email da conta Resend.
3. **Render:** *New → Blueprint*, escolher o repositório `pedropeekjob-jpg/PeekJob`. O `render.yaml` cria os serviços `peekjob-uat` e `peekjob-prod` e pede a cada um:
   - `DATABASE_URL`: a connection string do Neon;
   - `RESEND_API_KEY`: a chave do Resend;
   - `MAIL_FROM`: por exemplo `PeekJob <ola@peekjob.pt>`.

   O `PRIVACY_SECRET` é gerado pelo Render. **Nunca o mudar depois do lançamento**: os pseudónimos das pessoas dependem dele.
4. No primeiro arranque a imagem aplica as migrações e carrega as 10 organizações de demonstração (`SEED_DEMO=true`). Para o lançamento real: mudar `SEED_DEMO` para `false` e carregar o seed curado.
5. Abrir o endereço `https://peekjob.onrender.com` (ou o domínio próprio). Os links dos emails usam esse endereço automaticamente. Com domínio próprio, definir `WEB_ORIGIN=https://peekjob.pt`.

Cada push para `main` publica uma nova versão (o CI corre os testes e constrói a imagem).

### Começar só com a UAT (15/10)

Para não pagar já o plano da produção: no Render, *New → Blueprint*, repositório `PeekJob`, e em **Blueprint Path** escrever `render.uat.yaml` (só cria o `peekjob-uat`, gratuito). Base de dados: ramo `uat` no Neon (criado a partir do `production`, sem expiração). Enquanto não houver domínio verificado no Resend, `MAIL_FROM="PeekJob <onboarding@resend.dev>"` e os emails só chegam ao email da conta Resend (pedropeekjob@gmail.com). Email de contacto do site: pedropeekjob@gmail.com (`VITE_CONTACT_EMAIL` muda-o no build).

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | PostgreSQL |
| `PRIVACY_SECRET` | sim | Pseudónimos e hashes dos emails (HMAC) |
| `RESEND_API_KEY`, `MAIL_FROM` | sim em produção | Envio dos links e dos códigos. Sem elas a API recusa arrancar em produção |
| `ANTHROPIC_API_KEY` | não (recomendada) | Reescrever com IA. Sem ela usa só as regras. Pôr um limite de gastos na consola da Anthropic |
| `REWRITE_MODEL` | não | Modelo da reescrita (por omissão `claude-haiku-5-5`) |
| `VIES_URL` | não | `off` desliga a confirmação de NIF no VIES (por omissão, o endpoint oficial) |
| `SENTRY_DSN` | não (recomendada) | Erros no Sentry, com alertas por email. Sem ela os erros ficam só nos logs |
| `RATE_LIMIT_SCALE` | nunca em produção | Só para os testes no browser (multiplica os limites por IP); em produção a API recusa arrancar |
| `WEB_ORIGIN` | não | Endereço público (por omissão o do Render) |
| `WEB_DIST` | já na imagem | Pasta da build da web servida pela API |
| `SEED_DEMO` | não | `true` carrega as organizações de demonstração |
| `APP_ENV` | sim | `uat` ou `production` |
| `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` | só UAT | Palavra-passe de acesso à UAT |
| `GA_MEASUREMENT_ID` | não | Google Analytics 4 (`G-…`), ver [09 · Medição](09-medicao.md) |
| `MAP_TILES_URL` | não | Mosaicos do mapa (https, com `{z}/{x}/{y}`). Por omissão o OpenStreetMap, que aceita pouco tráfego: em produção, um fornecedor com conta (ex.: MapTiler, Stadia). Entra na CSP |
| `MAP_TILES_ATTRIBUTION` | não | Atribuição obrigatória do fornecedor (por omissão `© OpenStreetMap`) |
| `GEOCODER_USER_AGENT` | não | Identificação nos pedidos ao Nominatim (regra de uso): pôr um contacto real, ex. `PeekJob/0.1 (pedropeekjob@gmail.com)` |
| `GEOCODER_URL` | não | Outro serviço compatível com o Nominatim; `off` desliga a geocodificação |
| `GEOCODE_INTERVAL_MIN` | não | Minutos entre rondas de geocodificação (por omissão 15; 0 desliga as rondas) |
| `CLEANUP_INTERVAL_MIN` | não | Minutos entre rondas de limpeza de links de entrada, sessões e códigos expirados (por omissão 60; 0 desliga) |
| `GSC_VERIFICATION` | não | Código da etiqueta HTML do Search Console |
| `COOKIE_SAMESITE` | não | Só se a web ficar noutro domínio (`none`); não é o caso desta configuração |

## Monitorização (depois de publicar)

1. A UAT já é verificada sem configurar nada (`https://peekjob-uat.onrender.com` por omissão). Para a produção: no GitHub, em Settings → Secrets and variables → Actions → **Variables**, criar `PROD_URL`.
2. No GitHub, carregar em "Watch" no repositório (Custom → Issues) em quem deve receber os alertas por email.
3. Opcional: criar um projeto no Sentry (região UE), copiar o DSN para `SENTRY_DSN` no Render e configurar o alerta por email para "novo problema".

## Domínio peekjob.com (tarefa 4)

O domínio é **peekjob.com**. Falta acesso ao DNS (onde o domínio foi comprado). O código não precisa de mudanças: o endereço e o remetente vêm das variáveis do Render.

1. **Resend** → *Domains* → *Add domain* → `peekjob.com` (região UE). O Resend mostra 3 registos (MX e TXT/SPF em `send`, TXT/DKIM em `resend._domainkey`); copiá-los tal e qual para o DNS e carregar em *Verify*. Pode demorar até umas horas.
2. **Render** → `peekjob-uat` → *Settings* → *Custom Domains* → `uat.peekjob.com`. No DNS: `CNAME uat → peekjob-uat.onrender.com`. O Render emite o certificado sozinho.
3. **Render** → `peekjob-uat` → *Environment*: `MAIL_FROM=PeekJob <nao-responder@peekjob.com>` (depois de o Resend dizer *Verified*) e `WEB_ORIGIN=https://uat.peekjob.com`. Guardar faz uma publicação nova.
4. Produção (mais tarde): `peekjob.com` e `www.peekjob.com` no serviço `peekjob-prod`, com os registos que o Render indicar (A no domínio raiz, CNAME no `www`).
5. Emails do site (tarefa 7): quando existirem `ola@` e `privacidade@`, mudar `VITE_CONTACT_EMAIL` e `GEOCODER_USER_AGENT`. Receber emails no domínio é outro serviço (ex.: Google Workspace, Zoho); o Resend só envia.

## Verificado antes de publicar

Com a mesma estrutura da imagem, numa base de dados vazia: migrações e seed, web servida pela API, email do link mágico no formato do Resend (para um servidor falso), cookie `Secure` + `httpOnly`, login e publicação de uma avaliação no browser em mobile.

## UAT publicada (15/10): o que foi feito

Endereço: **https://peekjob-uat.onrender.com** (pede utilizador e palavra-passe: `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`, definidos no Render). Verificado: `/health` → `{"ok":true,"db":"up","release":"97adc08"}`.

### Contas e quem as gere

| Serviço | Conta | Para quê |
|---|---|---|
| Neon | org `org-curly-hall-39678854`, projeto `quiet-hall-12294765` | PostgreSQL. Ramo `production` (produção) e ramo `uat` (testes, criado a partir do `production`, sem expiração) |
| Render | conta ligada ao GitHub `pedropeekjob-jpg` | Serviço `peekjob-uat` (Docker, Frankfurt, plano gratuito), criado pelo blueprint `render.uat.yaml` |
| Resend | conta de pedropeekjob@gmail.com | Emails de login e códigos. Chave `peekjob-uat` (só envio) |
| GitHub | segredo de Actions `NEON_API_KEY` | Workflow *Neon · ligar e provar* |

Email de contacto provisório do site: **pedropeekjob@gmail.com** (tarefa 7). Também identifica a PeekJob nos pedidos ao OpenStreetMap (`GEOCODER_USER_AGENT`).

### Neon

1. Skills do Neon instaladas no projeto (`npx neon skills -y`, em `.claude/skills`).
2. O ambiente do Claude e a pasta local não chegam à rede do Neon; por isso a ligação faz-se no GitHub Actions: workflow **Neon · ligar e provar** (*Actions → Run workflow*, ramo do Neon como parâmetro), com o segredo `NEON_API_KEY` (chave criada no Neon em *Account settings → API keys*).
3. O workflow corre `neon init -y --org-id org-curly-hall-39678854 --project-id quiet-hall-12294765 --branch production --services postgres`, `neon deploy` (escreve `DATABASE_URL`, `DATABASE_URL_UNPOOLED` e `NEON_BRANCH` no `.env.local` do runner, nunca nos logs), o build, as migrações e a prova (`/health`, `GET /orgs`, tabelas e migrações) e mostra os resultados como anotações do run.
4. Resultado no ramo `production`: 13 migrações (001 a 013), 24 tabelas, `/health` com `"db":"up"`, 0 organizações (a produção não leva dados de demonstração). O `neon.ts` gerado está na raiz (só Postgres; ramos novos expiram em 7 dias, exceto o principal).
5. Na API: driver `pg` (servidor sempre a correr) com a ligação do **pooler** (`DATABASE_URL`); migrações e seed pela ligação **direta** (`DATABASE_URL_UNPOOLED`, se existir), porque o pooler não guarda o estado da sessão. Fora de produção, a API lê o `.env.local` sozinha (`src/common/local-env.ts`); o ficheiro está no `.gitignore`.
6. Ramo `uat`: criado na consola do Neon (*Branches → Create branch*, pai `production`, sem expiração). A ligação com pooler foi para o `DATABASE_URL` do Render. As migrações e as organizações de demonstração aplicam-se sozinhas no arranque da imagem (`SEED_DEMO=true`).

### Render (só UAT, gratuito)

1. *New → Blueprint*, repositório `PeekJob`, **Blueprint Path** `render.uat.yaml` (só o `peekjob-uat`; o `render.yaml` completo também cria a produção, paga).
2. Valores pedidos: `DATABASE_URL` (ramo `uat`, pooler), `RESEND_API_KEY`, `MAIL_FROM=PeekJob <onboarding@resend.dev>`, `BASIC_AUTH_USER` e `BASIC_AUTH_PASSWORD`. Em branco: `ANTHROPIC_API_KEY` (a reescrita usa só as regras), `SENTRY_DSN`, `GA_MEASUREMENT_ID`. O `PRIVACY_SECRET` é gerado pelo Render: **nunca o mudar**.
3. Cada push para `main` publica uma versão nova (o `/health` mostra o commit em `release`). No plano gratuito adormece ao fim de 15 min; o primeiro pedido demora ~1 min.

### Resend

- A app envia pela API HTTP do Resend (`src/auth/resend-mailer.ts`); a chave vem só de `RESEND_API_KEY`.
- Exemplo do SDK pedido (15/10): `npm run email:test -w @peekjob/api` envia o "Hello World" para pedropeekjob@gmail.com com o SDK `resend` (a chave nunca no código).
- **Limite atual:** com o remetente `onboarding@resend.dev`, o Resend só entrega ao email da conta (pedropeekjob@gmail.com). Para o cliente e outras pessoas entrarem com o seu email é preciso verificar um domínio no Resend (*Domains*, registos DNS; tarefa 4) e mudar `MAIL_FROM` para um endereço desse domínio.

### Falta

- Domínio próprio (tarefa 4): `peekjob.com`, falta acesso ao DNS; passos em *Domínio peekjob.com* acima.
- Alertas (tarefa 62): a UAT passou a ser verificada de 10 em 10 minutos sem configuração; falta carregar em *Watch* no repositório para receber os emails.
- Carregar a lista real de organizações (tarefa 22): já há base de dados.
- Produção: quando houver decisão, `peekjob-prod` pelo `render.yaml` (plano pago) com o ramo `production` do Neon.
