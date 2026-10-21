# 04 · Marca

Ficheiros na pasta [`marca/`](marca/).

## Logótipo
- `peekjob-logo.svg` (fundos claros) e `peekjob-logo-fundo-escuro.svg`.

## Cores
| Nome | Hex | Uso |
|---|---|---|
| Ink | `#010B13` | Texto, botões secundários, fundo do ícone |
| Teal | `#00A9AF` | Marca, anéis |
| Teal texto / ação | `#00747A` | Ligações, todos os botões de ação (texto branco por cima, 5,6:1) e a zona "Avalia" da página inicial (desde 21/10) |
| Roxo | `#652D90` | **Respeito e inclusão** e mensagens de apoio |
| Cinza | `#A7A9AC` / `#6D6E71` | Secundário / texto discreto |
| Fundo | `#F6F7F7` | Fundo das páginas |
| Subida / descida | `#1565C0` / `#B4540A` | Tendências: azul e laranja, que se distinguem com daltonismo (até 21/10 a subida era verde) |

O hover dos botões é o mesmo halo do campo de pesquisa ativo (`--active-ring`).

## Tom de voz
Pedido de 21/10: informal e próximo, para criar confiança.
- Tratar por **tu**, frases curtas e na segunda pessoa ("Procura onde trabalhas", "Fica entre nós").
- Dizer o que acontece a seguir e tranquilizar ("Se não sabes, deixa em branco, não faz mal").
- Nos temas graves (assédio, salários em atraso) o tom continua próximo, mas sem graças.
- Páginas para organizações (planos, painel) mantêm um tom cordial mas profissional.
- **Aviso de responsabilidade**: a PeekJob não trata irregularidades; perante uma possível ilegalidade só mostra quem pode ajudar. Aparece no rodapé, na zona "Avalia", no início e no fim da avaliação e no apoio (`RESPONSIBILITY` em `data/content.ts`).

## Tipografia
- **Letra do sistema** (títulos e números; SF Pro no iPhone e no Mac, Geist nos outros, a negrito e apertada, estilo iOS — desde 15/10, antes Jost) · **Geist** (texto) · **Geist Mono** (valores pequenos). Geist e Geist Mono são gratuitas (licença OFL) e servidas pelo próprio site, a partir dos pacotes `@fontsource` (não do Google Fonts, para não enviar o IP de quem visita); a SF Pro vem com o sistema e não se descarrega.

## Leitura de dados
- **Anel** à volta da nota (0–5). **5 bolinhas** por critério (meia bolinha para valores intermédios). Respeito sempre a roxo.

## Logo animado
`peekjob-logo-animado.svg` e `peekjob-logo-animado-escuro.svg` — SVG + CSS, ~5 KB, ciclo de 8 s:
1. Os dois **e** mantêm a forma; na parte fechada nasce uma pupila que pestaneja e olha de um lado para o outro.
2. As pernas do **k** passam a estrada de fundo e abre-se um trilho em dois caminhos, como num mapa.
3. O **b** vira **lupa** e explora o caminho de cima (fica cinzento).
4. Desce e segue o caminho teal até um pino que pulsa: o melhor trabalho.
5. Tudo regressa ao logo.

Onde usar: arranque/depois das preferências, pesquisa a carregar, publicar avaliação, página não encontrada. Mínimo 160 px de largura; com "reduzir movimento" mostra o logo parado; não usar no cabeçalho.

## Ícone da app e favicon
Os dois **e** com pupila teal, brancos sobre ink. Ficheiros em `marca/icones/` (iOS 1024, Android 192/512 e maskable, apple-touch-icon 180, favicon SVG/ICO/PNG, web manifest) e instruções em `marca/icones/LEIA-ME.txt`.
