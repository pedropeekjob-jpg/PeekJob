# 03 · Ecrãs e fluxos

O design completo está no **canvas** (privado): https://claude.ai/artifact/16d6Uxfp8PCM7PGgdYo6Zf — 21 ecrãs mobile e 21 desktop, ligados entre si, mais a ficha do logo animado e do ícone. As capturas abaixo são do POC (pasta [`ecras/`](ecras/)).

## Princípios
- **Uma pergunta por ecrã.** A resposta aparece no topo, grande (anel + "% para ti" + uma frase).
- **Revelação progressiva:** o secundário fica a um toque ("Ver os 8 critérios", "Ver todas", acordeões).
- **Listas magras:** anel, nome, um dado, % para ti.
- **Mobile first:** abaixo de 900 px, barra inferior com botão central "Avaliar"; a partir de 900 px, cabeçalho com navegação.
- **Dois idiomas:** português por omissão e inglês (UK), com o seletor PT · EN no cabeçalho, rodapé e Perfil. O conteúdo escrito pelas pessoas fica no idioma original.

## Página inicial (esboço do cliente, revisto a 14/10)
- **Primeiro passo:** duas zonas, cada uma um botão inteiro, só com uma palavra: **Espreitar** (em cima, branco) e **O teu trabalho** (em baixo, menta muito clara). O logo fica na fronteira e muda de cor ao atravessar a linha.
- **O primeiro clique escolhe** (telemóvel e computador): a zona clicada estende-se até ocupar a página (a linha desliza para o fundo ou para o topo) enquanto a outra se retrai; o logo sai (já está no cabeçalho) e só então aparece o conteúdo:
  - **Espreitar:** "Como é trabalhar lá dentro?", pesquisa a sério (Enter leva aos resultados) e "Ver todas as organizações" (`/explorar`).
  - **O teu trabalho:** "Conta como é. Sem dar a cara." e o campo "Onde trabalhas?" (Enter leva a `/avaliar?q=…`, com a pesquisa já feita) e "Escolher da lista" (`/avaliar`).
- **O que acontece ao clicar:** com rato, uma dica segue o cursor ("Espreitar organizações" / "Avaliar onde trabalho"); em ecrãs táteis o texto está fixo em cada zona ("Toca para…").
- **Voltar às duas zonas:** botão ✕, tecla Escape ou o "voltar" do browser. A zona aberta fica no endereço (`/?lado=espreitar`, `/?lado=avaliar`), por isso também se pode partilhar.
- **Atalhos:** com rato, o campo de pesquisa fica logo pronto a escrever (no telemóvel não abre o teclado sem a pessoa tocar); começar a escrever nas duas zonas abre a pesquisa com o que se escreveu.
- **Cores (14/10, "uma zona com cor"):** o verde-água a cheio com preto era pesado e o branco e menta ficou "sem força" (cliente). Espreitar fica branco; O teu trabalho em verde-água da marca com texto em tinta. As palavras grandes são Jost 400 (verde-água escuro em cima, tinta em baixo). As cores estão em variáveis no topo de `features/home/Home.module.css`.
- **Animação:** uma mancha de luz suave segue o cursor (verde-água em cima, roxa em baixo, a cor do respeito); os olhos do logo olham para a zona onde está o cursor; em telemóvel as manchas deslizam sozinhas. Quem prefere menos movimento vê a troca sem animação.
- **Medição:** `cta_click` com `cta=abrir_espreitar` / `abrir_avaliar` (o primeiro clique), `pesquisar`, `explorar` e `avaliar` (o segundo), sempre com `area=home`.
- **Cabeçalho:** Explorar, Ranking e Sobre (o Contacto está no rodapé). **Rodapé:** Facebook e Instagram ao centro, e por baixo as ligações secundárias e o idioma.
- **Para onde foi o resto:** o início anterior, com a lista "Para ti", passa para **Explorar** (`/explorar`), o primeiro separador da barra inferior.

## Fluxos

**Primeira visita (14/10):** Página inicial (Espreitar → "Ver todas as organizações", agora um botão com a largura do campo) → Explorar logo, com as **mais bem avaliadas** (sem "% para ti", porque ainda não há prioridades) e o convite "Ordenar pelo que importa para ti" → Preferências (3 prioridades) → A preparar → Explorar "Para ti". O questionário deixou de ser obrigatório antes de ver organizações.

