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
| 7 | **Autenticação provisória** por cabeçalhos (`x-user-id`), desligada em produção | Permite testar os fluxos já; o link mágico vem na próxima fatia | — |

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

## API (primeira fatia)

| Método | Rota | Quem | O que faz |
|---|---|---|---|
| GET | `/orgs/search?q=&type=&includePending=` | todos | Pesquisa tolerante (acentos, maiúsculas, erros, nomes antigos) |
| POST | `/orgs` | sessão | Cria a organização pendente e devolve os possíveis duplicados |
| GET | `/orgs/:id` | todos | Organização ativa com nota, nº de avaliações e média por critério; fundida → 308 |
| POST | `/orgs/:id/approve` | moderador | Ativa uma organização pendente |
| POST | `/orgs/:id/merge` | moderador | Funde um duplicado (`{ targetId }`) |
| POST | `/orgs/:id/reviews` | sessão | Publica uma avaliação |
| GET | `/orgs/:id/reviews` | todos | Avaliações públicas, sem pseudónimos |
| GET | `/me/messages` | sessão | Mensagens privadas de apoio com os contactos |
| POST | `/me/messages/:id/read` | sessão | Marca a mensagem como lida |
| GET | `/health` | todos | Estado da API e da base de dados |

Ao publicar uma avaliação, a API responde assim:

| Situação | Resposta |
|---|---|
| Insultos ou nomes de pessoas | 422, com uma sugestão de texto sem eles |
| Possível ilegalidade | Publica a avaliação, marca-a e cria uma mensagem privada de apoio |
| A mesma pessoa avalia a mesma organização uma segunda vez | 409 |

## Correr localmente

```bash
docker compose up -d db                  # PostgreSQL 16
cp apps/api/.env.example apps/api/.env   # ajustar se necessário
npm install
npm run build -w @peekjob/shared
npm run build -w @peekjob/api
DATABASE_URL=postgres://postgres:postgres@localhost:5432/peekjob npm run migrate -w @peekjob/api
DATABASE_URL=postgres://postgres:postgres@localhost:5432/peekjob npm run seed -w @peekjob/api
npm run dev:api
```

## Testes

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/peekjob_test npm test
```

- **Domínio partilhado:** 41 testes (vitest).
- **API:** 34 testes, entre unitários e de integração contra PostgreSQL. A base de testes é recriada em cada execução.

## Próxima fatia
- Autenticação por link mágico (email) e sessão por cookie httpOnly.
- Verificação anónima: código por email da organização ou NIF lido do recibo/contrato, com o ficheiro apagado logo a seguir.
- Ligar a web à API (substituir os dados de exemplo).
- Locais e mapa: geocodificação em segundo plano.
- Moderação: API de moderação + LLM para casos duvidosos e fila humana.
