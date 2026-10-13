#!/usr/bin/env bash
# Prepara um SonarQube efémero (serviço do CI): palavra-passe, token de análise e o Quality Gate "PeekJob".
# Escreve SONAR_TOKEN em $GITHUB_ENV.
set -euo pipefail
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
echo "SONAR_TOKEN=$TOKEN" >> "$GITHUB_ENV"

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
