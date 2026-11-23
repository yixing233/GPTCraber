'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'chatgpt-md-exporter.user.js'), 'utf8');

// ChatGPT 会将旧会话以 display:none 保留在当前会话之前。
// 外层宽度固定为视口宽度，body padding 无法缩窄正文；main/header 需要分别让位。
function layoutFixture() {
  const viewport = 1600;
  const panelWidth = 519;
  const style = () => {
    const values = new Map();
    return {
      getPropertyValue: key => values.get(key)?.value || '',
      getPropertyPriority: key => values.get(key)?.priority || '',
      setProperty: (key, value, priority = '') => values.set(key, { value, priority }),
      removeProperty: key => values.delete(key)
    };
  };
  const rect = (left, width, height) => ({ left, right: left + width, width, height });
  const body = { style: style(), classList: { add() {}, remove() {} } };
  const documentElement = {};
  const pages = [];
  function addPage() {
    const page = { hidden: false };
    page.main = { style: style(), parentElement: body,
      getBoundingClientRect: () => page.hidden ? rect(0, 0, 0)
        : rect(340, viewport - 340 - parseFloat(page.main.style.getPropertyValue('margin-right') || '0'), 900) };
    page.header = { style: style(), parentElement: body,
      getBoundingClientRect: () => page.hidden ? rect(0, 0, 0)
        : rect(0, viewport - parseFloat(page.header.style.getPropertyValue('right') || '0'), 52) };
    pages.push(page);
    return page;
  }
  const document = {
    body, documentElement,
    querySelectorAll(selector) {
      if (selector === 'main') return pages.map(page => page.main);
      if (selector === 'header') return pages.map(page => page.header);
      return [];
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  };
  const ctx = vm.createContext({ document,
    window: { innerWidth: viewport, innerHeight: 900 },
    getComputedStyle: () => ({ visibility: 'visible' }),
    scOpen: true,
    scEl: { style: { top: '0px' }, getBoundingClientRect: () => rect(viewport - panelWidth, panelWidth, 900) },
    scWidthLoad: () => panelWidth
  });
  vm.runInContext(source.slice(source.indexOf('  const SC_STRATEGIES ='),
    source.indexOf('  function scIcons() {'))
    + '\nthis.api = { scHeaderEl, scContentEl, scFindShell, scIsClear, scApplyPlaceholder, scPlaceholderTick };', ctx);
  return { api: ctx.api, addPage, panelLeft: viewport - panelWidth };
}

test('切换会话后选择可见正文和顶栏，忽略留在 DOM 前面的旧会话', () => {
  const { api, addPage } = layoutFixture();
  const old = addPage();
  old.hidden = true;
  const active = addPage();
  assert.equal(api.scContentEl(), active.main);
  assert.equal(api.scHeaderEl(), active.header);
});

test('切换过程中只有隐藏节点时，不能误判为占位成功', () => {
  const { api, addPage, panelLeft } = layoutFixture();
  addPage().hidden = true;
  assert.equal(api.scIsClear(panelLeft), false);
});

test('多次切换和返回缓存会话后，正文及顶栏仍止于侧栏左缘，关闭后还原', () => {
  const { api, addPage, panelLeft } = layoutFixture();
  const first = addPage();
  api.scApplyPlaceholder(true, 519);
  assert.equal(first.main.getBoundingClientRect().right, panelLeft);
  first.hidden = true;
  api.scApplyPlaceholder(true, 519); // 模拟路由回调早于新会话完成挂载。
  const second = addPage();
  api.scPlaceholderTick();
  assert.equal(second.main.getBoundingClientRect().right, panelLeft);
  assert.equal(second.header.getBoundingClientRect().right, panelLeft);
  second.hidden = true;
  const third = addPage();
  api.scPlaceholderTick();
  assert.equal(third.main.getBoundingClientRect().right, panelLeft);
  assert.equal(third.header.getBoundingClientRect().right, panelLeft);
  third.hidden = true;
  first.hidden = false;
  api.scPlaceholderTick();
  assert.equal(first.main.getBoundingClientRect().right, panelLeft);
  assert.equal(first.header.getBoundingClientRect().right, panelLeft);
  api.scApplyPlaceholder(false);
  for (const page of [first, second, third]) {
    assert.equal(page.main.style.getPropertyValue('margin-right'), '');
    assert.equal(page.header.style.getPropertyValue('right'), '');
  }
});
