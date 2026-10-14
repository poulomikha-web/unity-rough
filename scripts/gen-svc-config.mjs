// Writes public/svc-config.js from .env.local / the environment so the static
// agent console (public/agent/index.html) can reach the same Supabase project.
// The publishable key is client-side by design; the file is gitignored anyway.
import { readFileSync, writeFileSync } from 'node:fs';

const env = { ...process.env };
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {
  /* no .env.local — rely on the environment */
}

const cfg = {
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  turnUrls: (env.NEXT_PUBLIC_TURN_URLS || '').split(',').map((u) => u.trim()).filter(Boolean),
  turnUsername: env.NEXT_PUBLIC_TURN_USERNAME || '',
  turnCredential: env.NEXT_PUBLIC_TURN_CREDENTIAL || '',
};
writeFileSync('public/svc-config.js', `window.SVC_CONFIG = ${JSON.stringify(cfg)};\n`);
console.log(
  `svc-config.js written (supabase ${cfg.supabaseUrl ? 'configured' : 'NOT configured'}, turn ${cfg.turnUrls.length ? 'configured' : 'not configured'})`
);
