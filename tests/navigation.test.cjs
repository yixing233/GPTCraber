'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = readFileSync(join(__dirname, '..', 'chatgpt-md-exporter.user.js'), 'utf8');

function navigationFixture({ heights = [3033, 822, 570, 5333], reversed = false, placeholder = false, loadedFrom = 0 } = {}) {
  let now = 0;
  let timerId = 0;
  const timers = new Map();
  const timer = (fn, ms, repeat = false) => {
    const id = ++timerId;
    timers.set(id, { fn, at: now + ms, ms: repeat ? ms : 0 });
    return id;
  };
  let path = 'conversation-a';
  let position = 0;
  let connected = true;
  let loaded = loadedFrom;
  const starts = heights.map((_, i) => 84 + heights.slice(0, i).reduce((sum, h) => sum + h + 12, 0));
  const fullHeight = starts.at(-1) + heights.at(-1) + 160;
  const offset = () => starts[loaded] - 84;
  const flashes = [];
  const toasts = [];
  const writes = [];
  const sc = {
    style: { scrollBehavior: 'smooth' }, clientHeight: 900,
    get isConnected() { return connected; },
    get scrollHeight() { return fullHeight - offset(); },
    get scrollTop() { return reversed ? position - (this.scrollHeight - this.clientHeight) : position; },
    set scrollTop(raw) {
      const span = this.scrollHeight - this.clientHeight;
      position = Math.max(0, Math.min(span, reversed ? raw + span : raw));
      writes.push(position);
      // 到达已加载首端后，下一批才前置进来，模拟真实分页加载与滚动锚定。
      if (position === 0 && loaded > 0) timer(() => {
        const oldOffset = offset();
        loaded--;
        position += oldOffset - offset();
      }, 180);
    },
    getBoundingClientRect: () => ({ top: 0, width: 640, height: 900 }),
    contains: el => elements.includes(el),
    scrollTo({ top }) { this.scrollTop = top; }
  };
  const isMounted = i => i >= loaded && starts[i] - offset() + heights[i] >= position - 150
    && starts[i] - offset() <= position + 1050;
  const elements = heights.map((height, i) => ({
    id: 'message-' + i,
    get isConnected() { return connected && isMounted(i); },
    get offsetWidth() { return this.isConnected ? 640 : 0; },
    get offsetHeight() { return this.isConnected ? height : 0; },
    getAttribute(name) { return /data-turn-key|data-message-id/.test(name) ? this.id : null; },
    querySelector: () => ({}),
    getBoundingClientRect() { return this.isConnected
      ? { top: starts[i] - offset() - position, bottom: starts[i] - offset() - position + height, width: 640, height }
      : { top: 0, bottom: 0, width: 0, height: 0 }; }
  }));
  const hidden = { id: 'message-1', offsetWidth: 0, offsetHeight: 0, isConnected: true,
    getAttribute: () => 'message-1', getBoundingClientRect: () => ({ top: 0, bottom: 0, width: 0, height: 0 }) };
  const document = {
    scrollingElement: {}, documentElement: {},
    querySelectorAll(selector) {
      let list = elements.filter((_, i) => isMounted(i));
      if (placeholder) list = [hidden, ...list];
      const id = selector.match(/="([^"]+)"/)?.[1];
      return id ? list.filter(el => el.id === id) : list;
    }
  };
  sc.querySelectorAll = document.querySelectorAll.bind(document);
  const context = vm.createContext({ document, window: { scrollY: 0 },
    getComputedStyle: () => ({ flexDirection: reversed ? 'column-reverse' : 'column', visibility: 'visible' }),
    getScrollContainer: () => sc, getConvId: () => path,
    setTimeout: (fn, ms) => timer(fn, ms), setInterval: (fn, ms) => timer(fn, ms, true),
    clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
    performance: { now: () => now }, Date: { now: () => now },
    CSS: { escape: value => value },
    hideNavCard() {}, hideNavPanel() {}, setNavActive() {},
    navToast: msg => toasts.push(msg), navToastHide() {},
    flashMessage: el => flashes.push(el.id), flashInline() {}, craberFindHeadingEl: () => null,
    state: { turns: elements.map(el => ({ question: { message: { id: el.id } } })) }
  });
  const constants = source.slice(source.indexOf('  const NAV_HUNT_ROUND_IDLE'), source.indexOf('  // 取轨道应该贴住的左边缘。'));
  const funcs = source.slice(source.indexOf('  const TURN_SEL ='), source.indexOf('  // 计算当前聚焦/阅读节点附近的 30 个可见窗口起始下标'));
  vm.runInContext('const NAV_SCROLL_OFFSET = 88;\n' + constants + '\n'
    + 'let navIdxById = Object.fromEntries(state.turns.map((t, i) => [t.question.message.id, i]));\n'
    + funcs + '\nthis.api = { findMsgEl, navigateToTurn, alignToEl, navScrollMetrics, navScrollTo };', context);
  async function run(promise) {
    let done = false;
    let error;
    let result;
    promise.then(value => { result = value; done = true; }, e => { error = e; done = true; });
    for (let step = 0; step < 2000 && !done; step++) {
      await Promise.resolve();
      await Promise.resolve();
      if (done) break;
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) continue;
      const [id, t] = next;
      now = t.at;
      if (t.ms) t.at += t.ms;
      else timers.delete(id);
      t.fn();
    }
    assert.equal(done, true, '跳转任务必须结束');
    if (error) throw error;
    return result;
  }
  return { api: context.api, run, sc, elements, hidden, flashes, toasts, writes,
    get position() { return position; },
    switchConversation() { path = 'conversation-b'; connected = false; } };
}

