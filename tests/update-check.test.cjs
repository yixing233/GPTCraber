'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'chatgpt-md-exporter.user.js'), 'utf8');
const start = source.indexOf('  /* ---------- 检查更新 ---------- */');
const end = source.indexOf('  function craberUpdateControl()', start);
assert.ok(start >= 0 && end > start);

function fixture(request, version = '0.19.0', options = {}) {
  let now = options.now || 1800000000000;
  const store = options.store || new Map();
  const events = {}, timers = [];
  const attrs = new Map();
  const context = vm.createContext({
    CRABER_VERSION: version, GM_xmlhttpRequest: request,
    Date: { now: () => now },
    navigator: { onLine: true },
    localStorage: {
      getItem: key => store.get(key) || null,
      setItem: (key, value) => store.set(key, value)
    },
    document: { visibilityState: 'visible', querySelectorAll: () => [],
      addEventListener: (event, fn) => { events[event] = fn; } },
    window: { addEventListener: (event, fn) => { events[event] = fn; } },
    fabEl: { getAttribute: key => attrs.get(key) || null,
      setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key) },
    setTimeout: (fn, ms) => { timers.push({ fn, ms, repeat: false }); },
    setInterval: (fn, ms) => { timers.push({ fn, ms, repeat: true }); },
    advance: ms => { now += ms; }, store, events, timers
  });
  vm.runInContext(source.slice(start, end), context);
  return context;
}

function script(version, newline = '\n') {
  return ['// ==UserScript==', '// @namespace gpt-craber', '// @version ' + version,
    '// ==/UserScript==', 'throw new Error("Remote code must never execute");'].join(newline);
}

test('更新检查按数字分段比较版本，兼容前缀和尾部零', () => {
  const { craberCompareVersions: compare } = fixture();
  assert.equal(compare('0.19.10', '0.19.9'), 1);
  assert.equal(compare('0.20.0', '0.19.99'), 1);
  assert.equal(compare('1.0', '0.99.99'), 1);
  assert.equal(compare('0.19.0', '0.23.23'), -1);
  assert.equal(compare('v0.19.0', '0.19'), 0);
  assert.equal(compare('0.19.0.0', '0.19.0'), 0);
  for (const value of ['', 'latest', '0.19.x', '0.19.0-beta', '999999999999999999999']) {
    assert.throws(() => compare(value, '0.19.0'), /版本号格式/);
  }
});

test('更新检查只读取 userscript 元数据，支持 CRLF 与 BOM', () => {
  const { craberReadUpdateVersion: read } = fixture();
  assert.equal(read(script('0.19.1')), '0.19.1');
  assert.equal(read('\uFEFF' + script('0.20.0', '\r\n')), '0.20.0');
  assert.equal(read(source), source.match(/const CRABER_VERSION = '([^']+)'/)[1]);
});

test('拒绝错误网页、其它脚本与正文中的伪造版本号', () => {
  const { craberReadUpdateVersion: read } = fixture();
  for (const body of ['<html>error</html>', '// @version 9.0.0',
    script('0.19.1').replace('gpt-craber', 'another-script'), script('bad'),
    script('0.19.1').replace('// @version 0.19.1\n', '') + '\n// @version 9.0.0']) {
    assert.throws(() => read(body), /更新源内容异常/);
  }
});

test('检查官方安装源时不携带会话或接口凭据，并绕过缓存', async () => {
  let options;
  const api = fixture(opts => {
    options = opts;
    opts.onload({ status: 200, responseText: script('0.19.1') });
  });
  const result = await api.craberCheckUpdate();
  const url = new URL(options.url);
  assert.equal(url.origin, 'https://raw.githubusercontent.com');
  const allowedHosts = [...source.matchAll(/^\/\/ @connect\s+(\S+)/gm)].map(match => match[1]);
  assert.ok(allowedHosts.includes(url.hostname), '更新域名必须显式声明，避免检查时弹出跨域授权页');
  assert.equal(url.pathname, '/yixing233/GPTCraber/main/chatgpt-md-exporter.user.js');
  assert.match(url.searchParams.get('craber_check'), /^\d+$/);
  assert.equal(options.method, 'GET');
  assert.equal(options.anonymous, true);
  assert.equal(options.timeout, 15000);
  assert.equal(options.headers['Cache-Control'], 'no-cache');
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.data, undefined);
  assert.equal(result.comparison, 1);
  assert.equal(result.current, '0.19.0');
  assert.equal(result.latest, '0.19.1');
});

