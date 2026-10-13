#!/usr/bin/env bash
# Antes de enviar: corre localmente o mesmo que o CI — testes com cobertura (shared, web, API), testes no browser com
# cobertura, análise do SonarQube e o Quality Gate "PeekJob". Termina com erro se o Quality Gate falhar.
#
#   npm run sonar:local                  tudo (≈ 6–8 min; precisa de Docker)
#   SONAR_SKIP_E2E=1 npm run sonar:local sem os testes no browser (mais rápido; a cobertura da web fica mais baixa)
#
# O SonarQube e o PostgreSQL correm em contentores temporários, apagados no fim. Resultado em http://localhost:9000
# enquanto corre; no fim fica o resumo no terminal.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo "Precisa de Docker."; exit 1; }

SQ=peekjob-sonar-local
PG=peekjob-sonar-pg
PG_PORT=${SONAR_PG_PORT:-55432}
remove_containers() { docker rm -f "$SQ" "$PG" >/dev/null 2>&1 || true; }
remove_containers # de uma corrida anterior interrompida
ENV_FILE=$(mktemp)
trap 'remove_containers; rm -f "$ENV_FILE"' EXIT

echo "▶ A arrancar o SonarQube e o PostgreSQL (contentores temporários)…"
docker run -d --name "$SQ" -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true -p 9000:9000 sonarqube:community >/dev/null
docker run -d --name "$PG" -e POSTGRES_PASSWORD=postgres -p "$PG_PORT:5432" postgres:16 >/dev/null
until docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
export TEST_DATABASE_URL="postgres://postgres:postgres@localhost:$PG_PORT/peekjob_test"
export E2E_DATABASE_URL="postgres://postgres:postgres@localhost:$PG_PORT/peekjob_e2e"

echo "▶ Testes com cobertura…"
rm -rf coverage apps/web/coverage apps/api/coverage packages/shared/coverage
npm run test:coverage -w @peekjob/shared
npm run build -w @peekjob/shared
npm run test:coverage -w @peekjob/web
npm run test:coverage -w @peekjob/api

if [ -z "${SONAR_SKIP_E2E:-}" ]; then
  echo "▶ Testes no browser com cobertura…"
  npm run build:e2e:coverage
  npm run e2e:coverage
else
  echo "▶ Testes no browser saltados (SONAR_SKIP_E2E): a cobertura vai ficar abaixo da do CI."
fi
node scripts/coverage-paths.mjs

echo "▶ Análise…"
SONAR_ENV_FILE="$ENV_FILE" bash scripts/sonar-setup.sh
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
# host.docker.internal funciona no Docker Desktop (macOS/Windows) e, com host-gateway, no Linux
docker run --rm --add-host=host.docker.internal:host-gateway \
  -e SONAR_HOST_URL=http://host.docker.internal:9000 -e SONAR_TOKEN="$SONAR_TOKEN" \
  -v "$PWD:/usr/src" sonarsource/sonar-scanner-cli -Dsonar.working.directory=/tmp/scannerwork >/dev/null
# (pasta de trabalho dentro do contentor: o utilizador do scanner pode não poder escrever na pasta do projeto)

echo "▶ Resultado"
bash scripts/sonar-report.sh | grep -E "^Quality Gate|^Total de problemas|title=Mais linhas" | sed 's/^::notice title=\([^:]*\)::/\1: /'
STATUS=$(curl -s -u "$SONAR_READ_TOKEN:" "http://localhost:9000/api/qualitygates/project_status?projectKey=peekjob" | sed -n 's/.*"projectStatus":{"status":"\([A-Z]*\)".*/\1/p')
if [ "$STATUS" != "OK" ]; then
  echo "✗ Quality Gate: $STATUS — não enviar ainda."
  exit 1
fi
echo "✓ Quality Gate OK — pode ser enviado."
