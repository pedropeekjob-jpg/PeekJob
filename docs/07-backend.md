# 07 · Backend

## Decisões (ADR)

| # | Decisão | Porquê | Alternativa considerada |
|---|---|---|---|
| 1 | **TypeScript de ponta a ponta**, em monorepo (`apps/web`, `apps/api`, `packages/shared`) | As regras (NIF, moderação, compatibilidade, validação) são escritas uma vez e usadas na web e na API | Spring Boot: boa opção se o cliente tiver uma equipa Java para manter o produto |
| 2 | **NestJS** na API | Módulos, injeção de dependências, guards: estrutura parecida com Spring | Rotas do Next.js, que misturam regras de negócio com a interface |
| 3 | **PostgreSQL** com `pg_trgm` + `unaccent` e SQL explícito (`pg`), migrações em `.sql` | A pesquisa tolerante, as agregações e a fusão de duplicados precisam de SQL; assim fica tudo legível e testado | Prisma/Drizzle: dão tipos, mas a pesquisa precisaria de SQL de qualquer forma |
| 4 | **Test first** | O ciclo é teste a falhar, implementação e refatoração. Os testes de integração correm contra um PostgreSQL real (no CI, um container) | Mocks da base de dados: não apanham erros de SQL nem de índices |
| 5 | **Pseudónimo por pessoa** (HMAC-SHA256 com segredo do servidor), nunca exposto pela API | É preciso para "as minhas avaliações", as mensagens de apoio, o RGPD (exportar e apagar) e a fusão de duplicados, sem guardar o email junto das avaliações | Pseudónimo por organização: mais forte, mas impede essas funcionalidades |
| 6 | **Organizações criadas por quem avalia nascem pendentes** | Evita organizações falsas criadas para difamar | Publicar logo, que abre a porta a abusos |
| 7 | **Login por link mágico** e sessão em cookie httpOnly | Sem palavras-passe para gerir. A conta guarda só um hash do email; tokens e sessões também só em hash | Palavra-passe ou login social: mais atrito e mais dados pessoais |
| 8 | **Verificação anónima** por código no email de trabalho ou NIF lido de um PDF (recibo/contrato) | Dá peso às avaliações sem guardar o email de trabalho nem o documento: guarda-se só o "sim" | Upload guardado para revisão humana: risco de RGPD desnecessário |
| 9 | **A API serve a web em produção** (mesma origem) | O cookie de sessão é do próprio site: funciona no Safari/iPhone, que bloqueia cookies entre domínios. Sem CORS em produção | Web e API em domínios diferentes, com cookies `SameSite=None` (falham no Safari) ou tokens no browser (menos seguros) |
| 10 | **Contas das organizações com pseudónimo próprio** (`member_ref`, outro espaço do HMAC) e **aprovação humana** de cada pedido | Pedidos, acessos e respostas não se cruzam com as avaliações da mesma pessoa; um recibo de quem lá trabalha também tem o NIF, por isso nem o email do domínio nem o documento dão acesso sozinhos. Guarda-se o domínio, nunca o email | Acesso automático pelo domínio: qualquer pessoa com email da empresa geria a página |
| 11 | **Pro ligado pela moderação** até haver pagamentos; o plano nunca sai na API pública nem mexe no ranking | O preço ainda não está decidido (tarefa 8); assim já se testa com clientes | Integrar já um fornecedor de pagamentos |

## Distrito de cada organização

O ranking filtra por distrito em todo o país (18 distritos e as regiões autónomas dos Açores e da Madeira).

- A lista dos 308 concelhos e do distrito de cada um está em `packages/shared/src/districts.ts` e, igual, na tabela `municipalities` (migração `007_districts.sql`; um teste confirma que coincidem e as contagens oficiais por distrito).
- `organizations.district` é preenchido por um trigger a partir da cidade quando quem grava não o indica. Fica vazio se a cidade não for um concelho (ex.: uma localidade) ou se o nome existir em duas regiões ("Lagoa", "Calheta").
- O importador indica sempre o distrito da consulta; ao criar uma organização pode indicar-se `district` (opcional).
- A API devolve `district` nas organizações e na pesquisa.

## Como se alimentam as organizações

Não existe em Portugal uma API pública e gratuita com a lista de empresas e associações. A lista faz-se com três fontes abertas e com quem avalia.

