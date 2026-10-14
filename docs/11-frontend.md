# 11 · Frontend: arquitetura, estilos e qualidade

Convenções do refactoring de 2026-10, aplicadas ecrã a ecrã. **Estado: concluído** — todos os ecrãs e componentes partilhados seguem estas regras; o único `style` que resta passa variáveis CSS com valores dinâmicos (cor de um critério, tamanho de um anel, ângulo).

## Estrutura

```
apps/web/src/
  features/<área>/      lógica e peças de uma área (review, verify…)
    useXxx.ts           hook: dados, estado e ações (sem JSX)
    xxx.ts              funções puras (validação, formatação, regras)
    XxxParts.tsx        componentes de apresentação (props in, JSX out)
    Xxx.module.css      estilos da área
  pages/Xxx.tsx         ecrã: guardas (redirecionar, esperar dados), escolhe o layout e liga hooks a componentes
  components/           peças partilhadas por várias áreas (Layout, Sheet, Icon, Data, UI…), cada uma com o seu .module.css
  lib/                  regras e hooks transversais (rating, download, useBack, useToggle, useFlip, useHashScroll…)
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
  - `a.plain` (`color: inherit`) → `a.minhaClasse` quando a ligação tem cor própria;
  - `.search input` → `.minhaClasse input`;
  - `.btn[disabled]` (fundo e contorno cinzentos) → `.minhaClasse, .minhaClasse[disabled]` quando o botão tem de manter a cor enquanto espera (ex.: apagar a conta, reescrever).
- **`composes`** só funciona em seletores de uma classe (`.x { composes: display; }`); em `a.x` repetem-se as declarações.
- **Setas que rodam:** `[aria-expanded='true'] > .chevron { transform: rotate(180deg) }` (Accordion, Disclosure), sem estado em JavaScript.
- **Estilos inline antigos com spread** (`{ ...base, border: 0, borderTop: … }`): a chave repetida fica na posição original, por isso o `border: 0` apagava o `borderTop`. Ao passar para CSS, confirmar o que o ecrã realmente mostrava.
- **Estados por atributos ARIA** quando existem (`[aria-selected='true']`, `[aria-checked='true']`, `[aria-pressed='true']`, `[aria-expanded='true']`). O estilo segue o estado acessível e não há classes duplicadas. Para estados sem ARIA usa-se `data-*` (`data-on`, `data-state`, `data-fill`, `data-muted`).
- **Sem `<style>` embutido** em componentes: `:hover`, `:focus-within` e pseudo-elementos ficam no módulo.

## `useMemo` e `useCallback`: só onde compensa

- **`useMemo`:** para cálculos que correm muitas vezes e custam (moderação local a cada tecla, ordenar listas de organizações, rankings, compatibilidade). Não se usa para contas triviais (somar notas de 8 critérios).
- **`useCallback`:** nas ações que os hooks devolvem, porque são passadas a componentes e listas e as ações da loja já são estáveis (`useMemo` no `StoreProvider`). Não se usa em funções criadas e usadas no mesmo componente.
- **`React.memo`:** só em componentes que se repetem e cujas props ficam iguais na interação mais comum: `ScoreRow` (dar uma nota só volta a correr essa linha), `TagPicker`, `RecommendButtons`, `MiniSteps` (não correm a cada tecla do comentário), `ResultRow`, `TypeChips`, `Searching` (não correm a cada tecla na pesquisa) e as linhas do ranking. Para o memo funcionar, as ações têm de ser estáveis: o `updateDraft` aceita uma função do rascunho atual (`updateDraft((d) => ({ scores: withScore(d.scores, k, n) }))`), por isso `setScore` e `toggleTag` não dependem das notas nem das etiquetas.
- **Medir antes:** `npm run react:profile -- <commit>` constrói as duas versões com o React de profiling e corre as mesmas interações (`e2e/visual/profile-scenarios.mjs`) com o CPU 4× mais lento, 7 vezes cada. Compara as medianas de commits, componentes que correram mesmo (os saltados por memo não contam) e tempo de render. Memorizar tem custo (memória e comparação de props); sem ganho medido, não se memoriza.

**Medição (14/10, antes do refactoring `78dcf8c` → agora, medianas de 7 repetições, CPU 4×):**

| Interação | Ecrã | Componentes | Render |
|---|---|---|---|
| Pesquisa: escrever "padaria porto" | telemóvel | 301 → 238 (−21%) | 68,8 → 51,3 ms (−25%) |
| | computador | 764 → 710 (−7%) | 96,1 → 85,8 ms (−11%) |
| Avaliar: nota aos 8 critérios | telemóvel | 128 → 72 (−44%) | 38,7 → 17,3 ms (−55%) |
| | computador | 376 → 328 (−13%) | 72,9 → 54,1 ms (−26%) |
| Avaliar: escrever o comentário (60 teclas) | telemóvel | 684 → 684 | 90,4 → 85,3 ms (−6%) |
| Ranking: mudar a ordem 4 vezes | telemóvel | 204 → 204 | 38,7 → 34,5 ms (−11%) |
| | computador | 252 → 280 (+11%) | 44,3 → 43,8 ms (−1%) |
| Organização: critérios, útil, guardar | telemóvel | 194 → 203 (+5%) | 35,5 → 28,2 ms (−21%) |
| | computador | 283 → 298 (+5%) | 46,4 → 40,5 ms (−13%) |
| Preferências: 6 escolhas | telemóvel | 45 → 51 (+13%) | 15,6 → 14,6 ms (−6%) |
| | computador | 69 → 75 (+9%) | 20,2 → 16,5 ms (−18%) |

O número de commits é igual em todas (o refactoring não acrescentou atualizações). Onde há mais componentes é porque agora são mais pequenos (ex.: cada linha do ranking é um componente); o tempo não piorou em nenhuma interação. Variações abaixo de ~10% estão dentro do ruído. O que sobra a cada tecla no computador é sobretudo o cabeçalho e o rodapé: as ligações do React Router voltam a correr quando o endereço muda (`?q=`), e o memo não evita isso.

## Testes

| Camada | Ferramenta | O quê |
|---|---|---|
| Funções puras | Vitest | Regras, validações, formatação |
| Hooks | Testing Library (`renderHook`) | Estado e ações, com os providers da app em modo demonstração |
| Ecrãs | Testing Library + user-event (jsdom) | O que a pessoa vê e faz, em telemóvel e computador (`renderScreen`, `WithDraft`, `WithoutDraft`) |
| Fluxos | Playwright (`e2e/`) | A app real (API + PostgreSQL), acessibilidade (axe) e teclado |
| Visual | `npm run visual:compare -- <commit>` | Os mesmos ecrãs e estados (`e2e/visual/scenarios.mjs`; `full: true` fotografa a página inteira, `run` abre secções antes da foto), nas duas versões, comparados píxel a píxel |

**Simular erros da API:** um `vi.fn` assíncrono que rejeita faz falhar o teste neste runner, mesmo quando o componente apanha o erro. Usa-se uma função simples por trás do mock (`let impl = async () => …; api: (p) => impl(p)`), como em `test/components/NifField.test.tsx`.

**Antes de refazer um ecrã:**
1. Testes de caracterização, que têm de passar com o código antigo.
2. Refazer.
3. Os mesmos testes têm de continuar verdes.
4. `npm run visual:compare -- <commit antes do refactor>` tem de dar "iguais à referência".

A comparação visual apanhou regressões que os testes não viam: uma ligação que desapareceu, espaços e tamanhos alterados pela especificidade do CSS. Por isso faz parte do processo.

## Qualidade (SonarQube)

- **No CI, em cada envio:** cobertura dos unitários (web, API e shared) mais a cobertura dos testes no browser (build instrumentada com istanbul), juntas por linha.
- **Quality Gate (bloqueia):** cobertura ≥ 80%, fiabilidade, segurança e manutenção com nota A, duplicação ≤ 3%. Se falhar, o CI fica vermelho, a demo não é publicada e a promoção para produção recusa esse commit.
- **Resultado:** o resumo e os problemas (com ficheiro e linha) aparecem como anotações no run do GitHub, mais a lista dos ficheiros com mais linhas por cobrir.
- **Antes de enviar:** `npm run sonar:local` corre o mesmo que o CI (testes com cobertura, testes no browser, SonarQube e Quality Gate) em contentores Docker temporários e termina com erro se o Quality Gate falhar. `SONAR_SKIP_E2E=1` salta os testes no browser (mais rápido, mas a cobertura da web fica mais baixa do que no CI).
- **Só os testes:** `npm run test:coverage -w @peekjob/web` (e o mesmo para api e shared). No editor, o SonarLint (VS Code ou IntelliJ) aplica as mesmas regras enquanto se escreve.
