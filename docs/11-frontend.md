# 11 · Frontend: arquitetura, estilos e qualidade

Convenções do refactoring de 2026-10, aplicadas ecrã a ecrã. O fluxo de avaliar (escolher, verificar, notas e texto) já segue todas e serve de referência.

## Estrutura

```
apps/web/src/
  features/<área>/      lógica e peças de uma área (review, verify…)
    useXxx.ts           hook: dados, estado e ações (sem JSX)
    xxx.ts              funções puras (validação, formatação, regras)
    XxxParts.tsx        componentes de apresentação (props in, JSX out)
    Xxx.module.css      estilos da área
  pages/Xxx.tsx         ecrã: guardas (redirecionar, esperar dados), escolhe o layout e liga hooks a componentes
  components/           peças partilhadas por várias áreas (Layout, Sheet, Icon…)
  styles/global.css     tokens (cores, tipos, espaços) e classes base (.btn, .card, .page…)
```

- **Lógica fora do render.** O ecrã não tem regras de negócio: chama um hook (`useReviewDraft`, `useOrgPicker`, `useVerification`) e passa o resultado aos componentes. As regras puras (`publishErrorMessage`, `validateNewOrg`, `writeDigits`, `codeStatus`) são funções sem React, testadas sozinhas.
- **Navegação no ecrã.** As ações dos hooks devolvem `true`/`false` (ex.: `publish()`). É o ecrã que decide para onde ir, e assim os hooks servem a vários ecrãs (telemóvel e computador).
- **Um hook por responsabilidade.** Por exemplo, a lógica de publicar estava duplicada entre o passo de texto no telemóvel e o ecrã único no computador; agora está só em `useReviewDraft`.

## Estilos

- **CSS Modules** (nativos do Vite, sem dependências), um ficheiro por área ou ecrã. Os nomes de classe ficam locais e não colidem.
- **Sem estilos inline.** Só se usa `style` para valores realmente dinâmicos, passados como variáveis CSS. Exemplo: a cor de cada critério, `style={{ '--criterion': cor }}` com `border-color: var(--criterion)` no módulo.
- **Telemóvel por omissão, computador em `@media (min-width: 900px)`.** O `useIsDesktop()` em JavaScript fica só para diferenças de estrutura (layouts diferentes, textos diferentes), nunca para tamanhos, cores ou espaços.
- **Ordem do CSS:** o `main.tsx` importa o `global.css` primeiro. Os módulos vêm depois e ganham nos empates de especificidade.
- **Cuidado com regras globais compostas**: têm mais especificidade do que uma classe de módulo. Ou se retira a classe global que não se quer, ou se iguala a especificidade no módulo, com um comentário a explicar. As que já apareceram:
  - `.page.no-nav` (padding em baixo) → tirar `no-nav` quando o módulo define o padding;
  - `.segmented button` → `.minhaClasse button`;
  - `.field > label` → `.meuCampo > label`;
  - `a.plain` (`color: inherit`) → `a.minhaClasse` quando a ligação tem cor própria.
- **Estilos inline antigos com spread** (`{ ...base, border: 0, borderTop: … }`): a chave repetida fica na posição original, por isso o `border: 0` apagava o `borderTop`. Ao passar para CSS, confirmar o que o ecrã realmente mostrava.
- **Estados por atributos ARIA** quando existem (`[aria-selected='true']`, `[aria-checked='true']`, `[aria-pressed='true']`). O estilo segue o estado acessível e não há classes duplicadas.

## `useMemo` e `useCallback`: só onde compensa

- **`useMemo`:** para cálculos que correm muitas vezes e custam (moderação local a cada tecla, ordenar listas de organizações, rankings, compatibilidade). Não se usa para contas triviais (somar notas de 8 critérios).
- **`useCallback`:** nas ações que os hooks devolvem, porque são passadas a componentes e listas e as ações da loja já são estáveis (`useMemo` no `StoreProvider`). Não se usa em funções criadas e usadas no mesmo componente.
- **Medir antes:** em dúvida, o React Profiler decide. Memorizar tem custo (memória e comparação de dependências).

## Testes

| Camada | Ferramenta | O quê |
|---|---|---|
| Funções puras | Vitest | Regras, validações, formatação |
| Hooks | Testing Library (`renderHook`) | Estado e ações, com os providers da app em modo demonstração |
| Ecrãs | Testing Library + user-event (jsdom) | O que a pessoa vê e faz, em telemóvel e computador (`renderScreen`, `WithDraft`, `WithoutDraft`) |
| Fluxos | Playwright (`e2e/`) | A app real (API + PostgreSQL), acessibilidade (axe) e teclado |
| Visual | `npm run visual:compare -- <commit>` | Os mesmos ecrãs e estados (`e2e/visual/scenarios.mjs`; `full: true` fotografa a página inteira, `run` abre secções antes da foto), nas duas versões, comparados píxel a píxel |

**Antes de refazer um ecrã:**
1. Testes de caracterização, que têm de passar com o código antigo.
2. Refazer.
3. Os mesmos testes têm de continuar verdes.
4. `npm run visual:compare -- <commit antes do refactor>` tem de dar "iguais à referência".

A comparação visual apanhou regressões que os testes não viam: uma ligação que desapareceu, espaços e tamanhos alterados pela especificidade do CSS. Por isso faz parte do processo.

## Qualidade (SonarQube)

- **No CI, em cada envio:** cobertura dos unitários (web, API e shared) mais a cobertura dos testes no browser (build instrumentada com istanbul), juntas por linha.
- **Quality Gate:** cobertura ≥ 80%, fiabilidade, segurança e manutenção com nota A, duplicação ≤ 3%.
- **Resultado:** o resumo e os problemas (com ficheiro e linha) aparecem como anotações no run do GitHub, mais a lista dos ficheiros com mais linhas por cobrir.
- **Localmente:** `npm run test:coverage -w @peekjob/web` (e o mesmo para api e shared). No editor, o SonarLint (VS Code ou IntelliJ) aplica as mesmas regras antes do commit.