1. **OpenStreetMap** (gratuito, licença ODbL), para todo o país:
   - corre por concelho: `npm run import:osm -w @peekjob/api -- --city Porto`, `--district Braga` (também `Açores` e `Madeira`) ou `--all` (os 308 concelhos, distrito a distrito);
   - cada organização fica com o distrito (ou região autónoma) da consulta. "Lagoa" e "Calheta" existem em duas regiões: com `--city` é preciso indicar `--district`;
   - `--dry-run` só conta e não grava;
   - no GitHub há um workflow manual, "Importar organizações (OpenStreetMap)", com as opções simular, UAT e produção. Precisa dos segredos `UAT_DATABASE_URL` / `PROD_DATABASE_URL`;
   - inclui comércio, ofícios, restauração, turismo, saúde privada, escolas privadas, associações, ONG e IPSS;
   - deixa de fora entidades públicas, grandes marcas (`brand:wikidata`) e lugares sem nome;
   - não duplica: guarda o identificador do OpenStreetMap em `org_sources.external_id`, e junta a uma organização existente quando o NIF é o mesmo ou o nome é muito parecido (≥ 0,6) na mesma cidade;
   - as organizações importadas ficam disponíveis no fluxo de avaliar e passam a públicas com a primeira avaliação. Não entram na fila de moderação.
   - Atribuição obrigatória: "© contribuidores do OpenStreetMap (ODbL)", no rodapé e na privacidade. A ODbL pede que uma base derivada partilhada seja aberta nos mesmos termos, por isso convém validação jurídica antes da produção.
2. **VIES** (Comissão Europeia, gratuito): confirma o NIF e devolve o nome e a morada oficiais.
   - No formulário, `GET /orgs/nif/:nif` preenche o nome e a localidade.
   - Ao criar, se o nome bater certo, o NIF fica confirmado, o nome oficial fica como alias e a origem fica registada.
   - Não bloqueia: associações sem IVA intracomunitário não aparecem no VIES, e se o serviço estiver em baixo a organização é criada na mesma.
   - Para NIFs de pessoas (nome individual) só se diz se o NIF existe; o nome da pessoa nunca é guardado nem mostrado.
3. **Seed curado** (`apps/api/seed/`), com a origem e a licença de cada dado em `org_sources`.
4. **Quem avalia** pode criar uma organização que falta:
   - antes de criar, mostra-se "Será alguma destas?";
   - com NIF, valida-se o dígito de controlo, confirma-se no VIES e recusa-se um NIF que já exista (devolve a organização certa);
   - sem NIF, pedem-se nome, tipo e cidade;
   - as empresas em nome individual têm NIF obrigatório.
5. **Ativação:** a organização fica pendente até haver NIF confirmado, 3 pessoas diferentes a avaliar ou aprovação de um moderador. As importadas de fontes abertas ficam ativas com a primeira avaliação.
6. **Duplicados:** são avisados ao criar. Se escaparem, um moderador funde-os; as avaliações passam para a organização certa, o nome antigo fica como alias e o link antigo redireciona (308).
7. **Limite:** cada pessoa pode criar 5 organizações por dia.

## API

