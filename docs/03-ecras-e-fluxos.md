# 03 · Ecrãs e fluxos

O design completo está no **canvas** (privado): https://claude.ai/artifact/16d6Uxfp8PCM7PGgdYo6Zf — 21 ecrãs mobile e 21 desktop, ligados entre si, mais a ficha do logo animado e do ícone. As capturas abaixo são do POC (pasta [`ecras/`](ecras/)).

## Princípios
- **Uma pergunta por ecrã.** A resposta aparece no topo, grande (anel + "% para ti" + uma frase).
- **Revelação progressiva:** o secundário fica a um toque ("Ver os 8 critérios", "Ver todas", acordeões).
- **Listas magras:** anel, nome, um dado, % para ti.
- **Mobile first:** abaixo de 900 px, barra inferior com botão central "Avaliar"; a partir de 900 px, cabeçalho com navegação.
- **Dois idiomas:** português por omissão e inglês (UK), com o seletor PT · EN no cabeçalho, rodapé e Perfil. O conteúdo escrito pelas pessoas fica no idioma original.

## Página inicial (esboço do cliente)
- **Estrutura:** duas zonas de cor, cada uma é um botão inteiro.
  - **Em cima, "peek" (teal):** espreitar, ou seja, explorar e pesquisar organizações.
  - **Em baixo, "Job" (ink):** avaliar onde trabalho.
- **Logo:** fica na fronteira e muda de cor ao atravessar a linha, que se desenha da esquerda para a direita.
- **Animação:**
  - Uma mancha de luz segue o cursor: branca em cima; em baixo é roxa, a cor do respeito e dos direitos humanos.
  - Os olhos do logo olham para a zona escolhida.
  - Em telemóvel, as manchas deslizam sozinhas.
  - Quem prefere menos movimento vê tudo parado.
- **Cabeçalho:** Sobre, Ranking e Contacto. **Rodapé:** Facebook e Instagram ao centro, e por baixo as ligações secundárias e o idioma.
- **Para onde foi o resto:** o início anterior, com a lista "Para ti", passa para **Explorar** (`/explorar`), o primeiro separador da barra inferior.

## Fluxos

**Primeira visita:** Página inicial (explorar ou avaliar) → Preferências (3 prioridades) → A preparar (logo animado) → Explorar "Para ti".

**Descobrir:** Explorar → Pesquisa / Ranking (Para mim · Nota geral, filtros) / Tipos e setores → Organização (Avaliações · Entrevistas · Salários) → Denunciar avaliação.

**Avaliar (3 passos):** Escolher organização e local no mapa (ou adicionar nova) → Verificar (email com código ou contrato/recibo; só se guarda o "sim") → Notas (8 critérios 1–5, recomendas?) → Texto (tags + 600 caracteres, red flags, bloqueio de insultos e nomes) → Publicado (+ mensagem privada de apoio se houver red flag).

**Institucional:** Sobre (missão e princípios) · Contacto (email, organizações, redes sociais e, à parte, ajuda urgente com ACT, CITE, APAV e 112).

**Conta:** Entrar (link mágico, sem palavra-passe) · Perfil (anonimato, mensagens, o que valorizo, as minhas avaliações) · Guardadas · Apoio.

**Organizações:** Para organizações (planos Grátis / Pro, "nunca vendemos posição") → Painel (responder publicamente, pulso da semana).

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
| Avaliar · verificar | ![](ecras/mobile-avaliar-verificar.png) | ![](ecras/desktop-avaliar-verificar.png) |
| Avaliar · notas | ![](ecras/mobile-avaliar-notas.png) | ![](ecras/desktop-avaliar-notas.png) |
| Avaliar · texto | ![](ecras/mobile-avaliar-texto.png) | (no desktop está no ecrã das notas) |
| Publicado | ![](ecras/mobile-avaliar-feito.png) | ![](ecras/desktop-avaliar-feito.png) |
| Apoio | ![](ecras/mobile-apoio.png) | ![](ecras/desktop-apoio.png) |
| Guardadas | ![](ecras/mobile-guardadas.png) | ![](ecras/desktop-guardadas.png) |
| Perfil | ![](ecras/mobile-perfil.png) | ![](ecras/desktop-perfil.png) |
| Entrar | ![](ecras/mobile-entrar.png) | ![](ecras/desktop-entrar.png) |
| Para organizações | ![](ecras/mobile-para-organizacoes.png) | ![](ecras/desktop-para-organizacoes.png) |
| Painel da organização | ![](ecras/mobile-painel.png) | ![](ecras/desktop-painel.png) |
| Página não encontrada | ![](ecras/mobile-pagina-nao-encontrada.png) | ![](ecras/desktop-pagina-nao-encontrada.png) |
