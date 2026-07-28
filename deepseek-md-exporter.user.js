// ==UserScript==
// @name         craber（DeepSeek 导出）
// @namespace    deepseek-craber
// @version      0.1.0
// @description  craber：导出 DeepSeek 对话为 Markdown。支持单条导出、批量 zip 导出、多会话导出，适配正文/代码/深度思考等。
// @author       craber
// @homepageURL  https://github.com/yixing233/GPTCraber
// @supportURL   https://github.com/yixing233/GPTCraber/issues
// @downloadURL  https://raw.githubusercontent.com/yixing233/GPTCraber/main/deepseek-md-exporter.user.js
// @updateURL    https://raw.githubusercontent.com/yixing233/GPTCraber/main/deepseek-md-exporter.user.js
// @match        https://chat.deepseek.com/*
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* ============================================================
   * 常量与工具
   * ========================================================== */

  // 悬浮球用的螃蟹图标（内联 SVG）。fill 用 currentColor，蟹身颜色由容器的
  // color 决定（.craber-fab-ball 里设为绿色），换平台时也统一走这一处。
  const CRAB_SVG = '<svg viewBox="0 0 71.493 71.493" width="26" height="26" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M69.857,43.299l-10.626-5.432c3.038-3.402,4.707-7.433,4.707-11.651 c0-8.227-6.175-15.503-16.114-18.989c-1.109-0.388-2.342-0.096-3.155,0.751c-0.814,0.846-1.06,2.089-0.628,3.182 c0.338,0.857,0.51,1.734,0.51,2.609c0,0.492-0.052,0.688-0.045,0.69c-0.083,0.105-0.393,0.362-0.643,0.569 c-0.422,0.35-0.947,0.785-1.546,1.386c-0.688,0.692-0.996,1.676-0.826,2.637s0.796,1.78,1.68,2.194 c1.956,0.918,8.324,4.331,8.361,9.76c-2.459-1.79-5.451-3.167-8.78-3.981c0.156-0.366,0.242-0.769,0.242-1.193 c0-1.688-1.369-3.055-3.055-3.055c-1.688,0-3.055,1.367-3.055,3.055c0,0.13,0.023,0.255,0.038,0.381 c-0.39-0.015-0.782-0.023-1.176-0.023c-0.394,0-0.787,0.008-1.176,0.023c0.016-0.126,0.038-0.25,0.038-0.381 c0-1.688-1.369-3.055-3.055-3.055c-1.688,0-3.055,1.367-3.055,3.055c0,0.423,0.086,0.826,0.242,1.193 c-3.785,0.925-7.138,2.576-9.763,4.737c0.216-4.082,4.91-8.435,9.345-10.516c0.884-0.415,1.511-1.233,1.68-2.195 c0.17-0.961-0.139-1.945-0.827-2.637c-0.598-0.601-1.124-1.037-1.546-1.386c-0.255-0.211-0.572-0.474-0.622-0.528 c-0.001-0.001-0.065-0.181-0.065-0.73c0-0.873,0.172-1.751,0.511-2.61c0.432-1.092,0.186-2.335-0.628-3.181 c-0.814-0.848-2.05-1.14-3.154-0.751C13.729,10.71,7.554,17.987,7.554,26.215c0,4.218,1.669,8.249,4.707,11.651L1.635,43.299 C0.16,44.053-0.425,45.86,0.33,47.336c0.53,1.038,1.582,1.635,2.673,1.635c0.46,0,0.927-0.106,1.363-0.329l8.695-4.445 c0.069,0.981,0.255,1.939,0.536,2.869L2.868,52.551c-1.476,0.754-2.061,2.562-1.306,4.037c0.53,1.038,1.582,1.635,2.673,1.635 c0.46,0,0.927-0.106,1.363-0.329l10.888-5.566c0.491,0.589,1.027,1.154,1.607,1.692l-9.282,4.745 c-1.476,0.754-2.061,2.562-1.306,4.037c0.53,1.038,1.582,1.635,2.673,1.635c0.46,0,0.927-0.106,1.363-0.329l11.887-6.077 c0.131-0.067,0.253-0.143,0.369-0.226c3.474,1.623,7.568,2.563,11.949,2.563c4.381,0,8.475-0.94,11.949-2.563 c0.116,0.082,0.238,0.159,0.369,0.226l11.887,6.077c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635 c0.755-1.476,0.17-3.283-1.306-4.037L53.4,54.02c0.58-0.538,1.116-1.103,1.606-1.692l10.888,5.566 c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635c0.755-1.476,0.17-3.283-1.306-4.037l-10.729-5.485 c0.281-0.931,0.466-1.888,0.536-2.87l8.695,4.445c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635 C71.918,45.86,71.333,44.053,69.857,43.299z M50.472,15.06c4.65,2.828,7.466,6.906,7.466,11.155c0,1.07-0.176,2.131-0.516,3.166 c-0.584-4.354-3.438-8.421-8.006-11.487C49.934,17.163,50.316,16.273,50.472,15.06z M21.02,15.06 c0.158,1.229,0.548,2.126,1.076,2.863c-3.65,2.491-6.962,6.022-8.393,10.004c-0.099-0.566-0.149-1.138-0.149-1.711 C13.554,21.966,16.37,17.888,21.02,15.06z M19.027,43.278c0-6.011,7.656-11.089,16.72-11.089c9.063,0,16.719,5.078,16.719,11.089 s-7.656,11.089-16.719,11.089C26.683,54.368,19.027,49.29,19.027,43.278z"/></svg>';

  const SETTINGS_KEY = 'deepseek_craber_settings';
  const DEFAULT_SETTINGS = {
    mode: 'qa',            // 'qa' = 问答对；'ai' = 仅 AI 回复
    includeThinking: false // 是否导出深度思考过程（thinking_content）
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

  // DeepSeek 对话页 URL：/a/chat/s/{sessionId} 或 /chat/{sessionId}
  function getConvId() {
    const m = location.pathname.match(/\/(?:a\/chat\/s|chat\/s|chat)\/([0-9a-f-]{16,})/i);
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
   * 接口封装（豆包 IM 协议，POST + cookie 鉴权，无签名头）
   *   /im/chain/recent_conv (cmd 3200) 会话列表
   *   /im/chain/single      (cmd 3100) 单会话消息链
   * ========================================================== */

  // DeepSeek 用 Bearer token 鉴权，token 存在 localStorage.userToken 的 .value 字段。
  function getToken() {
    try {
      const raw = localStorage.getItem('userToken');
      if (!raw) return null;
      const obj = JSON.parse(raw);
      return obj && obj.value ? obj.value : null;
    } catch (e) {
      return null;
    }
  }

  // 统一 GET 请求：带 Bearer token，返回 biz_data。
  async function dsGet(path) {
    const token = getToken();
    if (!token) throw new Error('未登录或找不到 token（localStorage.userToken）');
    const r = await fetch(path, {
      method: 'GET',
      credentials: 'include',
      headers: { authorization: 'Bearer ' + token }
    });
    if (!r.ok) throw new Error('接口请求失败 ' + path + ': ' + r.status);
    const j = await r.json();
    if (j.code !== 0) throw new Error('接口返回错误 code=' + j.code + ' ' + (j.msg || ''));
    return (j.data && j.data.biz_data) || {};
  }

  const API = {
    // 拉一页会话列表。用游标 lte_cursor 翻页（返回 has_more）。
    // 首页不带 cursor；后续用上一页最后一个会话的 updated_at 作为游标。
    async getConversationsPage(cursor) {
      let path = '/api/v0/chat_session/fetch_page?count=100';
      if (cursor) path += '&lte_cursor.updated_at=' + encodeURIComponent(cursor) +
        '&lte_cursor.pinned=false';
      const b = await dsGet(path);
      const sessions = b.chat_sessions || [];
      return {
        sessions: sessions,
        hasMore: !!b.has_more,
        nextCursor: sessions.length ? sessions[sessions.length - 1].updated_at : null
      };
    },

    // 拉单会话的全部消息（DeepSeek 一次返回整段消息链，无需翻页）。
    async getMessages(sessionId) {
      const b = await dsGet('/api/v0/chat/history_messages?chat_session_id=' +
        encodeURIComponent(sessionId));
      return { messages: b.chat_messages || [] };
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
   * 消息拉取 + 回合分组
   *   DeepSeek 的 history_messages 一次返回整个消息链（chat_messages[]），
   *   每条含 role(USER/ASSISTANT)、content、thinking_content、files 等，
   *   靠 message_id 顺序即可，无需翻页。
   * ========================================================== */

  // 拉取单会话全部消息，按 message_id 升序返回
  async function fetchAllMessages(convId, onProgress) {
    const { messages } = await API.getMessages(convId);
    const all = (messages || []).slice();
    all.sort((a, b) => Number(a.message_id) - Number(b.message_id));
    if (onProgress) onProgress(all.length);
    return all;
  }

  // 按回合分组：一条 USER 提问 + 其后紧跟的 ASSISTANT 回复为一个回合。
  // turn = { question: 首条user消息, questionMsgs: [全部user消息], answers: [assistant消息] }
  function groupTurns(messages) {
    const turns = [];
    let cur = null;
    let lastWasBot = true; // 让首条 user 消息能开启回合
    for (const m of messages) {
      if (m.role === 'USER') {
        if (lastWasBot || !cur) {
          cur = { question: m, questionMsgs: [m], answers: [] };
          turns.push(cur);
        } else {
          cur.questionMsgs.push(m);
          if (!cur.question) cur.question = m;
        }
        lastWasBot = false;
      } else if (m.role === 'ASSISTANT') {
        if (!cur) { cur = { question: null, questionMsgs: [], answers: [] }; turns.push(cur); }
        cur.answers.push(m);
        lastWasBot = true;
      }
    }
    return turns;
  }

  /* ============================================================
   * 渲染
   * ========================================================== */

  // 清洗正文：删掉联网引用标记 [reference:0] / [!reference:3]（接口不返回引用源，
  // 保留标记只会污染正文），并压掉因此产生的多余空格。
  function cleanContent(text) {
    if (!text) return '';
    return String(text)
      .replace(/\[!?reference:\d+\]/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .trim();
  }

  // 渲染一条消息的正文 + 附件。DeepSeek 的 content 本身就是 Markdown。
  // files[] 只有文件名（无下载 URL），按文件名标注。
  function renderMessage(msg) {
    let out = '';
    const files = (msg && msg.files) || [];
    for (const f of files) {
      const name = (f && (f.file_name || f.name)) || '附件';
      out += '📎 ' + name + '\n\n';
    }
    const body = cleanContent(msg && msg.content);
    if (body) out += body + '\n\n';
    return out;
  }

  // 取一条消息的纯文本（用于标题）
  function messageText(msg) {
    return cleanContent(msg && msg.content);
  }

  // 取一个回合的标题：首条有文本的提问；没有则用附件名，再退回回复首行。
  function turnTitle(turn) {
    const msgs = (turn && turn.questionMsgs) || (turn && turn.question ? [turn.question] : []);
    for (const m of msgs) {
      const t = messageText(m);
      if (t) return t.split('\n')[0];
    }
    for (const m of msgs) {
      const files = (m && m.files) || [];
      if (files.length) return files[0].file_name || files[0].name || '[附件]';
    }
    for (const m of (turn.answers || [])) {
      const t = messageText(m);
      if (t) return t.split('\n')[0];
    }
    return '';
  }

  // 图片 sink 空实现：DeepSeek 无图片 URL，无需下载/打包，仅为兼容导出流程的调用签名。
  function makeDataUriSink() { return null; }
  function makeZipImageSink() { return null; }

  // 渲染一个回合为 markdown，返回 { title, md }
  async function renderTurn(turn) {
    const title = turnTitle(turn);
    let md = '';

    if (settings.mode === 'qa') {
      md += '## 🧑 问题\n\n';
      const qMsgs = turn.questionMsgs || (turn.question ? [turn.question] : []);
      let qOut = '';
      for (const qm of qMsgs) qOut += renderMessage(qm);
      md += (qOut.trim() || '(无文字提问)') + '\n\n';
      md += '## 🤖 回答\n\n';
    }

    for (const node of turn.answers) {
      if (settings.includeThinking && node.thinking_content && node.thinking_content.trim()) {
        const secs = node.thinking_elapsed_secs
          ? '（' + Math.round(node.thinking_elapsed_secs) + ' 秒）' : '';
        md += '> 💭 思考过程' + secs + '\n>\n> ' +
          cleanContent(node.thinking_content).replace(/\n/g, '\n> ') + '\n\n';
      }
      md += renderMessage(node);
    }

    return { title, md: md.trim() + '\n' };
  }

  // 把整个会话渲染成单个 markdown
  async function renderConversationToMd(convId, convName, sink, onProgress) {
    const messages = await fetchAllMessages(convId);
    const turns = groupTurns(messages);
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

    const messages = await fetchAllMessages(convId);
    const turns = groupTurns(messages);
    const msgIndex = {};
    turns.forEach((t) => {
      (t.questionMsgs || (t.question ? [t.question] : [])).forEach((q) => {
        if (q && q.message_id) msgIndex[q.message_id] = t;
      });
      t.answers.forEach((a) => { if (a && a.message_id) msgIndex[a.message_id] = t; });
    });
    state = { convId, name: null, turns, msgIndex };
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
    const zipName = sanitizeFilename(state.name) || 'doubao-export';
    triggerDownload(blob, zipName + '.zip');
  }

  /* ============================================================
   * 多会话：列表获取与批量导出
   * ========================================================== */

  // 从 DeepSeek 的 chat_session 提取会话元数据
  function cellToMeta(s) {
    return {
      id: s.id,
      title: s.title || '未命名会话',
      createTime: Number(s.inserted_at) || 0,
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
        if (!s.id || seen[s.id]) continue; // 去重：服务端游标偶尔返回重复
        seen[s.id] = 1;
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
        console.warn('[doubao-craber] 会话导出失败', meta.id, e);
      }
      if (onProgress) onProgress(i, convMetas.length);
    }
    if (onProgress) onProgress(convMetas.length, convMetas.length, '打包中…');
    const blob = zip.generate();
    triggerDownload(blob, 'doubao-conversations.zip');
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
    /* 深色变量：跟随系统（媒体查询）或页面实际主题（.craber-dark 类，由 JS 检测
       页面背景亮度后加到 host 上）。DeepSeek 等平台用的是页面自身深色主题，不改
       系统设置，故媒体查询不够，必须靠 .craber-dark 兜底。 */
    @media (prefers-color-scheme:dark){
      :host{
        --craber-bg:#26282c; --craber-fg:#e8eaed; --craber-sub:#9aa0a8;
        --craber-line:#3a3d43; --craber-hover:#2f3237; --craber-ghost:#34373d;
        --craber-skeleton:#33363b; --craber-skeleton-hi:#3c4046;
      }
    }
    :host(.craber-dark){
      --craber-bg:#26282c; --craber-fg:#e8eaed; --craber-sub:#9aa0a8;
      --craber-line:#3a3d43; --craber-hover:#2f3237; --craber-ghost:#34373d;
      --craber-skeleton:#33363b; --craber-skeleton-hi:#3c4046;
    }
    @keyframes craber-fade-in{from{opacity:0}to{opacity:1}}
    @keyframes craber-pop-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes craber-shimmer{0%{background-position:-360px 0}100%{background-position:360px 0}}
    @keyframes craber-row-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes craber-spin{to{transform:rotate(360deg)}}

    /* 悬浮球：可拖拽、双击展开菜单。位置由 JS 用 left/top 定位并存 localStorage。
       蟹图标用内联 SVG，蟹身填 currentColor（统一蟹绿），球底为白/浅色衬托。 */
    .craber-fab-ball{position:fixed;z-index:99998;width:52px;height:52px;border-radius:50%;
      background:rgba(255,255,255,.3);color:#22a06b;border:none;cursor:grab;
      display:flex;align-items:center;justify-content:center;
      -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
      box-shadow:0 4px 14px rgba(0,0,0,.22);user-select:none;touch-action:none;
      font-family:system-ui,sans-serif;transition:box-shadow .15s ease,transform .12s ease}
    .craber-fab-ball svg{width:30px;height:30px;pointer-events:none}
    .craber-fab-ball:hover{box-shadow:0 6px 20px rgba(0,0,0,.3)}
    .craber-fab-ball:active{cursor:grabbing}
    .craber-fab-ball.craber-dragging{transition:none;transform:scale(1.08)}
    /* 菜单展开/收起过渡：用 opacity+transform（display:none 无法过渡）。
       收起态 pointer-events:none 防止不可见时误点；展开态各项交错淡入上滑。 */
    /* 父级不做透明度过渡：否则收起时父级整体淡出会盖掉子项的交错，看起来“一次性消失”。
       可见性完全交给各子项自己的 opacity，父级只用 pointer-events 管交互。 */
    .craber-fab-menu{position:fixed;z-index:99998;display:flex;flex-direction:column;gap:8px;
      pointer-events:none}
    .craber-fab-menu.craber-open{pointer-events:auto}
    .craber-fab-item{background:var(--craber-bg);color:var(--craber-fg);border:none;border-radius:22px;
      padding:11px 18px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;
      box-shadow:0 4px 14px rgba(0,0,0,.18);font-family:system-ui,sans-serif;
      opacity:0;
      transition:background .15s ease,opacity .24s ease,transform .24s cubic-bezier(.2,.8,.25,1)}
    /* 项的初始位移方向跟随展开方向：向上展开(菜单在球上方)时项从下方滑入(+12px)；
       向下展开时从上方滑入(-12px)。动画方向与展开方向一致，视觉更自然。 */
    .craber-fab-menu.craber-up .craber-fab-item{transform:translateY(12px) scale(.9)}
    .craber-fab-menu.craber-down .craber-fab-item{transform:translateY(-12px) scale(.9)}
    .craber-fab-menu.craber-open .craber-fab-item{opacity:1;transform:none}
    /* 交错延迟由 JS 逐项设内联 transition-delay（开合方向不同，见 setStagger），
       CSS 特异度那套在 shadow DOM 里不稳，改由 JS 精确控制。 */
    .craber-fab-item:hover{background:var(--craber-hover)}

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
  // 探测页面「实际」主题：媒体查询只认系统设置，但平台常有自己的明暗主题
  // （如系统浅色、DeepSeek 深色）。故读 body/html 背景色的亮度判断，深色时给
  // host 加 .craber-dark 类，CSS 里 :host(.craber-dark) 覆盖出深色变量。
  function detectDark() {
    try {
      const bodyBg = getComputedStyle(document.body).backgroundColor ||
        getComputedStyle(document.documentElement).backgroundColor;
      const m = String(bodyBg).match(/rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(',').map((s) => parseFloat(s));
        // 透明背景（alpha 0）当作浅色处理，避免误判
        if (p.length >= 4 && p[3] === 0) return false;
        const lum = 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
        return lum < 128;
      }
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
  }

  let _craberShadow = null;
  function craberRoot() {
    if (_craberShadow && _craberShadow.host && _craberShadow.host.isConnected) {
      applyTheme();
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
    _craberHost = host;
    applyTheme();
    return shadow;
  }

  let _craberHost = null;
  // 每次打开 UI 时按当前页面主题刷新 host 类（用户中途切主题也能跟上）
  function applyTheme() {
    if (_craberHost) _craberHost.classList.toggle('craber-dark', detectDark());
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
        const answerCount = turn.answers.length;
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
        console.error('[doubao-craber]', err);
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

    // 豆包的时间是秒级 Unix 时间戳，转成毫秒
    const metaTs = (m) => (m.updateTime ? m.updateTime * 1000 : 0);

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
        console.error('[doubao-craber]', err);
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
      console.error('[doubao-craber]', err);
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
      console.error('[doubao-craber]', err);
    }
  }

  /* ============================================================
   * UI：悬浮按钮
   * ========================================================== */

  // 悬浮球：可拖拽（位置存 localStorage），双击展开菜单（会话列表 / 导出当前）。
  // 固定右下角会挡内容，改成用户可随手拖到不碍事的位置。
  const FAB_POS_KEY = 'deepseek_craber_fab_pos';

  function mountFab() {
    const root = craberRoot();
    if (root.querySelector('.craber-fab-ball')) return;

    const ball = document.createElement('button');
    ball.className = 'craber-fab-ball';
    // 蟹图标：蟹身填 currentColor（由 .craber-fab-ball 的 color 统一控制为蟹绿）
    ball.innerHTML = CRAB_SVG;
    ball.title = '拖拽移动 · 双击展开菜单';

    const menu = document.createElement('div');
    menu.className = 'craber-fab-menu';
    // 默认收起：CSS 里 .craber-fab-menu 无 .craber-open 即 opacity:0 且不可点

    const btnConv = document.createElement('button');
    btnConv.className = 'craber-fab-item';
    btnConv.textContent = '会话列表';
    btnConv.title = '获取并导出多个会话';

    const btnCur = document.createElement('button');
    btnCur.className = 'craber-fab-item';
    btnCur.textContent = '导出当前';
    btnCur.title = '导出当前会话的回合';

    const btnCollapse = document.createElement('button');
    btnCollapse.className = 'craber-fab-item craber-fab-collapse';
    btnCollapse.textContent = '收起';
    btnCollapse.title = '收起菜单，只留悬浮球';

    menu.appendChild(btnConv);
    menu.appendChild(btnCur);
    menu.appendChild(btnCollapse);

    // ---- 定位：优先读存储，默认右下角 ----
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
    // 菜单贴着球弹出：球在下半屏则向上展开，在右半屏则右对齐
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
    }

    // 展开/收起菜单，逐项交错（用内联 transition-delay，最可控，不依赖 CSS 特异度）。
    //   展开：离球近的项先出现；收起：离球远的项先缩回。
    //   菜单在球上方(onBottom)时，DOM 末项离球最近；在球下方时，DOM 首项离球最近。
    const STEP = 60; // 每项间隔 ms
    function setMenuOpen(open) {
      const items = [btnConv, btnCur, btnCollapse];
      const onBottom = pos.y + BALL / 2 > window.innerHeight / 2;
      const n = items.length;
      items.forEach((it, i) => {
        // nearIndex：该项“离球的远近序”，0=最近。菜单在上方时末项最近。
        const nearIndex = onBottom ? (n - 1 - i) : i;
        // 展开按“近→远”出现，收起按“远→近”缩回（延迟顺序相反）
        const order = open ? nearIndex : (n - 1 - nearIndex);
        it.style.transitionDelay = (order * STEP) + 'ms';
      });
      if (open) { positionMenu(); menu.classList.add('craber-open'); }
      else { menu.classList.remove('craber-open'); }
    }

    // ---- 拖拽：pointer 事件，移动超阈值算拖拽（避免和双击冲突） ----
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

    // ---- 双击展开菜单（拖拽过就不触发）。收起只靠菜单里的「收起」项，
    //      不再点外部自动收起，也不再双击切换——展开后常驻，符合“手动收起”。 ----
    ball.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (moved) return;
      setMenuOpen(true);
    });

    // 点菜单项：打开面板，菜单保持展开（面板是模态层，关掉后菜单还在）
    btnConv.addEventListener('click', openConvPanel);
    btnCur.addEventListener('click', openPanel);
    // 「收起」：手动收起菜单，只留悬浮球
    btnCollapse.addEventListener('click', () => { setMenuOpen(false); });

    // 窗口缩放时把球夹回可视区
    window.addEventListener('resize', () => { pos = clamp(pos.x, pos.y); applyPos(); });

    applyPos();
    // 放进 Shadow DOM：React 的 diff 看不到 shadow 内部，按钮常驻不被清。
    root.appendChild(ball);
    root.appendChild(menu);
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

  mountPageScrollbarStyle();
  mountFab();

  /* ============================================================
   * 诊断：在控制台运行 __craberDiag() 打印当前对话的真实结构
   *   用脚本自己的接口代码拉数据，输出每条消息的 user_type、
   *   每个 block 的 block_type 与字段名，用于核对分组/渲染假设。
   * ========================================================== */
  // 挂到页面 window（unsafeWindow）上，以便在控制台 top 上下文直接调用。
  // 油猴脚本运行在隔离沙箱，普通 window 与页面 window 不通。
  const _pageWin = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
  _pageWin.__craberDiag = async function () {
    const convId = getConvId();
    if (!convId) { console.log('[diag] 请先打开一个具体对话（URL 含 /chat/...）'); return; }
    console.log('[diag] convId =', convId);
    let messages;
    try {
      messages = await fetchAllMessages(convId);
    } catch (e) {
      console.log('[diag] 拉取消息失败：', e);
      return;
    }
    console.log('[diag] 共拉到 ' + messages.length + ' 条消息');

    // 逐条概览：index / user_type / content_type / 各 block_type / brief 片段
    const rows = messages.map(function (m) {
      const blocks = (m.content_block || []).map(function (b) {
        return {
          block_type: b.block_type,
          content_keys: b.content ? Object.keys(b.content) : [],
          content_type_of_content: b.content && b.content.content_type
        };
      });
      return {
        index_in_conv: m.index_in_conv,
        user_type: m.user_type,
        content_type: m.content_type,
        has_content_block: !!(m.content_block && m.content_block.length),
        block_count: (m.content_block || []).length,
        blocks: blocks,
        thinking: !!(m.thinking_content && m.thinking_content.trim()),
        brief: (m.brief || '').slice(0, 40)
      };
    });
    console.log('[diag] 消息概览（表格）：');
    console.table(rows.map(function (r) {
      return {
        idx: r.index_in_conv, user_type: r.user_type, content_type: r.content_type,
        blocks: r.block_count, block_types: r.blocks.map(function (b) { return b.block_type; }).join(','),
        brief: r.brief
      };
    }));

    // 完整原始数据（展开看字段）
    console.log('[diag] 完整消息数组（展开查看真实字段）：', messages);
    // 也把概览挂到全局，方便复制
    _pageWin.__craberDiagData = { convId: convId, messages: messages, rows: rows };
    console.log('[diag] 已存到 window.__craberDiagData，可复制 rows 贴给开发者');

    // 收集所有未适配的 block_type，每种取一条完整结构，打印 + 存全局。
    // 已适配：10000(text)/10052(attachment)/10056(reference)
    const known = { 10000: 1, 10052: 1, 10056: 1 };
    const unknown = {};
    for (const m of messages) {
      for (const b of (m.content_block || [])) {
        if (!known[b.block_type] && !unknown[b.block_type]) {
          unknown[b.block_type] = b;
        }
      }
    }
    const unknownList = Object.keys(unknown).map(function (k) { return unknown[k]; });
    _pageWin.__craberUnknown = unknownList;
    if (unknownList.length) {
      console.log('[diag] 未适配的 block_type：' + Object.keys(unknown).join(', ') +
        '（完整结构已存到 window.__craberUnknown）');
      console.log('[diag] 复制下面这行的输出贴给开发者：');
      console.log(JSON.stringify(unknownList, null, 2));
    } else {
      console.log('[diag] 没有未适配的 block_type');
    }
    return rows;
  };
  console.log('[doubao-craber] v0.6.0 已加载（Shadow DOM 隔离；诊断：控制台运行 __craberDiag()）');
})();
