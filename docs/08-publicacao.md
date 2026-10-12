# 08 · Publicar (API + web)

Em produção a API serve também a web, no mesmo endereço. Assim o cookie de sessão é do próprio site e o login funciona em todos os browsers, incluindo o Safari no iPhone, que bloqueia cookies entre domínios diferentes.

A demo no GitHub Pages continua em **modo demonstração** (dados de exemplo no browser).

## Serviços (todos com plano gratuito, na UE)

| Peça | Serviço sugerido | Notas do plano gratuito |
|---|---|---|
| Base de dados | **Neon** (PostgreSQL gerido), região Frankfurt | 0,5 GB; suporta `pg_trgm` e `unaccent` |
| Emails | **Resend** | 3000 emails/mês. Sem domínio verificado só envia para o email da própria conta |
| API + web | **Render** (Docker), região Frankfurt | Adormece após 15 min sem uso; o primeiro pedido demora ~1 min |

Para o cliente testar à vontade convém um domínio (ex.: `peekjob.pt`): serve para os emails (Resend) e para o endereço do site (Render). O plano pago mais baixo do Render evita o adormecimento.

## Passo a passo

1. **Neon:** criar o projeto (região *AWS Europe Central 1 – Frankfurt*) e copiar a *connection string* (termina em `?sslmode=require`).
2. **Resend:** criar uma chave de API (*API Keys → Create*). Para enviar a qualquer pessoa, adicionar e verificar o domínio (*Domains*, registos DNS). Para um primeiro teste, usar `MAIL_FROM="PeekJob <onboarding@resend.dev>"`; nesse caso os emails só chegam ao email da conta Resend.
3. **Render:** *New → Blueprint*, escolher o repositório `pedropeekjob-jpg/PeekJob`. O `render.yaml` cria o serviço `peekjob` e pede:
   - `DATABASE_URL`: a connection string do Neon;
   - `RESEND_API_KEY`: a chave do Resend;
   - `MAIL_FROM`: por exemplo `PeekJob <ola@peekjob.pt>`.

   O `PRIVACY_SECRET` é gerado pelo Render. **Nunca o mudar depois do lançamento**: os pseudónimos das pessoas dependem dele.
4. No primeiro arranque a imagem aplica as migrações e carrega as 10 organizações de demonstração (`SEED_DEMO=true`). Para o lançamento real: mudar `SEED_DEMO` para `false` e carregar o seed curado.
5. Abrir o endereço `https://peekjob.onrender.com` (ou o domínio próprio). Os links dos emails usam esse endereço automaticamente. Com domínio próprio, definir `WEB_ORIGIN=https://peekjob.pt`.

Cada push para `main` publica uma nova versão (o CI corre os testes e constrói a imagem).

## Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | PostgreSQL |
| `PRIVACY_SECRET` | sim | Pseudónimos e hashes dos emails (HMAC) |
| `RESEND_API_KEY`, `MAIL_FROM` | sim em produção | Envio dos links e dos códigos. Sem elas a API recusa arrancar em produção |
| `WEB_ORIGIN` | não | Endereço público (por omissão o do Render) |
| `WEB_DIST` | já na imagem | Pasta da build da web servida pela API |
| `SEED_DEMO` | não | `true` carrega as organizações de demonstração |
| `GA_MEASUREMENT_ID` | não | Google Analytics 4 (`G-…`), ver [09 · Medição](09-medicao.md) |
| `GSC_VERIFICATION` | não | Código da etiqueta HTML do Search Console |
| `COOKIE_SAMESITE` | não | Só se a web ficar noutro domínio (`none`); não é o caso desta configuração |

## Verificado antes de publicar

Com a mesma estrutura da imagem, numa base de dados vazia: migrações e seed, web servida pela API, email do link mágico no formato do Resend (para um servidor falso), cookie `Secure` + `httpOnly`, login e publicação de uma avaliação no browser em mobile.
