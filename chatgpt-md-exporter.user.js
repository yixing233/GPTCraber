// ==UserScript==
// @name         craber（ChatGPT导出）
// @namespace    gpt-craber
// @version      0.3.2
// @description  gpt-craber：导出 ChatGPT 对话为 Markdown。支持单条导出、批量 zip 导出、多会话导出、导航节点跳转，适配文本/代码/图片/联网引用等多种消息类型。
// @author       gpt-craber
// @homepageURL  https://github.com/yixing233/GPTCraber
// @supportURL   https://github.com/yixing233/GPTCraber/issues
// @downloadURL  https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-md-exporter.user.js
// @updateURL    https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-md-exporter.user.js
// @license      GPL-3.0-only
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        GM_xmlhttpRequest
// @connect      chatgpt.com
// @connect      oaiusercontent.com
// @connect      files.oaiusercontent.com
// @connect      images.openai.com
// @connect      *
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

  // 私有区字符范围 U+E000..U+F8FF（ChatGPT 用来标记引用位置）。
  // 用 fromCharCode 构造，避免手写 \uXXXX 转义出错。
  const PUA = new RegExp('[' + String.fromCharCode(0xE000) + '-' + String.fromCharCode(0xF8FF) + ']', 'g');

  const SETTINGS_KEY = 'gpt_craber_settings';
  const DEFAULT_SETTINGS = {
    mode: 'qa',            // 'qa' = 问答对；'ai' = 仅 AI 回复
    includeCode: false,    // 是否导出 assistant/code（工具调用代码，如 search(...)）
    sourcesFooter: true,   // 是否在文末附"参考来源"
    embedImages: true      // ChatGPT 托管图是否转 base64 内嵌（否则用临时链接）
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

  function getConvId() {
    // 支持 /c/{id} 与 /g/g-xxx/c/{id}
    const m = location.pathname.match(/\/c\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function sanitizeFilename(s) {
    s = (s || '').replace(PUA, '').replace(/[\\/:*?"<>|\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (s.length > 60) s = s.slice(0, 60).trim();
    return s || 'untitled';
  }

  // 清洗文档附件的文件名（保留扩展名，去掉路径分隔符和非法字符，压掉多余空白）。
  // 与 sanitizeFilename 的区别：这里要保留原始扩展名（如 .pdf），主名过长才截断。
  function sanitizeFilePart(name) {
    const raw = String(name || '').replace(PUA, '').replace(/[\\/:*?"<>|\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!raw) return '';
    const dot = raw.lastIndexOf('.');
    let base = dot > 0 ? raw.slice(0, dot) : raw;
    const ext = dot > 0 ? raw.slice(dot) : '';
    if (base.length > 80) base = base.slice(0, 80).trim();
    return base + ext;
  }

  // asset_pointer 形如 sediment://file_00.. 或 file-service://file-..，取出 file id
  function extractFileId(assetPointer) {
    const m = String(assetPointer || '').match(/file[-_][A-Za-z0-9]+/);
    return m ? m[0] : null;
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

  /* ============================================================
   * 接口封装
   * ========================================================== */

  const API = {
    _token: null,
    _tokenTs: 0,

    async getToken() {
      // 缓存 5 分钟
      if (this._token && Date.now() - this._tokenTs < 5 * 60 * 1000) return this._token;
      const r = await fetch('/api/auth/session', { credentials: 'include' });
      if (!r.ok) throw new Error('会话凭证获取失败（未登录？）: ' + r.status);
      const j = await r.json();
      if (!j.accessToken) throw new Error('未取到 accessToken，请确认已登录');
      this._token = j.accessToken;
      this._tokenTs = Date.now();
      return this._token;
    },

    async getConversation(convId) {
      const t = await this.getToken();
      const r = await fetch('/backend-api/conversation/' + convId, {
        headers: { Authorization: 'Bearer ' + t },
        credentials: 'include'
      });
      if (!r.ok) {
        const err = new Error('会话内容获取失败: ' + r.status);
        err.status = r.status;   // 调用方要靠它区分 429（限流）和真失败
        throw err;
      }
      return r.json();
    },

    async getFileInfo(fileId) {
      const t = await this.getToken();
      const r = await fetch('/backend-api/files/' + fileId + '/download', {
        headers: { Authorization: 'Bearer ' + t },
        credentials: 'include'
      });
      if (!r.ok) throw new Error('文件信息获取失败: ' + r.status);
      return r.json(); // { download_url, mime_type, file_name, ... }
    },

    // 拉取会话列表的一页：{ items, total, limit, offset }
    async getConversations(offset, limit) {
      const t = await this.getToken();
      const url = '/backend-api/conversations?offset=' + offset + '&limit=' + limit + '&order=updated';
      const r = await fetch(url, {
        headers: { Authorization: 'Bearer ' + t },
        credentials: 'include'
      });
      if (!r.ok) throw new Error('会话列表获取失败: ' + r.status);
      return r.json();
    },

    // 自动翻页拉取全部会话（仅元数据：id/title/时间等，不含 mapping）
    async getAllConversations(onProgress) {
      const limit = 50;
      let offset = 0;
      let all = [];
      let total = Infinity;
      while (offset < total) {
        const page = await this.getConversations(offset, limit);
        total = page.total != null ? page.total : all.length;
        const items = page.items || [];
        all = all.concat(items);
        if (onProgress) onProgress(all.length, total);
        if (!items.length) break; // 兜底：空页则停止
        offset += limit;
      }
      return all;
    },

    // 取项目（gizmo）名：项目会话的 gizmo_id 以 g-p- 开头，
    // 项目名在 gizmo.display.name。按 id 缓存，同项目只请求一次。
    _gizmoCache: {},
    async getGizmoName(gizmoId) {
      if (!gizmoId) return null;
      if (Object.prototype.hasOwnProperty.call(this._gizmoCache, gizmoId)) {
        return this._gizmoCache[gizmoId];
      }
      let name = null;
      try {
        const t = await this.getToken();
        const r = await fetch('/backend-api/gizmos/' + gizmoId, {
          headers: { Authorization: 'Bearer ' + t },
          credentials: 'include'
        });
        if (r.ok) {
          const j = await r.json();
          name = (j.gizmo && j.gizmo.display && j.gizmo.display.name) || null;
        }
      } catch (e) {
        console.warn('[gpt-craber] 项目名获取失败', gizmoId, e);
      }
      this._gizmoCache[gizmoId] = name;
      return name;
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

  // 拉取 ChatGPT 托管图（先取签名 URL），返回 Blob
  async function downloadImageBlob(fileId) {
    const info = await API.getFileInfo(fileId);
    if (!info.download_url) throw new Error('无 download_url');
    return gmFetchBlob(info.download_url);
  }

  /* ============================================================
   * 内联 ZIP 打包器（仅 STORE 模式，零外部依赖、零 eval）
   *   页面 CSP 同时禁用了外部脚本(@require)与 unsafe-eval(new Function)，
   *   所以不能用 JSZip。STORE 模式的 ZIP 格式很简单：
   *   [本地文件头+数据] * N  +  [中央目录项] * N  +  [目录尾记录]
   *   唯一需要计算的是每个文件的 CRC32。全部是纯数据操作，不触发 CSP。
   * ========================================================== */

  // CRC32 查表（IEEE 多项式 0xEDB88320），惰性构建一次
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

  // 极简 ZIP 构建器：add(path, Uint8Array) 收集条目，generate() 产出 Blob
  function createZip() {
    const files = []; // { nameBytes, data, crc, offset }
    const encoder = new TextEncoder();
    return {
      add(path, data) {
        // data 需为 Uint8Array
        files.push({ nameBytes: encoder.encode(path), data: data, crc: crc32(data) });
      },
      generate() {
        const localParts = [];
        const central = [];
        let offset = 0;

        for (const f of files) {
          const nameLen = f.nameBytes.length;
          const size = f.data.length;

          // ---- 本地文件头 (30 字节 + 文件名) ----
          const lh = new DataView(new ArrayBuffer(30));
          lh.setUint32(0, 0x04034b50, true);   // 本地头签名
          lh.setUint16(4, 20, true);           // 解压所需版本
          lh.setUint16(6, 0, true);            // 通用标志位
          lh.setUint16(8, 0, true);            // 压缩方法 0 = STORE
          lh.setUint16(10, 0, true);           // 修改时间
          lh.setUint16(12, 0, true);           // 修改日期
          lh.setUint32(14, f.crc, true);       // CRC32
          lh.setUint32(18, size, true);        // 压缩后大小
          lh.setUint32(22, size, true);        // 原始大小
          lh.setUint16(26, nameLen, true);     // 文件名长度
          lh.setUint16(28, 0, true);           // 额外字段长度
          localParts.push(new Uint8Array(lh.buffer), f.nameBytes, f.data);

          // ---- 中央目录项 (46 字节 + 文件名) ----
          const ch = new DataView(new ArrayBuffer(46));
          ch.setUint32(0, 0x02014b50, true);   // 中央目录签名
          ch.setUint16(4, 20, true);           // 创建版本
          ch.setUint16(6, 20, true);           // 解压所需版本
          ch.setUint16(8, 0, true);            // 通用标志位
          ch.setUint16(10, 0, true);           // 压缩方法
          ch.setUint16(12, 0, true);           // 修改时间
          ch.setUint16(14, 0, true);           // 修改日期
          ch.setUint32(16, f.crc, true);       // CRC32
          ch.setUint32(20, size, true);        // 压缩后大小
          ch.setUint32(24, size, true);        // 原始大小
          ch.setUint16(28, nameLen, true);     // 文件名长度
          ch.setUint16(30, 0, true);           // 额外字段长度
          ch.setUint16(32, 0, true);           // 注释长度
          ch.setUint16(34, 0, true);           // 起始磁盘号
          ch.setUint16(36, 0, true);           // 内部属性
          ch.setUint32(38, 0, true);           // 外部属性
          ch.setUint32(42, offset, true);      // 本地头偏移
          central.push(new Uint8Array(ch.buffer), f.nameBytes);

          offset += 30 + nameLen + size;
        }

        // 中央目录字节数与起始偏移
        let centralSize = 0;
        for (const p of central) centralSize += p.length;
        const centralOffset = offset;

        // ---- 目录尾记录 (EOCD, 22 字节) ----
        const eocd = new DataView(new ArrayBuffer(22));
        eocd.setUint32(0, 0x06054b50, true);   // EOCD 签名
        eocd.setUint16(4, 0, true);            // 当前磁盘号
        eocd.setUint16(6, 0, true);            // 中央目录起始磁盘号
        eocd.setUint16(8, files.length, true); // 本磁盘目录项数
        eocd.setUint16(10, files.length, true);// 目录项总数
        eocd.setUint32(12, centralSize, true); // 中央目录大小
        eocd.setUint32(16, centralOffset, true);// 中央目录偏移
        eocd.setUint16(20, 0, true);           // 注释长度

        const parts = localParts.concat(central, [new Uint8Array(eocd.buffer)]);
        return new Blob(parts, { type: 'application/zip' });
      }
    };
  }

  /* ============================================================
   * 会话结构：线程重建 + 回合分组
   * ========================================================== */

  function buildThread(conv) {
    const map = conv.mapping;
    const out = [];
    let cur = conv.current_node;
    while (cur) {
      const node = map[cur];
      if (node && node.message) out.push(node);
      cur = node ? node.parent : null;
    }
    return out.reverse();
  }

  // 把线程按"用户提问 → 之后的助手/工具回复"切成一个个回合
  function groupTurns(thread) {
    const turns = [];
    let cur = null;
    for (const node of thread) {
      const m = node.message;
      const role = m.author && m.author.role;
      const ct = m.content && m.content.content_type;
      if (role === 'user' && (ct === 'text' || ct === 'multimodal_text')) {
        cur = { question: node, answers: [] };
        turns.push(cur);
      } else if (cur) {
        cur.answers.push(node);
      }
    }
    return turns;
  }

  /* ============================================================
   * 渲染
   * ========================================================== */

  function extractText(node) {
    if (!node) return '';
    const parts = (node.message.content && node.message.content.parts) || [];
    return parts.filter((p) => typeof p === 'string').join(' ').replace(PUA, '').trim();
  }

  // image_group 里挑一张要用的图 URL（与 renderRef 保持一致）
  function pickImageUrl(ir) {
    return (ir && (ir.content_url || ir.original_content_url || ir.thumbnail_url)) || null;
  }

  // 收集回合内所有 ChatGPT 托管图的 file id
  function collectFileIds(turn, includeQuestion) {
    const ids = new Set();
    const scan = (node) => {
      if (!node || !node.message) return;
      // 跳过 tool 节点：其 image_asset_pointer 指向文档内嵌图（sediment://…#file_xxx#p_N…），
      // 不是独立可下载文件，且该节点内容在渲染时已整体剥离，避免无谓下载失败。
      if (node.message.author && node.message.author.role === 'tool') return;
      const parts = node.message.content && node.message.content.parts;
      if (!Array.isArray(parts)) return;
      for (const p of parts) {
        if (p && p.content_type === 'image_asset_pointer') {
          const fid = extractFileId(p.asset_pointer);
          if (fid) ids.add(fid);
        }
      }
    };
    turn.answers.forEach(scan);
    if (includeQuestion) scan(turn.question);
    return [...ids];
  }

  // 收集回合内所有搜索配图（image_group）的 CDN 图片 URL
  function collectSearchImageUrls(turn) {
    const urls = new Set();
    for (const node of turn.answers) {
      const refs = (node.message.metadata && node.message.metadata.content_references) || [];
      for (const r of refs) {
        if (r.type !== 'image_group') continue;
        for (const im of (r.images || [])) {
          const u = pickImageUrl(im && im.image_result);
          if (u) urls.add(u);
        }
      }
    }
    return [...urls];
  }

  // 收集回合内用户上传的文档附件（PDF/docx/txt 等）：来自 message.metadata.attachments[]。
  // 过滤掉 image/* —— 上传的图片已由 image_asset_pointer 通路处理，避免重复。
  // 附件通常挂在用户提问节点上；为稳妥也扫答复节点。返回 [{ id, name, mime, size }]。
  function collectAttachments(turn, includeQuestion) {
    const seen = new Set();
    const list = [];
    const scan = (node) => {
      const md = node && node.message && node.message.metadata;
      const atts = md && md.attachments;
      if (!Array.isArray(atts)) return;
      for (const a of atts) {
        if (!a || !a.id || seen.has(a.id)) continue;
        const mime = a.mime_type || '';
        if (mime.indexOf('image/') === 0) continue; // 图片走图片通路
        seen.add(a.id);
        list.push({ id: a.id, name: a.name || a.id, mime: mime, size: a.size });
      }
    };
    turn.answers.forEach(scan);
    if (includeQuestion) scan(turn.question);
    return list;
  }

  // 拉取文档附件，返回 blobs 缓存：id -> { blob, name, mime }
  async function fetchAttachmentBlobs(atts) {
    const blobs = {};
    if (!atts.length) return blobs;
    const tasks = atts.map((a) => (async () => {
      try {
        const info = await API.getFileInfo(a.id);
        if (info.download_url) {
          const b = await gmFetchBlob(info.download_url);
          blobs[a.id] = { blob: b, name: a.name, mime: b.type || a.mime || info.mime_type || '' };
        }
      } catch (e) { console.warn('[gpt-craber] 附件下载失败', a.id, a.name, e); }
    })());
    await Promise.all(tasks);
    return blobs;
  }

  // 拉取回合内所有图片，返回 blobs 缓存：key -> { blob, mime }
  // key：托管图用 fileId，搜索配图用 URL（两类不冲突）
  async function fetchImageBlobs(turn, includeQuestion, onProgress) {
    const blobs = {};
    if (!settings.embedImages) return blobs;
    const ids = collectFileIds(turn, includeQuestion);
    const urls = collectSearchImageUrls(turn);
    const total = ids.length + urls.length;
    let done = 0;
    const tick = () => { done++; if (onProgress) onProgress(done, total); };

    const tasks = [];
    for (const fid of ids) {
      tasks.push((async () => {
        try {
          const info = await API.getFileInfo(fid);
          if (info.download_url) {
            const b = await gmFetchBlob(info.download_url);
            blobs[fid] = { blob: b, mime: b.type || info.mime_type || 'image/png' };
          }
        } catch (e) { console.warn('[gpt-craber] 托管图下载失败', fid, e); }
        finally { tick(); }
      })());
    }
    for (const url of urls) {
      tasks.push((async () => {
        try {
          const b = await gmFetchBlob(url);
          blobs[url] = { blob: b, mime: b.type || 'image/png' };
        } catch (e) { console.warn('[gpt-craber] 搜索配图下载失败', url, e); }
        finally { tick(); }
      })());
    }
    await Promise.all(tasks);
    return blobs;
  }

  // sink：把 blob 落地成 markdown 里的 src 字符串
  // - dataUriSink：转 base64（单条自包含导出用）
  // - makeZipImageSink：写进 zip 的 images/ 文件夹，返回相对路径（批量用）
  function makeDataUriSink() {
    const seen = {};
    return {
      async add(key, blob) {
        if (seen[key]) return seen[key];
        const uri = await blobToDataURI(blob);
        seen[key] = uri;
        return uri;
      }
    };
  }
  // prefix：写入 zip 时的目录前缀（多会话导出时用 "序号_标题/"）。
  // md 里始终用相对路径 images/...（README.md 与 images/ 同级），
  // 因此写盘路径 = prefix + 相对路径，md 引用 = 相对路径。
  function makeZipImageSink(zip, prefix) {
    const seen = {};
    const usedFiles = {};
    let n = 0;
    const pre = prefix || '';
    return {
      async add(key, blob, mime) {
        if (seen[key]) return seen[key];
        const ext = extFromMime(mime) || 'png';
        const rel = 'images/img_' + (++n) + '.' + ext; // md 引用（相对）
        const buf = new Uint8Array(await blob.arrayBuffer());
        zip.add(pre + rel, buf); // 写盘（带前缀）
        seen[key] = rel;
        return rel;
      },
      // 文档附件：写进 files/ 目录，用原始文件名（去掉路径分隔符），返回相对路径。
      // md 里以 [📎 名称](files/名称) 链接引用。
      async addFile(key, blob, name) {
        if (seen['f:' + key]) return seen['f:' + key];
        const safe = sanitizeFilePart(name) || 'file';
        const dot = safe.lastIndexOf('.');
        const base = dot > 0 ? safe.slice(0, dot) : safe;
        const ext = dot > 0 ? safe.slice(dot) : '';
        let fileName = safe;
        let suffix = 1;
        while (usedFiles[fileName]) fileName = base + ' (' + (++suffix) + ')' + ext;
        usedFiles[fileName] = true;
        const rel = 'files/' + fileName;
        const buf = new Uint8Array(await blob.arrayBuffer());
        zip.add(pre + rel, buf);
        const out = { href: rel, name: name };
        seen['f:' + key] = out;
        return out;
      }
    };
  }

  // 把 blobs 缓存经 sink 解析成 key -> src 字符串，供渲染器直接读取
  async function resolveImageCache(blobs, sink) {
    const cache = {};
    if (!sink) return cache;
    for (const key of Object.keys(blobs)) {
      const { blob, mime } = blobs[key];
      try { cache[key] = await sink.add(key, blob, mime); }
      catch (e) { console.warn('[gpt-craber] 图片落地失败', key, e); }
    }
    return cache;
  }

  // 把附件 blobs 经 sink 写入 zip，缓存 id -> { href, name }。
  // 没有 addFile 的 sink（例如预览）只保留附件元数据，不触发下载链接。
  async function resolveAttachmentCache(blobs, sink) {
    const cache = {};
    if (!sink || typeof sink.addFile !== 'function') return cache;
    for (const key of Object.keys(blobs)) {
      const { blob, name, mime } = blobs[key];
      try { cache[key] = await sink.addFile(key, blob, name, mime); }
      catch (e) { console.warn('[gpt-craber] 附件落地失败', key, name, e); }
    }
    return cache;
  }

  // 渲染 assistant/text，处理 content_references 引用标记
  function renderAssistantText(m, cache) {
    let text = ((m.content && m.content.parts) || []).filter((p) => typeof p === 'string').join('');
    const refs = (m.metadata && m.metadata.content_references) || [];

    // 用 start_idx/end_idx 精确替换，从后往前避免位移
    const indexed = refs
      .filter((r) => Number.isInteger(r.start_idx) && Number.isInteger(r.end_idx) && r.end_idx >= r.start_idx)
      .sort((a, b) => b.start_idx - a.start_idx);

    for (const r of indexed) {
      const rep = renderRef(r, cache);
      text = text.slice(0, r.start_idx) + rep + text.slice(r.end_idx);
    }
    // 兜底：清掉残留私有区字符
    text = text.replace(PUA, '');
    return text;
  }

  function renderRef(r, cache) {
    switch (r.type) {
      case 'grouped_webpages': {
        const items = r.items || [];
        const links = items
          .filter((it) => it && it.url)
          .map((it) => '[' + (it.attribution || it.title || '来源') + '](' + it.url + ')');
        return links.length ? ' (' + links.join(', ') + ')' : '';
      }
      case 'image_group': {
        const imgs = (r.images || []);
        let out = '';
        for (const im of imgs) {
          const ir = (im && im.image_result) || {};
          const imgUrl = pickImageUrl(ir);
          if (!imgUrl) continue;
          // 若已 base64 缓存则内嵌，否则退回外链
          const src = (cache && cache[imgUrl]) || imgUrl;
          const alt = (ir.title || '').replace(PUA, '').replace(/[\[\]]/g, '');
          const srcUrl = ir.url; // 图片来源页
          // 图片与来源分两行：嵌套语法 [![](本地)](链接) 多数渲染器不支持，
          // 会导致整段不渲染成图、只显示原始文本。
          out += '\n\n![' + alt + '](' + src + ')\n';
          if (srcUrl) out += '\n> 来源：[' + (alt || srcUrl) + '](' + srcUrl + ')\n';
        }
        return out;
      }
      case 'sources_footnote':
      case 'hidden':
      default:
        return '';
    }
  }

  function renderMultimodalParts(parts, cache) {
    let out = '';
    for (const p of parts || []) {
      if (typeof p === 'string') {
        if (p.trim()) out += p.replace(PUA, '').trim() + '\n\n';
      } else if (p && p.content_type === 'image_asset_pointer') {
        const fid = extractFileId(p.asset_pointer);
        const src = fid && cache[fid];
        if (src) out += '![image](' + src + ')\n\n';
        else out += '<!-- 图片未能内嵌: ' + (fid || '未知') + ' -->\n\n';
      }
    }
    return out;
  }

  function escapeMarkdownLinkText(s) {
    return String(s || '').replace(/([\\[\\]\\\\])/g, '\\$1');
  }

  function encodeMarkdownPath(path) {
    return String(path || '').split('/').map((part) => encodeURIComponent(part)).join('/');
  }

  // 预览只列出文件名；实际导出时，成功下载的附件会成为 files/ 下的相对链接。
  function renderAttachments(atts, cache, attemptedDownload) {
    if (!atts.length) return '';
    let out = '### 附件\n\n';
    for (const att of atts) {
      const label = escapeMarkdownLinkText(att.name);
      const saved = cache[att.id];
      if (saved && saved.href) out += '- [📎 ' + label + '](' + encodeMarkdownPath(saved.href) + ')\n';
      else out += '- 📎 ' + label + (attemptedDownload ? '（下载失败）' : '') + '\n';
    }
    return out + '\n';
  }

  function renderAnswerNode(node, cache) {
    const m = node.message;
    const role = m.author && m.author.role;
    const ct = m.content && m.content.content_type;

    // tool 角色是工具调用结果（如上传文档解析出的全文复述、代码执行等），
    // 不是模型对用户的回答，直接跳过，避免整篇文档复述混进导出。
    if (role === 'tool') return '';

    if (role === 'assistant' && ct === 'text') {
      const t = renderAssistantText(m, cache).trim();
      return t ? t + '\n\n' : '';
    }
    if (ct === 'multimodal_text') {
      return renderMultimodalParts(m.content.parts, cache);
    }
    if (role === 'assistant' && ct === 'code' && settings.includeCode) {
      const lang = m.content.language && m.content.language !== 'unknown' ? m.content.language : '';
      return '```' + lang + '\n' + (m.content.text || '') + '\n```\n\n';
    }
    return '';
  }

  function collectSources(turn) {
    const seen = new Set();
    const list = [];
    for (const node of turn.answers) {
      const refs = (node.message.metadata && node.message.metadata.content_references) || [];
      for (const r of refs) {
        const items = r.items || r.sources || [];
        for (const it of items) {
          if (!it || !it.url || seen.has(it.url)) continue;
          seen.add(it.url);
          list.push({ url: it.url, title: it.title || it.attribution || it.url, attr: it.attribution || '' });
        }
      }
    }
    return list;
  }

  // 渲染一个回合为 markdown。返回 { title, md }
  // sink：决定图片如何落地（base64 内嵌 / 写入 zip 的 images/）。默认 base64。
  // opts.forceQuestion：无视 settings.mode 强制带上用户提问（单条导出用——
  //   一段答案脱离对应问题就失去了上下文，所以单独导出时始终附问题）。
  // opts.downloadAttachments：预览传 false，仅列出附件名称，不下载大文件。
  async function renderTurn(turn, onProgress, sink, opts) {
    const withQuestion = settings.mode === 'qa' || !!(opts && opts.forceQuestion);
    const theSink = sink || makeDataUriSink();
    const blobs = await fetchImageBlobs(turn, withQuestion, onProgress);
    const cache = await resolveImageCache(blobs, theSink);
    const attachments = withQuestion ? collectAttachments(turn, true) : [];
    const downloadAttachments = !(opts && opts.downloadAttachments === false);
    // 用户上传的文档附件：下载并经 sink 落地（zip 写 files/）。
    const attBlobs = downloadAttachments ? await fetchAttachmentBlobs(attachments) : {};
    const attCache = await resolveAttachmentCache(attBlobs, theSink);

    const title = extractText(turn.question);
    let md = '';

    if (withQuestion) {
      md += '## 🧑 问题\n\n';
      md += (title || '(空)') + '\n\n';
      const qParts = turn.question && turn.question.message.content && turn.question.message.content.parts;
      if (Array.isArray(qParts)) {
        const imgs = renderMultimodalParts(qParts.filter((p) => p && p.content_type === 'image_asset_pointer'), cache);
        if (imgs) md += imgs;
      }
      // 上传的文档：以 [📎 名称](链接) 列出（附件通常挂在问题上）
      const attMd = renderAttachments(attachments, attCache, downloadAttachments);
      if (attMd) md += attMd;
      md += '## 🤖 回答\n\n';
    }

    for (const node of turn.answers) {
      md += renderAnswerNode(node, cache);
    }

    if (settings.sourcesFooter) {
      const src = collectSources(turn);
      if (src.length) {
        md += '\n---\n\n## 参考来源\n\n';
        src.forEach((s, i) => {
          md += (i + 1) + '. [' + s.title + '](' + s.url + ')' + (s.attr ? ' — ' + s.attr : '') + '\n';
        });
        md += '\n';
      }
    }

    return { title, md: md.trim() + '\n' };
  }

  // 把整个会话渲染成单个 markdown。sink 决定图片落地方式（多会话时指向该会话子目录）。
  // 复用 renderTurn，逐回合渲染后连结，顶部加会话标题。
  async function renderConversationToMd(conv, sink, onProgress, opts) {
    const thread = buildThread(conv);
    const turns = groupTurns(thread);
    let md = '# ' + (conv.title || '未命名会话') + '\n\n';
    let done = 0;
    for (let i = 0; i < turns.length; i++) {
      const r = await renderTurn(turns[i], null, sink, opts);
      md += r.md.trim() + '\n\n---\n\n';
      done++;
      if (onProgress) onProgress(done, turns.length);
    }
    // 去掉末尾多余的分隔线
    md = md.replace(/\n+---\n+$/, '\n');
    return { title: conv.title || '未命名会话', md: md.trim() + '\n', turnCount: turns.length };
  }

  /* ============================================================
   * 状态：按 convId 缓存会话结构
   * ========================================================== */

  let state = { convId: null, conv: null, turns: [], nodeIndex: {} };

  async function ensureState(force) {
    const convId = getConvId();
    if (!convId) throw new Error('请先打开一个具体对话（URL 含 /c/...）');
    if (!force && state.convId === convId && state.conv) return state;

    const conv = await API.getConversation(convId);
    const thread = buildThread(conv);
    const turns = groupTurns(thread);
    const nodeIndex = {};
    turns.forEach((t) => {
      if (t.question) nodeIndex[t.question.message.id] = t;
      t.answers.forEach((a) => { nodeIndex[a.message.id] = t; });
    });
    state = { convId, conv, turns, nodeIndex };
    return state;
  }

  /* ============================================================
   * 导出动作
   * ========================================================== */

  // 用原生 TextEncoder 把字符串转字节，绕开 JSZip 的慢速 JS UTF-8 编码
  const _enc = new TextEncoder();

  async function exportSingleByMessageId(messageId) {
    const st = await ensureState();
    const turn = st.nodeIndex[messageId];
    if (!turn) throw new Error('未在会话结构中找到该消息，试试刷新页面');

    // 单条导出强制带上对应的用户提问（即便全局模式是"仅 AI 回复"），
    // 否则单独一段答案脱离问题就没有上下文。
    // 判断是否含图或上传文档；任一存在时打成 zip，把资源分别写进 images/、files/。
    // Markdown 用相对路径引用，避免把图片或文档塞进单文件的 data URI。
    // 纯文字回合再套 zip 反而累赘，仍旧直接下 .md。
    // 单条导出始终带问题，故数图时也把问题里的图算进去（第二参传 true），
    // 与 renderTurn 的 forceQuestion 保持一致，避免漏判问题图而退回 base64。
    const hasImages = settings.embedImages &&
      (collectFileIds(turn, true).length > 0 || collectSearchImageUrls(turn).length > 0);
    const hasAttachments = collectAttachments(turn, true).length > 0;

    if (hasImages || hasAttachments) {
      const zip = createZip();
      const sink = makeZipImageSink(zip); // 资源写入 images/、files/，md 引用相对路径
      const { title, md } = await renderTurn(turn, null, sink, { forceQuestion: true });
      zip.add(sanitizeFilename(title) + '.md', _enc.encode(md));
      triggerDownload(zip.generate(), sanitizeFilename(title) + '.zip');
      return;
    }

    const { title, md } = await renderTurn(turn, null, null, { forceQuestion: true });
    triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }), sanitizeFilename(title) + '.md');
  }

  async function exportBatch(selectedTurns, onProgress) {
    // 只选一轮时，含附件则必须打 zip，确保原文件独立落在 files/；否则仍导出单个 md。
    if (selectedTurns.length === 1) {
      const turn = selectedTurns[0];
      const includeQuestion = settings.mode === 'qa';
      const hasAttachments = includeQuestion && collectAttachments(turn, true).length > 0;
      const seq = (state.turns ? state.turns.indexOf(turn) : -1) + 1;
      const pad1 = String((state.turns && state.turns.length) || 1).length;
      const prefix = seq > 0 ? String(seq).padStart(pad1, '0') + '_' : '';
      if (hasAttachments) {
        const zip = createZip();
        const sink = makeZipImageSink(zip);
        const { title, md } = await renderTurn(turn, onProgress, sink);
        zip.add(prefix + sanitizeFilename(title) + '.md', _enc.encode(md));
        triggerDownload(zip.generate(), prefix + sanitizeFilename(title) + '.zip');
        return;
      }
      const sink = makeDataUriSink(); // 单文件无处放 images/ 目录，图片以 data URI 内嵌
      const { title, md } = await renderTurn(turn, onProgress, sink);
      if (onProgress) onProgress(1, 1);
      const blob = new Blob([_enc.encode(prefix + sanitizeFilename(title) + '\n' && md) || md], { type: 'text/markdown' });
      triggerDownload(new Blob([md], { type: 'text/markdown' }), prefix + sanitizeFilename(title) + '.md');
      return;
    }
    const zip = createZip(); // 内联 STORE 打包器，零依赖零 eval，不触发 CSP
    const sink = makeZipImageSink(zip); // 图片以原始二进制写入 images/，md 用相对路径引用
    const used = {};
    // 序号按回合在整个对话中的真实顺序，补零对齐（跳选也保持全局一致，文件名可正确排序）
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
    const blob = zip.generate(); // 同步产出 Blob（纯数据操作，STORE 不压缩，很快）
    const zipName = sanitizeFilename(state.conv && state.conv.title) || 'chatgpt-export';
    triggerDownload(blob, zipName + '.zip');
  }

  /* ============================================================
   * 多会话：列表获取与批量导出
   * ========================================================== */

  // 分页拉取全部会话（title/id/时间等），自动翻页直到取完 total
  async function fetchAllConversations(onProgress) {
    const pageSize = 50;
    let offset = 0;
    let total = Infinity;
    const all = [];
    while (offset < total) {
      const page = await API.getConversations(offset, pageSize);
      total = page.total != null ? page.total : all.length;
      const items = page.items || [];
      for (const it of items) all.push(it);
      if (onProgress) onProgress(all.length, total);
      if (!items.length) break; // 兜底：空页则停，避免死循环
      offset += pageSize;
    }
    return all;
  }

  // 判断会话是否属于某个“项目”：gizmo_id 以 g-p- 开头（p = project）。
  function getProjectGizmoId(meta) {
    const gid = meta && meta.gizmo_id;
    return (gid && gid.indexOf('g-p-') === 0) ? gid : null;
  }

  // 导出多个会话：每个会话合并为单个 md，放进以会话标题命名的子文件夹，
  // 子文件夹内含 images/（该会话的图片）。属于“项目”的会话再套一层项目名文件夹，
  // 无项目的会话直接放在 zip 根。全部打进一个 zip。
  async function exportConversations(convMetas, onProgress) {
    const zip = createZip();
    const usedDir = {};        // 每个父目录下的子文件夹名去重：key = parent + '||' + name
    const pad = String(convMetas.length).length;

    // 取项目文件夹名（带序号前缀无意义，这里直接用项目名并做文件名清理），失败则回退到 id
    const projectDirName = async (gid) => {
      let name = null;
      try { name = await API.getGizmoName(gid); } catch (e) { /* 忽略，回退 */ }
      return sanitizeFilename(name || gid);
    };

    let done = 0;
    for (let idx = 0; idx < convMetas.length; idx++) {
      const meta = convMetas[idx];
      const seq = String(idx + 1).padStart(pad, '0');

      if (onProgress) onProgress(done, convMetas.length, '获取：' + (meta.title || meta.id).slice(0, 20));

      // 确定父目录：项目会话 -> 项目名/，否则根目录（空前缀）
      let parent = '';
      const pgid = getProjectGizmoId(meta);
      if (pgid) parent = (await projectDirName(pgid)) + '/';

      // 子文件夹名：序号_标题，在同一父目录下去重
      let leaf = seq + '_' + sanitizeFilename(meta.title || '未命名');
      const dedupKey = parent + '||' + leaf;
      if (usedDir[dedupKey] != null) { usedDir[dedupKey]++; leaf = leaf + ' (' + usedDir[dedupKey] + ')'; }
      else usedDir[dedupKey] = 0;
      const dir = parent + leaf;

      try {
        const conv = await API.getConversation(meta.id);
        // 图片写入该会话子文件夹下的 images/
        const sink = makeZipImageSink(zip, dir + '/');
        const { md } = await renderConversationToMd(conv, sink);
        zip.add(dir + '/' + sanitizeFilename(meta.title || conv.title || '会话') + '.md', _enc.encode(md));
      } catch (e) {
        console.warn('[gpt-craber] 会话导出失败', meta.id, e);
        // 失败的会话留一个说明文件，不中断整体
        zip.add(dir + '/_导出失败.txt', _enc.encode('导出失败：' + (e && e.message) + '\n会话 id：' + meta.id + '\n'));
      }
      done++;
      if (onProgress) onProgress(done, convMetas.length);
    }

    if (onProgress) onProgress(convMetas.length, convMetas.length, '打包中…');
    const blob = zip.generate();
    triggerDownload(blob, 'chatgpt-conversations.zip');
  }

  /* ============================================================
   * UI：样式
   * ========================================================== */

  const style = document.createElement('style');
  style.textContent = `
    :root{
      --craber-accent:#10a37f; --craber-accent-2:#0e8e6d;
      --craber-bg:#ffffff; --craber-fg:#1f2328; --craber-sub:#8a9099;
      --craber-line:#ececf0; --craber-hover:#f5f6f8; --craber-ghost:#f1f2f4;
      --craber-skeleton:#eceef1; --craber-skeleton-hi:#f6f7f9;
      /* 导航节点轨道：默认横条 / 次级(n1) / 焦点(n2..n0) 三档色，卡片配色 */
      --craber-nav-bar:#c3c8d0; --craber-nav-bar-mid:#8a9099; --craber-nav-bar-hi:#1f2328;
      --craber-nav-card:#f7f7f8; --craber-nav-card-line:#e3e5e8;
      --craber-nav-strong:#1f2328; --craber-nav-muted:#8a9099;
    }
    @media (prefers-color-scheme:dark){
      :root{
        --craber-bg:#26282c; --craber-fg:#e8eaed; --craber-sub:#9aa0a8;
        --craber-line:#3a3d43; --craber-hover:#2f3237; --craber-ghost:#34373d;
        --craber-skeleton:#33363b; --craber-skeleton-hi:#3c4046;
        --craber-nav-bar:#50555d; --craber-nav-bar-mid:#8e949d; --craber-nav-bar-hi:#e8eaed;
        --craber-nav-card:#2b2d31; --craber-nav-card-line:#3a3d43;
        --craber-nav-strong:#e8eaed; --craber-nav-muted:#9aa0a8;
      }
    }
    /* 平台页面全局滚动条美化：作用于站点本身（非本插件面板，面板选择器更具体不受影响）。
       中性半透明配色，明暗主题下都协调；hover 加深。 */
    html{scrollbar-width:thin;scrollbar-color:rgba(140,145,155,.5) transparent}
    ::-webkit-scrollbar{width:10px;height:10px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(140,145,155,.4);border-radius:8px;
      border:2px solid transparent;background-clip:content-box}
    ::-webkit-scrollbar-thumb:hover{background:rgba(140,145,155,.65);background-clip:content-box}
    ::-webkit-scrollbar-corner{background:transparent}

    @keyframes craber-fade-in{from{opacity:0}to{opacity:1}}
    @keyframes craber-pop-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes craber-shimmer{0%{background-position:-360px 0}100%{background-position:360px 0}}
    @keyframes craber-row-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes craber-spin{to{transform:rotate(360deg)}}

    /* 悬浮球：可拖拽、双击展开菜单。位置由 JS 用 left/top 定位并存 localStorage。
       蟹图标用内联 SVG，蟹身填 currentColor（统一蟹绿），球底半透明毛玻璃。 */
    .craber-fab-ball{position:fixed;z-index:99998;width:52px;height:52px;border-radius:50%;
      background:rgba(255,255,255,.3);color:#22a06b;border:none;cursor:grab;
      display:flex;align-items:center;justify-content:center;
      -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
      box-shadow:0 4px 14px rgba(0,0,0,.22);user-select:none;touch-action:none;
      font-family:system-ui,sans-serif;transition:box-shadow .15s ease,transform .12s ease}
    @media (prefers-color-scheme:dark){.craber-fab-ball{background:rgba(38,40,44,.3)}}
    .craber-fab-ball svg{width:30px;height:30px;pointer-events:none}
    .craber-fab-ball:hover{box-shadow:0 6px 20px rgba(0,0,0,.3)}
    .craber-fab-ball:active{cursor:grabbing}
    .craber-fab-ball.craber-dragging{transition:none;transform:scale(1.08)}
    /* 菜单展开/收起过渡：父级不做透明度过渡（否则整体淡出会盖掉子项交错），
       可见性交给各子项自己的 opacity，父级只用 pointer-events 管交互。 */
    .craber-fab-menu{position:fixed;z-index:99998;display:flex;flex-direction:column;gap:8px;
      pointer-events:none}
    .craber-fab-menu.craber-open{pointer-events:auto}
    .craber-fab-item{background:var(--craber-bg);color:var(--craber-fg);border:none;border-radius:22px;
      padding:11px 18px;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;
      box-shadow:0 4px 14px rgba(0,0,0,.18);font-family:system-ui,sans-serif;
      opacity:0;
      transition:background .15s ease,opacity .24s ease,transform .24s cubic-bezier(.2,.8,.25,1)}
    /* 项的初始位移方向跟随展开方向：向上展开(菜单在球上方)时项从下方滑入(+12px)；
       向下展开时从上方滑入(-12px)。动画方向与展开方向一致。 */
    .craber-fab-menu.craber-up .craber-fab-item{transform:translateY(12px) scale(.9)}
    .craber-fab-menu.craber-down .craber-fab-item{transform:translateY(-12px) scale(.9)}
    .craber-fab-menu.craber-open .craber-fab-item{opacity:1;transform:none}
    /* 交错延迟由 JS 逐项设内联 transition-delay（开合方向不同，见 setMenuOpen）。 */
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
    .craber-search{width:100%;box-sizing:border-box;padding:9px 12px;font-size:13px;
      border:1px solid var(--craber-line);border-radius:10px;background:var(--craber-bg);
      color:var(--craber-fg);outline:none;transition:border-color .15s}
    .craber-search:focus{border-color:var(--craber-accent)}
    .craber-search::placeholder{color:var(--craber-sub)}

    /* 日期筛选行 */
    .craber-filter-row{display:flex;flex-direction:column;gap:8px}
    .craber-date-custom{display:flex;align-items:center;gap:8px;margin-top:2px}
    .craber-date-custom[hidden]{display:none}
    .craber-date-input{padding:7px 10px;font-size:12px;border:1px solid var(--craber-line);
      border-radius:8px;background:var(--craber-bg);color:var(--craber-fg);outline:none;
      color-scheme:light dark;font-family:inherit;cursor:pointer;transition:border-color .15s,box-shadow .15s}
    .craber-date-input:hover{border-color:var(--craber-accent)}
    .craber-date-input:focus{border-color:var(--craber-accent);box-shadow:0 0 0 3px rgba(75,91,214,.12)}
    .craber-date-sep{color:var(--craber-sub);font-size:12px}
    .craber-proj-row{display:flex;align-items:center;gap:8px}
    .craber-proj-row[hidden]{display:none}
    /* 自定义下拉：原生 <select> 弹层由系统绘制，无法美化，改用自绘菜单 */
    .craber-dd{position:relative;flex:1}
    .craber-dd-trigger{width:100%;box-sizing:border-box;display:flex;align-items:center;
      justify-content:space-between;gap:8px;padding:7px 10px;font-size:12px;text-align:left;
      border:1px solid var(--craber-line);border-radius:8px;background:var(--craber-bg);
      color:var(--craber-fg);cursor:pointer;font-family:inherit;
      transition:border-color .15s,box-shadow .15s}
    .craber-dd-trigger:hover{border-color:var(--craber-accent)}
    .craber-dd.open .craber-dd-trigger{border-color:var(--craber-accent);
      box-shadow:0 0 0 3px rgba(75,91,214,.12)}
    .craber-dd-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-dd-caret{flex:none;color:var(--craber-sub);font-size:10px;transition:transform .15s}
    .craber-dd.open .craber-dd-caret{transform:rotate(180deg)}
    /* fixed 定位：坐标/宽度/高度全部由 JS 按触发器位置设置（打开时菜单被移到
       body 顶层，脱离面板 overflow 与 transform 影响）。这里不写死 top/left。 */
    .craber-dd-menu{position:fixed;z-index:2147483647;
      max-height:240px;overflow-y:auto;padding:4px;background:var(--craber-bg);
      border:1px solid var(--craber-line);border-radius:10px;
      box-shadow:0 12px 32px rgba(0,0,0,.16);animation:craber-fade-in .12s ease}
    .craber-dd-menu[hidden]{display:none}
    .craber-dd-opt{display:flex;align-items:center;gap:6px;padding:8px 10px;font-size:12px;
      border-radius:7px;cursor:pointer;color:var(--craber-fg);white-space:nowrap;
      overflow:hidden;text-overflow:ellipsis;transition:background .12s}
    .craber-dd-opt:hover{background:var(--craber-hover)}
    .craber-dd-opt.sel{background:var(--craber-accent);color:#fff}

    /* 选项做成 chip：整块可点，选中高亮 */
    .craber-chip{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;
      padding:7px 12px;border:1px solid var(--craber-line);border-radius:20px;
      color:var(--craber-fg);transition:border-color .15s,background .15s}
    .craber-chip:hover{background:var(--craber-hover)}
    .craber-chip input{position:absolute;opacity:0;width:0;height:0}
    .craber-box{width:16px;height:16px;border:1.5px solid var(--craber-sub);border-radius:5px;
      flex:none;box-sizing:border-box;position:relative;
      transition:background .15s,border-color .15s}
    .craber-chip input[type=radio]+.craber-box{border-radius:50%}
    /* 用 absolute + inset:0 + margin:auto 做绝对居中，不受伪元素 flex 差异影响 */
    .craber-box::after{content:'';position:absolute;opacity:0;transition:opacity .12s}
    /* 勾（chip 与列表项通用）：居中后因旋转视觉重心偏移，向上微调 */
    .craber-chip input[type=checkbox]:checked+.craber-box::after,
    .craber-item input[type=checkbox]:checked+.craber-box::after{
      opacity:1;left:0;right:0;top:-1px;bottom:0;margin:auto;width:4px;height:8px;
      border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
    /* 圆点：inset:0 + margin:auto 完全居中 */
    .craber-chip input[type=radio]:checked+.craber-box::after{
      opacity:1;inset:0;margin:auto;width:6px;height:6px;border-radius:50%;background:#fff}
    .craber-chip input:checked+.craber-box,
    .craber-item input:checked+.craber-box{background:var(--craber-accent);border-color:var(--craber-accent)}
    .craber-chip:has(input:checked){border-color:var(--craber-accent);
      background:color-mix(in srgb,var(--craber-accent) 12%,transparent);color:var(--craber-accent)}
    .craber-chip input:focus-visible+.craber-box{outline:2px solid var(--craber-accent);outline-offset:2px}

    .craber-list{overflow-y:auto;padding:6px 12px;flex:1;min-height:120px}
    /* 细滚动条：作用于列表、下拉菜单、预览正文。Firefox 用 scrollbar-*，WebKit 用伪元素 */
    .craber-list,.craber-dd-menu,.craber-preview-body{
      scrollbar-width:thin;scrollbar-color:var(--craber-line) transparent}
    .craber-list::-webkit-scrollbar,.craber-dd-menu::-webkit-scrollbar,
    .craber-preview-body::-webkit-scrollbar{width:8px;height:8px}
    .craber-list::-webkit-scrollbar-track,.craber-dd-menu::-webkit-scrollbar-track,
    .craber-preview-body::-webkit-scrollbar-track{background:transparent}
    .craber-list::-webkit-scrollbar-thumb,.craber-dd-menu::-webkit-scrollbar-thumb,
    .craber-preview-body::-webkit-scrollbar-thumb{
      background:var(--craber-line);border-radius:8px;border:2px solid transparent;
      background-clip:content-box}
    .craber-list:hover::-webkit-scrollbar-thumb,.craber-dd-menu:hover::-webkit-scrollbar-thumb,
    .craber-preview-body:hover::-webkit-scrollbar-thumb{background:var(--craber-sub);
      background-clip:content-box}
    .craber-item{display:flex;align-items:flex-start;gap:11px;padding:11px 10px;border-radius:10px;
      font-size:13px;cursor:pointer;transition:background .12s;animation:craber-row-in .28s ease both}
    .craber-item:hover{background:var(--craber-hover)}
    .craber-item .craber-box{margin-top:1px}
    .craber-item input{position:absolute;opacity:0;width:0;height:0}
    .craber-item .q{flex:1;line-height:1.5;color:var(--craber-fg);word-break:break-word}
    .craber-item .meta{color:var(--craber-sub);font-size:11px;margin-top:3px}
    .craber-proj{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:10px;
      background:var(--craber-ghost);color:var(--craber-fg);font-size:10px}

    /* 骨架屏 */
    .craber-sk{padding:11px 10px;display:flex;gap:11px;align-items:flex-start}
    .craber-sk .b{border-radius:6px;
      background:linear-gradient(90deg,var(--craber-skeleton) 25%,var(--craber-skeleton-hi) 37%,var(--craber-skeleton) 63%);
      background-size:720px 100%;animation:craber-shimmer 1.3s linear infinite}
    .craber-sk .box{width:16px;height:16px;border-radius:5px;flex:none;margin-top:1px}
    .craber-sk .lines{flex:1}
    .craber-sk .l1{height:12px;width:82%;margin-bottom:8px}
    .craber-sk .l2{height:9px;width:38%}

    .craber-empty{padding:36px 18px;text-align:center;color:var(--craber-sub);font-size:13px}

    /* 导航节点：常驻页面左侧的节点轨道。竖排小横条，hover / 键盘聚焦弹出节点卡片。
       命中区（button 本身）尺寸固定，只负责撑住轨道布局；视觉横条画在 ::before 上。
       这样鱼眼放大只改伪元素，不会引起轨道重排把相邻节点顶得上下抖动。
       命中区高度 = --nav-pitch，节点多时由 JS 压缩，尽量一屏排完。
       轨道本身 pointer-events:none：它是一条盖在正文上的固定竖条，只让小横条吃事件，
       内边距区域不再抢走对话文本的点击（:hover / mouseleave 由子元素冒泡照常触发）。 */
    .craber-nav-rail{position:fixed;top:50%;transform:translateY(-50%);z-index:99990;
      display:flex;flex-direction:column;align-items:flex-start;
      max-height:74vh;overflow-y:auto;padding:8px 12px 8px 4px;
      scrollbar-width:none;pointer-events:none;opacity:.7;transition:opacity .2s ease}
    .craber-nav-rail::-webkit-scrollbar{display:none}
    .craber-nav-rail:hover,.craber-nav-rail:focus-within{opacity:1}
    .craber-nav-bar{position:relative;flex:none;display:block;width:24px;
      height:var(--nav-pitch,11px);min-height:5px;padding:0;border:none;background:none;
      pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .craber-nav-bar::before{content:'';position:absolute;left:0;top:50%;
      width:15px;height:3px;border-radius:2px;transform:translateY(-50%);
      background:var(--craber-nav-bar);
      transition:width .26s cubic-bezier(.34,1.4,.64,1),height .26s cubic-bezier(.34,1.4,.64,1),
        opacity .2s ease,background-color .2s ease}
    .craber-nav-bar:focus{outline:none}
    .craber-nav-bar:focus-visible::before{box-shadow:0 0 0 2px var(--craber-accent)}
    /* 当前阅读位置：跟随页面滚动联动，不再只在点击后才亮 */
    .craber-nav-bar.active::before{width:22px;background:var(--craber-accent)}
    /* 鱼眼：焦点节点 n0，两侧按距离递减 n1/n2，其余淡出。这几条与上面的淡出规则
       特异度相同，靠源序覆盖，顺序不能调。will-change 只在交互期间加，
       避免长会话常驻几十个合成层。 */
    .craber-nav-rail.craber-focus .craber-nav-bar::before{opacity:.32;will-change:width,height}
    .craber-nav-rail.craber-focus .craber-nav-bar.active::before{opacity:.85}
    .craber-nav-rail .craber-nav-bar.n2::before{width:17px;opacity:.55}
    .craber-nav-rail .craber-nav-bar.n1::before{width:20px;height:4px;opacity:.8;
      background:var(--craber-nav-bar-mid)}
    .craber-nav-rail .craber-nav-bar.n0::before{width:28px;height:5px;opacity:1;
      background:var(--craber-nav-bar-hi)}
    .craber-nav-rail .craber-nav-bar.active.n0::before{opacity:1;background:var(--craber-accent)}
    /* 卡片拆两层：外层只管定位，用 transform 走合成器 —— 原来过渡 left/top，
       每帧都要重新布局，和 ChatGPT 自己那堆 forced reflow 抢主线程，扫轨道时会顿。
       内层管外观和出现/换内容的动画，这样两个 transform 不会互相覆盖。
       --cdur 由 JS 按位移距离写入：相邻节点只差十几像素，固定 160ms 显得黏；
       从头扫到尾要跨几百像素，太快又像闪现。 */
    .craber-nav-card{position:fixed;left:0;top:0;z-index:99991;width:340px;max-width:74vw;
      cursor:pointer;font-family:system-ui,sans-serif;
      transform:translate3d(var(--cx,0px),var(--cy,0px),0);
      transition:transform var(--cdur,160ms) cubic-bezier(.22,.85,.3,1)}
    .craber-nav-card-in{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;
      background:var(--craber-nav-card);border:1px solid var(--craber-nav-card-line);
      border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.16);
      animation:craber-card-in .18s cubic-bezier(.2,.8,.25,1)}
    /* 换节点时文字是瞬间替换的，卡片还没滑到位就已经显示新内容 —— 这一帧最露馅，
       用一次短促淡入盖掉。动画式而非状态式，连续快速切换也不会卡在半透明。 */
    .craber-nav-card.swap .craber-nav-card-in{animation:craber-card-swap .16s ease-out}
    @keyframes craber-card-in{from{opacity:0;transform:translateX(-6px) scale(.985)}
      to{opacity:1;transform:none}}
    @keyframes craber-card-swap{from{opacity:.4}to{opacity:1}}
    .craber-nav-card[hidden]{display:none}
    .craber-nav-main{flex:1;min-width:0}
    .craber-nav-title{font-size:13px;font-weight:700;color:var(--craber-nav-strong);line-height:1.45;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-nav-preview{font-size:12px;color:var(--craber-nav-muted);line-height:1.5;margin-top:2px;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
      word-break:break-word}
    .craber-nav-num{flex:none;font-size:11px;color:var(--craber-nav-muted);padding-top:3px}
    /* 定位提示：一次性扩散高亮。原来是常驻 outline + offset，会让目标看起来被
       "撑"了一下，且同一节点连点两次不再有反馈（class 已经在了）。
       内圈那层 inset 是必要的：外扩的光圈一旦碰上 overflow:hidden 的祖先就被裁掉，
       什么也看不见；inset 画在元素自己的背景之上，任何布局下都在。 */
    @keyframes craber-nav-flash{
      0%{box-shadow:0 0 0 0 rgba(16,163,127,.5), inset 0 0 0 2px rgba(16,163,127,.3)}
      30%{box-shadow:0 0 0 8px rgba(16,163,127,.18), inset 0 0 0 2px rgba(16,163,127,.26)}
      100%{box-shadow:0 0 0 14px rgba(16,163,127,0), inset 0 0 0 2px rgba(16,163,127,0)}}
    .craber-nav-flash{animation:craber-nav-flash 1.4s ease-out}
    .craber-nav-flash-box{border-radius:14px}

    /* 更多节点按钮（当总回合数 > 30 时分别显示在最上方和最下方） */
    .craber-nav-more-btn{position:relative;flex:none;display:flex;align-items:center;justify-content:center;
      width:24px;height:18px;padding:0;border:none;background:none;
      cursor:pointer;pointer-events:auto;color:var(--craber-nav-bar-mid);
      transition:color .2s ease,transform .2s ease;-webkit-tap-highlight-color:transparent}
    .craber-nav-more-top{margin-bottom:4px}
    .craber-nav-more-bottom{margin-top:4px}
    .craber-nav-more-btn::before{content:'···';font-size:16px;font-weight:900;line-height:1;letter-spacing:1px;
      color:var(--craber-nav-bar-mid);transition:color .2s ease,transform .2s ease}
    .craber-nav-more-btn:hover::before{color:var(--craber-accent);transform:scale(1.2)}
    .craber-nav-more-btn.active::before{color:var(--craber-accent);filter:drop-shadow(0 0 4px var(--craber-accent))}
    .craber-nav-more-btn:focus{outline:none}
    .craber-nav-more-btn:focus-visible::before{box-shadow:0 0 0 2px var(--craber-accent)}

    /* 全量节点列表悬浮面板（卡片形式并支持搜索） */
    .craber-nav-panel{position:fixed;z-index:99992;width:380px;max-width:85vw;max-height:calc(100vh - 28px);
      background:var(--craber-bg);border:1px solid var(--craber-line);border-radius:14px;
      box-shadow:0 12px 38px rgba(0,0,0,.22);display:flex;flex-direction:column;
      font-family:system-ui,sans-serif;color:var(--craber-fg);
      animation:craber-card-in .2s cubic-bezier(.2,.8,.25,1);overflow:hidden}
    .craber-nav-panel[hidden]{display:none !important}
    .craber-nav-panel-hd{padding:10px 14px;border-bottom:1px solid var(--craber-line);
      display:flex;flex-direction:column;gap:8px;background:var(--craber-hover)}
    .craber-nav-panel-title-row{display:flex;align-items:center;justify-content:space-between;
      font-size:13px;font-weight:700;color:var(--craber-fg)}
    .craber-nav-panel-badge{font-size:11px;font-weight:500;color:var(--craber-sub);
      background:var(--craber-bg);padding:2px 7px;border-radius:10px;border:1px solid var(--craber-line)}
    .craber-nav-search-wrap{position:relative;display:flex;align-items:center}
    .craber-nav-search{width:100%;box-sizing:border-box;padding:7px 10px 7px 28px;font-size:12.5px;
      color:var(--craber-fg);background:var(--craber-bg);border:1px solid var(--craber-line);
      border-radius:8px;outline:none;transition:border-color .15s}
    .craber-nav-search:focus{border-color:var(--craber-accent)}
    .craber-nav-search-icon{position:absolute;left:8px;width:14px;height:14px;color:var(--craber-sub);
      pointer-events:none;display:flex;align-items:center;justify-content:center}
    .craber-nav-search-icon svg{width:13px;height:13px;fill:currentColor}
    .craber-nav-panel-list{flex:1;overflow-y:auto;padding:4px 0;scrollbar-width:thin}
    .craber-nav-panel-item{padding:8px 12px;max-height:68px;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;gap:3px;
      transition:background .12s;border-left:3px solid transparent;overflow:hidden}
    .craber-nav-panel-item:hover{background:var(--craber-hover)}
    .craber-nav-panel-item.active{background:var(--craber-hover);border-left-color:var(--craber-accent)}
    .craber-nav-panel-item-hd{display:flex;align-items:baseline;gap:6px;min-width:0}
    .craber-nav-panel-item-num{font-size:11px;font-weight:700;color:var(--craber-accent);flex:none}
    .craber-nav-panel-item-title{font-size:12px;font-weight:600;color:var(--craber-fg);flex:1;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-nav-panel-item-preview{font-size:11px;color:var(--craber-sub);line-height:1.4;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
    .craber-nav-panel-empty{padding:28px 16px;text-align:center;font-size:12px;color:var(--craber-sub)}

    /* 轻提示条：次要反馈（如目标消息尚未挂载）用它，不再用 alert 打断阅读 */
    .craber-toast{position:fixed;left:50%;bottom:84px;z-index:2147483647;pointer-events:none;
      max-width:70vw;background:#2f2f2f;color:#fff;font-size:12.5px;line-height:1.5;
      padding:9px 14px;border-radius:10px;box-shadow:0 6px 22px rgba(0,0,0,.28);
      font-family:system-ui,sans-serif;opacity:0;
      transform:translateX(-50%) translateY(6px);
      transition:opacity .16s ease,transform .16s ease}
    .craber-toast.show{opacity:1;transform:translateX(-50%)}

    @media (prefers-reduced-motion:reduce){
      .craber-nav-bar::before,.craber-nav-card{transition:none;animation:none}
      .craber-nav-card-in,.craber-nav-card.swap .craber-nav-card-in{animation:none}
      /* 关掉动画不等于不给反馈：改成静止光圈，class 到时会自己摘掉。 */
      .craber-nav-flash{animation:none;
        box-shadow:0 0 0 3px rgba(16,163,127,.45), inset 0 0 0 2px rgba(16,163,127,.28)}
    }

    .craber-ft{padding:13px 20px;border-top:1px solid var(--craber-line);
      display:flex;align-items:center;gap:10px}
    .craber-ft .spacer{flex:1}
    .craber-btn{border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:500;
      cursor:pointer;transition:background .15s,transform .1s,opacity .15s}
    .craber-btn:active{transform:scale(.97)}
    .craber-btn.primary{background:var(--craber-accent);color:#fff;box-shadow:0 2px 8px rgba(16,163,127,.3)}
    .craber-btn.primary:hover{background:var(--craber-accent-2)}
    .craber-btn.primary:disabled{opacity:.6;cursor:default;box-shadow:none}
    .craber-btn.ghost{background:var(--craber-ghost);color:var(--craber-fg)}
    .craber-btn.ghost:hover{background:var(--craber-hover)}
    .craber-status{font-size:12px;color:var(--craber-sub);display:inline-flex;align-items:center;gap:6px}
    .craber-spin{width:12px;height:12px;border:2px solid var(--craber-sub);border-top-color:transparent;
      border-radius:50%;animation:craber-spin .7s linear infinite;display:inline-block}

    .craber-single{position:absolute;top:8px;right:8px;z-index:10;border:1px solid var(--craber-line);
      background:rgba(255,255,255,.9);backdrop-filter:blur(4px);border-radius:8px;padding:3px 9px;
      font-size:11px;cursor:pointer;color:var(--craber-fg);font-family:system-ui,sans-serif;
      transition:background .15s,color .15s,border-color .15s}
    .craber-single:hover{background:var(--craber-accent);color:#fff;border-color:var(--craber-accent)}
    @media (prefers-color-scheme:dark){
      .craber-single{background:rgba(40,42,46,.9);color:#ccc}
    }

    /* 螃蟹按钮的 tooltip：挂在 body 上的独立元素，不受操作栏 overflow 裁切 */
    .craber-tip{position:fixed;z-index:2147483647;pointer-events:none;
      background:#2f2f2f;color:#fff;font-size:12px;line-height:1;font-weight:400;
      padding:6px 9px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.25);
      white-space:nowrap;font-family:system-ui,sans-serif;
      opacity:0;transform:translateY(3px);transition:opacity .12s ease,transform .12s ease}
    .craber-tip.show{opacity:1;transform:translateY(0)}

    /* 列表项的预览按钮：默认隐藏，行 hover 时淡入 */
    .craber-item{position:relative}
    .craber-preview-btn{position:absolute;top:8px;right:8px;flex:none;
      border:1px solid var(--craber-line);background:var(--craber-bg);color:var(--craber-sub);
      border-radius:8px;padding:3px 10px;font-size:11px;cursor:pointer;
      opacity:0;transform:translateX(4px);pointer-events:none;
      transition:opacity .15s,transform .15s,background .15s,color .15s,border-color .15s}
    .craber-item:hover .craber-preview-btn{opacity:1;transform:none;pointer-events:auto}
    .craber-preview-btn:hover{background:var(--craber-accent);color:#fff;border-color:var(--craber-accent)}

    /* 原生操作栏里的导出按钮：去掉 ChatGPT 自带的 hover 上移动画 */
    [data-craber-export]{transform:none!important;transition:background-color .15s!important}
    [data-craber-export]:hover{transform:none!important}

    /* 预览弹层（叠在批量面板之上） */
    .craber-preview-mask{position:fixed;inset:0;background:rgba(15,18,20,.5);backdrop-filter:blur(2px);
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
    .craber-preview-body a{color:var(--craber-accent);text-decoration:none}
    .craber-preview-body a:hover{text-decoration:underline}
    .craber-preview-loading{padding:48px 18px;text-align:center;color:var(--craber-sub);font-size:13px;
      display:flex;flex-direction:column;align-items:center;gap:12px}
  `;
  document.head.appendChild(style);

  /* ============================================================
   * UI：批量导出面板
   * ========================================================== */

  function openPanel() {
    const mask = document.createElement('div');
    mask.className = 'craber-mask';
    mask.innerHTML = `
      <div class="craber-panel" role="dialog" aria-label="批量导出">
        <div class="craber-hd">
          <h3>批量导出为 Markdown</h3>
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
              <label class="craber-chip"><input type="checkbox" name="craber-code"><span class="craber-box"></span>含代码/工具调用</label>
              <label class="craber-chip"><input type="checkbox" name="craber-src"><span class="craber-box"></span>附参考来源</label>
              <label class="craber-chip"><input type="checkbox" name="craber-img"><span class="craber-box"></span>图片转 base64</label>
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
    document.body.appendChild(mask);

    const close = () => mask.remove();
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
    mask.querySelector('.craber-x').addEventListener('click', close);

    // 初始化选项控件
    mask.querySelectorAll('input[name="craber-mode"]').forEach((r) => {
      r.checked = r.value === settings.mode;
      r.addEventListener('change', () => { settings.mode = r.value; saveSettings(settings); });
    });
    const bindCheck = (name, key) => {
      const el = mask.querySelector('input[name="' + name + '"]');
      el.checked = !!settings[key];
      el.addEventListener('change', () => { settings[key] = el.checked; saveSettings(settings); });
    };
    bindCheck('craber-code', 'includeCode');
    bindCheck('craber-src', 'sourcesFooter');
    bindCheck('craber-img', 'embedImages');

    const listEl = mask.querySelector('.craber-list');
    const statusEl = mask.querySelector('[data-role="status"]');

    // 骨架屏：加载会话结构时的占位行，带 shimmer 过渡动画
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
        const q = extractText(turn.question) || '(无文字提问)';
        const answerCount = turn.answers.filter((n) => {
          const ct = n.message.content && n.message.content.content_type;
          const role = n.message.author && n.message.author.role;
          return (role === 'assistant' && ct === 'text') || ct === 'multimodal_text';
        }).length;
        const row = document.createElement('label');
        row.className = 'craber-item';
        // 逐行错峰淡入
        row.style.animationDelay = Math.min(idx * 30, 400) + 'ms';
        row.innerHTML =
          '<input type="checkbox" data-idx="' + idx + '" checked>' +
          '<span class="craber-box"></span>' +
          '<span class="q">' + escapeHtml(q.slice(0, 120)) +
          '<div class="meta">回合 ' + (idx + 1) + ' · ' + answerCount + ' 段回复</div></span>' +
          '<button class="craber-preview-btn" type="button" title="预览此回合内容">预览</button>';
        // 预览按钮：阻止冒泡到 label（否则会误触勾选），打开预览面板
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
        console.error('[gpt-craber]', err);
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
          <div class="craber-proj-row" data-role="project-row" hidden>
            <div class="craber-dd" data-role="project-dd">
              <button class="craber-dd-trigger" type="button">
                <span class="craber-dd-label">全部项目</span>
                <span class="craber-dd-caret">▼</span>
              </button>
              <div class="craber-dd-menu" hidden></div>
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
    document.body.appendChild(mask);

    const close = () => mask.remove();
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
    mask.querySelector('.craber-x').addEventListener('click', close);

    const listEl = mask.querySelector('.craber-list');
    const statusEl = mask.querySelector('[data-role="status"]');
    const searchEl = mask.querySelector('.craber-search');
    const fromEl = mask.querySelector('[data-role="date-from"]');
    const toEl = mask.querySelector('[data-role="date-to"]');

    // 骨架屏
    listEl.innerHTML = Array.from({ length: 6 }).map(() =>
      '<div class="craber-sk"><div class="b box"></div><div class="lines">' +
      '<div class="b l1"></div><div class="b l2"></div></div></div>').join('');

    let metas = [];      // 全部会话元数据
    const checked = {};  // id -> bool

    // 日期筛选：range 为快捷天数（0 = 全部），或 'custom' 用 from/to
    let dateRange = 0;
    // 项目筛选：'all' = 全部项目；'none' = 无项目；具体 gizmo_id = 只看该项目
    let projFilter = 'all';
    const projRow = mask.querySelector('[data-role="project-row"]');
    const projDD = mask.querySelector('[data-role="project-dd"]');
    const projTrigger = projDD.querySelector('.craber-dd-trigger');
    const projLabelEl = projDD.querySelector('.craber-dd-label');
    const projMenu = projDD.querySelector('.craber-dd-menu');

    // 自绘下拉：opts = [{value, label}]。选中后回填触发器文字并 renderList。
    const setupProjectDD = (opts) => {
      projMenu.innerHTML = opts.map((o) =>
        '<div class="craber-dd-opt' + (o.value === projFilter ? ' sel' : '') +
        '" data-value="' + escapeHtml(o.value) + '">' +
        escapeHtml(o.label) + '</div>').join('');
      const closeMenu = () => {
        projDD.classList.remove('open');
        projMenu.hidden = true;
        // 关闭时移回原容器，避免遗留在 body 上
        if (projMenu.parentElement === document.body) projDD.appendChild(projMenu);
      };
      // 菜单用 fixed 定位，避开面板 overflow 裁切。面板带 pop-in 动画（含 transform），
      // 会让 fixed 基准变成面板本身，故打开时把菜单移到 body 顶层，确保基准是视口。
      // 按触发器位置算坐标，下方空间不足时向上翻转。
      const positionMenu = () => {
        const r = projTrigger.getBoundingClientRect();
        const vh = window.innerHeight;
        const maxH = 240;
        const below = vh - r.bottom - 8;
        const above = r.top - 8;
        // 下方放不下且上方更宽敞时，向上弹
        const up = below < 180 && above > below;
        const h = Math.min(maxH, up ? above : below);
        projMenu.style.left = r.left + 'px';
        projMenu.style.width = r.width + 'px';
        projMenu.style.maxHeight = h + 'px';
        if (up) {
          projMenu.style.top = '';
          projMenu.style.bottom = (vh - r.top + 4) + 'px';
        } else {
          projMenu.style.bottom = '';
          projMenu.style.top = (r.bottom + 4) + 'px';
        }
      };
      const openMenu = () => {
        projDD.classList.add('open');
        // 移到 body 顶层再定位，脱离面板的 transform 影响
        if (projMenu.parentElement !== document.body) document.body.appendChild(projMenu);
        projMenu.hidden = false;
        positionMenu();
      };
      projTrigger.onclick = (e) => {
        e.stopPropagation();
        if (projMenu.hidden) openMenu(); else closeMenu();
      };
      // 面板滚动/窗口缩放时，重定位打开着的菜单
      window.addEventListener('resize', () => { if (!projMenu.hidden) positionMenu(); });
      projMenu.querySelectorAll('.craber-dd-opt').forEach((el) => {
        el.onclick = () => {
          projFilter = el.getAttribute('data-value');
          projLabelEl.textContent = el.textContent;
          projMenu.querySelectorAll('.craber-dd-opt').forEach((o) => {
            o.classList.toggle('sel', o === el);
          });
          closeMenu();
          renderList();
        };
      });
      // 点击触发器/菜单以外任意处关闭菜单。菜单打开时被移到 body 顶层，
      // 故不能只判 projDD.contains，要连 projMenu 一起判；用 document 捕获阶段监听，
      // 覆盖遮罩、面板、菜单外的所有点击。
      document.addEventListener('pointerdown', (e) => {
        if (projMenu.hidden) return;
        if (projDD.contains(e.target) || projMenu.contains(e.target)) return;
        closeMenu();
      }, true);
    };

    // 判断某会话的更新时间是否落在当前筛选区间内
    const inDateRange = (m) => {
      const ts = m.update_time ? new Date(m.update_time).getTime() : 0;
      if (!ts) return dateRange === 0; // 无时间的会话仅在“全部”时显示
      if (dateRange === 'custom') {
        // from 取当天 00:00，to 取当天 23:59:59
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
      return true; // dateRange === 0：全部
    };

    // 状态栏计数：筛选结果 + 已选数。renderList 存 lastShownCount，
    // change/全选/反选后单独调 updateCount() 即可实时刷新已选数。
    let lastShownCount = 0;
    const updateCount = () => {
      const total = metas.length;
      const sel = metas.reduce((n, m) => n + (checked[m.id] ? 1 : 0), 0);
      const head = lastShownCount !== total
        ? '筛选出 ' + lastShownCount + ' / 共 ' + total + ' 个'
        : '共 ' + total + ' 个';
      statusEl.textContent = head + ' · 已选 ' + sel;
    };

    const renderList = () => {
      const kw = (searchEl.value || '').trim().toLowerCase();
      const shown = metas.filter((m) => {
        if (kw && (m.title || '').toLowerCase().indexOf(kw) < 0) return false;
        if (!inDateRange(m)) return false;
        // 项目筛选：''/all=全部，none=无项目，其余=指定 gizmo_id
        if (projFilter && projFilter !== 'all') {
          const pgid = getProjectGizmoId(m);
          if (projFilter === 'none') { if (pgid) return false; }
          else if (pgid !== projFilter) return false;
        }
        return true;
      });
      // 状态栏：显示筛选结果 + 已选数（updateCount 统一处理，change/全选/反选也复用）
      lastShownCount = shown.length;
      updateCount();
      if (!shown.length) {
        listEl.innerHTML = '<div class="craber-empty">无匹配会话</div>';
        return;
      }
      listEl.innerHTML = '';
      shown.forEach((m, i) => {
        const row = document.createElement('label');
        row.className = 'craber-item';
        row.style.animationDelay = Math.min(i * 24, 360) + 'ms';
        const t = m.update_time ? new Date(m.update_time).toLocaleString() : '';
        // 项目会话：显示所属项目名（从缓存同步读，加载后已预取）
        const pgid = getProjectGizmoId(m);
        const projName = pgid ? API._gizmoCache[pgid] : null;
        const projTag = projName
          ? '<span class="craber-proj">📁 ' + escapeHtml(projName) + '</span>' : '';
        row.innerHTML =
          '<input type="checkbox" data-id="' + m.id + '"' + (checked[m.id] ? ' checked' : '') + '>' +
          '<span class="craber-box"></span>' +
          '<span class="q">' + escapeHtml(m.title || '未命名会话') +
          '<div class="meta">' + projTag + escapeHtml(t) + '</div></span>' +
          '<button class="craber-preview-btn" type="button" title="预览整个会话内容">预览</button>';
        row.querySelector('input').addEventListener('change', (e) => {
          checked[m.id] = e.target.checked;
          updateCount();
        });
        // 预览按钮：阻止冒泡到 label（否则会误触勾选），预览整个会话
        row.querySelector('.craber-preview-btn').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openConvPreview(m);
        });
        listEl.appendChild(row);
      });
    };

    searchEl.addEventListener('input', renderList);

    // 快捷日期筛选：切换 dateRange，仅 custom 时显示日期输入
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

    fetchAllConversations((n, total) => {
      statusEl.textContent = '加载会话 ' + n + '/' + (isFinite(total) ? total : '…');
    }).then(async (all) => {
      metas = all;
      all.forEach((m) => { checked[m.id] = true; }); // 默认全选
      // 先把项目名预取完再首次渲染：避免“先渲染无标签、取到后重绘一次”造成的闪烁。
      const gids = [];
      const seenGid = {};
      for (const m of all) {
        const gid = getProjectGizmoId(m);
        if (gid && !seenGid[gid]) { seenGid[gid] = 1; gids.push(gid); }
      }
      if (gids.length) {
        statusEl.textContent = '加载项目信息…';
        await Promise.all(gids.map((gid) => API.getGizmoName(gid).catch(() => null)));
        // 填充项目筛选下拉：按项目名排序，值为 gizmo_id
        const opts = gids
          .map((gid) => ({ gid, name: API._gizmoCache[gid] || gid }))
          .sort((a, b) => a.name.localeCompare(b.name, 'zh'));
        setupProjectDD([
          { value: 'all', label: '全部项目' },
          { value: 'none', label: '无项目' },
          ...opts.map((o) => ({ value: o.gid, label: '📁 ' + o.name })),
        ]);
        projRow.hidden = false;
      }
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
        console.error('[gpt-craber]', err);
      }
    });
  }

  /* ============================================================
   * UI：页面导航节点（左侧常驻节点轨道）
   * ========================================================== */

  // 节点的标题 = 用户提问文本；正文预览 = 第一条有文字的 assistant 回答。
  // 只取 text / multimodal_text，跳过 tool 与 code 等非对话内容。
  function turnPreview(turn) {
    for (const n of turn.answers) {
      const role = n.message.author && n.message.author.role;
      const ct = n.message.content && n.message.content.content_type;
      if (role === 'assistant' && (ct === 'text' || ct === 'multimodal_text')) {
        const t = extractText(n);
        if (t) return t;
      }
    }
    return '(无文字回复)';
  }

  // ChatGPT 的消息区是 main 内部的滚动 div，不是 window。从任意已挂载消息往上找
  // 第一个真正可滚动的祖先；找不到就退回文档滚动元素。
  function getScrollContainer() {
    let el = document.querySelector('[data-message-id]');
    el = el && el.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight - el.clientHeight > 40) return el;
      el = el.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  // [data-message-id] 是撑满整行的外层容器，用户提问真正的气泡是里面那个带背景、
  // 靠右对齐的小块 —— 光圈画在外层上，看起来就是整行被框住，跟"这条消息"对不上。
  // 类名随 ChatGPT 改版会变，所以先试已知选择器，再退回几何 + 背景色判断：
  // 文档顺序上第一个"明显比整行窄、且自己有不透明背景"的后代就是气泡。
  const NAV_BUBBLE_SEL = '.user-message-bubble-color,[class*="user-message-bubble"],' +
    '[class*="bg-token-message-surface"]';
  function findFlashTarget(el) {
    const hit = el.querySelector(NAV_BUBBLE_SEL);
    if (hit && hit.offsetHeight) return hit;
    const wrapW = el.getBoundingClientRect().width;
    if (!wrapW) return el;
    const nodes = el.querySelectorAll('div,span');
    for (let i = 0; i < nodes.length && i < 40; i++) {
      const n = nodes[i];
      if (!n.offsetHeight) continue;
      if (n.getBoundingClientRect().width > wrapW * 0.97) continue;  // 还是整行，往里找
      const bg = getComputedStyle(n).backgroundColor;
      if (bg && bg !== 'transparent' && !/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(bg)) return n;
    }
    return el;   // 助手消息本来就没有气泡，退回整行
  }

  // 一次性扩散高亮。用动画而非常驻 class，同一节点连点两次也能再闪一次。
  let navFlashEl = null;
  let navFlashTimer = 0;
  function flashMessage(msgEl) {
    clearTimeout(navFlashTimer);
    if (navFlashEl) navFlashEl.classList.remove('craber-nav-flash', 'craber-nav-flash-box');
    const el = findFlashTarget(msgEl);
    navFlashEl = el;
    // 气泡自带圆角就别覆盖，否则光圈的弧度会跟气泡错开；只有落在没圆角的整行容器上
    // 才补一个 14px，免得是个生硬的方框。
    if ((parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0) < 2) {
      el.classList.add('craber-nav-flash-box');
    }
    void el.offsetWidth; // 强制重排，让动画可以重复触发
    el.classList.add('craber-nav-flash');
    navFlashTimer = setTimeout(() => {
      el.classList.remove('craber-nav-flash', 'craber-nav-flash-box');
      navFlashEl = null;
    }, 1500);
  }

  // 滚动到页面对应消息。顶部留 NAV_SCROLL_OFFSET 的余量：block:'center'
  // 会把长消息的开头顶到视口上方，落点之后还得往回滚一段才能开始读。
  // 消息可能因懒加载未挂载，返回 false 交给调用方兜底。
  // 这里只负责"开滚"，不做高亮 —— 平滑滚动要几百毫秒，一开滚就闪，等真正落到位
  // 时 1.4s 的动画早放完了，用户看到的是"跳过去，什么都没发生"。
  const NAV_SCROLL_OFFSET = 88;
  function scrollToMessage(messageId) {
    const el = document.querySelector('[data-message-id="' + messageId + '"]');
    if (!el) return false;
    const sc = getScrollContainer();
    const m = navScrollMetrics(sc);
    const delta = el.getBoundingClientRect().top - m.base - NAV_SCROLL_OFFSET;
    try {
      const top = Math.max(0, m.pos + delta);
      if (m.isRoot) window.scrollTo({ top: top, behavior: 'smooth' });
      else sc.scrollTo({ top: top, behavior: 'smooth' });
    } catch (e) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return true;
  }

  // 轻提示条：替代 alert，不打断阅读。sticky 给"正在向上加载"这类要一直挂着的进度提示用。
  let navToastEl = null;
  let navToastTimer = 0;
  function navToast(msg, sticky) {
    if (!navToastEl) {
      navToastEl = document.createElement('div');
      navToastEl.className = 'craber-toast';
      document.body.appendChild(navToastEl);
    }
    navToastEl.textContent = msg;
    navToastEl.classList.add('show');
    clearTimeout(navToastTimer);
    if (!sticky) navToastTimer = setTimeout(() => navToastEl.classList.remove('show'), 2600);
  }

  function navToastHide() {
    clearTimeout(navToastTimer);
    if (navToastEl) navToastEl.classList.remove('show');
  }

  // 页面上常驻的导航节点轨道：左侧竖排小横条，hover / 键盘聚焦弹出节点卡片。
  let navRailEl = null;
  let navCardEl = null;
  let navCardRefs = null;    // 卡片内部节点引用：只改文字，不每次 hover 重建 innerHTML
  let navCardTurnIdx = -1;
  let navCardHideTimer = 0;
  let navCardShowTimer = 0;
  let navCardX = 0;          // 卡片当前落点，用来算相邻两次 hover 的位移距离
  let navCardY = 0;
  let navFocusIdx = -1;      // 鱼眼焦点所在节点
  let navActiveIdx = -1;     // 当前阅读位置（随滚动联动）
  let navRenderedCount = 0;
  const NAV_MAX_VISIBLE_BARS = 30; // 轨道最大显示节点数，超过此数采用滑动窗口显示
  let navMoreTopBtnEl = null;    // "查看顶部历史更多"按钮
  let navMoreBottomBtnEl = null; // "查看底部最新更多"按钮
  let navWindowStartIdx = 0;     // 当前可见 30 个节点的起始真实索引
  let navPanelEl = null;         // 全量节点列表悬浮面板
  let navPanelTriggerBtn = null; // 当前呼出面板的按钮引用，用于自适应锚定
  let navPanelHideTimer = 0; // 面板隐藏定时器
  let navRendering = false;
  let navLastFetchTs = 0;
  let navRenderTimer = 0;    // 全局唯一的待执行渲染，所有会走接口的路径都从这里排队
  let navConvId = null;
  let navSpyRaf = 0;
  let navIdxById = Object.create(null);   // 消息 id -> 回合下标，滚动联动用
  const NAV_REFRESH_COOLDOWN = 6000;   // 两次拉接口的最小间隔，防 429

  // 我们这条 /backend-api/conversation/{id} 是全量拉取，和 ChatGPT 打开会话时自己的
  // 首屏请求撞在一起最容易把双方一起打到 429 —— 打不开会话就是这么来的。
  // 所以换会话后要等一段，而且要等到页面已经挂出消息（说明它自己那波已经落地）。
  const NAV_SWITCH_DELAY = 1200;       // 换会话后的等待
  const NAV_429_BACKOFF = 30000;       // 吃到 429 后的起始静默期，重复触发则翻倍
  const NAV_429_BACKOFF_MAX = 300000;
  const NAV_WAIT_MOUNT_MAX = 20;       // 等首屏消息挂载的最多轮数（每轮 600ms）
  let navBackoffUntil = 0;
  let navBackoffMs = 0;
  let navWaitTries = 0;

  // 向上找未挂载消息时用的节流参数。数字来自实测（47 回合会话跳到第 8 个提问）：
  // 单批往返 0.5~7.8s，最旧下标每批推进 1~5 个回合，全程 16 轮 / 38s。
  const NAV_HUNT_ROUND_IDLE = 9000;    // 单轮"毫无动静"多久算失败
  const NAV_HUNT_ROUND_MAX = 25000;    // 单轮硬上限，防止某一批卡死
  const NAV_HUNT_BUDGET = 60000;       // 整次跳转的总预算
  const NAV_HUNT_MAX_HOPS = 10;        // 插值逼近的最大次数
  let navHuntSeq = 0;                  // 跳转世代号：后发的跳转作废先发的
  let navHunting = false;              // 逼顶期间挂起滚动联动，否则 active 会一路乱跳

  // 取会话内容区左边缘（sidebar 收起/展开时 main 的 left 会变），
  // 轨道贴住内容区左侧，避免盖到侧边栏上。
  function getNavRailLeft() {
    const main = document.querySelector('main');
    if (main) {
      const r = main.getBoundingClientRect();
      if (r.width > 100 && r.left >= 0) return Math.max(8, r.left + 6);
    }
    return 12;
  }

  function updateNavRailPos() {
    if (!navRailEl) return;
    navRailEl.style.left = getNavRailLeft() + 'px';
  }

  // 节点密度：最大显示 30 个节点，超出的通过末尾"更多"按钮展开全量列表面板。
  // 间距舒适适中（7~13px），长会话也绝不密集拥挤、不产生滚动条。
  function applyNavDensity(count) {
    if (!navRailEl) return;
    const visibleCount = Math.min(count, NAV_MAX_VISIBLE_BARS);
    const avail = Math.max(200, Math.min(window.innerHeight * 0.74, window.innerHeight - 120)) - 16;
    const items = visibleCount + (count > NAV_MAX_VISIBLE_BARS ? 1 : 0);
    const pitch = items > 1 ? Math.max(7, Math.min(13, Math.floor(avail / items))) : 12;
    navRailEl.style.setProperty('--nav-pitch', pitch + 'px');
  }

  // 具名函数：mountNavRail 可能被重复调用（轨道被页面移除后重建），
  // 同一函数引用重复 addEventListener 会被浏览器去重，用匿名箭头则会叠加。
  function onNavResize() {
    updateNavRailPos();
    applyNavDensity(navRenderedCount);
    hideNavCard();
    setNavBarFocus(-1);
    scheduleNavSpy();
    if (navPanelEl && !navPanelEl.hidden) {
      updateNavPanelPosition();
    }
  }

  function hideNavCard() {
    clearTimeout(navCardHideTimer);
    clearTimeout(navCardShowTimer);
    if (navCardEl) {
      navCardEl.hidden = true;
      navCardEl.classList.remove('swap');   // 下次显示要能重放淡入动画
    }
    navCardTurnIdx = -1;
  }

  // 移出轨道后延迟收起：鼠标可能正移向卡片（卡片 mouseenter 会取消这个定时器）。
  // 焦点和卡片一起收，否则指针在轨道与卡片之间穿过时节点会先缩回再弹起。
  function scheduleHideNavCard() {
    clearTimeout(navCardShowTimer);
    clearTimeout(navCardHideTimer);
    navCardHideTimer = setTimeout(() => {
      hideNavCard();
      setNavBarFocus(-1);
    }, 140);
  }

  // 鱼眼焦点：焦点节点为 n0，两侧按距离递减 n1/n2，其余由 CSS 统一淡出。
  // 只改受影响的 5 个节点的 class（原来每次 hover 都遍历全部节点写 4 条内联样式），
  // 且尺寸变化只作用在 ::before 上，不会牵动轨道布局。
  function setNavBarFocus(idx) {
    if (!navRailEl || idx === navFocusIdx) return;
    const bars = navRailEl.querySelectorAll('.craber-nav-bar');
    const barMap = Object.create(null);
    bars.forEach((b) => { barMap[+b.dataset.idx] = b; });
    if (navFocusIdx >= 0) {
      for (let d = -2; d <= 2; d++) {
        const b = barMap[navFocusIdx + d];
        if (b) b.classList.remove('n0', 'n1', 'n2');
      }
    }
    navFocusIdx = idx;
    navRailEl.classList.toggle('craber-focus', idx >= 0);
    if (idx < 0) return;
    for (let d = -2; d <= 2; d++) {
      const b = barMap[idx + d];
      if (b) b.classList.add('n' + Math.abs(d));
    }
  }

  function mountNavRail() {
    if (navRailEl && document.body.contains(navRailEl)) return;
    navRailEl = document.createElement('div');
    navRailEl.className = 'craber-nav-rail';
    // toolbar 语义 + roving tabindex：整条轨道只占一个 Tab 位，方向键在节点间移动。
    navRailEl.setAttribute('role', 'toolbar');
    navRailEl.setAttribute('aria-orientation', 'vertical');
    navRailEl.setAttribute('aria-label', '对话导航节点');
    document.body.appendChild(navRailEl);

    navCardEl = document.createElement('div');
    navCardEl.className = 'craber-nav-card';
    navCardEl.hidden = true;
    // 结构只建一次，之后只改文字：hover 时重建 innerHTML 会白造垃圾、也让文字闪一下。
    navCardEl.innerHTML =
      '<div class="craber-nav-card-in">' +
        '<span class="craber-nav-main">' +
          '<div class="craber-nav-title"></div><div class="craber-nav-preview"></div>' +
        '</span>' +
        '<span class="craber-nav-num"></span>' +
      '</div>';
    navCardRefs = {
      title: navCardEl.querySelector('.craber-nav-title'),
      preview: navCardEl.querySelector('.craber-nav-preview'),
      num: navCardEl.querySelector('.craber-nav-num')
    };
    document.body.appendChild(navCardEl);

    navCardEl.addEventListener('mouseenter', () => clearTimeout(navCardHideTimer));
    navCardEl.addEventListener('mouseleave', scheduleHideNavCard);
    navCardEl.addEventListener('click', () => {
      if (navCardTurnIdx >= 0) navigateToTurn(navCardTurnIdx);
    });
    // 滚动联动：ChatGPT 的滚动容器是 main 内部的 div，window 上收不到 scroll，
    // 所以在 document 捕获阶段监听（passive，不阻塞滚动）。
    document.addEventListener('scroll', scheduleNavSpy, { capture: true, passive: true });
    window.addEventListener('resize', onNavResize);

    // hover：鱼眼立刻跟手；卡片延迟 90ms 再弹 —— 快速扫过整条轨道时不会一路闪卡片。
    // 卡片已经开着时直接换内容，靠 transform 过渡平滑滑到新节点。
    navRailEl.addEventListener('mouseover', (e) => {
      const bar = e.target.closest && e.target.closest('.craber-nav-bar');
      if (!bar) return;
      const idx = +bar.dataset.idx;
      if (!Number.isFinite(idx)) return;
      clearTimeout(navCardHideTimer);
      setNavBarFocus(idx);
      const turn = state.turns && state.turns[idx];
      if (!turn) return;
      clearTimeout(navCardShowTimer);
      if (navCardEl.hidden) navCardShowTimer = setTimeout(() => showNavCard(bar, idx, turn), 90);
      else showNavCard(bar, idx, turn);
    });
    navRailEl.addEventListener('mouseleave', scheduleHideNavCard);

    // 键盘可达：聚焦节点也弹卡片，Enter/Space 由 button 原生触发跳转。
    navRailEl.addEventListener('focusin', (e) => {
      const bar = e.target.closest && e.target.closest('.craber-nav-bar');
      if (!bar) return;
      const idx = +bar.dataset.idx;
      if (!Number.isFinite(idx)) return;
      clearTimeout(navCardHideTimer);
      setNavBarFocus(idx);
      const turn = state.turns && state.turns[idx];
      if (turn) showNavCard(bar, idx, turn);
    });
    navRailEl.addEventListener('focusout', (e) => {
      if (!navRailEl.contains(e.relatedTarget)) scheduleHideNavCard();
    });
    navRailEl.addEventListener('keydown', onNavKeydown);
  }

  // 方向键在节点间移动焦点（roving tabindex：只有当前节点 tabIndex=0）。
  // 原来每个节点都是普通 button，长会话会往页面 Tab 顺序里塞几十个停靠点。
  function onNavKeydown(e) {
    const bars = navRailEl.children;
    const cur = Array.prototype.indexOf.call(bars, document.activeElement);
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(bars.length - 1, cur + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = bars.length - 1;
    else if (e.key === 'Escape') { hideNavCard(); setNavBarFocus(-1); return; }
    else return;
    const b = bars[next];
    if (!b) return;
    e.preventDefault();
    if (cur >= 0 && cur !== navActiveIdx && bars[cur]) bars[cur].tabIndex = -1;
    b.tabIndex = 0;
    b.focus();
  }

  // 悬浮/聚焦节点时，在轨道右侧弹出该回合的卡片。
  // 卡片结构在 mountNavRail 里建好一次，这里只改文字 —— 原来每次 hover 都重建
  // innerHTML，扫过轨道就是几十次解析 + 重排。
  // 位置必须在取消 hidden 之前算好：卡片带位移过渡，首帧若停在未设值的
  // (0,0)，就会从视口左上角滑进来。
  function showNavCard(bar, idx, turn) {
    clearTimeout(navCardHideTimer);
    clearTimeout(navCardShowTimer);
    const reTarget = !navCardEl.hidden && idx !== navCardTurnIdx;
    navCardTurnIdx = idx;
    navCardRefs.title.textContent = (extractText(turn.question) || '(无文字提问)').slice(0, 90);
    navCardRefs.preview.textContent = turnPreview(turn).slice(0, 180);
    navCardRefs.num.textContent = '#' + (idx + 1);
    const firstShow = navCardEl.hidden;
    if (firstShow) {
      // 先隐形挂上量尺寸，定好位再显形，首帧就不会有滑动。
      navCardEl.classList.remove('swap');
      navCardEl.style.transition = 'none';
      navCardEl.style.visibility = 'hidden';
      navCardEl.hidden = false;
    }
    const railRect = navRailEl.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const cardW = navCardEl.offsetWidth;
    const cardH = navCardEl.offsetHeight;
    // 优先贴轨道右侧；放不下就尽量贴右但不超出视口。垂直对齐当前横条并夹在视口内。
    const x = Math.max(8, Math.min(railRect.right + 6, window.innerWidth - cardW - 8));
    const y = Math.max(8, Math.min(barRect.top + barRect.height / 2 - cardH / 2,
      window.innerHeight - cardH - 8));
    const dist = firstShow ? 0 : Math.hypot(x - navCardX, y - navCardY);
    navCardX = x;
    navCardY = y;
    navCardEl.style.setProperty('--cdur', Math.round(Math.min(260, 110 + dist * 0.28)) + 'ms');
    navCardEl.style.setProperty('--cx', x + 'px');
    navCardEl.style.setProperty('--cy', y + 'px');
    if (reTarget) {
      navCardEl.classList.remove('swap');
      void navCardEl.offsetWidth;   // 强制重排，让淡入动画能重复触发
      navCardEl.classList.add('swap');
    }
    if (firstShow) {
      navCardEl.style.visibility = '';
      requestAnimationFrame(() => { navCardEl.style.transition = ''; });
    }
  }

  // 隐藏全量节点搜索面板
  function hideNavPanel() {
    clearTimeout(navPanelHideTimer);
    if (navPanelEl) navPanelEl.hidden = true;
    navPanelTriggerBtn = null;
  }

  function scheduleHideNavPanel() {
    clearTimeout(navPanelHideTimer);
    navPanelHideTimer = setTimeout(hideNavPanel, 200);
  }

  // 精确计算面板自适应锚定位置，确保无论视口高度或会话节点多寡，绝对不超出视口底部或顶部
  function updateNavPanelPosition() {
    if (!navPanelEl || navPanelEl.hidden) return;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const PADDING = 14; // 上下左右边缘安全防护间距

    const railRect = navRailEl ? navRailEl.getBoundingClientRect() : { right: 40, top: vh / 2, bottom: vh / 2 };
    const targetBtn = navPanelTriggerBtn || navMoreTopBtnEl || navMoreBottomBtnEl;
    const btnRect = targetBtn ? targetBtn.getBoundingClientRect() : null;

    const isTop = targetBtn && (targetBtn === navMoreTopBtnEl || (targetBtn.classList && targetBtn.classList.contains('craber-nav-more-top')));
    const isBottom = targetBtn && (targetBtn === navMoreBottomBtnEl || (targetBtn.classList && targetBtn.classList.contains('craber-nav-more-bottom')));

    // 横向定位：位于导航轨道右侧 12px，且严禁溢出右边界
    const pw = 380;
    const x = Math.max(PADDING, Math.min(railRect.right + 12, vw - pw - PADDING));

    // 纵向尺寸与位置计算：
    // 首选最大高度限制在 560px 与可用屏幕高度之间，长列表由内部滚动承载
    const maxAvailH = Math.max(200, vh - PADDING * 2);
    const preferredMaxH = Math.min(maxAvailH, 560);
    navPanelEl.style.maxHeight = preferredMaxH + 'px';

    // 测量当前内容实际渲染高度
    const actualH = navPanelEl.offsetHeight || preferredMaxH;

    let y;
    if (isTop) {
      // 点击顶部···：视线在上方，面板顶部优先与按钮顶部对齐
      const topAnchor = btnRect ? (btnRect.top - 2) : PADDING;
      // 底部防溢出：若对齐后超出视口底部，向上平移，但顶端绝不低于安全线 PADDING
      y = Math.max(PADDING, Math.min(topAnchor, vh - actualH - PADDING));
    } else if (isBottom) {
      // 点击底部···：视线在下方，面板从底部向上展开，面板底部与按钮底部对齐
      const bottomAnchor = btnRect ? (btnRect.bottom + 2) : (vh - PADDING);
      y = Math.max(PADDING, bottomAnchor - actualH);
    } else {
      // 通用情况：居中于按钮或轨道
      const centerAnchor = btnRect ? (btnRect.top + (btnRect.height || 0) / 2 - actualH / 2) : (vh / 2 - actualH / 2);
      y = Math.max(PADDING, Math.min(centerAnchor, vh - actualH - PADDING));
    }

    // 终极保护：将当前 y 坐标下的实际剩余可用高度赋给 maxHeight，杜绝面板底部溢出被任务栏或视口截断
    const safeMaxH = Math.max(160, vh - y - PADDING);
    navPanelEl.style.maxHeight = safeMaxH + 'px';

    navPanelEl.style.left = x + 'px';
    navPanelEl.style.top = y + 'px';
  }

  // 构建并显示全量节点搜索悬浮面板
  function showNavPanel(triggerBtn) {
    clearTimeout(navPanelHideTimer);
    hideNavCard(); // 展开面板时收起单个预览小卡片
    if (!state.turns || !state.turns.length) return;
    navPanelTriggerBtn = triggerBtn || null;
    if (!navPanelEl) {
      navPanelEl = document.createElement('div');
      navPanelEl.className = 'craber-nav-panel';
      navPanelEl.innerHTML =
        '<div class="craber-nav-panel-hd">' +
          '<div class="craber-nav-panel-title-row">' +
            '<span>全部会话节点</span>' +
            '<span class="craber-nav-panel-badge">' + state.turns.length + ' 个</span>' +
          '</div>' +
          '<div class="craber-nav-search-wrap">' +
            '<svg class="craber-nav-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
            '</svg>' +
            '<input type="text" class="craber-nav-search" placeholder="搜索提问内容或 #回合号..." />' +
          '</div>' +
        '</div>' +
        '<div class="craber-nav-panel-list"></div>';
      document.body.appendChild(navPanelEl);

      // 点击呼出模式下，不再因为鼠标移出而自动消失

      const searchInput = navPanelEl.querySelector('.craber-nav-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          renderNavPanelItems(e.target.value.trim());
          updateNavPanelPosition();
        });
      }
      // 阻止面板内的滚轮事件冒泡，避免滚动列表时带动整个页面滚动
      navPanelEl.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });
      // 点击面板外部时自动关闭
      document.addEventListener('pointerdown', (e) => {
        if (!navPanelEl || navPanelEl.hidden) return;
        if (!navPanelEl.contains(e.target) && (!navMoreTopBtnEl || !navMoreTopBtnEl.contains(e.target)) && (!navMoreBottomBtnEl || !navMoreBottomBtnEl.contains(e.target))) {
          hideNavPanel();
        }
      });
    } else {
      const badge = navPanelEl.querySelector('.craber-nav-panel-badge');
      if (badge) badge.textContent = state.turns.length + ' 个';
    }

    renderNavPanelItems('');
    const input = navPanelEl.querySelector('.craber-nav-search');
    if (input) input.value = '';

    // 测量与精确定位：先开启渲染以测量尺寸，计算最贴合锚点并安全定位后再解除透明
    navPanelEl.style.visibility = 'hidden';
    navPanelEl.hidden = false;
    updateNavPanelPosition();
    navPanelEl.style.visibility = '';

    setTimeout(() => { if (input) input.focus(); }, 40);
  }

  // 根据搜索关键字渲染面板条目列表
  function renderNavPanelItems(kw) {
    if (!navPanelEl) return;
    const listEl = navPanelEl.querySelector('.craber-nav-panel-list');
    if (!listEl) return;
    const kwLower = kw ? kw.toLowerCase() : '';
    const turns = state.turns || [];
    let html = '';
    let matchCount = 0;
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const title = extractText(turn.question) || '(无文字提问)';
      const preview = turnPreview(turn);
      const numStr = '#' + (i + 1);
      if (kwLower) {
        const textToSearch = (numStr + ' ' + title + ' ' + preview).toLowerCase();
        if (!textToSearch.includes(kwLower)) continue;
      }
      matchCount++;
      const isAct = i === navActiveIdx;
      html +=
        '<div class=\"craber-nav-panel-item' + (isAct ? ' active' : '') + '\" data-idx=\"' + i + '\">' +
          '<div class=\"craber-nav-panel-item-hd\">' +
            '<span class=\"craber-nav-panel-item-num\">' + numStr + '</span>' +
            '<div class=\"craber-nav-panel-item-title\">' + escapeHtml(title) + '</div>' +
          '</div>' +
          (preview ? '<div class=\"craber-nav-panel-item-preview\">' + escapeHtml(preview) + '</div>' : '') +
        '</div>';
    }
    if (!matchCount) {
      html = '<div class=\"craber-nav-panel-empty\">未找到匹配节点</div>';
    }
    listEl.innerHTML = html;

    // 点击项跳转
    const items = listEl.querySelectorAll('.craber-nav-panel-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const idx = +item.dataset.idx;
        hideNavPanel();
        navigateToTurn(idx);
      });
    });

    // 默认把当前高亮项滚进视野
    const curActive = listEl.querySelector('.craber-nav-panel-item.active');
    if (curActive) curActive.scrollIntoView({ block: 'nearest' });
  }

  const navSleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const findMsgEl = (id) => document.querySelector('[data-message-id="' + id + '"]');

  // 滚动内容坐标系（相对滚动内容顶部），把 root 滚动和内层容器两种情况拉平。
  function navScrollMetrics(sc) {
    const isRoot = sc === document.scrollingElement || sc === document.documentElement;
    return {
      isRoot: isRoot,
      base: isRoot ? 0 : sc.getBoundingClientRect().top,
      pos: isRoot ? window.scrollY : sc.scrollTop,
    };
  }

  function navScrollTo(sc, top) {
    const m = navScrollMetrics(sc);
    const v = Math.max(0, Math.round(top));
    if (m.isRoot) window.scrollTo({ top: v, behavior: 'auto' });
    else sc.scrollTop = v;
  }

  // 等平滑滚动真正停下来。smooth 没有通用的结束回调（scrollend 不是所有浏览器都有），
  // 只能看位置是否连续几帧不动。必须先等它动起来：调用后头几帧位置还没变，
  // 直接判"已经停了"就白等一场，高亮又会提前放掉。
  function waitScrollSettled(sc, timeout) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      let last = navScrollMetrics(sc).pos;
      let still = 0;
      let moved = false;
      const tick = () => {
        const now = performance.now();
        const pos = navScrollMetrics(sc).pos;
        if (Math.abs(pos - last) > 1) {
          moved = true;
          still = 0;
          last = pos;
        } else if (++still >= 3 && (moved || now - t0 > 240)) {
          return resolve();   // 240ms 都没动过：本来就在位置上，不用再等
        }
        if (now - t0 > timeout) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // DOM 里最靠前的、能映射回轨道的用户消息下标。判断"目标还没拉到"只能靠它：
  // scrollHeight 只覆盖已加载的那一段，按 idx/total 算全局比例没有任何依据。
  function oldestMountedIdx() {
    const els = document.querySelectorAll('[data-message-author-role="user"][data-message-id]');
    let min = -1;
    for (let i = 0; i < els.length; i++) {
      const at = navIdxById[els[i].dataset.messageId];
      if (at === undefined) continue;
      if (min < 0 || at < min) min = at;
    }
    return min;
  }

  // ChatGPT 顶部哨兵是 IntersectionObserver 驱动的，只在相交状态跳变时回调 ——
  // 对已经是 0 的 scrollTop 再写一次 0 不产生任何事件，那一批就永远不会来。
  // 所以必须先离开顶部再回来，制造一次真正的"进入视口"。
  async function kickScrollTop(sc) {
    navScrollTo(sc, Math.max(sc.clientHeight, 600));
    await navSleep(120);
    navScrollTo(sc, 0);
  }

  // 等一批更旧的内容前置进来。唯一可信的进度信号是"最旧下标变小"：
  // scrollHeight 几百像素的小幅增长多半只是图片/公式排完版，不代表拉到了新批次。
  // 高度变化只用来续命（说明还在忙），不当成功判定。
  function waitOlderMounted(sc, msgId, oldest, seq) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      let last = t0;
      let lastH = sc.scrollHeight;
      const timer = setInterval(() => {
        const now = performance.now();
        const done = (ok) => { clearInterval(timer); resolve(ok); };
        if (seq !== navHuntSeq) return done(false);
        if (findMsgEl(msgId)) return done(true);
        const cur = oldestMountedIdx();
        if (cur >= 0 && cur < oldest) return done(true);
        if (sc.scrollHeight !== lastH) { lastH = sc.scrollHeight; last = now; }
        if (now - last > NAV_HUNT_ROUND_IDLE || now - t0 > NAV_HUNT_ROUND_MAX) return done(false);
      }, 100);
    });
  }

  function waitMounted(msgId, timeout, seq) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const timer = setInterval(() => {
        if (seq !== navHuntSeq || findMsgEl(msgId) || performance.now() - t0 > timeout) {
          clearInterval(timer);
          resolve();
        }
      }, 80);
    });
  }

  // 目标已加载、只是被卸载：取两侧最近的已挂载邻居，按下标线性插值估它的位置。
  // 用真实几何比全局比例可靠得多，而且这条路不碰接口。
  function jumpByAnchors(sc, idx) {
    const els = document.querySelectorAll('[data-message-author-role="user"][data-message-id]');
    const m = navScrollMetrics(sc);
    let lo = null;
    let hi = null;
    for (let i = 0; i < els.length; i++) {
      const at = navIdxById[els[i].dataset.messageId];
      if (at === undefined) continue;
      const top = els[i].getBoundingClientRect().top - m.base + m.pos;
      if (at <= idx && (!lo || at > lo.at)) lo = { at: at, top: top };
      if (at >= idx && (!hi || at < hi.at)) hi = { at: at, top: top };
    }
    let guess;
    if (lo && hi && hi.at !== lo.at) {
      guess = lo.top + (hi.top - lo.top) * ((idx - lo.at) / (hi.at - lo.at));
    } else if (lo) {
      guess = lo.top + (idx - lo.at) * sc.clientHeight * 0.8;
    } else if (hi) {
      guess = hi.top - (hi.at - idx) * sc.clientHeight * 0.8;
    } else {
      return false;
    }
    navScrollTo(sc, guess - sc.clientHeight * 0.3);
    return true;
  }

  // 落点校正 + 到位高亮。目标刚挂载时正文还没排完版，加上前置内容触发的
  // scroll anchoring，一次算出来的 scrollTop 能差一整屏 —— 反复量到落点稳定为止。
  // 校正期间强制 auto：容器若带 scroll-behavior:smooth，写 scrollTop 会起一段动画，
  // 110ms 后量到的还是半路上的位置，越校越偏，高亮也会落在没停稳的时候。
  async function settleOnMessage(msgId) {
    const sc = getScrollContainer();
    const prev = sc.style.scrollBehavior;
    sc.style.scrollBehavior = 'auto';
    let el = null;
    try {
      for (let i = 0; i < 6; i++) {
        el = findMsgEl(msgId);
        if (!el) return false;
        const m = navScrollMetrics(sc);
        const delta = el.getBoundingClientRect().top - m.base - NAV_SCROLL_OFFSET;
        if (Math.abs(delta) < 4) break;
        navScrollTo(sc, m.pos + delta);
        await navSleep(110);
      }
    } finally {
      sc.style.scrollBehavior = prev;
    }
    if (el) flashMessage(el);
    return true;
  }

  // 点击节点跳转。目标常因懒加载没挂载 —— ChatGPT 是"分页拉取 + 前置"的模型，
  // 只能逼近顶部让哨兵触发下一批再等。两种情况必须分开，否则会白发请求：
  //   目标比已加载范围更旧 → 逼顶 + 等前置，循环推进；
  //   目标在已加载范围内（只是被卸载）→ 邻居插值，纯几何逼近，不碰接口。
  async function navigateToTurn(idx) {
    const turn = state.turns && state.turns[idx];
    if (!turn) return;
    const msgId = turn.question && turn.question.message && turn.question.message.id;
    if (!msgId) return;
    hideNavCard();
    setNavActive(idx, true);
    const seq = ++navHuntSeq;         // 连点不同节点时，后发的作废先发的
    const sc = getScrollContainer();
    // 已挂载：滚过去、等它真正停稳，再交给落点校正做最后一次对齐并高亮。
    if (scrollToMessage(msgId)) {
      await waitScrollSettled(sc, 1200);
      if (seq !== navHuntSeq) return;
      await settleOnMessage(msgId);
      return;
    }

    const total = (state.turns && state.turns.length) || 1;
    const prevBehavior = sc.style.scrollBehavior;
    sc.style.scrollBehavior = 'auto'; // 逼顶期间别平滑滚动，每轮白等一段动画
    navHunting = true;
    const t0 = Date.now();
    let hops = 0;
    let stalled = false;
    try {
      while (!findMsgEl(msgId)) {
        if (seq !== navHuntSeq) return;
        if (Date.now() - t0 > NAV_HUNT_BUDGET) { stalled = true; break; }
        const oldest = oldestMountedIdx();
        if (oldest < 0) { stalled = true; break; }
        if (idx < oldest) {
          if (oldest === 0) { stalled = true; break; }  // 已到会话开头，没有更旧的了
          navToast('正在向上加载… ' + (oldest + 1) + ' / ' + total, true);
          await kickScrollTop(sc);
          if (!(await waitOlderMounted(sc, msgId, oldest, seq))) { stalled = true; break; }
        } else {
          if (++hops > NAV_HUNT_MAX_HOPS || !jumpByAnchors(sc, idx)) { stalled = true; break; }
          await waitMounted(msgId, 1200, seq);
        }
      }
    } finally {
      navHunting = false;
      sc.style.scrollBehavior = prevBehavior;
    }
    if (seq !== navHuntSeq) return;
    navToastHide();
    if (findMsgEl(msgId)) await settleOnMessage(msgId);
    else if (stalled) navToast('这条消息加载不出来，手动向上滚一段再试');
  }

  // 计算当前聚焦/阅读节点附近的 30 个可见窗口起始下标（上下总和为 30，居中优先）
  function calcNavWindowStart(activeIdx, totalCount) {
    if (totalCount <= NAV_MAX_VISIBLE_BARS) return 0;
    const half = Math.floor(NAV_MAX_VISIBLE_BARS / 2); // 15
    const target = activeIdx >= 0 ? activeIdx : totalCount - 1;
    // 居中计算：target - 15，并钳制在 [0, totalCount - 30] 之间
    return Math.max(0, Math.min(totalCount - NAV_MAX_VISIBLE_BARS, target - half));
  }

  // 标记当前阅读位置：如果超出当前 30 个可见窗口，触发滑动窗口平滑重移；否则更新 active 状态。
  function setNavActive(idx, scrollIntoRail) {
    if (!navRailEl) return;
    const totalCount = (state.turns || []).length;
    if (idx < 0 || idx >= totalCount) return;

    // 检查是否需要滑动 30 节点可见窗口（当离开中心区域时平移）
    if (totalCount > NAV_MAX_VISIBLE_BARS) {
      const idealStart = calcNavWindowStart(idx, totalCount);
      // 如果当前真实节点落在当前可见窗口之外，或者偏离较远，重绘滑动窗口
      if (idx < navWindowStartIdx || idx >= navWindowStartIdx + NAV_MAX_VISIBLE_BARS) {
        navActiveIdx = idx;
        syncNavBars(totalCount, idealStart);
        return;
      }
    }

    const prev = navRailEl.querySelector('.craber-nav-bar[data-idx="' + navActiveIdx + '"]');
    if (prev) {
      prev.classList.remove('active');
      prev.tabIndex = -1;
      prev.removeAttribute('aria-current');
    }
    navActiveIdx = idx;
    const cur = navRailEl.querySelector('.craber-nav-bar[data-idx="' + idx + '"]');
    if (cur) {
      cur.classList.add('active');
      cur.tabIndex = 0;
      cur.setAttribute('aria-current', 'true');
      if (scrollIntoRail && !navRailEl.matches(':hover')) keepBarInRail(cur);
    }
    // 更新顶部与底部更多按钮的高亮提示
    if (navMoreTopBtnEl) navMoreTopBtnEl.classList.toggle('active', idx < navWindowStartIdx);
    if (navMoreBottomBtnEl) navMoreBottomBtnEl.classList.toggle('active', idx >= navWindowStartIdx + NAV_MAX_VISIBLE_BARS);
  }

  // 会话极长、轨道自身仍然溢出时，把当前节点滚进可见范围。
  // 手写 scrollTop 而不用 scrollIntoView，后者会连带滚动整个页面。
  function keepBarInRail(bar) {
    const over = navRailEl.scrollHeight - navRailEl.clientHeight;
    if (over <= 0) return;
    const barTop = bar.offsetTop;
    const barBottom = barTop + bar.offsetHeight;
    const viewTop = navRailEl.scrollTop;
    const viewBottom = viewTop + navRailEl.clientHeight;
    if (barTop < viewTop + 12) navRailEl.scrollTop = Math.max(0, barTop - 12);
    else if (barBottom > viewBottom - 12) {
      navRailEl.scrollTop = Math.min(over, barBottom - navRailEl.clientHeight + 12);
    }
  }

  // 消息 id -> 回合下标。滚动联动靠它把页面上挂载的消息映射回轨道节点。
  function rebuildNavIndex(turns) {
    navIdxById = Object.create(null);
    turns.forEach((t, i) => {
      const id = t.question && t.question.message && t.question.message.id;
      if (id) navIdxById[id] = i;
    });
  }

  // 滚动联动：把视口上部 35% 处当作"阅读线"，最后一个越过该线的回合就是当前节点。
  // 每次只查一次 DOM 取当前挂载的用户消息 —— ChatGPT 会卸载远处的消息，
  // 按回合缓存 DOM 引用很快就会变成一堆过期的 null。
  function updateNavActiveFromScroll() {
    navSpyRaf = 0;
    if (navHunting) return;   // 逼顶期间视口在乱飞，别让 active 跟着跳
    if (!navRailEl || navRailEl.style.display === 'none') return;
    if (!navRailEl.children.length) return;
    const line = window.innerHeight * 0.35;
    const els = document.querySelectorAll('[data-message-author-role="user"][data-message-id]');
    let act = -1;
    for (let i = 0; i < els.length; i++) {
      const idx = navIdxById[els[i].dataset.messageId];
      if (idx === undefined) continue;
      if (els[i].getBoundingClientRect().top > line) break; // 文档顺序，后面只会更靠下
      act = idx;
    }
    if (act >= 0) setNavActive(act, true);   // 一个都没越线时保持原样，别跳回 #1
  }

  // 滚动事件按帧合并，避免一次滚动手势跑几十遍 getBoundingClientRect。
  function scheduleNavSpy() {
    if (navSpyRaf) return;
    navSpyRaf = requestAnimationFrame(updateNavActiveFromScroll);
  }

  // 创建通用的“查看更多节点”按钮
  function createMoreBtn(isTop, totalCount) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'craber-nav-more-btn ' + (isTop ? 'craber-nav-more-top' : 'craber-nav-more-bottom');
    btn.title = isTop ? ('查看上方历史节点（共 ' + totalCount + ' 个）') : ('查看下方后续节点（共 ' + totalCount + ' 个）');
    btn.setAttribute('aria-label', isTop ? '查看上方更多节点' : '查看下方更多节点');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (navPanelEl && !navPanelEl.hidden) {
        hideNavPanel();
      } else {
        showNavPanel(btn);
      }
    });
    return btn;
  }

  // 滑动窗口式渲染当前节点附近的 30 个节点（上下总和为 30，居中优先）
  function syncNavBars(totalCount, forcedStartIdx) {
    const visibleCount = Math.min(totalCount, NAV_MAX_VISIBLE_BARS);
    const startIdx = forcedStartIdx !== undefined ? forcedStartIdx : calcNavWindowStart(navActiveIdx, totalCount);
    navWindowStartIdx = startIdx;

    // 清理先前的 top / bottom 更多按钮
    if (navMoreTopBtnEl && navMoreTopBtnEl.parentElement) {
      navRailEl.removeChild(navMoreTopBtnEl);
      navMoreTopBtnEl = null;
    }
    if (navMoreBottomBtnEl && navMoreBottomBtnEl.parentElement) {
      navRailEl.removeChild(navMoreBottomBtnEl);
      navMoreBottomBtnEl = null;
    }

    // 若上方还有更早的历史节点，追加顶部 ···
    if (startIdx > 0) {
      navMoreTopBtnEl = createMoreBtn(true, totalCount);
      navRailEl.insertBefore(navMoreTopBtnEl, navRailEl.firstChild);
    }
    // 若下方还有未展示的后续节点，追加底部 ···
    if (startIdx + visibleCount < totalCount) {
      navMoreBottomBtnEl = createMoreBtn(false, totalCount);
      navRailEl.appendChild(navMoreBottomBtnEl);
    }

    // 确保已有横条数量与 visibleCount 一致
    const existingBars = Array.from(navRailEl.querySelectorAll('.craber-nav-bar'));
    while (existingBars.length > visibleCount) {
      const b = existingBars.pop();
      if (b.parentElement) navRailEl.removeChild(b);
    }
    for (let pos = 0; pos < visibleCount; pos++) {
      const realIdx = startIdx + pos;
      let bar = existingBars[pos];
      if (!bar) {
        bar = document.createElement('button');
        bar.type = 'button';
        bar.className = 'craber-nav-bar';
        if (navMoreBottomBtnEl && navMoreBottomBtnEl.parentElement) {
          navRailEl.insertBefore(bar, navMoreBottomBtnEl);
        } else {
          navRailEl.appendChild(bar);
        }
      }
      bar.dataset.idx = realIdx;
      bar.tabIndex = (realIdx === navActiveIdx) ? 0 : -1;
      bar.classList.toggle('active', realIdx === navActiveIdx);
      if (realIdx === navActiveIdx) bar.setAttribute('aria-current', 'true');
      else bar.removeAttribute('aria-current');
      bar.setAttribute('aria-label', '跳转到回合 ' + (realIdx + 1));
      bar.onclick = () => navigateToTurn(realIdx);
    }

    // 同步顶部/底部更多按钮高亮提示
    if (navMoreTopBtnEl) navMoreTopBtnEl.classList.toggle('active', navActiveIdx >= 0 && navActiveIdx < startIdx);
    if (navMoreBottomBtnEl) navMoreBottomBtnEl.classList.toggle('active', navActiveIdx >= startIdx + visibleCount);
    if (navFocusIdx < startIdx || navFocusIdx >= startIdx + visibleCount) setNavBarFocus(-1);
  }

  // 渲染当前会话的节点轨道。没有 /c/ 会话时隐藏。
  function renderNavRail(force) {
    mountNavRail();
    if (!getConvId()) {
      navRailEl.style.display = 'none';
      hideNavCard();
      hideNavPanel();
      navRenderedCount = 0;
      navIdxById = Object.create(null);
      return;
    }
    if (navRendering) return; // 已有请求在途，避免并发请求叠加触发 429
    if (Date.now() < navBackoffUntil) return;   // 正被限流，安静等着，别陪 ChatGPT 一起卡死
    // ChatGPT 自己的首屏请求还没落地就别插队。页面上一条消息都没挂出来时，
    // 我们这一发全量拉取正好和它撞车。
    if (!document.querySelector('[data-message-id]')) {
      if (navWaitTries++ < NAV_WAIT_MOUNT_MAX) scheduleNavRender(600, force);
      return;
    }
    navWaitTries = 0;
    navRailEl.style.display = 'flex';
    updateNavRailPos();
    navRendering = true;
    navLastFetchTs = Date.now();
    ensureState(!!force).then((st) => {
      navRendering = false;
      navBackoffMs = 0;
      navBackoffUntil = 0;
      if (st.convId !== getConvId()) return;      // 加载期间切走了会话
      if (navConvId !== st.convId) {              // 换会话：状态全部作废，否则残留旧 active
        navConvId = st.convId;
        navActiveIdx = -1;
        Array.prototype.forEach.call(navRailEl.children, (b) => {
          b.classList.remove('active');
          b.tabIndex = -1;
          b.removeAttribute('aria-current');
        });
      }
      rebuildNavIndex(st.turns);
      syncNavBars(st.turns.length);
      navRenderedCount = st.turns.length;
      if (!st.turns.length) {
        navRailEl.style.display = 'none';
        return;
      }
      applyNavDensity(st.turns.length);
      scheduleNavSpy();
    }).catch((e) => {
      navRendering = false;
      // 429 是 ChatGPT 在限流。这时候继续重试会把它自己的请求一起拖住（表现就是
      // 会话打不开），所以退避一段时间，反复触发就翻倍。
      if (e && e.status === 429) {
        navBackoffMs = Math.min(navBackoffMs ? navBackoffMs * 2 : NAV_429_BACKOFF, NAV_429_BACKOFF_MAX);
        navBackoffUntil = Date.now() + navBackoffMs;
      }
      navRailEl.style.display = 'none';
    });
  }

  // 所有会走接口的渲染都从这里排队：任何时刻只有一个待执行的请求，且自动满足
  // 冷却间隔与 429 退避。delay 是这次调用自己希望的延迟，三者取最大。
  function scheduleNavRender(delay, force) {
    clearTimeout(navRenderTimer);
    const cool = NAV_REFRESH_COOLDOWN - (Date.now() - navLastFetchTs);
    const back = navBackoffUntil - Date.now();
    const wait = Math.max(delay || 0, cool, back, 0);
    navRenderTimer = setTimeout(() => {
      navRenderTimer = 0;
      renderNavRail(force);
    }, wait + 30);
  }

  // 换会话时立刻把上一条的轨道收掉。留着它的话，新会话正在挂载的消息在旧 navIdxById
  // 里全是"不认识"，maybeRefreshNavRail 会当成来了新提问，马上再补一次全量拉取。
  function resetNavRail() {
    clearTimeout(navRenderTimer);
    navRenderTimer = 0;
    navWaitTries = 0;
    navConvId = null;
    navActiveIdx = -1;
    navRenderedCount = 0;
    navIdxById = Object.create(null);
    hideNavCard();
    hideNavPanel();
    if (navRailEl) {
      navRailEl.style.display = 'none';
      syncNavBars(0);
    }
  }

  // 只在出现"轨道不认识的用户消息"时刷新 —— 也就是真的有了新提问。
  // 原来比的是 DOM 里用户消息的数量：ChatGPT 虚拟滚动会不停挂载/卸载消息，这个数字
  // 一直在变，长会话里每个冷却周期都会白拉一次接口（还容易吃 429）。
  function maybeRefreshNavRail() {
    if (!navRailEl || navRailEl.style.display === 'none') return;
    if (navRendering || navRenderTimer) return;
    const els = document.querySelectorAll('[data-message-author-role="user"][data-message-id]');
    for (let i = els.length - 1; i >= 0; i--) {   // 新消息挂在末尾，倒着扫最快命中
      if (navIdxById[els[i].dataset.messageId] === undefined) {
        scheduleNavRender(0, true);
        return;
      }
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ============================================================
   * UI：单个回合预览
   * ========================================================== */

  // 极简 markdown -> HTML（仅覆盖预览所需：标题/图片/链接/代码块/引用/换行）
  // 注意：先转义 HTML 再套用规则，避免 XSS 与标签破坏。
  // 行内规则：图片/链接/行内代码/粗体。输入需已 HTML 转义。
  function inlineMd(text) {
    // 行内代码先抽占位，避免其中的 * [ 被其它规则改写
    const codes = [];
    let t = text.replace(/`([^`]+)`/g, (m, c) => {
      codes.push('<code class="cbmd-code">' + c + '</code>');
      return 'CBMDCODE' + (codes.length - 1) + 'ENDCODE';
    });
    // 图片 ![alt](src)（在链接之前）
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (m, alt, src) =>
      '<img class="cbmd-img" src="' + src + '" alt="' + alt + '" loading="lazy">');
    // 链接 [text](url)
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (m, txt, url) =>
      '<a href="' + url + '" target="_blank" rel="noopener">' + txt + '</a>');
    // 粗体、斜体
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // 还原行内代码占位
    t = t.replace(/CBMDCODE(\d+)ENDCODE/g, (m, i) => codes[+i]);
    return t;
  }

  // 行级 markdown -> HTML（预览用）。逐行扫描，正确处理任意长度围栏代码块、
  // 标题、水平线、引用、无序/有序列表、表格、段落。
  function miniMarkdownToHtml(md) {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    let para = [];       // 累积普通段落行
    let list = null;     // { type:'ul'|'ol', items:[] }

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

      // 围栏代码块：``` 或更多反引号，允许带语言标注（含 ```markdown）
      const fence = line.match(/^(\s*)(`{3,})(.*)$/);
      if (fence) {
        flushAll();
        const marker = fence[2];
        const code = [];
        i++;
        // 找到长度 >= 起始的闭合围栏
        while (i < lines.length && !new RegExp('^\\s*`{' + marker.length + ',}\\s*$').test(lines[i])) {
          code.push(lines[i]);
          i++;
        }
        i++; // 跳过闭合行
        out.push('<pre class="cbmd-pre"><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
        continue;
      }

      // 水平线 --- *** ___
      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
        flushAll();
        out.push('<hr>');
        i++;
        continue;
      }

      // 标题 # ~ ######
      const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (h) {
        flushAll();
        const lvl = Math.min(h[1].length + 1, 6); // # -> h2，避免与页面 h1 冲突
        out.push('<h' + lvl + '>' + inlineMd(escapeHtml(h[2])) + '</h' + lvl + '>');
        i++;
        continue;
      }

      // 引用 >
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

      // 表格：| a | b | 且下一行是 |---|---|
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length &&
          /^\s*\|?[\s:-]*\|[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        flushAll();
        const parseRow = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = parseRow(line);
        i += 2; // 跳过表头与分隔行
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        let tbl = '<table class="cbmd-table"><thead><tr>' +
          head.map((c) => '<th>' + inlineMd(escapeHtml(c)) + '</th>').join('') + '</tr></thead><tbody>';
        for (const r of rows) {
          tbl += '<tr>' + r.map((c) => '<td>' + inlineMd(escapeHtml(c)) + '</td>').join('') + '</tr>';
        }
        tbl += '</tbody></table>';
        out.push(tbl);
        continue;
      }

      // 无序列表 - * +
      const ul = line.match(/^\s*[-*+]\s+(.+)$/);
      if (ul) {
        flushPara();
        if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
        list.items.push(ul[1]);
        i++;
        continue;
      }
      // 有序列表 1. 2.
      const ol = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ol) {
        flushPara();
        if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
        list.items.push(ol[1]);
        i++;
        continue;
      }

      // 空行：结束段落/列表
      if (/^\s*$/.test(line)) {
        flushAll();
        i++;
        continue;
      }

      // 普通文本行
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
        <div class="craber-preview-body cbmd">
          <div class="craber-empty"><span class="craber-spin"></span> 渲染中…</div>
        </div>
      </div>`;
    document.body.appendChild(pm);

    const closeP = () => pm.remove();
    pm.addEventListener('click', (e) => { if (e.target === pm) closeP(); });
    pm.querySelector('.craber-x').addEventListener('click', closeP);

    const body = pm.querySelector('.craber-preview-body');
    try {
      // 图片走 base64 内嵌；文档只列出名称，避免预览下载大型原文件。
      const { md } = await renderTurn(turn, null, null, { downloadAttachments: false });
      body.innerHTML = miniMarkdownToHtml(md);
    } catch (err) {
      body.innerHTML = '<div class="craber-empty">预览失败：' + escapeHtml(err.message) + '</div>';
      console.error('[gpt-craber]', err);
    }
  }

  // 预览整个会话：拉取会话内容，合并渲染为单个 markdown 后显示。
  // 图片走 base64 内嵌（不传 zip sink），以便预览直接可见。
  async function openConvPreview(meta) {
    const pm = document.createElement('div');
    pm.className = 'craber-mask craber-preview-mask';
    pm.innerHTML = `
      <div class="craber-panel craber-preview-panel" role="dialog" aria-label="会话预览">
        <div class="craber-hd">
          <h3>预览 · ${escapeHtml((meta.title || '未命名会话').slice(0, 40))}</h3>
          <button class="craber-x" title="关闭" aria-label="关闭">×</button>
        </div>
        <div class="craber-preview-body cbmd">
          <div class="craber-empty"><span class="craber-spin"></span> 加载并渲染中…</div>
        </div>
      </div>`;
    document.body.appendChild(pm);

    const closeP = () => pm.remove();
    pm.addEventListener('click', (e) => { if (e.target === pm) closeP(); });
    pm.querySelector('.craber-x').addEventListener('click', closeP);

    const body = pm.querySelector('.craber-preview-body');
    const statusHint = (n, total) => {
      body.innerHTML = '<div class="craber-empty"><span class="craber-spin"></span> 渲染回合 ' +
        n + '/' + total + ' …</div>';
    };
    try {
      const conv = await API.getConversation(meta.id);
      const { md } = await renderConversationToMd(conv, null, statusHint, { downloadAttachments: false });
      body.innerHTML = miniMarkdownToHtml(md);
    } catch (err) {
      body.innerHTML = '<div class="craber-empty">预览失败：' + escapeHtml(err.message) + '</div>';
      console.error('[gpt-craber]', err);
    }
  }

  /* ============================================================
   * UI：悬浮按钮 + 单条导出按钮注入
   * ========================================================== */

  // 悬浮球：可拖拽（位置存 localStorage），双击展开菜单（会话列表 / 导出当前）。
  // 固定右下角会挡内容，改成用户可随手拖到不碍事的位置。
  const FAB_POS_KEY = 'gpt_craber_fab_pos';

  function mountFab() {
    if (document.querySelector('.craber-fab-ball')) return;

    const ball = document.createElement('button');
    ball.className = 'craber-fab-ball';
    // 蟹图标：蟹身填 currentColor（由 .craber-fab-ball 的 color 统一控制为蟹绿）
    ball.innerHTML = CRAB_SVG;
    ball.title = '拖拽移动 · 双击展开菜单';

    const menu = document.createElement('div');
    menu.className = 'craber-fab-menu';

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
      menu.classList.toggle('craber-up', onBottom);
      menu.classList.toggle('craber-down', !onBottom);
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

    // 展开/收起菜单，逐项交错（用内联 transition-delay）。
    // 展开：离球近的项先出现；收起：离球远的项先缩回。
    const STEP = 60;
    function setMenuOpen(open) {
      const items = [btnConv, btnCur, btnCollapse];
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

    // 双击展开菜单（拖拽过就不触发）。收起只靠菜单里的「收起」项。
    ball.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (moved) return;
      setMenuOpen(true);
    });

    btnConv.addEventListener('click', openConvPanel);
    btnCur.addEventListener('click', openPanel);
    btnCollapse.addEventListener('click', () => { setMenuOpen(false); });

    window.addEventListener('resize', () => { pos = clamp(pos.x, pos.y); applyPos(); });

    applyPos();
    document.body.appendChild(ball);
    document.body.appendChild(menu);
  }

  // 从 assistant 的操作栏所在 section，回溯到最近的带 user message-id 的
  // section，用该 id 在 nodeIndex 里定位对应回合。
  // 结构（已确认）：conversation-turn section 交替出现，user 段带 data-message-id，
  // assistant 段带复制按钮但自身无 message-id。
  function resolveUserMessageIdFromToolbar(toolbarBtn) {
    const section = toolbarBtn.closest('[data-testid^="conversation-turn"]');
    if (!section) return null;
    // 先看本 section 内是否直接有 user message-id
    const inSelf = section.querySelector('[data-message-author-role="user"][data-message-id]');
    if (inSelf) return inSelf.getAttribute('data-message-id');
    // 各 section 分处不同父容器，previousElementSibling 辿不到前一轮。
    // 改用全局 turn 列表：定位本 section 后，向前找最近的 user message-id。
    const all = [...document.querySelectorAll('[data-testid^="conversation-turn"]')];
    const idx = all.indexOf(section);
    for (let j = idx - 1; j >= 0; j--) {
      const u = all[j].querySelector('[data-message-author-role="user"][data-message-id]');
      if (u) return u.getAttribute('data-message-id');
    }
    return null;
  }

  // 挂在 body 上的共享 tooltip 元素（逃出操作栏的 overflow 裁切）
  let _tipEl = null;
  function getTipEl() {
    if (!_tipEl) {
      _tipEl = document.createElement('div');
      _tipEl.className = 'craber-tip';
      document.body.appendChild(_tipEl);
    }
    return _tipEl;
  }
  // 给元素绑定深色 tooltip：hover 时按元素位置把气泡定位到其下方居中。
  function bindTooltip(el, text) {
    el.addEventListener('mouseenter', () => {
      const tip = getTipEl();
      tip.textContent = text;
      const r = el.getBoundingClientRect();
      tip.style.display = 'block';
      // 先显示以取得尺寸，再定位到按钮下方居中
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

  // 克隆原生复制按钮的外观，做一个同款“导出 md”按钮，插进原生操作栏。
  function injectSingleButtons() {
    const copyBtns = document.querySelectorAll('[data-testid="copy-turn-action-button"]');
    copyBtns.forEach((copyBtn) => {
      const bar = copyBtn.parentElement;
      if (!bar) return;
      // 防重复：查操作栏里是否已有我们的按钮（且仍在 DOM 中），而不是在 bar 上打标记。
      // ChatGPT(React) 流式输出/重渲染操作栏时会移除我们注入的按钮，却保留 bar 上的
      // 自定义属性；若靠属性标记判重，标记永远为真、按钮再也补不回来（表现为回复里的
      // 导出按钮消失）。改成查子节点后，按钮被删就会在下次扫描时重新补上。
      if (bar.querySelector(':scope > [data-craber-export]')) return;

      const b = document.createElement('button');
      b.type = 'button';
      // 沿用原生按钮的 class，外观与复制/朗读一致
      b.className = copyBtn.className;
      b.setAttribute('aria-label', '导出为 Markdown');
      b.setAttribute('data-craber-export', '1');
      // 用螃蟹 emoji 作图标，套用原生图标按钮的正方形尺寸（h-8 w-8），
      // 避免依赖 ChatGPT 的 svg sprite（其 href 会变）
      b.innerHTML = '<span class="flex items-center justify-center h-8 w-8" style="color:#22a06b">' + CRAB_SVG.replace(/width="26" height="26"/, 'width="18" height="18"') + '</span>';

      // tooltip：不用原生 title（浏览器白框），也不用 ::after（会被操作栏 overflow 裁切）。
      // 改用挂在 body 上的独立元素，hover 时按按钮位置定位，逃出任何父级裁切。
      bindTooltip(b, 'crab导出');

      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const label = b.querySelector('span');
        // 图标是 SVG，用 innerHTML 暂存/恢复（textContent 会丢掉 SVG）
        const old = label.innerHTML;
        label.textContent = '…';
        b.disabled = true;
        try {
          const uid = resolveUserMessageIdFromToolbar(b);
          if (!uid) throw new Error('未能定位到对应消息（DOM 结构可能已变）');
          await exportSingleByMessageId(uid);
          label.textContent = '✓';
        } catch (err) {
          label.textContent = '⚠️';
          console.error('[gpt-craber]', err);
          alert('导出失败：' + err.message);
        } finally {
          setTimeout(() => { label.innerHTML = old; b.disabled = false; }, 1200);
        }
      });

      // 追加到操作栏末尾，而不是插在复制按钮之后。插在原生按钮中间会打乱 React 对
      // 同级节点的 diff，重渲染时可能抛 removeChild 错误、连带把整条操作栏（含原生
      // 复制/朗读等按钮）清空。追加到末尾对 React 同级调和最友好。
      bar.appendChild(b);
    });
  }

  // MutationObserver 跟进虚拟滚动挂载的新消息节点。
  // 注意：injectSingleButtons 会写 node.style.position，本身也会触发 DOM 变更，
  // 若直接在回调里同步执行会自我触发、加上 ChatGPT 流式更新造成疯狂重入（闪烁）。
  // 用 debounce：变更停止一小段时间后才执行一次。
  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      mountFab();
      injectSingleButtons();
      maybeRefreshNavRail();
    }, 250);
  }
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });

  // SPA 切换对话时失效缓存（仅在路径变化时动作，不每秒扫描 DOM）
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      state = { convId: null, conv: null, turns: [], nodeIndex: {} };
      resetNavRail();
      scheduleScan();
      scheduleNavRender(NAV_SWITCH_DELAY);   // 别立刻拉，会和 ChatGPT 自己的首屏请求撞车
    } else {
      // 路径没变时也轻量重定位：侧边栏收起/展开会改变 main 的左边缘
      updateNavRailPos();
    }
  }, 1000);

  mountFab();
  injectSingleButtons();
  // 等 ChatGPT 自己的首屏请求先跑，避免和它的 paginated_conversation 撞车触发 429
  scheduleNavRender(NAV_SWITCH_DELAY);
  console.log('[gpt-craber] 对话导出脚本已加载');
})();
