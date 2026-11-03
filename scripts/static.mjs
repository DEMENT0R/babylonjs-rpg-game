/**
 * Мини-сервер для проверки сборки так, как её увидит GitHub Pages:
 * диста в подкаталоге. Без зависимостей.
 *
 *   node scripts/static.mjs .tmp/pages 4180
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 4180);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join(root, normalize(url));
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch {
    res.writeHead(404).end('не найдено');
    return;
  }
  try {
    statSync(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end('не найдено');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`статика ${root} на http://127.0.0.1:${port}/`);
});
