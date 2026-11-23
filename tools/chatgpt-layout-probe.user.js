// ==UserScript==
// @name         Craber ChatGPT 布局探针（开发用）
// @namespace    gpt-craber-layout-probe
// @version      0.1.0
// @description  只采集 ChatGPT 的页面布局骨架与尺寸，不读取聊天正文；用于排查 Craber 侧边聊天占位失效。
// @author       craber
// @license      GPL-3.0-only
// @match        https://chatgpt.com/*
// @match        https://www.chatgpt.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /*
   * 这是开发诊断脚本，不是 Craber 的发布功能。
   *
   * 它只记录：
   *   - 页面骨架、祖先链、role/testid/少量类名；
   *   - 元素位置、尺寸、滚动尺寸和布局相关 CSS；
   *   - 临时给候选容器施加几种让位样式后，主内容有没有真的变化。
   *
   * 它不记录 innerText、textContent、输入框内容、Cookie、localStorage、
   * Authorization 或接口响应。导出的 JSON 仍可能包含页面路径形态和 DOM
   * 标识，分享前应自己检查。
   */

  const API_KEY = '__craberLayoutProbe';
  if (window[API_KEY]) {
    try { window[API_KEY].show(); } catch (e) {}
    return;
  }

  const MAX_NODES = 600;
  const PANEL_TEST_WIDTH = 420;
  const LANDMARK_SELECTOR = [
    'main',
    '[role="main"]',
    'header',
    '[role="banner"]',
    'nav',
    'aside',
    '[role="complementary"]',
    '.craber-sc'
  ].join(',');

  const runs = [];
  let lastClearance = null;
  let busy = false;

  function round(n, digits) {
    const scale = Math.pow(10, digits == null ? 2 : digits);
    return Math.round(Number(n || 0) * scale) / scale;
  }

  function cleanValue(value, max) {
    const s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return s.length > (max || 120) ? s.slice(0, max || 120) + '…' : s;
  }

  function safePagePath() {
    return location.pathname
      .replace(/\/c\/[^/]+/g, '/c/:id')
      .replace(/\/g\/[^/]+/g, '/g/:id')
      .replace(/\/share\/[^/]+/g, '/share/:id');
  }

  function depthOf(el) {
    let n = 0;
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) n++;
    return n;
  }

  function documentOrder(a, b) {
    if (a === b) return 0;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }

  function cssSelectorPath(el) {
    const out = [];
    let node = el;
    for (let i = 0; node && node !== document.body && i < 12; i++) {
      const tag = String(node.tagName || '').toLowerCase();
      if (!tag) break;
      let part = tag;
      const parent = node.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((x) => x.tagName === node.tagName);
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      }
      out.unshift(part);
      node = parent;
    }
    return 'body > ' + out.join(' > ');
  }

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return {
      x: round(r.x),
      y: round(r.y),
      top: round(r.top),
      right: round(r.right),
      bottom: round(r.bottom),
      left: round(r.left),
      width: round(r.width),
      height: round(r.height)
    };
  }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0
      && cs.display !== 'none'
      && cs.visibility !== 'hidden'
      && Number(cs.opacity || 1) > 0.01;
  }

  function compactStyle(el) {
    const cs = getComputedStyle(el);
    const keys = [
      'display', 'position', 'inset', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
      'margin', 'padding', 'boxSizing', 'overflow', 'overflowX', 'overflowY',
      'flexDirection', 'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis',
      'gridTemplateColumns', 'gridTemplateRows', 'gap',
      'transform', 'translate', 'zIndex', 'contain', 'isolation'
    ];
    const out = {};
    for (const key of keys) {
      const value = cs[key];
      if (value && value !== 'normal' && value !== 'none' && value !== 'auto'
          && value !== '0px' && value !== 'visible') {
        out[key] = cleanValue(value, 180);
      }
    }
    return out;
  }

  function nodeAttrs(el, isLandmark) {
    const out = {};
    const id = el.getAttribute('id');
    if (id && id.length <= 80) out.id = cleanValue(id, 80);
    if (el.classList && el.classList.length) {
      out.classes = Array.from(el.classList)
        .filter((x) => x && x.length <= 80)
        .slice(0, 10);
    }
    for (const name of ['role', 'data-testid']) {
      const value = el.getAttribute(name);
      if (value) out[name] = cleanValue(value, 100);
    }
    if (isLandmark) {
      const label = el.getAttribute('aria-label');
      if (label) out.ariaLabel = cleanValue(label, 100);
    }
    if (el.hasAttribute('data-turn-key')) out.hasTurnKey = true;
    if (el.hasAttribute('data-message-author-role')) out.messageRole = true;
    if (el.hasAttribute('contenteditable')) out.editable = true;
    return out;
  }

  function isLandmark(el) {
    return el.matches('main,header,nav,aside,[role="main"],[role="banner"],[role="navigation"],[role="complementary"]');
  }

  function nodeInfo(el, indexByEl) {
    const parentIndex = (() => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (indexByEl.has(p)) return indexByEl.get(p);
      }
      return null;
    })();
    return {
      index: indexByEl.get(el),
      parentIndex,
      depth: depthOf(el),
      tag: String(el.tagName || '').toLowerCase(),
      attrs: nodeAttrs(el, isLandmark(el)),
      selector: cssSelectorPath(el),
      rect: rectOf(el),
      client: { width: el.clientWidth, height: el.clientHeight },
      scroll: { width: el.scrollWidth, height: el.scrollHeight },
      style: compactStyle(el)
    };
  }

  function collectLayoutNodes() {
    const set = new Set();
    const add = (el) => {
      if (!(el instanceof Element) || el === document.documentElement) return;
      set.add(el);
    };

    for (const el of document.querySelectorAll(LANDMARK_SELECTOR)) {
      if (!isVisible(el)) continue;
      add(el);
      let p = el.parentElement;
      for (let i = 0; p && p !== document.body && i < 14; i++, p = p.parentElement) add(p);
    }

    for (const el of Array.from(document.body.children)) add(el);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const all = document.body.querySelectorAll('*');
    for (const el of all) {
      if (set.size >= MAX_NODES * 2) break;
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const fullWidth = r.width >= vw * 0.72;
      const tall = r.height >= vh * 0.58;
      const fixedOrSticky = cs.position === 'fixed' || cs.position === 'sticky';
      const scrollable = (cs.overflowY === 'auto' || cs.overflowY === 'scroll')
        && el.scrollHeight > el.clientHeight + 10 && r.height >= vh * 0.25;
      const nearEdge = (r.left <= 8 || r.right >= vw - 8 || r.top <= 8)
        && (r.width >= 48 || r.height >= 48);
      if ((fullWidth && tall) || fixedOrSticky || scrollable
          || nearEdge || el.hasAttribute('data-testid')) {
        add(el);
        if (set.size >= MAX_NODES) break;
      }
    }

    return Array.from(set)
      .filter((el) => el.isConnected)
      .sort((a, b) => depthOf(a) - depthOf(b) || documentOrder(a, b))
      .slice(0, MAX_NODES);
  }

  function makeSkeleton() {
    const nodes = collectLayoutNodes();
    const indexByEl = new Map(nodes.map((el, i) => [el, i]));
    return nodes.map((el) => nodeInfo(el, indexByEl));
  }

  function findInterestingElements() {
    const byKey = (selector) => Array.from(document.querySelectorAll(selector)).filter(isVisible);
    const fixed = Array.from(document.body.querySelectorAll('*')).filter((el) => {
      if (!isVisible(el)) return false;
      const cs = getComputedStyle(el);
      return cs.position === 'fixed' || cs.position === 'sticky';
    });
    const scrollables = Array.from(document.body.querySelectorAll('*')).filter((el) => {
      if (!isVisible(el)) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (cs.overflowY === 'auto' || cs.overflowY === 'scroll')
        && r.height >= window.innerHeight * 0.2;
    });
    return {
      main: byKey('main,[role="main"]'),
      header: byKey('header,[role="banner"]'),
      nav: byKey('nav,nav[aria-label="聊天记录"],aside'),
      fixed: fixed.slice(0, 40),
      scrollables: scrollables.slice(0, 40)
    };
  }

  function summarizeElement(el) {
    if (!el || !el.isConnected) return null;
    return {
      tag: String(el.tagName || '').toLowerCase(),
      attrs: nodeAttrs(el, isLandmark(el)),
      selector: cssSelectorPath(el),
      rect: rectOf(el),
      style: compactStyle(el)
    };
  }

  function measureLayout(elements) {
    return {
      main: elements.main.map(summarizeElement),
      header: elements.header.map(summarizeElement),
      nav: elements.nav.map(summarizeElement)
    };
  }

  function snapshot(label) {
    const cs = getComputedStyle(document.body);
    return {
      label: cleanValue(label || ('状态 ' + (runs.length + 1)), 80),
      capturedAt: new Date().toISOString(),
      page: safePagePath(),
      viewport: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      },
      document: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight
      },
      theme: document.documentElement.getAttribute('data-theme'),
      body: {
        attrs: nodeAttrs(document.body, false),
        style: compactStyle(document.body),
        overflow: {
          x: cs.overflowX,
          y: cs.overflowY
        }
      },
      interesting: findInterestingElements().main.length
        ? {
          main: findInterestingElements().main.slice(0, 8).map(summarizeElement),
          header: findInterestingElements().header.slice(0, 8).map(summarizeElement),
          nav: findInterestingElements().nav.slice(0, 8).map(summarizeElement)
        }
        : null,
      skeleton: makeSkeleton(),
      clearanceProbe: lastClearance
    };
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function uniqueElements(list) {
    return Array.from(new Set(list.filter((el) => el && el.isConnected && el !== document.documentElement)));
  }

  function collectClearanceCandidates() {
    const anchors = [
      ...Array.from(document.querySelectorAll('header,[role="banner"],main,[role="main"],nav,aside')),
      ...Array.from(document.body.children)
    ].filter(isVisible);

    const ancestors = [];
    for (const anchor of anchors) {
      let p = anchor;
      for (let i = 0; p && p !== document.body && i < 12; i++, p = p.parentElement) {
        if (!isVisible(p)) continue;
        const r = p.getBoundingClientRect();
        if (r.width >= window.innerWidth * 0.65 && r.height >= window.innerHeight * 0.65) {
          ancestors.push(p);
        }
      }
    }

    const fixedShells = Array.from(document.body.querySelectorAll('*')).filter((el) => {
      if (!isVisible(el)) return false;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') return false;
      const r = el.getBoundingClientRect();
      return r.width >= window.innerWidth * 0.85 && r.height >= window.innerHeight * 0.65;
    });

    return uniqueElements([...document.body.children, ...ancestors, ...fixedShells])
      .filter((el) => el !== document.body)
      .slice(0, 40);
  }

  function saveInlineStyle(el, prop) {
    return {
      el,
      prop,
      value: el.style.getPropertyValue(prop),
      priority: el.style.getPropertyPriority(prop)
    };
  }

  function restoreInlineStyle(saved) {
    if (!saved || !saved.el || !saved.el.isConnected) return;
    if (saved.value) saved.el.style.setProperty(saved.prop, saved.value, saved.priority || '');
    else saved.el.style.removeProperty(saved.prop);
  }

  function layoutDelta(before, after) {
    const pairs = [
      ['main', before.main, after.main],
      ['header', before.header, after.header],
      ['nav', before.nav, after.nav]
    ];
    const changes = [];
    for (const [kind, aList, bList] of pairs) {
      const n = Math.min(aList.length, bList.length);
      for (let i = 0; i < n; i++) {
        const a = aList[i];
        const b = bList[i];
        const dw = round(b.rect.width - a.rect.width);
        const dr = round(b.rect.right - a.rect.right);
        if (Math.abs(dw) >= 4 || Math.abs(dr) >= 4) {
          changes.push({
            kind,
            index: i,
            selector: a.selector,
            widthDelta: dw,
            rightDelta: dr
          });
        }
      }
    }
    return changes;
  }

  async function testClearance(width) {
    if (busy) return null;
    busy = true;
    setStatus('正在测量让位…');
    const w = Math.max(280, Math.min(1000, Math.round(width || PANEL_TEST_WIDTH)));
    const target = document.querySelector('.craber-sc.craber-open');
    const actualWidth = target ? Math.round(target.getBoundingClientRect().width) : w;
    const interesting = findInterestingElements();
    const before = measureLayout(interesting);
    const specs = [{
      id: 'body-padding-right',
      el: document.body,
      prop: 'padding-right',
      value: actualWidth + 'px'
    }];

    for (const el of collectClearanceCandidates()) {
      specs.push({
        id: 'shell-width',
        el,
        prop: 'width',
        value: 'calc(100vw - ' + actualWidth + 'px)'
      });
      specs.push({
        id: 'shell-margin-right',
        el,
        prop: 'margin-right',
        value: actualWidth + 'px'
      });
    }

    const main = document.querySelector('main,[role="main"]');
    if (main) {
      specs.push({
        id: 'main-margin-right',
        el: main,
        prop: 'margin-right',
        value: actualWidth + 'px'
      });
    }

    const results = [];
    for (const spec of specs) {
      if (!spec.el || !spec.el.isConnected) continue;
      const saved = saveInlineStyle(spec.el, spec.prop);
      try {
        spec.el.style.setProperty(spec.prop, spec.value, 'important');
        await nextFrame();
        const after = measureLayout(interesting);
        const changes = layoutDelta(before, after);
        results.push({
          strategy: spec.id,
          target: summarizeElement(spec.el),
          value: spec.value,
          effective: changes.length > 0,
          changes
        });
      } finally {
        restoreInlineStyle(saved);
        await nextFrame();
      }
    }

    lastClearance = {
      testedAt: new Date().toISOString(),
      width: actualWidth,
      results
    };
    busy = false;
    setStatus('让位测量完成：' + results.filter((x) => x.effective).length + ' 个候选生效');
    return lastClearance;
  }

  function downloadRuns() {
    if (!runs.length) {
      setStatus('还没有快照，先点“捕获当前”');
      return;
    }
    const payload = {
      probeVersion: '0.1.0',
      userAgent: navigator.userAgent,
      exportedAt: new Date().toISOString(),
      runs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'craber-chatgpt-layout-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setStatus('已导出 ' + runs.length + ' 个快照');
  }

  function clearRuns() {
    runs.length = 0;
    lastClearance = null;
    setStatus('已清空快照');
  }

  let host = null;
  let shadow = null;
  let labelInput = null;
  let statusEl = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
    console.log('[Craber 布局探针] ' + text);
  }

  function show() {
    if (host && host.isConnected) {
      host.style.display = 'block';
      return;
    }
    host = document.createElement('div');
    host.setAttribute('data-craber-layout-probe', '1');
    host.style.position = 'fixed';
    host.style.left = '12px';
    host.style.bottom = '12px';
    host.style.zIndex = '2147483647';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = [
      '<style>',
      ':host{all:initial}',
      '.box{font:12px/1.5 system-ui,sans-serif;color:#111;background:#fff;',
      'border:1px solid #bbb;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.22);',
      'padding:9px;width:280px}',
      '.row{display:flex;gap:5px;align-items:center}',
      '.row+.row{margin-top:6px}',
      'input{min-width:0;flex:1;height:27px;box-sizing:border-box;border:1px solid #bbb;',
      'border-radius:6px;padding:0 7px;font:inherit}',
      'button{height:27px;border:1px solid #aaa;border-radius:6px;background:#f7f7f7;',
      'font:inherit;cursor:pointer;padding:0 8px}',
      'button:hover{background:#eee}',
      '.primary{background:#111;color:#fff;border-color:#111}',
      '.primary:hover{background:#333}',
      '.status{min-height:18px;color:#555;margin-top:5px;word-break:break-word}',
      '.hint{color:#888;font-size:11px;margin-top:2px}',
      '</style>',
      '<div class="box">',
      '  <div class="row"><strong>Craber 布局探针</strong><span id="count" style="color:#888"></span></div>',
      '  <div class="row"><input id="label" placeholder="这次状态的名称，如 normal / sidebar-collapsed / craber-open"></div>',
      '  <div class="row">',
      '    <button id="capture" class="primary">捕获当前</button>',
      '    <button id="test">测让位</button>',
      '    <button id="download">导出 JSON</button>',
      '    <button id="clear">清空</button>',
      '  </div>',
      '  <div id="status" class="status">先打开 ChatGPT 会话页，再按状态逐个捕获。</div>',
      '  <div class="hint">只读布局，不采集聊天正文。换状态后无需刷新；刷新会丢失内存中的快照。</div>',
      '</div>'
    ].join('');
    document.body.appendChild(host);

    labelInput = shadow.getElementById('label');
    statusEl = shadow.getElementById('status');
    const countEl = shadow.getElementById('count');

    const readLabel = () => labelInput.value.trim() || ('state-' + (runs.length + 1));
    const refreshCount = () => { countEl.textContent = runs.length ? '（' + runs.length + '）' : ''; };

    shadow.getElementById('capture').addEventListener('click', () => {
      try {
        runs.push(snapshot(readLabel()));
        refreshCount();
        setStatus('已捕获：' + runs[runs.length - 1].label);
        labelInput.value = '';
      } catch (e) {
        setStatus('捕获失败：' + (e && e.message ? e.message : e));
      }
    });
    shadow.getElementById('test').addEventListener('click', async () => {
      try {
        await testClearance(PANEL_TEST_WIDTH);
      } catch (e) {
        busy = false;
        setStatus('测量失败：' + (e && e.message ? e.message : e));
      }
    });
    shadow.getElementById('download').addEventListener('click', downloadRuns);
    shadow.getElementById('clear').addEventListener('click', () => {
      clearRuns();
      refreshCount();
    });
  }

  window[API_KEY] = {
    capture: (label) => {
      const run = snapshot(label);
      runs.push(run);
      setStatus('已捕获：' + run.label);
      return run;
    },
    testClearance,
    download: downloadRuns,
    clear: clearRuns,
    dump: () => JSON.parse(JSON.stringify(runs)),
    show
  };

  if (document.body) {
    show();
    console.log('[Craber 布局探针] 已加载。控制台也提供 window.' + API_KEY + '。');
  } else {
    window.addEventListener('DOMContentLoaded', show, { once: true });
  }
})();
