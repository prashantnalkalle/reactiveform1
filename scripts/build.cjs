const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
let apiUrl = '/api';
if (process.env.BACKEND_URL) {
  const backend = new URL(process.env.BACKEND_URL);
  if (backend.protocol !== 'https:' || backend.username || backend.password || backend.search || backend.hash || backend.pathname !== '/') {
    throw new Error('BACKEND_URL must be the HTTPS backend origin, e.g. https://your-service.onrender.com');
  }
  apiUrl = backend.origin + '/api';
} else if (process.env.VERCEL) {
  throw new Error('Set BACKEND_URL to your Render backend URL in Vercel before building.');
}
const build = spawnSync(process.execPath, [require.resolve('@angular/cli/bin/ng'), 'build'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'reactiveform1', 'assets', 'api-config.js'),
  'window.YPS_CONFIG = ' + JSON.stringify({ apiUrl }) + ';\n');
