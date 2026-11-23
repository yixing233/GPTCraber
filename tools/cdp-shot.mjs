/**
 * 用无头 Chrome 打开一个本地页面、可选执行一段脚本、等待后截图。
 * 只用于本地开发自检，不参与发布。
 *
 * 用法：
 *   node tools/cdp-shot.mjs <url> <输出png> [--eval "js"] [--wait 3000] [--size 1440x900]
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { createServer } from 'node:net';

const args = process.argv.slice(2);
const url = args[0];
const out = args[1];
const getFlag = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const evalJs = getFlag('eval', '');
const waitMs = Number(getFlag('wait', '3000'));
const keepOpen = args.includes('--keep-open');
const [w, h] = getFlag('size', '1440x900').split('x').map(Number);

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'craber-cdp-'));
const reservation = createServer();
await new Promise((done, reject) => {
  reservation.once('error', reject);
  reservation.listen(0, '127.0.0.1', done);
});
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${w},${h}`, '--force-device-scale-factor=1',
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return await r.json();
    } catch (e) { /* 还没起来 */ }
    await sleep(100);
  }
  throw new Error('Chrome DevTools 未就绪');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

function openWs(urlStr) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(urlStr);
    ws.addEventListener('open', () => resolve(ws), { once: true });
    ws.addEventListener('error', (e) => reject(new Error('WS 连接失败')), { once: true });
  });
}

(async () => {
  try {
    await waitForDevtools();
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('没有可用页面目标');
    const cdp = new Cdp(await openWs(page.webSocketDebuggerUrl));
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: 1, mobile: false
    });
    await cdp.send('Page.navigate', { url });
    await sleep(waitMs);
    if (evalJs) {
      const r = await cdp.send('Runtime.evaluate', {
        expression: evalJs, awaitPromise: true, returnByValue: true
      });
      if (r && r.exceptionDetails) {
        console.error('EVAL 异常:', r.exceptionDetails.text);
      } else if (r && r.result && r.result.value !== undefined) {
        console.log('EVAL:', JSON.stringify(r.result.value));
      }
      await sleep(500);
    }
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('已保存', out);
    if (keepOpen) console.log('浏览器调试地址', 'http://127.0.0.1:' + port);
    else chrome.kill();
  } catch (e) {
    console.error('失败:', e && e.message);
    chrome.kill();
    process.exitCode = 1;
  } finally {
    if (!keepOpen) setTimeout(() => {
      const target = resolve(profile);
      const withinTemp = relative(resolve(tmpdir()), target);
      if (withinTemp && !withinTemp.startsWith('..') && !isAbsolute(withinTemp)
        && withinTemp.startsWith('craber-cdp-')) {
        try { rmSync(target, { recursive: true, force: true }); } catch (e) {}
      }
    }, 500);
  }
})();