| Método | Rota | Quem | O que faz |
|---|---|---|---|
| POST | `/auth/magic-link` | todos | Envia o link de entrada (15 min, uso único, máx. 3 pedidos) → 202; email falhou → 503. `lang: 'en'` envia o email em inglês |
| POST | `/auth/verify` | todos | Troca o token pelo cookie de sessão `pj_session` (30 dias) |
| GET | `/auth/me` | sessão | Quem está autenticado |
| POST | `/auth/logout` | sessão | Termina a sessão → 204 |
| GET | `/orgs` | todos | Organizações ativas com nota, médias, locais e nº de relatos de assédio (só o número) |
| GET | `/orgs/search?q=&type=&includePending=` | todos | Pesquisa tolerante (acentos, maiúsculas, erros, nomes antigos) |
| POST | `/orgs` | sessão | Cria a organização pendente e devolve os possíveis duplicados e `nifCheck`: confirmed, name_mismatch, exists, not_found ou unavailable |
| GET | `/orgs/nif/:nif` | sessão | Nome e morada oficiais (VIES), para preencher o formulário; para NIFs de pessoas só o estado |
| GET | `/orgs/:id` | todos | Organização ativa com nota, nº de avaliações e média por critério; fundida → 308 |
| POST | `/orgs/:id/approve` | moderador | Ativa uma organização pendente |
| POST | `/orgs/:id/merge` | moderador | Funde um duplicado (`{ targetId }`) |
| POST | `/orgs/:id/reviews` | sessão | Publica uma avaliação |
| GET | `/orgs/:id/reviews` | todos | Avaliações públicas, sem pseudónimos, com `helpful` (quantas pessoas acharam útil, sem dizer quem) |
| POST | `/orgs/:id/interviews` | sessão | Partilhar uma entrevista (função, correu bem?, passos, oferta, resposta, dificuldade 1–5, comentário opcional); uma por pessoa e organização (409); nomes e insultos → 422 com sugestão |
| GET | `/orgs/:id/interviews` | todos | Entrevistas públicas (sem pseudónimos) e o resumo: % boa experiência, % oferta, % resposta, dificuldade média, passos mais comuns |
| POST | `/orgs/:id/salaries` | sessão | Partilhar o salário bruto mensal (100–50 000 €) e se chega a horas; voltar a partilhar substitui |
| GET | `/orgs/:id/salaries` | todos | Salários por função: com menos de 3 só a contagem; a partir de 3, percentis 10/50/90 arredondados às dezenas (nunca o valor de alguém). "Pagam a horas" em % com pelo menos 3 respostas |
| PUT, DELETE | `/reviews/:id/helpful` | sessão | Marcar/tirar "útil" (uma vez por pessoa; nunca na própria avaliação → 403) |
| GET | `/me/helpful` | sessão | As avaliações que marquei como úteis |
| GET | `/me/saved` | sessão | Organizações guardadas (mais recentes primeiro) |
| PUT, DELETE | `/me/saved/:orgId` | sessão | Guardar/tirar uma organização |
| POST | `/me/saved/merge` | sessão | Ao entrar: junta as guardadas no browser às da conta (até 200 ids; ignora os que não existem) |
| POST | `/verifications/email` | sessão | Envia um código de 6 dígitos ao email de trabalho (não é guardado) → 202 |
| POST | `/verifications/email/confirm` | sessão | Confirma o código (10 min, máx. 5 tentativas) |
| POST | `/verifications/document` | sessão | PDF ou fotografia (JPG, PNG, WebP; tipo confirmado pelo conteúdo) em memória; confirma se tem o NIF da organização. O ficheiro nunca é guardado |
| GET | `/me/verifications` | sessão | As minhas verificações |
| GET | `/me/reviews` | sessão | As minhas avaliações |
| POST | `/reviews/rewrite` | todos | Reescrever com IA: proposta publicável (sem nomes nem insultos, com os mesmos factos); não guarda o texto; 20 pedidos/10 min por pessoa |
| POST | `/reviews/:id/reports` | todos | Denunciar uma avaliação (motivo, detalhe, contacto opcional); máx. 10/dia por origem |
| POST | `/interviews/:id/reports` | todos | Denunciar uma entrevista (como as avaliações) |
| GET | `/moderation/reports` | moderador | Fila: denúncias em aberto agrupadas por avaliação ou entrevista (`kind`, `contentId`; nas entrevistas, a função) |
| POST | `/moderation/interviews/:id/decision` | moderador | `remove` ou `keep` uma entrevista, com justificação; avisos e contestação como nas avaliações |
| POST | `/moderation/reviews/:id/decision` | moderador | `remove` ou `keep`, com justificação; avisa quem escreveu e quem denunciou |
| POST | `/me/messages/:id/appeal` | sessão | Contestar a decisão desse aviso (texto 10–2000; 6 meses; uma vez) |
| GET | `/moderation/appeals` | moderador | Pedidos de revisão em aberto (sem pseudónimos) |
| POST | `/moderation/appeals/:id/decision` | moderador | `reverse` ou `confirm`, com justificação; avisa quem pediu |
| GET | `/moderation/summary` | moderador | Nº de denúncias em aberto e de organizações pendentes |
| GET | `/moderation/orgs` | moderador | Organizações novas pendentes, com nº de pessoas que avaliaram e possíveis duplicados |
| POST | `/orgs/:id/reject` | moderador | Rejeitar uma organização pendente, com justificação |
| POST | `/orgs/:id/claim/email` | sessão | Reivindicar a página: código para o email de trabalho (não serve email pessoal; com domínios conhecidos, só esses) → 202 |
| POST | `/orgs/:id/claim/email/confirm` | sessão | Confirma o código (com nome e cargo) → pedido pendente; guarda só o domínio |
| POST | `/orgs/:id/claim/document` | sessão | Reivindicar com um documento (PDF/fotografia, lido em memória) que tenha o NIF da organização → pedido pendente |
| GET | `/me/orgs` | sessão | Páginas que giro (com o plano) e os meus pedidos (estado e motivo) |
| GET | `/orgs/:id/dashboard` | quem gere | Painel: semana (novas, respondidas, por responder, variação da nota), posição na cidade, etiquetas do mês, avaliações por responder; Pro: tendência por critério e média do setor |
| PUT, DELETE | `/reviews/:id/reply` | quem gere | Resposta pública da organização (2–600 caracteres, sem nomes nem insultos); aparece em `GET /orgs/:id/reviews` como `reply` |
| GET | `/moderation/claims` | moderador | Pedidos para gerir páginas (método, domínio e se é conhecido, nome e cargo) |
| POST | `/moderation/claims/:id/decision` | moderador | `approve` ou `reject`, com justificação |
| GET | `/moderation/managed` | moderador | Páginas geridas: nº de pessoas e plano |
| PUT | `/moderation/orgs/:id/plan` | moderador | Plano `free` ou `pro` (até haver pagamentos); nunca mexe no ranking |
| GET | `/me/export` | sessão | Os meus dados (JSON) |
| DELETE | `/me` | sessão | Apagar a conta (`keepReviews` mantém as avaliações, desligadas da pessoa) |
| GET | `/me/messages` | sessão | Mensagens privadas de apoio com os contactos; nos avisos de moderação, `appeal` (disponível até quando, expirado, ou o estado do pedido) |
| POST | `/me/messages/:id/read` | sessão | Marca a mensagem como lida |
| GET | `/health` | todos | Estado da API e da base de dados |
| GET | `/robots.txt`, `/sitemap.xml` | todos | Para o Search Console (organizações ativas no sitemap) |

