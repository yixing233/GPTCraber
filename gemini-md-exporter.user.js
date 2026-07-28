// ==UserScript==
// @name         craber（Gemini 导出）
// @namespace    gemini-craber
// @version      0.1.0
// @description  craber：导出 Google Gemini 对话为 Markdown。基于页面 DOM 抓取当前会话，支持单条回复导出、勾选回合批量导出、导出前预览、图片本地化。
// @author       craber
// @homepageURL  https://github.com/yixing233/GPTCraber
// @supportURL   https://github.com/yixing233/GPTCraber/issues
// @downloadURL  https://raw.githubusercontent.com/yixing233/GPTCraber/main/gemini-md-exporter.user.js
// @updateURL    https://raw.githubusercontent.com/yixing233/GPTCraber/main/gemini-md-exporter.user.js
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
        const token = ' IMG' + imgTasks.length + ' ';
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

    // Gemini 代码块（自定义元素）
    if (tag === 'code-block' || (tag === 'pre' && node.querySelector('code'))) {
      const host = tag === 'code-block' ? node : node;
      const { lang, code } = readCodeBlock(host);
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

  // 找回答正文容器：优先 .model-response-text.markdown
  function findAnswerContainer(mr) {
    if (!mr) return null;
    return mr.querySelector('.model-response-text.markdown') ||
      mr.querySelector('.model-response-text') ||
      mr.querySelector('message-content .markdown') ||
      mr.querySelector('.markdown') ||
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
      turns.push({ el, id, idx, question, answerEl, mr });
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
      md += (turn.question || '(无文字提问)') + '\n\n';
      md += '## 🤖 回答\n\n';
    }

    const answer = turn.answerEl ? await containerToMd(turn.answerEl, sink) : '';
    md += (answer || '(空回复)') + '\n\n';

    return { title, md: cleanContent(md) + '\n' };
  }

  // 整会话 → 单个 markdown
  async function renderConversationToMd(turns, convName, sink, onProgress) {
    let md = '# ' + (convName || '未命名会话') + '\n\n';
    for (let i = 0; i < turns.length; i++) {
      const r = await renderTurn(turns[i], sink);
      md += r.md.trim() + '\n\n---\n\n';
      if (onProgress) onProgress(i + 1, turns.length);
    }
    md = md.replace(/\n+---\n+$/, '\n');
    return { title: convName || '未命名会话', md: cleanContent(md) + '\n', turnCount: turns.length };
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

  async function exportSingleByTurnId(turnId) {
    ensureState(true);
    const turn = state.idIndex[turnId];
    if (!turn) throw new Error('未定位到该回合，试试刷新页面');
    return exportOneTurn(turn);
  }

  // 单个回合导出：含图打 zip（图片存 images/），纯文字直接下 md
  async function exportOneTurn(turn) {
    const hasImg = turn.answerEl && turn.answerEl.querySelector('img');
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
