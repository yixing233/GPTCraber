'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '..', 'chatgpt-md-exporter.user.js'), 'utf8');
const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// 只模拟本模块使用的 DOM / 编辑器接口；不把这些单测当成真实 ChatGPT 验收。
class Element {
  constructor(tag, attrs = {}, children = []) {
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.attrs = { ...attrs };
    this.className = attrs.class || '';
    this.childNodes = [];
    this.parentNode = null;
    this.listeners = new Map();
    this.styleValues = { display: 'block', flexDirection: 'row', visibility: 'visible' };
    this.classList = {
      contains: (name) => this.className.split(/\s+/).includes(name),
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter((name) => !names.includes(name)).join(' '); }
    };
    children.forEach((child) => this.appendChild(typeof child === 'string' ? text(child) : child));
  }
  get parentElement() { return this.parentNode; }
  get children() { return this.childNodes.filter((node) => node.nodeType === 1); }
  get lastElementChild() { return this.children.at(-1) || null; }
  get isConnected() { return !!this.connected || !!this.parentNode?.isConnected; }
  get innerHTML() {
    return this.rawHTML ?? this.childNodes.map((child) => child.nodeType === 3
      ? escape(child.nodeValue)
      : '<' + child.tagName.toLowerCase() + Object.entries(child.attrs).map(([k, v]) => ' ' + k + '="' + escape(v) + '"').join('') + '>'
        + (child.tagName === 'BR' ? '' : child.innerHTML + '</' + child.tagName.toLowerCase() + '>')).join('');
  }
  set innerHTML(value) {
    assert.notEqual(this.getAttribute('id'), 'prompt-textarea', '禁止直接覆盖输入框 innerHTML');
    this.rawHTML = value;
  }
  getAttribute(name) { return name === 'class' ? this.className || null : this.attrs[name] ?? null; }
  hasAttribute(name) { return this.getAttribute(name) !== null; }
  setAttribute(name, value) { this.attrs[name] = String(value); if (name === 'class') this.className = String(value); }
  removeAttribute(name) { delete this.attrs[name]; }
  appendChild(child) {
    child.remove?.();
    child.parentNode = this;
    child.ownerDocument = this.ownerDocument;
    this.childNodes.push(child);
    if (child.children) child.adopt(this.ownerDocument);
    return child;
  }
  adopt(doc) { this.ownerDocument = doc; this.children.forEach((child) => child.adopt(doc)); }
  remove() {
    if (this.parentNode) this.parentNode.childNodes = this.parentNode.childNodes.filter((child) => child !== this);
    this.parentNode = null;
    this.connected = false;
  }
  contains(node) { return this === node || this.childNodes.some((child) => child === node || child.contains?.(node)); }
  matches(selector) {
    return selector.split(',').some((part) => {
      const s = part.trim();
      const outsideAttrs = s.replace(/\[[^\]]*\]/g, '');
      if (/\s|>/.test(outsideAttrs)) throw new Error('单测未实现该选择器：' + s);
      const tag = outsideAttrs.match(/^[a-z][\w-]*/i)?.[0];
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      const id = outsideAttrs.match(/#([\w-]+)/)?.[1];
      if (id && this.getAttribute('id') !== id) return false;
      const classes = [...outsideAttrs.matchAll(/\.([\w-]+)/g)].map((match) => match[1]);
      if (classes.some((name) => !this.classList.contains(name))) return false;
      return [...s.matchAll(/\[([\w-]+)(?:(\^?=)"([^\"]*)")?\]/g)].every(([, key, op, val]) => {
        const actual = this.getAttribute(key);
        return op === '=' ? actual === val : op === '^=' ? actual?.startsWith(val) : actual !== null;
      });
    });
  }
  closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector) || null; }
  querySelectorAll(selector) {
    if (selector.startsWith(':scope > ')) return this.children.filter((child) => child.matches(selector.slice(9)));
    return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getClientRects() { return this.hidden ? [] : [{ width: 600, height: 100 }]; }
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  addEventListener(name, fn) { const list = this.listeners.get(name) || []; list.push(fn); this.listeners.set(name, list); }
  removeEventListener(name, fn) { this.listeners.set(name, (this.listeners.get(name) || []).filter((f) => f !== fn)); }
  async fire(name, props = {}) {
    const event = { type: name, button: 0, target: this, preventDefault() {}, stopPropagation() {}, ...props };
    await Promise.all((this.listeners.get(name) || []).map((fn) => fn(event)));
  }
}

function text(value) { return { nodeType: 3, nodeValue: value, parentNode: null }; }
function e(tag, ...children) { return new Element(tag, {}, children); }
function paragraph(value) { return e('p', value); }
function editor(...children) { return new Element('div', { id: 'prompt-textarea', contenteditable: 'true', class: 'ProseMirror' }, children); }

function documentWith(root = editor()) {
  const body = e('body', root);
  body.connected = true;
  const selection = {
    ranges: [],
    get rangeCount() { return this.ranges.length; },
    getRangeAt(i) { return this.ranges[i]; },
    removeAllRanges() { this.ranges = []; },
    addRange(range) { this.ranges.push(range); }
  };
  const doc = {
    body,
    activeElement: root,
    createElement: (tag) => { const node = e(tag); node.ownerDocument = doc; return node; },
    querySelectorAll: (selector) => body.querySelectorAll(selector),
    querySelector: (selector) => body.querySelector(selector),
    getSelection: () => selection,
    createRange: () => ({
      collapsed: false,
      selectNodeContents(node) { this.commonAncestorContainer = node; },
      collapse() { this.collapsed = true; },
      cloneRange() { return { ...this }; }
    }),
    queryCommandSupported: () => true
  };
  body.adopt(doc);
  return doc;
}

function load(doc = documentWith(), overrides = {}) {
  const start = source.indexOf('  function craberComposerJoin(');
  const end = source.indexOf('  // MutationObserver 跟进虚拟滚动挂载的新消息节点。', start);
  assert.ok(start >= 0 && end > start, '尚未实现输入框清除格式模块');
  const escapeStart = source.indexOf('  function escapeHtml(');
  const escapeEnd = source.indexOf('\n  }', escapeStart) + 4;
  const messages = [];
  const context = {
    document: doc,
    window: { getSelection: doc.getSelection },
    getComputedStyle: (node) => node.styleValues,
    setTimeout,
    console: { error() {} },
    uiPrefs: { composerClear: true },
    _tipOwner: null,
    bindTooltip() {},
    craberTipHide() {},
    mi: (paths) => '<svg>' + paths + '</svg>',
    navToast: (message) => messages.push(message),
    ...overrides
  };
  vm.runInNewContext(source.slice(escapeStart, escapeEnd) + '\n' + source.slice(start, end) + '\n'
    + 'globalThis.api = { craberComposerReadDom, craberComposerReadModel, craberComposerPlainHtml, craberComposerRestoreHtml, craberComposerClear, craberComposerMount, craberComposerUnmount };', context);
  return { ...context.api, context, messages };
}

function modelDoc(content) {
  const json = { type: 'doc', content };
  return {
    content: { size: JSON.stringify(content).length, nodes: content },
    toJSON: () => json,
    eq: (other) => JSON.stringify(json) === JSON.stringify(other.toJSON())
  };
}
function modelText(value, marks) { return { type: 'text', text: value, ...(marks ? { marks } : {}) }; }
function modelParagraph(value) { return { type: 'paragraph', ...(value ? { content: [modelText(value)] } : {}) }; }

function viewFor(root, content, options = {}) {
  let dispatches = 0;
  const schema = {
    text: (value) => modelText(value),
    nodes: { paragraph: { create: (_attrs, child) => ({ type: 'paragraph', ...(child ? { content: [child] } : {}) }) } }
  };
  class Selection {
    static atEnd(doc) { return new Selection(doc, doc.content.size - 1); }
    constructor(doc, pos) { this.$from = { doc }; this.pos = pos; }
    getBookmark() { return { resolve: (doc) => new Selection(doc, this.pos) }; }
  }
  const stateFor = (doc, selection = new Selection(doc, 1), storedMarks = [{ type: 'strong' }]) => ({
    doc, schema, selection, storedMarks,
    get tr() {
      return {
        doc, selection, storedMarks, meta: {},
        replaceWith(_from, _to, nodes) { this.doc = modelDoc(nodes.nodes || Array.from(nodes)); return this; },
        setStoredMarks(marks) { this.storedMarks = marks; return this; },
        setSelection(value) {
          if (value.$from.doc !== this.doc) throw new RangeError('Selection passed to setSelection must point at the current document');
          this.selection = value;
          this.storedMarks = null;
          return this;
        },
        setMeta(key, value) { this.meta[key] = value; return this; },
        setTime(value) { this.time = value; return this; },
        scrollIntoView() { return this; }
      };
    }
  });
  const view = {
    dom: root,
    composing: false,
    state: stateFor(modelDoc(content)),
    get dispatches() { return dispatches; },
    dispatch(tr) {
      dispatches++;
      if (options.ignore) return;
      this.state = stateFor(tr.doc, tr.selection, tr.storedMarks);
      options.afterDispatch?.(this, tr, dispatches);
    },
    focus() { root.focus(); }
  };
  root.editor = { view };
  return view;
}

test('截图中的代码块转为普通文本，C++ 引用符与换行保持不变', () => {
  const api = load();
  const result = api.craberComposerReadDom(editor(
    paragraph('下面两种写法有什么区别？'),
    e('pre', e('code', 'SimpleHole h = hole1;')),
    e('pre', e('code', 'const SimpleHole& h = hole1;'))
  ));
  assert.equal(result.text, '下面两种写法有什么区别？\nSimpleHole h = hole1;\nconst SimpleHole& h = hole1;');
  assert.equal(result.formatted, true);
});

test('保留连续空行、代码缩进、制表符和代码内的 Markdown 字面符号', () => {
  const api = load();
  const result = api.craberComposerReadDom(editor(
    paragraph(''), paragraph(''), e('pre', e('code', '\t  # **x_y** `literal`\n\n  *ptr = 1;\n')),
    paragraph(''), paragraph('末尾'), paragraph('')
  ));
  assert.equal(result.text, '\n\n\t  # **x_y** `literal`\n\n  *ptr = 1;\n\n\n末尾\n');
});

test('混合标题、行内格式、引用、嵌套列表和链接按块分行', () => {
  const api = load();
  const result = api.craberComposerReadDom(editor(
    e('h2', '标题'), e('p', e('strong', '粗体'), '和', e('em', '斜体'), e('a', '链接')),
    e('blockquote', paragraph('引用甲'), paragraph('引用乙')),
    e('ul', e('li', paragraph('第一项'), e('ul', e('li', paragraph('子项')))), e('li', paragraph('第二项')))
  ));
  assert.equal(result.text, '标题\n粗体和斜体链接\n引用甲\n引用乙\n第一项\n子项\n第二项');
  assert.equal(result.formatted, true);
});

test('区分软换行、空段落与 ProseMirror 占位换行', () => {
  const api = load();
  const trailing = () => new Element('br', { class: 'ProseMirror-trailingBreak' });
  assert.equal(api.craberComposerReadDom(editor(e('p', '甲', e('br'), trailing()), e('p', trailing()), paragraph('乙'))).text, '甲\n\n\n乙');
  assert.equal(api.craberComposerReadDom(editor(e('p', e('br')))).text, '');
  assert.equal(api.craberComposerReadDom(editor(paragraph('普通 **字面** # 文本'))).formatted, false);
});

test('表格保留单元格边界；视觉样式会被识别为格式', () => {
  const api = load();
  const result = api.craberComposerReadDom(editor(e('table', e('tbody', e('tr', e('td', '甲'), e('td', '乙')), e('tr', e('td', '丙'), e('td', '丁'))))));
  assert.equal(result.text, '甲\t乙\n丙\t丁');
  assert.equal(result.formatted, true);
  assert.equal(api.craberComposerReadDom(editor(new Element('p', { style: 'font-weight: 700' }, ['样式']))).formatted, true);
});

test('附件、提及和未知内嵌节点必须拒绝，不能悄悄丢弃', () => {
  const api = load();
  for (const node of [e('img'), e('input'), e('button', '复制'), e('custom-widget', '内容'), new Element('span', { contenteditable: 'false' }, ['@提及'])]) {
    assert.throws(() => api.craberComposerReadDom(editor(paragraph('保留'), node)), /附件|非文本|不支持|无法/);
  }
});

test('安全 HTML 序列化逐行保留空段落，不解释标签和 Markdown', () => {
  const api = load();
  assert.equal(api.craberComposerPlainHtml('  <img src=x onerror=alert(1)> & **a**\n\n尾\n'),
    '<p>  &lt;img src=x onerror=alert(1)&gt; &amp; **a**</p><p><br></p><p>尾</p><p><br></p>');
});

test('编辑器文档读取与 DOM 读取的保行规则一致', () => {
  const api = load();
  const result = api.craberComposerReadModel({ type: 'doc', content: [
    { type: 'heading', content: [modelText('标题')] },
    { type: 'paragraph', content: [modelText('粗体', [{ type: 'bold' }]), { type: 'hardBreak' }, modelText('第二行')] },
    modelParagraph(''), { type: 'code_block', content: [modelText('  *a\n\t#b')] }
  ] });
  assert.equal(result.text, '标题\n粗体\n第二行\n\n  *a\n\t#b');
  assert.equal(result.formatted, true);
  assert.throws(() => api.craberComposerReadModel({ type: 'doc', content: [{ type: 'mention', attrs: { id: 'keep-me' } }] }), /附件|非文本|不支持|无法/);
});

test('优先通过编辑器单次事务清除格式，同时清除后续输入格式', async () => {
  const root = editor();
  const doc = documentWith(root);
  const api = load(doc);
  const view = viewFor(root, [{ type: 'codeBlock', content: [modelText('  *x\n\n尾')] }]);
  doc.execCommand = () => assert.fail('有编辑器事务时不应调用原生兜底');
  assert.equal(await api.craberComposerClear(root), 'cleared');
  assert.equal(view.dispatches, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(view.state.doc.toJSON().content)), [modelParagraph('  *x'), modelParagraph(''), modelParagraph('尾')]);
  assert.equal(view.state.storedMarks.length, 0);
  assert.equal(doc.activeElement, root);
});