Ao publicar uma avaliação, a API responde assim:

| Situação | Resposta |
|---|---|
| Insultos ou nomes de pessoas (português e inglês) | 422, com uma sugestão de texto sem eles e `rewriteAvailable` |
| Possível ilegalidade | Publica a avaliação, marca-a e cria uma mensagem privada de apoio |
| A mesma pessoa avalia a mesma organização uma segunda vez | 409 |

Depois da verificação, as avaliações dessa pessoa nessa organização passam a "verificadas". Um NIF confirmado também ativa uma organização pendente.

## Reescrever com IA

Quem escreve com raiva recebe uma proposta publicável e decide se a usa. Pode sempre editar depois.

- **Quando aparece:** a caixa "Reescrever com IA" surge quando o texto está bloqueado (nomes, insultos) ou tem tom agressivo (MAIÚSCULAS a gritar, "!!!", palavrões), em português e em inglês. Em textos longos e calmos há uma ligação discreta, "Rever o tom com IA".
- **Modelo:** Anthropic (`claude-haiku-5-5` por omissão, `REWRITE_MODEL`), chamado pela API HTTP sem SDK.
- **Instruções ao modelo:**
  - manter os factos e a gravidade, sem suavizar denúncias de salários em atraso, assédio ou falta de contrato;
  - tirar nomes e detalhes que identifiquem pessoas;
  - tirar insultos e palavrões;
  - não inventar nada.
  O texto vai delimitado e é tratado como dados, nunca como instruções.
- **Rede de segurança:** se a proposta ainda tiver nomes ou insultos, passa pelas regras (`softenText`). Fica sempre dentro dos 600 caracteres.
- **Sem chave** (`ANTHROPIC_API_KEY`) ou com a IA em baixo, usa só as regras. A funcionalidade nunca impede o arranque.
- **Privacidade:** o texto é enviado à Anthropic só para gerar a proposta, e a API não o guarda nem o regista nos logs. O limite de pedidos usa um pseudónimo (HMAC) da pessoa ou do IP.
- **Medição:** evento `review_rewrite` (requested, accepted, dismissed, failed), com `trigger` (blocked, tone, manual) e `source` (ai, rules).

