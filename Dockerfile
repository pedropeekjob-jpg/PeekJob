# PeekJob: API (NestJS) + web (React) numa só imagem. A API serve a web na mesma origem.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
# O Render passa o commit como build arg: identifica a versão nas estatísticas (antes/depois de cada mudança)
ARG RENDER_GIT_COMMIT=dev
RUN npm run build -w @peekjob/shared \
 && npm run build -w @peekjob/api \
 && VITE_API_URL=/ VITE_ROUTER=browser VITE_APP_VERSION=$RENDER_GIT_COMMIT npm run build -w @peekjob/web

FROM node:22-slim
ENV NODE_ENV=production WEB_DIST=/app/web PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/migrations apps/api/migrations
COPY apps/api/seed apps/api/seed
COPY --from=build /app/apps/web/dist web
USER node
WORKDIR /app/apps/api
EXPOSE 3000
# Aplica as migrações em cada arranque (idempotente); SEED_DEMO=true carrega as organizações de demonstração.
CMD ["sh", "-c", "node dist/db/migrate-cli.js && if [ \"$SEED_DEMO\" = \"true\" ]; then node dist/db/seed-cli.js; fi && exec node dist/main.js"]