**Cor no resto da app (14/10):** a mesma regra da página inicial — em cada ecrã uma zona em verde-água com texto em tinta (classes globais `.zone` e `.zone-band`): faixa do título em Ranking, Pesquisa, Guardadas, A tua conta, Sobre, Contacto, Como calculamos e Setores; a ação "Avaliar onde trabalho" e "A nota não está à venda" no Explorar; a porta "O teu trabalho" no Sobre; o cartão "Para os outros és anónimo/a" no perfil. Os botões principais passam a verde-água com texto em tinta. Listas e conteúdo ficam em branco; o fluxo de avaliar fica sem faixa (foco na tarefa). Contraste verificado com o axe em todos os ecrãs.

**Menu (14/10):** Explorar · Ranking · Sobre no cabeçalho (computador e página inicial no telemóvel), para o Explorar ficar a um clique de qualquer ecrã; o Contacto passou para o rodapé. No telemóvel, o Explorar mostra 3 organizações e "Ver mais organizações".

**Descobrir:** Explorar → Pesquisa / Ranking (Para mim · Nota geral, filtros) / Tipos e setores → Organização (Avaliações · Entrevistas · Salários) → Denunciar avaliação.

**Avaliar (2 passos, 3 toques até publicar além das notas; 14/10):** Escolher a organização (o local só se pergunta quando há mais do que um; ou adicionar nova) → Notas e comentário no mesmo ecrã (8 critérios 1–5, recomendas?; comentário opcional com tags e 600 caracteres, red flags, bloqueio de insultos e nomes) → Publicado (+ mensagem privada de apoio se houver red flag) → **Verificar depois, se quiser** (convite em "Publicado": email com código ou contrato/recibo; só se guarda o "sim", e as avaliações da pessoa nessa organização passam a verificadas). `/avaliar/texto` (ligações antigas) vai para as notas.

**Sair de avaliar e o "voltar" do browser (14/10):** o fluxo nunca fica no histórico depois de se sair. Qualquer saída — ✕/Cancelar, "Ver na página da organização", "Voltar ao início" — volta para onde se estava antes de avaliar (ex.: lista → organização), e o "voltar" seguinte leva ao ecrã anterior a esse, nunca a "Publicado" nem às notas. "Mudar" a organização recua até à escolha (não abre outra). Verificar a partir de "Publicado" ou do perfil: "Agora não" e "Confirmar" voltam ao ecrã de onde se veio. Se a sessão expirou ao publicar ("Entra para publicar"), há uma ligação "Entrar" e, depois de abrir o link do email, volta-se às notas com o rascunho.

![Avaliar: antes e agora](ecras/avaliar-antes-agora.png)

**Partilhar entrevista ou salário (14/10):** nos separadores Entrevistas e Salários da organização, o botão abre um só ecrã (`/partilhar/entrevista` ou `/partilhar/salario`). Entrevista: função, correu bem ou mal, passos (conversa, entrevista, prova prática, teste escrito, dia de experiência, dinâmica de grupo), oferta, resposta (só se não houve oferta), dificuldade 1–5 e comentário opcionais — 4 toques além da função. Salário: função, bruto mensal e se chega a horas. Sem nomes nem insultos. Uma função só mostra valores com 3 salários; os extremos são percentis, nunca o salário de alguém. Depois, "Ver na página da organização" volta ao separador (e o "voltar" seguinte não reabre o formulário).

**Institucional:** Sobre (missão e princípios) · Contacto (email, organizações, redes sociais e, à parte, ajuda urgente com ACT, CITE, APAV e 112).

**Conta:** Entrar (link mágico, sem palavra-passe) · Perfil (anonimato, mensagens, o que valorizo, as minhas avaliações) · Guardadas · Apoio.

**Organizações:** Para organizações (planos Grátis / Pro, "nunca vendemos posição") → Painel (responder publicamente, pulso da semana).

