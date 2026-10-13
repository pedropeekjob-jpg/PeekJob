#!/usr/bin/env bash
# Prepara um SonarQube efémero (serviço do CI): palavra-passe, token de análise e o Quality Gate "PeekJob".
# Escreve SONAR_TOKEN e SONAR_READ_TOKEN em $GITHUB_ENV (no CI) ou no ficheiro indicado em SONAR_ENV_FILE (localmente).
set -euo pipefail
# SONAR_ENV_FILE primeiro: o sonar:local também pode correr dentro do GitHub Actions (onde GITHUB_ENV existe)
ENV_FILE=${SONAR_ENV_FILE:-${GITHUB_ENV:?Indica SONAR_ENV_FILE ou GITHUB_ENV}}
HOST=${SONAR_HOST_URL:-http://localhost:9000}
PASS=${SONAR_ADMIN_PASSWORD:-PeekJob-ci-$(date +%s)-Aa1!}

echo "À espera do SonarQube…"
for i in $(seq 1 90); do
  [ "$(curl -s "$HOST/api/system/status" | sed -n 's/.*"status":"\([A-Z]*\)".*/\1/p')" = "UP" ] && break
  sleep 5
done
curl -sf -u admin:admin -X POST "$HOST/api/users/change_password" -d login=admin -d previousPassword=admin --data-urlencode "password=$PASS"
api() { curl -sf -u "admin:$PASS" -X POST "$HOST/api/$1" "${@:2}"; }

TOKEN=$(api user_tokens/generate -d name=ci -d type=GLOBAL_ANALYSIS_TOKEN | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "::add-mask::$TOKEN"
echo "SONAR_TOKEN=$TOKEN" >> "$ENV_FILE"
# token de leitura para o resumo (o de análise não pode ler medidas por ficheiro); o servidor é efémero
READ=$(api user_tokens/generate -d name=ci-read -d type=USER_TOKEN | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "::add-mask::$READ"
echo "SONAR_READ_TOKEN=$READ" >> "$ENV_FILE"

# Quality Gate (sobre todo o código, porque o servidor é novo em cada análise):
#  cobertura ≥ 80%, fiabilidade A (sem bugs), segurança A (sem vulnerabilidades), manutenção A, duplicação ≤ 3%
api qualitygates/create -d name=PeekJob >/dev/null
cond() { api qualitygates/create_condition -d gateName=PeekJob -d "metric=$1" -d "op=$2" -d "error=$3" >/dev/null; }
cond coverage LT 80
cond reliability_rating GT 1
cond security_rating GT 1
cond sqale_rating GT 1
cond duplicated_lines_density GT 3
api qualitygates/set_as_default -d name=PeekJob >/dev/null
echo "Quality Gate PeekJob criado."