test('空草稿与纯文本不写入、不消耗撤销记录', async () => {
  const root = editor(e('p', e('br')));
  const doc = documentWith(root);
  const api = load(doc);
  doc.execCommand = () => assert.fail('空内容/纯文本不应该修改草稿');
  assert.equal(await api.craberComposerClear(root), 'empty');
  root.childNodes = [paragraph('**字面 Markdown**')];
  assert.equal(await api.craberComposerClear(root), 'plain');
});

test('编辑器组合输入、只读、失效节点均不能被修改', async () => {
  const root = editor();
  const doc = documentWith(root);
  const api = load(doc);
  const view = viewFor(root, [{ type: 'codeBlock', content: [modelText('草稿')] }]);
  view.composing = true;
  await assert.rejects(api.craberComposerClear(root), /输入|组合/);
  view.composing = false;
  root.setAttribute('contenteditable', 'false');
  await assert.rejects(api.craberComposerClear(root), /输入框|编辑/);
  root.setAttribute('contenteditable', 'true');
  root.remove();
  await assert.rejects(api.craberComposerClear(root), /输入框|切换/);
  assert.equal(view.dispatches, 0);
});

test('事务被编辑器拒绝时不报成功，也不改走另一路覆盖', async () => {
  const root = editor();
  const doc = documentWith(root);
  const api = load(doc);
  const view = viewFor(root, [{ type: 'codeBlock', content: [modelText('原稿')] }], { ignore: true });
  doc.execCommand = () => assert.fail('事务失败后不得盲目兜底');
  await assert.rejects(api.craberComposerClear(root), /未|失败|拒绝|保留/);
  assert.equal(api.craberComposerReadModel(view.state.doc.toJSON()).text, '原稿');
  assert.equal(api.craberComposerReadModel(view.state.doc.toJSON()).formatted, true);
});

test('未知模型节点在写回前被拦截，附件原样保留', async () => {
  const root = editor();
  const api = load(documentWith(root));
  const view = viewFor(root, [modelParagraph('草稿'), { type: 'attachment', attrs: { id: 'file-1' } }]);
  await assert.rejects(api.craberComposerClear(root), /附件|非文本|不支持|无法/);
  assert.equal(view.dispatches, 0);
});

function replaceChildren(root, nodes) {
  [...root.childNodes].forEach((child) => { child.parentNode = null; });
  root.childNodes = [];
  nodes.forEach((node) => root.appendChild(node));
}
function plainNodes(value) { return value.split('\n').map((line) => line ? paragraph(line) : e('p', e('br'))); }

function composerFixture() {
  const root = editor(e('pre', e('code', '草稿')));
  const plus = new Element('button', { 'data-testid': 'composer-plus-btn' });
  const host = e('div', e('span', plus));
  host.styleValues.display = 'flex';
  const attachment = new Element('div', { 'data-testid': 'attachment-chip' }, ['file.pdf']);
  const form = e('form', attachment, root, host);
  const doc = documentWith(form);
  return { root, plus, host, form, doc, attachment };
}

test('原生命令兜底只选草稿，一次插入安全段落并保持文字与焦点', async () => {
  const originalText = '  <b>*a*</b> & const x_y = 1;\n\n\t尾\n';
  const root = editor(e('pre', e('code', originalText)));
  const doc = documentWith(root);
  const api = load(doc);
  const calls = [];
  doc.execCommand = (command, _ui, value) => {
    calls.push(command);
    assert.equal(command, 'insertHTML');
    assert.equal(doc.getSelection().getRangeAt(0).commonAncestorContainer, root);
    assert.equal(value, api.craberComposerPlainHtml(originalText));
    replaceChildren(root, plainNodes(originalText));
    void root.fire('input');
    return true;
  };
  assert.equal(await api.craberComposerClear(root), 'cleared');
  assert.deepEqual(calls, ['insertHTML']);
  assert.equal(api.craberComposerReadDom(root).text, originalText);
  assert.equal(api.craberComposerReadDom(root).formatted, false);
  assert.equal(doc.activeElement, root);
  assert.equal(doc.getSelection().getRangeAt(0).collapsed, true);
  assert.equal(root.listeners.get('input').length, 0);
});

test('浏览器没有安全写入能力时不修改内容或选区', async () => {
  const root = editor(e('pre', e('code', '原稿')));
  const doc = documentWith(root);
  const api = load(doc);
  const original = root.innerHTML;
  doc.queryCommandSupported = () => false;
  doc.execCommand = () => assert.fail('未支持的命令不应尝试');
  await assert.rejects(api.craberComposerClear(root), /不支持|保留/);
  assert.equal(root.innerHTML, original);
  assert.equal(doc.getSelection().rangeCount, 0);
});

test('原生命令返回失败时不虚报成功；没有写入则不撤销用户之前的输入', async () => {
  const root = editor(e('pre', e('code', '原稿')));
  const doc = documentWith(root);
  const api = load(doc);
  const calls = [];
  doc.execCommand = (command) => { calls.push(command); return false; };
  await assert.rejects(api.craberComposerClear(root), /未接受|失败/);
  assert.deepEqual(calls, ['insertHTML']);
  assert.equal(api.craberComposerReadDom(root).text, '原稿');
});

test('写入改变文字时回退本次操作，不直接覆盖编辑器 HTML', async () => {
  const root = editor(e('pre', e('code', '  原稿\n\n尾')));
  const doc = documentWith(root);
  const api = load(doc);
  const originalNodes = [...root.childNodes];
  const calls = [];
  doc.execCommand = (command, _ui, value) => {
    calls.push(command);
    assert.equal(command, 'insertHTML', '恢复不能使用页面级 undo');
    if (calls.length === 2) {
      assert.equal(value, '<pre><code>  原稿\n\n尾</code></pre>');
      assert.equal(doc.getSelection().getRangeAt(0).commonAncestorContainer, root);
    }
    replaceChildren(root, calls.length === 2 ? originalNodes : plainNodes('原稿 尾'));
    void root.fire('input');
    return true;
  };
  await assert.rejects(api.craberComposerClear(root), /未接受|失败/);
  assert.deepEqual(calls, ['insertHTML', 'insertHTML']);
  assert.equal(api.craberComposerReadDom(root).text, '  原稿\n\n尾');
  assert.equal(api.craberComposerReadDom(root).formatted, true);
});

test('写回后仍有代码块格式也必须视为失败', async () => {
  const root = editor(e('pre', e('code', '原稿')));
  const doc = documentWith(root);
  const api = load(doc);
  const calls = [];
  doc.execCommand = (command) => { calls.push(command); return true; };
  await assert.rejects(api.craberComposerClear(root), /未接受|失败/);
  assert.deepEqual(calls, ['insertHTML']);
});

test('等待核对期间新输入不被回退覆盖', async () => {
  const root = editor(e('pre', e('code', '原稿')));
  const doc = documentWith(root);
  const api = load(doc);
  const calls = [];
  doc.execCommand = (command) => {
    calls.push(command);
    replaceChildren(root, plainNodes('原稿'));
    setTimeout(() => { replaceChildren(root, plainNodes('原稿 + 用户新输入')); void root.fire('input'); }, 0);
    return true;
  };
  await assert.rejects(api.craberComposerClear(root), /变化|重试/);
  assert.deepEqual(calls, ['insertHTML']);
  assert.equal(api.craberComposerReadDom(root).text, '原稿 + 用户新输入');
});

test('页面切换导致旧编辑器脱离时不得回退到其它输入框', async () => {
  const root = editor(e('pre', e('code', '原稿')));
  const doc = documentWith(root);
  const api = load(doc);
  const calls = [];
  doc.execCommand = (command) => {
    calls.push(command);
    replaceChildren(root, plainNodes('原稿'));
    setTimeout(() => root.remove(), 0);
    return true;
  };
  await assert.rejects(api.craberComposerClear(root), /切换|输入框/);
  assert.deepEqual(calls, ['insertHTML']);
});

test('已暴露的 ProseMirror view 也可使用，DOM 引用不匹配则拒绝采用', async () => {
  const root = editor();
  const doc = documentWith(root);
  const api = load(doc);
  const view = viewFor(root, [{ type: 'code_block', content: [modelText('草稿')] }]);
  delete root.editor;
  root.pmViewDesc = { view };
  assert.equal(await api.craberComposerClear(root), 'cleared');
  assert.equal(view.dispatches, 1);
  root.pmViewDesc = { view: { ...view, dom: editor() } };
  replaceChildren(root, plainNodes('普通文本'));
  assert.equal(await api.craberComposerClear(root), 'plain');
});

test('输入框按钮幂等挂载；React 删掉按钮后能补挂且不累积监听', () => {
  const { root, host, doc } = composerFixture();
  const api = load(doc);
  api.craberComposerMount();
  api.craberComposerMount();
  assert.equal(host.querySelectorAll('[data-craber-composer-clear]').length, 1);
  assert.equal(root.listeners.get('compositionstart').length, 1);
  assert.equal(root.listeners.get('compositionend').length, 1);
  const oldButton = host.querySelector('[data-craber-composer-clear]');
  oldButton.remove();
  api.craberComposerMount();
  assert.equal(host.querySelectorAll('[data-craber-composer-clear]').length, 1);
  assert.equal(host.querySelector('[data-craber-composer-clear]'), oldButton);
  assert.equal(root.listeners.get('compositionstart').length, 1);
});

test('React 只重建工具栏时保留进行中的组合输入与忙碌状态', async () => {
  const { root, host, doc } = composerFixture();
  const api = load(doc);
  api.craberComposerMount();
  const button = host.querySelector('[data-craber-composer-clear]');
  await root.fire('compositionstart');
  button.remove();
  api.craberComposerMount();
  assert.equal(host.querySelector('[data-craber-composer-clear]'), button);
  assert.equal(button.disabled, true);
  await assert.rejects(api.craberComposerClear(root), /输入/);
  await root.fire('compositionend');
  let calls = 0;
  doc.execCommand = () => {
    calls++;
    replaceChildren(root, plainNodes('草稿'));
    button.remove();
    api.craberComposerMount();
    return true;
  };
  const first = button.fire('click');
  assert.equal(button.disabled, true);
  await button.fire('click');
  await first;
  assert.equal(calls, 1);
});

test('关闭开关真正卸载；重新开启只挂一次', () => {
  const { root, host, doc } = composerFixture();
  const api = load(doc);
  api.craberComposerMount();
  api.context.uiPrefs.composerClear = false;
  api.craberComposerMount();
  assert.equal(host.querySelectorAll('[data-craber-composer-clear]').length, 0);
  assert.equal(root.listeners.get('compositionstart').length, 0);
  assert.equal(root.listeners.get('compositionend').length, 0);
  api.context.uiPrefs.composerClear = true;
  api.craberComposerMount();
  assert.equal(host.querySelectorAll('[data-craber-composer-clear]').length, 1);
});

test('组合输入期间按钮禁用，结束后恢复且不修改草稿', async () => {
  const { root, host, doc } = composerFixture();
  const api = load(doc);
  api.craberComposerMount();
  const button = host.querySelector('[data-craber-composer-clear]');
  await root.fire('compositionstart');
  assert.equal(button.disabled, true);
  await assert.rejects(api.craberComposerClear(root), /输入/);
  doc.execCommand = () => assert.fail('组合输入期间不应触发清除');
  await button.fire('click');
  api.craberComposerMount();
  assert.equal(button.disabled, true);
  await root.fire('compositionend');
  assert.equal(button.disabled, false);
});

test('按钮点击阻止默认发送；保留附件、重复点击只执行一次', async () => {
  const { root, host, doc, attachment } = composerFixture();
  const api = load(doc);
  api.craberComposerMount();
  const button = host.querySelector('[data-craber-composer-clear]');
  assert.equal(button.type, 'button');
  assert.match(button.getAttribute('aria-label'), /清除.*格式/);
  let calls = 0;
  let prevented = 0;
  let stopped = 0;
  doc.execCommand = () => { calls++; replaceChildren(root, plainNodes('草稿')); return true; };
  await Promise.all([button.fire('click', { preventDefault: () => prevented++, stopPropagation: () => stopped++ }), button.fire('click')]);
  assert.equal(calls, 1);
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.equal(attachment.isConnected, true);
  assert.equal(attachment.innerHTML, 'file.pdf');
  assert.equal(api.messages.length, 1);
});

test('编辑器替换时释放旧监听；旧按钮不能编辑新草稿', async () => {
  const { root, host, form, doc } = composerFixture();
  const api = load(doc);
  api.craberComposerMount();
  const old = host.querySelector('[data-craber-composer-clear]');
  root.remove();
  const fresh = editor(e('pre', e('code', '新草稿')));
  form.appendChild(fresh);
  api.craberComposerMount();
  assert.equal(root.listeners.get('compositionstart').length, 0);
  assert.equal(fresh.listeners.get('compositionstart').length, 1);
  assert.equal(host.querySelectorAll('[data-craber-composer-clear]').length, 1);
  doc.execCommand = () => assert.fail('旧按钮不允许继续操作');
  await old.fire('click');
  assert.equal(api.messages.length, 0);
});

test('未知输入框、历史消息与缺少可靠工具区时不挂载', () => {
  for (const mutate of [
    ({ root }) => root.setAttribute('id', 'other-editor'),
    ({ form }) => form.setAttribute('data-turn-key', 'old-turn'),
    ({ plus }) => plus.remove(),
    ({ host }) => { host.styleValues.display = 'block'; },
    ({ root }) => { root.hidden = true; }
  ]) {
    const fixture = composerFixture();
    mutate(fixture);
    const api = load(fixture.doc);
    api.craberComposerMount();
    assert.equal(fixture.host.querySelectorAll('[data-craber-composer-clear]').length, 0);
  }
});

test('空代码块和待输入格式也可清除，无格式空段落仍保持不变', async () => {
  for (const content of [[{ type: 'codeBlock' }], [modelParagraph('普通文本')], [modelParagraph('')]]) {
    const root = editor();
    const api = load(documentWith(root));
    const view = viewFor(root, content);
    assert.equal(await api.craberComposerClear(root), 'cleared');
    assert.equal(view.dispatches, 1);
    assert.equal(view.state.doc.toJSON().content[0].type, 'paragraph');
    assert.equal(view.state.storedMarks.length, 0);
    const result = await api.craberComposerClear(root);
    assert.equal(result, content[0].content ? 'plain' : 'empty');
    assert.equal(view.dispatches, 1);
  }
});