test('导航不会把虚拟占位符或隐藏旧会话当成已渲染消息', () => {
  const env = navigationFixture({ placeholder: true });
  assert.equal(env.api.findMsgEl('message-1'), null);
});

for (const reversed of [false, true]) {
  test(`越过 3033px 长回复跳到下一回合（${reversed ? '反向' : '普通'}滚动容器）`, async () => {
    const env = navigationFixture({ reversed });
    await env.run(env.api.navigateToTurn(1));
    assert.deepEqual(env.flashes, ['message-1']);
    assert.ok(Math.abs(env.elements[1].getBoundingClientRect().top - 88) < 4);
    assert.equal(env.sc.style.scrollBehavior, 'smooth');
  });
}

test('向前跳到尚未分页加载的回合，等待真实节点后落位', async () => {
  const env = navigationFixture({ loadedFrom: 2 });
  await env.run(env.api.navigateToTurn(0));
  assert.deepEqual(env.flashes, ['message-0']);
  assert.ok(env.elements[0].getBoundingClientRect().top <= 88);
});

test('切换会话会终止旧跳转，不能继续写入旧容器或显示失败提示', async () => {
  const env = navigationFixture();
  const task = env.api.navigateToTurn(1);
  env.switchConversation();
  const writes = env.writes.length;
  await env.run(task);
  assert.equal(env.writes.length, writes);
  assert.deepEqual(env.flashes, []);
  assert.equal(env.toasts.some(msg => /加载不出来|未找到|找不到/.test(msg)), false);
});

test('连续点击时旧任务不能在新目标之后再次滚动或高亮', async () => {
  const env = navigationFixture();
  const first = env.api.navigateToTurn(1);
  const latest = env.api.navigateToTurn(0);
  await env.run(Promise.all([first, latest]));
  assert.deepEqual(env.flashes, ['message-0']);
  assert.equal(env.position, 0);
  assert.equal(env.sc.style.scrollBehavior, 'smooth');
});

test('目标存在但容器拒绝滚动时，校正不能虚报已经到位', async () => {
  const env = navigationFixture();
  Object.defineProperty(env.sc, 'scrollTop', { get: () => 500, set() {} });
  assert.equal(await env.run(env.api.alignToEl(env.sc, env.elements[0])), false);
});

test('只有根滚动容器时保留真实可滚动范围', () => {
  const root = { scrollHeight: 9000, clientHeight: 900 };
  // 单独执行坐标函数，避免用元素滚动的桩掩盖根容器 span=0 的错误。
  const ctx = { document: { scrollingElement: root, documentElement: root }, window: { scrollY: 1200 } };
  vm.runInNewContext(source.slice(source.indexOf('  function scrollSpan(sc) {'),
    source.indexOf('  // 把内容坐标写回容器。')) + '\nthis.metrics = navScrollMetrics(document.scrollingElement);', ctx);
  assert.equal(ctx.metrics.span, 8100);
});
