// ==UserScript==
// @name         craber（Gemini 导出）
// @namespace    gemini-craber
// @version      0.1.2
// @description  craber：导出 Google Gemini 对话为 Markdown。基于页面 DOM 抓取当前会话，支持单条回复导出、勾选回合批量导出、导出前预览、图片本地化。
// @author       craber
// @homepageURL  https://github.com/yixing233/GPTCraber
// @supportURL   https://github.com/yixing233/GPTCraber/issues
// @downloadURL  https://raw.githubusercontent.com/yixing233/GPTCraber/main/gemini-md-exporter.user.js
// @updateURL    https://raw.githubusercontent.com/yixing233/GPTCraber/main/gemini-md-exporter.user.js
// @license      GPL-3.0-only
// @match        https://gemini.google.com/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      google.com
// @connect      googleusercontent.com
// @connect      gstatic.com
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  const SCRIPT_VERSION = '0.1.2';

  // 悬浮球用的螃蟹图标（内联 SVG）。fill 用 currentColor，蟹身颜色由容器的
  // color 决定（.craber-fab-ball 里设为绿色），换平台时也统一走这一处。
  const CRAB_SVG = '<svg viewBox="0 0 71.493 71.493" width="26" height="26" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M69.857,43.299l-10.626-5.432c3.038-3.402,4.707-7.433,4.707-11.651 c0-8.227-6.175-15.503-16.114-18.989c-1.109-0.388-2.342-0.096-3.155,0.751c-0.814,0.846-1.06,2.089-0.628,3.182 c0.338,0.857,0.51,1.734,0.51,2.609c0,0.492-0.052,0.688-0.045,0.69c-0.083,0.105-0.393,0.362-0.643,0.569 c-0.422,0.35-0.947,0.785-1.546,1.386c-0.688,0.692-0.996,1.676-0.826,2.637s0.796,1.78,1.68,2.194 c1.956,0.918,8.324,4.331,8.361,9.76c-2.459-1.79-5.451-3.167-8.78-3.981c0.156-0.366,0.242-0.769,0.242-1.193 c0-1.688-1.369-3.055-3.055-3.055c-1.688,0-3.055,1.367-3.055,3.055c0,0.13,0.023,0.255,0.038,0.381 c-0.39-0.015-0.782-0.023-1.176-0.023c-0.394,0-0.787,0.008-1.176,0.023c0.016-0.126,0.038-0.25,0.038-0.381 c0-1.688-1.369-3.055-3.055-3.055c-1.688,0-3.055,1.367-3.055,3.055c0,0.423,0.086,0.826,0.242,1.193 c-3.785,0.925-7.138,2.576-9.763,4.737c0.216-4.082,4.91-8.435,9.345-10.516c0.884-0.415,1.511-1.233,1.68-2.195 c0.17-0.961-0.139-1.945-0.827-2.637c-0.598-0.601-1.124-1.037-1.546-1.386c-0.255-0.211-0.572-0.474-0.622-0.528 c-0.001-0.001-0.065-0.181-0.065-0.73c0-0.873,0.172-1.751,0.511-2.61c0.432-1.092,0.186-2.335-0.628-3.181 c-0.814-0.848-2.05-1.14-3.154-0.751C13.729,10.71,7.554,17.987,7.554,26.215c0,4.218,1.669,8.249,4.707,11.651L1.635,43.299 C0.16,44.053-0.425,45.86,0.33,47.336c0.53,1.038,1.582,1.635,2.673,1.635c0.46,0,0.927-0.106,1.363-0.329l8.695-4.445 c0.069,0.981,0.255,1.939,0.536,2.869L2.868,52.551c-1.476,0.754-2.061,2.562-1.306,4.037c0.53,1.038,1.582,1.635,2.673,1.635 c0.46,0,0.927-0.106,1.363-0.329l10.888-5.566c0.491,0.589,1.027,1.154,1.607,1.692l-9.282,4.745 c-1.476,0.754-2.061,2.562-1.306,4.037c0.53,1.038,1.582,1.635,2.673,1.635c0.46,0,0.927-0.106,1.363-0.329l11.887-6.077 c0.131-0.067,0.253-0.143,0.369-0.226c3.474,1.623,7.568,2.563,11.949,2.563c4.381,0,8.475-0.94,11.949-2.563 c0.116,0.082,0.238,0.159,0.369,0.226l11.887,6.077c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635 c0.755-1.476,0.17-3.283-1.306-4.037L53.4,54.02c0.58-0.538,1.116-1.103,1.606-1.692l10.888,5.566 c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635c0.755-1.476,0.17-3.283-1.306-4.037l-10.729-5.485 c0.281-0.931,0.466-1.888,0.536-2.87l8.695,4.445c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635 C71.918,45.86,71.333,44.053,69.857,43.299z M50.472,15.06c4.65,2.828,7.466,6.906,7.466,11.155c0,1.07-0.176,2.131-0.516,3.166 c-0.584-4.354-3.438-8.421-8.006-11.487C49.934,17.163,50.316,16.273,50.472,15.06z M21.02,15.06 c0.158,1.229,0.548,2.126,1.076,2.863c-3.65,2.491-6.962,6.022-8.393,10.004c-0.099-0.566-0.149-1.138-0.149-1.711 C13.554,21.966,16.37,17.888,21.02,15.06z M19.027,43.278c0-6.011,7.656-11.089,16.72-11.089c9.063,0,16.719,5.078,16.719,11.089 s-7.656,11.089-16.719,11.089C26.683,54.368,19.027,49.29,19.027,43.278z"/></svg>';

  /* ============================================================
   * 常量与工具
   * ========================================================== */

  const SETTINGS_KEY = 'gemini_craber_settings';
  const DEFAULT_SETTINGS = {
    mode: 'qa'  // 'qa' = 问答对；'ai' = 仅 AI 回复
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return Object.assign({}, DEFAULT_SETTINGS, raw ? JSON.parse(raw) : {});
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }

  let settings = loadSettings();

  // 会话标题：document.title 形如「标题 - Google Gemini」，去掉尾巴。
  function getConvTitle() {
    let t = (document.title || '').replace(/\s*[-–]\s*Google Gemini\s*$/i, '').trim();
    if (t && t.toLowerCase() !== 'gemini') return t;
    // 退回：侧栏当前选中会话标题
    const sel = document.querySelector('[data-test-id="conversation"].selected .conversation-title, .conversation.selected .conversation-title');
    if (sel && sel.textContent.trim()) return sel.textContent.trim();
    return '';
  }

  // Gemini 对话页 URL：/app/{convId}
  function getConvId() {
    const m = location.pathname.match(/\/app\/([0-9a-z]+)/i);
    return m ? m[1] : null;
  }

  function sanitizeFilename(s) {
    s = (s || '').replace(/[\\/:*?"<>|\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length > 60) s = s.slice(0, 60).trim();
    return s || 'untitled';
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Trusted Types 兼容的 innerHTML 赋值。Gemini(Google) 页面启用了 Trusted Types，
  // 直接写 el.innerHTML = str 会被拦截并抛错（This document requires 'TrustedHTML'
  // assignment），导致脚本中断。这里优先建一个自有 policy 生成 TrustedHTML；若连
  // policy 创建都被 CSP 的 trusted-types 白名单拒绝，则退回用 DOMParser 解析后
  // 搬运节点（不经过 innerHTML sink，不受 Trusted Types 限制）。
  let _ttPolicy = null;
  let _ttTried = false;
  function getTTPolicy() {
    if (_ttTried) return _ttPolicy;
    _ttTried = true;
    try {
      if (window.trustedTypes && window.trustedTypes.createPolicy) {
        _ttPolicy = window.trustedTypes.createPolicy('craber', {
          createHTML: (s) => s
        });
      }
    } catch (e) {
      _ttPolicy = null; // 名称未在 trusted-types 白名单里，创建被拒
    }
    return _ttPolicy;
  }
  function setHTML(el, html) {
    // 无 Trusted Types 环境：直接赋值
    if (typeof window.trustedTypes === 'undefined') {
      el.innerHTML = html;
      return;
    }
    const policy = getTTPolicy();
    if (policy) {
      el.innerHTML = policy.createHTML(html);
      return;
    }
    // policy 创建被拒：用 DOMParser 解析后搬运子节点（绕开 innerHTML sink）
    el.textContent = '';
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const nodes = doc.body ? Array.from(doc.body.childNodes) : [];
      for (const n of nodes) el.appendChild(document.importNode(n, true));
    } catch (e) {
      el.textContent = html; // 兜底：至少不崩
    }
  }

  /* ============================================================
   * 图片下载与本地化
   *   sink 机制：把图片 URL 下载并本地化，返回 md 里应引用的路径。
   *     makeDataUriSink：单条/单回合导出时用，返回 data:URI（base64 内嵌进 md）。
   *     makeZipImageSink：打包导出时用，下载存进 zip 的 images/ 目录，返回相对路径。
   *   Gemini 生成图/用户上传图挂在 googleusercontent.com，URL 可能带鉴权会过期，
   *   故值得下载本地化；下载失败时上层回退为原始 URL。
   * ========================================================== */

  function gmFetchBlob(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        responseType: 'blob',
        onload: (res) => {
          if (res.status >= 200 && res.status < 300 && res.response) resolve(res.response);
          else reject(new Error('图片请求失败: ' + res.status));
        },
        onerror: () => reject(new Error('图片网络错误'))
      });
    });
  }

  function blobToDataURI(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error || new Error('读取图片失败'));
      fr.readAsDataURL(blob);
    });
  }

  function extFromMime(mime) {
    const map = {
      'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
      'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp'
    };
    return map[(mime || '').toLowerCase()] || 'png';
  }

  function extFromUrl(url) {
    const m = String(url || '').match(/\.(png|jpe?g|gif|webp|svg|bmp)(?![a-z])/i);
    return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
  }

  function makeDataUriSink() {
    return async function (url) {
      const blob = await gmFetchBlob(url);
      return await blobToDataURI(blob);
    };
  }
  function makeZipImageSink(zip, prefix) {
    let n = 0;
    return async function (url, hint) {
      const blob = await gmFetchBlob(url);
      const buf = new Uint8Array(await blob.arrayBuffer());
      n++;
      const ext = extFromMime(blob.type) || extFromUrl(url);
      const name = (prefix || '') + 'images/' + (hint || 'img') + '_' + n + '.' + ext;
      zip.add(name, buf);
      return name;
    };
  }

  /* ============================================================
   * 内联 ZIP 打包器（仅 STORE 模式，零外部依赖、零 eval）
   * ========================================================== */

  let _crcTable = null;
  function crcTable() {
    if (_crcTable) return _crcTable;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    _crcTable = t;
    return t;
  }
  function crc32(bytes) {
    const t = crcTable();
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function createZip() {
    const files = [];
    const encoder = new TextEncoder();
    return {
      add(path, data) {
        files.push({ nameBytes: encoder.encode(path), data: data, crc: crc32(data) });
      },
      generate() {
        const localParts = [];
        const central = [];
        let offset = 0;

        for (const f of files) {
          const nameLen = f.nameBytes.length;
          const size = f.data.length;

          const lh = new DataView(new ArrayBuffer(30));
          lh.setUint32(0, 0x04034b50, true);
          lh.setUint16(4, 20, true);
          lh.setUint16(6, 0, true);
          lh.setUint16(8, 0, true);
          lh.setUint16(10, 0, true);
          lh.setUint16(12, 0, true);
          lh.setUint32(14, f.crc, true);
          lh.setUint32(18, size, true);
          lh.setUint32(22, size, true);
          lh.setUint16(26, nameLen, true);
          lh.setUint16(28, 0, true);
          localParts.push(new Uint8Array(lh.buffer), f.nameBytes, f.data);

          const ch = new DataView(new ArrayBuffer(46));
          ch.setUint32(0, 0x02014b50, true);
          ch.setUint16(4, 20, true);
          ch.setUint16(6, 20, true);
          ch.setUint16(8, 0, true);
          ch.setUint16(10, 0, true);
          ch.setUint16(12, 0, true);
          ch.setUint16(14, 0, true);
          ch.setUint32(16, f.crc, true);
          ch.setUint32(20, size, true);
          ch.setUint32(24, size, true);
          ch.setUint16(28, nameLen, true);
          ch.setUint16(30, 0, true);
          ch.setUint16(32, 0, true);
          ch.setUint16(34, 0, true);
          ch.setUint16(36, 0, true);
          ch.setUint32(38, 0, true);
          ch.setUint32(42, offset, true);
          central.push(new Uint8Array(ch.buffer), f.nameBytes);

          offset += 30 + nameLen + size;
        }

        let centralSize = 0;
        for (const p of central) centralSize += p.length;
        const centralOffset = offset;

        const eocd = new DataView(new ArrayBuffer(22));
        eocd.setUint32(0, 0x06054b50, true);
        eocd.setUint16(4, 0, true);
        eocd.setUint16(6, 0, true);
        eocd.setUint16(8, files.length, true);
        eocd.setUint16(10, files.length, true);
        eocd.setUint32(12, centralSize, true);
        eocd.setUint32(16, centralOffset, true);
        eocd.setUint16(20, 0, true);

        const parts = localParts.concat(central, [new Uint8Array(eocd.buffer)]);
        return new Blob(parts, { type: 'application/zip' });
      }
    };
  }

  const _enc = new TextEncoder();

  /* ============================================================
   * HTML → Markdown 转换器（Gemini 专属）
   *   其他四个平台走官方接口直接拿 markdown；Gemini 无干净接口，只能从页面
   *   DOM 抓取，故需把渲染后的 HTML 反解回 markdown。
   *   逐节点递归：块级元素（h1-6/p/ul/ol/blockquote/table/code-block/hr）产出
   *   带换行的块，行内元素（strong/em/code/a/br）产出内联片段。
   *   代码块是 Gemini 自定义元素 <code-block>，语言在 .code-block-decoration，
   *   代码在 <pre><code>；这里单独识别。图片交给 sink 本地化。
   * ========================================================== */

  // 行内富文本：把一个元素的子节点转成 markdown 行内文本（strong/em/code/a/br/图片）
  function inlineNodesToMd(node, sink, imgTasks) {
    let out = '';
    for (const child of node.childNodes) {
      out += inlineNodeToMd(child, sink, imgTasks);
    }
    return out;
  }

  function inlineNodeToMd(node, sink, imgTasks) {
    if (node.nodeType === Node.TEXT_NODE) {
      // 折叠 HTML 里的连续空白（含换行）为单空格，避免把布局换行带进 markdown
      return node.textContent.replace(/\s+/g, ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    // 屏幕阅读器隐藏文本（如“你说”标签）跳过
    if (node.classList && node.classList.contains('cdk-visually-hidden')) return '';
    // Gemini 把来源角标和 PDF/DOCX 来源按钮作为正文的兄弟节点插入。
    // 它们不是回答正文；若继续递归，source-title 会泄漏成“PDF”“DOCX”。
    if (SOURCE_UI_TAGS.has(tag)) return '';
    switch (tag) {
      case 'br': return '  \n';
      case 'strong': case 'b': {
        const t = inlineNodesToMd(node, sink, imgTasks).trim();
        return t ? '**' + t + '**' : '';
      }
      case 'em': case 'i': {
        const t = inlineNodesToMd(node, sink, imgTasks).trim();
        return t ? '*' + t + '*' : '';
      }
      case 'del': case 's': case 'strike': {
        const t = inlineNodesToMd(node, sink, imgTasks).trim();
        return t ? '~~' + t + '~~' : '';
      }
      case 'code': {
        // 行内代码（块级代码由 code-block 分支处理，不会走到这里）
        const t = node.textContent;
        return t ? '`' + t + '`' : '';
      }
      case 'a': {
        const t = inlineNodesToMd(node, sink, imgTasks).trim();
        const href = node.getAttribute('href') || '';
        if (!t) return '';
        if (!href || href.startsWith('javascript:')) return t;
        return '[' + t + '](' + href + ')';
      }
      case 'img': {
        const src = node.getAttribute('src') || '';
        if (!src || src.startsWith('data:image/gif')) return '';
        const alt = (node.getAttribute('alt') || '图片').replace(/[\[\]]/g, ' ').trim();
        const token = '\uE000IMG' + imgTasks.length + '\uE000';
        imgTasks.push({ token, url: src, alt, hint: 'img' });
        return token;
      }
      case 'sup': case 'sub': {
        // 引用角标/来源角标：正文里直接丢弃，保持干净
        return '';
      }
      default:
        return inlineNodesToMd(node, sink, imgTasks);
    }
  }

  // 取 code-block 的语言与代码
  function readCodeBlock(node) {
    let lang = '';
    const deco = node.querySelector('.code-block-decoration span');
    if (deco) lang = (deco.textContent || '').trim().toLowerCase();
    // 语言标签有时是“纯文本/plaintext”等，规整一下
    if (/^(plain ?text|text|纯文本|无|none)$/i.test(lang)) lang = '';
    const codeEl = node.querySelector('pre code') || node.querySelector('pre') || node.querySelector('code');
    const code = codeEl ? codeEl.textContent.replace(/\n+$/, '') : '';
    return { lang, code };
  }

  // 块级元素 → markdown（返回带尾部换行的块）
  function blockToMd(node, sink, imgTasks, depth) {
    depth = depth || 0;
    const tag = node.tagName.toLowerCase();

    if (node.classList && node.classList.contains('cdk-visually-hidden')) return '';
    if (SOURCE_UI_TAGS.has(tag)) return '';

    // Gemini 代码块（自定义元素）
    if (tag === 'code-block' || (tag === 'pre' && node.querySelector('code'))) {
      const { lang, code } = readCodeBlock(node);
      // Gemini 常把 AI 输出的整段 markdown 源码用 code-block（语言标为 markdown/md）
      // 包起来展示。这类块本身就是 markdown，直接解包输出，避免整篇答案被围栏
      // 包成一个巨大代码块而无法渲染（标题/列表等结构才能生效）。
      if (/^(markdown|md)$/i.test(lang)) {
        return code.replace(/\n+$/, '') + '\n\n';
      }
      return '```' + lang + '\n' + code + '\n```\n\n';
    }

    const h = tag.match(/^h([1-6])$/);
    if (h) {
      const t = inlineNodesToMd(node, sink, imgTasks).trim();
      return t ? '#'.repeat(+h[1]) + ' ' + t + '\n\n' : '';
    }

    if (tag === 'p' || tag === 'div' || tag === 'span') {
      // div/span 可能是布局容器：若内部含块级子元素，递归处理子块
      if (hasBlockChild(node)) return childrenBlocksToMd(node, sink, imgTasks, depth);
      const t = inlineNodesToMd(node, sink, imgTasks).replace(/[ \t]+\n/g, '\n').trim();
      return t ? t + '\n\n' : '';
    }

    if (tag === 'ul' || tag === 'ol') {
      return listToMd(node, sink, imgTasks, depth, tag === 'ol') + '\n';
    }

    if (tag === 'blockquote') {
      const inner = childrenBlocksToMd(node, sink, imgTasks, depth).trim();
      if (!inner) return '';
      return inner.split('\n').map((l) => '> ' + l).join('\n') + '\n\n';
    }

    if (tag === 'hr') return '---\n\n';

    if (tag === 'table') {
      const md = tableToMd(node, sink, imgTasks);
      return md ? md + '\n' : '';
    }

    if (tag === 'pre') {
      const code = node.textContent.replace(/\n+$/, '');
      return '```\n' + code + '\n```\n\n';
    }

    if (tag === 'img') {
      const frag = inlineNodeToMd(node, sink, imgTasks);
      return frag ? frag + '\n\n' : '';
    }

    // 其它容器：递归其块级子元素
    if (hasBlockChild(node)) return childrenBlocksToMd(node, sink, imgTasks, depth);
    const t = inlineNodesToMd(node, sink, imgTasks).trim();
    return t ? t + '\n\n' : '';
  }

  const BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol',
    'blockquote', 'table', 'hr', 'pre', 'code-block', 'div']);
  const SOURCE_UI_TAGS = new Set(['source-footnote', 'sources-carousel-inline',
    'source-inline-chip', 'sources-list']);

  function hasBlockChild(node) {
    for (const c of node.children) {
      if (BLOCK_TAGS.has(c.tagName.toLowerCase())) return true;
    }
    return false;
  }

  function childrenBlocksToMd(node, sink, imgTasks, depth) {
    let out = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent.replace(/\s+/g, ' ').trim();
        if (t) out += t + '\n\n';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        out += blockToMd(child, sink, imgTasks, depth);
      }
    }
    return out;
  }

  // 列表 → markdown（支持嵌套：li 内的 ul/ol 缩进两格）
  function listToMd(node, sink, imgTasks, depth, ordered) {
    const indent = '  '.repeat(depth);
    let out = '';
    let n = 0;
    for (const li of node.children) {
      if (li.tagName.toLowerCase() !== 'li') continue;
      n++;
      const marker = ordered ? (n + '. ') : '- ';
      // 分离 li 的行内内容与嵌套列表
      let inlinePart = '';
      let nestedPart = '';
      for (const child of li.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE &&
            (child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol')) {
          nestedPart += listToMd(child, sink, imgTasks, depth + 1, child.tagName.toLowerCase() === 'ol');
        } else if (child.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(child.tagName.toLowerCase())) {
          // li 里的段落等块级：拿其文本
          inlinePart += inlineNodesToMd(child, sink, imgTasks);
        } else {
          inlinePart += inlineNodeToMd(child, sink, imgTasks);
        }
      }
      inlinePart = inlinePart.replace(/\s+/g, ' ').trim();
      out += indent + marker + inlinePart + '\n';
      if (nestedPart) out += nestedPart;
    }
    return out;
  }

  // 表格 → markdown
  function tableToMd(node, sink, imgTasks) {
    const rows = [];
    const trs = node.querySelectorAll('tr');
    let colCount = 0;
    trs.forEach((tr) => {
      const cells = [];
      tr.querySelectorAll('th,td').forEach((cell) => {
        cells.push(inlineNodesToMd(cell, sink, imgTasks).replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|'));
      });
      if (cells.length) { rows.push(cells); colCount = Math.max(colCount, cells.length); }
    });
    if (!rows.length) return '';
    const pad = (r) => { while (r.length < colCount) r.push(''); return r; };
    const head = pad(rows[0].slice());
    let md = '| ' + head.join(' | ') + ' |\n';
    md += '| ' + head.map(() => '---').join(' | ') + ' |\n';
    for (let i = 1; i < rows.length; i++) {
      md += '| ' + pad(rows[i].slice()).join(' | ') + ' |\n';
    }
    return md;
  }

  // 把一个回复正文容器（.model-response-text 等）转成 markdown，
  // 并把图片占位符 token 替换成真实 markdown（sink 本地化或原链接）。
  async function containerToMd(container, sink) {
    if (!container) return '';
    const imgTasks = [];
    let md = childrenBlocksToMd(container, sink, imgTasks, 0);
    md = await resolveImgTasks(md, imgTasks, sink);
    return cleanContent(md);
  }

  // 替换图片 token：有 sink 则下载本地化，失败或无 sink 用原 URL
  async function resolveImgTasks(md, imgTasks, sink) {
    for (const task of imgTasks) {
      let path = task.url;
      if (sink) {
        try { path = await sink(task.url, task.hint); } catch (e) { path = task.url; }
      }
      const imgMd = '![' + task.alt + '](' + path + ')';
      md = md.split(task.token).join('\n\n' + imgMd + '\n\n');
    }
    return md;
  }

  function cleanContent(text) {
    if (!text) return '';
    return String(text)
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /* ============================================================
   * DOM 抓取：把当前会话解析成回合数组
   *   结构（已确认）：
   *     infinite-scroller.chat-history
   *       └ div.conversation-container  ← 一个回合
   *           ├ user-query   （问题：.query-content 里多个 p.query-text-line）
   *           └ model-response（回答：.model-response-text.markdown）
   *   一个 turn = { el, id, question, answerEl }。id 取 conversation-container
   *   上可用的稳定标识（无 id 时用序号），用于单条导出定位。
   * ========================================================== */

  // 抓取问题文本：user-query 下 .query-text 里的 p.query-text-line 逐行拼接。
  function scrapeQuestion(uq) {
    if (!uq) return '';
    const qt = uq.querySelector('.query-text') || uq.querySelector('.query-content');
    if (!qt) return (uq.textContent || '').trim();
    const lines = qt.querySelectorAll('p.query-text-line');
    if (lines.length) {
      return Array.from(lines).map((p) => p.textContent.replace(/\s+$/, '')).join('\n').trim();
    }
    // 退回：整块文本（去掉屏幕阅读器标签）
    const clone = qt.cloneNode(true);
    clone.querySelectorAll('.cdk-visually-hidden').forEach((n) => n.remove());
    return (clone.textContent || '').trim();
  }

  const ATTACHMENT_EXT_RE = /\.(pdf|docx?|pptx?|xlsx?|csv|txt|md|json|zip|rar|7z|png|jpe?g|gif|webp|svg|bmp)\b/i;
  const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp)\b/i;

  function normalizeAttachmentName(value) {
    let text = String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    // aria-label 常带“移除附件/预览文件”等操作前缀，文件名本身保留。
    text = text.replace(/^(?:(?:移除|删除|打开|预览|下载)(?:此)?(?:附件|文件)?|(?:附件|文件))\s*[:：-]?\s*/i, '');
    text = text.replace(/^(?:PDF|DOCX?|PPTX?|XLSX?|CSV|TXT|MARKDOWN|IMAGE)\s*[:：-]\s*/i, '');
    return text.slice(0, 240).trim();
  }

  function attachmentNameFromPreview(preview, index) {
    const candidates = [];
    const push = (value) => {
      const text = normalizeAttachmentName(value);
      if (text && !candidates.includes(text)) candidates.push(text);
    };

    preview.querySelectorAll('[class*="file-name"], [class*="filename"], [data-test-id*="file-name"]')
      .forEach((el) => push(el.textContent));
    [preview, ...preview.querySelectorAll('[aria-label], [title]')].forEach((el) => {
      push(el.getAttribute && el.getAttribute('aria-label'));
      push(el.getAttribute && el.getAttribute('title'));
    });
    preview.querySelectorAll('img[alt]').forEach((img) => push(img.getAttribute('alt')));
    push(preview.textContent);

    const withExt = candidates.filter((name) => ATTACHMENT_EXT_RE.test(name));
    const pool = withExt.length ? withExt : candidates;
    if (!pool.length) return '附件 ' + (index + 1);
    // 操作标签通常比纯文件名更长，优先选最短候选。
    return pool.sort((a, b) => a.length - b.length)[0];
  }

  // Gemini 上传附件位于 user-query-file-preview；这里只读取页面已暴露的元数据。
  // 普通文档通常没有可下载 href，因此至少保留文件名/类型；图片同时记录预览 URL。
  function scrapeAttachments(uq) {
    if (!uq) return [];
    const previews = Array.from(uq.querySelectorAll('user-query-file-preview'));
    const seen = new Set();
    const attachments = [];
    previews.forEach((preview, index) => {
      const name = attachmentNameFromPreview(preview, index);
      const image = preview.querySelector('img');
      const imageUrl = image && (image.currentSrc || image.getAttribute('src') || '');
      const link = preview.querySelector('a[href]');
      const href = link ? (link.href || link.getAttribute('href') || '') : '';
      const isImage = IMAGE_EXT_RE.test(name) || (!!imageUrl && !ATTACHMENT_EXT_RE.test(name));
      const key = name.toLowerCase() + '|' + (imageUrl || href);
      if (seen.has(key)) return;
      seen.add(key);
      attachments.push({ name, isImage, imageUrl, href });
    });
    return attachments;
  }

  async function renderAttachments(attachments, sink) {
    if (!attachments || !attachments.length) return '';
    const lines = ['**附件**', ''];
    let imageIndex = 0;
    for (const attachment of attachments) {
      if (attachment.isImage && attachment.imageUrl) {
        imageIndex++;
        let path = attachment.imageUrl;
        if (sink && /^https?:/i.test(path)) {
          try { path = await sink(path, 'upload_' + imageIndex); } catch (e) {}
        }
        if (lines[lines.length - 1] !== '') lines.push('');
        lines.push('![' + attachment.name.replace(/[\[\]]/g, ' ') + '](' + path + ')');
        lines.push('');
      } else if (attachment.href && /^https?:/i.test(attachment.href)) {
        lines.push('- [📎 ' + attachment.name.replace(/[\[\]]/g, ' ') + '](' + attachment.href + ')');
      } else {
        lines.push('- 📎 ' + attachment.name);
      }
    }
    return lines.join('\n').trim();
  }

  // 找回答正文容器：真正含 p/h3/ul 等块级结构的是 div.markdown.markdown-main-panel。
  // 注意 .model-response-text 与 .markdown 分处不同元素（前者在外层
  // structured-content-container 上，后者在内层面板上），不能用组合选择器
  // .model-response-text.markdown（匹配不到）。必须优先锁定 .markdown 面板，
  // 否则会退回到外层 structured-content-container，其直接子节点非块级，
  // 整块被当行内文本 textContent 折叠成一行，换行全丢失。
  function findAnswerContainer(mr) {
    if (!mr) return null;
    return mr.querySelector('.markdown.markdown-main-panel') ||
      mr.querySelector('message-content .markdown') ||
      mr.querySelector('.markdown') ||
      mr.querySelector('.model-response-text') ||
      mr.querySelector('message-content');
  }

  // 抓取当前页面上的所有回合（时间正序，即 DOM 顺序）
  function scrapeTurns() {
    const containers = document.querySelectorAll('div.conversation-container');
    const turns = [];
    containers.forEach((el, idx) => {
      const uq = el.querySelector('user-query');
      const mr = el.querySelector('model-response');
      if (!uq && !mr) return;
      const question = scrapeQuestion(uq);
      const answerEl = findAnswerContainer(mr);
      // id：conversation-container 自身 id，或内部带 id 的节点，退回序号
      let id = el.id || '';
      if (!id) {
        const idNode = el.querySelector('[id^="user-query-content"], [id]');
        id = (idNode && idNode.id) || ('turn-' + idx);
      }
      turns.push({ el, id, idx, question, attachments: scrapeAttachments(uq), answerEl, mr });
    });
    return turns;
  }

  // 回合标题：提问首行；没有则回答首行
  function turnTitle(turn) {
    if (turn.question) return turn.question.split('\n')[0];
    if (turn.answerEl) {
      const t = (turn.answerEl.textContent || '').trim();
      if (t) return t.split('\n')[0].slice(0, 60);
    }
    return '';
  }

  /* ============================================================
   * 渲染：回合 → markdown
   * ========================================================== */

  async function renderTurn(turn, sink) {
    const title = turnTitle(turn);
    let md = '';

    if (settings.mode === 'qa') {
      md += '## 🧑 问题\n\n';
      const attachmentMd = await renderAttachments(turn.attachments, sink);
      if (attachmentMd) md += attachmentMd + '\n\n';
      md += (turn.question || '(无文字提问)') + '\n\n';
      md += '## 🤖 回答\n\n';
    }

    const answer = turn.answerEl ? await containerToMd(turn.answerEl, sink) : '';
    md += (answer || '(空回复)') + '\n\n';

    return { title, md: cleanContent(md) + '\n' };
  }

  /* ============================================================
   * 状态：缓存当前会话回合（按 convId）
   * ========================================================== */

  let state = { convId: null, name: null, turns: [], idIndex: {} };

  function ensureState(force) {
    const convId = getConvId();
    const turns = scrapeTurns();
    if (!turns.length) throw new Error('未找到对话内容，请确认已打开一个具体会话并等待加载完成');
    const idIndex = {};
    turns.forEach((t) => { idIndex[t.id] = t; });
    state = { convId, name: getConvTitle(), turns, idIndex };
    return state;
  }

  /* ============================================================
   * 导出动作
   * ========================================================== */

  // 单个回合导出：含图打 zip（图片存 images/），纯文字直接下 md
  async function exportOneTurn(turn) {
    const hasImg = (turn.answerEl && turn.answerEl.querySelector('img')) ||
      (turn.attachments || []).some((attachment) => attachment.isImage && attachment.imageUrl);
    const seq = (state.turns.indexOf(turn) + 1) || 1;
    const pad = String(state.turns.length || 1).length;
    const prefix = String(seq).padStart(pad, '0') + '_';

    if (!hasImg) {
      const { title, md } = await renderTurn(turn, null);
      triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }),
        prefix + sanitizeFilename(title) + '.md');
      return;
    }
    const zip = createZip();
    const sink = makeZipImageSink(zip);
    const { title, md } = await renderTurn(turn, sink);
    const base = prefix + sanitizeFilename(title);
    zip.add(base + '.md', _enc.encode(md));
    triggerDownload(zip.generate(), base + '.zip');
  }

  async function exportBatch(selectedTurns, onProgress) {
    // 只选一轮：走单回合逻辑（含图 zip、纯文字 md）
    if (selectedTurns.length === 1) {
      if (onProgress) onProgress(1, 1, '导出中…');
      await exportOneTurn(selectedTurns[0]);
      if (onProgress) onProgress(1, 1, '完成');
      return;
    }
    const zip = createZip();
    const sink = makeZipImageSink(zip);
    const used = {};
    const pad = String(state.turns.length || selectedTurns.length).length;
    let i = 0;
    for (const turn of selectedTurns) {
      const { title, md } = await renderTurn(turn, sink);
      const seq = (state.turns.indexOf(turn) + 1) || (i + 1);
      const prefix = String(seq).padStart(pad, '0') + '_';
      let name = prefix + sanitizeFilename(title);
      if (used[name] != null) { used[name]++; name = name + ' (' + used[name] + ')'; }
      else used[name] = 0;
      zip.add(name + '.md', _enc.encode(md));
      i++;
      if (onProgress) onProgress(i, selectedTurns.length);
    }
    if (onProgress) onProgress(selectedTurns.length, selectedTurns.length, '打包中…');
    const zipName = sanitizeFilename(state.name) || 'gemini-export';
    triggerDownload(zip.generate(), zipName + '.zip');
  }

  /* ============================================================
   * UI：样式（Shadow DOM 隔离，避免被 Gemini(Angular) 的 diff 清掉）
   * ========================================================== */

  const style = document.createElement('style');
  style.textContent = `
    :host{
      --craber-accent:#4b5bd6; --craber-accent-2:#3d4bc0;
      --craber-bg:#ffffff; --craber-fg:#1f2328; --craber-sub:#8a9099;
      --craber-line:#ececf0; --craber-hover:#f5f6f8; --craber-ghost:#f1f2f4;
      --craber-skeleton:#eceef1; --craber-skeleton-hi:#f6f7f9;
      all:initial;
    }
    @media (prefers-color-scheme:dark){
      :host{
        --craber-bg:#26282c; --craber-fg:#e8eaed; --craber-sub:#9aa0a8;
        --craber-line:#3a3d43; --craber-hover:#2f3237; --craber-ghost:#34373d;
        --craber-skeleton:#33363b; --craber-skeleton-hi:#3c4046;
      }
    }
    @keyframes craber-fade-in{from{opacity:0}to{opacity:1}}
    @keyframes craber-pop-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes craber-shimmer{0%{background-position:-360px 0}100%{background-position:360px 0}}
    @keyframes craber-row-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes craber-spin{to{transform:rotate(360deg)}}

    /* 悬浮球：可拖拽、双击展开菜单。位置由 JS 用 left/top 定位并存 localStorage。 */
    .craber-fab-ball{position:fixed;z-index:99998;width:52px;height:52px;border-radius:50%;
      background:rgba(255,255,255,.3);color:#22a06b;border:none;cursor:grab;
      display:flex;align-items:center;justify-content:center;
      -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
      box-shadow:0 4px 14px rgba(0,0,0,.22);user-select:none;touch-action:none;
      font-family:system-ui,sans-serif;transition:box-shadow .15s ease,transform .12s ease}
    :host(.craber-dark) .craber-fab-ball{background:rgba(38,40,44,.3)}
    .craber-fab-ball svg{width:30px;height:30px;pointer-events:none}
    .craber-fab-ball:hover{box-shadow:0 6px 20px rgba(0,0,0,.3)}
    .craber-fab-ball:active{cursor:grabbing}
    .craber-fab-ball.craber-dragging{transition:none;transform:scale(1.08)}
    .craber-fab-menu{position:fixed;z-index:99998;display:flex;flex-direction:column;gap:8px;
      pointer-events:none}
    .craber-fab-menu.craber-open{pointer-events:auto}
    .craber-fab-item{background:var(--craber-bg);color:var(--craber-fg);border:none;border-radius:22px;
      padding:11px 18px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;
      box-shadow:0 4px 14px rgba(0,0,0,.18);font-family:system-ui,sans-serif;
      opacity:0;
      transition:background .15s ease,opacity .24s ease,transform .24s cubic-bezier(.2,.8,.25,1)}
    .craber-fab-menu.craber-up .craber-fab-item{transform:translateY(12px) scale(.9)}
    .craber-fab-menu.craber-down .craber-fab-item{transform:translateY(-12px) scale(.9)}
    .craber-fab-menu.craber-open .craber-fab-item{opacity:1;transform:none}
    .craber-fab-collapse{color:var(--craber-sub);box-shadow:0 2px 8px rgba(0,0,0,.12)}

    .craber-mask{position:fixed;inset:0;background:rgba(15,18,20,.55);
      z-index:99999;display:flex;align-items:center;justify-content:center;
      font-family:system-ui,sans-serif;animation:craber-fade-in .18s ease}
    .craber-panel{background:var(--craber-bg);color:var(--craber-fg);width:580px;max-width:92vw;max-height:84vh;
      border-radius:16px;display:flex;flex-direction:column;overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,.3);animation:craber-pop-in .22s cubic-bezier(.2,.8,.25,1)}

    .craber-hd{padding:16px 20px;border-bottom:1px solid var(--craber-line);
      display:flex;align-items:center;justify-content:space-between}
    .craber-hd h3{margin:0;font-size:15px;font-weight:600;letter-spacing:.2px}
    .craber-x{border:none;background:none;font-size:22px;cursor:pointer;color:var(--craber-sub);
      line-height:1;width:30px;height:30px;border-radius:8px;transition:background .15s,color .15s}
    .craber-x:hover{background:var(--craber-hover);color:var(--craber-fg)}

    .craber-opts{padding:14px 20px;border-bottom:1px solid var(--craber-line);
      display:flex;flex-direction:column;gap:12px;font-size:13px}
    .craber-group{display:flex;align-items:flex-start;gap:12px}
    .craber-group-label{flex:none;width:56px;padding-top:9px;font-size:12px;
      color:var(--craber-sub);font-weight:500;line-height:1}
    .craber-chips{display:flex;flex-wrap:wrap;gap:8px;flex:1}

    .craber-chip{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;
      padding:7px 12px;border:1px solid var(--craber-line);border-radius:20px;
      color:var(--craber-fg);transition:border-color .15s,background .15s}
    .craber-chip:hover{background:var(--craber-hover)}
    .craber-chip input{position:absolute;opacity:0;width:0;height:0}
    .craber-box{width:16px;height:16px;border:1.5px solid var(--craber-sub);border-radius:5px;
      flex:none;box-sizing:border-box;position:relative;
      transition:background .15s,border-color .15s}
    .craber-chip input[type=radio]+.craber-box{border-radius:50%}
    .craber-box::after{content:'';position:absolute;opacity:0;transition:opacity .12s}
    .craber-chip input[type=checkbox]:checked+.craber-box::after,
    .craber-item input[type=checkbox]:checked+.craber-box::after{
      opacity:1;left:0;right:0;top:-1px;bottom:0;margin:auto;width:4px;height:8px;
      border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
    .craber-chip input[type=radio]:checked+.craber-box::after{
      opacity:1;inset:0;margin:auto;width:6px;height:6px;border-radius:50%;background:#fff}
    .craber-chip input:checked+.craber-box,
    .craber-item input:checked+.craber-box{background:var(--craber-accent);border-color:var(--craber-accent)}
    .craber-chip:has(input:checked){border-color:var(--craber-accent);
      background:color-mix(in srgb,var(--craber-accent) 12%,transparent);color:var(--craber-accent)}
    .craber-chip input:focus-visible+.craber-box{outline:2px solid var(--craber-accent);outline-offset:2px}

    .craber-list{overflow-y:auto;padding:6px 12px;flex:1;min-height:120px}
    .craber-list,.craber-preview-body{
      scrollbar-width:thin;scrollbar-color:var(--craber-line) transparent}
    .craber-list::-webkit-scrollbar,.craber-preview-body::-webkit-scrollbar{width:8px;height:8px}
    .craber-list::-webkit-scrollbar-track,.craber-preview-body::-webkit-scrollbar-track{background:transparent}
    .craber-list::-webkit-scrollbar-thumb,.craber-preview-body::-webkit-scrollbar-thumb{
      background:var(--craber-line);border-radius:8px;border:2px solid transparent;
      background-clip:content-box}
    .craber-list:hover::-webkit-scrollbar-thumb,.craber-preview-body:hover::-webkit-scrollbar-thumb{
      background:var(--craber-sub);background-clip:content-box}
    .craber-item{display:flex;align-items:flex-start;gap:11px;padding:11px 10px;border-radius:10px;
      font-size:13px;cursor:pointer;transition:background .12s;animation:craber-row-in .28s ease both;
      position:relative}
    .craber-item:hover{background:var(--craber-hover)}
    .craber-item .craber-box{margin-top:1px}
    .craber-item input{position:absolute;opacity:0;width:0;height:0}
    .craber-item .q{flex:1;line-height:1.5;color:var(--craber-fg);word-break:break-word}
    .craber-item .meta{color:var(--craber-sub);font-size:11px;margin-top:3px}

    .craber-sk{padding:11px 10px;display:flex;gap:11px;align-items:flex-start}
    .craber-sk .b{border-radius:6px;
      background:linear-gradient(90deg,var(--craber-skeleton) 25%,var(--craber-skeleton-hi) 37%,var(--craber-skeleton) 63%);
      background-size:720px 100%;animation:craber-shimmer 1.3s linear infinite}
    .craber-sk .box{width:16px;height:16px;border-radius:5px;flex:none;margin-top:1px}
    .craber-sk .lines{flex:1}
    .craber-sk .l1{height:12px;width:82%;margin-bottom:8px}
    .craber-sk .l2{height:9px;width:38%}

    .craber-empty{padding:36px 18px;text-align:center;color:var(--craber-sub);font-size:13px}

    .craber-ft{padding:13px 20px;border-top:1px solid var(--craber-line);
      display:flex;align-items:center;gap:10px}
    .craber-ft .spacer{flex:1}
    .craber-btn{border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:500;
      cursor:pointer;transition:background .15s,transform .1s,opacity .15s}
    .craber-btn:active{transform:scale(.97)}
    .craber-btn.primary{background:var(--craber-accent);color:#fff;box-shadow:0 2px 8px rgba(75,91,214,.3)}
    .craber-btn.primary:hover{background:var(--craber-accent-2)}
    .craber-btn.primary:disabled{opacity:.6;cursor:default;box-shadow:none}
    .craber-btn.ghost{background:var(--craber-ghost);color:var(--craber-fg)}
    .craber-btn.ghost:hover{background:var(--craber-hover)}
    .craber-status{font-size:12px;color:var(--craber-sub);display:inline-flex;align-items:center;gap:6px}
    .craber-spin{width:12px;height:12px;border:2px solid var(--craber-sub);border-top-color:transparent;
      border-radius:50%;animation:craber-spin .7s linear infinite;display:inline-block}

    .craber-preview-btn{position:absolute;top:8px;right:8px;flex:none;
      border:1px solid var(--craber-line);background:var(--craber-bg);color:var(--craber-sub);
      border-radius:8px;padding:3px 10px;font-size:11px;cursor:pointer;
      opacity:0;transform:translateX(4px);pointer-events:none;
      transition:opacity .15s,transform .15s,background .15s,color .15s,border-color .15s}
    .craber-item:hover .craber-preview-btn{opacity:1;transform:none;pointer-events:auto}
    .craber-preview-btn:hover{background:var(--craber-accent);color:#fff;border-color:var(--craber-accent)}

    .craber-preview-mask{position:fixed;inset:0;background:rgba(15,18,20,.55);
      z-index:100000;display:flex;align-items:center;justify-content:center;
      font-family:system-ui,sans-serif;animation:craber-fade-in .15s ease}
    .craber-preview-panel{background:var(--craber-bg);color:var(--craber-fg);
      width:720px;max-width:92vw;max-height:86vh;border-radius:16px;
      display:flex;flex-direction:column;overflow:hidden;
      box-shadow:0 20px 60px rgba(0,0,0,.3);animation:craber-pop-in .2s cubic-bezier(.2,.8,.25,1)}
    .craber-preview-body{overflow-y:auto;padding:20px 24px;flex:1;line-height:1.7;font-size:14px}
    .craber-preview-body img{max-width:100%;height:auto;border-radius:8px;margin:8px 0}
    .craber-preview-body pre{background:var(--craber-ghost);padding:12px 14px;border-radius:8px;
      overflow-x:auto;font-size:12.5px}
    .craber-preview-body code{background:var(--craber-ghost);padding:1px 5px;border-radius:4px;font-size:12.5px}
    .craber-preview-body pre code{background:none;padding:0}
    .craber-preview-body h1,.craber-preview-body h2,.craber-preview-body h3{margin:.8em 0 .4em}
    .craber-preview-body blockquote{border-left:3px solid var(--craber-line);
      margin:.6em 0;padding:.2em 0 .2em 12px;color:var(--craber-sub)}
    .craber-preview-body table{border-collapse:collapse;margin:.6em 0;font-size:13px}
    .craber-preview-body th,.craber-preview-body td{border:1px solid var(--craber-line);padding:5px 10px}
    .craber-preview-body a{color:var(--craber-accent);text-decoration:none}
    .craber-preview-body a:hover{text-decoration:underline}
  `;

  // Shadow DOM 隔离：Gemini 是 Angular SPA，重渲染时会清掉它 diff 不到的节点。
  // 建一个 host 挂到 html 下，UI 全部放进 shadow root，对 Angular 不可见，永不被清。
  let _craberShadow = null;
  function craberRoot() {
    if (_craberShadow && _craberShadow.host && _craberShadow.host.isConnected) {
      return _craberShadow;
    }
    const host = document.createElement('div');
    host.id = 'craber-host';
    host.style.cssText = 'all:initial';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.appendChild(style);
    document.documentElement.appendChild(host);
    _craberShadow = shadow;
    return shadow;
  }

  /* ============================================================
   * UI：导出当前会话面板
   * ========================================================== */

  function openPanel() {
    const mask = document.createElement('div');
    mask.className = 'craber-mask';
    setHTML(mask, `
      <div class="craber-panel" role="dialog" aria-label="导出当前会话">
        <div class="craber-hd">
          <h3>导出当前会话</h3>
          <button class="craber-x" title="关闭" aria-label="关闭">×</button>
        </div>
        <div class="craber-opts">
          <div class="craber-group">
            <span class="craber-group-label">导出模式</span>
            <div class="craber-chips">
              <label class="craber-chip"><input type="radio" name="craber-mode" value="qa"><span class="craber-box"></span>问答对</label>
              <label class="craber-chip"><input type="radio" name="craber-mode" value="ai"><span class="craber-box"></span>仅 AI 回复</label>
            </div>
          </div>
        </div>
        <div class="craber-list"></div>
        <div class="craber-ft">
          <button class="craber-btn ghost" data-act="all">全选</button>
          <button class="craber-btn ghost" data-act="none">反选</button>
          <span class="craber-status" data-role="status"></span>
          <span class="spacer"></span>
          <button class="craber-btn primary" data-act="export">导出选中</button>
        </div>
      </div>`);
    craberRoot().appendChild(mask);

    const close = () => mask.remove();
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
    mask.querySelector('.craber-x').addEventListener('click', close);

    mask.querySelectorAll('input[name="craber-mode"]').forEach((r) => {
      r.checked = r.value === settings.mode;
      r.addEventListener('change', () => { settings.mode = r.value; saveSettings(settings); });
    });

    const listEl = mask.querySelector('.craber-list');
    const statusEl = mask.querySelector('[data-role="status"]');

    listEl.textContent = '';
    for (let s = 0; s < 6; s++) {
      const sk = document.createElement('div');
      sk.className = 'craber-sk';
      setHTML(sk,
        '<div class="b box"></div>' +
        '<div class="lines"><div class="b l1"></div><div class="b l2"></div></div>');
      listEl.appendChild(sk);
    }

    let st;
    try {
      st = ensureState(true);
    } catch (err) {
      setHTML(listEl, '<div class="craber-empty">' + escapeHtml(err.message) + '</div>');
      return;
    }
    if (!st.turns.length) {
      setHTML(listEl, '<div class="craber-empty">没有可导出的回合</div>');
      return;
    }
    listEl.textContent = '';
    st.turns.forEach((turn, idx) => {
      const q = turnTitle(turn) || '(无文字提问)';
      const attachmentNote = turn.attachments && turn.attachments.length
        ? ' · 附件 ' + turn.attachments.length
        : '';
      const hasImg = turn.answerEl && turn.answerEl.querySelector('img') ? ' · 含图片' : '';
      const row = document.createElement('label');
      row.className = 'craber-item';
      row.style.animationDelay = Math.min(idx * 30, 400) + 'ms';
      setHTML(row,
        '<input type="checkbox" data-idx="' + idx + '" checked>' +
        '<span class="craber-box"></span>' +
        '<span class="q">' + escapeHtml(q.slice(0, 120)) +
        '<div class="meta">回合 ' + (idx + 1) + attachmentNote + hasImg + '</div></span>' +
        '<button class="craber-preview-btn" type="button" title="预览此回合内容">预览</button>');
      row.querySelector('.craber-preview-btn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPreview(turn, idx);
      });
      listEl.appendChild(row);
    });

    mask.querySelector('[data-act="all"]').addEventListener('click', () => {
      listEl.querySelectorAll('input[type=checkbox]').forEach((c) => (c.checked = true));
    });
    mask.querySelector('[data-act="none"]').addEventListener('click', () => {
      listEl.querySelectorAll('input[type=checkbox]').forEach((c) => (c.checked = !c.checked));
    });

    mask.querySelector('[data-act="export"]').addEventListener('click', async () => {
      const checked = [...listEl.querySelectorAll('input[type=checkbox]:checked')].map((c) => +c.dataset.idx);
      if (!checked.length) { statusEl.textContent = '未选择任何回合'; return; }
      const selected = checked.map((i) => state.turns[i]);
      statusEl.textContent = '导出中 0/' + selected.length + ' …';
      try {
        await exportBatch(selected, (done, total, note) => {
          statusEl.textContent = note || ('导出中 ' + done + '/' + total + ' …');
        });
        statusEl.textContent = '完成 ✓';
      } catch (err) {
        statusEl.textContent = '失败：' + err.message;
        console.error('[gemini-craber]', err);
      }
    });
  }

  /* ============================================================
   * UI：预览（回合）
   * ========================================================== */

  function inlineMd(text) {
    if (text.length > 2000) return text;
    try {
      const codes = [];
      let t = text.replace(/`([^`]+)`/g, (m, c) => {
        codes.push('<code>' + c + '</code>');
        return 'CBMDCODE' + (codes.length - 1) + 'ENDCODE';
      });
      t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) =>
        '<img src="' + src + '" alt="' + alt + '" loading="lazy">');
      t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) =>
        '<a href="' + url + '" target="_blank" rel="noopener">' + txt + '</a>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
      t = t.replace(/CBMDCODE(\d+)ENDCODE/g, (m, i) => codes[+i]);
      return t;
    } catch (e) {
      return text;
    }
  }

  function miniMarkdownToHtml(md) {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let para = [];
    let list = null;

    const flushPara = () => {
      if (para.length) {
        out.push('<p>' + para.map((l) => inlineMd(escapeHtml(l))).join('<br>') + '</p>');
        para = [];
      }
    };
    const flushList = () => {
      if (list) {
        out.push('<' + list.type + '>' +
          list.items.map((it) => '<li>' + inlineMd(escapeHtml(it)) + '</li>').join('') +
          '</' + list.type + '>');
        list = null;
      }
    };
    const flushAll = () => { flushPara(); flushList(); };

    while (i < lines.length) {
      const line = lines[i];

      const fence = line.match(/^(\s*)(\`{3,})(.*)$/);
      if (fence) {
        flushAll();
        const marker = fence[2];
        const code = [];
        i++;
        while (i < lines.length && !new RegExp('^\\s*\`{' + marker.length + ',}\\s*$').test(lines[i])) {
          code.push(lines[i]);
          i++;
        }
        i++;
        out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
        continue;
      }

      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
        flushAll();
        out.push('<hr>');
        i++;
        continue;
      }

      const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (h) {
        flushAll();
        const lvl = Math.min(h[1].length + 1, 6);
        out.push('<h' + lvl + '>' + inlineMd(escapeHtml(h[2])) + '</h' + lvl + '>');
        i++;
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        flushAll();
        const quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        out.push('<blockquote>' + inlineMd(escapeHtml(quote.join('\n'))).replace(/\n/g, '<br>') + '</blockquote>');
        continue;
      }

      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length &&
          /^\s*\|?[\s:-]*\|[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        flushAll();
        const parseRow = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = parseRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        let tbl = '<table><thead><tr>' +
          head.map((c) => '<th>' + inlineMd(escapeHtml(c)) + '</th>').join('') + '</tr></thead><tbody>';
        for (const r of rows) {
          tbl += '<tr>' + r.map((c) => '<td>' + inlineMd(escapeHtml(c)) + '</td>').join('') + '</tr>';
        }
        tbl += '</tbody></table>';
        out.push(tbl);
        continue;
      }

      const ul = line.match(/^\s*[-*+]\s+(.+)$/);
      if (ul) {
        flushPara();
        if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
        list.items.push(ul[1]);
        i++;
        continue;
      }
      const ol = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ol) {
        flushPara();
        if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
        list.items.push(ol[1]);
        i++;
        continue;
      }

      if (/^\s*$/.test(line)) {
        flushAll();
        i++;
        continue;
      }

      flushList();
      para.push(line);
      i++;
    }

    flushAll();
    return out.join('\n');
  }

  async function openPreview(turn, idx) {
    const pm = document.createElement('div');
    pm.className = 'craber-mask craber-preview-mask';
    setHTML(pm, `
      <div class="craber-panel craber-preview-panel" role="dialog" aria-label="预览">
        <div class="craber-hd">
          <h3>预览 · 回合 ${idx + 1}</h3>
          <button class="craber-x" title="关闭" aria-label="关闭">×</button>
        </div>
        <div class="craber-preview-body">
          <div class="craber-empty"><span class="craber-spin"></span> 渲染中…</div>
        </div>
      </div>`);
    craberRoot().appendChild(pm);

    const closeP = () => pm.remove();
    pm.addEventListener('click', (e) => { if (e.target === pm) closeP(); });
    pm.querySelector('.craber-x').addEventListener('click', closeP);

    const body = pm.querySelector('.craber-preview-body');
    try {
      const { md } = await renderTurn(turn, null);
      setHTML(body, miniMarkdownToHtml(md));
    } catch (err) {
      setHTML(body, '<div class="craber-empty">预览失败：' + escapeHtml(err.message) + '</div>');
      console.error('[gemini-craber]', err);
    }
  }

  /* ============================================================
   * UI：悬浮球（可拖拽 + 双击展开菜单）
   * ========================================================== */

  const FAB_POS_KEY = 'gemini_craber_fab_pos';

  function mountFab() {
    const root = craberRoot();
    if (root.querySelector('.craber-fab-ball')) return;

    const ball = document.createElement('button');
    ball.className = 'craber-fab-ball';
    setHTML(ball, CRAB_SVG);
    ball.title = '拖拽移动 · 双击展开菜单';

    const menu = document.createElement('div');
    menu.className = 'craber-fab-menu';

    const btnCur = document.createElement('button');
    btnCur.className = 'craber-fab-item';
    btnCur.textContent = '导出当前';
    btnCur.title = '导出当前会话的回合';

    const btnCollapse = document.createElement('button');
    btnCollapse.className = 'craber-fab-item craber-fab-collapse';
    btnCollapse.textContent = '收起';
    btnCollapse.title = '收起菜单，只留悬浮球';

    menu.appendChild(btnCur);
    menu.appendChild(btnCollapse);

    const BALL = 52, MARGIN = 20;
    function clamp(x, y) {
      const maxX = window.innerWidth - BALL - 4;
      const maxY = window.innerHeight - BALL - 4;
      return { x: Math.max(4, Math.min(x, maxX)), y: Math.max(4, Math.min(y, maxY)) };
    }
    function loadPos() {
      try {
        const raw = localStorage.getItem(FAB_POS_KEY);
        if (raw) { const p = JSON.parse(raw); if (typeof p.x === 'number' && typeof p.y === 'number') return p; }
      } catch (e) {}
      return { x: window.innerWidth - BALL - MARGIN, y: window.innerHeight - BALL - MARGIN };
    }
    let pos = clamp(loadPos().x, loadPos().y);
    function applyPos() {
      ball.style.left = pos.x + 'px';
      ball.style.top = pos.y + 'px';
      positionMenu();
    }
    function positionMenu() {
      const onRight = pos.x + BALL / 2 > window.innerWidth / 2;
      const onBottom = pos.y + BALL / 2 > window.innerHeight / 2;
      menu.style.left = onRight ? '' : (pos.x + 'px');
      menu.style.right = onRight ? (window.innerWidth - pos.x - BALL) + 'px' : '';
      if (onBottom) {
        menu.style.top = '';
        menu.style.bottom = (window.innerHeight - pos.y + 8) + 'px';
      } else {
        menu.style.bottom = '';
        menu.style.top = (pos.y + BALL + 8) + 'px';
      }
      menu.style.alignItems = onRight ? 'flex-end' : 'flex-start';
      menu.classList.toggle('craber-up', onBottom);
      menu.classList.toggle('craber-down', !onBottom);
    }

    const STEP = 60;
    function setMenuOpen(open) {
      const items = [btnCur, btnCollapse];
      const onBottom = pos.y + BALL / 2 > window.innerHeight / 2;
      const n = items.length;
      items.forEach((it, i) => {
        const nearIndex = onBottom ? (n - 1 - i) : i;
        const order = open ? nearIndex : (n - 1 - nearIndex);
        it.style.transitionDelay = (order * STEP) + 'ms';
      });
      if (open) { positionMenu(); menu.classList.add('craber-open'); }
      else { menu.classList.remove('craber-open'); }
    }

    let dragging = false, moved = false, startX = 0, startY = 0, baseX = 0, baseY = 0;
    ball.addEventListener('pointerdown', (e) => {
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY; baseX = pos.x; baseY = pos.y;
      ball.setPointerCapture(e.pointerId);
      ball.classList.add('craber-dragging');
      setMenuOpen(false);
    });
    ball.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      pos = clamp(baseX + dx, baseY + dy);
      applyPos();
    });
    ball.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      ball.classList.remove('craber-dragging');
      try { ball.releasePointerCapture(e.pointerId); } catch (err) {}
      if (moved) {
        try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(pos)); } catch (err) {}
      }
    });

    ball.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (moved) return;
      setMenuOpen(true);
    });

    btnCur.addEventListener('click', openPanel);
    btnCollapse.addEventListener('click', () => { setMenuOpen(false); });

    window.addEventListener('resize', () => { pos = clamp(pos.x, pos.y); applyPos(); });

    applyPos();
    root.appendChild(ball);
    root.appendChild(menu);
  }

  /* ============================================================
   * 单条导出：在每条回复的操作栏注入蟹按钮
   *   操作栏容器 message-actions（内含点赞/点踩/复制）。回溯到所属
   *   conversation-container，用其在 scrapeTurns 里的 id 定位回合。
   * ========================================================== */

  const CRAB_SVG_SM = CRAB_SVG.replace('width="26" height="26"', 'width="18" height="18"');

  // 深色气泡 tooltip：挂在 body 上（逃出操作栏 overflow 裁切）
  let _tipEl = null;
  function getTipEl() {
    if (!_tipEl) {
      _tipEl = document.createElement('div');
      _tipEl.className = 'craber-tip';
      document.body.appendChild(_tipEl);
    }
    return _tipEl;
  }
  function bindTooltip(el, text) {
    el.addEventListener('mouseenter', () => {
      const tip = getTipEl();
      tip.textContent = text;
      tip.style.display = 'block';
      const r = el.getBoundingClientRect();
      const tw = tip.offsetWidth;
      let left = r.left + r.width / 2 - tw / 2;
      left = Math.max(6, Math.min(left, window.innerWidth - tw - 6));
      tip.style.left = left + 'px';
      tip.style.top = (r.bottom + 6) + 'px';
      requestAnimationFrame(() => tip.classList.add('show'));
    });
    const hide = () => {
      if (!_tipEl) return;
      _tipEl.classList.remove('show');
      _tipEl.style.display = 'none';
    };
    el.addEventListener('mouseleave', hide);
    el.addEventListener('click', hide);
  }

  // 从操作栏回溯到所属 conversation-container，再取其回合 id
  function turnIdFromActions(bar) {
    const cc = bar.closest('div.conversation-container');
    if (!cc) return null;
    let id = cc.id || '';
    if (!id) {
      const idNode = cc.querySelector('[id^="user-query-content"], [id]');
      id = (idNode && idNode.id) || '';
    }
    return id || null;
  }

  function injectSingleButtons() {
    const bars = document.querySelectorAll('message-actions .buttons-container-v2');
    bars.forEach((bar) => {
      if (bar.querySelector(':scope > .craber-inline-btn')) return;
      const cc = bar.closest('div.conversation-container');
      if (!cc) return;

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'craber-inline-btn';
      setHTML(b, CRAB_SVG_SM);
      bindTooltip(b, 'crab导出');

      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (b.dataset.busy === '1') return;
        b.dataset.busy = '1';
        b.classList.add('craber-inline-busy');
        try {
          // 先刷新 state（DOM 可能已增删回合），再用容器 id 定位
          ensureState(true);
          const id = turnIdFromActions(bar);
          const turn = (id && state.idIndex[id]) ||
            state.turns.find((t) => t.el === cc);
          if (!turn) throw new Error('未定位到该回合，试试刷新页面');
          await exportOneTurn(turn);
          b.classList.add('craber-inline-ok');
        } catch (err) {
          b.classList.add('craber-inline-err');
          console.error('[gemini-craber]', err);
          alert('导出失败：' + err.message);
        } finally {
          setTimeout(() => {
            b.dataset.busy = '';
            b.classList.remove('craber-inline-busy', 'craber-inline-ok', 'craber-inline-err');
          }, 1200);
        }
      });

      bar.appendChild(b);
    });
  }

  // Gemini 是 Angular 应用，滚动/流式会挂载新节点。debounce 的 MutationObserver
  // 跟进新出现的操作栏，变更停止后再扫一次。
  let _scanScheduled = false;
  function scheduleInject() {
    if (_scanScheduled) return;
    _scanScheduled = true;
    setTimeout(() => {
      _scanScheduled = false;
      try { mountFab(); injectSingleButtons(); } catch (e) { /* 忽略偶发 DOM 竞态 */ }
    }, 250);
  }
  const _injectObserver = new MutationObserver(scheduleInject);
  _injectObserver.observe(document.body, { childList: true, subtree: true });

  // SPA 切换对话时失效缓存
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      state = { convId: null, name: null, turns: [], idIndex: {} };
    }
  }, 1000);

  // 平台页面全局滚动条美化 + 单条按钮/tooltip 样式（Shadow DOM 内影响不到主页面）
  function mountPageScrollbarStyle() {
    if (document.getElementById('craber-page-scrollbar')) return;
    const s = document.createElement('style');
    s.id = 'craber-page-scrollbar';
    s.textContent =
      'html{scrollbar-width:thin;scrollbar-color:rgba(140,145,155,.5) transparent}' +
      '::-webkit-scrollbar{width:10px;height:10px}' +
      '::-webkit-scrollbar-track{background:transparent}' +
      '::-webkit-scrollbar-thumb{background:rgba(140,145,155,.4);border-radius:8px;' +
      'border:2px solid transparent;background-clip:content-box}' +
      '::-webkit-scrollbar-thumb:hover{background:rgba(140,145,155,.65);background-clip:content-box}' +
      '::-webkit-scrollbar-corner{background:transparent}' +
      '.craber-inline-btn{display:inline-flex;align-items:center;justify-content:center;' +
      'width:32px;height:32px;padding:0;margin:0 2px;border:none;border-radius:50%;cursor:pointer;' +
      'background:transparent;color:#22a06b;flex-shrink:0;vertical-align:middle;' +
      'transition:background .15s ease,transform .1s ease}' +
      '.craber-inline-btn svg{width:18px;height:18px;pointer-events:none}' +
      '.craber-inline-btn:hover{background:rgba(34,160,107,.12)}' +
      '.craber-inline-btn:active{transform:scale(.92)}' +
      '.craber-inline-btn.craber-inline-busy{opacity:.5;cursor:default}' +
      '.craber-inline-btn.craber-inline-ok{color:#22a06b;background:rgba(34,160,107,.18)}' +
      '.craber-inline-btn.craber-inline-err{color:#e5484d;background:rgba(229,72,77,.15)}' +
      '.craber-tip{position:fixed;z-index:2147483647;pointer-events:none;' +
      'background:#2f2f2f;color:#fff;font-size:12px;line-height:1;font-weight:400;' +
      'padding:6px 9px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);' +
      'white-space:nowrap;font-family:system-ui,sans-serif;' +
      'opacity:0;transform:translateY(3px);transition:opacity .12s ease,transform .12s ease}' +
      '.craber-tip.show{opacity:1;transform:translateY(0)}';
    document.head.appendChild(s);
  }

  W.__geminiCraber = {
    version: SCRIPT_VERSION,
    attachments(index) {
      const turns = scrapeTurns();
      const turn = turns[index == null ? 0 : Number(index)];
      if (!turn) throw new Error('未找到指定回合');
      return turn.attachments;
    },
    async renderCurrent(index) {
      const turns = scrapeTurns();
      const turn = turns[index == null ? 0 : Number(index)];
      if (!turn) throw new Error('未找到指定回合');
      return (await renderTurn(turn, null)).md;
    }
  };

  mountPageScrollbarStyle();
  mountFab();
  injectSingleButtons();
  console.log('[gemini-craber] Gemini 对话导出脚本已加载 v' + SCRIPT_VERSION);
})();
