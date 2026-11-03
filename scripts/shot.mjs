/**
 * Снимок экрана и консоль страницы через Chrome DevTools Protocol.
 * Нужен, чтобы видеть игру глазами, а не догадываться.
 *
 *   node scripts/shot.mjs --url http://127.0.0.1:4173/ --out .tmp/shot.png --wait 4000
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = { url: 'http://127.0.0.1:4173/', out: '.tmp/shot.png', wait: '4000', eval: '', port: '9333', w: '1280', h: '720' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  const key = argv[i]?.replace(/^--/, '');
  if (key) args[key] = argv[i + 1];
}

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(args.port);
const W = Number(args.w);
const H = Number(args.h);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  return res.json();
}

async function waitForBrowser(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      return await getJson('/json/version');
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Chrome не поднялся');
}

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--window-size=${W},${H}`,
    '--user-data-dir=' + resolve('.tmp/chrome-profile'),
    'about:blank',
  ],
  { stdio: 'ignore', detached: false },
);

const messages = [];
let ws;

try {
  await waitForBrowser();
  const targets = await getJson('/json/list');
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('Нет вкладки');

  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      messages.push(`[${msg.params.type}] ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      messages.push(`[exception] ${d.text} ${d.exception?.description ?? ''}`);
    }
    if (msg.method === 'Log.entryAdded') {
      messages.push(`[${msg.params.entry.level}] ${msg.params.entry.text}`);
    }
  };

  const send = (method, params = {}) =>
    new Promise((res) => {
      const mid = ++id;
      pending.set(mid, res);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: W,
    height: H,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send('Page.navigate', { url: args.url });
  await sleep(Number(args.wait));

  if (args.eval) {
    const r = await send('Runtime.evaluate', {
      expression: args.eval,
      returnByValue: true,
      awaitPromise: true,
    });
    console.log('EVAL:', JSON.stringify(r.result?.result?.value ?? r.result, null, 2));
    await sleep(600);
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = resolve(args.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(shot.result.data, 'base64'));
  console.log('OK:', outPath);
  if (messages.length) {
    console.log('--- console ---');
    for (const m of messages.slice(0, 60)) console.log(m);
  }
} finally {
  ws?.close();
  chrome.kill();
}
