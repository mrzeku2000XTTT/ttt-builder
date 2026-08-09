import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Sandbox } from 'npm:e2b@2.36.1';
import { secrets } from 'base44:runtime';

const APP_DIR = '/home/user/app';

const VITE_WRAPPER = `import { defineConfig, mergeConfig } from 'vite';
export default defineConfig(async (env) => {
  let user = {};
  for (const p of ['./vite.config.js', './vite.config.mjs', './vite.config.ts']) {
    try { const m = await import(p); user = m.default ?? {}; break; } catch (e) { /* next */ }
  }
  if (typeof user === 'function') user = await user(env);
  return mergeConfig(user, {
    server: { host: '0.0.0.0', port: 3000, strictPort: true, allowedHosts: true, hmr: { clientPort: 443 } },
  });
});
`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const apiKey = secrets.get('E2B_API_KEY');
    if (!apiKey) return Response.json({ error: 'E2B_API_KEY is not set' }, { status: 500 });

    const action = body.action || 'run';

    if (action === 'keepalive') {
      if (!body.sandboxId) return Response.json({ error: 'sandboxId required' }, { status: 400 });
      const sbx = await Sandbox.connect(body.sandboxId, { apiKey });
      await sbx.setTimeout(15 * 60 * 1000);
      return Response.json({ alive: true });
    }

    if (action === 'kill') {
      if (!body.sandboxId) return Response.json({ error: 'sandboxId required' }, { status: 400 });
      await Sandbox.kill(body.sandboxId, { apiKey });
      return Response.json({ killed: true });
    }

    const files = Array.isArray(body.files) ? body.files : [];
    if (!files.length) return Response.json({ error: 'No files provided' }, { status: 400 });

    const logs = [];
    const sandbox = await Sandbox.create({ apiKey, timeoutMs: 15 * 60 * 1000 });
    logs.push(`sandbox ${sandbox.sandboxId} started`);

    await sandbox.files.write(
      files.map((f) => ({ path: `${APP_DIR}/${String(f.path).replace(/^\/+/, '')}`, data: f.content ?? '' }))
    );
    logs.push(`wrote ${files.length} file(s) to ${APP_DIR}`);

    const pkgFile = files.find((f) => String(f.path).replace(/^\/+/, '') === 'package.json');
    const hasPython = files.some((f) => String(f.path).endsWith('.py'));

    let port = Number(body.port) || 0;
    let startCmd = body.startCmd || '';

    if (pkgFile) {
      const install = await sandbox.commands.run('npm install --no-audit --no-fund', {
        cwd: APP_DIR,
        timeoutMs: 5 * 60 * 1000,
      });
      logs.push(`$ npm install → exit ${install.exitCode}`);
      if (install.stderr) logs.push(install.stderr.slice(-2000));
      if (install.exitCode !== 0) {
        return Response.json({ sandboxId: sandbox.sandboxId, url: null, logs, error: 'npm install failed' });
      }

      let pkg = {};
      try { pkg = JSON.parse(pkgFile.content || '{}'); } catch { /* ignore */ }
      const scripts = pkg.scripts || {};
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      if (deps.vite) {
        const build = await sandbox.commands.run('npx vite build', { cwd: APP_DIR, timeoutMs: 90 * 1000 });
        logs.push(`$ npx vite build → exit ${build.exitCode}`);
        if (build.stdout) logs.push(build.stdout.slice(-3000));
        if (build.stderr) logs.push(build.stderr.slice(-3000));
        if (build.exitCode && build.exitCode !== 0) {
          return Response.json({ sandboxId: sandbox.sandboxId, url: null, logs, error: 'Vite build failed — the generated project has a compile error. Open the logs and tap "Fix build error" to auto-repair.' });
        }
      }

      if (!startCmd) {
        if (deps.vite) {
          await sandbox.files.write([{ path: `${APP_DIR}/vite.e2b.config.mjs`, data: VITE_WRAPPER }]);
          startCmd = 'npx vite --config vite.e2b.config.mjs';
          logs.push('injected vite.e2b.config.mjs (allowedHosts)');
        } else if (scripts.dev) startCmd = 'npm run dev';
        else if (scripts.start) startCmd = 'npm start';
        else startCmd = 'node index.js';
      }
      port = port || 3000;
    } else if (hasPython) {
      const main = files.find((f) => /(^|\/)(main|app|server)\.py$/.test(String(f.path))) || files.find((f) => String(f.path).endsWith('.py'));
      startCmd = startCmd || `python3 ${String(main.path).replace(/^\/+/, '')}`;
      port = port || 8000;
    } else {
      startCmd = startCmd || 'python3 -m http.server 3000 --bind 0.0.0.0';
      port = port || 3000;
    }

    await sandbox.commands.run(startCmd, { cwd: APP_DIR, background: true, timeoutMs: 15 * 60 * 1000 });
    logs.push(`$ ${startCmd} (background, port ${port})`);

    const url = typeof sandbox.getUrl === 'function'
      ? await sandbox.getUrl(port)
      : `https://${sandbox.sandboxId}-${port}.e2b.dev`;

    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const probe = await fetch(url, { redirect: 'follow' });
        if (probe.status < 500) { ready = true; break; }
      } catch { /* not up yet */ }
    }
    logs.push(ready ? `live at ${url}` : `server did not respond yet at ${url}`);

    return Response.json({ sandboxId: sandbox.sandboxId, url, port, startCmd, ready, logs });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