test('相同版本与更高的本地测试版不会被判定为需要更新', async () => {
  for (const [current, expected] of [['0.19.0', 0], ['0.23.23', -1]]) {
    const api = fixture(opts => opts.onload({ status: 200, responseText: script('0.19.0') }), current);
    assert.equal((await api.craberCheckUpdate()).comparison, expected);
  }
});

test('HTTP 失败与格式错误不能显示为已是最新版本', async () => {
  const http = fixture(opts => opts.onload({ status: 503, responseText: script('9.0.0') }));
  await assert.rejects(http.craberCheckUpdate(), /HTTP 503/);
  const html = fixture(opts => opts.onload({ status: 200, responseText: '<html>blocked</html>' }));
  await assert.rejects(html.craberCheckUpdate(), /更新源内容异常/);
});

test('连接失败、超时与中止均返回可重试的错误', async () => {
  for (const [event, message] of [['onerror', /无法连接/], ['ontimeout', /超时/], ['onabort', /已取消/]]) {
    const api = fixture(opts => opts[event]({}));
    await assert.rejects(api.craberCheckUpdate(), message);
  }
});

test('脚本管理器不可用或拒绝发起请求时明确报错', async () => {
  await assert.rejects(fixture().craberCheckUpdate(), /脚本管理器/);
  await assert.rejects(fixture(() => { throw new Error('Permission denied'); }).craberCheckUpdate(), /无法发起/);
});

const CACHE_KEY = 'gpt_craber_update_check';
const DAY = 24 * 60 * 60 * 1000;

test('启动延迟检查，重复初始化不会增加定时器或请求', async () => {
  let calls = 0;
  const api = fixture(opts => { calls++; opts.onload({ status: 200, responseText: script('0.19.1') }); });
  api.craberStartAutoUpdate();
  api.craberStartAutoUpdate();
  assert.equal(calls, 0);
  assert.equal(api.timers.length, 2);
  const startup = api.timers.find(timer => !timer.repeat);
  assert.equal(startup.ms, 3000);
  startup.fn();
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 1);
  assert.equal(api.fabEl.getAttribute('data-craber-update'), '0.19.1');
  assert.match(source, /mountFab\(\);\s+craberStartAutoUpdate\(\);\s+injectSingleButtons\(\);/);
});

test('自动检查共享 24 小时记录，刷新或其它标签页不会再次请求', async () => {
  let calls = 0;
  const request = opts => { calls++; opts.onload({ status: 200, responseText: script('0.19.1') }); };
  const api = fixture(request);
  await api.craberRunUpdateCheck({ automatic: true });
  await api.craberRunUpdateCheck({ automatic: true });
  const reloaded = fixture(request, '0.19.0', { store: api.store });
  await reloaded.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 1);
  reloaded.advance(DAY - 1);
  await reloaded.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 1);
  reloaded.advance(1);
  await reloaded.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 2);
});

test('手动检查绕过每日间隔并刷新缓存', async () => {
  let calls = 0;
  const api = fixture(opts => { calls++; opts.onload({ status: 200, responseText: script('0.19.' + calls) }); });
  await api.craberRunUpdateCheck({ automatic: true });
  await api.craberRunUpdateCheck();
  assert.equal(calls, 2);
  assert.equal(JSON.parse(api.store.get(CACHE_KEY)).latest, '0.19.2');
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 2);
});

test('自动和手动检查进行中共用一个请求，其它标签页看到尝试记录', async () => {
  let response, calls = 0;
  const api = fixture(opts => { calls++; response = opts; });
  const auto = api.craberRunUpdateCheck({ automatic: true });
  const manual = api.craberRunUpdateCheck();
  assert.equal(auto, manual);
  await Promise.resolve();
  assert.equal(calls, 1);
  const other = fixture(() => { throw new Error('must not request'); }, '0.19.0', { store: api.store });
  assert.equal(await other.craberRunUpdateCheck({ automatic: true }), null);
  response.onload({ status: 200, responseText: script('0.20.0') });
  await auto;
  assert.equal(api.craberUpdateResult().latest, '0.20.0');
});

test('自动失败不会抛出异常或反复请求，手动重试可恢复', async () => {
  let calls = 0;
  const request = opts => {
    calls++;
    if (calls === 1) opts.onerror({});
    else opts.onload({ status: 200, responseText: script('0.19.0') });
  };
  const api = fixture(request);
  assert.equal(await api.craberRunUpdateCheck({ automatic: true }), null);
  assert.equal(api.craberUpdateResult(), null);
  const reloaded = fixture(request, '0.19.0', { store: api.store });
  await reloaded.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 1);
  await reloaded.craberRunUpdateCheck();
  assert.equal(calls, 2);
  assert.equal(reloaded.craberUpdateResult().comparison, 0);
});

