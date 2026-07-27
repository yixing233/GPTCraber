// ==UserScript==
// @name         craber（通义千问导出）
// @namespace    tongyi-craber
// @version      0.1.0
// @description  craber：导出通义千问对话为 Markdown。支持单条导出、批量 zip 导出、多会话导出，适配正文/代码/深度思考等。
// @author       craber
// @homepageURL  https://github.com/yixing233/GPTCraber
// @supportURL   https://github.com/yixing233/GPTCraber/issues
// @downloadURL  https://raw.githubusercontent.com/yixing233/GPTCraber/main/tongyi-md-exporter.user.js
// @updateURL    https://raw.githubusercontent.com/yixing233/GPTCraber/main/tongyi-md-exporter.user.js
// @match        https://www.qianwen.com/*
// @match        https://www.tongyi.com/*
// @match        https://tongyi.aliyun.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      qianwen.com
// @connect      quark.cn
// @connect      aliyuncs.com
// @connect      alicdn.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // 页面 window（unsafeWindow）：油猴脚本运行在隔离沙箱，需拿到页面真实 window
  // 才能挂钩页面自己发的 fetch/XHR（用于抓取公共参数 ut），并挂载诊断函数。
  const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

  /* ============================================================
   * 常量与工具
   * ========================================================== */

  const SETTINGS_KEY = 'tongyi_craber_settings';
  const DEFAULT_SETTINGS = {
    mode: 'qa',            // 'qa' = 问答对；'ai' = 仅 AI 回复
    includeThinking: false // 是否导出深度思考过程（think_content）
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

  // 通义千问对话页 URL：/chat/{sessionId}
  function getConvId() {
    const m = location.pathname.match(/\/chat\/([0-9a-z]{16,})/i);
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

  function uuid() {
    // 简易 UUID v4（用于 sequence_id）
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /* ============================================================
   * 接口封装（通义千问 chat2-api，GET/POST + cookie 鉴权）
   *   鉴权：cookie 里的 XSRF-TOKEN 放进请求头 x-xsrf-token，配合 credentials:'include'
   *         带上登录 cookie；读历史不需要 clt-acs-sign 签名（签名仅用于发消息）。
   *   公共参数：ut(utdid)/fr/pr 等一串 query 参数是接口硬性要求（缺 ut 直接 400），
   *         但 ut 不在 cookie/localStorage 里以可识别形式存放。做法是启动时挂钩页面
   *         自身发出的请求，把它带的整套公共参数抓下来复用（见 sniffCommonParams）。
   *   会话列表：POST /api/v2/session/page/list（游标 next_token 翻页，能翻完全部）
   *   单会话消息：GET /api/v1/session/msg/list（data.list[] 每项为一轮问答）
   * ========================================================== */

  const API_BASE = 'https://chat2-api.qianwen.com';

  // 从 cookie 读 XSRF-TOKEN（放进 x-xsrf-token 头）
  function getXsrfToken() {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // 页面公共 query 参数（ut/fr/pr/chat_client/device/...）。
  // 由 sniffCommonParams() 在启动时从页面自身请求里抓取并缓存。
  let _commonParams = null;

  // 挂钩页面 fetch/XHR，抓一次通义 chat2-api 请求携带的公共 query 参数（尤其 ut）。
  // 页面加载即会发若干带 ut 的请求，抓到一次即可长期复用。
  function sniffCommonParams() {
    const KEYS = ['biz_id', 'chat_client', 'device', 'fr', 'pr', 'ut', 'la', 'tz', 'wv', 've'];
    const grab = (rawUrl) => {
      if (_commonParams) return;
      try {
        const u = new URL(rawUrl, location.origin);
        if (u.searchParams.get('ut')) {
          const params = {};
          KEYS.forEach((k) => { const v = u.searchParams.get(k); if (v != null) params[k] = v; });
          _commonParams = params;
        }
      } catch (e) { /* 忽略解析失败的 url */ }
    };

    const _fetch = W.fetch;
    if (_fetch && !_fetch.__craberHooked) {
      const hooked = function (...args) {
        const input = args[0];
        const url = (typeof input === 'string') ? input : (input && input.url);
        if (url) grab(url);
        return _fetch.apply(this, args);
      };
      hooked.__craberHooked = true;
      W.fetch = hooked;
    }
    const _open = W.XMLHttpRequest && W.XMLHttpRequest.prototype.open;
    if (_open && !_open.__craberHooked) {
      const hookedOpen = function (...args) {
        const url = args[1];
        if (url) grab(url);
        return _open.apply(this, args);
      };
      hookedOpen.__craberHooked = true;
      W.XMLHttpRequest.prototype.open = hookedOpen;
    }
  }

  // 取公共参数：优先用抓到的；抓不到时给一份可用的兜底（ut 缺失时接口会 400，
  // 此时提示用户在页面里点开一个对话触发一次请求即可抓到）。
  function commonParams() {
    if (_commonParams) return Object.assign({}, _commonParams);
    return {
      biz_id: 'ai_qwen', chat_client: 'h5', device: 'pc', fr: 'pc', pr: 'qwen',
      la: 'zh-CN', tz: 'Asia/Shanghai'
    };
  }

  // 组装带公共参数 + nonce/timestamp 的完整 URL
  function buildUrl(path, extra) {
    const q = new URLSearchParams(commonParams());
    q.set('nonce', Math.random().toString(36).slice(2, 13));
    q.set('timestamp', String(Date.now()));
    if (extra) Object.keys(extra).forEach((k) => { q.set(k, String(extra[k])); });
    return API_BASE + path + '?' + q.toString();
  }

  // 统一请求：带 x-xsrf-token 头 + cookie。返回 j.data（校验 code===0）。
  async function tyRequest(path, opts) {
    opts = opts || {};
    const xsrf = getXsrfToken();
    const headers = { 'x-xsrf-token': xsrf || '' };
    const fetchInit = { method: opts.method || 'GET', credentials: 'include', headers };
    if (opts.body != null) {
      headers['content-type'] = 'application/json';
      fetchInit.body = JSON.stringify(opts.body);
    }
    const url = buildUrl(path, opts.query);
    const r = await fetch(url, fetchInit);
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      if (r.status === 400 && /"ut"|缺少|param/i.test(t)) {
        throw new Error('缺少公共参数（ut）。请先在页面里点开一个对话，让页面发一次请求，再重试导出。');
      }
      throw new Error('接口请求失败 ' + path + ': ' + r.status);
    }
    const j = await r.json();
    if (j.code !== 0) throw new Error('接口返回错误 code=' + j.code + ' ' + (j.msg || ''));
    return j.data || {};
  }

  const API = {
    // 拉一页会话列表。POST，游标 next_token 翻页；返回 { list, next_token, have_next_page }。
    async getConversationsPage(cursor) {
      const d = await tyRequest('/api/v2/session/page/list', {
        method: 'POST',
        body: {
          limit: 50,
          next_token: cursor || '',
          sort_field: 'modifiedTime',
          need_filter_tag: true
        }
      });
      return {
        sessions: d.list || [],
        hasMore: !!d.have_next_page,
        nextCursor: d.next_token || null
      };
    },

    // 拉单会话的一页消息。GET，data.list[] 每项为一轮（含 request/response messages）。
    // page 从 1 起，page_size 固定；返回 { list, hasMore }。
    async getMessagesPage(sessionId, page, pageSize) {
      const d = await tyRequest('/api/v1/session/msg/list', {
        method: 'GET',
        query: {
          session_id: sessionId,
          page_size: pageSize || 20,
          page: page || 1,
          forward: false,
          include_pos: false,
          return_response_messages: true,
          event_filter: 'all'
        }
      });
      return { list: d.list || [], hasMore: !!d.have_next_page };
    },

    // 取单会话的元信息（主要用标题）。POST，body { session_id }，返回 data.title 等。
    async getSessionInfo(sessionId) {
      const d = await tyRequest('/api/v1/session/get', {
        method: 'POST',
        body: { session_id: sessionId }
      });
      return d || {};
    }
  };

  // 用 GM_xmlhttpRequest 拉图（绕过 CORS），返回 Blob
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

  // 从图片 URL 猜扩展名（豆包图片 URL 形如 ...59065abec.png~tplv-...image.png?...）
  function extFromUrl(url) {
    const m = String(url || '').match(/\.(png|jpe?g|gif|webp|svg|bmp)(?![a-z])/i);
    return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'png';
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
   * 消息拉取（分页）
   *   通义 session/msg/list 返回 data.list[]，每一项本身就是一轮问答：
   *     { req_id, request_messages:[{content,mime_type,meta_data}],
   *       response_messages:[ ...按 mime_type 分块... ] }
   *   因此无需像豆包/DeepSeek 那样按 role 分组——一项即一个 turn。
   *   按 page/page_size 翻页，have_next_page 指示是否还有更多。
   * ========================================================== */

  // 拉取单会话全部回合（翻完所有页），返回时间正序的 turn 数组。
  async function fetchAllTurns(convId, onProgress) {
    const pages = [];
    let page = 1;
    let guard = 0;
    while (guard++ < 200) {
      const { list, hasMore } = await API.getMessagesPage(convId, page, 20);
      pages.push(list || []);
      const total = pages.reduce((n, p) => n + p.length, 0);
      if (onProgress) onProgress(total);
      if (!hasMore || !list || !list.length) break;
      page++;
    }
    // page 1 为最新一页、页内按时间正序；为得到整会话时间正序，
    // 把后取到的（更旧的）页排到前面，页内顺序保持不变。
    const turns = [];
    for (let i = pages.length - 1; i >= 0; i--) {
      for (const t of pages[i]) turns.push(t);
    }
    return turns;
  }

  /* ============================================================
   * 渲染
   * ========================================================== */

  // 清洗正文：去掉联网引用标记，压掉多余空行，并删除任何未被解析的
  // [(xxx)] 占位符（正常图片/思考占位符会先在 resolvePlaceholders 里被替换成
  // 真实内容，这里的删除只作用于没有对应富媒体块的残留占位符，作最后兜底）。
  function cleanContent(text) {
    if (!text) return '';
    return String(text)
      .replace(/\[\([a-z0-9_]+\)\]/gi, '')
      .replace(/\[!?reference:\d+\]/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // 把一个 image 富媒体项渲染成 markdown（可能含多张图）。
  // 通义图片项结构：{ type:'image_inline'|'image_waterfall', content:{ list:[{img_url,img_thumbnail,title,web_url}] } }
  function renderImageItem(item) {
    const list = (item && item.content && item.content.list) || [];
    const parts = [];
    for (const im of list) {
      const url = im && (im.img_url || im.img_thumbnail);
      if (!url) continue;
      const alt = (im && im.title) ? String(im.title).replace(/[\[\]]/g, ' ').trim() : '图片';
      parts.push('![' + alt + '](' + url + ')');
    }
    return parts.join('\n');
  }

  // 渲染 AI 生成图块（type==='ai_generate_image_list'）。这类图不由正文占位符引用，
  // 是独立整块，需单独渲染。图片在 content.resource_infos[]（refer_id -> url），
  // layout_list[].image[] 指明每组里“真正的生成图”的 refer_id（区别于水印图/缩略图）。
  // 有 sink 时下载并本地化（这类图 URL 带 auth_key 会过期，值得下载）；无 sink 时保留链接。
  async function renderAiGenImages(item, sink) {
    const content = (item && item.content) || {};
    const infos = content.resource_infos || [];
    const layouts = content.layout_list || [];
    const byRefer = {};
    for (const info of infos) {
      if (info && info.refer_id) byRefer[info.refer_id] = info;
    }
    // 优先按 layout_list 取“真正的生成图”；没有 layout 时退回全部 resource_infos
    let chosen = [];
    if (layouts.length) {
      for (const lo of layouts) {
        for (const rid of (lo.image || [])) {
          if (byRefer[rid]) chosen.push(byRefer[rid]);
        }
      }
    }
    if (!chosen.length) chosen = infos;

    const parts = [];
    let idx = 0;
    for (const info of chosen) {
      const url = info && info.url;
      if (!url) continue;
      idx++;
      let path = url;
      if (sink) {
        try { path = await sink(url, 'gen_' + idx); } catch (e) { path = url; }
      }
      parts.push('![生成图片](' + path + ')');
    }
    return parts.join('\n\n');
  }

  // 渲染一个 response block 里的独立 AI 生成图块（若有）。
  async function renderGenImagesInBlock(block, sink) {
    const ml = (block && block.meta_data && block.meta_data.multi_load) || [];
    const out = [];
    for (const item of ml) {
      if (item && item.type === 'ai_generate_image_list') {
        const m = await renderAiGenImages(item, sink);
        if (m) out.push(m);
      }
    }
    return out.join('\n\n');
  }

  // 解析正文里的富媒体占位符 [(source_seq)]：用本块 meta_data.multi_load[] 里
  // source_seq 匹配的项替换。图片项 → 图片 markdown；思考项 → 删占位符（思考链单独收集）。
  // 未匹配到的占位符（如指向别处的）保持删除，避免污染正文。
  function resolvePlaceholders(text, block) {
    if (!text) return text || '';
    const ml = (block && block.meta_data && block.meta_data.multi_load) || [];
    const bySeq = {};
    for (const item of ml) {
      if (item && item.source_seq) bySeq[item.source_seq] = item;
    }
    return String(text).replace(/\[\(([a-z0-9_]+)\)\]/gi, function (whole, seq) {
      const item = bySeq[seq];
      if (!item) return '';
      if (item.type === 'image_inline' || item.type === 'image_waterfall') {
        const imgMd = renderImageItem(item);
        return imgMd ? '\n\n' + imgMd + '\n\n' : '';
      }
      return ''; // multimodal_chat_think 等：占位符删除，内容由 collectThinking 处理
    });
  }

  // 取一个回合的提问文本：request_messages[] 里首个有文本的 content，
  // 退回 meta_data.ori_query。图片/文件提问时 content 可能为空。
  function questionText(turn) {
    const reqs = (turn && turn.request_messages) || [];
    for (const m of reqs) {
      const t = cleanContent(m && m.content);
      if (t) return t;
      const ori = m && m.meta_data && m.meta_data.ori_query;
      if (ori) return cleanContent(ori);
    }
    return '';
  }

  // 渲染回合里“你上传的图”：request_messages[] 中 mime_type==='image/url' 的消息，
  // 图片在 meta_data.resource_infos[]（url 字段，域名 workspace-zb-cdn.qianwen.com）。
  // 有 sink 时下载本地化（URL 带 auth_key 会过期），无 sink 时保留链接。
  async function renderUploadImages(turn, sink) {
    const reqs = (turn && turn.request_messages) || [];
    const parts = [];
    let idx = 0;
    for (const m of reqs) {
      if (!m || m.mime_type !== 'image/url') continue;
      const infos = (m.meta_data && m.meta_data.resource_infos) || [];
      for (const info of infos) {
        const url = info && info.url;
        if (!url) continue;
        idx++;
        const alt = (info && info.file_name)
          ? decodeURIComponent(String(info.file_name)).replace(/[\[\]]/g, ' ').trim() : '上传图片';
        let path = url;
        if (sink) {
          try { path = await sink(url, 'upload_' + idx); } catch (e) { path = url; }
        }
        parts.push('![' + alt + '](' + path + ')');
      }
    }
    return parts.join('\n\n');
  }

  // 取一个 response block 的可见正文：只有带 content 字符串的块才是正文
  // （signal/post、bar/progress、bar/iframe 等只有 meta_data，无正文）。
  // 先把正文里指向本块富媒体的 [(xxx)] 占位符替换成真实图片，再清洗。
  function answerBlockText(block) {
    const resolved = resolvePlaceholders(block && block.content, block);
    return cleanContent(resolved);
  }

  // 收集一个回合的思考链：response_messages[] 里某些块的
  // meta_data.multi_load[] 内 type==='multimodal_chat_think' 的 think_content。
  function collectThinking(turn) {
    const out = [];
    for (const b of ((turn && turn.response_messages) || [])) {
      const ml = b && b.meta_data && b.meta_data.multi_load;
      if (Array.isArray(ml)) {
        for (const item of ml) {
          if (item && item.type === 'multimodal_chat_think' &&
              item.content && item.content.think_content) {
            const th = cleanContent(item.content.think_content);
            if (th) out.push(th);
          }
        }
      }
    }
    return out;
  }

  // 取一个回合的标题：提问首行；没有则退回首个答复正文首行。
  function turnTitle(turn) {
    const q = questionText(turn);
    if (q) return q.split('\n')[0];
    for (const b of ((turn && turn.response_messages) || [])) {
      const t = answerBlockText(b);
      if (t) return t.split('\n')[0];
    }
    return '';
  }

  // 图片 sink：把图片 URL 下载并本地化，返回 md 里应引用的路径。
  //   makeDataUriSink：单文件导出时用，返回 data:URI（base64 内嵌进 md）。
  //   makeZipImageSink：打包导出时用，下载存进 zip 的 images/ 目录，返回相对路径。
  // 只对 AI 生成图（workspace-zb-cdn.qianwen.com 等自家图床）走本地化；
  // 联网搜索图仍保留原链接（不经过 sink）。下载失败时上层回退为原始 URL。
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

  // 渲染一个回合为 markdown，返回 { title, md }。
  // sink 非空时对 AI 生成图做本地化（下载存 zip / 内嵌 base64）；为空时保留链接。
  async function renderTurn(turn, onProgress, sink) {
    const title = turnTitle(turn);
    let md = '';

    if (settings.mode === 'qa') {
      md += '## 🧑 问题\n\n';
      const upImgs = await renderUploadImages(turn, sink);
      if (upImgs) md += upImgs + '\n\n';
      md += (questionText(turn) || (upImgs ? '' : '(无文字提问)')) + '\n\n';
      md += '## 🤖 回答\n\n';
    }

    if (settings.includeThinking) {
      for (const th of collectThinking(turn)) {
        md += '> 💭 思考过程\n>\n> ' + th.replace(/\n/g, '\n> ') + '\n\n';
      }
    }

    for (const b of ((turn && turn.response_messages) || [])) {
      const t = answerBlockText(b);
      if (t) md += t + '\n\n';
      // AI 生成图是独立整块（不由正文占位符引用），单独追加
      const gen = await renderGenImagesInBlock(b, sink);
      if (gen) md += gen + '\n\n';
    }

    return { title, md: md.trim() + '\n' };
  }

  // 把整个会话渲染成单个 markdown
  async function renderConversationToMd(convId, convName, sink, onProgress) {
    const turns = await fetchAllTurns(convId);
    let md = '# ' + (convName || '未命名会话') + '\n\n';
    for (let i = 0; i < turns.length; i++) {
      const r = await renderTurn(turns[i], null, sink);
      md += r.md.trim() + '\n\n---\n\n';
      if (onProgress) onProgress(i + 1, turns.length);
    }
    md = md.replace(/\n+---\n+$/, '\n');
    return { title: convName || '未命名会话', md: md.trim() + '\n', turnCount: turns.length };
  }

  /* ============================================================
   * 状态：按 convId 缓存会话结构
   * ========================================================== */

  let state = { convId: null, name: null, turns: [], msgIndex: {} };

  async function ensureState(force) {
    const convId = getConvId();
    if (!convId) throw new Error('请先打开一个具体对话（URL 含 /chat/...）');
    if (!force && state.convId === convId && state.turns.length) return state;

    const turns = await fetchAllTurns(convId);
    const msgIndex = {};
    turns.forEach((t) => { if (t && t.req_id) msgIndex[t.req_id] = t; });
    let name = null;
    try { name = await API.getSessionTitle(convId); } catch (e) { /* 标题取不到不影响导出 */ }
    state = { convId, name, turns, msgIndex };
    return state;
  }

  /* ============================================================
   * 导出动作
   * ========================================================== */

  async function exportSingleByMessageId(messageId) {
    const st = await ensureState();
    const turn = st.msgIndex[messageId];
    if (!turn) throw new Error('未在会话结构中找到该消息，试试刷新页面');
    const { title, md } = await renderTurn(turn);
    triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }), sanitizeFilename(title) + '.md');
  }

  async function exportBatch(selectedTurns, onProgress) {
    // 只选一轮：直接导出单个 md（图片 base64 内嵌），不打包 zip
    if (selectedTurns.length === 1) {
      const turn = selectedTurns[0];
      const sink = makeDataUriSink();
      const { title, md } = await renderTurn(turn, onProgress, sink);
      const seq = (state.turns ? state.turns.indexOf(turn) + 1 : 0) || 1;
      const pad = String((state.turns && state.turns.length) || 1).length;
      const name = String(seq).padStart(pad, '0') + '_' + sanitizeFilename(title);
      if (onProgress) onProgress(1, 1, '完成');
      triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }), name + '.md');
      return;
    }
    const zip = createZip();
    const sink = makeZipImageSink(zip);
    const used = {};
    const pad = String((state.turns && state.turns.length) || selectedTurns.length).length;
    let i = 0;
    for (const turn of selectedTurns) {
      const { title, md } = await renderTurn(turn, null, sink);
      const seq = ((state.turns ? state.turns.indexOf(turn) : -1) + 1) || (i + 1);
      const prefix = String(seq).padStart(pad, '0') + '_';
      let name = prefix + sanitizeFilename(title);
      if (used[name] != null) { used[name]++; name = name + ' (' + used[name] + ')'; }
      else used[name] = 0;
      zip.add(name + '.md', _enc.encode(md));
      i++;
      if (onProgress) onProgress(i, selectedTurns.length);
    }
    if (onProgress) onProgress(selectedTurns.length, selectedTurns.length, '打包中…');
    const blob = zip.generate();
    const zipName = sanitizeFilename(state.name) || 'tongyi-export';
    triggerDownload(blob, zipName + '.zip');
  }

  /* ============================================================
   * 多会话：列表获取与批量导出
   * ========================================================== */

  // 从通义 session 提取会话元数据。通义时间是毫秒级 Unix 时间戳。
  function cellToMeta(s) {
    return {
      id: s.session_id,
      title: s.title || '未命名会话',
      createTime: Number(s.created_at) || 0,
      updateTime: Number(s.updated_at) || 0,
      badge: 0
    };
  }

  async function fetchAllConversations(onProgress) {
    const all = [];
    const seen = {};
    let cursor = null;
    let guard = 0;
    while (guard++ < 200) {
      const page = await API.getConversationsPage(cursor);
      const sessions = page.sessions || [];
      let added = 0;
      for (const s of sessions) {
        if (!s.session_id || seen[s.session_id]) continue; // 去重：游标偶尔返回重复
        seen[s.session_id] = 1;
        all.push(cellToMeta(s));
        added++;
      }
      if (onProgress) onProgress(all.length);
      // 没有新增（游标未推进/服务端忽略游标）或没有更多，停止，防死循环
      if (!page.hasMore || !sessions.length || added === 0) break;
      if (!page.nextCursor || page.nextCursor === cursor) break;
      cursor = page.nextCursor;
    }
    return all;
  }

  // 导出多个会话：每个会话合并为单个 md，放进以会话标题命名的子文件夹（内含 images/）
  async function exportConversations(convMetas, onProgress) {
    const zip = createZip();
    const used = {};
    const pad = String(convMetas.length).length;
    let i = 0;
    for (const meta of convMetas) {
      i++;
      const seq = String(i).padStart(pad, '0');
      let folder = seq + '_' + sanitizeFilename(meta.title);
      if (used[folder] != null) { used[folder]++; folder = folder + ' (' + used[folder] + ')'; }
      else used[folder] = 0;
      const prefix = folder + '/';
      const sink = makeZipImageSink(zip, prefix);
      try {
        const { md } = await renderConversationToMd(meta.id, meta.title, sink, (d, t) => {
          if (onProgress) onProgress(i, convMetas.length, '（' + meta.title + '：' + d + '/' + t + '）');
        });
        zip.add(prefix + sanitizeFilename(meta.title) + '.md', _enc.encode(md));
      } catch (e) {
        console.warn('[tongyi-craber] 会话导出失败', meta.id, e);
      }
      if (onProgress) onProgress(i, convMetas.length);
    }
    if (onProgress) onProgress(convMetas.length, convMetas.length, '打包中…');
    const blob = zip.generate();
    triggerDownload(blob, 'tongyi-conversations.zip');
  }

  /* ============================================================
   * UI：样式
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

    .craber-fab-wrap{position:fixed;right:20px;bottom:20px;z-index:99998;
      display:flex;flex-direction:column;gap:8px;align-items:flex-end}
    .craber-fab{background:var(--craber-accent);color:#fff;border:none;border-radius:22px;padding:11px 18px;
      font-size:13px;font-weight:500;cursor:pointer;box-shadow:0 4px 14px rgba(75,91,214,.35);
      font-family:system-ui,sans-serif;transition:box-shadow .15s ease,background .15s ease}
    .craber-fab:hover{background:var(--craber-accent-2);box-shadow:0 6px 18px rgba(75,91,214,.45)}
    .craber-fab-ghost{background:var(--craber-bg);color:var(--craber-fg);
      box-shadow:0 4px 14px rgba(0,0,0,.18)}
    .craber-fab-ghost:hover{background:var(--craber-hover)}

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
    .craber-search{width:100%;box-sizing:border-box;padding:9px 12px;font-size:13px;
      border:1px solid var(--craber-line);border-radius:10px;background:var(--craber-bg);
      color:var(--craber-fg);outline:none;transition:border-color .15s}
    .craber-search:focus{border-color:var(--craber-accent)}
    .craber-search::placeholder{color:var(--craber-sub)}

    .craber-filter-row{display:flex;flex-direction:column;gap:8px}
    .craber-date-custom{display:flex;align-items:center;gap:8px;margin-top:2px}
    .craber-date-custom[hidden]{display:none}
    .craber-date-input{padding:7px 10px;font-size:12px;border:1px solid var(--craber-line);
      border-radius:8px;background:var(--craber-bg);color:var(--craber-fg);outline:none;
      color-scheme:light dark;font-family:inherit;cursor:pointer;transition:border-color .15s,box-shadow .15s}
    .craber-date-input:hover{border-color:var(--craber-accent)}
    .craber-date-input:focus{border-color:var(--craber-accent);box-shadow:0 0 0 3px rgba(75,91,214,.12)}
    .craber-date-sep{color:var(--craber-sub);font-size:12px}

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
    /* 细滚动条：作用于列表与预览正文。Firefox 用 scrollbar-*，WebKit 用伪元素 */
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
  // Shadow DOM 隔离：豆包是 React SPA，会在重渲染时清掉它 diff 不到的 DOM 节点，
  // 无论挂到 body 还是 html 下的普通节点都会被反复删除，表现为面板“闪没又出现”。
  // 解法：建一个 host 挂到 html 下，在其 shadow root 内放样式与所有 UI。
  // shadow root 的内容对 React 的 diff 完全不可见，永远不会被清理。
  // craberRoot() 返回该 shadow root，所有面板/按钮都 append 到它里面。
  let _craberShadow = null;
  function craberRoot() {
    if (_craberShadow && _craberShadow.host && _craberShadow.host.isConnected) {
      return _craberShadow;
    }
    const host = document.createElement('div');
    host.id = 'craber-host';
    // host 本身不占布局，真正的定位由内部 .craber-mask/.craber-fab-wrap 的 fixed 完成
    host.style.cssText = 'all:initial';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.appendChild(style);
    document.documentElement.appendChild(host);
    _craberShadow = shadow;
    return shadow;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============================================================
   * UI：批量导出面板（当前会话）
   * ========================================================== */

  function openPanel() {
    const mask = document.createElement('div');
    mask.className = 'craber-mask';
    mask.innerHTML = `
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
          <div class="craber-group">
            <span class="craber-group-label">导出内容</span>
            <div class="craber-chips">
              <label class="craber-chip"><input type="checkbox" name="craber-think"><span class="craber-box"></span>含思考过程</label>
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
      </div>`;
    // 放进 Shadow DOM，避免被豆包 React 清掉（详见 craberRoot）
    craberRoot().appendChild(mask);

    const close = () => mask.remove();
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
    mask.querySelector('.craber-x').addEventListener('click', close);

    mask.querySelectorAll('input[name="craber-mode"]').forEach((r) => {
      r.checked = r.value === settings.mode;
      r.addEventListener('change', () => { settings.mode = r.value; saveSettings(settings); });
    });
    const thinkEl = mask.querySelector('input[name="craber-think"]');
    thinkEl.checked = !!settings.includeThinking;
    thinkEl.addEventListener('change', () => { settings.includeThinking = thinkEl.checked; saveSettings(settings); });

    const listEl = mask.querySelector('.craber-list');
    const statusEl = mask.querySelector('[data-role="status"]');

    listEl.innerHTML = '';
    for (let s = 0; s < 6; s++) {
      const sk = document.createElement('div');
      sk.className = 'craber-sk';
      sk.innerHTML =
        '<div class="b box"></div>' +
        '<div class="lines"><div class="b l1"></div><div class="b l2"></div></div>';
      listEl.appendChild(sk);
    }

    ensureState(true).then((st) => {
      if (!st.turns.length) {
        listEl.innerHTML = '<div class="craber-empty">没有可导出的回合</div>';
        return;
      }
      listEl.innerHTML = '';
      st.turns.forEach((turn, idx) => {
        const q = turnTitle(turn) || '(无文字提问)';
        // 通义一个回合的回复块在 response_messages[]，只统计有正文的块
        const answerCount = ((turn && turn.response_messages) || [])
          .filter((b) => answerBlockText(b)).length;
        const row = document.createElement('label');
        row.className = 'craber-item';
        row.style.animationDelay = Math.min(idx * 30, 400) + 'ms';
        row.innerHTML =
          '<input type="checkbox" data-idx="' + idx + '" checked>' +
          '<span class="craber-box"></span>' +
          '<span class="q">' + escapeHtml(q.slice(0, 120)) +
          '<div class="meta">回合 ' + (idx + 1) + ' · ' + answerCount + ' 段回复</div></span>' +
          '<button class="craber-preview-btn" type="button" title="预览此回合内容">预览</button>';
        row.querySelector('.craber-preview-btn').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openPreview(turn, idx);
        });
        listEl.appendChild(row);
      });
    }).catch((err) => {
      listEl.innerHTML = '<div class="craber-empty">加载失败：' + escapeHtml(err.message) + '</div>';
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
        console.error('[tongyi-craber]', err);
      }
    });
  }

  // 多会话面板：拉取全部会话 -> 勾选 -> 导出为 zip（每会话一个子文件夹）
  function openConvPanel() {
    const mask = document.createElement('div');
    mask.className = 'craber-mask';
    mask.innerHTML = `
      <div class="craber-panel" role="dialog" aria-label="多会话导出">
        <div class="craber-hd">
          <h3>多会话导出</h3>
          <button class="craber-x" title="关闭" aria-label="关闭">×</button>
        </div>
        <div class="craber-opts">
          <input class="craber-search" type="text" placeholder="搜索会话标题…">
          <div class="craber-filter-row">
            <div class="craber-chips" data-role="date-quick">
              <label class="craber-chip"><input type="radio" name="craber-date" value="all" checked><span class="craber-box"></span>全部</label>
              <label class="craber-chip"><input type="radio" name="craber-date" value="7"><span class="craber-box"></span>近 7 天</label>
              <label class="craber-chip"><input type="radio" name="craber-date" value="15"><span class="craber-box"></span>近 15 天</label>
              <label class="craber-chip"><input type="radio" name="craber-date" value="30"><span class="craber-box"></span>近 30 天</label>
              <label class="craber-chip"><input type="radio" name="craber-date" value="custom"><span class="craber-box"></span>自定义</label>
            </div>
            <div class="craber-date-custom" data-role="date-custom" hidden>
              <input class="craber-date-input" type="date" data-role="date-from">
              <span class="craber-date-sep">至</span>
              <input class="craber-date-input" type="date" data-role="date-to">
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
      </div>`;
    // 放进 Shadow DOM，避免被豆包 React 清掉（详见 craberRoot）
    craberRoot().appendChild(mask);

    const close = () => mask.remove();
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
    mask.querySelector('.craber-x').addEventListener('click', close);

    const listEl = mask.querySelector('.craber-list');
    const statusEl = mask.querySelector('[data-role="status"]');
    const searchEl = mask.querySelector('.craber-search');
    const fromEl = mask.querySelector('[data-role="date-from"]');
    const toEl = mask.querySelector('[data-role="date-to"]');

    listEl.innerHTML = Array.from({ length: 6 }).map(() =>
      '<div class="craber-sk"><div class="b box"></div><div class="lines">' +
      '<div class="b l1"></div><div class="b l2"></div></div></div>').join('');

    let metas = [];      // 全部会话元数据
    const checked = {};  // id -> bool
    let dateRange = 0;   // 0=全部；数字=近 N 天；'custom'

    // 通义的时间已是毫秒级 Unix 时间戳（cellToMeta 里直接存的），无需再换算
    const metaTs = (m) => (m.updateTime || 0);

    const inDateRange = (m) => {
      const ts = metaTs(m);
      if (!ts) return dateRange === 0;
      if (dateRange === 'custom') {
        if (fromEl.value) {
          const f = new Date(fromEl.value + 'T00:00:00').getTime();
          if (ts < f) return false;
        }
        if (toEl.value) {
          const t = new Date(toEl.value + 'T23:59:59').getTime();
          if (ts > t) return false;
        }
        return true;
      }
      if (dateRange > 0) {
        const cutoff = Date.now() - dateRange * 24 * 60 * 60 * 1000;
        return ts >= cutoff;
      }
      return true;
    };

    const renderList = () => {
      const kw = (searchEl.value || '').trim().toLowerCase();
      const shown = metas.filter((m) =>
        (!kw || (m.title || '').toLowerCase().indexOf(kw) >= 0) && inDateRange(m));
      if (!shown.length) {
        listEl.innerHTML = '<div class="craber-empty">无匹配会话</div>';
        return;
      }
      listEl.innerHTML = '';
      shown.forEach((m, i) => {
        const row = document.createElement('label');
        row.className = 'craber-item';
        row.style.animationDelay = Math.min(i * 24, 360) + 'ms';
        const t = metaTs(m) ? new Date(metaTs(m)).toLocaleString() : '';
        row.innerHTML =
          '<input type="checkbox" data-id="' + m.id + '"' + (checked[m.id] ? ' checked' : '') + '>' +
          '<span class="craber-box"></span>' +
          '<span class="q">' + escapeHtml(m.title || '未命名会话') +
          '<div class="meta">' + escapeHtml(t) + '</div></span>' +
          '<button class="craber-preview-btn" type="button" title="预览整个会话内容">预览</button>';
        row.querySelector('input').addEventListener('change', (e) => {
          checked[m.id] = e.target.checked;
        });
        row.querySelector('.craber-preview-btn').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openConvPreview(m);
        });
        listEl.appendChild(row);
      });
    };

    searchEl.addEventListener('input', renderList);

    const customEl = mask.querySelector('[data-role="date-custom"]');
    mask.querySelectorAll('input[name="craber-date"]').forEach((r) => {
      r.addEventListener('change', () => {
        if (!r.checked) return;
        dateRange = r.value === 'all' ? 0 : (r.value === 'custom' ? 'custom' : parseInt(r.value, 10));
        customEl.hidden = r.value !== 'custom';
        renderList();
      });
    });
    fromEl.addEventListener('change', () => { if (dateRange === 'custom') renderList(); });
    toEl.addEventListener('change', () => { if (dateRange === 'custom') renderList(); });

    fetchAllConversations((n) => {
      statusEl.textContent = '加载会话 ' + n + ' …';
    }).then((all) => {
      metas = all;
      all.forEach((m) => { checked[m.id] = true; });
      statusEl.textContent = '共 ' + all.length + ' 个会话';
      renderList();
    }).catch((err) => {
      listEl.innerHTML = '<div class="craber-empty">加载失败：' + escapeHtml(err.message) + '</div>';
    });

    mask.querySelector('[data-act="all"]').addEventListener('click', () => {
      metas.forEach((m) => { checked[m.id] = true; });
      renderList();
    });
    mask.querySelector('[data-act="none"]').addEventListener('click', () => {
      metas.forEach((m) => { checked[m.id] = !checked[m.id]; });
      renderList();
    });

    mask.querySelector('[data-act="export"]').addEventListener('click', async () => {
      const selected = metas.filter((m) => checked[m.id]);
      if (!selected.length) { statusEl.textContent = '未选择任何会话'; return; }
      statusEl.textContent = '导出中 0/' + selected.length + ' …';
      try {
        await exportConversations(selected, (done, total, note) => {
          statusEl.textContent = note || ('导出中 ' + done + '/' + total + ' …');
        });
        statusEl.textContent = '完成 ✓';
      } catch (err) {
        statusEl.textContent = '失败：' + err.message;
        console.error('[tongyi-craber]', err);
      }
    });
  }

  /* ============================================================
   * UI：预览（回合 / 整会话）
   * ========================================================== */

  function inlineMd(text) {
    // 超长行跳过内联格式化：V8 正则回溯用调用栈，超长输入可能栈溢出。
    // 这类行（多为搜索结果 summary、长公式）直接原样返回，保证预览不崩。
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
      // 任何正则异常（含栈溢出）都退回原文，预览永不崩溃
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

      const fence = line.match(/^(\s*)(`{3,})(.*)$/);
      if (fence) {
        flushAll();
        const marker = fence[2];
        const code = [];
        i++;
        while (i < lines.length && !new RegExp('^\\s*`{' + marker.length + ',}\\s*$').test(lines[i])) {
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
    pm.innerHTML = `
      <div class="craber-panel craber-preview-panel" role="dialog" aria-label="预览">
        <div class="craber-hd">
          <h3>预览 · 回合 ${idx + 1}</h3>
          <button class="craber-x" title="关闭" aria-label="关闭">×</button>
        </div>
        <div class="craber-preview-body">
          <div class="craber-empty"><span class="craber-spin"></span> 渲染中…</div>
        </div>
      </div>`;
    // 放进 Shadow DOM，隔离于豆包 React 的 DOM 树
    craberRoot().appendChild(pm);

    const closeP = () => pm.remove();
    pm.addEventListener('click', (e) => { if (e.target === pm) closeP(); });
    pm.querySelector('.craber-x').addEventListener('click', closeP);

    const body = pm.querySelector('.craber-preview-body');
    try {
      const { md } = await renderTurn(turn);
      body.innerHTML = miniMarkdownToHtml(md);
    } catch (err) {
      body.innerHTML = '<div class="craber-empty">预览失败：' + escapeHtml(err.message) + '</div>';
      console.error('[tongyi-craber]', err);
    }
  }

  async function openConvPreview(meta) {
    const pm = document.createElement('div');
    pm.className = 'craber-mask craber-preview-mask';
    pm.innerHTML = `
      <div class="craber-panel craber-preview-panel" role="dialog" aria-label="会话预览">
        <div class="craber-hd">
          <h3>预览 · ${escapeHtml((meta.title || '未命名会话').slice(0, 40))}</h3>
          <button class="craber-x" title="关闭" aria-label="关闭">×</button>
        </div>
        <div class="craber-preview-body">
          <div class="craber-empty"><span class="craber-spin"></span> 加载并渲染中…</div>
        </div>
      </div>`;
    // 放进 Shadow DOM，隔离于豆包 React 的 DOM 树
    craberRoot().appendChild(pm);

    const closeP = () => pm.remove();
    pm.addEventListener('click', (e) => { if (e.target === pm) closeP(); });
    pm.querySelector('.craber-x').addEventListener('click', closeP);

    const body = pm.querySelector('.craber-preview-body');
    const statusHint = (n, total) => {
      body.innerHTML = '<div class="craber-empty"><span class="craber-spin"></span> 渲染回合 ' +
        n + '/' + total + ' …</div>';
    };
    try {
      const { md } = await renderConversationToMd(meta.id, meta.title, null, statusHint);
      body.innerHTML = miniMarkdownToHtml(md);
    } catch (err) {
      body.innerHTML = '<div class="craber-empty">预览失败：' + escapeHtml(err.message) + '</div>';
      console.error('[tongyi-craber]', err);
    }
  }

  /* ============================================================
   * UI：悬浮按钮
   * ========================================================== */

  function mountFab() {
    const root = craberRoot();
    if (root.querySelector('.craber-fab-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'craber-fab-wrap';

    const btnConv = document.createElement('button');
    btnConv.className = 'craber-fab craber-fab-ghost';
    btnConv.textContent = '会话列表';
    btnConv.title = '获取并导出多个会话';
    btnConv.addEventListener('click', openConvPanel);

    const btn = document.createElement('button');
    btn.className = 'craber-fab';
    btn.textContent = '导出当前';
    btn.title = '导出当前会话的回合';
    btn.addEventListener('click', openPanel);

    wrap.appendChild(btnConv);
    wrap.appendChild(btn);
    // 放进 Shadow DOM：React 的 diff 看不到 shadow 内部，按钮常驻不被清。
    root.appendChild(wrap);
  }

  // SPA 切换对话时失效缓存
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      state = { convId: null, name: null, turns: [], msgIndex: {} };
    }
  }, 1000);

  // 平台页面全局滚动条美化：面板样式在 Shadow DOM 内影响不到主页面，
  // 故单独往 document.head 注一段。中性半透明配色，明暗主题下都协调，hover 加深。
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
      '::-webkit-scrollbar-corner{background:transparent}';
    document.head.appendChild(s);
  }

  // 启动即装钩，抓取页面自身请求里的公共参数（尤其 ut）。页面会周期性轮询若干
  // 带 ut 的接口，装钩后几秒内即可抓到并缓存，供后续导出请求复用。
  sniffCommonParams();
  mountPageScrollbarStyle();
  mountFab();

  /* ============================================================
   * 诊断：在控制台运行 __craberDiag() 打印当前对话的真实结构
   *   用脚本自己的接口代码拉数据，输出每个回合的 request/response
   *   消息数与 response 里各 mime_type 分布，用于核对渲染假设。
   * ========================================================== */
  // 挂到页面 window（unsafeWindow）上，以便在控制台 top 上下文直接调用。
  // 油猴脚本运行在隔离沙箱，普通 window 与页面 window 不通。
  const _pageWin = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  _pageWin.__craberDiag = async function () {
    const convId = getConvId();
    if (!convId) { console.log('[diag] 请先打开一个具体对话（URL 含 /chat/...）'); return; }
    console.log('[diag] convId =', convId);
    let turns;
    try {
      turns = await fetchAllTurns(convId);
    } catch (e) {
      console.log('[diag] 拉取消息失败：', e);
      return;
    }
    console.log('[diag] 共拉到 ' + turns.length + ' 个回合');

    // 逐回合概览：req 数 / resp 数 / resp 里各 mime_type / 提问首行
    const rows = turns.map(function (t) {
      const resp = t.response_messages || [];
      const mimes = resp.map(function (b) { return b.mime_type; });
      return {
        req_id: t.req_id,
        req_count: (t.request_messages || []).length,
        resp_count: resp.length,
        resp_mimes: mimes.join(','),
        thinking: collectThinking(t).length,
        title: turnTitle(t).slice(0, 40)
      };
    });
    console.log('[diag] 回合概览（表格）：');
    console.table(rows);

    // 完整原始数据（展开看字段）
    console.log('[diag] 完整回合数组（展开查看真实字段）：', turns);
    _pageWin.__craberDiagData = { convId: convId, turns: turns, rows: rows };
    console.log('[diag] 已存到 window.__craberDiagData，可复制 rows 贴给开发者');

    // 收集所有出现过的 response mime_type，每种取一条样例，存全局供核对。
    // 已适配为正文：凡带 content 字符串的块；思考：multi_load 内 multimodal_chat_think。
    const mimeSamples = {};
    for (const t of turns) {
      for (const b of (t.response_messages || [])) {
        if (b && b.mime_type && !mimeSamples[b.mime_type]) mimeSamples[b.mime_type] = b;
      }
    }
    _pageWin.__craberMimes = mimeSamples;
    console.log('[diag] response 里出现过的 mime_type：' + Object.keys(mimeSamples).join(', ') +
      '（各取一条样例已存到 window.__craberMimes）');
    return rows;
  };
  console.log('[tongyi-craber] v0.1.0 已加载（Shadow DOM 隔离；诊断：控制台运行 __craberDiag()）');
})();
