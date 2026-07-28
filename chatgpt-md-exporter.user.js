// ==UserScript==
// @name         craber（ChatGPT导出）
// @namespace    gpt-craber
// @version      0.2.1
// @description  gpt-craber：导出 ChatGPT 对话为 Markdown。支持单条导出、批量 zip 导出、多会话导出，适配文本/代码/图片/联网引用等多种消息类型。
// @author       gpt-craber
// @homepageURL  https://github.com/yixing233/GPTCraber
// @supportURL   https://github.com/yixing233/GPTCraber/issues
// @downloadURL  https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-md-exporter.user.js
// @updateURL    https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-md-exporter.user.js
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
      if (!r.ok) throw new Error('会话内容获取失败: ' + r.status);
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
      const parts = node && node.message.content && node.message.content.parts;
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

  function renderAnswerNode(node, cache) {
    const m = node.message;
    const role = m.author && m.author.role;
    const ct = m.content && m.content.content_type;

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
  async function renderTurn(turn, onProgress, sink, opts) {
    const withQuestion = settings.mode === 'qa' || !!(opts && opts.forceQuestion);
    const blobs = await fetchImageBlobs(turn, withQuestion, onProgress);
    const cache = await resolveImageCache(blobs, sink || makeDataUriSink());

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
  async function renderConversationToMd(conv, sink, onProgress) {
    const thread = buildThread(conv);
    const turns = groupTurns(thread);
    let md = '# ' + (conv.title || '未命名会话') + '\n\n';
    let done = 0;
    for (let i = 0; i < turns.length; i++) {
      const r = await renderTurn(turns[i], null, sink);
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
    // 判断是否含图（托管图 + 搜索配图）；含图时才打成 zip，把图片写进 images/
    // 目录、md 用相对路径引用——base64 内嵌在很多 Markdown 阅读器里不显示。
    // 纯文字回合再套 zip 反而累赘，仍旧直接下 .md。
    // 单条导出始终带问题，故数图时也把问题里的图算进去（第二参传 true），
    // 与 renderTurn 的 forceQuestion 保持一致，避免漏判问题图而退回 base64。
    const hasImages = settings.embedImages &&
      (collectFileIds(turn, true).length > 0 || collectSearchImageUrls(turn).length > 0);

    if (hasImages) {
      const zip = createZip();
      const sink = makeZipImageSink(zip); // 图片写入 images/，md 引用相对路径
      const { title, md } = await renderTurn(turn, null, sink, { forceQuestion: true });
      zip.add(sanitizeFilename(title) + '.md', _enc.encode(md));
      triggerDownload(zip.generate(), sanitizeFilename(title) + '.zip');
      return;
    }

    const { title, md } = await renderTurn(turn, null, null, { forceQuestion: true });
    triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }), sanitizeFilename(title) + '.md');
  }

  async function exportBatch(selectedTurns, onProgress) {
    // 只选了一轮：直接导出单个 md（图片 base64 内嵌），不打包成 zip。
    if (selectedTurns.length === 1) {
      const turn = selectedTurns[0];
      const sink = makeDataUriSink(); // 单文件无处放 images/ 目录，图片以 data URI 内嵌
      const { title, md } = await renderTurn(turn, onProgress, sink);
      if (onProgress) onProgress(1, 1);
      const seq = (state.turns ? state.turns.indexOf(turn) : -1) + 1;
      const pad1 = String((state.turns && state.turns.length) || 1).length;
      const prefix = seq > 0 ? String(seq).padStart(pad1, '0') + '_' : '';
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
    }
    @media (prefers-color-scheme:dark){
      :root{
        --craber-bg:#26282c; --craber-fg:#e8eaed; --craber-sub:#9aa0a8;
        --craber-line:#3a3d43; --craber-hover:#2f3237; --craber-ghost:#34373d;
        --craber-skeleton:#33363b; --craber-skeleton-hi:#3c4046;
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
    .craber-dd-menu{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:10;
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
      // 状态栏随筛选结果变化：无筛选显示总数，有筛选显示「匹配/总数」
      const filtered = shown.length !== metas.length;
      statusEl.textContent = filtered
        ? '筛选出 ' + shown.length + ' / 共 ' + metas.length + ' 个会话'
        : '共 ' + metas.length + ' 个会话';
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
      // 复用导出的渲染逻辑，图片走 base64 内嵌以便预览直接可见
      const { md } = await renderTurn(turn);
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
      const { md } = await renderConversationToMd(conv, null, statusHint);
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
      scheduleScan();
    }
  }, 1000);

  mountFab();
  injectSingleButtons();
  console.log('[gpt-craber] 对话导出脚本已加载');
})();
