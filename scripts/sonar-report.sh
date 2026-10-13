#!/usr/bin/env bash
# Resumo da análise: no sumário do run e como anotações (visíveis no topo do run e pela API).
set -uo pipefail
HOST=${SONAR_HOST_URL:-http://localhost:9000}
q() { curl -s -u "$SONAR_TOKEN:" "$HOST/api/$1"; }
M=$(q "measures/component?component=peekjob&metricKeys=coverage,bugs,vulnerabilities,code_smells,security_hotspots,duplicated_lines_density,ncloc,reliability_rating,security_rating,sqale_rating")
val() { echo "$M" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const m=JSON.parse(d).component.measures.find(x=>x.metric==='$1');console.log(m?m.value:'-')})"; }
GATE=$(q "qualitygates/project_status?projectKey=peekjob" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const s=JSON.parse(d).projectStatus;console.log(s.status+' '+s.conditions.filter(c=>c.status==='ERROR').map(c=>c.metricKey+'='+c.actualValue+' (limite '+c.errorThreshold+')').join(', '))})")
LINE="Quality Gate: $GATE · cobertura $(val coverage)% · bugs $(val bugs) · vulnerabilidades $(val vulnerabilities) · code smells $(val code_smells) · hotspots $(val security_hotspots) · duplicação $(val duplicated_lines_density)% · $(val ncloc) linhas"
echo "$LINE"
echo "::notice title=SonarQube::$LINE"
{ echo "### SonarQube"; echo; echo "$LINE"; echo; echo "| Tipo | Gravidade | Ficheiro | Linha | Regra | Mensagem |"; echo "|---|---|---|---|---|---|"; } >> "$GITHUB_STEP_SUMMARY"
# principais problemas (bugs, vulnerabilidades e code smells graves)
q "issues/search?componentKeys=peekjob&resolved=false&ps=100&s=SEVERITY&asc=false" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d); const rows=j.issues.map(i=>'| '+i.type+' | '+i.severity+' | '+i.component.replace('peekjob:','')+' | '+(i.line??'')+' | '+i.rule+' | '+i.message.replace(/\|/g,'/')+' |');
  console.log(rows.join('\n'));
  const byRule={}; j.issues.forEach(i=>{byRule[i.rule]=(byRule[i.rule]||0)+1});
  console.error('Total de problemas: '+j.total+' · por regra: '+Object.entries(byRule).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([r,n])=>r+'×'+n).join(', '));
})" >> "$GITHUB_STEP_SUMMARY" 2> issues.txt
cat issues.txt
echo "::notice title=SonarQube problemas::$(cat issues.txt)"
