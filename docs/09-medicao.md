# 09 · Medição (Google Analytics 4) e Search Console

O objetivo é ver como as pessoas usam a PeekJob (por onde entram, onde desistem, o que procuram e não encontram) para decidir **o que refatorar e como evoluir a marca**, sem pôr em risco o anonimato de quem avalia.

## Regras de privacidade (não negociáveis)

- O GA só carrega **depois de a pessoa aceitar**. Recusar é tão fácil como aceitar, e a escolha pode ser mudada no Perfil, no rodapé ("Estatísticas") e em *Como calculamos → Privacidade*.
- **Sem publicidade:** Google Signals desligado, `ad_storage`, `ad_user_data` e `ad_personalization` sempre recusados.
- O Google **nunca** recebe ids, nomes de organizações no fluxo de avaliar, textos, emails, NIF, códigos ou tokens:
  - as páginas vão pelo **modelo da rota** (`/org/:id`, nunca o id);
  - os eventos passam por uma limpeza automática que remove campos proibidos e valores com aspeto de email, NIF ou token (testado);
  - no fluxo de avaliar só vai o **tipo** de organização (PME, Associação…), nunca qual;
  - o termo pesquisado só é enviado na pesquisa pública, nunca no fluxo de avaliar.
- Também não se mede nada sobre red flags, relatos de assédio ou contactos de apoio.

Verificado no browser num fluxo completo (entrar, pesquisar, avaliar, publicar): zero fugas; depois de retirar o consentimento não sai mais nada e os cookies `_ga` são apagados.

## Eventos

| Evento | Quando | Parâmetros | Para decidir… |
|---|---|---|---|
| `page_view` | Cada ecrã | `page_path` (modelo), `page_title` | Caminhos, entradas e saídas, funis |
| `prefs_saved` | Escolha das prioridades | `priorities_count`, `top_priority` | Que critérios importam mais (mensagem da marca) |
| `search` | Pesquisa estabilizada | `context` (pesquisa / avaliar), `search_term` (só pesquisa), `results_count`, `type_filter` | Falhas do catálogo (`results_count = 0`), linguagem das pessoas |
| `select_org` | Clique numa organização | `source` (página), `org_type`, `match` | Que listas funcionam (início, ranking, pesquisa, guardadas) |
| `nav_click` | Menu, barra inferior, rodapé | `area` (header, tabbar, footer), `item` | Arquitetura da informação: o que se usa e o que ninguém usa |
| `cta_click` | "Avaliar onde trabalho"; na página inicial também o primeiro clique (`abrir_espreitar`, `abrir_avaliar`) | `cta`, `area`, `source` | Onde colocar o botão principal; que zona da página inicial atrai mais (o "engagement" pedido pelo cliente) |
| `login_link_requested` / `login` | Link mágico | `result` (sent, rate_limited, success, link_expired…) | Atrito no login |
| `review_org_created` | Nova organização | `org_type`, `result` (created, existing…) | Qualidade do catálogo, duplicados |
| `verification` | Verificação | `method` (email, document, none), `step` (code_sent, confirmed, nif_not_found, skipped…) | Que verificação as pessoas preferem; onde falha |
| `review_submit` | Publicar | `result` (published, moderation_blocked, duplicate, auth…), `verified`, `criteria_count`, `tags_count`, `text_length` (escalões), `org_type` | Conversão final, impacto da moderação |
| `review_rewrite` | Reescrever com IA | `step` (requested, accepted, dismissed, failed), `trigger` (blocked, tone, manual), `source` (ai, rules) | Quantas pessoas escrevem com raiva, e se a proposta da IA é aceite ou recusada |
| `save_org`, `mark_helpful` | Guardar, "útil" | `saved` / `helpful` | Interesse e confiança no conteúdo |
| `moderation_appeal` | Pedido de revisão de uma decisão enviado | `result` | Quantas decisões são contestadas (qualidade da moderação) |
| `web_vitals` | LCP, INP, CLS | `metric_name`, `value`, `rating`, `page_path` | Que ecrãs refatorar por desempenho |

