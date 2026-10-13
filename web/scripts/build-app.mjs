/*
 * Builds the React app (../frontend: log in, register, dashboards, admin) and copies it to public/app,
 * where Next.js serves it for the addresses listed in next.config.mjs.
 */
import { execSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.join(here, '..', '..', 'frontend');
const target = path.join(here, '..', 'public', 'app');

execSync('yarn build', {
  cwd: frontend,
  stdio: 'inherit',
  env: {
    ...process.env,
    PUBLIC_URL: '/app', // the app's files are served from /app/...
    REACT_APP_BACKEND_URL: '', // same domain: /api goes through Next.js to the backend
    GENERATE_SOURCEMAP: 'false',
    CI: 'false',
  },
});
rmSync(target, { recursive: true, force: true });
cpSync(path.join(frontend, 'build'), target, { recursive: true });
console.log(`React app copied to ${target}`);
