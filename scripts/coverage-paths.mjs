// Junta os relatórios de cobertura (lcov) com caminhos a partir da raiz do repositório, para o SonarQube.
// Cada pacote escreve "SF:src/…"; aqui passa a "SF:apps/web/src/…", etc. Saída: coverage/*.lcov
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const reports = [
  ['apps/web/coverage/unit/lcov.info', 'apps/web', 'web-unit'],
  ['apps/web/coverage/e2e/lcov.info', 'apps/web', 'web-e2e'],
  ['apps/api/coverage/lcov.info', 'apps/api', 'api'],
  ['packages/shared/coverage/lcov.info', 'packages/shared', 'shared'],
];
mkdirSync('coverage', { recursive: true });
for (const [file, base, name] of reports) {
  if (!existsSync(file)) {
    console.warn(`(sem ${file})`);
    continue;
  }
  const out = readFileSync(file, 'utf8').replace(/^SF:(?!\/)(.*)$/gm, `SF:${base}/$1`).replace(new RegExp(`^SF:${process.cwd()}/`, 'gm'), 'SF:');
  writeFileSync(`coverage/${name}.lcov`, out);
  console.log(`coverage/${name}.lcov ← ${file}`);
}