## Denúncias e moderação (Regulamento dos Serviços Digitais)
- Qualquer pessoa denuncia, com ou sem conta. A avaliação só sai do site por decisão de um moderador, sempre com justificação.
- Quem escreveu recebe o motivo em privado quando a avaliação é removida. Quem denunciou com conta recebe a decisão nas mensagens; sem conta, por email se o deixou. O contacto é apagado logo a seguir.
- O IP nunca é guardado: só um HMAC, para limitar abusos.
- **Ecrã de moderação** (`/moderacao`, só para o papel `moderator`; entrada no Perfil):
  - **Denúncias:** avaliação, motivos e justificações frequentes; remover ou manter.
  - **Organizações novas:** aprovar, rejeitar com justificação, ou fundir num duplicado sugerido.
  - **Pedidos de revisão:** a avaliação, a decisão original e o pedido; reverter ou manter, com justificação.
- **Contestar decisões (art. 20.º):** no aviso da decisão (Apoio), quem foi afetado pede a revisão por escrito, grátis, durante 6 meses: quem escreveu, se a avaliação foi removida; quem denunciou, se se manteve. Uma vez por decisão.
  - Uma pessoa da moderação revê (não é automático). Reverter desfaz a decisão: a avaliação removida volta; a que se manteve sai, e quem a escreveu recebe o aviso (que também pode contestar).
  - Quem pediu recebe a resposta com a justificação; se a decisão se mantém, a resposta indica a resolução extrajudicial de litígios (art. 21.º) e os tribunais.
  - O direito de contestar está nas regras públicas (*Como calculamos → Moderação com critério*).
  - Recomendação de operação: a revisão deve ser feita por outra pessoa da equipa que não a que decidiu (a API regista quem decidiu cada passo).
- **Dar o papel de moderador** (por agora na base de dados): `UPDATE users SET role = 'moderator' WHERE id = '…'`.

## Segurança

**Cabeçalhos em todas as respostas:**
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e `Cross-Origin-Opener-Policy: same-origin`;
- `Permissions-Policy` sem câmara, microfone, localização nem pagamentos;
- sem `X-Powered-By`;
- HSTS de um ano só em produção (o domínio da UAT pode mudar).

**CSP:**
- **Web:** scripts só do próprio site e do Google Analytics, sem `unsafe-inline` nos scripts. Por isso a configuração (`window.__PJ__`) vem de `/pj-config.js` e não de um script inline. Estilos inline são permitidos, por causa dos atributos `style` do React. Fontes vêm do Google Fonts. Ninguém pode pôr o site num iframe (`frame-ancestors 'none'`).
- **API:** as respostas JSON levam `default-src 'none'`.

**Pedidos de outros sites:** um POST, PUT, PATCH ou DELETE com `Origin` de outro domínio recebe 403. É uma defesa extra além do cookie `SameSite=Lax`. Os GET continuam abertos.

**Tamanho:** pedidos JSON e de formulário até 64 KB (413 acima disso). Os PDFs de verificação têm o seu próprio limite.

**Limites por IP** (429 com `Retry-After`):

| Rota | Limite | Contra |
|---|---|---|
| `POST /auth/magic-link` | 10 / hora | Enviar links para caixas de correio de outras pessoas |
| `POST /auth/verify` | 30 / 15 min | Adivinhar tokens |
| `POST /verifications/email[/confirm]` | 20 / hora | Abuso dos códigos |
| `GET /orgs/nif/:nif` | 30 / 10 min | Usar o VIES através de nós |
| `GET /orgs/search` | 120 / minuto | Recolha automática do catálogo |
| Tudo o resto | 600 / minuto | Abuso geral |

Somam-se aos limites que já existiam por pessoa: 3 links por email, 5 tentativas por código, 5 organizações por dia, 10 denúncias por dia e 20 reescritas em 10 minutos. O `/health`, os ficheiros da web e o `/pj-config.js` não têm limite.

Os limites ficam em memória, guardando só o IP e as horas dos pedidos, nunca em disco. Chega para uma instância; com várias, passar para Redis ou PostgreSQL. Atrás do proxy do Render o IP real vem de `X-Forwarded-For` (`trust proxy`).