test('后台或离线时延后检查，回到页面与恢复联网后继续', async () => {
  let calls = 0;
  const api = fixture(opts => { calls++; opts.onload({ status: 200, responseText: script('0.19.0') }); });
  api.document.visibilityState = 'hidden';
  api.craberStartAutoUpdate();
  api.timers[0].fn();
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 0);
  assert.equal(api.store.has(CACHE_KEY), false);
  api.document.visibilityState = 'visible';
  api.navigator.onLine = false;
  api.events.visibilitychange();
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 0);
  api.navigator.onLine = true;
  api.events.online();
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 1);
  api.advance(DAY);
  api.events.visibilitychange();
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 2);
});

test('持续打开页面也会在到期后自动检查', async () => {
  let calls = 0;
  const api = fixture(opts => { calls++; opts.onload({ status: 200, responseText: script('0.19.0') }); });
  api.craberStartAutoUpdate();
  await api.craberRunUpdateCheck({ automatic: true });
  const timer = api.timers.find(item => item.repeat);
  assert.equal(timer.ms, 60 * 60 * 1000);
  api.advance(timer.ms);
  timer.fn();
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 1);
  api.advance(DAY);
  timer.fn();
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 2);
});

test('刷新后恢复新版圆点，安装同版或更高版本后自动清除', async () => {
  const api = fixture(opts => opts.onload({ status: 200, responseText: script('0.19.1') }));
  await api.craberRunUpdateCheck({ automatic: true });
  for (const version of ['0.19.0', '0.19.1', '0.20.0']) {
    const reloaded = fixture(null, version, { store: api.store });
    reloaded.craberStartAutoUpdate();
    assert.equal(reloaded.fabEl.getAttribute('data-craber-update'), version === '0.19.0' ? '0.19.1' : null);
  }
});

test('跨标签页检查结果会同步到已打开的界面', () => {
  const api = fixture();
  let renders = 0;
  api.document.querySelectorAll = () => [{ _craberRenderUpdate() { renders++; } }];
  api.craberStartAutoUpdate();
  api.store.set(CACHE_KEY, JSON.stringify({ latest: '0.20.0', checkedAt: api.Date.now() }));
  api.events.storage({ key: CACHE_KEY });
  assert.equal(api.fabEl.getAttribute('data-craber-update'), '0.20.0');
  assert.ok(renders >= 2);
  api.store.set(CACHE_KEY, JSON.stringify({ latest: '0.19.0', checkedAt: api.Date.now() }));
  api.events.storage({ key: CACHE_KEY });
  assert.equal(api.fabEl.getAttribute('data-craber-update'), null);
  assert.equal(api.fabEl.title, '导出');
});

test('再次检查失败也保留已发现的新版本', async () => {
  let calls = 0;
  const api = fixture(opts => {
    if (++calls === 1) opts.onload({ status: 200, responseText: script('0.20.0') });
    else opts.ontimeout({});
  });
  await api.craberRunUpdateCheck({ automatic: true });
  await assert.rejects(api.craberRunUpdateCheck(), /超时/);
  assert.equal(api.fabEl.getAttribute('data-craber-update'), '0.20.0');
  assert.equal(api.craberUpdateResult().latest, '0.20.0');
});

test('损坏的缓存与未来时间戳不会阻止检查', async () => {
  for (const saved of ['not json', '{"latest":"invalid"}', '{"attemptedAt":9999999999999}']) {
    let calls = 0;
    const api = fixture(opts => { calls++; opts.onload({ status: 200, responseText: script('0.19.0') }); });
    api.store.set(CACHE_KEY, saved);
    await api.craberRunUpdateCheck({ automatic: true });
    assert.equal(calls, 1);
  }
});

test('浏览器存储不可用时仍可检查，当前页面用内存限制频率', async () => {
  let calls = 0;
  const api = fixture(opts => { calls++; opts.onload({ status: 200, responseText: script('0.19.0') }); });
  api.localStorage.getItem = api.localStorage.setItem = () => { throw new Error('Storage denied'); };
  await api.craberRunUpdateCheck({ automatic: true });
  await api.craberRunUpdateCheck({ automatic: true });
  assert.equal(calls, 1);
});