**Contas das organizações (14/10):** na página pública, "É a tua organização? Gerir esta página" (ou "Para organizações" → Painel). Sem sessão, o Painel pede para entrar; sem página, mostra o pedido: escolher a organização, nome e cargo, e provar com o email do domínio (código de 6 dígitos; não servem emails pessoais) ou com um documento com o NIF (lido e apagado). A moderação aprova ou recusa no separador "Páginas de organizações", com justificação que a pessoa vê no Painel. Aprovado: a página pública diz "Página gerida pela organização" e o Painel mostra dados reais — semana (novas, respondidas, variação da nota), posição na cidade, etiquetas do mês e avaliações por responder; as respostas aparecem por baixo da avaliação. Pro (ligado pela moderação enquanto o preço não está decidido): variação de cada critério face à semana passada e média do setor; nunca mexe no ranking. Quem gere várias páginas escolhe-a no topo.

## Capturas

| Ecrã | Mobile | Desktop |
|---|---|---|
| Preferências | ![](ecras/mobile-preferencias.png) | ![](ecras/desktop-preferencias.png) |
| A preparar | ![](ecras/mobile-a-preparar.png) | ![](ecras/desktop-a-preparar.png) |
| Página inicial | ![](ecras/mobile-inicio.png) | ![](ecras/desktop-inicio.png) |
| Página inicial (EN) | ![](ecras/mobile-inicio-en.png) | ![](ecras/desktop-inicio-en.png) |
| Explorar | ![](ecras/mobile-explorar.png) | ![](ecras/desktop-explorar.png) |
| Sobre | ![](ecras/mobile-sobre.png) | ![](ecras/desktop-sobre.png) |
| Contacto | ![](ecras/mobile-contacto.png) | ![](ecras/desktop-contacto.png) |
| Pesquisa | ![](ecras/mobile-pesquisa-q-porto.png) | ![](ecras/desktop-pesquisa-q-porto.png) |
| Ranking | ![](ecras/mobile-ranking.png) | ![](ecras/desktop-ranking.png) |
| Tipos e setores | ![](ecras/mobile-setores.png) | ![](ecras/desktop-setores.png) |
| Como calculamos | ![](ecras/mobile-metodologia.png) | ![](ecras/desktop-metodologia.png) |
| Organização | ![](ecras/mobile-org-padaria-ribeira.png) | ![](ecras/desktop-org-padaria-ribeira.png) |
| Organização (EN) | ![](ecras/mobile-org-padaria-ribeira-en.png) | ![](ecras/desktop-org-padaria-ribeira-en.png) |
| Entrevistas | ![](ecras/mobile-org-padaria-ribeira-entrevistas.png) | ![](ecras/desktop-org-padaria-ribeira-entrevistas.png) |
| Salários | ![](ecras/mobile-org-padaria-ribeira-salarios.png) | ![](ecras/desktop-org-padaria-ribeira-salarios.png) |
| Denunciar | ![](ecras/mobile-org-padaria-ribeira-denunciar-r1.png) | ![](ecras/desktop-org-padaria-ribeira-denunciar-r1.png) |
| Avaliar · escolher | ![](ecras/mobile-avaliar.png) | ![](ecras/desktop-avaliar.png) |
| Avaliar · notas | ![](ecras/mobile-avaliar-notas.png) | ![](ecras/desktop-avaliar-notas.png) |
| Publicado | ![](ecras/mobile-avaliar-feito.png) | ![](ecras/desktop-avaliar-feito.png) |
| Verificar (depois de publicar) | ![](ecras/mobile-avaliar-verificar.png) | ![](ecras/desktop-avaliar-verificar.png) |
| Apoio | ![](ecras/mobile-apoio.png) | ![](ecras/desktop-apoio.png) |
| Guardadas | ![](ecras/mobile-guardadas.png) | ![](ecras/desktop-guardadas.png) |
| Perfil | ![](ecras/mobile-perfil.png) | ![](ecras/desktop-perfil.png) |
| Entrar | ![](ecras/mobile-entrar.png) | ![](ecras/desktop-entrar.png) |
| Para organizações | ![](ecras/mobile-para-organizacoes.png) | ![](ecras/desktop-para-organizacoes.png) |
| Painel da organização | ![](ecras/mobile-painel.png) | ![](ecras/desktop-painel.png) |
| Página não encontrada | ![](ecras/mobile-pagina-nao-encontrada.png) | ![](ecras/desktop-pagina-nao-encontrada.png) |
