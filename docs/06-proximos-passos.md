# 06 · Próximos passos e questões em aberto

## Jurídico (antes de qualquer lançamento)
- [ ] Revisão RGPD: base legal, minimização (só o "sim" da verificação), exportar/apagar dados, política de privacidade.
- [ ] Política de moderação e de remoção (difamação, nomes de pessoas, DSA).
- [ ] Textos e contactos da mensagem de apoio (ACT, CITE, APAV, 112). **O telefone da ACT não foi verificado** — só aparece o site.
- [ ] Deixar claro que a PeekJob não é uma entidade de denúncia.

## Produto
- [ ] Validar os 8 critérios e os pesos 3/2/1 com utilizadores.
- [ ] Mínimo de avaliações para mostrar nota (3) e entrar no ranking (5).
- [ ] Preço do plano Pro ([PREÇO]) e o que inclui.
- [ ] Lançamento por cidade/setor para resolver o *cold start*.

## Técnico (do POC ao MVP)
- [ ] Backend (ex.: Next.js ou Spring Boot) + PostgreSQL; autenticação por link mágico.
- [ ] Verificação real (código por email; leitura do NIF com eliminação imediata do ficheiro).
- [ ] Moderação: API de moderação + LLM para casos duvidosos + fila humana.
- [ ] Mapa real (MapLibre/Leaflet + OpenStreetMap).
- [ ] SEO das páginas públicas (renderização no servidor) e PWA.
