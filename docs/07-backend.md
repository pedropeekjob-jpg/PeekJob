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

1. **Seed curado** da cidade e dos setores de lançamento (`apps/api/seed/`), com origem e licença de cada dado em `org_sources`.
2. **Quem avalia** pode criar uma organização que falta:
   - antes de criar, mostra-se "Será alguma destas?";
   - com NIF, valida-se o dígito de controlo e recusa-se um NIF que já exista (devolve a organização certa);
   - sem NIF, pedem-se nome, tipo e cidade;
   - as empresas em nome individual têm NIF obrigatório.
3. **Ativação:** a organização fica pendente até haver NIF confirmado, 3 pessoas diferentes a avaliar ou aprovação de um moderador.
4. **Duplicados:** são avisados ao criar. Se escaparem, um moderador funde-os; as avaliações passam para a organização certa, o nome antigo fica como alias e o link antigo redireciona (308).
5. **Limite:** cada pessoa pode criar 5 organizações por dia.

## API

| Método | Rota | Quem | O que faz |
|---|---|---|---|
| POST | `/auth/magic-link` | todos | Envia o link de entrada (15 min, uso único, máx. 3 pedidos) → 202; email falhou → 503. `lang: 'en'` envia o email em inglês |
| POST | `/auth/verify` | todos | Troca o token pelo cookie de sessão `pj_session` (30 dias) |
| GET | `/auth/me` | sessão | Quem está autenticado |
| POST | `/auth/logout` | sessão | Termina a sessão → 204 |
| GET | `/orgs` | todos | Organizações ativas com nota, médias, locais e nº de relatos de assédio (só o número) |
| GET | `/orgs/search?q=&type=&includePending=` | todos | Pesquisa tolerante (acentos, maiúsculas, erros, nomes antigos) |
| POST | `/orgs` | sessão | Cria a organização pendente e devolve os possíveis duplicados |
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
| GET | `/me/messages` | sessão | Mensagens privadas de apoio com os contactos |
| POST | `/me/messages/:id/read` | sessão | Marca a mensagem como lida |
| GET | `/health` | todos | Estado da API e da base de dados |
| GET | `/robots.txt`, `/sitemap.xml` | todos | Para o Search Console (organizações ativas no sitemap) |

Ao publicar uma avaliação, a API responde assim:

| Situação | Resposta |
|---|---|
| Insultos ou nomes de pessoas | 422, com uma sugestão de texto sem eles |
| Possível ilegalidade | Publica a avaliação, marca-a e cria uma mensagem privada de apoio |
| A mesma pessoa avalia a mesma organização uma segunda vez | 409 |

Depois da verificação, as avaliações dessa pessoa nessa organização passam a "verificadas". Um NIF confirmado também ativa uma organização pendente.

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

- **Domínio partilhado:** 42 testes (vitest).
- **Web:** 22 testes (medição e privacidade).
- **API:** 92 testes, entre unitários e de integração contra PostgreSQL (incluindo o fluxo real do link mágico e PDFs gerados nos testes). A base de testes é recriada em cada execução.
- **Web:** fluxos completos verificados no browser (Playwright), em desktop e mobile, contra a API real.

## Próxima fatia
- Moderação: API de moderação + LLM para casos duvidosos e fila humana.
- Guardadas e "útil" no servidor (hoje ficam no browser).
- Verificação por fotografia do recibo (OCR); hoje só PDF com texto.
- Locais e mapa: geocodificação em segundo plano.