Propriedades do utilizador: `ui_lang` (pt/en), `app_version` (commit publicado, para comparar antes/depois de cada mudança) e `app_mode` (api ou demo).

**Medir um botão novo sem código:** `data-ev="cta_click" data-ev-cta="nome" data-ev-area="hero"` no elemento.

## Configurar (uma vez)

### Google Analytics 4
1. [analytics.google.com](https://analytics.google.com) → criar propriedade "PeekJob", fuso de Lisboa, moeda EUR → fluxo **Web** com o endereço do site. Copiar o **ID de medição** (`G-…`).
2. No fluxo Web, em *Medição otimizada*: **desligar "Visualizações de página: alterações com base no histórico do browser"** (a app envia os seus próprios `page_view`, sem ids). Desligar também "Interações com formulários".
3. *Admin → Recolha de dados*: Google Signals **desligado**; retenção de dados **14 meses**.
4. *Admin → Definições personalizadas*: registar como dimensões de evento `source`, `area`, `item`, `cta`, `context`, `result`, `method`, `step`, `org_type`, `type_filter`, `top_priority`, `text_length`, `metric_name`, `rating`; como dimensões de utilizador `app_version`, `app_mode`; como métricas `results_count`, `criteria_count`, `value`.
5. *Admin → Eventos-chave*: marcar `review_submit` (e, se quiserem, `login`).
6. No Render: `GA_MEASUREMENT_ID=G-…`. A demo do GitHub Pages pode ter uma propriedade separada (variável `GA_ID_DEMO` do repositório).

### Google Search Console
1. Com domínio próprio (recomendado): propriedade **Domínio** verificada por DNS. Sem domínio: propriedade **Prefixo de URL** (`https://peekjob.onrender.com`) → método *Etiqueta HTML* → copiar só o código do `content` para `GSC_VERIFICATION` no Render → **Verificar**.
2. *Sitemaps* → submeter `sitemap.xml`.
3. No GA: *Admin → Ligações de produtos → Search Console* (pesquisas do Google que trazem pessoas a cada página).

O que está preparado para o Google:
- URLs reais em produção (sem `#`), com os links antigos a continuar a funcionar;
- `robots.txt` que fecha as páginas pessoais;
- `sitemap.xml` com as organizações ativas e a versão em inglês de cada página (hreflang, `?lang=en`);
- 404 verdadeiros;
- título, descrição e canonical por página, com o nome da organização nas páginas de cada uma;
- dados estruturados `EmployerAggregateRating` (nota e nº de avaliações).

A demo e as páginas pessoais têm `noindex`.

## Análises para o refactoring e rebranding

1. **Funil de avaliar** (Explorar → Exploração de funil): `/avaliar` → `/avaliar/verificar` → `/avaliar/notas` → `/avaliar/texto` (mobile) → `review_submit` com `result = published`. Dividir por dispositivo e por `verification.step`. Mostra onde as pessoas desistem.
2. **Caminhos a partir do início** (Exploração de caminhos): o que se faz depois de `/` e de `/ranking`. Se ninguém passa por `/setores`, é candidato a sair do menu.
3. **Navegação:** `nav_click` por `area` × `item`, para decidir que entradas ficam no menu, na barra inferior e no rodapé.
4. **Catálogo:** `search` com `results_count = 0` por `search_term`. Dá a lista de organizações a acrescentar ao seed.
5. **Desempenho:** `web_vitals` com `rating = poor` por `page_path`, para saber que ecrãs refatorar primeiro.
6. **Antes/depois:** comparar qualquer métrica por `app_version` depois de cada publicação (por exemplo, nova marca ou novo layout).
7. **Search Console:** consultas e páginas com muitas impressões e poucos cliques. Indica títulos e descrições a melhorar, e a linguagem a usar na marca.

**Limite a ter em conta:** só mede quem aceita. As percentagens (funis, preferências) são fiáveis; os totais de visitas ficam abaixo da realidade.

## Antes de ligar em produção
- **Política de privacidade:** acrescentar o Google Analytics (Google Ireland), a finalidade, a base legal (consentimento) e a retenção. Fica para a revisão jurídica.
- **GA:** aceitar os termos de tratamento de dados.
