# PeekJob · POC

Prova de conceito da PeekJob: avaliações anónimas de quem trabalha em **PME, associações, voluntariado e empresas em nome individual**, com foco em **respeito, direitos humanos e diversidade**.

A documentação do projeto (estudo de mercado, decisões, ecrãs, marca) está em [`docs/`](docs/00-indice.md).

Uma única aplicação web, *mobile first*. Abaixo de 900 px mostra os ecrãs mobile; a partir de 900 px mostra os ecrãs desktop. Os ecrãs seguem os designs aprovados no canvas.

## Correr localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ (estático, funciona em qualquer alojamento)
npm run preview
```

Requisitos: Node 18 ou superior.

## O que está incluído

| Área | Rotas |
|---|---|
| Primeira visita | `/preferencias` (3 prioridades por ordem) → `/a-preparar` (logo animado) |
| Descobrir | `/` (Para ti), `/pesquisa`, `/ranking` (com filtros), `/setores`, `/metodologia` |
| Organização | `/org/:id` (avaliações), `/org/:id/entrevistas`, `/org/:id/salarios`, `/org/:id/denunciar/:reviewId` |
| Avaliar | `/avaliar` (organização e local no mapa) → `/avaliar/verificar` (email ou documento) → `/avaliar/notas` → `/avaliar/texto` → `/avaliar/feito` |
| Apoio | `/apoio`: mensagem privada com os contactos da ACT, CITE, APAV e 112 |
| Conta | `/guardadas`, `/perfil`, `/entrar` (link mágico) |
| Organizações | `/para-organizacoes` (planos), `/painel` (responder a avaliações) |

### Regras de produto implementadas
- **Compatibilidade "para ti"**: média ponderada das 3 prioridades, com pesos 3, 2 e 1 (`src/lib/match.ts`).
- **Nota ajustada do ranking**: média bayesiana com C = 5. Mínimo de 5 avaliações para entrar no ranking.
- **Red flags** (`src/lib/moderation.ts`): o texto e as etiquetas são analisados à procura de salário em atraso, assédio, humilhação, trabalho sem contrato, horas extra e discriminação.
  - Se detetar algum destes casos, mostra o aviso "Isto pode ser uma ilegalidade", mas não impede a publicação.
  - Se a pessoa tiver sessão iniciada, recebe uma mensagem privada com os contactos de apoio.
- **Insultos e nomes de pessoas**: bloqueiam a publicação. O utilizador pode aplicar uma versão reescrita sem nomes.
- **Anonimato**: a verificação só regista que a pessoa trabalha na organização. O email ou ficheiro usado não fica guardado.
- **Respeito e inclusão**: critério próprio, sempre a roxo, com um filtro "Respeito 4 ou mais".

## Estrutura

```
src/
  api/          camada de dados (hoje: dados de exemplo; trocar por pedidos HTTP)
  components/   Ring, Dots, MapView, LogoAnimated, Layout (header, barra inferior)…
  data/         critérios, organizações de exemplo, contactos de apoio, textos
  lib/          match, moderação, formatação, estado (store) e media queries
  pages/        um ficheiro por ecrã (cada um com a versão mobile e a desktop)
  styles/       tokens da marca e estilos base
public/         logótipos, favicon, ícones da app, web manifest
```

## Estado e dados

- O estado (preferências, guardadas, rascunho, avaliações, mensagens) vive em `src/lib/store.tsx` e fica guardado no `localStorage`.
- Para a demonstração:
  - a aplicação começa com sessão iniciada;
  - o rascunho de avaliação de exemplo contém uma red flag.
- Em **Perfil → Repor dados de demonstração** volta-se ao estado inicial.

### Ligar a um backend

`src/api/orgs.ts` concentra as leituras. Os hooks (`useOrgs`, `useOrg`, `useRankedOrgs`, `searchOrgs`) mantêm os mesmos tipos, por isso basta trocá-los por pedidos à API. Por exemplo, com React Query: `GET /orgs`, `GET /orgs/:id`, `GET /orgs?q=&type=`.

As escritas são as acções do store, cada uma com o pedido HTTP correspondente:

| Acção | Pedido |
|---|---|
| `publish` | `POST /reviews` |
| `toggleSave` | `PUT /me/saved` |
| `reply` | `POST /reviews/:id/replies` |
| `login` | link mágico por email |

## Antes de produção

- Fazer a revisão jurídica do RGPD, da política de moderação e dos textos de apoio. Os contactos estão em `src/data/content.ts`. O telefone da ACT não foi verificado, por isso só é mostrado o site.
- Substituir as regras de moderação por um modelo no servidor com revisão humana.
- Implementar a verificação real (código por email e leitura do NIF), garantindo que a organização nunca fica ligada ao email ou ao ficheiro.
- Mapa real: trocar `MapView` por MapLibre ou Leaflet com OpenStreetMap, usando o `lat`/`lng` já presente nos dados.
- SEO: renderização no servidor (ex.: Next.js) para as páginas públicas das organizações.

## Marca

- **Cores**: ink `#010B13`, teal `#00A9AF` e roxo `#652D90` (Respeito e inclusão).
- **Tipografia**: Jost nos títulos e Geist no texto.
- **Logo animado**: `src/components/Brand.tsx`. É SVG + CSS e respeita a definição "reduzir movimento".
