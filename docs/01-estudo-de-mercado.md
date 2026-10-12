# Estudo de mercado — Plataforma de ranking de empregadores

11 de outubro de 2026 · Pedro Oliveira

> **Nota (12 out. 2026):** este estudo é anterior à reunião com o cliente. As decisões tomadas a seguir (foco em PME, associações, voluntariado e empresas em nome individual; ênfase em direitos humanos e diversidade; red flags; preferências do utilizador) estão em [02 · Decisões da reunião](02-decisoes-reuniao.md) e substituem o que aqui diverge — por exemplo, "todos os setores" passa a "pequenas organizações de todos os setores", e as barras horizontais deram lugar a anéis e bolinhas.

## Resumo executivo

Há espaço em Portugal para um ranking de empregadores aberto a todos os setores: o Teamlyzer só cobre TI, o Great Place to Work só avalia empresas que pagam a certificação, e o Glassdoor perdeu confiança e foi absorvido pelo Indeed em 2026.

A diferenciação mais forte é combinar quatro coisas que nenhum concorrente junta: **todos os setores em PT-PT**, **anonimato verificável** (verificado, mas sem guardar identidade), **ranking com fórmula pública** e **moderação por IA que ajuda a reformular** em vez de só bloquear.

Uma "base de dados gigantesca" não é necessária no arranque: um PostgreSQL gerido aguenta milhões de avaliações. O risco real é o oposto — ter conteúdo suficiente nos primeiros meses (cold start).

Pressuposto deste estudo: plataforma de avaliação de empregadores, dadas as três referências. Se o domínio for outro, a estrutura mantém-se e muda a secção de concorrentes.

## Panorama de concorrentes

Os concorrentes dividem-se em dois modelos: avaliações abertas e anónimas (Glassdoor, Teamlyzer, Kununu) e certificação paga pela empresa (Great Place to Work).