**Dependências (14/10):** `npm audit --omit=dev` → **0 vulnerabilidades** (antes 10, uma crítica). Atualizadas as versões principais:
- **Node 22** na imagem Docker e no CI (o Node 20 deixou de ter suporte em abril de 2026; o pdf.js 6 exige ≥ 22.13).
- **Nest 11.2.7 com Express 5.2** (o Nest 12 é só ESM; a linha 11.2 já corrige os avisos, incluindo o Multer 2.4). As rotas e o middleware não precisaram de mudanças; os 233 testes da API passaram sem alterações.
- **pdf.js 6.4** (o 3.x tinha execução de JavaScript em PDFs e dependências opcionais `canvas`/`tar` vulneráveis). Só existe em ESM: carrega-se com `import()` a partir de `src/verification/pdfjs-loader.cjs` (JavaScript simples, copiado para `dist` no build), porque o TypeScript em CommonJS trocaria o `import()` por `require`. Os testes da API correm com `NODE_OPTIONS=--experimental-vm-modules` para o Jest aceitar esse `import()`.
- **React Router 7.18** (ver [11 · Frontend](11-frontend.md)).
- **Ferramentas de teste (14/10):** Jest 30, Vitest 4.1, jsdom 29, nyc 18, vite-plugin-istanbul 7 e Vite 6.4.4 (uma só versão em todo o repositório, fixada em `overrides`). `npm audit` completo: de 50 avisos (5 críticos, 33 altos) para 22 moderados, todos dentro do Jest 30 e do nyc 18 (já as versões mais recentes; sem correção publicada). Nada disto chega à produção.
- **Atualizar dependências de teste:** o npm 10 (o do Node 22) falha a resolver as dependências opcionais do Vitest 4 (`Cannot read properties of null (reading 'edgesOut')`). Para mudar versões usa-se `npx npm@11.6.4 install …`; o `npm ci` do npm 10 (CI e Docker) instala o resultado sem problemas.

## Monitorização

**Erros:**
- Cada resposta leva `X-Request-Id`. Um erro inesperado responde 500 com "Algo correu mal" e o `requestId`, que a pessoa pode indicar ao suporte.
- Só os erros 5xx são reportados. Os 4xx são esperados.
- O relatório leva a rota-modelo (`GET /orgs/:id`), o tipo, a mensagem, a stack e a versão (`RENDER_GIT_COMMIT`). Não leva cookies nem query strings.
- `scrubText` troca emails, NIFs/telefones e tokens por `[email]`, `[nif]` e `[token]`.
- **Destino:** sempre uma linha JSON nos logs do Render (`"level":"error"`). Com `SENTRY_DSN`, também no Sentry, enviado pela API de envelopes, sem SDK, para controlarmos o que sai. Usar a região UE (`de.sentry.io`); os alertas por email configuram-se no Sentry.
- **Web:**
  - erros não apanhados e promessas rejeitadas vão para `POST /client-errors`, só com o caminho, no máximo 5 por página e sem ruído de extensões;
  - limite de 20 por 10 minutos por IP;
  - um ecrã que rebente mostra "Algo correu mal neste ecrã" em vez de ficar em branco, e o rascunho continua guardado;
  - a web não carrega nenhum SDK de terceiros, por isso a CSP fica igual.

**Disponibilidade:**
- `/health` responde 200 com `{ ok, db: "up", release, uptimeSec }`, ou 503 com `db: "down"` se a base de dados não responder em 3 s.
- O workflow "Disponibilidade" corre de 10 em 10 minutos e verifica `UAT_URL` e `PROD_URL`, que são variáveis do repositório.
- Se um ambiente for abaixo, abre um issue "🔴 … em baixo" com a etiqueta `incident`. O GitHub avisa por email quem acompanha o repositório.
- Quando o ambiente volta, comenta e fecha o issue.
- O plano gratuito do Render adormece ao fim de 15 minutos: a verificação espera até 70 s e tenta 3 vezes.
- O GitHub desliga os workflows agendados ao fim de 60 dias sem atividade no repositório. Para produção, juntar o UptimeRobot ou o Better Stack (gratuitos) a avisar por SMS.

## RGPD
- **Acesso:** `GET /me/export` (inclui as guardadas, os "úteis", as entrevistas, os salários e, à parte, as páginas de organizações que gere, os pedidos e as respostas) e o ecrã *Perfil → Privacidade e dados → Descarregar*.
- **Apagamento:** `DELETE /me` apaga conta, avaliações, entrevistas, salários, pedidos e acessos a páginas de organizações (as respostas ficam, da organização, sem ligação à pessoa), verificações, mensagens, pedidos de revisão, guardadas, "úteis" e sessões. Opcionalmente mantém as avaliações, com um pseudónimo aleatório, já sem ligação à pessoa. As organizações que criou ficam, sem ligação.