test('模型写入核对失败时恢复原稿，光标必须重新绑定到恢复后的文档', async () => {
  const root = editor();
  const api = load(documentWith(root));
  const view = viewFor(root, [{ type: 'codeBlock', content: [modelText('  原稿\n尾')] }], {
    afterDispatch(current, _tr, count) {
      if (count === 1) current.state.doc = modelDoc([modelParagraph('被插件改写')]);
    }
  });
  const original = JSON.stringify(view.state.doc.toJSON());
  await assert.rejects(api.craberComposerClear(root), /未接受|失败/);
  assert.equal(view.dispatches, 2);
  assert.equal(JSON.stringify(view.state.doc.toJSON()), original);
  assert.equal(view.state.selection.$from.doc, view.state.doc);
});

test('恢复片段不复制事件属性、脚本 URL 或危险 CSS，且忽略编辑器占位符', () => {
  const api = load();
  const root = editor(e('p', new Element('a', { href: 'javascript:alert(1)', onclick: 'alert(1)', title: '链接' }, ['文字']),
    new Element('span', { style: 'font-weight:bold;background-image:url(x);color:red;--custom:bad', onmouseover: 'alert(1)' }, ['粗体']),
    new Element('br', { class: 'ProseMirror-trailingBreak' })));
  const html = api.craberComposerRestoreHtml(root);
  assert.equal(html, '<p><a title="链接">文字</a><span style="font-weight:bold;color:red">粗体</span></p>');
});

test('局部恢复失败明确提示检查草稿，最多写入两次且不调用全局撤销', async () => {
  const root = editor(e('pre', e('code', '原稿')));
  const doc = documentWith(root);
  const api = load(doc);
  const calls = [];
  doc.execCommand = (command) => {
    calls.push(command);
    replaceChildren(root, plainNodes('错误内容'));
    return true;
  };
  await assert.rejects(api.craberComposerClear(root), /无法确认.*恢复.*检查/);
  assert.deepEqual(calls, ['insertHTML', 'insertHTML']);
  assert.equal(root.listeners.get('input').length, 0);
});

test('恢复等待期间新输入不会触发第三次写入', async () => {
  const root = editor(e('pre', e('code', '原稿')));
  const doc = documentWith(root);
  const api = load(doc);
  let calls = 0;
  doc.execCommand = (command) => {
    assert.equal(command, 'insertHTML');
    calls++;
    replaceChildren(root, calls === 1 ? plainNodes('错误内容') : [e('pre', e('code', '原稿'))]);
    if (calls === 2) setTimeout(() => { replaceChildren(root, plainNodes('用户新输入')); void root.fire('input'); }, 0);
    return true;
  };
  await assert.rejects(api.craberComposerClear(root), /无法确认|检查/);
  assert.equal(calls, 2);
  assert.equal(api.craberComposerReadDom(root).text, '用户新输入');
});

test('清除格式事务设置与后续输入分开的 history 时间边界', async () => {
  const root = editor();
  const api = load(documentWith(root));
  let transaction;
  viewFor(root, [{ type: 'codeBlock', content: [modelText('原稿')] }], {
    afterDispatch(_view, tr) { transaction = tr; }
  });
  await api.craberComposerClear(root);
  assert.equal(transaction.time, 0);
  assert.equal(transaction.meta['closeHistory$'], true);
});

test('偏好开关、启动、扫描与补挂入口已接入主脚本', () => {
  assert.match(source, /const UI_PREFS_DEFAULT = .*composerClear: true/);
  assert.match(source, /key === 'composerClear'[\s\S]*?if \(on\) craberComposerMount\(\);[\s\S]*?else craberComposerUnmount\(\);/);
  assert.match(source, /\['composerClear', '输入框清除格式'/);
  assert.match(source, /injectSingleButtons\(\);\s+craberComposerMount\(\);\s+maybeRefreshNavRail\(\);/);
  assert.match(source, /mountFab\(\);\s+craberComposerMount\(\);\s+\/\/ 项目条/);
  assert.match(source, /injectSingleButtons\(\);\s+craberComposerMount\(\);\s+\/\/ 等 ChatGPT/);
});

/* ============================================================
 * 侧边聊天
 *
 * 这里只测"不碰 DOM 就能验的纯逻辑"：配置读写与就绪判定、上下文拼装与
 * 截断、消息历史落盘上限。面板装配与流式请求靠真实浏览器验收 ——
 * 内置浏览器的注入结果不可信，拿它当验收会把状态弄脏。
 * ============================================================ */
function loadSideChat(overrides = {}) {
  const start = source.indexOf('  const SC_CFG_KEY =');
  const end = source.indexOf('  /* ---------- 面板 ----------', start);
  assert.ok(start >= 0 && end > start, '尚未实现侧边聊天模块');

  const store = new Map();
  const context = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    document: { getSelection: () => null, querySelectorAll: () => [] },
    location: { pathname: '/c/test' },
    console: { warn() {}, error() {} },
    ...overrides
  };
  vm.runInNewContext(source.slice(start, end) + '\n'
    + 'globalThis.api = { scCfgLoad, scCfgSave, scCfgReady, scModelConfigFor, scSetModelConfig, scBuildContext,'
    + ' scDomTurn, scVisibleTurns, scCurrentSelection, scThreadsLoad, scThreadsSave,'
    + ' scModelsFromResponse, scFetchModels, scCaptureSelection, scCollectContext,'
    + ' scAttachmentContent, scInputError, scTurnMessages, scReadAttachment, scEffortOptions, scSaveModels, scModelOptions,'
    + ' scThreadMatches, scConfiguredModels, scNewThread, SC_CTX_MAX_CHARS, SC_THREADS_MAX, SC_CFG_DEFAULT };', context);
  return { ...context.api, context, store };
}

