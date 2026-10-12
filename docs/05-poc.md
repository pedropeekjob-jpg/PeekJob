# 05 · POC (protótipo funcional)

- **Experimentar:** https://pedropeekjob-jpg.github.io/PeekJob/ (público; abrir no telemóvel para ver a versão mobile, no computador para a desktop).
- **Código:** raiz deste repositório — ver o [README](../README.md) para correr localmente, estrutura e como ligar a um backend.

## O que dá para fazer
- Escolher prioridades e ver tudo reordenado com a "% para ti".
- Pesquisar, filtrar o ranking, ver a página de uma organização (avaliações, entrevistas, salários, mapa).
- Avaliar em 3 passos com verificação simulada; o texto de exemplo dispara a red flag e, ao publicar, chega a **mensagem privada de apoio**.
- Escrever um nome ou insulto (ex.: "o Ricardo é incompetente") bloqueia a publicação e propõe uma versão sem nome.
- Guardar organizações, denunciar avaliações, responder como organização no Painel.
- Perfil → **Repor dados de demonstração** volta ao início.

## Arquitetura
React 18 + TypeScript + Vite, sem backend: dados de exemplo em `src/data`, estado no `localStorage` (`src/lib/store.tsx`), camada `src/api` pronta a trocar por pedidos HTTP. HashRouter para funcionar em qualquer alojamento estático.

## Limitações conhecidas
- Dados fictícios (12 organizações; a Padaria Ribeira é a mais completa).
- Moderação por regras locais — em produção, modelo no servidor + revisão humana.
- Verificação, email e mapa simulados.
