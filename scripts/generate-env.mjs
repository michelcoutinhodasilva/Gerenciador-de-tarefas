// Gera src/environments/environment.ts a partir do .env (fonte única das chaves).
// Roda sozinho antes de start, build, watch e test (veja package.json).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const ENV_FILE = '.env';
const OUTPUT = 'src/environments/environment.ts';
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];

if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `Faltam variáveis: ${missing.join(', ')}. Crie o .env na raiz do projeto com essas variáveis.`,
  );
  process.exit(1);
}

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(
  OUTPUT,
  `// Gerado por scripts/generate-env.mjs a partir do .env. Não edite nem faça commit.
export const environment = {
  supabaseUrl: ${JSON.stringify(process.env.SUPABASE_URL)},
  supabasePublishableKey: ${JSON.stringify(process.env.SUPABASE_PUBLISHABLE_KEY)},
};
`,
);
console.log(`${OUTPUT} gerado a partir do ${ENV_FILE}.`);