test('侧边聊天：配置默认值、读写往返与就绪判定', () => {
  const { scCfgLoad, scCfgSave, scCfgReady, SC_CFG_DEFAULT } = loadSideChat();

  const blank = scCfgLoad();
  assert.equal(blank.baseUrl, '');
  assert.equal(blank.ctxMode, 'turn', '默认上下文档位应为当前轮');
  assert.equal(scCfgReady(blank), false, '没填地址和模型时不算就绪');

  scCfgSave({ ...SC_CFG_DEFAULT, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' });
  const back = scCfgLoad();
  assert.equal(back.baseUrl, 'https://api.deepseek.com/v1');
  assert.equal(back.model, 'deepseek-chat');
  assert.equal(scCfgReady(back), true, '地址与模型齐了即为就绪');

  // 只填地址不该算就绪 —— 缺模型时请求必然失败，提前拦住
  assert.equal(scCfgReady({ baseUrl: 'https://x/v1', model: '' }), false);
});

test('侧边聊天：配置损坏时退回默认值而不是抛错', () => {
  const { scCfgLoad, store } = loadSideChat();
  store.set('gpt_craber_sidechat_cfg', '{坏 JSON');
  const cfg = scCfgLoad();
  assert.equal(cfg.baseUrl, '');
  assert.equal(cfg.ctxMode, 'turn');
});

test('侧边聊天：旧单模型配置迁移为独立档案并保留旧历史', () => {
  const env = loadSideChat();
  env.store.set('gpt_craber_sidechat_threads', JSON.stringify([
    { id:'legacy-thread', title:'旧侧聊', messages:[], updatedAt:1 }
  ]));
  env.store.set('gpt_craber_sidechat_cfg', JSON.stringify({
    baseUrl:'https://api.example.com/v1', apiKey:'k', model:'legacy-model',
    ctxMode:'all', reasoningEffort:'high'
  }));
  env.store.set('gpt_craber_sidechat_mainctx', '0');

  const cfg = env.scCfgLoad();
  const profile = env.scModelConfigFor(cfg, 'legacy-model');
  assert.equal(profile.ctxMode, 'all');
  assert.equal(profile.reasoningEffort, 'high');
  assert.equal(profile.mainContextEnabled, false);
  assert.equal(profile.textEnabled, true);
  assert.equal(profile.imageEnabled, true);
  assert.equal(profile.threadId, 'legacy-thread');
  assert.equal(env.scThreadsLoad()[0].modelId, 'legacy-model');
  assert.equal(env.scThreadsLoad()[0].baseUrl, 'https://api.example.com/v1');
});

test('侧边聊天：模型档案分别保存上下文、模态、思考等级与当前历史', () => {
  const env = loadSideChat();
  let cfg = env.scCfgLoad();
  cfg.model = 'vision-model';
  env.scSetModelConfig(cfg, 'vision-model', {
    ctxMode:'all', textEnabled:false, imageEnabled:true,
    reasoningEffort:'high', threadId:'vision-thread'
  });
  env.scSetModelConfig(cfg, 'text-model', {
    ctxMode:'turn', textEnabled:true, imageEnabled:false,
    reasoningEffort:'low', threadId:'text-thread'
  });

  env.scCfgSave(cfg);
  cfg = env.scCfgLoad();
  const vision = env.scModelConfigFor(cfg, 'vision-model');
  const text = env.scModelConfigFor(cfg, 'text-model');
  assert.deepEqual(JSON.parse(JSON.stringify([
    vision.ctxMode, vision.textEnabled, vision.imageEnabled, vision.reasoningEffort, vision.threadId
  ])), ['all', false, true, 'high', 'vision-thread']);
  assert.deepEqual(JSON.parse(JSON.stringify([
    text.ctxMode, text.textEnabled, text.imageEnabled, text.reasoningEffort, text.threadId
  ])), ['turn', true, false, 'low', 'text-thread']);
  assert.equal(vision.mainContextEnabled, true);
  env.scSetModelConfig(cfg, 'text-model', { mainContextEnabled:false });
  assert.equal(env.scModelConfigFor(cfg, 'text-model').mainContextEnabled, false);
});

test('侧边聊天：配置模型列表只包含主动添加项，不会自动启用所有候选', () => {
  const env = loadSideChat();
  env.scCfgSave({ baseUrl:'https://one/v1', model:'model-a', modelConfigs:[
    { id:'model-a', ctxMode:'turn' }
  ] });
  env.scSaveModels([{ id:'model-a' }, { id:'model-b' }, { id:'model-c' }],
    { baseUrl:'https://one/v1' });
  assert.deepEqual(JSON.parse(JSON.stringify(env.scConfiguredModels().map((item) => item.id))), ['model-a']);
  assert.equal(env.scNewThread('model-b').modelId, 'model-b');
});

test('侧边聊天：独立历史按接口与模型隔离，同名模型也不会跨接口发历史', () => {
  const env = loadSideChat();
  const thread = env.scNewThread('shared-name', 'https://one/v1/');
  assert.equal(env.scThreadMatches(thread, { model:'shared-name', baseUrl:'https://one/v1' }), true);
  assert.equal(env.scThreadMatches(thread, { model:'other-name', baseUrl:'https://one/v1' }), false);
  assert.equal(env.scThreadMatches(thread, { model:'shared-name', baseUrl:'https://two/v1' }), false);
});

test('侧边聊天：新版 ChatGPT 从 data-response-body 读取回复而非角色标题', () => {
  const { scDomTurn } = loadSideChat();
  const user = new Element('div', { 'data-user-message-bubble': '' });
  user.innerText = '你好';
  const heading = new Element('h4', { 'data-conversation-role': 'assistant' });
  heading.innerText = 'ChatGPT 说：';
  const response = new Element('div', { 'data-response-body': '' });
  response.innerText = '你好！很高兴见到你。';
  const messageUnit = new Element('div', { 'data-content-search-unit-key': 'msg:assistant' }, [heading, response]);
  const turn = new Element('div', { 'data-turn-key': 'turn-1' }, [user, messageUnit]);

  assert.deepEqual(JSON.parse(JSON.stringify(scDomTurn(turn))), {
    key: 'turn-1',
    q: '你好',
    a: '你好！很高兴见到你。'
  });
});

test('侧边聊天：模型列表兼容常见返回格式、去重并排序', () => {
  const { scModelsFromResponse } = loadSideChat();
  const list = scModelsFromResponse({
    data: [
      { id: 'z-model', owned_by: 'vendor-z' },
      { id: 'a-model', display_name: 'Alpha Model' },
      { model: 'b-model' },
      { id: 'z-model', name: 'duplicate' }
    ]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(list.map((m) => m.id))),
    ['a-model', 'b-model', 'z-model']);
  assert.equal(list[0].label, 'Alpha Model');
  assert.equal(list[2].owner, 'vendor-z');
  assert.equal(list[0].maxOutputTokens, 0, '没给上限时按 0 处理');

  assert.deepEqual(JSON.parse(JSON.stringify(
    scModelsFromResponse({ models: ['m2', 'm1', 'm2'] }).map((m) => m.id))), ['m1', 'm2']);
  assert.deepEqual(JSON.parse(JSON.stringify(
    scModelsFromResponse({ result: { data: [{ id: 'r1' }] } }).map((m) => m.id))), ['r1']);
  assert.equal(scModelsFromResponse({ unexpected: true }).length, 0);
});

test('侧边聊天：关掉「主会话上下文」后不再带任何主对话内容', () => {
  const { scBuildContext, store } = loadSideChat();
  // 默认（未设置）会按档位带入主对话
  store.set('gpt_craber_sidechat_mainctx', '1');
  const on = scBuildContext('turn');
  assert.ok(on.label.length > 0);

  // 关掉之后必须是空上下文，且标签如实说明
  store.set('gpt_craber_sidechat_mainctx', '0');
  const off = scBuildContext('turn');
  assert.equal(off.text, '', '关掉主会话上下文时不能偷偷塞主对话内容');
  assert.equal(off.label, '未带主会话');
});

test('侧边聊天：左下角工具按钮弹出附件/主会话菜单', () => {
  const build = source.slice(source.indexOf('  function scEnsureBuilt() {'),
    source.indexOf('  function scBindEvents() {'));
  assert.match(build, /const toolsBtn = folderEl\('button', 'craber-sc-toolsbtn'\)/);
  assert.match(build, /footrow\.append\(toolsBtn, modelBtn, sendBtn\)/);

  const bind = source.slice(source.indexOf('  function scBindEvents() {'),
    source.indexOf('  R.ta.addEventListener(\'keydown\''));
  assert.match(bind, /R\.toolsBtn\.addEventListener\('click'/);
  assert.match(bind, /'主会话', \(\) => \{[\s\S]*?scShowMenu\('scope', scopeMenu, mainItem\)/,
    '点整行主会话打开上下文子菜单');
  assert.match(bind, /mainItem\.append\(chevron\)/, '箭头是整行按钮内的装饰');
  assert.match(bind, /addOption\('附带主会话', 'menuitemcheckbox'/);
  assert.match(bind, /addOption\(text, 'menuitemradio'/);
  assert.match(bind, /isSwitch \? 'craber-sc-scope-switch' : 'craber-sc-tick'/,
    '开关用滑块，范围用勾选');
  assert.match(bind, /scopeGroup\.setAttribute\('aria-label', '附带范围'\)/);
  assert.match(bind, /\(isSwitch \? scopeMenu : scopeGroup\)\.append\(b\)/,
    '附带范围两档放进独立分组');
  assert.match(bind, /scSetModelConfig\(c, c\.model, \{ mainContextEnabled: next \}\);\s*scCfgSave\(c\);/,
    '主会话开关按模型持久化，刷新后保持一致');
  assert.match(bind, /R\.fileInput\.click\(\)/);
});

test('侧边聊天：模型名按钮弹出模型列表与思考深度滑条', () => {
  const bind = source.slice(source.indexOf('  function scBindEvents() {'),
    source.indexOf('  R.ta.addEventListener(\'keydown\''));
  // 模型菜单只列出主动添加项。
  assert.match(bind, /craber-sc-modelmenu/);
  assert.match(bind, /depth\.type = 'range'/);
  assert.match(bind, /depth\.min = '0';[\s\S]*?depth\.max = String\(levels\.length - 1\)/,
    '滑块从第一个启用档位开始，没有未设置档');
  assert.match(bind, /const levels = c\.enabledEfforts;\s*row\.hidden = !c\.model \|\| !levels\.length;/);
  assert.match(bind, /const effort = profile\.enabledEfforts\[index\]/);
  assert.match(bind, /depth\.addEventListener\('pointerup', snapDepth\)/, '松手后才提交档位');
  assert.match(bind, /depth\.addEventListener\('change', snapDepth\)/, '键盘改变后走吸附逻辑');
  assert.match(bind, /depth\.addEventListener\('input', previewDepth\)/, '拖动中只更新预览');
  assert.match(bind, /depth\.step = 'any'/, '拖动允许落在档位之间再松手吸附');
  assert.match(bind, /depth\.style\.setProperty\('--sc-depth-dots', levels\.map\(/,
    '每个当前可用的思考档位都有自己的滑轨圆点');
  assert.match(bind, /const color = i <= nearest \? 'var\(--sc-depth-dot-filled\)' : 'var\(--sc-depth-dot-empty\)'/,
    '已选位置前后分别用对应的圆点状态');
  assert.match(bind, /depth\.addEventListener\('pointerup', snapDepth\)/,
    '拖动松手后才吸附并提交档位');
  assert.match(bind, /depth\.addEventListener\('change', snapDepth\)/,
    '键盘或点击改变后走同一套吸附逻辑');
  assert.match(bind, /depth\.addEventListener\('input', previewDepth\)/,
    '拖动过程只更新预览，不应立即写配置');
  assert.match(bind, /const previewDepth = \(\) => \{[\s\S]*?paintDepth\(profile\.enabledEfforts, depth\.value,[\s\S]*?\};\s*const snapDepth/,
    '拖动预览只重画滑块，不直接提交配置');
  assert.doesNotMatch(bind.match(/const previewDepth = \(\) => \{[\s\S]*?\};\s*const snapDepth/)?.[0] || '', /scCfgSave\(/,
    '预览阶段不能写入 localStorage');
  assert.match(bind, /const index = Math\.max\(0, Math\.min\(max, Math\.round\(Number\(depth\.value\) \|\| 0\)\)\)/,
    '松手时按最近的整数档位吸附');
  assert.match(bind, /scSetModelConfig\(c, c\.model, \{ reasoningEffort: effort \}\)/);
  assert.match(bind, /scConfiguredModels\(cfg\)/, '只允许切换到已添加模型');
  assert.match(bind, /scSwitchModel\(model\.id\)/, '切换模型时恢复其独立历史');
  assert.match(bind, /Math\.max\(0, nameText\.offsetWidth - name\.clientWidth\)/,
    '只按模型标签实际溢出的宽度滚动');
  assert.match(bind, /b\.addEventListener\('pointerenter', syncNameScroll\);\s*b\.addEventListener\('focus', syncNameScroll\);/);
});

test('侧边聊天：模型元数据里的输出上限与思考等级要能取到', () => {
  const { scModelsFromResponse } = loadSideChat();
  const list = scModelsFromResponse({
    data: [{
      id: 'wb/glm-5.3-flash',
      name: 'GLM-5.3-Flash',
      max_output_tokens: 131072,
      only_reasoning: true,
      reasoning_supported_efforts: ['low', 'high', 'max']
    }]
  });
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'wb/glm-5.3-flash');
  assert.equal(list[0].label, 'GLM-5.3-Flash');
  assert.equal(list[0].maxOutputTokens, 131072);
  assert.equal(list[0].onlyReasoning, true);
  assert.deepEqual(JSON.parse(JSON.stringify(list[0].efforts)), ['low', 'high', 'max']);

  // supported_reasoning_levels 的对象形态也要认
  const alt = scModelsFromResponse({
    models: [{ id: 'm', supported_reasoning_levels: [{ effort: 'low' }, { effort: 'max' }] }]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(alt[0].efforts)), ['low', 'max']);
});

test('侧边聊天：获取模型列表走 /models、带 Bearer 并返回候选', async () => {
  let req = null;
  const { scFetchModels } = loadSideChat({
    GM_xmlhttpRequest: (opts) => {
      req = opts;
      return { abort() {} };
    }
  });
  const pending = scFetchModels({
    baseUrl: 'https://api.example.com/v1///',
    apiKey: 'secret'
  });
  assert.equal(req.method, 'GET');
  assert.equal(req.url, 'https://api.example.com/v1/models');
  assert.equal(req.headers.Authorization, 'Bearer secret');
  assert.equal(req.headers.Accept, 'application/json');
  req.onload({ status: 200, responseText: '{"data":[{"id":"m-b"},{"id":"m-a"}]}' });
  const list = await pending;
  assert.deepEqual(JSON.parse(JSON.stringify(list.map((m) => m.id))), ['m-a', 'm-b']);
});

test('侧边聊天：获取模型失败时保留服务端错误正文', async () => {
  let req = null;
  const { scFetchModels } = loadSideChat({
    GM_xmlhttpRequest: (opts) => {
      req = opts;
      return { abort() {} };
    }
  });
  const pending = scFetchModels({ baseUrl: 'https://api.example.com/v1', apiKey: 'bad' });
  req.onload({ status: 401, responseText: '{"error":{"message":"invalid key"}}' });
  await assert.rejects(pending, /HTTP 401.*invalid key/);
});

test('侧边聊天：上下文按档位拼装，超长砍头保尾', () => {
  const long = 'x'.repeat(20000);
  const turns = [
    { q: '第一个问题', a: '第一个回答' },
    { q: '最后一个问题', a: '最后一个回答 ' + long }
  ];
  const env = loadSideChat({
    document: {
      getSelection: () => null,
      // 每个回合要有各自的 turn-key，否则会被同 key 去重掉（这是真实行为）
      querySelectorAll: () => turns.map((t, i) => ({
        offsetHeight: 100,
        getAttribute: () => 'turn-' + i,
        querySelector: (sel) => (sel.includes('user')
          ? { innerText: t.q }
          : { innerText: t.a })
      }))
    }
  });

  // turn 档：只带最后一轮
  const turn = env.scBuildContext('turn');
  assert.match(turn.text, /最后一个问题/);
  assert.ok(!turn.text.includes('第一个问题'), '当前轮档不该带上更早的轮次');

  // all 档：全部轮次都在
  const all = env.scBuildContext('all');
  assert.match(all.text, /第一个问题/);
  assert.match(all.text, /最后一个问题/);

  // 超长要截断，且留下标记 —— 不能让用户以为模型看到了全文
  assert.ok(all.text.length <= env.SC_CTX_MAX_CHARS + 60, '上下文必须被截断');
  assert.match(all.text, /中间省略/);
  assert.match(all.label, /已截断/);
  // 关键：提问不能被截掉。之前"整段砍头保尾"会把问题本身砍没、只留回答尾巴，
  // 模型拿到的是没有问题的半截回答。
  assert.match(all.text, /最后一个问题/);
  assert.match(all.text, /最后一个回答/);
});

test('侧边聊天：档位只有「当前轮」和「整个对话」两档', () => {
  const sel = { isCollapsed: false, toString: () => '这段是我选中的',
    anchorNode: { nodeType: 1, closest: (s) => (s.includes('craber-') ? null : { tagName: 'P' }) } };
  const withSel = loadSideChat({ document: { getSelection: () => sel, querySelectorAll: () => [] } });

  // 当前轮：选区 + 这一轮的问答都在里面
  const turn = withSel.scBuildContext('turn');
  assert.match(turn.text, /这段是我选中的/);
  assert.match(turn.label, /当前轮|无对话/, '没有挂载回合时也要如实说明');

  // 老的 selection 配置不再单独成档，按当前轮处理，不能变成空上下文
  const legacy = withSel.scBuildContext('selection');
  assert.match(legacy.text, /这段是我选中的/);
  assert.match(legacy.label, /当前轮|无对话/);

  // 整个对话档同样带上选区
  const all = withSel.scBuildContext('all');
  assert.match(all.text, /这段是我选中的/);
  assert.match(all.label, /全对话|当前轮/);
});

test('侧边聊天：选区落在我自己的面板里时不采信', () => {
  const sel = {
    isCollapsed: false, toString: () => '面板里的文字',
    anchorNode: { nodeType: 1, closest: (s) => (s === '.craber-sc,.craber-dlg-mask,.craber-set' ? {} : null) }
  };
  const env = loadSideChat({ document: { getSelection: () => sel, querySelectorAll: () => [] } });
  assert.equal(env.scCurrentSelection(), '', '面板内的选区不能当成主对话上下文');
});

test('侧边聊天的虚拟滚动占位符与重复 key 会被跳过', () => {
  const mk = (key, h, q, a) => ({
    offsetHeight: h,
    getAttribute: () => key,
    querySelector: (sel) => (sel.includes('user') ? { innerText: q } : { innerText: a })
  });
  const env = loadSideChat({
    document: {
      getSelection: () => null,
      // 同 key 各出现两次：一次是 0 高占位符，一次是真节点
      querySelectorAll: () => [
        mk('a', 0, '', ''), mk('a', 120, '问A', '答A'),
        mk('b', 0, '', ''), mk('b', 120, '问B', '答B')
      ]
    }
  });
  const turns = env.scVisibleTurns();
  assert.equal(turns.length, 2, '每个回合只算一次');
  // 跨 vm 上下文的数组原型不同，deepStrictEqual 会判不等，比 JSON 即可
  assert.equal(JSON.stringify(turns.map((t) => t.q)), JSON.stringify(['问A', '问B']));
});

test('侧边聊天：历史对话落盘有条数上限，新的在前', () => {
  const { scThreadsSave, scThreadsLoad, scNewThread, SC_THREADS_MAX } = loadSideChat();
  const many = [];
  for (let i = 0; i < SC_THREADS_MAX + 12; i++) {
    many.push({ ...scNewThread(), title: 't' + i });
  }
  scThreadsSave(many);
  const back = scThreadsLoad();
  assert.equal(back.length, SC_THREADS_MAX, '超出上限要截断，不能无限增长');
  assert.equal(back[0].title, 't0', '保留的是最新的那些');
});

test('侧边聊天：装配与入口已接入主脚本', () => {
  assert.match(source, /const CRAB_PAGES = \[[\s\S]*?id: 'side-chat', label: '侧边聊天'/);
  assert.match(source, /const UI_PREFS_DEFAULT = .*sideChat: true.*sideChatSel: true/);
  assert.match(source, /\['sideChat', '侧边聊天'/);
  assert.match(source, /key === 'sideChat'[\s\S]*?else scUnmount\(\);/);
  // 关掉开关必须真的停请求，不能只是藏起来
  assert.match(source, /function scUnmount\(\) \{\s*scStop\(\);/);
});

/* 顶栏入口的挂载条件 —— 这里踩过坑，值得钉死：
 * 最初把侧边聊天按钮和导出按钮绑在同一个 isConvPage() 判断下，
 * 于是 https://chatgpt.com/（新对话，URL 只有 /，还没有 /c/{id}）
 * 顶栏上什么都不显示。用户报的就是这个。 */
test('侧边聊天：顶栏入口不要求"已在会话页"，首页也要能挂', () => {
  const mountFn = source.slice(
    source.indexOf('  function craberSCMountButton(host) {'),
    source.indexOf('  /* ---------- 选中文字浮出按钮 ----------'));

  assert.ok(mountFn.length > 200, '应能取到 craberSCMountButton 函数体');
  // 这是回归的根因：挂载函数内部不能再用 isConvPage() 当门禁
  assert.ok(!/isConvPage\(\)/.test(mountFn),
    'craberSCMountButton 不应要求 isConvPage()，否则首页挂不上');

  // mountFab 里要独立调用它，且不放在 conv 判断之后
  const fabFn = source.slice(
    source.indexOf('  function mountFab() {'),
    source.indexOf('  /* ============================================================\n   * 🦀 设置中心'));
  const callAt = fabFn.indexOf('craberSCMountButton(host);');
  const guardAt = fabFn.indexOf('if (!conv) return false;');
  assert.ok(callAt > 0, 'mountFab 里应调用 craberSCMountButton');
  assert.ok(guardAt > callAt, '"非会话页就 return" 的提前返回必须在挂载调用之后');

  // 顺序：先挂导出按钮，再挂侧边聊天，否则会变成「侧边聊天 | 导出」
  const appendAt = fabFn.indexOf('host.appendChild(fabEl);');
  assert.ok(appendAt > 0 && appendAt < callAt,
    '导出按钮要先入 DOM，侧边聊天才能插到它后面');

  // 顶栏重建后要能补挂（每秒 tick 走的就是 mountFab）
  assert.match(source, /mountFab\(\);\s*craberComposerMount\(\);/);
});

test('侧边聊天：入口按钮声明早于 mountFab，不留 TDZ 隐患', () => {
  const declAt = source.indexOf('let scMountBtn = null;');
  const fabAt = source.indexOf('  function mountFab() {');
  assert.ok(declAt > 0, 'scMountBtn 应有声明');
  assert.ok(declAt < fabAt, 'scMountBtn 的声明要早于 mountFab 的定义');
  // 只允许一处声明：重复 let 同一作用域会直接语法错误
  assert.equal(source.split('let scMountBtn = null;').length - 1, 1);
});

/* 流式解析只测协议层：真实浏览器验收才算数（见 publish-only-after-verifying-core-path）。
 * 这里要守住的是"分片不重复、非流式响应不漏"这两条最容易返工的点。 */
function loadStream() {
  const start = source.indexOf('  const SC_CFG_KEY =');
  const end = source.indexOf('  /* ---------- 面板 ----------', start);
  const store = new Map();
  const context = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    document: { getSelection: () => null, querySelectorAll: () => [] },
    console: { warn() {}, error() {} },
    setTimeout,
    // scStream 在 stream 模式下要解码字节，vm 上下文里必须显式提供
    TextDecoder,
    TextEncoder
  };
  context.GM_xmlhttpRequest = (opts) => { context.__req = opts; return { abort() {} }; };
  vm.runInNewContext(source.slice(start, end) + '\nglobalThis.api = { scStream };', context);
  return context;
}

function driveStream(ctx, fire, cfg) {
  const out = { deltas: '', done: false, err: null };
  ctx.api.scStream(cfg || { baseUrl: 'https://x/v1', model: 'm', apiKey: 'k' },
    [{ role: 'user', content: 'hi' }],
    (d) => { out.deltas += d; }, () => { out.done = true; }, (e) => { out.err = e; });
  fire(ctx.__req);
  return out;
}

// 收尾在 stream 模式下会被延后一小段（等读取器把尾巴吐完），
// 所以需要等一等的用例走这个版本。
function waitFor(fn, ms = 400) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      try {
        if (fn()) return resolve();
      } catch (e) { return reject(e); }
      if (Date.now() - t0 > ms) return reject(new Error('等待超时'));
      setTimeout(tick, 15);
    };
    tick();
  });
}

test('侧边聊天流式：请求地址去掉尾斜杠，带 Bearer 鉴权', () => {
  const ctx = loadStream();
  driveStream(ctx, () => {});
  assert.equal(ctx.__req.url, 'https://x/v1/chat/completions');
  assert.equal(ctx.__req.headers.Authorization, 'Bearer k');
  assert.equal(JSON.parse(ctx.__req.data).stream, true);
});

test('侧边聊天流式：onprogress 是累计文本，分片不能重复吐', () => {
  const ctx = loadStream();
  const r = driveStream(ctx, (req) => {
    // 第一次推"你"，第二次推"你好"（累计），只能各自贡献一次增量
    req.onprogress({ responseText: 'data: {"choices":[{"delta":{"content":"你"}}]}\n\n' });
    req.onprogress({ responseText: 'data: {"choices":[{"delta":{"content":"你"}}]}\n\n'
      + 'data: {"choices":[{"delta":{"content":"好"}}]}\n\n' });
    req.onload({ status: 200, responseText: 'data: {"choices":[{"delta":{"content":"你"}}]}\n\n'
      + 'data: {"choices":[{"delta":{"content":"好"}}]}\n\ndata: [DONE]\n\n' });
  });
  assert.equal(r.deltas, '你好', '累计文本要按增量解析，否则会重复');
  assert.equal(r.done, true);
  assert.equal(r.err, null);
});

test('侧边聊天流式：网关忽略 stream 时退回整份 JSON，不能报"没内容"', async () => {
  const ctx = loadStream();
  const r = driveStream(ctx, (req) => {
    req.onload({ status: 200,
      responseText: '{"choices":[{"message":{"content":"完整回答"}}]}' });
  });
  await waitFor(() => r.done);
  assert.equal(r.deltas, '完整回答', '非流式响应必须被识别，否则测试连接会误报');
  assert.equal(r.done, true);
});

test('侧边聊天流式：HTTP 错误要带出服务端的错误正文', () => {
  const ctx = loadStream();
  const r = driveStream(ctx, (req) => {
    req.onload({ status: 401, responseText: '{"error":{"message":"invalid key"}}' });
  });
  assert.equal(r.done, false);
  assert.match(r.err.message, /401/);
  assert.match(r.err.message, /invalid key/, '错误正文要透出来，只说"请求失败"没法排查');
});

test('侧边聊天流式：失败与中止只收尾一次', () => {
  for (const [name, fire] of [
    ['网络错误', (req) => { req.onerror(); req.onload({ status: 200, responseText: '{}' }); }],
    ['中止', (req) => { req.onabort(); req.onload({ status: 200, responseText: '{}' }); }]
  ]) {
    const ctx = loadStream();
    const r = driveStream(ctx, fire);
    assert.ok(r.err, name + ' 应该报错');
    assert.equal(r.done, false, name + ' 之后不该再走完成分支');
  }
});

/* 占位式分栏：面板打开时应该"推窄页面"，而不是浮在正文上面遮挡。
 * 这条是用户明确提的取舍（"应该是占位的，而不是悬浮在页面之上"），
 * 钉死几个关键实现点，避免以后被改回滑出式抽屉。 */
test('侧边聊天：打开时给页面让位（占位），关闭/卸载时还原', () => {
  // 让位函数存在，且操作的是 body 的 padding-right
  assert.match(source, /function scApplyPlaceholder\(on, width\)/);
  assert.match(source, /body\.style\.setProperty\('padding-right', want, 'important'\)/);

  // 打开要占位、关闭要还原
  const openFn = source.slice(source.indexOf('  function scOpenPanel() {'),
    source.indexOf('  function scClose() {'));
  assert.match(openFn, /scApplyPlaceholder\(true/);
  const closeFn = source.slice(source.indexOf('  function scClose() {'),
    source.indexOf('  function scToggle() {'));
  assert.match(closeFn, /scApplyPlaceholder\(false\)/);

  // 关掉开关（卸载）也必须还原，否则正文右侧永久空一块
  const unFn = source.slice(source.indexOf('  function scUnmount() {'),
    source.indexOf('  /* ---------- 顶栏入口按钮 ----------'));
  assert.match(unFn, /scApplyPlaceholder\(false\)/);

  // 每秒 tick 要拉回让位宽度（React 会冲掉 body 的内联 padding）
  assert.match(source, /function scPlaceholderTick\(\)/);
  assert.match(source, /scPlaceholderTick\(\);\s*\}, 1000\);/);
});

test('侧边聊天：面板宽度按"正文至少留多宽"反推，且扣掉原生侧栏', () => {
  assert.match(source, /function scMaxPanelWidth\(\)/);
  assert.match(source, /function scMainMinWidth\(\)/);
  // 必须把原生左侧栏占的宽度减掉，否则窄屏下正文会被挤到没法读
  const fn = source.slice(source.indexOf('  function scMaxPanelWidth() {'),
    source.indexOf('  function scIcons() {'));
  assert.match(fn, /nav\[aria-label="聊天记录"\]|aside/);
  assert.match(fn, /avail - scMainMinWidth\(\)/);
});

test('侧边聊天：面板不靠 translateX(100%) 滑出屏幕，避免占位留白', () => {
  const css = source.slice(source.indexOf('.craber-sc{position:fixed'),
    source.indexOf('.craber-sc.craber-open{'));
  // 只看真正的 CSS 声明，别把注释里的说明当成实现
  const decls = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/translateX\(100%\)/.test(decls),
    '占位式分栏下不能用"滑出屏幕"表示关闭，否则让出来的空间会留白');
  assert.match(decls, /visibility:hidden/);
});

test('侧边聊天：面板内按钮不走全局 tooltip（气泡会飘到面板外）', () => {
  const fn = source.slice(source.indexOf('  function isOwnUi(el) {'),
    source.indexOf('  function installTitleTooltip() {'));
  assert.match(fn, /closest\('\.craber-sc'\)/, 'isOwnUi 要排除面板内元素');
  // 面板内三个按钮用原生 title
  const build = source.slice(source.indexOf('  function scEnsureBuilt() {'),
    source.indexOf('  function scBindEvents() {'));
  assert.ok(!/bindTooltip\((histBtn|newBtn|closeBtn)/.test(build),
    '面板内按钮不该绑全局气泡');
  assert.match(build, /closeBtn\.title = '关闭'/);
});

test('侧边聊天：模型菜单的 tooltip 使用高层浮层样式', () => {
  const place = source.slice(source.indexOf('  function craberTipPlace(el, text) {'),
    source.indexOf('  function craberTipHide() {'));
  assert.match(place, /tip\.classList\.toggle\('craber-tip-modal', !!el\.closest\('\.craber-dlg-mask, \.craber-sc-modelmenu'\)\)/);
});

/* 未配置模型时不能只在底部塞一行灰字 —— 用户看完还是不知道去哪配。
 * 要求：消息区给引导卡 + 直达配置的按钮，输入框禁用，保存后自动恢复可用。 */
test('侧边聊天：未配置时消息区显示引导卡与直达配置入口', () => {
  // 未配置优先于空状态：先判配置，再判有没有消息
  const fn = source.slice(source.indexOf('  function scRenderMessages() {'),
    source.indexOf('  // 滚动到底。'));
  const readyAt = fn.indexOf('if (!scCfgReady())');
  const emptyAt = fn.indexOf('if (!msgs.length)');
  assert.ok(readyAt > 0 && emptyAt > readyAt,
    '未配置的判断要在空状态之前，否则引导卡永远不出现');
  assert.match(fn, /scBuildSetupCard\(\)/);
});

test('侧边聊天：引导卡里有「去配置」按钮，点了关闭面板并打开设置页', () => {
  const card = source.slice(source.indexOf('  function scBuildSetupCard() {'),
    source.indexOf('  function scSyncCtxBar() {'));
  assert.match(card, /craberOpenSettings\('side-chat'\)/,
    '要直达侧边聊天配置页，而不是让用户自己找');
  // 设置中心是模态（z 900），必须先关面板，否则设置被压在下面
  const goAt = card.indexOf("craberOpenSettings('side-chat')");
  assert.ok(card.lastIndexOf('scClose()', goAt) > 0, '打开设置前要先关面板');
  // 常用地址一键复制
  assert.match(card, /api\.deepseek\.com\/v1/);
  assert.match(card, /127\.0\.0\.1:11434\/v1/);
});

test('侧边聊天：未配置时输入框与发送按钮禁用，配置后恢复', () => {
  const bar = source.slice(source.indexOf('  function scSyncCtxBar() {'),
    source.indexOf('  /* ---------- 渲染消息 ----------'));
  assert.match(bar, /scRefs\.ta\.disabled = true/);
  assert.match(bar, /disabled = true;/, '档位按钮也该禁用');
  assert.match(bar, /scRefs\.ta\.disabled = !cfg\.textEnabled/, '按当前模型文本模态启用输入框');
  assert.match(bar, /scRefs\.sendBtn\.disabled = !scCfgReady\(cfg\)/, '配置好了要恢复发送按钮');

  // scSetStreamingUI 不能无条件启用输入框，否则会覆盖未配置的禁用态
  const sui = source.slice(source.indexOf('  function scSetStreamingUI(on) {'),
    source.indexOf('  function scStop() {'));
  assert.ok(!/R\.ta\.disabled = false;/.test(sui),
    '不能无条件启用输入框，未配置时必须保持禁用');
  assert.match(sui, /R\.ta\.disabled = !scCfgReady\(\) \|\| !profile\.textEnabled/);
});

test('侧边聊天：保存配置后面板立刻按新状态重画', () => {
  const save = source.slice(source.indexOf("'craber-set-btn craber-set-btn-primary craber-sc-save', '保存配置')"),
    source.indexOf("const openBtn = folderEl('button', 'craber-set-btn', '打开侧栏')"));
  assert.match(save, /const c = collect\(\);[\s\S]*?scCfgSave\(c\);/);
  // 只刷上下文条不够 —— 引导卡还挂在消息区里
  assert.match(save, /scSyncCtxBar\(\)/);
  assert.match(save, /scRenderMessages\(\)/);
});

test('侧边聊天配置页：字段有可点击标签、正确输入语义与状态播报', () => {
  const fn = source.slice(source.indexOf('  function craberPageSideChat() {'),
    source.indexOf('  // 页面 4：WebDAV 连接设置'));
  assert.match(fn, /const lab = folderEl\('label', 'craber-set-label', label\)/);
  assert.match(fn, /lab\.htmlFor = id/);
  assert.match(fn, /type: 'url'/);
  assert.match(fn, /inputMode: 'url'/);
  assert.match(fn, /autocomplete: 'new-password'/);
  assert.match(fn, /spellcheck = false/);
  assert.match(fn, /setAttribute\('translate', 'no'\)/);
  assert.match(fn, /status\.setAttribute\('aria-live', 'polite'\)/);
});

test('侧边聊天配置页：接口输入加宽，数值参数并排，状态并入页脚', () => {
  const css = source.slice(source.indexOf('    /* ===== 侧边聊天配置页 ===== */'),
    source.indexOf('    /* 同步记录 */'));
  assert.match(css, /\.craber-sc-row\.craber-backup-row\{display:grid/);
  assert.match(css, /grid-template-columns:minmax\(180px,1fr\) minmax\(300px,1\.08fr\)/,
    'API 地址与模型名不能继续被压成约 190px');
  assert.match(css, /\.craber-sc-paramgrid\{display:grid/,
    '温度与最大输出 token 应并排');
  assert.match(css, /\.craber-sc-footer\{display:flex/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);

  const fn = source.slice(source.indexOf('  function craberPageSideChat() {'),
    source.indexOf('  // 页面 4：WebDAV 连接设置'));
  assert.match(fn, /craber-sc-secret/);
  assert.match(fn, /显示 API Key/);
  assert.match(fn, /const paramGrid = folderEl\('div', 'craber-sc-paramgrid'\)/);
  assert.match(fn, /foot\.append\(status, bar\)/);
  assert.match(css, /\.craber-sc-modelpick\{display:flex/);
  assert.match(fn, /const modelList = document\.createElement\('datalist'\)/);
  assert.match(fn, /modelIn\.setAttribute\('list', modelList\.id\)/);
  assert.match(fn, /const models = await scFetchModels\(c\)/);
  assert.match(fn, /availableModels = models/);
  assert.match(fn, /scSaveModels\(models, c\)/);
  assert.match(fn, /选择后点「添加模型」/);
  assert.match(fn, /textEnabled/);
  assert.match(fn, /imageEnabled/);
  assert.match(fn, /mainContextEnabled/);
  assert.match(fn, /const probeOnce = \(testCfg, timeoutMs\)/, '测试连接要复用可重试探针');
  assert.match(fn, /reasoningEffort: 'default'/, '空正文时要用最小参数复测');
  assert.match(fn, /没有最终正文/, '只有思考内容时不能误报模型不可用');
});

test('侧边聊天：Enter 发送、Shift+Enter 换行，输入法组合不误发', () => {
  const bind = source.slice(source.indexOf('  function scBindEvents() {'),
    source.indexOf('  /* 未配置时的引导卡'));
  assert.match(bind, /if \(e\.key !== 'Enter'\) return;/);
  assert.match(bind, /if \(e\.isComposing \|\| e\.keyCode === 229\) return;/,
    '中文输入法选词时按回车不能直接发送');
  assert.match(bind, /if \(e\.shiftKey\) return;/, 'Shift+Enter 要留给换行');
  assert.match(bind, /if \(!scStreamHandle\) scSend\(\);/);

  // 旧版只认 Ctrl+Enter，用户直接按 Enter 没反应 —— 这条防回归
  assert.ok(!/if \(e\.key === 'Enter' && \(e\.ctrlKey \|\| e\.metaKey\)\)/.test(bind),
    '不能只支持 Ctrl+Enter');
});

test('侧边聊天：输入区是一个圆角容器，发送键是图标按钮', () => {
  const build = source.slice(source.indexOf('  function scEnsureBuilt() {'),
    source.indexOf('  function scBindEvents() {'));
  assert.match(build, /const box = folderEl\('div', 'craber-sc-box'\)/);
  assert.match(build, /box\.append\(ta\)/, '输入框单独成盒');
  assert.match(build, /footrow\.append\(toolsBtn, modelBtn, sendBtn\)/,
    '设计稿里发送键在底部信息行，不在输入框里');
  assert.match(build, /sendBtn\.setAttribute\('aria-label', '发送'\)/);

  const css = source.slice(source.indexOf('    /* 输入区：一个圆角容器包住输入框与发送键'),
    source.indexOf('    /* 选中文字时浮出的小按钮'));
  assert.match(css, /\.craber-sc-box\{position:relative;display:flex/);
  assert.match(css, /\.craber-sc-box:focus-within\{/);
  assert.match(css, /\.craber-sc-send\{flex:none;width:32px;height:32px;/,
    '发送键在底部信息行里，不再绝对定位进输入框');
  assert.match(css, /\.craber-sc-ta\{[\s\S]*?font-size:15px;line-height:23px;/,
    '输入文字使用更紧凑的字号和行高');
  assert.match(source, /\.craber-sc-composer\{[\s\S]*?box-shadow:0 4px 14px rgba\(15,18,22,\.10\),0 1px 3px rgba\(15,18,22,\.06\)/,
    '输入卡片使用轻量多层阴影');
  assert.match(source, /\.craber-sc-q\{[\s\S]*?box-shadow:0 4px 14px rgba\(15,18,22,\.10\),0 1px 3px rgba\(15,18,22,\.06\)/,
    '用户消息气泡使用轻量多层阴影');
});

test('侧边聊天：等待首字显示打字指示，空状态给快捷提问', () => {
  const render = source.slice(source.indexOf('  function scRenderMessages() {'),
    source.indexOf('  /* 滚动到底。'));
  assert.match(render, /craber-sc-typing/, '正文未到时要有等待反馈');
  assert.match(render, /craber-sc-sugs/, '空状态要给出可点的示例问题');
  assert.match(render, /scRefs\.ta\.value = text;\s+scSend\(\);/, '点示例问题应直接发送');
});

test('侧边聊天：用户消息气泡悬停显示复制按钮', () => {
  const css = source.slice(source.indexOf('    /* 气泡：参考稿'),
    source.indexOf('    /* 思考内容折叠容器'));
  assert.match(css, /\.craber-sc-qwrap\{position:relative;align-self:flex-end/,
    '用户气泡需要一个相对定位容器承载悬浮操作');
  assert.match(css, /\.craber-sc-qcopy\{[\s\S]*?opacity:0;pointer-events:none/,
    '复制按钮默认隐藏');
  assert.match(css, /\.craber-sc-qwrap:hover \.craber-sc-qcopy[\s\S]*?opacity:1;pointer-events:auto/,
    '悬停用户气泡时显示复制按钮');
  assert.match(css, /\.craber-sc-qcopy svg\{width:13px;height:13px/,
    '复制图标保持紧凑尺寸');

  const render = source.slice(source.indexOf('  function scRenderMessages() {'),
    source.indexOf('  /* 思考内容的折叠容器。', source.indexOf('  function scRenderMessages() {')));
  assert.match(render, /const qWrap = folderEl\('div', 'craber-sc-qwrap'\)/);
  assert.match(render, /const cp = folderEl\('button', 'craber-sc-qcopy'\)/);
  assert.match(render, /cp\.setAttribute\('aria-label', '复制用户消息'\)/);
  assert.match(render, /navigator\.clipboard\.writeText\(txt\)/,
    '复制按钮写入用户消息正文');
});

/* 推理模型的三个适配点（都是用户实测发现的缺失）：
 * 流式正文、思考等级、思考内容折叠展示。 */
function loadStreamV2() {
  const start = source.indexOf('  const SC_CFG_KEY =');
  const end = source.indexOf('  /* ---------- 面板 ----------', start);
  const store = new Map();
  const context = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    document: { getSelection: () => null, querySelectorAll: () => [] },
    console: { warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    // scStream 的 stream 分支要解码字节；vm 上下文不会自带
    TextDecoder,
    TextEncoder
  };
  context.GM_xmlhttpRequest = (opts) => { context.__req = opts; return { abort() {} }; };
  vm.runInNewContext(source.slice(start, end)
    + '\nglobalThis.api = { scStream, SC_CFG_DEFAULT };', context);
  return context;
}

function drive(ctx, fire, cfg) {
  const out = { content: '', think: '', done: false, err: null };
  ctx.api.scStream(cfg || { baseUrl: 'https://x/v1', model: 'm', apiKey: 'k' },
    [{ role: 'user', content: 'hi' }],
    (d) => { out.content += d; },
    () => { out.done = true; },
    (e) => { out.err = e; },
    (t) => { out.think += t; });
  fire(ctx.__req);
  return out;
}

const sseFrame = (o) => 'data: ' + JSON.stringify({ choices: [{ delta: o }] }) + '\n\n';

test('侧边聊天：思考内容（reasoning_content）要单独收，不能丢', () => {
  const ctx = loadStreamV2();
  const r = drive(ctx, (req) => {
    let acc = '';
    for (const f of [
      sseFrame({ reasoning_content: '我先想' }),
      sseFrame({ reasoning_content: '一想。' }),
      sseFrame({ content: '答案。' })
    ]) { acc += f; req.onprogress({ responseText: acc }); }
    acc += 'data: [DONE]\n\n';
    req.onload({ status: 200, responseText: acc });
  });
  assert.equal(r.think, '我先想一想。', '思考内容必须累积到独立通道');
  assert.equal(r.content, '答案。', '正文不能被思考内容污染');
  assert.equal(r.done, true);
});

test('侧边聊天：不同后端的推理字段名都要认', () => {
  // reasoning（OpenRouter 归一化）/ thinking（Anthropic 风格转换）
  for (const field of ['reasoning', 'thinking']) {
    const ctx = loadStreamV2();
    const r = drive(ctx, (req) => {
      const acc = sseFrame({ [field]: '想想' }) + sseFrame({ content: '答' })
        + 'data: [DONE]\n\n';
      req.onprogress({ responseText: acc });
      req.onload({ status: 200, responseText: acc });
    });
    assert.equal(r.think, '想想', field + ' 字段应被识别为思考内容');
    assert.equal(r.content, '答');
  }
  // reasoning_details 数组形态
  const ctx2 = loadStreamV2();
  const r2 = drive(ctx2, (req) => {
    const acc = sseFrame({ reasoning_details: [{ text: '细' }, { text: '节' }] })
      + sseFrame({ content: '答' }) + 'data: [DONE]\n\n';
    req.onprogress({ responseText: acc });
    req.onload({ status: 200, responseText: acc });
  });
  assert.equal(r2.think, '细节', 'reasoning_details[] 也要认');
});

test('侧边聊天：思考等级按档位写入请求体', () => {
  const cases = [
    // [档位, 期望的 reasoning_effort, 期望 thinking.type]
    ['default', undefined, undefined],
    ['off', 'off', 'disabled'],
    ['low', 'low', 'enabled'],
    ['medium', 'medium', 'enabled'],
    ['high', 'high', 'enabled'],
    ['max', 'max', 'enabled']
  ];
  for (const [effort, wantEffort, wantThinkType] of cases) {
    const ctx = loadStreamV2();
    drive(ctx, () => {}, {
      baseUrl: 'https://x/v1', model: 'm', apiKey: 'k', reasoningEffort: effort
    });
    const p = JSON.parse(ctx.__req.data);
    assert.equal(p.reasoning_effort, wantEffort, effort + ' 档的 reasoning_effort');
    const thinkType = p.thinking && p.thinking.type;
    assert.equal(thinkType, wantThinkType, effort + ' 档的 thinking.type');
    assert.equal(p.enable_thinking, wantThinkType && wantThinkType === 'enabled');
  }
});

test('侧边聊天：禁用的档位不会发送到接口', () => {
  const ctx = loadStreamV2();
  drive(ctx, () => {}, {
    baseUrl: 'https://x/v1', model: 'm', apiKey: 'k', reasoningEffort: 'high', enabledEfforts: ['off', 'low']
  });
  const payload = JSON.parse(ctx.__req.data);
  for (const key of ['reasoning_effort', 'thinking', 'enable_thinking']) assert.ok(!(key in payload));
});

test('侧边聊天：数组或对象式 content 也要提取为正文', () => {
  const ctx = loadStreamV2();
  const r = drive(ctx, (req) => {
    const acc = sseFrame({ content: [{ type: 'text', text: '你' }] })
      + sseFrame({ content: { type: 'output_text', text: '好' } })
      + sseFrame({ text: '。' })
      + 'data: [DONE]\n\n';
    req.onprogress({ responseText: acc });
    req.onload({ status: 200, responseText: acc });
  });
  assert.equal(r.content, '你好。', 'content 不是字符串时不能把整段回答当成空');
});

test('侧边聊天：缺少 choices 的增量帧也按正文解析', () => {
  const ctx = loadStreamV2();
  const r = drive(ctx, (req) => {
    const acc = 'data: {"delta":{"text":"直接"}}\n\ndata: {"delta":"文本"}\n\ndata: [DONE]\n\n';
    req.onprogress({ responseText: acc });
    req.onload({ status: 200, responseText: acc });
  });
  assert.equal(r.content, '直接文本');
});

test('侧边聊天：非流式 message.content 数组也要识别', async () => {
  const ctx = loadStreamV2();
  const r = drive(ctx, (req) => {
    req.onload({ status: 200,
      responseText: '{"choices":[{"message":{"content":[{"type":"text","text":"数组正文"}]}}]}' });
  });
  await waitFor(() => r.done);
  assert.equal(r.content, '数组正文');
});

test('侧边聊天：默认配置的思考等级是 default（不擅自带参数）', () => {
  const ctx = loadStreamV2();
  assert.equal(ctx.api.SC_CFG_DEFAULT.reasoningEffort, 'default');
});

test('侧边聊天：思考折叠展示并保留用户选择的展开状态', () => {
  // 渲染：思考块在正文之前，且走纯文本（不解析 markdown）
  const fn = source.slice(source.indexOf('  function scBuildThinkBox(m) {'),
    source.indexOf('  function scScrollToBottom(force) {'));
  assert.match(fn, /craber-sc-think/);
  assert.match(fn, /m\.thinkOpen === true/, '默认收起成一行，点开才展开');
  assert.match(fn, /body\.textContent = m\.reasoning/, '思考内容按纯文本渲染');
  assert.match(fn, /aria-expanded/, '要有无障碍状态');

  // 正文渲染里，思考块要在正文之前
  const render = source.slice(source.indexOf('  function scRenderMessages() {'),
    source.indexOf('  function scBuildThinkBox(m) {'));
  const thinkAt = render.indexOf('scBuildThinkBox(m)');
  const aAt = render.indexOf("const a = folderEl('div', 'craber-sc-a')");
  assert.ok(thinkAt > 0 && aAt > thinkAt, '思考块应排在正文前面');

  // 流式中标"正在思考"，结束后自动收起
  // 参考稿的写法是「思考 12s」，所以要有耗时分支
  assert.match(source, /'思考' \+ secs \+ 's'/);
  assert.match(source, /const label = m\.streaming\s*\?\s*'正在思考…'/);
  const done = source.slice(source.indexOf('h = scStream(cfg, api,'),
    source.indexOf('// 同步收尾的情况'));
  assert.match(done, /typer\.end\(\)/, '正文流结束要交给打字机按节奏收尾');
  assert.match(done, /ansMsg\.reasoning = \(ansMsg\.reasoning \|\| ''\) \+ thinkDelta/,
    '思考增量要累积到消息上');
  const typer = source.slice(source.indexOf('  function scTypewriter('),
    source.indexOf('  /* ---------- 发送 ---------- */'));
  assert.match(typer, /ansMsg\.thinkOpen = false/, '答完要自动收起');
  assert.match(typer, /if \(!ansMsg\.thinkUserToggled\)/, '手动展开后保持展开');
});

test('侧边聊天：当前轮采集选中区域所属轮次，焦点移走后仍保留', () => {
  const selectedTurn = {
    getAttribute: () => 'old-turn',
    querySelector: (selector) => ({ innerText: selector.includes('user') ? '旧问题' : '旧答案的完整正文' })
  };
  let selection = { isCollapsed:false, toString:() => '旧答案',
    anchorNode:{ nodeType:1, closest:(selector) => selector === '[data-turn-key]' ? selectedTurn : null } };
  const env = loadSideChat({ location:{ pathname:'/c/one' }, document:{
    getSelection:() => selection,
    querySelectorAll:() => [{ offsetHeight:100, getAttribute:() => 'new-turn',
      querySelector:(selector) => ({ innerText:selector.includes('user') ? '新问题' : '新答案' }) }]
  } });
  env.scCaptureSelection();
  selection = null;
  const context = env.scBuildContext('turn');
  assert.match(context.text, /旧问题/);
  assert.match(context.text, /旧答案的完整正文/);
  assert.ok(!context.text.includes('新问题'));
});

test('侧边聊天：整个对话采集当前分支缓存中的未挂载消息', async () => {
  const env = loadSideChat({
    getConvId:() => 'test',
    ensureState:async () => ({ turns:[
      { question:{ text:'首轮问题' }, answers:[{ text:'首轮回答', message:{ role:'assistant' } }] },
      { question:{ text:'末轮问题' }, answers:[{ text:'末轮回答', message:{ role:'assistant' } }] }
    ] }),
    extractText:(node) => node.text,
    craberRole:(message) => message.role
  });
  const context = await env.scCollectContext('all');
  assert.match(context.text, /首轮问题/);
  assert.match(context.text, /末轮回答/);
  assert.match(context.label, /2 轮/);
});

test('侧边聊天：整个对话读取失败必须交给发送端处理，不能退成空上下文', async () => {
  const env = loadSideChat({ getConvId:() => 'test',
    ensureState:async () => { throw new Error('conversation unavailable'); } });
  await assert.rejects(env.scCollectContext('all'), /conversation unavailable/);
});

test('侧边聊天：文本附件与图片构成 OpenAI 兼容消息，历史与重试复用', () => {
  const { scAttachmentContent } = loadSideChat();
  const content = scAttachmentContent({ content:'请解释', attachments:[
    { kind:'text', name:'notes.md', text:'文件正文' },
    { kind:'image', name:'diagram.png', dataUrl:'data:image/png;base64,AAAA' }
  ] }, '主会话上下文\n请解释');
  assert.equal(content[0].type, 'text');
  assert.match(content[0].text, /主会话上下文/);
  assert.match(content[0].text, /notes.md.*\n文件正文/);
  assert.equal(content[1].type, 'image_url');
  assert.equal(content[1].image_url.url, 'data:image/png;base64,AAAA');
  assert.equal(scAttachmentContent({ content:'原消息' }), '原消息');
  const pdf = scAttachmentContent({ content:'查看 PDF', attachments:[
    { kind:'pdf', name:'reference.pdf', dataUrl:'data:application/pdf;base64,AA==' }
  ] });
  assert.equal(pdf[1].type, 'file');
  assert.equal(pdf[1].file.filename, 'reference.pdf');
  assert.equal(pdf[1].file.file_data, 'data:application/pdf;base64,AA==');
  const imageOnly = scAttachmentContent({ attachments:[{ kind:'image', dataUrl:'image-data' }] });
  assert.equal(imageOnly.length, 1);
  assert.equal(imageOnly[0].type, 'image_url');
});

test('侧边聊天：每模型文本/图片输入设置过滤不支持的消息模态', () => {
  const { scAttachmentContent } = loadSideChat();
  const message = {
    content:'只支持图片',
    attachments:[
      { kind:'text', name:'notes.txt', text:'不应发送' },
      { kind:'image', name:'chart.png', dataUrl:'image-data' },
      { kind:'pdf', name:'spec.pdf', dataUrl:'pdf-data' }
    ]
  };
  const imageOnly = scAttachmentContent(message, '上下文与文字', { textEnabled:false, imageEnabled:true });
  assert.equal(imageOnly.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(imageOnly.map((part) => part.type))), ['image_url','file']);
  const textOnly = scAttachmentContent(message, '上下文与文字', { textEnabled:true, imageEnabled:false });
  assert.equal(typeof textOnly, 'string');
  assert.match(textOnly, /上下文与文字/);
  assert.match(textOnly, /不应发送/);
  assert.ok(!textOnly.includes('image_url'));
});

test('侧边聊天：重新组装请求时遵循模型模态，不发送已关闭的主会话上下文', () => {
  const { scTurnMessages, scInputError } = loadSideChat();
  const attachment = { kind:'image', name:'sample.png', dataUrl:'local-fixture' };
  const history = [
    { role:'user', content:'旧问题', ctx:'不应重复的主会话' },
    { role:'assistant', content:'旧回答' }
  ];
  const text = { role:'user', content:'新问题', ctx:'当前主会话' };
  const textMode = { textEnabled:true, imageEnabled:false, mainContextEnabled:false };
  assert.match(scInputError({ ...text, attachments:[attachment] }, textMode), /未启用图片/);
  assert.deepEqual(JSON.parse(JSON.stringify(scTurnMessages({ messages:[...history, text] }, text, textMode))), [
    { role:'user', content:'旧问题' }, { role:'assistant', content:'旧回答' }, { role:'user', content:'新问题' }
  ]);
  const withContext = scTurnMessages({ messages:[text] }, text, { ...textMode, mainContextEnabled:true });
  assert.match(withContext[0].content, /当前主会话/);
  const picture = { role:'user', content:'', ctx:'图片模型不发送此文本', attachments:[attachment] };
  const imageMode = { textEnabled:false, imageEnabled:true, mainContextEnabled:true, systemPrompt:'也不发送' };
  assert.equal(scInputError(picture, imageMode), '');
  assert.match(scInputError(text, imageMode), /未启用文本/);
  assert.deepEqual(JSON.parse(JSON.stringify(scTurnMessages({ messages:[...history, picture] }, picture, imageMode))), [
    { role:'user', content:[{ type:'image_url', image_url:{ url:'local-fixture' } }] }
  ]);
});

test('侧边聊天：附件读取文本，拒绝无法解析的文件和超限文件', async () => {
  const { scReadAttachment } = loadSideChat();
  const file = await scReadAttachment({ name:'notes.md', type:'text/markdown', size:6,
    text:async () => '正文' });
  assert.equal(file.text, '正文');
  assert.equal(file.kind, 'text');
  await assert.rejects(scReadAttachment({ name:'archive.zip', type:'application/zip', size:5 }), /暂不支持/);
  await assert.rejects(scReadAttachment({ name:'big.png', type:'image/png', size:11 * 1024 * 1024 }), /10 MB/);
});

test('侧边聊天：接口元数据单独缓存，不限制用户可编辑的五档思考等级', () => {
  const env = loadSideChat();
  env.scCfgSave({ baseUrl:'https://one/v1', model:'model-a' });
  env.scSaveModels([{ id:'model-a', label:'Model A', efforts:['low','high','max'], onlyReasoning:true }],
    { baseUrl:'https://one/v1' });
  assert.equal(env.scModelOptions()[0].label, 'Model A');
  assert.deepEqual(Array.from(env.scModelOptions()[0].efforts), ['low','high','max']);
  assert.deepEqual(Array.from(env.scEffortOptions()), ['off','low','medium','high','max']);
  env.scCfgSave({ baseUrl:'https://two/v1' });
  assert.equal(env.scModelOptions().length, 0);
});

test('侧边聊天：保留未指定思考等级，旧档位归入最接近的五档', () => {
  const { scCfgLoad, scCfgSave, scModelConfigFor } = loadSideChat();
  scCfgSave({ model:'old-low', modelConfigs:[
    { id:'old-low', reasoningEffort:'minimal' },
    { id:'old-high', reasoningEffort:'xhigh' },
    { id:'untouched' }
  ] });
  const cfg = scCfgLoad();
  assert.equal(scModelConfigFor(cfg, 'old-low').reasoningEffort, 'low');
  assert.equal(scModelConfigFor(cfg, 'old-high').reasoningEffort, 'max');
  assert.equal(scModelConfigFor(cfg, 'untouched').reasoningEffort, 'default');
  assert.deepEqual(Array.from(scModelConfigFor(cfg, 'untouched').enabledEfforts), ['off','low','medium','high','max']);
});

test('侧边聊天：各模型独立保存启用档位，取消当前档位后恢复未设置', () => {
  const { scCfgLoad, scCfgSave, scModelConfigFor, scSetModelConfig } = loadSideChat();
  const cfg = { model:'one', modelConfigs:[] };
  scSetModelConfig(cfg, 'one', { enabledEfforts:['max','off','invalid','off'], reasoningEffort:'max' });
  scSetModelConfig(cfg, 'two', { enabledEfforts:[], reasoningEffort:'medium' });
  scCfgSave(cfg);
  const saved = scCfgLoad();
  assert.deepEqual(Array.from(scModelConfigFor(saved, 'one').enabledEfforts), ['off','max']);
  assert.equal(scModelConfigFor(saved, 'one').reasoningEffort, 'max');
  assert.deepEqual(Array.from(scModelConfigFor(saved, 'two').enabledEfforts), []);
  assert.equal(scModelConfigFor(saved, 'two').reasoningEffort, 'default');
  scSetModelConfig(saved, 'one', { enabledEfforts:['off'] });
  assert.equal(scModelConfigFor(saved, 'one').reasoningEffort, 'default');
});

test('侧边聊天：菜单的坐标复现 SVG 的工具栏锚点，并限制在视口内', () => {
  const begin = source.indexOf('  function scMenuPosition(');
  const end = source.indexOf('  function scCloseMenu(', begin);
  const ctx = {};
  vm.runInNewContext(source.slice(begin, end) + '\nthis.place = scMenuPosition;', ctx);
  const tools = ctx.place({ left:53, top:957, right:85, bottom:989 }, 158, 71,
    { width:519, height:1031 });
  assert.equal(tools.left, 48);
  assert.equal(tools.top, 883);
  const models = ctx.place({ left:242, top:957, right:422, bottom:989 }, 187, 151,
    { width:519, height:1031 }, 'right');
  assert.equal(models.left, 235);
  assert.equal(models.top, 805);
  const tiny = ctx.place({ left:4, top:10, right:100, bottom:42 }, 187, 151,
    { width:280, height:200 }, 'right');
  assert.ok(tiny.left >= 8 && tiny.left + 187 <= 272);
  assert.ok(tiny.top >= 8 && tiny.top + 151 <= 192);
});

test('侧边聊天：附件菜单和模型卡片使用可逆的展开/收起动画', () => {
  const cssBegin = source.indexOf('    .craber-sc-popmenu{');
  const cssEnd = source.indexOf('    .craber-sc-popitem{', cssBegin);
  const css = source.slice(cssBegin, cssEnd);
  assert.match(css, /opacity:0;visibility:hidden;transform:translateY\(7px\) scale\(\.965\)/,
    '菜单初始状态应隐藏并从锚点方向轻微缩放进入');
  assert.match(css, /\.craber-sc-popmenu\.craber-open\{[\s\S]*?opacity:1;visibility:visible;transform:translateY\(0\) scale\(1\)/,
    '打开状态应恢复可见和原尺寸');
  assert.match(css, /\.craber-sc-popmenu\.craber-closing\{[\s\S]*?opacity:0;visibility:visible;transform:translateY\(5px\) scale\(\.97\)/,
    '关闭状态应先播退出动画，而不是瞬间移除');
  assert.match(source, /\.craber-sc-modelmenu\{[\s\S]*?box-shadow:/,
    '模型卡片保留独立的卡片层级样式');

  const closeBegin = source.indexOf('  function scCloseMenu(');
  const closeEnd = source.indexOf('  function scCloseMenus(', closeBegin);
  const close = source.slice(closeBegin, closeEnd);
  assert.match(close, /menuAnimateClose\(menu\)/, '收起时先切换退出动画');
  assert.match(close, /setTimeout\(remove, MENU_CLOSE_MS\)/, '退出动画结束后再移除节点');

  const showBegin = source.indexOf('  function scShowMenu(');
  const showEnd = source.indexOf('  function scRenderAttachments(', showBegin);
  assert.match(source.slice(showBegin, showEnd), /menuAnimateOpen\(menu\)/,
    '附件菜单和模型卡片挂载后都走统一开场动画');
});

test('侧边聊天：大段内容也要逐字回放，不能整块跳出', () => {
  const fn = source.slice(source.indexOf('  function scTypewriter('),
    source.indexOf('  /* ---------- 发送 ---------- */'));
  assert.ok(fn, '必须存在独立的打字机回放器');
  assert.match(fn, /let buf = ''/, '收到的文本先进入缓冲区');
  assert.match(fn, /ansMsg\.content \+= buf\.slice\(0, step\)/,
    '要按步长逐段写入，而不是一次性赋值');
  assert.match(fn, /setTimeout\(tick/, '回放要按节奏持续进行');
  assert.match(fn, /n > 1200 \? 220 : n > 300 \? 24 : 2/,
    '积压越多单帧吐字越多，避免长回答播得太慢');
  assert.match(fn, /flushNow\(\)[\s\S]*?ansMsg\.content \+= buf/,
    '停止时要先把缓冲刷出来，不能丢正文');
});

test('侧边聊天：打字机分帧输出完整正文，emoji 不拆开，停止可立即刷完', () => {
  const begin = source.indexOf('  function scTypewriter(');
  const end = source.indexOf('  /* ---------- 发送 ---------- */', begin);
  const pending = [];
  const frames = [];
  let message;
  let finished = 0;
  const ctx = {
    setTimeout(fn) { pending.push(fn); return pending.length; },
    clearTimeout() {},
    scPersist() {},
    scSetStreamingUI() {},
    scScrollToBottom() {},
    scRenderMessages() { frames.push(message.content); }
  };
  vm.runInNewContext(source.slice(begin, end) + '\nthis.make = scTypewriter;', ctx);
  message = { content:'', streaming:true, at:Date.now() };
  const text = 'a😀b'.repeat(500);
  const typer = ctx.make(message, () => finished++);
  typer.push(text);
  typer.end();
  while (pending.length) pending.shift()();
  assert.equal(message.content, text);
  assert.equal(finished, 1);
  assert.ok(frames.length > 5);
  assert.ok(frames.every((frame) => frame.isWellFormed()), '每一帧都应保留完整 Unicode 字符');
  message = { content:'', streaming:true, at:Date.now() };
  const stopped = ctx.make(message);
  stopped.push(text);
  pending.shift()();
  stopped.flushNow();
  assert.equal(message.content, text);
  assert.equal(message.streaming, false);
  while (pending.length) pending.shift()();
  assert.equal(message.content, text);
});

test('侧边聊天：模型配置通过对话框应用到设置草稿', () => {
  const page = source.slice(source.indexOf('  function craberPageSideChat() {'),
    source.indexOf('  // 页面 4：WebDAV 连接设置'));
  assert.match(page, /reasoningEffort: 'default'/);
  assert.match(page, /row\.setAttribute\('aria-haspopup', 'dialog'\)/);
  assert.match(page, /input\.type = 'checkbox';\s*input\.value = value;\s*input\.checked = profile\.enabledEfforts\.includes\(value\)/);
  assert.match(page, /effortChecks\.filter\(\(input\) => input\.checked\)\.map\(\(input\) => input\.value\)/);
  assert.match(page, /draft\.enabledEfforts = enabledEfforts/);
  assert.match(page, /onConfirm\(close\) \{[\s\S]*?setProfile\(profile\.id, draft\)/);
  assert.match(page, /onClose\(\) \{\s*profileDialogOpen = false;\s*if \(p\.isConnected\) renderProfiles\(focusId\)/);
  assert.match(page, /scEffortLabel\(value\)/);
});

/* 流式为什么曾经"一股脑出来"——这条必须钉死，别让后续改动把开关摘掉。
 *
 * 依据（本机 Tampermonkey 5.5.1 源码，不是推测）：
 *   background.js: m = e.responseType ? e.responseType.toLowerCase() : "";
 *                  if ("stream"==m) { const rd = a.body.getReader(); ... 分块 }
 *                  else { y.responseText = y.response = await a.text() }  ← 整块
 *   page.js:       "stream"===V && (u = yield ao(...))      // V 就是 responseType
 *                  if (t.onpartial) { ... u.ctrl.enqueue(...) }  // 数据只进 stream
 * 结论：不传 responseType 时 TM 一次性给全文，onprogress 根本不会触发；
 *       传了 stream 之后正文从 r.response.stream 出，responseText 是空的。
 */
test('侧边聊天流式：必须传 responseType=stream，否则 TM 会整块返回', () => {
  const ctx = loadStream();
  driveStream(ctx, () => {});
  assert.equal(ctx.__req.responseType, 'stream',
    'responseType 是流式开关，缺了它 GM_xmlhttpRequest 不会逐块回调');
  // 兜底口子也要在：万一某个管理器不认 stream，得能退回累计文本
  assert.ok(typeof ctx.__req.onprogress === 'function');
  assert.ok(typeof ctx.__req.onreadystatechange === 'function');
});

test('侧边聊天流式：stream 模式下要从 response.stream 读，responseText 是空的', async () => {
  const ctx = loadStream();
  const mk = (o) => 'data: ' + JSON.stringify({ choices: [{ delta: o }] }) + '\n\n';
  const frames = [mk({ reasoning_content: '想' }), mk({ content: '甲' }), mk({ content: '乙' })];
  const enc = new TextEncoder();

  const out = { content: '', think: '', done: false };
  let i = 0;
  const stream = {
    getReader: () => ({
      read: async () => {
        await new Promise((r) => setTimeout(r, 10));
        if (i < frames.length) return { done: false, value: enc.encode(frames[i++]) };
        return { done: true, value: undefined };
      }
    })
  };

  ctx.api.scStream({ baseUrl: 'https://x/v1', model: 'm', apiKey: 'k' },
    [{ role: 'user', content: 'hi' }],
    (d) => { out.content += d; }, () => { out.done = true; }, () => {},
    (t) => { out.think += t; });

  // 模拟 TM：readyState3 阶段 responseText 为空，只有 response.stream 有货
  ctx.__req.onprogress({
    readyState: 3, status: 200, responseText: '', response: { stream }
  });
  ctx.__req.onload({
    readyState: 4, status: 200, responseText: '', response: { stream }
  });

  await waitFor(() => out.done, 800);
  assert.equal(out.think, '想', '思考要走 response.stream 拿到');
  assert.equal(out.content, '甲乙', '正文要走 response.stream 拿到');
});

/* 实测踩到的服务：/chat/completions 1~3 秒就把整段答案发完，
 * Tampermonkey 只触发 onload、不触发 onprogress。此时 stream 模式下
 * responseText 为空，如果不补启动 r.response.stream，就会得到
 * "200 + 零正文"，被误判成模型没返回内容。 */
test('侧边聊天流式：只有 onload 时也要从 response.stream 读出正文', async () => {
  const ctx = loadStreamV2();
  // 本接口的真实帧：先一条 heartbeat 注释，再一条正文，最后 [DONE]
  const frames = [
    ': heartbeat\n',
    'data: {"choices":[{"delta":{"content":"ok","role":"assistant"},'
      + '"finish_reason":null,"index":0}]}\n\n',
    'data: {"choices":[{"delta":{"role":"assistant"}},"finish_reason":"stop"}\n\n',
    'data: [DONE]\n\n'
  ];
  const enc = new TextEncoder();
  let i = 0;
  const stream = {
    getReader: () => ({
      read: async () => {
        if (i < frames.length) return { done: false, value: enc.encode(frames[i++]) };
        return { done: true, value: undefined };
      }
    })
  };

  const out = { content: '', done: false };
  ctx.api.scStream({ baseUrl: 'https://x/v1', model: 'wb/glm-5.3-flash', apiKey: 'k' },
    [{ role: 'user', content: 'hi' }],
    (d) => { out.content += d; },
    () => { out.done = true; }, () => {});

  // 关键：完全不调用 onprogress，只给 onload
  ctx.__req.onload({
    readyState: 4, status: 200, responseText: '', response: { stream }
  });

  await waitFor(() => out.done, 2000);
  assert.equal(out.content, 'ok', '只有 onload 时也必须读 response.stream');
});

test('侧边聊天流式：请求带 Accept: text/event-stream', () => {
  const ctx = loadStreamV2();
  ctx.api.scStream({ baseUrl: 'https://x/v1', model: 'm', apiKey: 'k' },
    [{ role: 'user', content: 'hi' }], () => {}, () => {}, () => {});
  assert.equal(ctx.__req.headers.Accept, 'text/event-stream');
});

/* 打开侧栏后顶栏按钮全部消失 —— 这条也是实测踩到的问题。
 *
 * 根因：占位最初写的是 body { padding-right }，整个应用壳（含顶栏）一起被压窄，
 * 跨过 ChatGPT 顶栏的响应式折叠阈值后，原生把「重新订阅 / 下载 / 分享」
 * 以及我们注入的两个按钮全收进了「⋯」溢出菜单。
 *
 * 修法：顶栏保持全宽，只让正文（main）让位；面板从顶栏下沿开始。
 */
/* 布局方案（用户明确要求）：真正的左右分栏 —— 面板占满全高，
 * 顶栏和正文一起止于面板左缘，即「页面 | 面板」并排。
 *
 * 走过的弯路（都留着防回归）：
 *   1) 只给 main 让位 → 顶栏压不窄，面板盖住它右侧，按钮被盖；
 *   2) 给 body 让位但面板 top:52px → 顶栏压窄了、面板又不占那段高度；
 *   3) 只赌 body padding → 遇到 position:fixed + width:100vw 的壳时
 *      完全传不下去，页面压根没让位（用户报"侧栏完全不占位"）。
 *   4) 现在：多策略试 + 实测哪招生效，固定使用。
 */
test('侧边聊天：占位是多策略的，且以"正文和顶栏都被推开"为准', () => {
  // 策略表按覆盖面从大到小
  assert.match(source, /const SC_STRATEGIES = \['body-pad', 'shell-width', 'shell-margin', 'main-header'\]/);

  // 必须有"量一下是否真的让开"的判定
  assert.match(source, /function scIsClear\(panelLeft\)/);
  const apply = source.slice(source.indexOf('  function scApplyPlaceholder(on, width) {'),
    source.indexOf('  function scPlaceholderTick() {'));
  // 逐个试，第一个生效的就固定
  assert.match(apply, /for \(const name of SC_STRATEGIES\)/);
  assert.match(apply, /if \(scIsClear\(panelLeft\)\)/);
  assert.match(apply, /scHitStrategy = name/);
  assert.match(apply, /scRestoreAllStyles\(\)/, '策略不生效要撤掉痕迹再试下一招');
});

test('侧边聊天：对 fixed + 100vw 的壳用 width 让位（margin 无效）', () => {
  const fn = source.slice(source.indexOf('  function scApplyStrategy(name, w) {'),
    source.indexOf('  function scApplyPlaceholder(on, width) {'));
  // 100vw 的壳加 margin 不缩（实测），必须改 width
  assert.match(fn, /name === 'shell-width'/);
  assert.match(fn, /calc\(100vw - /,
    'fixed + 100vw 的容器要靠 width:calc(100vw - Npx) 才能让位');
  // 找壳时要排除 body/html，否则 width 策略变成空操作
  const find = source.slice(source.indexOf('  function scFindShell() {'),
    source.indexOf('  function scContentEl() {'));
  assert.match(find, /node === document\.body \|\| node === document\.documentElement/,
    'scFindShell 必须跳过 body/html');
});

test('侧边聊天：固定顶栏必须跟 main 一起收右边，不能只缩外层', () => {
  const fn = source.slice(source.indexOf('  function scApplyStrategy(name, w) {'),
    source.indexOf('  function scApplyPlaceholder(on, width) {'));
  const block = fn.slice(fn.indexOf("if (name === 'main-header')"),
    fn.indexOf('    return false;'));
  assert.match(block, /scRememberStyle\(main, 'margin-right'\)/);
  assert.match(block, /main\.style\.setProperty\('margin-right', want, 'important'\)/);
  assert.match(block, /scRememberStyle\(hdr, 'right'\)/,
    '顶栏是 fixed，必须记录并修改 right');
  assert.match(block, /hdr\.style\.setProperty\('right', want, 'important'\)/);
});

test('侧边聊天：tick 维持当前策略并在失效时重选', () => {
  const tick = source.slice(source.indexOf('  function scPlaceholderTick() {'),
    source.indexOf('  function scIcons() {'));
  assert.match(tick, /if \(!scHitStrategy\)/, '没有生效策略要重选');
  assert.match(tick, /scApplyStrategy\(scHitStrategy, w\)/, '要维持当前策略的宽度');
  assert.match(tick, /if \(!scIsClear\(panelLeft\)\)/, '每 tick 校验是否还让开着');
  assert.match(tick, /scApplyPlaceholder\(true, w\)/, '失效就重选');
});

test('侧边聊天：面板占满全高，不盖顶栏', () => {
  const css = source.slice(source.indexOf('.craber-sc{position:fixed'),
    source.indexOf('.craber-sc.craber-open{'));
  assert.match(css, /top:0;right:0;bottom:0/,
    '面板应占满全高，与页面并排成一栏');
  const open = source.slice(source.indexOf('  function scOpenPanel() {'),
    source.indexOf('  function scClose() {'));
  assert.match(open, /scEl\.style\.top = '0px'/);
});

test('侧边聊天：顶栏高度量不到时必须有兜底，不能返回 0', () => {
  const fn = source.slice(source.indexOf('  function scHeaderHeight() {'),
    source.indexOf('  /* 找应用壳'));
  assert.match(fn, /return h > 20 \? h : 52/,
    '量不到顶栏高度时要回落到 52px，绝不能返回 0');
});

test('侧边聊天：fabHost 高度阈值不能太严，且有兜底', () => {
  const fn = source.slice(source.indexOf('  function fabHost() {'),
    source.indexOf('  // 毛玻璃顶栏只该出现在'));
  // 23px 高的按钮组不该被过滤掉（实测踩过）
  assert.ok(!/r\.height > 24/.test(fn), '高度阈值不能是 24，小图标按钮组只有 23px');
  assert.match(fn, /r\.height > 18/);
  // 启发式全落空时要有兜底，否则顶栏改版就静默失效
  assert.match(fn, /兜底/, '应有兜底逻辑并在注释里说明');
});

/* 展开状态记忆：刷新 / 换会话后应回到上次的开合状态。
 * 几个容易做错的点都钉住：主动关闭要清记忆、功能开关关闭也要清、
 * 非会话页不该弹面板但记忆要留着。 */
test('侧边聊天：展开状态存本地，开/关分别写入与清除', () => {
  assert.match(source, /const SC_OPEN_KEY = 'gpt_craber_sidechat_open'/);
  const save = source.slice(source.indexOf('  function scOpenStateSave(on) {'),
    source.indexOf('  function scOpenStateLoad() {'));
  assert.match(save, /setItem\(SC_OPEN_KEY, '1'\)/);
  assert.match(save, /removeItem\(SC_OPEN_KEY\)/);
  // 读的时候要容错：坏数据当"关"
  const load = source.slice(source.indexOf('  function scOpenStateLoad() {'),
    source.indexOf('  /* 面板宽度上限。'));
  assert.match(load, /try\s*\{/);
  assert.match(load, /catch \(e\) \{ return false; \}/);
});

test('侧边聊天：打开记"开"，手动关闭与关掉开关都记"关"', () => {
  const open = source.slice(source.indexOf('  function scOpenPanel() {'),
    source.indexOf('  function scClose() {'));
  assert.match(open, /scOpenStateSave\(true\)/);

  const close = source.slice(source.indexOf('  function scClose() {'),
    source.indexOf('  function scToggle() {'));
  assert.match(close, /scOpenStateSave\(false\)/);

  const unmount = source.slice(source.indexOf('  function scUnmount() {'),
    source.indexOf('  /* 页面加载后恢复上次的展开状态'));
  assert.match(unmount, /scOpenStateSave\(false\)/,
    '关掉功能开关时要清记忆，否则下次打开会莫名弹出来');
});

test('侧边聊天：启动时恢复展开状态，但只在会话页', () => {
  const restore = source.slice(source.indexOf('  function scRestoreOpenState() {'),
    source.indexOf('  /* ---------- 顶栏入口按钮 ----------'));
  assert.match(restore, /if \(!uiPrefs\.sideChat\) return/);
  assert.match(restore, /if \(!scOpenStateLoad\(\)\) return/);
  assert.match(restore, /if \(!isConvPage\(\)\) return/,
    '非会话页没有正文可让位，不该恢复');
  assert.match(restore, /scOpenPanel\(\)/);

  // 启动时要真正调用一次（延迟等页面壳渲染完）
  assert.match(source, /setTimeout\(scRestoreOpenState, 1500\)/);
});

test('侧边聊天：换会话后维持展开状态，切到非会话页则收起但保留记忆', () => {
  const route = source.slice(source.indexOf('if (location.pathname !== lastPath) {'),
    source.indexOf('} else {\n      // 路径没变时也轻量重定位'));
  assert.match(route, /scOpenStateLoad\(\) && uiPrefs\.sideChat/);
  assert.match(route, /if \(!isConvPage\(\)\)/);
  // 非会话页要收起（不调 scClose，因为那会清记忆）
  assert.match(route, /scEl\.classList\.remove\('craber-open'\)/);
  assert.match(route, /scApplyPlaceholder\(false\)/);
});