## Correr localmente

```bash
docker compose up -d db                  # PostgreSQL 16
cp apps/api/.env.example apps/api/.env   # ajustar se necessário
npm install
npm run build -w @peekjob/shared
DATABASE_URL=postgres://postgres:postgres@localhost:5432/peekjob npm run migrate -w @peekjob/api
DATABASE_URL=postgres://postgres:postgres@localhost:5432/peekjob npm run seed -w @peekjob/api
WEB_ORIGIN=http://localhost:5173 npm run dev:api        # API em :3000
VITE_API_URL=http://localhost:3000 npm run dev:web      # web em modo API
```

- Sem `VITE_API_URL`, a web corre em **modo demonstração** (dados de exemplo no browser). É assim que está publicada no GitHub Pages.
- Em desenvolvimento, sem `RESEND_API_KEY`, os emails não são enviados: o link de entrada e os códigos aparecem no terminal da API.
- **Produção:** ver [08 · Publicar](08-publicacao.md). A imagem Docker junta a API e a web (`VITE_API_URL=/`).

## Testes

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/peekjob_test npm test
```

- **Domínio partilhado:** 46 testes (vitest).
- **Web:** 30 testes (medição, privacidade, morada do VIES e envio de erros).
- **API:** 195 testes, entre unitários e de integração contra PostgreSQL (incluindo o fluxo real do link mágico e PDFs gerados nos testes). A base de testes é recriada em cada execução.
- **Browser (Playwright, `e2e/`):** 36 testes em telemóvel e computador, incluindo acessibilidade e teclado. Correm no CI em cada envio, contra a aplicação como em produção: a API a servir a web, PostgreSQL e um servidor de email falso no lugar do Resend.
  - **Fluxos:**
    - visita pública e 404;
    - inglês;
    - entrar com o link do email;
    - avaliar com texto bloqueado → "Reescrever com IA" → publicar → mensagem de apoio;
    - nova organização com NIF;
    - denúncia sem conta → decisão da moderação;
    - quem não é moderador não entra;
    - exportar e apagar a conta.
  - **Em todas as páginas:** nenhum erro de JavaScript, nenhuma violação da CSP e nenhum scroll horizontal. Isto é verificado automaticamente; um teste temporário com um erro de propósito confirmou que falha.
  - **Correr localmente:** `npm run build:e2e && npm run e2e`. Precisa de PostgreSQL em `E2E_DATABASE_URL`. A base de dados `peekjob_e2e` é recriada em cada execução.
  - **Limites por IP:** os testes vêm todos do mesmo IP, por isso os limites são multiplicados com `RATE_LIMIT_SCALE`. A API recusa arrancar com esta variável em produção.
  - **Se falhar no CI:** o relatório, com capturas e trace, fica nos artefactos do run durante 7 dias.
  - **Promoção:** promover para produção exige o CI todo verde, e isso já inclui estes testes.

## Acessibilidade (WCAG 2.1 AA)

- **Automática:** o axe-core corre em cerca de 25 ecrãs, em telemóvel e computador: páginas públicas, organização, denúncia, os passos de avaliar (com o texto bloqueado e a proposta da IA), perfil, os meus dados, guardadas, apoio e preferências. Há também um teste de reflow a 320 px.
- **Teclado** (testes próprios):
  - o primeiro Tab mostra "Saltar para o conteúdo";
  - ao mudar de ecrã, o foco vai para o título, para o leitor de ecrã anunciar a página nova. Não rouba o foco a quem já está a usar o ecrã;
  - o anel de foco tem dois tons (branco e preto) e vê-se em fundos claros e escuros;
  - nas notas, um Tab por critério, e as setas, Home e End escolhem a nota;
  - os separadores da verificação funcionam com setas.
- **Já existia:** idioma do documento (`lang`), título por ecrã, `prefers-reduced-motion` nas animações, regiões `aria-live` nos resultados de pesquisa, erros de formulário com `aria-invalid` e `role="alert"`, e alvos de toque com 44 px.
- **Corrigido nesta revisão:**
  - contraste do "Espreitar" na página Sobre;
  - mapa com pinos clicáveis marcado como "imagem" (os leitores de ecrã escondiam os pinos);
  - atributo ARIA inválido nos separadores;
  - scroll horizontal a 320 px no cabeçalho da página inicial, Sobre e Contacto.
- **Falta (manual):** testar com leitores de ecrã reais (VoiceOver no iPhone, NVDA no Windows) e com pessoas que os usam no dia a dia. Os testes automáticos apanham cerca de metade dos problemas.

## Próxima fatia
- PDFs digitalizados (só imagem, sem texto): hoje só se leem PDFs com texto e fotografias.

## Guardadas e "útil" (14/10)
- Ficam na conta, ligadas ao pseudónimo da pessoa (tabelas `saved_orgs` e `review_helpful`), por isso acompanham a pessoa entre aparelhos.
- Sem sessão continuam a funcionar no browser; ao entrar, juntam-se à conta (`/me/saved/merge` e um `PUT` por "útil"). Com sessão, ao abrir a app, a conta manda: o que foi tirado noutro aparelho não volta do browser.
- No ecrã a mudança é imediata; se o servidor recusar, volta atrás. Ao sair, as guardadas e os "úteis" saem do browser.
- A contagem pública de "útil" vem do servidor e não diz quem marcou; não se pode marcar a própria avaliação.

## Mapa real (14/10)
- Leaflet com mosaicos configuráveis (`MAP_TILES_URL`, por omissão OpenStreetMap). O endereço chega à web por `/pj-config.js` e a origem entra na CSP (`img-src`): o browser só carrega imagens desse fornecedor.
- **Privacidade:** pedir mosaicos envia o IP da pessoa ao fornecedor. Por isso o mapa real só carrega quando a pessoa toca em "Ver no mapa" (até lá, uma ilustração sem pedidos a outros sites); a escolha fica nesse browser. A política de privacidade deve mencionar o fornecedor do mapa.
- O Leaflet vem num ficheiro à parte (≈44 kB comprimidos), só descarregado quando se abre o mapa.
- Entram no mapa os locais com coordenadas: os importados do OpenStreetMap, os de demonstração e os adicionados à mão depois de geocodificados (ver abaixo); a escolha do local com teclado faz-se na lista ao lado.

## Verificação por fotografia do recibo (14/10)
- **OCR no próprio servidor** (Tesseract, via `tesseract.js`, com os dados de português instalados com a app: `@tesseract.js-data/por`). A fotografia não sai para nenhum serviço externo e fica só em memória durante o pedido (é apagada no fim).
- O tipo confirma-se pelo conteúdo do ficheiro (assinatura), não pelo nome. Aceita JPG, PNG e WebP; o iPhone converte HEIC em JPEG ao escolher.
- Fotografias grandes são reduzidas (lado maior até 2200 px) antes do OCR; a rotação é corrigida automaticamente.
- O OCR troca letras parecidas por algarismos (O→0, I/l→1, S→5, B→8…) nos grupos que já são quase só algarismos; o dígito de controlo do NIF filtra o resto.
- Um só *worker* de OCR, criado no primeiro pedido e desligado ao fim de 1 minuto sem uso (≈100–150 MB enquanto ligado). Tempo: ~1,5 s no primeiro pedido, ~0,6 s nos seguintes (medido nos testes).
- Limitações: fotografias muito escuras, desfocadas ou em perspetiva forte podem não ser lidas; a pessoa pode tentar outra fotografia, um PDF ou o email do trabalho.

## Geocodificação dos locais adicionados à mão (14/10)
- **Nominatim** (OpenStreetMap), em segundo plano: logo que se adiciona uma organização com morada e numa ronda a cada 15 min (`GEOCODE_INTERVAL_MIN`; 0 desliga). Regras do Nominatim: 1 pedido por segundo e identificação da app (`GEOCODER_USER_AGENT`, por omissão `PeekJob (https://peekjob.com)`; em produção convém pôr um contacto real). Outro serviço compatível: `GEOCODER_URL`; `off` desliga.
- Só se envia a morada da organização (pública), nunca dados de quem avalia. Resultados fora de Portugal (continente, Açores, Madeira) são ignorados.
- Morada não encontrada: tenta no dia seguinte, no máximo 3 vezes. Serviço em baixo: tenta dentro de 1 hora, sem contar como tentativa.
- **Correção (14/10):** os locais de uma organização passam a ativos quando ela fica ativa (aprovada, NIF confirmado ou pessoas suficientes a avaliar), por um trigger na base de dados. Antes ficavam pendentes e nunca apareciam na página; a migração 010 corrige os que já existiam.
