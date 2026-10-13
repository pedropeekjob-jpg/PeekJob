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

## Como se alimentam as organizações

Não existe em Portugal uma API pública e gratuita com a lista de empresas e associações. A lista faz-se com três fontes abertas e com quem avalia.

1. **OpenStreetMap** (gratuito, licença ODbL), para todo o país:
   - corre por concelho: `npm run import:osm -w @peekjob/api -- --city Porto`, `--district Braga` (também `Açores` e `Madeira`) ou `--all` (os 308 concelhos, um a um);
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
| GET | `/orgs/:id/reviews` | todos | Avaliações públicas, sem pseudónimos |
| POST | `/verifications/email` | sessão | Envia um código de 6 dígitos ao email de trabalho (não é guardado) → 202 |
| POST | `/verifications/email/confirm` | sessão | Confirma o código (10 min, máx. 5 tentativas) |
| POST | `/verifications/document` | sessão | PDF em memória; confirma se tem o NIF da organização. O ficheiro nunca é guardado |
| GET | `/me/verifications` | sessão | As minhas verificações |
| GET | `/me/reviews` | sessão | As minhas avaliações |
| POST | `/reviews/rewrite` | todos | Reescrever com IA: proposta publicável (sem nomes nem insultos, com os mesmos factos); não guarda o texto; 20 pedidos/10 min por pessoa |
| POST | `/reviews/:id/reports` | todos | Denunciar uma avaliação (motivo, detalhe, contacto opcional); máx. 10/dia por origem |
| GET | `/moderation/reports` | moderador | Fila: denúncias em aberto agrupadas por avaliação |
| POST | `/moderation/reviews/:id/decision` | moderador | `remove` ou `keep`, com justificação; avisa quem escreveu e quem denunciou |
| GET | `/moderation/summary` | moderador | Nº de denúncias em aberto e de organizações pendentes |
| GET | `/moderation/orgs` | moderador | Organizações novas pendentes, com nº de pessoas que avaliaram e possíveis duplicados |
| POST | `/orgs/:id/reject` | moderador | Rejeitar uma organização pendente, com justificação |
| GET | `/me/export` | sessão | Os meus dados (JSON) |
| DELETE | `/me` | sessão | Apagar a conta (`keepReviews` mantém as avaliações, desligadas da pessoa) |
| GET | `/me/messages` | sessão | Mensagens privadas de apoio com os contactos |
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
- Falta: um canal para quem escreveu contestar a decisão.
- **Dar o papel de moderador** (por agora na base de dados): `UPDATE users SET role = 'moderator' WHERE id = '…'`.

## RGPD
- **Acesso:** `GET /me/export` e o ecrã *Perfil → Privacidade e dados → Descarregar*.
- **Apagamento:** `DELETE /me` apaga conta, avaliações, verificações, mensagens e sessões. Opcionalmente mantém as avaliações, com um pseudónimo aleatório, já sem ligação à pessoa. As organizações que criou ficam, sem ligação.

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
- **Web:** 27 testes (medição, privacidade e morada do VIES).
- **API:** 164 testes, entre unitários e de integração contra PostgreSQL (incluindo o fluxo real do link mágico e PDFs gerados nos testes). A base de testes é recriada em cada execução.
- **Web:** fluxos completos verificados no browser (Playwright), em desktop e mobile, contra a API real.

## Próxima fatia
- Guardadas e "útil" no servidor (hoje ficam no browser).
- Verificação por fotografia do recibo (OCR); hoje só PDF com texto.
- Locais e mapa: geocodificação em segundo plano.