| Plataforma | Modelo | Cobertura | Ponto forte | Ponto fraco |
| --- | --- | --- | --- | --- |
| [Teamlyzer](https://pt.teamlyzer.com/) | Avaliações anónimas, grátis; não aceita pagamento para mexer em rankings | Portugal, só TI | Comunidade tech forte; \~3.500 profissionais votaram nos prémios 2025; \~4.800 empresas no ranking de pesquisas Q2 2026 | Exclui todos os outros setores |
| [Great Place to Work PT](https://www.greatplacetowork.pt/melhores-lugares-para-trabalhar) | Inquérito interno pago pela empresa; 75% opinião dos colaboradores, 25% práticas de RH | Portugal, empresas que aderem | Marca reconhecida; ranking 2026 com 50 vencedoras, 250+ organizações e 85.000 colaboradores | Só aparece quem paga; sem avaliações negativas públicas |
| [Glassdoor](https://www.glassdoor.com) | Avaliações anónimas + salários + entrevistas | Global | Escala: \~55M visitas/mês e 180M+ avaliações | Exige nome real desde 2024; login Indeed obrigatório desde nov. 2025; fundido no Indeed em jul. 2026 |
| [Kununu](https://www.kununu.com) | Avaliações anónimas de colaboradores e candidatos | Alemanha, Áustria, Suíça | Líder na região DACH; 14 critérios de avaliação | Sem presença em Portugal |
| Blind, Comparably, InHerSight | Nichos: email corporativo verificado; cultura; experiência de mulheres | Sobretudo EUA | Ideias de verificação e segmentação | Pouca relevância em PT |

Leitura: em Portugal ninguém ocupa o espaço "todos os setores, opinião aberta, independente". O Glassdoor cobre-o no papel, mas é genérico, em inglês primeiro, e a confiança no anonimato ficou abalada.

## Lacunas e oportunidades de diferenciação

A proposta de valor: **o Teamlyzer para todos os setores, com a garantia de anonimato que o Glassdoor deixou de dar.**

1. **Todos os setores, PT-PT nativo.** Restauração, retalho, saúde, indústria, call centers — onde há mais rotação e menos informação pública.
2. **Anonimato verificável.** Verificação por email corporativo ou código de convite; guarda-se só um hash e apaga-se o email. Política escrita: "não temos o teu nome, logo não o podemos entregar". É a resposta direta à polémica de 2024 do Glassdoor.
3. **Ranking com fórmula pública.** Média bayesiana (empresas com 3 avaliações não batem as que têm 300), peso da recência, mínimo de avaliações para entrar no ranking. Empresas não pagam para subir nem para esconder avaliações.
4. **Critérios do mercado português.** Cumprimento de horários, contrato vs. recibos verdes, pagamento a tempo, teletrabalho real, subsídio de alimentação, progressão.
5. **Moderação que educa.** Antes de publicar, a IA aponta a frase problemática e sugere uma versão factual. Mantém a crítica, tira o insulto e o nome de pessoas.
6. **Avaliar em menos de 2 minutos no telemóvel.** Sliders por critério, 1 campo de texto, publicar. Quanto mais curto, mais conteúdo.
7. **Direito de resposta grátis para empresas.** A monetização vem de páginas de employer branding, anúncios de vagas e relatórios agregados — nunca de controlo sobre as avaliações.

O ponto 2 e o ponto 5 são os mais difíceis de copiar e os que mais pesam na confiança; devem estar no POC.

## Base de dados gigantesca: é necessária?

Não no arranque. O volume de um ranking de empregadores é modesto para uma base relacional; o que precisa de ser grande é o **catálogo de empresas** (para o utilizador encontrar a sua) e, com o tempo, o **número de avaliações**.

| Fase | Empresas | Avaliações | Infraestrutura sugerida |
| --- | --- | --- | --- |
| POC | \~50 (dados fictícios) | \~500 | PostgreSQL gerido (Supabase ou Neon), plano grátis |
| MVP | 10.000–50.000 | até 100.000 | Mesma base, plano pago; pesquisa com índice full-text do Postgres |
| Escala | 500.000+ | milhões | Postgres + réplicas de leitura + motor de pesquisa (Typesense ou Meilisearch) + cache dos rankings |

Valores estimados, não medidos. Mesmo na fase "Escala", estamos a falar de dezenas de GB, não de big data.

Três cuidados:

- **Semear o catálogo** a partir de fontes de registo comercial licenciadas, nunca copiando conteúdo do Glassdoor ou Teamlyzer (termos de uso e direitos de autor).
- **Rankings pré-calculados** (tabela materializada atualizada de hora a hora), para a página de ranking nunca fazer agregações pesadas em tempo real.
- **Cold start**: lançar por um setor ou cidade de cada vez e convidar avaliadores antes de abrir ao público. Uma base enorme vazia vale menos do que uma pequena cheia.

## Moderação de comentários: plugin vs IA

Recomendação: IA em três camadas, com uma API de moderação gratuita na base e um LLM só para os casos duvidosos. Um plugin de palavrões sozinho não chega: falha o sarcasmo, a ameaça velada e, sobretudo, a acusação nominal a um chefe, que é o maior risco legal deste tipo de site.

| Opção | Custo | PT-PT | Veredito |
| --- | --- | --- | --- |
| [Perspective API](https://perspectiveapi.com/) (Google) | Grátis | Fraco: AUC 0,744 em português vs 0,942 em inglês | **Descartar** — desligada a 31 dez. 2026 |
| [OpenAI omni-moderation](https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/) | Grátis (com limites por nível de uso) | Multilíngue, 40+ línguas | **Camada base** para toxicidade |
| LLM com política própria (Claude, GPT, etc.) | Pago por chamada, cêntimos | Bom | **Casos cinzentos** e sugestão de reformulação |
| Lista de palavras / regex | Grátis | Manual | Filtro rápido de dados pessoais |

Fluxo de publicação:

1. **Regras locais** detetam dados pessoais: nomes próprios, emails, telefones. Pedem ao utilizador para os retirar.
2. **API de moderação** classifica toxicidade. Score alto → bloqueia com explicação; score baixo → segue.
3. **LLM** só na zona intermédia: verifica a política da casa (ataque pessoal, acusação de crime, discriminação) e devolve uma reformulação factual sugerida.
4. **Fila humana** para o que o LLM não decide com confiança e para denúncias de utilizadores ou empresas.

O passo 3 é o diferenciador: o utilizador vê "a tua crítica é válida, mas esta frase pode ser removida — queres usar esta versão?" antes de publicar.

## Design e UX mobile-first

O ecrã inicial é uma barra de pesquisa e pouco mais; tudo o resto está a um toque.

- **Navegação inferior com 4 separadores:** Pesquisar, Rankings, Avaliar, Perfil. O botão Avaliar fica sempre visível.
- **Página de empresa:** nota global grande, número de avaliações, 4–6 subnotas em barras horizontais, depois avaliações mais recentes. Resposta da empresa recolhida por baixo de cada avaliação.
- **Fluxo de avaliação em 3 passos:** escolher empresa → sliders por critério → texto curto com feedback da moderação em linha.
- **Rankings:** filtros por setor, distrito e dimensão da empresa; cada linha mostra posição, nota e nº de avaliações.
- **Visual:** fundo neutro, uma única cor de destaque, tipografia sem serifa (ex.: Inter), cartões com muito espaço, modo escuro, contraste WCAG AA.
- **PWA:** instalável no telemóvel sem passar pelas lojas de apps; uma app nativa (React Native) só se a tração o justificar.

No desktop, a mesma interface ganha uma coluna lateral com filtros; não há um segundo design.

## Riscos legais e de confiança

O maior risco não é técnico: é uma empresa processar por difamação ou exigir a identidade de quem escreveu. Vale validar com um advogado antes do lançamento público.

- **Difamação:** proibir nomes de pessoas e acusações de crimes nas avaliações (camadas 1 e 3 da moderação).
- **RGPD:** minimizar dados do avaliador (hash em vez de email), direito ao apagamento, política de privacidade clara.
- **Regulamento dos Serviços Digitais (DSA):** mecanismo de denúncia de conteúdo ilegal e explicação das decisões de moderação. Micro e pequenas empresas estão isentas de parte das obrigações, mas não das básicas.
- **Avaliações falsas:** empresas a inflacionar a nota ou concorrentes a afundá-la. Limite por domínio de email, deteção de picos e sinal "verificado" visível.

## Stack proposta e âmbito do POC

POC em cerca de 2 semanas, com um único projeto TypeScript para mostrar o fluxo completo: pesquisar, ver empresa, avaliar com moderação, ver ranking.

| Camada | Escolha | Porquê |
| --- | --- | --- |
| Frontend | Next.js (React + TypeScript), Tailwind, PWA | SEO das páginas de empresa e mobile-first |
| API | Route handlers do Next.js | Um só deploy no POC; pode migrar para Spring Boot se o cliente preferir Java |
| Base de dados | PostgreSQL (Supabase) + Prisma | Grátis no arranque; full-text search incluído |
| Moderação | OpenAI omni-moderation + LLM para casos cinzentos | Grátis na base; reformulação sugerida |
| Deploy | Vercel | URL público para o cliente testar no telemóvel |

Dentro do POC:

- [ ] Pesquisa de empresas com autocomplete
- [ ] Página de empresa com nota global e subnotas
- [ ] Formulário de avaliação em 3 passos com moderação em tempo real
- [ ] Ranking por setor com média bayesiana
- [ ] \~50 empresas e \~500 avaliações fictícias

Fora do POC: verificação por email corporativo, contas de empresa, salários, backoffice de moderação humana.

## Perguntas para o cliente

- [ ] O domínio é avaliação de empregadores, ou as referências servem só de modelo de ranking para outro tipo de lugar?
- [ ] Todos os setores desde o início, ou lançar por um setor/cidade?
- [ ] Verificação do avaliador obrigatória, opcional (selo "verificado") ou inexistente?
- [ ] Incluir salários e processos de entrevista, como o Teamlyzer e o Glassdoor?
- [ ] Modelo de negócio previsto e o que as empresas podem (e não podem) pagar.

## Fontes

- [Teamlyzer: prémios 2025 (Intellias)](https://career.intellias.com/portugal/teamlyzer-honors-intellias-with-triple-awards-for-engineering-consultancy-and-best-it-company-to-work-for)
- [Teamlyzer: empresas mais pesquisadas Q2 2026](https://pt.linkedin.com/in/dmp593)
- [Teamlyzer: independência e anonimato (Echo Boomer)](https://echoboomer.pt/teamlyzer-portal-entrevistas-ti/)
- [GPTW: metodologia 75/25 (Jornal Económico)](https://jornaleconomico.sapo.pt/?p=1284247)
- [GPTW: ranking 2026](https://conteudo.greatplacetowork.pt/hubfs/Vencedora-Melhores-Lugares-Para-Trabalhar-2026.docx)
- [Glassdoor: nomes reais (TechCrunch)](https://techcrunch.com/?p=2681423)
- [Glassdoor: fusão no Indeed (Reworked)](https://reworked.co/employee-experience/glassdoor-folds-into-indeed/)
- [Glassdoor: visitas e volume de avaliações](https://ghost.pin.com/glassdoor-alternatives-employer-branding/)
- [Perspective API: anúncio de fim](https://perspectiveapi.com/)
- [Perspective API em português (SBC)](https://sol.sbc.org.br/index.php/stil/article/view/31112)
- [OpenAI omni-moderation](https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model/)
- [DSA e pequenas empresas (PLMJ)](https://www.plmj.com/xms/files/TMT_Digital_Acts_Da_Regulacao_Europeia_a_Execucao_Nacional.pdf)
