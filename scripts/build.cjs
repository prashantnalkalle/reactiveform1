const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const backendUrl = process.env.BACKEND_URL || 'https://yps-backend.vercel.app';
const backend = new URL(backendUrl);
if (backend.protocol !== 'https:' || backend.username || backend.password || backend.search || backend.hash || backend.pathname !== '/') {
  throw new Error('BACKEND_URL must be the HTTPS backend origin, e.g. https://yps-backend.vercel.app');
}
const apiUrl = backend.origin + '/api';
const build = spawnSync(process.execPath, [require.resolve('@angular/cli/bin/ng'), 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'reactiveform1', 'assets', 'api-config.js'),
  'window.YPS_CONFIG = ' + JSON.stringify({ apiUrl }) + ';\n');
