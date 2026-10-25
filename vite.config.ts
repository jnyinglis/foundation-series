import { defineConfig, type Plugin } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Dev only: POST /__capture?name=<file> with a PNG body saves public/comic/panels/<file>.png. */
function capturePlugin(): Plugin {
  return {
    name: 'comic-capture',
    configureServer(server) {
      server.middlewares.use('/__capture', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const url = new URL(req.url ?? '', 'http://x');
        const name = (url.searchParams.get('name') ?? 'panel').replace(/[^a-z0-9_-]/gi, '');
        const dir = join(process.cwd(), 'public', 'comic', 'panels');
        mkdirSync(dir, { recursive: true });
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => { const buf = Buffer.concat(chunks); writeFileSync(join(dir, `${name}.png`), buf); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ name, bytes: buf.length })); });
      });
    },
  };
}

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  plugins: [capturePlugin()],
});
