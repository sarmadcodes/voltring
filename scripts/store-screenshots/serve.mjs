import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.env.WEB_DIR || 'dist-web';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.json': 'application/json', '.ico': 'image/x-icon' };

export function serve(port = 8097) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      let f = join(ROOT, p);
      if (!existsSync(f) || statSync(f).isDirectory()) {
        const html = join(ROOT, p.replace(/\/$/, '') + '.html');
        f = existsSync(html) ? html : join(ROOT, 'index.html');
      }
      res.writeHead(200, { 'Content-Type': TYPES[extname(f)] ?? 'application/octet-stream' });
      res.end(readFileSync(f));
    });
    server.listen(port, () => resolve(server));
  });
}
