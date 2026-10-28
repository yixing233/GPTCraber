// ==UserScript==
// @name         craber（ChatGPT导出）
// @namespace    gpt-craber
// @version      0.15.2
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

  // 螃蟹图标（内联 SVG）。fill 用 currentColor，蟹身颜色由容器 color 决定
  // （顶栏导出按钮里设为蟹绿），换平台时也统一走这一处。
  const CRAB_SVG = '<svg viewBox="0 0 71.493 71.493" width="26" height="26" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M69.857,43.299l-10.626-5.432c3.038-3.402,4.707-7.433,4.707-11.651 c0-8.227-6.175-15.503-16.114-18.989c-1.109-0.388-2.342-0.096-3.155,0.751c-0.814,0.846-1.06,2.089-0.628,3.182 c0.338,0.857,0.51,1.734,0.51,2.609c0,0.492-0.052,0.688-0.045,0.69c-0.083,0.105-0.393,0.362-0.643,0.569 c-0.422,0.35-0.947,0.785-1.546,1.386c-0.688,0.692-0.996,1.676-0.826,2.637s0.796,1.78,1.68,2.194 c1.956,0.918,8.324,4.331,8.361,9.76c-2.459-1.79-5.451-3.167-8.78-3.981c0.156-0.366,0.242-0.769,0.242-1.193 c0-1.688-1.369-3.055-3.055-3.055c-1.688,0-3.055,1.367-3.055,3.055c0,0.13,0.023,0.255,0.038,0.381 c-0.39-0.015-0.782-0.023-1.176-0.023c-0.394,0-0.787,0.008-1.176,0.023c0.016-0.126,0.038-0.25,0.038-0.381 c0-1.688-1.369-3.055-3.055-3.055c-1.688,0-3.055,1.367-3.055,3.055c0,0.423,0.086,0.826,0.242,1.193 c-3.785,0.925-7.138,2.576-9.763,4.737c0.216-4.082,4.91-8.435,9.345-10.516c0.884-0.415,1.511-1.233,1.68-2.195 c0.17-0.961-0.139-1.945-0.827-2.637c-0.598-0.601-1.124-1.037-1.546-1.386c-0.255-0.211-0.572-0.474-0.622-0.528 c-0.001-0.001-0.065-0.181-0.065-0.73c0-0.873,0.172-1.751,0.511-2.61c0.432-1.092,0.186-2.335-0.628-3.181 c-0.814-0.848-2.05-1.14-3.154-0.751C13.729,10.71,7.554,17.987,7.554,26.215c0,4.218,1.669,8.249,4.707,11.651L1.635,43.299 C0.16,44.053-0.425,45.86,0.33,47.336c0.53,1.038,1.582,1.635,2.673,1.635c0.46,0,0.927-0.106,1.363-0.329l8.695-4.445 c0.069,0.981,0.255,1.939,0.536,2.869L2.868,52.551c-1.476,0.754-2.061,2.562-1.306,4.037c0.53,1.038,1.582,1.635,2.673,1.635 c0.46,0,0.927-0.106,1.363-0.329l10.888-5.566c0.491,0.589,1.027,1.154,1.607,1.692l-9.282,4.745 c-1.476,0.754-2.061,2.562-1.306,4.037c0.53,1.038,1.582,1.635,2.673,1.635c0.46,0,0.927-0.106,1.363-0.329l11.887-6.077 c0.131-0.067,0.253-0.143,0.369-0.226c3.474,1.623,7.568,2.563,11.949,2.563c4.381,0,8.475-0.94,11.949-2.563 c0.116,0.082,0.238,0.159,0.369,0.226l11.887,6.077c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635 c0.755-1.476,0.17-3.283-1.306-4.037L53.4,54.02c0.58-0.538,1.116-1.103,1.606-1.692l10.888,5.566 c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635c0.755-1.476,0.17-3.283-1.306-4.037l-10.729-5.485 c0.281-0.931,0.466-1.888,0.536-2.87l8.695,4.445c0.437,0.223,0.903,0.329,1.363,0.329c1.091,0,2.143-0.597,2.673-1.635 C71.918,45.86,71.333,44.053,69.857,43.299z M50.472,15.06c4.65,2.828,7.466,6.906,7.466,11.155c0,1.07-0.176,2.131-0.516,3.166 c-0.584-4.354-3.438-8.421-8.006-11.487C49.934,17.163,50.316,16.273,50.472,15.06z M21.02,15.06 c0.158,1.229,0.548,2.126,1.076,2.863c-3.65,2.491-6.962,6.022-8.393,10.004c-0.099-0.566-0.149-1.138-0.149-1.711 C13.554,21.966,16.37,17.888,21.02,15.06z M19.027,43.278c0-6.011,7.656-11.089,16.72-11.089c9.063,0,16.719,5.078,16.719,11.089 s-7.656,11.089-16.719,11.089C26.683,54.368,19.027,49.29,19.027,43.278z"/></svg>';

  // 版本号兜底常量：GM_info 不可用时（极少见）菜单脚注还能显示。
  // 发版时与头部 @version 同步改。
  const CRABER_VERSION = '0.15.2';

  // 私有区字符范围 U+E000..U+F8FF（ChatGPT 用来标记引用位置）。
  // 用 fromCharCode 构造，避免手写 \uXXXX 转义出错。
  const PUA = new RegExp('[' + String.fromCharCode(0xE000) + '-' + String.fromCharCode(0xF8FF) + ']', 'g');

  const SETTINGS_KEY = 'gpt_craber_settings';
  const DEFAULT_SETTINGS = {
    mode: 'qa',            // 'qa' = 问答对；'ai' = 仅 AI 回复
    includeCode: false,    // 是否导出 assistant/code（工具调用代码，如 search(...)）
    sourcesFooter: true,   // 是否在文末附"参考来源"
    embedImages: true,     // ChatGPT 托管图是否转 base64 内嵌（否则用临时链接）
    includeTools: false,   // 是否导出工具调用及其结果（默认关：通常会整段复述文档）
    includeReasoning: false // 是否导出思考/推理过程（默认关，折叠显示）
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

  // 当前时间戳，用于文件名后缀：20261023-1618
  // 精确到分钟即可：同一天同一分钟连续导出的概率很低，真撞了浏览器也会加 (1)。
  function craberStamp(d) {
    const t = d || new Date();
    const p = (n) => String(n).padStart(2, '0');
    return String(t.getFullYear()) + p(t.getMonth() + 1) + p(t.getDate())
      + '-' + p(t.getHours()) + p(t.getMinutes());
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

  // 官方限流是按账号/IP 生效的（实测连续取全量会话约 9~12 个就会 429），
  // 429 响应带 Retry-After，照它等待再继续，比盲目重试有效得多。
  let apiBackoffUntil = 0;   // 命中 429 后的静默期终点

  // 记录一次限流：有 Retry-After 就照它，没有就给个保守值。
  function noteRateLimit(res) {
    const ra = parseInt(res && res.headers.get('retry-after'), 10);
    const ms = ra > 0 ? ra * 1000 : 30000;
    apiBackoffUntil = Math.max(apiBackoffUntil, Date.now() + ms);
    return ms;
  }

  // 所有 backend-api 请求前都过一下：正在静默期就等到期为止。
  async function apiWait() {
    while (true) {
      const wait = apiBackoffUntil - Date.now();
      if (wait <= 0) return;
      await new Promise((r) => setTimeout(r, Math.min(wait, 10000)));
    }
  }

  // 取全量会话之间留的间隔。这条接口的限制比列表接口严，挨着打很快会 429。
  const API_GAP_MS = 2000;
  let apiLastAt = 0;
  async function apiGap() {
    const wait = apiLastAt + API_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    apiLastAt = Date.now();
  }

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

    // 全量取会话：这条最容易触发限流，所以排队等待 + 限流退避 + 按 Retry-After 自动重试。
    // attempt 让"被限流后自动接着拉"成为默认行为，调用方不用自己写重试。
    //
    // 端点会变：曾经可靠的单数 /backend-api/conversation/{id} 已经出现过 404。
    // 所以这里按顺序试几个候选，第一个 2xx 且能解析出内容的就采用。
    async getConversation(convId, attempt) {
      const tries = attempt || 0;
      await apiWait();
      const t = await this.getToken();
      await apiGap();

      const gid = craberCurrentGizmoId();
      const cands = [
        '/backend-api/conversation/' + convId,
        '/backend-api/conversations/' + convId + '?include_has_versions=true',
        '/backend-api/conversations/' + convId
      ];
      if (gid) cands.splice(1, 0, '/backend-api/gizmos/' + gid + '/conversation/' + convId);

      let lastStatus = 0;
      let sawInaccessible = false;

      // 两种鉴权方式都试：先带 Bearer（多数情况够用），
      // 再纯 Cookie（原生页面就是纯 Cookie）。有些账号的 accessToken 与
      // Cookie 会话并不等价，此时带 token 反而会被判 conversation_inaccessible。
      // 按已知可行的方式优先尝试；另一种留作兜底
      const bearer = { Authorization: 'Bearer ' + t };
      const authModes = craberAuthMode === 'cookie'
        ? [null, bearer]
        : [bearer, null];

      for (const url of cands) {
        for (let ai = 0; ai < authModes.length; ai++) {
          const auth = authModes[ai];
          const headers = auth ? auth : {};
          const r = await fetch(url, { headers, credentials: 'include' });

          if (r.status === 429 && tries < 3) {
            noteRateLimit(r);
            return this.getConversation(convId, tries + 1);
          }
          if (!r.ok) {
            lastStatus = r.status;
            try {
              const e = await r.json();
              const code = e && e.detail && e.detail.code;
              if (code === 'conversation_inaccessible') sawInaccessible = true;
            } catch (err) { /* 非 JSON 响应，忽略 */ }

            // 只在"鉴权可能有问题"时才换下一种鉴权；
            // 404/405 说明这个端点不对，换鉴权没意义，直接换端点，
            // 避免把请求数放大好几倍（会更容易触发限流）。
            const authIssue = r.status === 401 || r.status === 403 || sawInaccessible;
            if (!authIssue) break;
            continue;
          }

          let j = null;
          try { j = await r.json(); } catch (e) { continue; }
          // 能解析出消息结构的才算数：避免拿到空壳把整篇导出搞成白板
          if (j && (j.mapping || Array.isArray(j.items) || Array.isArray(j.messages))) {
            craberNoteAuthMode(auth ? 'bearer' : 'cookie');
            return j;
          }
          lastStatus = lastStatus || 200;
        }
      }

      const msg = sawInaccessible
        ? '无法访问该会话（conversation_inaccessible）。可能原因：它属于另一个账号或工作区，'
          + '或已被删除。可尝试刷新页面后重新打开该会话再导出。'
        : '会话内容获取失败: ' + (lastStatus || '未知');
      const err = new Error(msg);
      err.status = lastStatus || 0;   // 调用方要靠它区分 429（限流）和真失败
      err.code = sawInaccessible ? 'conversation_inaccessible' : null;
      throw err;
    },

    /* 取附件下载信息：{ download_url, mime_type, file_name }
     * 403 很常见（附件属主不是当前账号、文件已过期、或该文件的下载权限被收紧），
     * 而它并非"脚本坏了"，所以这里做两件事：
     *   1) 带 Bearer 失败时再用纯 Cookie 试一次（和 getConversation 同一套兜底逻辑）
     *   2) 失败结果记进 _fileDenied，同一份导出里不再对同一个 id 反复重试
     */
    _fileDenied: Object.create(null),
    async getFileInfo(fileId, opts) {
      if (!fileId) throw new Error('附件 id 为空');
      const memo = this._fileDenied[fileId];
      // 负缓存只活 10 分钟：链接权限可能恢复，没必要一辈子判死
      if (memo && Date.now() - memo < 10 * 60 * 1000) {
        throw new Error('文件信息获取失败: ' + memo);
      }
      await apiWait();
      let t = null;
      try { t = await this.getToken(); } catch (e) { t = null; }

      // 两种鉴权各试一次，顺序按已知有效的方式排前面。注意别放进重复项：
      // 早先这里用「null 且还没失败过就跳过」来去重，结果当首选就是 cookie 时
      // 把唯一那次 cookie 请求也跳过了，兜底形同虚设。
      const bearerHeaders = t ? { Authorization: 'Bearer ' + t } : null;
      const modes = craberAuthMode === 'cookie'
        ? [null, bearerHeaders]
        : [bearerHeaders, null];
      const tried = [];
      let lastStatus = 0;
      let lastErr = null;
      for (const headers of modes) {
        // null 表示"纯 Cookie"；重复出现或拿不到 token 时只留一个
        const key = headers ? 'bearer' : 'cookie';
        if (tried.indexOf(key) >= 0) continue;
        tried.push(key);
        try {
          const r = await fetch('/backend-api/files/' + fileId + '/download', {
            headers: headers || {},
            credentials: 'include'
          });
          if (r.status === 429) {
            noteRateLimit(r);
            throw new Error('文件信息获取失败: 429（已限流）');
          }
          if (r.ok) {
            const j = await r.json();
            // 拿到了就记一下哪种鉴权有效，供后续请求优先使用
            craberNoteAuthMode(headers ? 'bearer' : 'cookie');
            return j;
          }
          lastStatus = r.status;
          // 只有鉴权类错误才换模式；404 说明文件确实没了，换模式没意义
          if (r.status !== 401 && r.status !== 403) break;
        } catch (e) {
          if (/429/.test(String(e && e.message))) { lastStatus = 429; lastErr = e; break; }
          lastErr = e;
        }
      }
      if (lastStatus === 401 || lastStatus === 403 || lastStatus === 404) {
        this._fileDenied[fileId] = lastStatus;
      }
      if (lastErr) throw lastErr;
      throw new Error('文件信息获取失败: ' + (lastStatus || '未知'));
    },

    // 拉取会话列表的一页：{ items, total, limit, offset }
    async getConversations(offset, limit) {
      await apiWait();
      const t = await this.getToken();
      const url = '/backend-api/conversations?offset=' + offset + '&limit=' + limit + '&order=updated';
      const r = await fetch(url, {
        headers: { Authorization: 'Bearer ' + t },
        credentials: 'include'
      });
      if (r.status === 429) {
        noteRateLimit(r);
        const err = new Error('会话列表获取失败: 429（已限流，请稍后再试）');
        err.status = 429;
        throw err;
      }
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
    /* 取项目名。401 时换纯 Cookie 再试一次：
     * 实测有些账号 accessToken 与 Cookie 会话并不等价，带 Bearer 反而 401/403，
     * 而不带 Authorization 的同源请求是通的。这与 getConversation 的兜底是同一套思路。
     * 另外失败不再逐条 console.warn —— 一次列表加载可能涉及几十个项目，
     * 每个都打一行会把控制台刷满，改为聚合成一条。
     */
    _gizmoFail: 0,
    async getGizmoName(gizmoId) {
      if (!gizmoId) return null;
      if (Object.prototype.hasOwnProperty.call(this._gizmoCache, gizmoId)) {
        return this._gizmoCache[gizmoId];
      }
      const parse = (j) => (j && j.gizmo && j.gizmo.display && j.gizmo.display.name)
        || (j && j.display && j.display.name) || null;

      let name = null;
      let t = null;
      try { t = await this.getToken(); } catch (e) { t = null; }

      const modes = t ? [{ Authorization: 'Bearer ' + t }, null] : [null];
      for (const headers of modes) {
        try {
          const r = await fetch('/backend-api/gizmos/' + gizmoId, {
            headers: headers || {},
            credentials: 'include'
          });
          if (r.status === 429) { noteRateLimit(r); break; }
          if (!r.ok) {
            // 401/403 才值得换鉴权；404 说明项目不存在，直接收手
            if (r.status === 401 || r.status === 403) continue;
            break;
          }
          name = parse(await r.json());
          if (name) { craberNoteAuthMode(headers ? 'bearer' : 'cookie'); break; }
        } catch (e) { break; }
      }

      // 只在成功时缓存。失败（403/限流/网络）也缓存的话，这个项目名会永久
      // 是 null，后面再问也永远拿不到 —— 表现为"项目列表里没有项目"（实测）。
      if (name) this._gizmoCache[gizmoId] = name;
      else if (++this._gizmoFail === 1) {
        console.debug('[gpt-craber] 部分项目名取不到（权限或接口变化），已回退显示项目 id');
      }
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

  // 当前页面所在的 gizmo/项目 id（有些会话端点需要它）
  // 记录"哪种鉴权方式可用"，避免每次请求都白试一遍。
  // 'bearer' = 带 Authorization；'cookie' = 仅 Cookie（原生页面的做法）。
  let craberAuthMode = 'bearer';
  function craberNoteAuthMode(mode) {
    if (mode && craberAuthMode !== mode) craberAuthMode = mode;
  }

  function craberCurrentGizmoId() {
    const m = location.pathname.match(/\/g\/(g-p-[0-9a-f]+)/);
    return m ? m[1] : null;
  }

  // 把会话还原成"一条从提问到回答的线性线程"。
  //
  // 首选 mapping + current_node（ChatGPT 的树形结构，能正确取到当前分支）。
  // 但结构会变：拿不到 mapping 时退回 items / messages 数组，
  // 否则整篇导出会变成空白（实测踩到过 404 后 mapping 缺失的情况）。
  function buildThread(conv) {
    const map = conv && conv.mapping;
    const out = [];
    if (map && typeof map === 'object') {
      let cur = conv.current_node;
      while (cur) {
        const node = map[cur];
        if (node && node.message) out.push(node);
        cur = node ? node.parent : null;
      }
      if (out.length) return out.reverse();
      // 有 mapping 但没有 current_node（或链断了）：按 create_time 排序兜底
      const nodes = Object.keys(map)
        .map((k) => map[k])
        .filter((n) => n && n.message);
      nodes.sort((a, b) => (a.message.create_time || 0) - (b.message.create_time || 0));
      return nodes;
    }

    // 没有 mapping：尝试直接数组形式
    const arr = (conv && (conv.items || conv.messages)) || null;
    if (Array.isArray(arr)) {
      return arr.map((m) => (m && m.message ? m : { message: m }))
        .filter((n) => n && n.message);
    }
    return [];
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
    if (!node || !node.message) return '';
    const c = node.message.content;
    if (!c) return '';
    // 优先 parts 里的字符串；新结构有时把正文放在 content.text
    const parts = c.parts || [];
    let s = parts.filter((p) => typeof p === 'string').join(' ').trim();
    if (!s && typeof c.text === 'string') s = c.text.trim();
    return s.replace(PUA, '').trim();
  }

  // 从任意 message 里尽力取出纯文本（未知类型的兜底用）。
  // 有些新结构把正文放在 parts[].text / parts[].content，而不是裸字符串。
  function craberLooseText(m) {
    if (!m) return '';
    const c = m.content || {};
    const out = [];
    if (typeof c.text === 'string') out.push(c.text);
    for (const p of (c.parts || [])) {
      if (typeof p === 'string') { out.push(p); continue; }
      if (!p || typeof p !== 'object') continue;
      if (typeof p.text === 'string') out.push(p.text);
      else if (typeof p.content === 'string') out.push(p.content);
      else if (typeof p.value === 'string') out.push(p.value);
    }
    // 有些结构把结果塞在 metadata 里
    const md = m.metadata || {};
    if (!out.length && typeof md.text === 'string') out.push(md.text);

    // 实测字段（与通用猜测不同，这几个必须单独认）：
    //   content_type=thoughts         -> content.thoughts（通常字符串或数组）
    //   content_type=reasoning_recap  -> content.content（字符串）
    //   content_type=tether_quote     -> content.text（网页正文，默认不导出）
    if (!out.length) {
      const th = c.thoughts;
      if (typeof th === 'string') out.push(th);
      else if (Array.isArray(th)) {
        for (const x of th) {
          if (typeof x === 'string') out.push(x);
          else if (x && typeof x === 'object') {
            if (typeof x.text === 'string') out.push(x.text);
            else if (typeof x.content === 'string') out.push(x.content);
            else if (typeof x.summary === 'string') out.push(x.summary);
          }
        }
      }
    }
    if (!out.length && c.content_type === 'reasoning_recap' && typeof c.content === 'string') {
      out.push(c.content);
    }
    return out.join('\n\n').replace(PUA, '').trim();
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

  /* 单次导出内的附件/图片失败统计
   * 附件 403 现在很常见（属主不同、链接过期、权限收紧），它不是脚本错误，
   * 但"文件没进 zip"这件事必须让用户知道 —— 否则解压后才发现少了东西。
   * 这里只计数，收敛成一条汇总；逐条细节留在 console.debug（默认不显示）。
   */
  const craberStats = { attTotal: 0, attFail: 0, imgTotal: 0, imgFail: 0 };
  function craberStatsReset() {
    craberStats.attTotal = 0; craberStats.attFail = 0;
    craberStats.imgTotal = 0; craberStats.imgFail = 0;
  }

  // 拉取文档附件，返回 blobs 缓存：id -> { blob, name, mime }
  async function fetchAttachmentBlobs(atts) {
    const blobs = {};
    if (!atts.length) return blobs;
    const tasks = atts.map((a) => (async () => {
      craberStats.attTotal++;
      try {
        const info = await API.getFileInfo(a.id);
        if (info.download_url) {
          const b = await gmFetchBlob(info.download_url);
          blobs[a.id] = { blob: b, name: a.name, mime: b.type || a.mime || info.mime_type || '' };
        } else {
          craberStats.attFail++;
        }
      } catch (e) {
        craberStats.attFail++;
        // 403/404 说明这个文件拿不到，属于预期内的降级，不该刷 warn
        const msg = String(e && e.message || e);
        if (!/40[13]|404/.test(msg)) console.warn('[gpt-craber] 附件下载失败', a.id, a.name, e);
        else console.debug('[gpt-craber] 附件不可下载（已跳过）', a.name, msg);
      }
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
        craberStats.imgTotal++;
        try {
          const info = await API.getFileInfo(fid);
          if (info.download_url) {
            const b = await gmFetchBlob(info.download_url);
            blobs[fid] = { blob: b, mime: b.type || info.mime_type || 'image/png' };
          } else {
            craberStats.imgFail++;
          }
        } catch (e) {
          craberStats.imgFail++;
          const msg = String(e && e.message || e);
          if (!/40[13]|404/.test(msg)) console.warn('[gpt-craber] 托管图下载失败', fid, e);
        }
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
    // 不是模型对用户的回答，默认跳过；开启 includeTools 后折叠输出。
    if (role === 'tool') {
      if (!settings.includeTools) return '';
      const t = craberLooseText(m);
      if (!t) return '';
      return '<details><summary>🔧 工具调用结果</summary>' + '\n\n' + t.slice(0, 4000) + '\n\n' + '</details>' + '\n\n';
    }

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

    // 思考/推理过程：默认不导出，开启 includeReasoning 后折叠显示
    if (ct === 'reasoning_recap' || ct === 'thoughts' || ct === 'reasoning') {
      if (!settings.includeReasoning) return '';
      const t = craberLooseText(m);
      if (!t) return '';
      return '<details><summary>💭 思考过程</summary>' + '\n\n' + t.slice(0, 8000) + '\n\n' + '</details>' + '\n\n';
    }

    // 搜索抓到的网页正文（tether_quote）。
    // 一次搜索会产生几十个这类节点，全导出会把正文淹掉，
    // 所以默认只保留来源链接（由 collectSources 汇总到文末），
    // 开启 includeTools 才把摘要折叠附上。
    if (ct === 'tether_quote') {
      if (!settings.includeTools) return '';
      const title = (m.content && m.content.title) || '';
      const url = (m.content && m.content.url) || '';
      const txt = craberLooseText(m);
      if (!url && !txt) return '';
      return '<details><summary>🌐 ' + (title || url) + '</summary>' + '\n\n'
        + (url ? '[' + (title || url) + '](' + url + ')' + '\n\n' : '')
        + (txt ? txt.slice(0, 1500) : '') + '\n\n</details>\n\n';
    }

    // 浏览过程的展示节点：默认略过（没有正文价值）
    if (ct === 'tether_browsing_display') {
      if (!settings.includeTools) return '';
      const t = craberLooseText(m) || (m.content && m.content.summary) || '';
      return t ? '_（浏览过程：' + String(t).slice(0, 200) + '）_' + '\n\n' : '';
    }

    // 模型侧的工具调用请求
    if (ct === 'tool_call' || ct === 'function_call') {
      if (!settings.includeTools) return '';
      const t = craberLooseText(m);
      if (!t) return '';
      return '<details><summary>🔧 工具调用</summary>' + '\n\n' + '```' + '\n' + t.slice(0, 4000) + '\n' + '```' + '\n\n' + '</details>' + '\n\n';
    }

    // 兜底：尽力取出文本，取不到就留一行说明
    if (role === 'assistant') {
      const body = craberLooseText(m);
      if (body) return body + '\n\n';
      if (ct) return '_（该段为 ' + ct + ' 类型内容，无法提取为 Markdown）_' + '\n\n';
    }
    return '';
  }

  function collectSources(turn) {
    const seen = new Set();
    const list = [];
    const add = (it) => {
      if (!it || !it.url || seen.has(it.url)) return;
      seen.add(it.url);
      list.push({
        url: it.url,
        title: it.title || it.attribution || it.domain || it.url,
        attr: it.attribution || it.domain || ''
      });
    };

    for (const node of turn.answers) {
      // 1) 正文引用标记（content_references）
      const refs = (node.message.metadata && node.message.metadata.content_references) || [];
      for (const r of refs) {
        for (const it of (r.items || r.sources || [])) add(it);
      }

      // 2) 搜索抓取到的网页（tether_quote）。
      //    实测这类节点数量远超正文消息（一次搜索几十条），
      //    它们带 url/domain/title，是最完整的来源清单。
      const content = node.message.content || {};
      if (content.content_type === 'tether_quote') {
        add({ url: content.url, title: content.title, domain: content.domain });
      }
      // 3) 浏览结果（tether_browsing_display）里可能带 assets/results
      if (content.content_type === 'tether_browsing_display') {
        const arr = content.assets || content.results || [];
        if (Array.isArray(arr)) {
          for (const it of arr) {
            if (it && typeof it === 'object') add(it);
          }
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

    // 文件名统一：<标题>_<时间戳>，与菜单导出保持一致
    const stamp = craberStamp();

    if (hasImages || hasAttachments) {
      const zip = createZip();
      const sink = makeZipImageSink(zip); // 资源写入 images/、files/，md 引用相对路径
      const { title, md } = await renderTurn(turn, null, sink, { forceQuestion: true });
      zip.add(sanitizeFilename(title) + '.md', _enc.encode(md));
      triggerDownload(zip.generate(), sanitizeFilename(title) + '_' + stamp + '.zip');
      return;
    }

    const { title, md } = await renderTurn(turn, null, null, { forceQuestion: true });
    triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }),
      sanitizeFilename(title) + '_' + stamp + '.md');
  }

  async function exportBatch(selectedTurns, onProgress) {
    // 文件名统一用「会话标题」：这样不管选了几轮，导出的都是同一个名字，
    // 不会出现 01_问题一.md、02_问题二.md 这种一堆文件。
    const convTitle = (state.conv && state.conv.title) || '未命名会话';

    // 只选一轮时，含附件则必须打 zip，确保原文件独立落在 files/；否则仍导出单个 md。
    if (selectedTurns.length === 1) {
      const turn = selectedTurns[0];
      const includeQuestion = settings.mode === 'qa';
      const hasAttachments = includeQuestion && collectAttachments(turn, true).length > 0;
      const stamp = craberStamp();
      if (hasAttachments) {
        const zip = createZip();
        const sink = makeZipImageSink(zip);
        const { md } = await renderTurn(turn, onProgress, sink);
        zip.add(sanitizeFilename(convTitle) + '.md', _enc.encode(md));
        triggerDownload(zip.generate(), sanitizeFilename(convTitle) + '_' + stamp + '.zip');
        return;
      }
      const sink = makeDataUriSink(); // 单文件无处放 images/ 目录，图片以 data URI 内嵌
      const { md } = await renderTurn(turn, onProgress, sink);
      if (onProgress) onProgress(1, 1);
      triggerDownload(new Blob([md], { type: 'text/markdown' }),
        sanitizeFilename(convTitle) + '_' + stamp + '.md');
      return;
    }
    // 多回合：合并为一个 md 文件（以前是一回合一个文件，导出后要翻好几个 md）
    //
    // 仍然走 zip：图片和上传文档需要落在 images/、files/ 里用相对路径引用，
    // 单文件塞 base64 会很大。zip 里只有一份 md + 资源目录。
    const zip = createZip();
    const sink = makeZipImageSink(zip);

    let md = '# ' + convTitle + '\n\n';

    // 序号按回合在整个对话中的真实顺序（跳选也保持全局一致）
    const pad = String((state.turns && state.turns.length) || selectedTurns.length).length;
    let i = 0;
    for (const turn of selectedTurns) {
      const r = await renderTurn(turn, null, sink);
      const seq = ((state.turns ? state.turns.indexOf(turn) : -1) + 1) || (i + 1);

      // 回合之间用二级标题分隔，便于在单文件里定位
      md += '## 第 ' + String(seq).padStart(pad, '0') + ' 轮\n\n';
      md += r.md.trim() + '\n\n---\n\n';

      i++;
      if (onProgress) onProgress(i, selectedTurns.length);
    }
    // 去掉末尾多余的分隔线
    md = md.replace(/\n+---\n+$/, '\n');

    if (onProgress) onProgress(selectedTurns.length, selectedTurns.length, '打包中…');
    // 内部的 md 用纯会话名（干净、便于阅读），只有最外层文件名带日期
    zip.add(sanitizeFilename(convTitle) + '.md', _enc.encode(md.trim() + '\n'));
    const blob = zip.generate();
    triggerDownload(blob, sanitizeFilename(convTitle) + '_' + craberStamp() + '.zip');
  }

  /* ============================================================
   * 多会话：列表获取与批量导出
   * ========================================================== */

  /* 会话列表缓存
   * 设置中心每次切到「会话列表」都会重建页面，原来每次都重新翻页拉全部会话：
   * 几十个会话就是 2 次请求，几百个就是十几次，而这份数据（标题/时间）
   * 十分钟内基本不变。所以：
   *   - 拉到就存一份带时间戳的快照，下次直接渲染，切页零请求
   *   - 超过 TTL 或手动刷新才重新拉
   *   - 缓存按账号隔离，切换账号不会看到别人的会话
   */
  // 取消勾选的 id 集合：会话列表页每次切页都会重建，勾选状态存在这里才不会丢
  const convSelOff = new Set();

  // 会话列表的筛选条件（项目 / 日期）。同样要跨切页保留。
  const convFilter = { projFilter: 'all', dateRange: 0, dateFrom: '', dateTo: '' };

  const CONV_CACHE_KEY = 'gpt_craber_conv_cache';
  const CONV_CACHE_TTL = 10 * 60 * 1000;   // 10 分钟：超过就当作过期，进入时自动刷新

  function convCacheLoad() {
    try {
      const j = JSON.parse(localStorage.getItem(CONV_CACHE_KEY) || 'null');
      if (!j || !Array.isArray(j.items)) return null;
      return { at: Number(j.at) || 0, account: String(j.account || ''), items: j.items };
    } catch (e) { return null; }
  }

  function convCacheSave(items) {
    try {
      const acct = craberAccountLoad();
      localStorage.setItem(CONV_CACHE_KEY, JSON.stringify({
        at: Date.now(),
        account: (acct && acct.name) ? sanitizeRemoteSeg(acct.name) : '',
        // 只留渲染需要的字段：整份 conversations 原文大得多，也没必要留
        items: (items || []).map((m) => ({
          id: m.id, title: m.title || '', update_time: Number(m.update_time) || 0,
          gizmo_id: m.gizmo_id || (m.gizmo && m.gizmo.id) || null
        }))
      }));
    } catch (e) { /* 存储满了就只走内存 */ }
  }

  // 缓存是否可用：账号一致且没超过 TTL。账号不一致时宁可重拉。
  function convCacheFresh(c) {
    if (!c || !c.items.length) return false;
    const acct = craberAccountLoad();
    const who = (acct && acct.name) ? sanitizeRemoteSeg(acct.name) : '';
    if (who && c.account && who !== c.account) return false;
    return Date.now() - c.at < CONV_CACHE_TTL;
  }

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
  // 构建会话 zip 的公共实现：只负责产出 blob，不触发下载。
  // 导出（下载）和备份（上传 WebDAV）共用这一套，避免两处逻辑漂移。
  // 返回 { blob, zipName, failCount, lastErr }
  async function buildConversationsZip(convMetas, onProgress, opts) {
    opts = opts || {};
    craberStatsReset();
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
    let failCount = 0;
    let lastErr = '';
    for (let idx = 0; idx < convMetas.length; idx++) {
      const meta = convMetas[idx];
      const seq = String(idx + 1).padStart(pad, '0');

      if (onProgress) onProgress(done, convMetas.length, '获取：' + (meta.title || meta.id).slice(0, 20));

      // 确定父目录：项目会话 -> 项目名/，否则根目录（空前缀）
      let parent = '';
      const pgid = getProjectGizmoId(meta);
      if (pgid) parent = (await projectDirName(pgid)) + '/';

      // 会话内容先取回来：标题以接口为准。
      // 文件夹里存的标题可能是旧的（用户改过名），或干脆是空的，
      // 直接拿来当文件名会出现「01_未命名」这种没法辨认的结果。
      let conv = null;
      try { conv = await API.getConversation(meta.id); } catch (e) { /* 下面统一处理 */ }

      // 标题以接口为准：文件夹里的标题可能是旧的，也可能为空
      const realTitle = (conv && conv.title) || meta.title || '会话';

      // 子文件夹名：序号_标题，在同一父目录下去重
      let leaf = seq + '_' + sanitizeFilename(realTitle);
      const dedupKey = parent + '||' + leaf;
      if (usedDir[dedupKey] != null) { usedDir[dedupKey]++; leaf = leaf + ' (' + usedDir[dedupKey] + ')'; }
      else usedDir[dedupKey] = 0;
      const dir = parent + leaf;

      try {
        if (!conv) throw new Error('会话内容获取失败');
        // 图片写入该会话子文件夹下的 images/
        const sink = makeZipImageSink(zip, dir + '/');
        const { md } = await renderConversationToMd(conv, sink);
        zip.add(dir + '/' + sanitizeFilename(realTitle) + '.md', _enc.encode(md));
      } catch (e) {
        console.warn('[gpt-craber] 会话导出失败', meta.id, e);
        failCount++;
        lastErr = e && e.message ? e.message : '未知错误';
        // 失败的会话留一个说明文件，不中断整体
        zip.add(dir + '/_导出失败.txt', _enc.encode('导出失败：' + (e && e.message) + '\n会话 id：' + meta.id + '\n'));
      }
      done++;
      if (onProgress) onProgress(done, convMetas.length);
    }

    if (onProgress) onProgress(convMetas.length, convMetas.length, '打包中…');
    const blob = zip.generate();

    // zip 名按场景取：单会话用会话标题，项目导出用项目名，
    // 其余（多选导出）保留通用名。之前一律 chatgpt-conversations.zip，
    // 从菜单连续导出几次会得到一堆同名文件（浏览器自动加 (1)(2)）。
    let zipName = opts.zipName ? sanitizeFilename(opts.zipName)
      : (convMetas.length === 1
        ? sanitizeFilename(convMetas[0].title || '会话')
        : 'chatgpt-conversations');

    const attFail = craberStats.attFail;
    const attTotal = craberStats.attTotal;
    const imgFail = craberStats.imgFail;
    const imgTotal = craberStats.imgTotal;
    // 汇总成一句人能读懂的说明，给 UI 展示用
    const skipped = [];
    if (attFail) skipped.push(attFail + '/' + attTotal + ' 个附件');
    if (imgFail) skipped.push(imgFail + '/' + imgTotal + ' 张图片');

    return {
      blob, zipName, failCount, lastErr,
      attFail, attTotal, imgFail, imgTotal,
      skippedText: skipped.length ? (skipped.join('、') + ' 无法下载，已跳过') : ''
    };
  }

  // 导出（下载）入口：在公共实现之上加命名与下载
  async function exportConversations(convMetas, onProgress, opts) {
    const built = await buildConversationsZip(convMetas, onProgress, opts);
    // 带日期：同一天导出多次也能区分（否则浏览器只会加 (1)(2)）
    triggerDownload(built.blob, built.zipName + '_' + craberStamp() + '.zip');

    // 有失败就明确说出来，别让人解压后才发现是空的
    if (built.failCount) {
      navToast('有 ' + built.failCount + ' / ' + convMetas.length + ' 个会话导出失败：' + built.lastErr);
    } else if (built.skippedText) {
      navToast(built.skippedText);
    }
    return built;
  }

  /* ============================================================
   * UI：样式
   * ========================================================== */

  const style = document.createElement('style');
  style.textContent = `
    :root{
      --craber-accent:#10a37f; --craber-accent-2:#0e8e6d;
      /* 层级：脚本自己的浮层必须排在原生 UI 之下。
         实测原生的菜单 / tooltip / 下拉都是 z-index 50，而我们最初用了 99990 这种
         量级 —— 结果是导航节点横条直接压在原生右键菜单上面，把菜单遮住。
         所以这里统一收进 40~45 这一段：既能浮在正文（z-0/1）和顶栏（z-20）之上，
         又稳稳低于原生浮层的 50，原生的任何弹出都不会被我们盖住。
         例外是我们自己的模态（遮罩 + 面板）：那是全屏对话框，本就要盖住页面，
         仍保留极高的层级（见 .craber-mask）。 */
      --craber-z-rail:40; --craber-z-card:41; --craber-z-panel:42;
      --craber-z-pbar-menu:43; --craber-z-fab-menu:44; --craber-z-tip:45;
      /* 我们自己的模态是全屏对话框，必须盖住页面，故仍取高位 */
      --craber-z-modal:900; --craber-z-modal-top:901;
      --craber-bg:#ffffff; --craber-fg:#1f2328; --craber-sub:#8a9099;
      --craber-line:#ececf0; --craber-hover:#f5f6f8; --craber-ghost:#f1f2f4;
      --craber-skeleton:#eceef1; --craber-skeleton-hi:#f6f7f9;
      /* 导航节点轨道：默认横条 / 次级(n1) / 焦点(n2..n0) 三档色，卡片配色 */
      --craber-nav-bar:#c3c8d0; --craber-nav-bar-mid:#8a9099; --craber-nav-bar-hi:#1f2328;
      --craber-nav-card:#f7f7f8; --craber-nav-card-line:#e3e5e8;
      --craber-nav-strong:#1f2328; --craber-nav-muted:#8a9099;
      /* 项目条底色：比面板再透一点，压在正文上不糊字 */
      --craber-pbar-bg:rgba(255,255,255,.86);
    }
    /* 深浅色切换：不能只挂 @media (prefers-color-scheme)。
       ChatGPT 的主题开关改的是 html[data-theme]，与系统偏好可以不一致
       （站点设深色、系统是浅色时，媒体查询不触发，脚本全是浅色残留）。
       所以暗色档用 html[data-theme="dark"] 为主、媒体查询兜底，两条路都
       指向同一组变量；JS 端 isDarkTheme() 也是同样的判定顺序，两边永远同步。 */
    html[data-theme="dark"], html[data-theme="dark"] body{
      --craber-bg:#26282c; --craber-fg:#e8eaed; --craber-sub:#9aa0a8;
      --craber-line:#3a3d43; --craber-hover:#2f3237; --craber-ghost:#34373d;
      --craber-skeleton:#33363b; --craber-skeleton-hi:#3c4046;
      --craber-nav-bar:#50555d; --craber-nav-bar-mid:#8e949d; --craber-nav-bar-hi:#e8eaed;
      --craber-nav-card:#2b2d31; --craber-nav-card-line:#3a3d43;
      --craber-nav-strong:#e8eaed; --craber-nav-muted:#9aa0a8;
      --craber-pbar-bg:rgba(38,40,44,.86);
    }
    @media (prefers-color-scheme:dark){
      /* 兜底：站点没写 data-theme 时按系统偏好走。
         有 data-theme 时 ChatGPT 会同时写 light/dark 之一，:root 后面的这条
         html[data-theme="light"] 会把系统深色压回去，所以不会双跳。 */
      html:not([data-theme="light"]){
        --craber-bg:#26282c; --craber-fg:#e8eaed; --craber-sub:#9aa0a8;
        --craber-line:#3a3d43; --craber-hover:#2f3237; --craber-ghost:#34373d;
        --craber-skeleton:#33363b; --craber-skeleton-hi:#3c4046;
        --craber-nav-bar:#50555d; --craber-nav-bar-mid:#8e949d; --craber-nav-bar-hi:#e8eaed;
        --craber-nav-card:#2b2d31; --craber-nav-card-line:#3a3d43;
        --craber-nav-strong:#e8eaed; --craber-nav-muted:#9aa0a8;
        --craber-pbar-bg:rgba(38,40,44,.86);
      }
    }
    /* 显式浅色档：防止系统深色 + 站点浅色时上面的 :not(light) 兜底误伤 */
    html[data-theme="light"], html[data-theme="light"] body{
      --craber-bg:#ffffff; --craber-fg:#1f2328; --craber-sub:#8a9099;
      --craber-line:#ececf0; --craber-hover:#f5f6f8; --craber-ghost:#f1f2f4;
      --craber-skeleton:#eceef1; --craber-skeleton-hi:#f6f7f9;
      --craber-nav-bar:#c3c8d0; --craber-nav-bar-mid:#8a9099; --craber-nav-bar-hi:#1f2328;
      --craber-nav-card:#f7f7f8; --craber-nav-card-line:#e3e5e8;
      --craber-nav-strong:#1f2328; --craber-nav-muted:#8a9099;
      --craber-pbar-bg:rgba(255,255,255,.86);
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

    /* 导出按钮：固定进原生顶栏右侧按钮组，不再做成可拖拽的浮动球。
       顶栏本来就有"分享 / 更多"这排控件，导出属于同一类操作，放在一起
       位置固定、可预期，也不会像浮球那样飘在正文上挡内容。
       蟹图标用内联 SVG、蟹身填 currentColor（蟹绿）。
       描边：深色主题白、浅色主题黑，颜色走 --craber-fab-line，由 JS 按实际
       主题写入（见 applyFabTheme）。
       描边不能加 transition —— 入 DOM 前若先经过一次 transition 注册，
       浏览器会生成一个 currentTime 停在 0 的过渡动画，而"运行中的动画"
       优先级高于内联 !important，颜色会被永久锁死（实测）。
       也不写死 border：border 会挤小内容盒让图标偏移，outline 不占布局。 */
    .craber-fab-btn{--craber-fab-line:rgba(0,0,0,.4);
      flex:none;width:32px;height:32px;border-radius:9px;
      background:transparent;color:#22a06b;border:none;
      outline:1.5px solid var(--craber-fab-line);outline-offset:-1px;
      display:flex;align-items:center;justify-content:center;cursor:pointer;
      pointer-events:auto;
      transition:background-color .14s ease,box-shadow .15s ease}
    .craber-fab-btn:hover{background:var(--craber-hover)}
    .craber-fab-btn:focus-visible{outline:2px solid var(--craber-accent);outline-offset:1px}
    .craber-fab-btn[aria-expanded="true"]{background:var(--craber-hover)}
    /* 描边色与主题联动同上：data-theme 为主、媒体查询兜底，避免"站点切到深色、
       描边还是黑的"这种半同步状态 */
    html[data-theme="dark"] .craber-fab-btn{--craber-fab-line:rgba(255,255,255,.45)}
    @media (prefers-color-scheme:dark){
      html:not([data-theme="light"]) .craber-fab-btn{--craber-fab-line:rgba(255,255,255,.45)}
    }
    .craber-fab-btn svg{width:19px;height:19px;pointer-events:none}

    /* 下拉菜单：锚在按钮下方右对齐（按钮在顶栏最右，左对齐会溢出视口）。
       开合动画放在容器上：开 = pop-in，关 = 先切 closing 类反向播完再真正 display:none。
       动画只动 opacity/transform（合成器属性），不触发重排。 */
    .craber-fab-menu{position:fixed;z-index:var(--craber-z-fab-menu);
      opacity:0;visibility:hidden;transform:translateY(8px) scale(.98);pointer-events:none}
    .craber-fab-menu.craber-open{opacity:1;visibility:visible;transform:none;pointer-events:auto;
      transition:opacity .16s ease,transform .16s cubic-bezier(.2,.8,.25,1)}
    .craber-fab-menu.craber-closing{opacity:0;visibility:visible;transform:translateY(8px) scale(.98);
      transition:opacity .12s ease,transform .12s ease}
    /* 面板用两列网格：项多了不会变成一条细长的竖条。
       * 开关类（craber-fab-toggle）和分隔线占满整行，其余按钮两列并排。 */
    .craber-fab-panel{display:grid;grid-template-columns:1fr 1fr;gap:2px;
      width:340px;max-width:calc(100vw - 24px);padding:6px;
      border-radius:12px;background:var(--craber-bg);border:1px solid var(--craber-line);
      box-shadow:0 12px 34px rgba(0,0,0,.22);font-family:system-ui,sans-serif;
      /* 深浅色切换时颜色平滑过渡；只过渡颜色属性，不影响开合的 transform/opacity */
      transition:background-color .2s ease,border-color .2s ease,color .2s ease}
    /* 这几类要独占一整行：分隔线、开关行、收起按钮、版本脚注 */
    .craber-fab-panel > .craber-fab-sep,
    .craber-fab-panel > .craber-fab-toggle,
    .craber-fab-panel > .craber-fab-collapse,
    .craber-fab-panel > .craber-fab-ver{grid-column:1 / -1}
    .craber-fab-item{display:flex;align-items:center;gap:8px;width:100%;
      padding:9px 10px;border:none;border-radius:8px;
      background:transparent;color:var(--craber-fg);
      font:inherit;font-size:13px;font-weight:500;text-align:left;cursor:pointer;
      transition:background-color .12s ease}
    .craber-fab-item:hover{background:var(--craber-hover)}
    .craber-fab-item-label{flex:1;min-width:0;overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap;text-align:left}
    .craber-fab-item-arrow{flex:none;width:12px;height:12px;display:flex;
      align-items:center;justify-content:center;color:var(--craber-sub);opacity:.55}
    .craber-fab-item-arrow svg{width:12px;height:12px}
    .craber-fab-item:hover .craber-fab-item-arrow{opacity:.9}
    /* 收起按钮不需要箭头：它只是收面板，不进入任何下一级 */
    .craber-fab-collapse .craber-fab-item-arrow{display:none}
    .craber-fab-collapse{color:var(--craber-sub)}
    /* 版本脚注：只读展示，居右、弱化，不抢菜单项的视觉 */
    .craber-fab-ver{padding:4px 10px 2px;text-align:right;
      color:var(--craber-sub);font-size:11px;opacity:.7;cursor:default;
      font-variant-numeric:tabular-nums;user-select:none}
    .craber-fab-sep{height:1px;background:var(--craber-line);margin:5px 6px}
    /* 开关行：文字靠左、拨动件靠右，拨动件同时用颜色和位移表达状态 */
    .craber-fab-toggle{cursor:pointer}
    .craber-fab-toggle-label{flex:1;min-width:0;text-align:left}
    .craber-fab-switch{flex:none;position:relative;width:32px;height:18px;border-radius:9px;
      background:var(--craber-ghost);transition:background-color .16s ease}
    .craber-fab-switch::after{content:'';position:absolute;top:2px;left:2px;
      width:14px;height:14px;border-radius:50%;background:#fff;
      box-shadow:0 1px 3px rgba(0,0,0,.3);
      transition:transform .16s cubic-bezier(.34,1.3,.64,1)}
    .craber-fab-toggle.on .craber-fab-switch{background:var(--craber-accent)}
    .craber-fab-toggle.on .craber-fab-switch::after{transform:translateX(14px)}

    /* 项目条：注入原生顶栏内部（面包屑所在的那个可伸缩容器里），
       不新增垂直空间，因此不存在遮挡正文的问题。
       可点击的是"会话名"本身 —— 用户本来就在读它，直接让它可以点开
       本项目对话列表，比再加一个「N 个对话」按钮自然。 */
    .craber-pbar{display:flex;align-items:center;gap:8px;
      min-width:0;margin-left:10px;padding-left:10px;
      border-left:1px solid var(--craber-line);
      font-family:system-ui,sans-serif;font-size:14px;color:var(--craber-fg);
      pointer-events:auto}
    /* 会话名按钮：常态读起来就是一行标题，悬停才显出可点的样子。
       尺寸对齐原生顶栏：原生面包屑/按钮高 36px、字号 14-16px ——
       我们的高度 36、字号 14，视觉上与"分享"等原生按钮同排同大。 */
    .craber-pbar-title{flex:0 1 auto;display:inline-flex;align-items:center;gap:6px;
      min-width:0;max-width:44ch;height:36px;padding:0 10px;
      border:1px solid transparent;border-radius:10px;
      background:transparent;color:var(--craber-fg);
      font:inherit;font-size:14px;font-weight:500;
      cursor:pointer;transition:background-color .14s ease,border-color .14s ease}
    .craber-pbar-title:hover{background:var(--craber-hover);border-color:var(--craber-line)}
    .craber-pbar-title:focus-visible{outline:2px solid var(--craber-accent);outline-offset:1px}
    .craber-pbar-title-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-pbar-title svg{flex:none;opacity:.6;
      transition:transform .18s cubic-bezier(.34,1.3,.64,1)}
    .craber-pbar-title[aria-expanded="true"] svg{transform:rotate(180deg)}
    .craber-pbar-pos{flex:none;color:var(--craber-sub);font-size:11.5px;
      font-variant-numeric:tabular-nums;opacity:.75}
    /* 展开的本项目对话列表：仍是浮层（它必须盖在正文上，这是下拉菜单的正常行为）。
       开合动画同 craber-fab-menu：开 pop-in、关先播反向再摘 display。 */
    .craber-pbar-menu{position:fixed;z-index:var(--craber-z-pbar-menu);min-width:290px;max-width:min(420px,92vw);
      max-height:min(56vh,420px);overflow-y:auto;padding:6px;border-radius:12px;
      background:var(--craber-bg);border:1px solid var(--craber-line);
      box-shadow:0 12px 34px rgba(0,0,0,.22);font-family:system-ui,sans-serif;
      /* 深浅色切换时颜色平滑过渡 */
      transition:background-color .2s ease,border-color .2s ease,color .2s ease;
      opacity:0;visibility:hidden;transform:translateY(8px) scale(.98);pointer-events:none}
    .craber-pbar-menu.craber-open{opacity:1;visibility:visible;transform:none;pointer-events:auto;
      transition:opacity .16s ease,transform .16s cubic-bezier(.2,.8,.25,1)}
    .craber-pbar-menu.craber-closing{opacity:0;visibility:visible;transform:translateY(8px) scale(.98);
      transition:opacity .12s ease,transform .12s ease}
    .craber-pbar-menu-hd{padding:6px 8px 8px;color:var(--craber-sub);font-size:11px;
      font-weight:600;letter-spacing:.03em;text-transform:uppercase}
    .craber-pbar-item{display:flex;align-items:center;gap:8px;width:100%;
      min-height:32px;padding:6px 8px;border:none;border-radius:8px;
      background:transparent;color:var(--craber-fg);font:inherit;font-size:13px;
      text-align:left;cursor:pointer;transition:background-color .12s ease}
    .craber-pbar-item:hover{background:var(--craber-hover)}
    .craber-pbar-item.current{background:var(--craber-hover);font-weight:600}
    .craber-pbar-item-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
      white-space:nowrap}
    .craber-pbar-item-d{flex:none;color:var(--craber-sub);font-size:11px}
    /* 生成中：条目右侧日期换成环形加载动画（arcs 是 SVG 描边动画，比 border 圆环
       在小尺寸下更圆）。当前对话正在生成时，列表里该条目和顶栏会话名都会转。 */
    .craber-pbar-gen{flex:none;width:14px;height:14px;color:var(--craber-accent);
      animation:craber-spin .9s linear infinite}
    .craber-pbar-gen svg{display:block;width:100%;height:100%}
    .craber-pbar-gen circle{stroke:currentColor;fill:none;
      stroke-width:2.6;stroke-linecap:round;stroke-dasharray:32 12}
    .craber-pbar-title .craber-pbar-gen{width:14px;height:14px}

    .craber-mask{position:fixed;inset:0;background:rgba(15,18,20,.55);
      z-index:var(--craber-z-modal);display:flex;align-items:center;justify-content:center;
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
    .craber-dd-menu{position:fixed;z-index:var(--craber-z-modal-top);
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
    .craber-nav-rail{position:fixed;top:50%;transform:translateY(-50%);z-index:var(--craber-z-rail);
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
    .craber-nav-card{position:fixed;left:0;top:0;z-index:var(--craber-z-card);width:340px;max-width:74vw;
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
    .craber-nav-panel{position:fixed;z-index:var(--craber-z-panel);width:380px;max-width:85vw;max-height:calc(100vh - 28px);
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
    .craber-toast{position:fixed;left:50%;bottom:84px;z-index:var(--craber-z-tip);pointer-events:none;
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
    /* 单条导出按钮底色：同主题联动规则 */
    html[data-theme="dark"] .craber-single{background:rgba(40,42,46,.9);color:#ccc}
    @media (prefers-color-scheme:dark){
      html:not([data-theme="light"]) .craber-single{background:rgba(40,42,46,.9);color:#ccc}
    }

    /* 螃蟹按钮的 tooltip：挂在 body 上的独立元素，不受操作栏 overflow 裁切 */
    /* tooltip：挂在 body 上的浮层，逃出操作栏 overflow。
       样式与面板/对话框统一：深色药丸、8px 圆角、细描边、贴边阴影，
       默认在按钮下方；顶部空间不够时翻到上方（.craber-tip-up）。 */
    .craber-tip{position:fixed;z-index:var(--craber-z-tip);pointer-events:none;
      --craber-tip-bg:#23262b; --craber-tip-fg:#f7f8f9;
      max-width:min(260px,calc(100vw - 24px));box-sizing:border-box;
      background:var(--craber-tip-bg);color:var(--craber-tip-fg);
      font-size:12px;line-height:1.45;font-weight:450;letter-spacing:.005em;
      padding:6px 10px;border-radius:8px;
      border:1px solid rgba(255,255,255,.08);
      box-shadow:0 4px 14px rgba(15,18,22,.22),0 1px 4px rgba(15,18,22,.16);
      white-space:nowrap;text-align:center;
      font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
      opacity:0;transform:translateY(-2px) scale(.98);
      transform-origin:50% 0;
      transition:opacity .13s ease,transform .13s ease}
    .craber-tip.show{opacity:1;transform:translateY(0) scale(1)}
    /* 被说明的元素在自家模态里：气泡必须浮到模态之上，否则被遮罩盖住 */
    .craber-tip.craber-tip-modal{z-index:calc(var(--craber-z-modal) + 5)}
    /* 箭头：用旋转方块贴在边上，永远指向被说明的元素 */
    .craber-tip::after{content:'';position:absolute;left:var(--craber-arrow-x,50%);top:-5px;
      width:8px;height:8px;margin-left:-4px;border-radius:2px;
      background:var(--craber-tip-bg);
      border-left:1px solid rgba(255,255,255,.08);
      border-top:1px solid rgba(255,255,255,.08);
      transform:rotate(45deg)}
    .craber-tip.craber-tip-up{transform-origin:50% 100%}
    .craber-tip.craber-tip-up::after{top:auto;bottom:-5px;border-left:none;border-top:none;
      border-right:1px solid rgba(255,255,255,.08);
      border-bottom:1px solid rgba(255,255,255,.08)}
    /* 多行内容（含说明文字）时左对齐更好读 */
    .craber-tip.craber-tip-multiline{white-space:normal;text-align:left}
    /* 深色主题下反色：面板本身是深的，再压一块深色就看不出层次 */
    html[data-theme="dark"] .craber-tip{
      --craber-tip-bg:#e9eaec; --craber-tip-fg:#16181c;
      border-color:rgba(0,0,0,.1);
      box-shadow:0 4px 14px rgba(0,0,0,.42),0 1px 4px rgba(0,0,0,.3)}
    html[data-theme="dark"] .craber-tip::after{border-color:rgba(0,0,0,.1)}
    @media (prefers-reduced-motion:reduce){
      .craber-tip{transition:opacity .01s linear;transform:none}
      .craber-tip.show{transform:none}
    }

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

    /* ── 侧栏文件夹 ────────────────────────────────────────────
       整块插在原生「项目」区块之下、原生「最近」区块之上，作为原生 nav 的子元素
       参与正常文档流，因此会跟着侧栏一起滚动，不需要自己算定位。
       行内样式一律用 em/craber 变量，宿主改字号时不会错位。 */
    /* 左右外边距对齐原生：原生行左沿 16px、右沿留 12px（实测 nav 内边距 16/12） */
    .craber-folders{margin:2px 6px}
    /* 标题行与原生「项目 / 最近」同基线：左沿 16、14px、字重 500 */
    .craber-folders-hd{display:flex;align-items:center;gap:6px;padding:4px 10px;min-height:28px}
    .craber-folders-label{flex:1;min-width:0;font-size:14px;font-weight:500;color:var(--craber-sub);
      letter-spacing:0;user-select:none}
    .craber-folders-add{border:none;background:none;color:var(--craber-sub);cursor:pointer;
      width:20px;height:20px;border-radius:6px;padding:0;display:flex;align-items:center;
      justify-content:center;font-size:15px;line-height:1;opacity:0;transition:opacity .15s,background .15s,color .15s}
    .craber-folders:hover .craber-folders-add,.craber-folders-add:focus-visible{opacity:1}
    .craber-folders-add:hover{background:var(--craber-hover);color:var(--craber-fg)}

    .craber-folder{display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px;
      min-height:38px;box-sizing:border-box;
      cursor:pointer;color:var(--craber-fg);font-size:14px;line-height:1.4;user-select:none}
    .craber-folder:hover{background:var(--craber-hover)}
    /* 含当前浏览会话的文件夹：左侧竖条 + 名字加粗，一眼看出"你在哪" */
    .craber-folder.has-current{position:relative}
    .craber-folder.has-current::before{content:'';position:absolute;left:2px;top:50%;
      transform:translateY(-50%);width:2.5px;height:16px;border-radius:2px;
      background:var(--craber-accent)}
    .craber-folder.has-current .craber-folder-name{font-weight:600;color:var(--craber-fg)}
    .craber-folder.has-current .craber-folder-ico{color:var(--craber-accent)}
    /* 手动拖拽（项目行）进行中：光标提示 + 可放置区域反馈 */
    body.craber-dragging{cursor:grabbing !important;user-select:none}
    body.craber-dragging .craber-folder.drag-over{background:var(--craber-hover);
      box-shadow:inset 0 0 0 1.5px var(--craber-accent)}
    /* 条目拖动排序时的反馈：源行半透明，目标位置显示插入线 */
    .craber-folder-kid.craber-sorting{opacity:.45}
    /* 插入位置指示线：用伪元素画直条。
       不能用 box-shadow —— 它会沿着行的 border-radius 弯成弧形（实测很难看）。 */
    .craber-folder-kid{position:relative}
    .craber-folder-kid.sort-over-top::after,
    .craber-folder-kid.sort-over-bottom::after{
      content:'';position:absolute;left:10px;right:10px;height:2px;
      background:var(--craber-accent);border-radius:1px;pointer-events:none;z-index:2}
    .craber-folder-kid.sort-over-top::after{top:-1px}
    .craber-folder-kid.sort-over-bottom::after{bottom:-1px}
    .craber-folder.drag-over{background:var(--craber-hover);
      box-shadow:inset 0 0 0 1.5px var(--craber-accent)}
    .craber-folder-chev{flex:none;width:14px;height:14px;display:flex;align-items:center;
      justify-content:center;color:var(--craber-sub);
      transition:transform .22s cubic-bezier(.2,.8,.25,1);
      margin-right:-1px}
    .craber-folder-chev svg{width:12px;height:12px;display:block}
    .craber-folder.open .craber-folder-chev{transform:rotate(90deg)}
    .craber-folder-ico{flex:none;width:18px;height:18px;color:var(--craber-sub)}
    .craber-folder-ico svg{width:18px;height:18px;display:block}
    .craber-folder.open .craber-folder-ico{color:var(--craber-accent)}
    .craber-folder-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-folder-more{flex:none;width:20px;height:20px;border:none;background:none;padding:0;
      border-radius:6px;color:var(--craber-sub);cursor:pointer;opacity:0;
      line-height:1;font-size:14px;display:flex;align-items:center;justify-content:center}
    .craber-folder-more svg{width:16px;height:16px;display:block}
    .craber-folder-add{opacity:0}
    .craber-folder:hover .craber-folder-add{opacity:1}
    .craber-folder:hover .craber-folder-more{opacity:1}
    .craber-folder-more:hover{background:var(--craber-ghost);color:var(--craber-fg)}

    /* 展开/收起动画：用 grid-template-rows 0fr ↔ 1fr 过渡。
       这样不需要预先知道内容高度（height:auto 无法过渡），
       而且内容会跟着被裁切，展开时有从"挤出来"到"铺开"的观感，
       接近原生侧栏的展开手感。 */
    .craber-folder-kids{display:grid;grid-template-rows:1fr;
      transition:grid-template-rows .22s cubic-bezier(.2,.8,.25,1),
      opacity .18s ease;opacity:1;min-height:0;overflow:hidden}
    .craber-folder-kids > .craber-folder-kids-in{padding-left:20px;
      display:flex;flex-direction:column;min-height:0;overflow:hidden}
    .craber-folder-kids.craber-collapsed{grid-template-rows:0fr;opacity:0}
    .craber-folder-kids[hidden]{display:none}
    .craber-folder-kid{display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px;
      min-height:34px;box-sizing:border-box;
      cursor:pointer;color:var(--craber-fg);font-size:13.5px;line-height:1.4;min-width:0}
    .craber-folder-kid:hover{background:var(--craber-hover)}
    .craber-folder-kid.active{background:var(--craber-hover);color:var(--craber-fg);
      font-weight:600;position:relative}
    .craber-folder-kid.active::before{content:'';position:absolute;left:0;top:50%;
      transform:translateY(-50%);width:2px;height:14px;border-radius:2px;
      background:var(--craber-accent)}
    .craber-folder-kid.active .craber-folder-kid-ico{color:var(--craber-accent)}
    .craber-folder-kid-ico{flex:none;width:16px;height:16px;color:var(--craber-sub)}
    .craber-folder-kid-ico svg{width:16px;height:16px;display:block}
    .craber-folder-kid-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-folder-kid-chev{flex:none;width:14px;height:14px;display:flex;align-items:center;
      justify-content:center;color:var(--craber-sub);cursor:pointer;
      transition:transform .22s cubic-bezier(.2,.8,.25,1);
      margin-right:-1px}
    .craber-folder-kid-chev svg{width:11px;height:11px;display:block}
    .craber-folder-kid.open > .craber-folder-kid-chev{transform:rotate(90deg)}
    /* 项目子会话列表的展开/收起。
       要点：
       1) 内边距由内层包裹元素承担，不放在 grid 容器上 —— 否则折叠时
          padding 仍然占据高度，留下一段空白（实测）。
       2) 折叠到 0fr 后行高为 0，配合 overflow:hidden 才彻底不占位。 */
    .craber-folder-kid-sub{display:grid;grid-template-rows:1fr;
      transition:grid-template-rows .22s cubic-bezier(.2,.8,.25,1),opacity .18s ease;
      opacity:1;min-height:0;overflow:hidden}
    .craber-folder-kid-sub > .craber-folder-kid-sub-in{padding-left:22px;
      display:flex;flex-direction:column;min-height:0;overflow:hidden}
    .craber-folder-kid-sub.craber-collapsed{grid-template-rows:0fr;opacity:0}
    /* 项目下嵌套的会话行：更紧凑，但保留 hover 出 ⋯ */
    .craber-folder-kid-nested{min-height:30px;font-size:13px}
    .craber-folder-kid-sub[hidden]{display:none}
    .craber-folder-kid-more{flex:none;width:20px;height:20px;border:none;background:none;padding:0;
      border-radius:5px;color:var(--craber-sub);cursor:pointer;opacity:0;font-size:15px;line-height:1;
      display:flex;align-items:center;justify-content:center}
    .craber-folder-kid:hover .craber-folder-kid-more{opacity:1}
    .craber-folder-kid-more:hover{background:var(--craber-ghost);color:var(--craber-fg)}
    /* 空状态说明：缩进到与行内文字一致（行 10px 内边距 + 图标位 16px） */
    .craber-folder-empty{padding:4px 12px 6px 10px;font-size:12.5px;color:var(--craber-sub);
      line-height:1.5;word-break:keep-all;overflow-wrap:break-word}
    .craber-folder-stale{opacity:.55}

    /* 原生列表行上的"归入文件夹"小按钮：只在 hover / 键盘聚焦时出现 */
    /* 位置：行内文字右端。原生行右侧有一组操作按钮（⋯/归档），
       贴着 inset-inline-end 会被它们盖住、点了等于点原生菜单（实测）。
       所以用 flex 顺序把它插在原生按钮之前，而不是绝对定位去抢右缘。 */
    .craber-pj-btn{position:relative;flex:none;margin-inline-start:auto;margin-inline-end:4px;
      width:20px;height:20px;border:none;border-radius:6px;padding:0;display:flex;
      align-items:center;justify-content:center;background:var(--craber-bg);color:var(--craber-sub);
      cursor:pointer;opacity:0;pointer-events:none;z-index:2;
      box-shadow:0 0 0 1px var(--craber-line);transition:opacity .12s ease,color .12s ease}
    .craber-pj-btn svg{width:13px;height:13px;display:block}
    /* 原生行右侧操作区通常只有 hover 才显示；我们把按钮排在它前面，避免遮挡 */
    .craber-pj-host:hover > .craber-pj-btn,
    .craber-pj-host:focus-within > .craber-pj-btn{opacity:1;pointer-events:auto}
    .craber-pj-btn:hover{color:var(--craber-accent);box-shadow:0 0 0 1px var(--craber-accent)}
    /* 原生行自带 flex，加定位上下文不能让子元素乱飞 */
    .craber-pj-host{position:relative}

    /* 加载动画：小圆环旋转，用于"读取会话与项目…" */
    .craber-dlg-loading{display:flex;align-items:center;justify-content:center;gap:9px;
      padding:12px 6px;font-size:12.5px;color:var(--craber-sub)}
    .craber-dlg-spin{flex:none;width:14px;height:14px;border-radius:50%;
      border:2px solid color-mix(in srgb,var(--craber-sub) 28%,transparent);
      border-top-color:var(--craber-accent);
      animation:craber-spin .7s linear infinite}

    /* 对话框：居中卡片、柔和投影、轻磨砂遮罩。
       按钮沿用原版配色：浅底取消 + 实心确认；危险操作用红色。 */
    /* 叠层对话框：下层压暗并禁止交互，上层带更强的投影 */
    .craber-dlg-mask.craber-dlg-behind{pointer-events:none}
    .craber-dlg-mask.craber-dlg-behind .craber-dlg{transform:scale(.985);
      transition:transform .15s ease,opacity .15s ease;opacity:.55}
    .craber-dlg-mask{position:fixed;inset:0;z-index:var(--craber-z-modal);
      background:rgba(17,19,23,.38);display:flex;align-items:center;justify-content:center;
      padding:24px;box-sizing:border-box;
      -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
      font-family:system-ui,sans-serif;animation:craber-fade-in .14s ease}
    .craber-dlg{position:relative;width:min(560px,100%);max-width:100%;
      max-height:min(78vh,720px);
      display:flex;flex-direction:column;background:var(--craber-bg);color:var(--craber-fg);
      min-width:0;overflow:hidden;border-radius:18px;
      border:1px solid rgba(0,0,0,.06);
      box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 28px rgba(0,0,0,.12),
        0 32px 64px rgba(0,0,0,.16);
      padding:20px 22px 18px;box-sizing:border-box;
      animation:craber-pop-in .18s cubic-bezier(.2,.8,.25,1)}
    html[data-theme="dark"] .craber-dlg{border-color:rgba(255,255,255,.09);
      box-shadow:0 1px 2px rgba(0,0,0,.3),0 14px 32px rgba(0,0,0,.42),
        0 36px 70px rgba(0,0,0,.5)}
    /* 无底部按钮的对话框（设置中心）：不再画底栏，只留标题栏的 ×、Esc 与点遮罩关闭 */
    .craber-dlg.craber-dlg-plain{padding-bottom:0}
    .craber-dlg-hd{display:flex;align-items:center;gap:12px}
    .craber-dlg-mark{flex:none;width:36px;height:36px;border-radius:11px;
      display:flex;align-items:center;justify-content:center;
      background:color-mix(in srgb,var(--craber-accent) 13%,transparent);
      color:var(--craber-accent)}
    .craber-dlg-mark svg{width:21px;height:21px;display:block}
    .craber-dlg-headtext{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
    .craber-dlg-title{font-size:16.5px;font-weight:650;color:var(--craber-fg);
      line-height:1.3;letter-spacing:-.012em;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-dlg-mark ~ .craber-dlg-headtext .craber-dlg-title{font-size:18px}
    .craber-dlg-sub{font-size:13px;color:var(--craber-sub);line-height:1.5;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-dlg-badge{flex:none;height:22px;padding:0 8px;border-radius:999px;
      display:inline-flex;align-items:center;
      background:var(--craber-ghost);color:var(--craber-sub);
      font-size:11px;font-weight:500;font-variant-numeric:tabular-nums;
      user-select:none}
    .craber-dlg-x{flex:none;width:30px;height:30px;border:none;background:none;padding:0;
      border-radius:9px;color:var(--craber-sub);cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      margin-right:-6px;
      transition:background-color .14s ease,color .14s ease}
    .craber-dlg-x svg{width:15px;height:15px;display:block}
    .craber-dlg-x:hover{background:var(--craber-hover);color:var(--craber-fg)}
    .craber-dlg-x:focus-visible{outline:2px solid var(--craber-accent);outline-offset:1px}
    /* 只纵向溢出：横向一律 hidden。
       之前这里是 overflow:auto，横向滚动条落在这个外层容器上，
       即使列表自己写了 overflow-x:hidden 也压不住（实测）。 */
    .craber-dlg-body{margin-top:16px;min-height:0;overflow-x:hidden;
      overflow-y:auto;flex:1;min-width:0;box-sizing:border-box}
    .craber-dlg-text{font-size:14px;color:var(--craber-fg);line-height:1.6;white-space:pre-wrap}
    .craber-dlg-hint{margin-top:8px;font-size:12.5px;color:var(--craber-sub);line-height:1.5}
    /* 输入框：默认浅填充、无边框；聚焦时才亮起边框与光晕，视觉更安静 */
    .craber-dlg-input{width:100%;box-sizing:border-box;padding:9px 12px;
      border:1px solid transparent;border-radius:10px;
      background:color-mix(in srgb,var(--craber-hover) 78%,var(--craber-bg));
      color:var(--craber-fg);font-size:13.5px;font-family:inherit;outline:none;
      transition:background-color .14s ease,border-color .14s ease,box-shadow .14s ease}
    .craber-dlg-input::placeholder{color:var(--craber-sub);opacity:.78}
    .craber-dlg-input:hover{border-color:var(--craber-line)}
    .craber-dlg-input:focus{border-color:var(--craber-accent);background:var(--craber-bg);
      box-shadow:0 0 0 3px color-mix(in srgb,var(--craber-accent) 16%,transparent)}
    .craber-dlg-ft{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex:none;
      flex-wrap:wrap}
    .craber-dlg-ft-spacer{flex:1;min-width:0}
    .craber-dlg-btn{height:36px;padding:0 16px;border-radius:10px;border:1px solid transparent;
      background:var(--craber-ghost);color:var(--craber-fg);font-size:13.5px;font-weight:500;
      cursor:pointer;font-family:inherit;
      transition:background-color .14s ease,border-color .14s ease,transform .1s ease}
    .craber-dlg-btn:hover{background:var(--craber-hover)}
    .craber-dlg-btn:active{transform:translateY(1px)}
    /* 禁用态：主按钮退回浅底灰字，避免"黑底白字整体半透明"后看不清 */
    .craber-dlg-btn:disabled{cursor:default;transform:none}
    .craber-dlg-primary:disabled,.craber-dlg-primary:disabled:hover,
    html[data-theme="dark"] .craber-dlg-primary:disabled,
    html[data-theme="dark"] .craber-dlg-primary:disabled:hover{
      background:var(--craber-ghost);color:var(--craber-sub);border-color:transparent;
      box-shadow:none}
    .craber-dlg-btn:focus-visible{outline:2px solid var(--craber-accent);outline-offset:2px}
    .craber-dlg-primary{background:#0d0d0d;color:#fff;border-color:#0d0d0d;
      box-shadow:0 1px 2px rgba(0,0,0,.18)}
    .craber-dlg-primary:hover{background:#000}
    html[data-theme="dark"] .craber-dlg-primary{background:#fff;border-color:#fff;color:#0d0d0d}
    html[data-theme="dark"] .craber-dlg-primary:hover{background:#ececec}
    .craber-dlg-danger{background:#e02e2a;border-color:#e02e2a;color:#fff}
    .craber-dlg-danger:hover{background:#c82622}

    /* 对话框内的候选列表（选择要添加的项目/会话） */
    /* 🦀 面板（对话框形式） */
    /* 设置中心：左导航 + 右内容 */
    /* 设置中心：按视口比例放大，而不是写死像素 ——
       写死 640×460 在大屏上会显得局促（实测偏小）。
       同时给出上下限，小屏和超宽屏都不会失控。 */
    /* 高度按视口给足：设置页信息量大，78~86vh 在 900 高的屏上会频繁滚动。
       同时留出遮罩的 24px 内边距，任何窗口下都不会顶出可视区。 */
    .craber-dlg-wide{width:min(960px,max(680px,74vw));
      height:min(860px,calc(100vh - 40px));
      max-width:100%;max-height:100%;
      display:flex;flex-direction:column;padding:20px 24px 0;border-radius:20px}

    .craber-set{display:flex;gap:0;flex:1;min-height:0;margin:18px -24px 0;
      border-top:1px solid var(--craber-line);overflow:hidden}
    /* 左侧导航：浅一档底色，分组标题 + 图标条目；选中项浮成白色卡片并带左侧竖条 */
    .craber-set-nav{flex:none;width:200px;padding:12px 10px 16px;overflow-y:auto;
      background:color-mix(in srgb,var(--craber-hover) 66%,var(--craber-bg));
      border-right:1px solid var(--craber-line);
      display:flex;flex-direction:column;gap:2px;scrollbar-width:none;
      box-sizing:border-box}
    .craber-set-nav::-webkit-scrollbar{display:none}
    .craber-set-item{position:relative;display:flex;align-items:center;gap:9px;width:100%;
      box-sizing:border-box;text-align:left;padding:8px 10px;border:none;border-radius:9px;
      background:none;color:var(--craber-fg);font:inherit;font-size:13.5px;
      cursor:pointer;min-width:0;
      transition:background-color .14s ease,box-shadow .14s ease}
    .craber-set-itemico{flex:none;width:16px;height:16px;display:flex;
      align-items:center;justify-content:center;color:var(--craber-sub);
      transition:color .14s ease}
    .craber-set-itemico svg{width:16px;height:16px;display:block}
    .craber-set-itemlabel{flex:1;min-width:0;overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap}
    .craber-set-item:hover{background:color-mix(in srgb,var(--craber-fg) 6%,transparent)}
    .craber-set-item:hover .craber-set-itemico{color:var(--craber-fg)}
    .craber-set-item.on{background:var(--craber-bg);font-weight:600;
      box-shadow:0 1px 2px rgba(0,0,0,.06),0 0 0 1px var(--craber-line)}
    /* 深色下 --craber-bg 比导航底色更暗，选中项会"沉"下去；换成提亮一档 */
    html[data-theme="dark"] .craber-set-nav{background:color-mix(in srgb,var(--craber-hover) 40%,var(--craber-bg))}
    html[data-theme="dark"] .craber-set-item.on{
      background:color-mix(in srgb,var(--craber-fg) 9%,var(--craber-bg))}
    .craber-set-item.on .craber-set-itemico{color:var(--craber-accent)}
    .craber-set-item.on::before{content:'';position:absolute;left:-10px;top:50%;
      width:3px;height:16px;margin-top:-8px;border-radius:0 3px 3px 0;
      background:var(--craber-accent)}
    .craber-set-item:focus-visible{outline:2px solid var(--craber-accent);outline-offset:1px}
    .craber-set-body{flex:1;min-width:0;min-height:0;display:flex;
      flex-direction:column;overflow-y:auto;padding:18px 26px 20px;
      scrollbar-width:thin;scrollbar-color:var(--craber-line) transparent}
    .craber-set-body::-webkit-scrollbar{width:10px}
    .craber-set-body::-webkit-scrollbar-thumb{background:var(--craber-line);
      border-radius:6px;border:3px solid var(--craber-bg);background-clip:content-box}
    .craber-set-body::-webkit-scrollbar-thumb:hover{background:var(--craber-sub)}
    .craber-set-body::-webkit-scrollbar-track{background:transparent}
    @keyframes craber-page-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
    /* 普通页：按内容自然撑开，外层 body 负责滚动（绝不能参与 flex 收缩，
       否则卡片自身的 overflow:hidden 会把下半截内容直接裁掉） */
    .craber-set-page{display:flex;flex-direction:column;gap:0;min-width:0;
      flex:none;max-width:860px;
      animation:craber-page-in .2s ease both}
    /* 列表页专用：吃满剩余高度，把 头 / 工具栏 / 列表 / 状态 排成竖向弹性列 */
    .craber-set-page.craber-set-fill{flex:1;min-height:0;height:auto}
    .craber-set-page.craber-set-fill .craber-set-convlist,
    .craber-set-page.craber-set-fill .craber-set-turnlist{flex:1;min-height:120px}
    .craber-set-pagehd{display:flex;flex-direction:column;gap:4px;
      padding:0 0 10px}
    .craber-set-pagetitle{margin:0;font-size:17px;font-weight:650;line-height:1.3;
      letter-spacing:-.01em}
    .craber-set-pagedesc{font-size:12.5px;color:var(--craber-sub);line-height:1.55;
      max-width:60ch}
    /* 行式列表（功能开关）：整块做成卡片，行间用细线分，悬停时整行提亮 */
    .craber-set-list{display:flex;flex-direction:column;min-width:0;
      border:1px solid var(--craber-line);border-radius:14px;overflow:hidden;
      background:var(--craber-bg)}
    .craber-set-row{display:flex;align-items:center;gap:14px;width:100%;
      box-sizing:border-box;padding:14px 16px;border:none;border-top:1px solid var(--craber-line);
      border-radius:0;background:none;color:var(--craber-fg);font:inherit;
      text-align:left;cursor:pointer;min-width:0;
      transition:background-color .14s ease}
    .craber-set-row:first-child{border-top:none}
    .craber-set-row:hover{background:color-mix(in srgb,var(--craber-fg) 3%,transparent)}
    .craber-set-row:focus-visible{outline:2px solid var(--craber-accent);outline-offset:-2px}
    .craber-set-ico{flex:none;width:32px;height:32px;border-radius:9px;
      display:flex;align-items:center;justify-content:center;
      background:var(--craber-ghost);color:var(--craber-sub);
      transition:background-color .16s ease,color .16s ease}
    .craber-set-ico svg{width:16px;height:16px;display:block}
    .craber-set-switch.on .craber-set-ico{
      background:color-mix(in srgb,var(--craber-accent) 13%,transparent);
      color:var(--craber-accent)}
    .craber-set-rowmain{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
    .craber-set-rowlabel{font-size:13.5px;font-weight:500;line-height:1.4}
    .craber-set-rowdesc{font-size:12px;color:var(--craber-sub);line-height:1.45}
    .craber-set-unit{font-size:13px;color:var(--craber-sub)}
    /* 设置行：左侧标签+说明，右侧控件（参考原生设置页的横向排布）
       整组做成卡片，用细线分行的同时保留统一圆角。 */
    .craber-set-form{display:flex;flex-direction:column;min-width:0;
      border:1px solid var(--craber-line);border-radius:14px;
      background:var(--craber-bg);overflow:hidden}
    .craber-set-field{display:flex;align-items:center;gap:24px;
      padding:10px 16px;border-top:1px solid var(--craber-line);min-width:0;
      transition:background-color .14s ease}
    .craber-set-field:first-child{border-top:none}
    .craber-set-field:focus-within{
      background:color-mix(in srgb,var(--craber-hover) 62%,var(--craber-bg))}
    .craber-set-fieldcol{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px}
    .craber-set-label{font-size:13.5px;color:var(--craber-fg);font-weight:500;
      line-height:1.4}
    .craber-set-hint{font-size:12px;color:var(--craber-sub);line-height:1.45}
    /* 表单卡片末尾的范围小结：贴着卡片内边距，不单独占一行分隔线 */
    .craber-set-form > .craber-set-hint{padding:0 16px 11px;margin-top:-6px}
    /* 右列给固定比例而不是像素：标签列和控件列约 1:1，
       之前 width:min(340px,42%) 是相对"由内容撑开"的父级算的，
       结果是输入框被压得很窄、右边留下大片空白。 */
    .craber-set-ctrl{flex:0 0 46%;display:flex;align-items:center;gap:8px;
      min-width:0;justify-content:flex-end}
    .craber-set-ctrl .craber-dlg-input{flex:1;min-width:0;width:100%;
      box-sizing:border-box;padding:8px 11px;font-size:13px;border-radius:9px}
    /* 当前账号：图标 + 名字，只读展示 */
    .craber-acct{display:inline-flex;align-items:center;gap:7px;min-width:0;
      max-width:100%;padding:5px 11px 5px 8px;border-radius:999px;
      background:color-mix(in srgb,var(--craber-accent) 9%,transparent);
      border:1px solid color-mix(in srgb,var(--craber-accent) 22%,transparent)}
    .craber-acct-ico{display:flex;align-items:center;justify-content:center;
      width:18px;height:18px;flex:none;color:var(--craber-accent)}
    .craber-acct-ico svg{width:15px;height:15px;display:block}
    .craber-acct-name{font-size:12.5px;font-weight:550;color:var(--craber-fg);
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}
    .craber-acct-name-warn{color:var(--craber-sub);font-weight:400}
    /* 远端路径预览：等宽、可截断，一眼看清会写到哪 */
    .craber-pathprev{display:flex;align-items:baseline;gap:8px;min-width:0}
    .craber-pathprev-label{flex:none;font-size:11.5px;color:var(--craber-sub)}
    .craber-pathprev-path{min-width:0;font-size:11.5px;line-height:1.5;
      font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      color:color-mix(in srgb,var(--craber-fg) 62%,var(--craber-sub));
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    html[data-theme="dark"] .craber-pathprev-path{color:var(--craber-fg);opacity:.72}
    html[data-theme="dark"] .craber-pathprev-label{opacity:.85}
        /* 带「已选 chip」的字段：标签行在上、chip 区在下并跨满整行 */
    .craber-set-field.craber-set-field-stack{flex-direction:column;align-items:stretch;gap:7px;
      padding-top:9px;padding-bottom:9px}
    .craber-set-fieldhd{display:flex;align-items:flex-start;gap:16px;min-width:0}
    .craber-set-fieldhd .craber-set-fieldcol{gap:2px}
    .craber-set-fieldhd > .craber-set-fieldcol{flex:1 1 auto}
    .craber-set-field-stack .craber-set-ctrl{flex:none;width:auto;justify-content:flex-end;
      padding-top:1px}
    /* 备份位置：账号徽标 + 目录输入 + 远端路径，一行排开，太窄时换行 */
    .craber-locrow{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:0}
    .craber-locrow-input{flex:0 1 150px;min-width:104px;max-width:170px;
      box-sizing:border-box;padding:7px 10px;font-size:12.5px;border-radius:9px}
    .craber-locrow .craber-pathprev{flex:1 1 200px;padding:0;min-width:0;gap:6px}
    .craber-set-chipbar{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
    .craber-set-chipbar[hidden]{display:none}
    .craber-set-chipempty{font-size:12px;color:var(--craber-sub);line-height:1.5;
      padding:1px 0}
    /* 窄屏时上下堆叠，避免左右挤压 */
    @media (max-width: 780px){
      /* 注意：遮罩本身有内边距，小屏下再让宽高 100% 会把标题栏顶出可视区 */
      .craber-dlg-wide{width:100%;height:calc(100% - 0px);max-width:100%;max-height:100%;
        border-radius:16px;padding:16px 16px 0}
      .craber-dlg-mask{padding:12px}
      /* 窄屏：副标题允许换行，字号也略收一点，避免被截成半句 */
      .craber-dlg-sub{white-space:normal;line-height:1.45}
      .craber-dlg-hd{gap:10px}
      .craber-dlg-mark{width:32px;height:32px;border-radius:10px}
      .craber-dlg-mark svg{width:19px;height:19px}
      .craber-set{margin:14px -16px 0;flex-direction:column}
      .craber-set-nav{width:auto;flex:none;flex-direction:row;gap:4px;
        padding:8px 10px;border-right:none;border-bottom:1px solid var(--craber-line);
        overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
      .craber-set-nav::-webkit-scrollbar{display:none}
      .craber-set-nav .craber-set-item{padding:7px 10px;font-size:13px}
      .craber-set-item{width:auto;flex:none;padding:7px 11px}
      .craber-set-item.on::before{display:none}
      .craber-dlg-badge{display:none}
      .craber-set-body{padding:18px 16px 20px}
      .craber-set-field{flex-direction:column;align-items:flex-start;gap:8px}
      .craber-set-ctrl{flex:none;width:100%;justify-content:stretch}
      .craber-set-ctrl .craber-dlg-input{width:100%}
      .craber-set-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
    .craber-set-note{font-size:12.5px;color:var(--craber-sub);line-height:1.6;
      padding:11px 13px;border:1px solid var(--craber-line);border-radius:10px;
      background:color-mix(in srgb,var(--craber-hover) 70%,var(--craber-bg))}
    .craber-set-convlist > .craber-set-note,
    .craber-set-turnlist > .craber-set-note{border:none;background:none;
      text-align:center;padding:22px 12px}
    /* 按钮 */
    .craber-set-actions{display:flex;gap:8px;flex-wrap:wrap;padding:11px 0 0}
    /* 工具栏：搜索框在左，操作按钮 + 计数成组在右 */
    .craber-set-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;
      padding-bottom:10px}
    /* 筛选条：标签 + 控件，日期 chip 一行放得下，项目下拉跟在后面 */
    .craber-set-filters{display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap;
      padding-bottom:12px;min-width:0}
    .craber-set-filter{display:flex;align-items:center;gap:8px;min-width:0;
      flex-wrap:wrap;row-gap:6px}
    .craber-set-filter[hidden]{display:none}
    .craber-set-filterlbl{flex:none;font-size:12px;color:var(--craber-sub)}
    .craber-set-filter .craber-dlg-chips{gap:5px}
    .craber-set-filter .craber-dlg-chip{padding:3px 9px;font-size:12px}
    /* 自绘下拉：触发器 + 浮层菜单（原生 select 的弹层无法美化） */
    .craber-sel{position:relative;display:inline-flex;min-width:0}
    .craber-sel-trigger{display:inline-flex;align-items:center;gap:7px;
      max-width:190px;height:28px;box-sizing:border-box;padding:0 8px 0 10px;
      border:1px solid var(--craber-line);border-radius:8px;background:var(--craber-bg);
      color:var(--craber-fg);font:inherit;font-size:12px;cursor:pointer;
      transition:border-color .14s ease,background-color .14s ease}
    .craber-sel-trigger:hover{background:var(--craber-hover);
      border-color:color-mix(in srgb,var(--craber-fg) 18%,var(--craber-line))}
    .craber-sel-trigger:focus-visible{outline:none;border-color:var(--craber-accent);
      box-shadow:0 0 0 3px color-mix(in srgb,var(--craber-accent) 16%,transparent)}
    .craber-sel.open .craber-sel-trigger{border-color:var(--craber-accent);
      box-shadow:0 0 0 3px color-mix(in srgb,var(--craber-accent) 16%,transparent)}
    .craber-sel-trigger:disabled{opacity:.55;cursor:default}
    .craber-sel-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-sel-caret{flex:none;display:flex;color:var(--craber-sub);
      transition:transform .16s ease,color .16s ease}
    .craber-sel-caret svg{width:12px;height:12px;display:block}
    .craber-sel.open .craber-sel-caret{transform:rotate(180deg);color:var(--craber-accent)}
    /* 菜单挂 body、fixed 定位：坐标由 JS 按触发器位置算，避开面板 overflow */
    .craber-selmenu{position:fixed;z-index:calc(var(--craber-z-modal) + 3);
      box-sizing:border-box;padding:5px;overflow-y:auto;
      background:var(--craber-bg);border:1px solid var(--craber-line);
      border-radius:11px;box-shadow:0 10px 28px rgba(15,18,22,.16),0 2px 6px rgba(15,18,22,.1);
      opacity:0;transform:translateY(-4px) scale(.99);transform-origin:50% 0;
      transition:opacity .12s ease,transform .12s ease;
      scrollbar-width:thin;scrollbar-color:var(--craber-line) transparent}
    .craber-selmenu.show{opacity:1;transform:none}
    .craber-selmenu-up{transform-origin:50% 100%;transform:translateY(4px) scale(.99)}
    .craber-selmenu-up.show{transform:none}
    .craber-selmenu[hidden]{display:none}
    html[data-theme="dark"] .craber-selmenu{
      box-shadow:0 10px 28px rgba(0,0,0,.5),0 2px 6px rgba(0,0,0,.35)}
    .craber-selopt{display:flex;align-items:center;gap:8px;padding:7px 9px;
      border-radius:8px;font-size:12.5px;color:var(--craber-fg);cursor:pointer;
      transition:background-color .1s ease}
    .craber-selopt-txt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;
      white-space:nowrap}
    .craber-selopt-tick{flex:none;width:13px;height:13px;display:none;
      color:var(--craber-accent)}
    .craber-selopt-tick svg{width:13px;height:13px;display:block}
    .craber-selopt.hi{background:var(--craber-hover)}
    .craber-selopt.on{background:color-mix(in srgb,var(--craber-accent) 10%,transparent);
      color:var(--craber-accent);font-weight:550}
    .craber-selopt.on .craber-selopt-tick{display:flex}
    .craber-selopt-none{padding:9px;font-size:12.5px;color:var(--craber-sub);text-align:center}
    /* 筛选条分两行：第一行是"时间 + 日期 chips"，第二行是自定义区间（按需） */
    .craber-set-filterrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;
      min-width:0;row-gap:6px}
    .craber-set-datecustom{display:flex;align-items:center;gap:6px}
    .craber-set-datecustom[hidden]{display:none}
    .craber-set-dateinput{height:28px;width:132px;box-sizing:border-box;padding:0 6px;
      border:1px solid var(--craber-line);border-radius:8px;background:var(--craber-bg);
      color:var(--craber-fg);font:inherit;font-size:12px;outline:none;color-scheme:light dark}
    .craber-set-dateinput:focus-visible{border-color:var(--craber-accent)}
    .craber-set-datesep{font-size:12px;color:var(--craber-sub)}
    /* 行内项目名：小字 + 浅色，不抢标题 */
    .craber-set-turnproj{font-size:11.5px;line-height:1.4;color:var(--craber-sub);
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-set-toolbar > .craber-set-searchwrap{flex:1 1 180px;min-width:140px}
    .craber-set-toolbar > .craber-set-btn:first-of-type{margin-left:auto}
    .craber-set-toolbar > .craber-set-btn{flex:none}
    /* 小号按钮：跟在 chip 后面做"选择…"，不该和主按钮一样大 */
    .craber-set-btn-sm{height:30px;padding:0 11px;font-size:12.5px;border-radius:8px}
    /* 纯图标按钮（刷新）：方形、居中，图标跟文字同色 */
    .craber-set-btn.craber-set-iconbtn{width:32px;height:34px;padding:0;flex:none;
      display:inline-flex;align-items:center;justify-content:center}
    .craber-set-btn.craber-set-iconbtn svg{width:15px;height:15px;flex:none;display:block}
    .craber-set-btn.craber-set-iconbtn.craber-spinning svg{animation:craber-spin .9s linear infinite}
    .craber-set-btn.craber-set-iconbtn:disabled{opacity:.55;cursor:default}
    @media (prefers-reduced-motion:reduce){
      .craber-set-iconbtn.craber-spinning svg{animation-duration:2.4s}
    }
    /* 范围为项目/会话时，控件列要能放下 chips + 按钮 */
    .craber-set-ctrl .craber-dlg-chips{flex:none}
    /* 选择对话框：列表固定高度，便于滚动查找 */
    .craber-pick{display:flex;flex-direction:column;gap:12px;min-width:0;margin-top:16px}
    /* 固定高度 + flex:1 的加载占位，才能在框内垂直居中 */
    .craber-pick-list{display:flex;flex-direction:column;gap:2px;
      height:min(46vh,320px);min-height:200px;
      overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;
      border:1px solid var(--craber-line);border-radius:12px;padding:6px;
      background:var(--craber-bg)}
    .craber-pick-list > .craber-set-loading{flex:1;min-height:0}
    .craber-pick .craber-dav-status{margin-top:-2px;font-size:12px}
    /* 工具条：搜索框 + 全选/清空，同一行 */
    .craber-pick-tools{display:flex;align-items:center;gap:8px;min-width:0}
    .craber-pick-tools > .craber-set-searchwrap{flex:1 1 auto;min-width:110px}
    .craber-pick-tools > .craber-set-btn{flex:none;height:34px}
    /* 已选区：可删除 chip，超过两行在内部滚动 */
    /* 最多两行，再多在区内纵向滚动：高度稳定，列表不被挤小 */
    .craber-pick-picked{display:flex;flex-wrap:wrap;gap:6px;min-width:0;
      max-height:66px;overflow-y:auto;overflow-x:hidden;
      padding:7px 8px;border-radius:11px;box-sizing:border-box;
      background:color-mix(in srgb,var(--craber-hover) 72%,var(--craber-bg));
      scrollbar-width:thin;scrollbar-color:var(--craber-line) transparent}
    .craber-pick-picked .craber-selchip{flex:0 1 auto;max-width:100%}
    .craber-pick-picked::-webkit-scrollbar{width:8px}
    .craber-pick-picked::-webkit-scrollbar-thumb{background:var(--craber-line);
      border-radius:4px;border:2px solid transparent;background-clip:content-box}
    .craber-pick-picked::-webkit-scrollbar-track{background:transparent}
    .craber-pick-pickedwrap[hidden],
    .craber-pick-picked[hidden],
    .craber-pick-picked:empty{display:none}
    .craber-pick-pickedwrap{display:flex;flex-direction:column;gap:6px;min-width:0;
      margin-top:-2px}
    .craber-pick-pickedhd{display:flex;align-items:center;gap:8px}
    .craber-pick-pickedcount{font-size:12px;color:var(--craber-sub);
      font-variant-numeric:tabular-nums}
    .craber-pick-picked::-webkit-scrollbar{width:8px}
    .craber-pick-picked::-webkit-scrollbar-thumb{background:var(--craber-line);
      border-radius:4px;border:2px solid transparent;background-clip:content-box}
    /* 通用：已选项 chip（选择对话框 / 备份范围共用） */
    .craber-selchip{display:inline-flex;align-items:center;gap:5px;max-width:230px;
      box-sizing:border-box;padding:3px 4px 3px 9px;border-radius:999px;
      background:var(--craber-bg);border:1px solid var(--craber-line);
      font-size:12px;line-height:1.5;color:var(--craber-fg)}
    .craber-selchip-txt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-selchip-x{flex:none;width:17px;height:17px;padding:0;border:none;
      border-radius:50%;background:transparent;color:var(--craber-sub);cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:background-color .12s ease,color .12s ease}
    .craber-selchip-x svg{width:9px;height:9px;display:block}
    .craber-selchip-x:hover{background:rgba(224,46,42,.12);color:#e02e2a}
    /* 勾选后的行也浅高亮，扫视时不必盯复选框 */
    .craber-pick-list .craber-set-convrow:has(input:checked){
      background:color-mix(in srgb,var(--craber-accent) 6%,transparent)}
    .craber-pick-list .craber-set-convrow:has(input:checked) .craber-set-turnq{
      color:var(--craber-fg);font-weight:500}
        /* 选择/设置对话框里搜索框是行内控件：不吃多余高度 */
    .craber-pick > .craber-set-searchwrap{flex:none;width:100%;min-width:0}
    /* 搜索框：图标 + 无边框输入，聚焦时整块亮起 */
    .craber-set-searchwrap{flex:1 1 180px;min-width:140px;display:flex;align-items:center;
      gap:8px;height:34px;padding:0 11px;box-sizing:border-box;border-radius:10px;
      background:color-mix(in srgb,var(--craber-hover) 78%,var(--craber-bg));
      border:1px solid transparent;
      transition:background-color .14s ease,border-color .14s ease,box-shadow .14s ease}
    .craber-set-searchwrap:focus-within{background:var(--craber-bg);
      border-color:var(--craber-accent);
      box-shadow:0 0 0 3px color-mix(in srgb,var(--craber-accent) 16%,transparent)}
    .craber-set-searchicon{flex:none;display:flex;color:var(--craber-sub)}
    .craber-set-searchicon svg{width:14px;height:14px;display:block}
    .craber-set-searchwrap input{flex:1;min-width:0;border:none;background:none;
      outline:none;color:var(--craber-fg);font:inherit;font-size:13px;padding:0;height:100%}
    .craber-set-searchwrap input::placeholder{color:var(--craber-sub);opacity:.8}
    /* 会话 / 回合列表：卡片式容器，列表在自己的区域内滚动 */
    .craber-set-convlist,.craber-set-turnlist{display:flex;flex-direction:column;
      gap:2px;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;
      scrollbar-width:thin;margin:0;padding:6px 6px 8px;
      border:1px solid var(--craber-line);border-radius:14px;background:var(--craber-bg)}
    .craber-set-convlist{padding-bottom:10px}
    .craber-set-convlist::-webkit-scrollbar,
    .craber-set-turnlist::-webkit-scrollbar{width:8px}
    .craber-set-convlist::-webkit-scrollbar-thumb,
    .craber-set-turnlist::-webkit-scrollbar-thumb{background:var(--craber-line);
      border-radius:4px;border:2px solid var(--craber-bg);background-clip:content-box}
    .craber-set-convlist::-webkit-scrollbar-track,
    .craber-set-turnlist::-webkit-scrollbar-track{background:transparent}
    /* 概况统计：三个数字并排，让页面一进来就有信息 */
    .craber-set-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;border:none;background:none;overflow:visible;margin-bottom:12px}
    .craber-set-stat{background:color-mix(in srgb,var(--craber-hover) 78%,var(--craber-bg));
      border:1px solid var(--craber-line);border-radius:12px;padding:10px 13px;
      display:flex;flex-direction:column;gap:3px;min-width:0}
    .craber-set-statnum{font-size:18px;font-weight:650;line-height:1.2;
      font-variant-numeric:tabular-nums;overflow:hidden;
      text-overflow:ellipsis;white-space:nowrap}
    .craber-set-statlbl{font-size:11.5px;color:var(--craber-sub);line-height:1.3}

    /* 加载占位：撑满列表区域并居中 */
    .craber-set-loading{display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:10px;flex:1;min-height:120px;
      color:var(--craber-sub);font-size:13px}
    .craber-set-loading .craber-spin{width:16px;height:16px;border-width:2px;
      border-color:color-mix(in srgb,var(--craber-sub) 28%,transparent);
      border-top-color:var(--craber-accent)}
    .craber-set-loadingtext{font-size:12.5px}
    .craber-set-convrow,.craber-set-turnrow{display:flex;align-items:center;gap:11px;
      padding:9px 10px;border-radius:9px;cursor:pointer;min-width:0;
      transition:background-color .12s ease}
    .craber-set-convrow:hover,.craber-set-turnrow:hover{background:var(--craber-hover)}
    .craber-set-convrow:hover .craber-set-turnq{color:var(--craber-fg)}
    /* 隐藏原生复选框，用统一的 .craber-box 画（原生控件在深色下几乎看不见） */
    .craber-set-convrow input[type=checkbox],
    .craber-set-turnrow input[type=checkbox]{position:absolute;opacity:0;width:0;height:0}
    .craber-set-convrow .craber-box,.craber-set-turnrow .craber-box{margin-top:0;
      width:17px;height:17px;border-radius:6px;
      border-color:color-mix(in srgb,var(--craber-sub) 55%,transparent);
      transition:background-color .14s ease,border-color .14s ease}
    .craber-set-convrow:hover .craber-box,.craber-set-turnrow:hover .craber-box{
      border-color:var(--craber-sub)}
    .craber-set-convrow input:checked + .craber-box,
    .craber-set-turnrow input:checked + .craber-box{
      background:var(--craber-accent);border-color:var(--craber-accent)}
    .craber-set-convrow input:checked + .craber-box::after,
    .craber-set-turnrow input:checked + .craber-box::after{
      opacity:1;left:0;right:0;top:-1px;bottom:0;margin:auto;width:4px;height:8px;
      border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
    .craber-set-convrow input:focus-visible + .craber-box,
    .craber-set-turnrow input:focus-visible + .craber-box{
      outline:2px solid var(--craber-accent);outline-offset:2px}
    .craber-set-turnmain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
    .craber-set-turnq{font-size:13px;line-height:1.4;overflow:hidden;
      text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;
      -webkit-box-orient:vertical;word-break:break-word}
    .craber-set-convrow .craber-set-turnq{-webkit-line-clamp:1;display:block;
      white-space:nowrap;text-overflow:ellipsis}
    .craber-set-turnmeta{font-size:11.5px;color:var(--craber-sub)}
    /* 列表右侧的日期：只到天，等宽数字对齐 */
    .craber-set-rowdate{flex:none;align-self:center;font-size:11.5px;
      color:var(--craber-sub);font-variant-numeric:tabular-nums;white-space:nowrap}
    .craber-set-btn{height:34px;padding:0 14px;border-radius:10px;
      border:1px solid var(--craber-line);background:var(--craber-bg);
      color:var(--craber-fg);font:inherit;font-size:13px;font-weight:500;
      cursor:pointer;display:inline-flex;align-items:center;gap:6px;
      transition:background-color .14s ease,border-color .14s ease,
        box-shadow .14s ease,transform .1s ease}
    .craber-set-btn:hover{background:var(--craber-hover);
      border-color:color-mix(in srgb,var(--craber-fg) 18%,var(--craber-line))}
    .craber-set-btn:active{transform:translateY(1px)}
    .craber-set-btn:focus-visible{outline:2px solid var(--craber-accent);outline-offset:2px}
    .craber-set-btn:disabled{opacity:.55;cursor:default;transform:none}
    .craber-set-btn svg{width:14px;height:14px;display:block}
    .craber-set-btn-primary{background:#0d0d0d;border-color:#0d0d0d;color:#fff;
      box-shadow:0 1px 2px rgba(0,0,0,.16)}
    .craber-set-btn-primary:hover{background:#000;border-color:#000}
    /* 深浅色下按钮底色跟随主题，避免深色模式里出现黑底黑字 */
    html[data-theme="dark"] .craber-set-btn-primary{background:#fff;border-color:#fff;color:#0d0d0d}
    html[data-theme="dark"] .craber-set-btn-primary:hover{background:#ececec;border-color:#ececec}
    /* 工具栏里的已选计数 */
    .craber-set-selcount{flex:none;font-size:12px;color:var(--craber-sub);
      font-variant-numeric:tabular-nums;margin-left:2px;white-space:nowrap}
    @media (prefers-reduced-motion:reduce){
      .craber-set-page,.craber-set-item,.craber-set-row,.craber-set-btn{
        animation:none;transition:none}
    }

    /* 开关尺寸：设置行里的开关比菜单里略大，命中区域更舒服 */
    .craber-set-switch .craber-fab-switch{width:36px;height:20px;border-radius:10px}
    .craber-set-switch .craber-fab-switch::after{width:16px;height:16px}
    .craber-set-switch.craber-fab-toggle.on .craber-fab-switch::after{transform:translateX(16px)}
    .craber-set-page .craber-dav-loghead{margin-top:12px}
    .craber-set-page .craber-dav-loglist{margin-top:2px}
    /* 状态行：与设置区留出气口 */
    .craber-dav-status{margin-top:12px}
    .craber-crab{display:flex;flex-direction:column;gap:18px;min-width:0}
    .craber-crab-sec{display:flex;flex-direction:column;gap:8px;min-width:0}
    .craber-crab-sectitle{font-size:12px;font-weight:600;letter-spacing:.03em;
      color:var(--craber-sub);text-transform:uppercase}
    /* 导出：两张卡片并排 */
    .craber-crab-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .craber-crab-card{display:flex;flex-direction:column;gap:3px;text-align:left;
      padding:11px 12px;border:1px solid var(--craber-line);border-radius:10px;
      background:var(--craber-bg);color:var(--craber-fg);cursor:pointer;
      font:inherit;min-width:0;transition:background-color .12s ease,border-color .12s ease}
    .craber-crab-card:hover{background:var(--craber-hover);border-color:var(--craber-sub)}
    .craber-crab-cardtitle{font-size:13.5px;font-weight:600;line-height:1.3}
    .craber-crab-carddesc{font-size:11.5px;color:var(--craber-sub);line-height:1.35;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    /* 行：左文字（可带副标题）+ 右侧箭头/开关 */
    .craber-crab-row{display:flex;align-items:center;gap:10px;width:100%;
      box-sizing:border-box;padding:9px 10px;border:none;border-radius:8px;
      background:transparent;color:var(--craber-fg);cursor:pointer;
      font:inherit;text-align:left;min-width:0;
      transition:background-color .12s ease}
    .craber-crab-row:hover{background:var(--craber-hover)}
    .craber-crab-rowmain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
    .craber-crab-rowlabel{font-size:13px;font-weight:500;line-height:1.35;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-crab-rowdesc{font-size:11.5px;color:var(--craber-sub);line-height:1.35;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-crab-rowarrow{flex:none;width:13px;height:13px;display:flex;
      align-items:center;justify-content:center;color:var(--craber-sub);opacity:.5}
    .craber-crab-rowarrow svg{width:13px;height:13px}
    .craber-crab-row:hover .craber-crab-rowarrow{opacity:.85}
    .craber-crab-toggle .craber-crab-rowlabel{flex:1;font-size:13px}
    .craber-crab-ver{font-size:11px;color:var(--craber-sub);opacity:.7;
      text-align:right;font-variant-numeric:tabular-nums;user-select:none;cursor:default}

    /* WebDAV 对话框：两个区块，统一 20px 间距节奏 */
    .craber-dav{display:flex;flex-direction:column;gap:20px}
    .craber-dav-sec{display:flex;flex-direction:column;gap:0;min-width:0}
    .craber-dav-sec + .craber-dav-sec{padding-top:18px;
      border-top:1px solid var(--craber-line)}
    .craber-dav-sectitle{font-size:12px;font-weight:600;letter-spacing:.03em;
      color:var(--craber-sub);text-transform:uppercase;margin-bottom:12px}

    /* 同步记录 */
    .craber-dav-loghead{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .craber-dav-logtitle{font-size:13px;color:var(--craber-fg);font-weight:600}
    .craber-dav-logmeta{flex:1;min-width:0;font-size:11.5px;color:var(--craber-sub);
      text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-dav-clear{flex:none;border:none;background:none;padding:2px 6px;
      border-radius:6px;font:inherit;font-size:11.5px;color:var(--craber-sub);
      cursor:pointer;margin-left:auto}
    .craber-dav-clear:hover{background:var(--craber-hover);color:var(--craber-fg)}
    /* 记录列表：去掉外层额外留白，行间距靠 gap 控制 */
    .craber-dav-loglist{max-height:120px;overflow-y:auto;overflow-x:hidden;
      display:flex;flex-direction:column;gap:1px;padding-right:6px;
      margin-right:-6px}
    .craber-dav-logempty{padding:14px 2px;font-size:12.5px;color:var(--craber-sub);
      text-align:center}
    .craber-dav-logrow{display:flex;align-items:flex-start;gap:8px;padding:8px;
      border-radius:8px;font-size:12.5px;line-height:1.4}
    .craber-dav-logrow:hover{background:var(--craber-hover)}
    .craber-dav-logdot{flex:none;width:6px;height:6px;border-radius:50%;margin-top:6px;
      background:var(--craber-accent)}
    .craber-dav-logrow.err .craber-dav-logdot{background:#e02e2a}
    .craber-dav-logmain{flex:1;min-width:0}
    .craber-dav-logline{color:var(--craber-fg);display:flex;align-items:center;
      gap:6px;min-width:0}
    .craber-dav-logname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    /* 变更徽标：+N 绿、-N 红，紧凑等宽便于一眼比较 */
    .craber-dav-chip{flex:none;padding:0 5px;border-radius:4px;font-size:11px;
      line-height:16px;font-weight:600;font-variant-numeric:tabular-nums}
    .craber-dav-chip.add{color:var(--craber-accent);background:rgba(16,163,127,.12)}
    .craber-dav-chip.del{color:#e02e2a;background:rgba(224,46,42,.12)}
    .craber-dav-logrow.err .craber-dav-logline{color:#e02e2a}
    .craber-dav-logdetail{color:var(--craber-sub);font-size:11.5px;margin-top:1px;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-dav-logtime{flex:none;color:var(--craber-sub);font-size:11px;
      font-variant-numeric:tabular-nums;margin-top:1px}

    /* WebDAV 状态行：成功绿、失败红 */
    .craber-dav-status{font-size:12.5px;line-height:1.5;
      color:var(--craber-sub);word-break:break-word;margin-top:10px}
    .craber-dav-status:empty{display:none}
    .craber-dav-status.ok{color:var(--craber-accent)}
    .craber-dav-status.err{color:#e02e2a}

    /* WebDAV 设置对话框字段 */
    .craber-dav-field{margin-bottom:12px}
    .craber-dav-field:last-of-type{margin-bottom:0}
    .craber-dav-label{font-size:12px;color:var(--craber-sub);margin-bottom:6px;
      font-weight:500}

    /* 注入到原生菜单里的「导出」项：尽量贴近原生菜单项的外观 */
    .craber-menu-injected{display:block}
    .craber-menu-inj-btn{display:flex;align-items:center;gap:8px;width:100%;
      box-sizing:border-box;padding:8px 10px;border:none;background:none;
      text-align:left;cursor:pointer;border-radius:8px;
      font-size:13.5px;font-family:inherit;color:inherit;line-height:1.3}
    .craber-menu-inj-btn:hover{background:var(--craber-hover)}
    .craber-menu-inj-ico{flex:none;width:16px;height:16px;display:flex;
      align-items:center;justify-content:center}
    .craber-menu-inj-ico svg{width:16px;height:16px}

    /* 导出进度浮层（菜单导出时显示，右下角） */
    .craber-prog{position:fixed;right:20px;bottom:20px;z-index:var(--craber-z-tip);
      width:280px;box-sizing:border-box;padding:14px 16px;
      background:var(--craber-bg);color:var(--craber-fg);
      border:1px solid var(--craber-line);border-radius:12px;
      box-shadow:0 8px 28px rgba(0,0,0,.14);
      font-size:13px;font-family:inherit}
    .craber-prog-hd{font-weight:600;font-size:13.5px;line-height:1.4;
      margin-bottom:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-prog-bar{height:5px;border-radius:3px;background:var(--craber-ghost);
      overflow:hidden}
    .craber-prog-fill{height:100%;width:0;border-radius:3px;
      background:var(--craber-accent);transition:width .2s ease}
    .craber-prog-fill.err{background:#e02e2a}
    .craber-prog-txt{margin-top:8px;font-size:12.5px;color:var(--craber-sub);
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

    /* 搜索 + 日期筛选（添加对话框内，仅会话页签显示） */
    .craber-dlg-filter{display:flex;flex-direction:column;gap:8px;
      padding:10px 0 4px;min-width:0}
    /* 添加选择器：页签贴到 body 顶部，筛选与列表顺次排布 */
    .craber-picker-body > .craber-dlg-tabs{margin-top:0}
    .craber-dlg-filter .craber-set-searchwrap{width:100%;flex:none}
    .craber-dlg-filter[hidden]{display:none}
    .craber-dlg-chips{display:flex;flex-wrap:wrap;gap:6px}
    .craber-dlg-chip{display:inline-flex;align-items:center;gap:5px;cursor:pointer;
      padding:4px 10px;border:1px solid var(--craber-line);border-radius:999px;
      font-size:12.5px;color:var(--craber-sub);user-select:none;
      transition:background-color .12s ease,border-color .12s ease,color .12s ease}
    .craber-dlg-chip:hover{background:var(--craber-hover);color:var(--craber-fg)}
    .craber-dlg-chip input{display:none}
    /* 选中态用蟹绿的淡底 + 绿字，比整块涂黑轻，也不抢主按钮的视觉 */
    .craber-dlg-chip:has(input:checked){
      background:color-mix(in srgb,var(--craber-accent) 12%,transparent);
      border-color:color-mix(in srgb,var(--craber-accent) 45%,transparent);
      color:var(--craber-accent)}
    .craber-dlg-custom{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .craber-dlg-custom[hidden]{display:none}
    .craber-dlg-date{padding:5px 8px;border:1px solid var(--craber-line);
      border-radius:8px;background:var(--craber-bg);color:var(--craber-fg);
      font-size:12.5px;font-family:inherit;outline:none}
    .craber-dlg-date:focus{border-color:var(--craber-accent);
      box-shadow:0 0 0 3px color-mix(in srgb,var(--craber-accent) 14%,transparent)}
    .craber-dlg-datesep{font-size:12.5px;color:var(--craber-sub)}

    /* 页签：会话 / 项目。选中项用底部横线标记，风格贴原生。 */
    .craber-dlg-tabs{display:inline-flex;gap:2px;margin:14px 0 0;padding:3px;
      border-radius:10px;background:var(--craber-ghost);align-self:flex-start}
    .craber-dlg-tab{border:none;background:none;padding:6px 14px;cursor:pointer;
      font-size:13px;font-family:inherit;color:var(--craber-sub);font-weight:500;
      position:relative;border-radius:8px;
      transition:background-color .14s ease,color .14s ease,box-shadow .14s ease}
    .craber-dlg-tab:hover{color:var(--craber-fg)}
    .craber-dlg-tab.on{color:var(--craber-fg);font-weight:600;background:var(--craber-bg);
      box-shadow:0 1px 2px rgba(0,0,0,.08),0 0 0 1px color-mix(in srgb,var(--craber-fg) 8%,transparent)}
    .craber-dlg-pane{display:flex;flex-direction:column;min-width:0;min-height:0}
    .craber-dlg-pane[hidden]{display:none}
    /* 添加选择器：外层不滚动，页签与筛选固定，列表撑满剩余高度自己滚 */
    .craber-picker-body{display:flex;flex-direction:column;overflow:hidden}
    .craber-picker-body > .craber-dlg-tabs,
    .craber-picker-body > .craber-dlg-filter{flex:none}
    .craber-picker-body .craber-dlg-pane{flex:1;min-height:0}
    .craber-picker-body .craber-dlg-list{flex:1;min-height:120px;max-height:none}
    .craber-dlg-count{font-size:12.5px;color:var(--craber-sub);margin-left:2px;
      font-variant-numeric:tabular-nums}

    /* 只允许纵向滚动：横向用 overflow-x:hidden + min-width:0 彻底压掉，
       否则长标题会把内容撑宽，出现意外的横向滚动条（实测踩到过）。 */
    /* 不能用负的左右外边距：那会把内容推出卡片右缘，
       滚动条被裁到框外只剩一条缝（实测）。
       改为正常的 0 外边距 + 右侧留出滚动条宽度的内边距。 */
    .craber-dlg-list{display:flex;flex-direction:column;gap:2px;
      max-height:min(48vh,420px);overflow-y:auto;overflow-x:hidden;
      margin:0;padding:6px;min-width:0;
      box-sizing:border-box;scrollbar-width:thin;
      border:1px solid var(--craber-line);border-radius:12px;background:var(--craber-bg)}
    /* 滚动条本身：加一点圆角内缩，不被卡片内边距压到边缘外 */
    .craber-dlg-list::-webkit-scrollbar{width:8px}
    .craber-dlg-list::-webkit-scrollbar-thumb{background:var(--craber-line);
      border-radius:4px;border:2px solid transparent;background-clip:content-box}
    .craber-dlg-list::-webkit-scrollbar-thumb:hover{background:var(--craber-sub);
      background-clip:content-box}
    .craber-dlg-list::-webkit-scrollbar-track{background:transparent}
    .craber-dlg-list > *{min-width:0;max-width:100%}
    .craber-dlg-group{font-size:12px;color:var(--craber-sub);padding:10px 4px 5px;
      line-height:1.3;user-select:none;font-weight:600}
    .craber-dlg-item{display:flex;align-items:center;gap:10px;padding:9px 10px;
      border-radius:9px;cursor:pointer;font-size:14px;color:var(--craber-fg);line-height:1.35;
      min-width:0;box-sizing:border-box}
    .craber-dlg-item:hover{background:var(--craber-hover)}
    .craber-dlg-item.is-added{cursor:default;opacity:.45}
    .craber-dlg-item.is-added:hover{background:none}
    .craber-dlg-item .craber-dlg-item-ico{flex:none;width:16px;height:16px;
      display:flex;align-items:center;justify-content:center;color:var(--craber-sub)}
    .craber-dlg-item .craber-dlg-item-ico svg{width:16px;height:16px;display:block}
    .craber-dlg-item-name{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;
      white-space:nowrap}
    .craber-dlg-check{flex:none;width:17px;height:17px;
      border:1.5px solid color-mix(in srgb,var(--craber-sub) 55%,transparent);
      border-radius:6px;display:flex;align-items:center;justify-content:center;
      color:#fff;box-sizing:border-box;
      transition:background-color .12s ease,border-color .12s ease}
    .craber-dlg-check.on{background:var(--craber-accent);border-color:var(--craber-accent)}
    .craber-dlg-check svg{width:12px;height:12px;display:block}
    .craber-dlg-check.locked{background:var(--craber-ghost);border-color:var(--craber-ghost);
      color:var(--craber-sub)}
    /* 工具条：上方与页签留出间距，右侧复选框与列表行对齐 */
    /* 右侧 10px 与列表的 padding-right 对齐；再留 8px 给滚动条，
       这样"全选"的复选框和列表里各行的复选框在同一条竖线上。 */
    .craber-dlg-toolbar{display:flex;align-items:center;gap:8px;
      padding:10px 18px 8px 0;flex-wrap:wrap;min-width:0}
    /* 「全选」：文字在左、复选框在右，整块可点。
       右内边距 10px 与列表的 padding-right 一致，复选框才能竖向对齐。 */
    .craber-dlg-all{display:flex;align-items:center;gap:8px;cursor:pointer;
      margin-left:auto;padding:3px 10px 3px 8px;border-radius:7px;user-select:none}
    .craber-dlg-all:hover{background:var(--craber-hover)}
    .craber-dlg-all-label{font-size:13px;color:var(--craber-sub)}
    .craber-dlg-all .craber-dlg-check.partial{background:var(--craber-accent);
      border-color:var(--craber-accent);color:#fff}
    .craber-dlg-all .craber-dlg-check.locked{opacity:.4;cursor:default}
    .craber-dlg-toolbar button{border:none;background:none;color:var(--craber-accent);
      font-size:13px;cursor:pointer;padding:2px 0;font-family:inherit}
    .craber-dlg-toolbar button:hover{text-decoration:underline}

    /* 与原版视觉对齐的弹出菜单（文件夹条目 ⋯）：圆角 12、分组分隔线、
       左侧 16px 图标槽、危险项红字。 */
    /* 弹出菜单：按原生规格还原
       - 宽 190px、圆角 12px、1px 细边、无横向分隔线（原版靠分组间距分段）
       - 项高 36px、字号 14px、图标 16px、图标与文字间距 12px
       - 分组标题 12px 灰色；危险项红色（图标同色） */
    .craber-menu{position:fixed;z-index:var(--craber-z-fab-menu);width:190px;
      padding:6px 4px;box-sizing:border-box;background:var(--craber-bg);
      border:1px solid var(--craber-line);border-radius:12px;
      box-shadow:0 8px 24px rgba(0,0,0,.14),0 1px 3px rgba(0,0,0,.08);
      font-family:system-ui,sans-serif;
      animation:craber-pop-in .14s cubic-bezier(.2,.8,.25,1)}
    .craber-menu-item{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;
      border:none;background:none;text-align:left;padding:0 10px;height:36px;
      border-radius:8px;cursor:pointer;font-size:14px;color:var(--craber-fg);line-height:1}
    .craber-menu-item:hover{background:var(--craber-hover)}
    .craber-menu-ico{flex:none;width:16px;height:16px;display:flex;align-items:center;
      justify-content:center;color:var(--craber-fg)}
    .craber-menu-ico svg{width:16px;height:16px;display:block}
    .craber-menu-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    /* 分组长间距（替代原版的横线）：原版是"组间留白 + 组标题" */
    .craber-menu-sep{height:6px;background:none;margin:0}
    .craber-menu-group{font-size:12px;color:var(--craber-sub);padding:8px 10px 4px;
      line-height:1.3;user-select:none}
    .craber-menu-arrow{flex:none;color:var(--craber-sub);display:flex;align-items:center}
    .craber-menu-arrow svg{width:12px;height:12px;display:block}
    .craber-menu-danger{color:#e02e2a}
    .craber-menu-danger .craber-menu-ico{color:#e02e2a}
    .craber-menu-danger:hover{background:rgba(224,46,42,.08)}

    /* 归入文件夹的上下文菜单：贴着按钮弹出 */
    .craber-pjify{position:fixed;z-index:var(--craber-z-fab-menu);min-width:200px;max-width:260px;
      max-height:min(60vh,420px);overflow-y:auto;padding:5px;box-sizing:border-box;
      background:var(--craber-bg);border:1px solid var(--craber-line);border-radius:12px;
      box-shadow:0 12px 34px rgba(0,0,0,.22);font-family:system-ui,sans-serif;
      animation:craber-pop-in .14s cubic-bezier(.2,.8,.25,1)}
    .craber-pjify-hd{padding:6px 10px 8px;font-size:11.5px;color:var(--craber-sub);line-height:1.4;
      border-bottom:1px solid var(--craber-line);margin-bottom:4px}
    .craber-pjify-row{display:flex;align-items:center;gap:4px;width:100%;box-sizing:border-box;
      border:none;background:none;text-align:left;padding:7px 10px;border-radius:8px;cursor:pointer;
      font-size:12.5px;color:var(--craber-fg);line-height:1.3}
    .craber-pjify-row:hover{background:var(--craber-hover)}
    .craber-pjify-row span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .craber-pjify-row .craber-pjify-check{flex:none;color:var(--craber-accent);width:13px;height:13px}
    /* 导出项的图标：不能跟随 span 的 flex:1 被拉伸 */
    .craber-pjify-group{padding:2px 10px 5px;font-size:11.5px;font-weight:600;
      color:var(--craber-sub);letter-spacing:.02em}
    .craber-pjify-row .craber-pjify-ico{flex:none;width:14px;height:14px;display:flex;
      align-items:center;justify-content:center;color:var(--craber-sub)}
    .craber-pjify-row .craber-pjify-ico svg{width:14px;height:14px}
    .craber-pjify-export:hover .craber-pjify-ico{color:var(--craber-fg)}
    /* 目标文件夹名称：不加图标，纯文字左对齐，右侧放勾选状态 */
    .craber-pjify-sep{height:1px;background:var(--craber-line);margin:4px 6px}
    .craber-pjify-new{color:var(--craber-accent)}

    /* 二级菜单：向右弹出的独立浮层（与原生菜单一致），不是内联展开 */
    .craber-pjify-hassub{position:relative}
    .craber-pjify-arrow{flex:none !important;width:12px;height:12px;display:flex;
      align-items:center;justify-content:center;color:var(--craber-sub);opacity:.7}
    .craber-pjify-arrow svg{width:12px;height:12px;display:block}
    .craber-pjify-hassub:hover .craber-pjify-arrow,
    .craber-pjify-hassub.subon .craber-pjify-arrow{opacity:1}
    /* 入口展开时保持高亮，提示"这个浮层是哪来的" */
    .craber-pjify-hassub.subon{background:var(--craber-hover)}
    /* 已加入数量：入口右侧的小圆标 */
    .craber-pjify-count{flex:none !important;min-width:16px;height:16px;padding:0 4px;
      box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;
      border-radius:8px;background:var(--craber-ghost);color:var(--craber-sub);
      font-size:10.5px;font-variant-numeric:tabular-nums}
    /* 二级浮层本体：与主菜单同款外观，独立定位 */
    .craber-pjify-sub{position:fixed;z-index:var(--craber-z-fab-menu);
      min-width:168px;max-width:240px;padding:6px;box-sizing:border-box;
      background:var(--craber-bg);border:1px solid var(--craber-line);
      border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);
      opacity:0;transform:translateX(-4px);
      transition:opacity .12s ease,transform .12s ease;
      pointer-events:none;max-height:min(60vh,420px);overflow-y:auto;
      scrollbar-width:thin}
    .craber-pjify-sub.craber-open{opacity:1;transform:none;pointer-events:auto}
    .craber-pjify-subinner{display:flex;flex-direction:column;min-height:0}
    .craber-pjify-subrow{padding-left:6px}
    .craber-pjify-subempty{padding:6px 8px 8px;font-size:12px;color:var(--craber-sub)}
    .craber-folders.drag-over{background:var(--craber-hover);border-radius:8px;
      box-shadow:inset 0 0 0 1.5px var(--craber-accent)}
    @media (prefers-reduced-motion:reduce){
      .craber-folder-chev,.craber-pjify,.craber-pj-btn{transition:none;animation:none}
    }
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
              <label class="craber-chip"><input type="checkbox" name="craber-tools"><span class="craber-box"></span>含工具结果</label>
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
    layer.el = mask;
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
    bindCheck('craber-tools', 'includeTools');
    bindCheck('craber-think', 'includeReasoning');

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
        navToast('已导出 ' + selected.length + ' 个回合');
      } catch (err) {
        statusEl.textContent = '失败：' + err.message;
        console.error('[gpt-craber]', err);
        navToast('导出失败：' + (err && err.message ? err.message : '未知错误'));
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

  // ChatGPT 的消息区是 main 内的滚动 div。找法不能是"从第一个已挂载消息往上找
  // 可滚动祖先" —— SPA 切换会话时，上一个会话的 DOM 会以零尺寸留在页面上，
  // 从它出发一路都是 span 0，最后什么也选不到，滚动就全落到文档上（表现为跳转
  // 完全不动、一直卡在"正在向上加载"）。
  // 可靠做法：直接列出页面上所有可滚动容器，挑尺寸正常、且真正装了消息的那个。
  function getScrollContainer() {
    const candidates = [];
    const add = (node) => {
      if (!node || candidates.includes(node)) return;
      const cs = getComputedStyle(node);
      if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') return;
      const r = node.getBoundingClientRect();
      // 零尺寸/不可见的多半是残留 DOM，直接排除
      if (r.width < 100 || r.height < 100) return;
      if (node.scrollHeight - node.clientHeight <= 40) return;
      candidates.push({ node: node, area: r.width * r.height,
        turns: node.querySelectorAll(TURN_SEL).length });
    };

    add(document.scrollingElement);
    add(document.documentElement);
    const all = document.querySelectorAll('main div, main');
    for (let i = 0; i < all.length; i++) add(all[i]);

    if (!candidates.length) return document.scrollingElement || document.documentElement;

    // 装了消息的优先；都不含消息时退回面积最大的（最大的那个通常就是会话区）
    const withTurns = candidates.filter((c) => c.turns > 0);
    const pool = withTurns.length ? withTurns : candidates;
    pool.sort((a, b) => b.area - a.area);
    return pool[0].node;
  }

  // 用户提问真正的气泡是里面那个带背景、靠右对齐的小块 —— 光圈画在外层上，
  // 看起来就是整行被框住，跟"这条消息"对不上。新版直接把气泡标成
  // [data-user-message-bubble]，优先用它；旧类名和几何判断留作兜底。
  const NAV_BUBBLE_SEL = '[data-user-message-bubble],.user-message-bubble-color,' +
    '[class*="user-message-bubble"],[class*="bg-token-message-surface"]';
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
    const el = findMsgEl(messageId);
    if (!el) return false;
    const sc = getScrollContainer();
    try {
      // 一律走内容坐标：容器是 column-reverse 时由 navScrollTo 负责翻方向，
      // 直接写 sc.scrollTo({top}) 会把方向弄反、落点跑到会话另一头。
      navScrollTo(sc, contentTopOf(sc, el) - NAV_SCROLL_OFFSET, true);
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

  // 取轨道应该贴住的左边缘。
  // 不能只看 main.left —— 侧栏展开时它是浮层盖在 main 上（实测侧栏内容宽 252px，
  // 而 main.left 仍是收起的 52px），照 main.left 定位会让轨道落进侧栏里跟它重叠。
  // 所以要把所有"占着左侧空间的原生元素"的右边界都算进来，取最右者再加间距。
  function getNavRailLeft() {
    let edge = 0;

    // 1) 侧边栏（展开时是浮层，收起时是细导航条）—— 只看真正可见的
    document.querySelectorAll('aside, nav[aria-label="聊天记录"], .app-shell-left-panel')
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 20 && r.height > 100 && r.left < innerWidth * 0.5) {
          edge = Math.max(edge, r.right);
        }
      });

    // 2) 内容区本身也可能已经把侧栏宽度让出来了（收起状态）
    const main = document.querySelector('main');
    if (main) {
      const r = main.getBoundingClientRect();
      if (r.width > 100 && r.left >= 0) edge = Math.max(edge, r.left);
    }

    return edge > 0 ? Math.round(edge + 8) : 12;
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

  // 改版后回合容器的标记从 data-message-id 换成了 data-turn-key，两者都认。
  // 这里集中一处，避免选择器散落在各个函数里，下次再改版只需改这两行。
  const TURN_SEL = '[data-turn-key],[data-message-id]';
  const TURN_KEY_ATTR = 'data-turn-key';

  function getTurnKey(el) {
    if (!el) return null;
    return el.getAttribute(TURN_KEY_ATTR) || el.getAttribute('data-message-id') || null;
  }

  // 按消息 id 找回合容器。新版每个回合在 DOM 里会存在**两个**同 key 的元素：
  // 一个是虚拟化留下的零尺寸占位符，一个是真正渲染出内容的节点（实测 0×0 与
  // 768×6474 成对出现），而 document.querySelector 命中的恰恰是前者。
  // 拿到占位符就会误判"消息已挂载"，随后去滚动一个不可见的空节点，落点永远
  // 算不对 —— 这是节点跳转失效的直接原因。所以这里必须挑有尺寸的那个。
  function findMsgEl(id) {
    const pick = (sel) => {
      const list = document.querySelectorAll(sel);
      let fallback = null;
      for (let i = 0; i < list.length; i++) {
        const el = list[i];
        // 宽度和高度都大于 0 才是真正渲染出来的节点
        if (el.offsetWidth > 0 && el.offsetHeight > 0) return el;
        if (!fallback) fallback = el;
      }
      return fallback;
    };
    return pick('[data-turn-key="' + id + '"]') ||
      pick('[data-message-id="' + id + '"]');
  }

  // 页面上已挂载的用户消息容器（用于滚动联动、最旧下标等）。
  // 新版：回合容器内带 [data-user-message-bubble]；旧版：带 data-message-author-role 的节点。
  // 同一 key 的占位符要排掉，否则同一个回合会被数两次。
  function mountedUserTurns() {
    const out = [];
    const seen = Object.create(null);
    document.querySelectorAll(TURN_SEL).forEach((el) => {
      const key = getTurnKey(el);
      if (!key || seen[key]) return;
      if (!el.querySelector('[data-user-message-bubble],[data-message-author-role="user"]')) return;
      // 零尺寸的是虚拟化占位符，不含可滚动到的真实位置
      if (!el.offsetWidth && !el.offsetHeight) return;
      seen[key] = 1;
      out.push(el);
    });
    return out;
  }

  const navSleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 滚动容器的方向。ChatGPT 的会话容器是 flex-direction:column-reverse：
  // 它的 scrollTop = 0 表示**视觉底部（最新消息）**，往更旧的内容走是**负值**
  // （实测写入 -16280 能到最旧端，写入正值一律被夹回 0）。
  // 所有"按内容坐标算位置再写回去"的代码都必须过一次换算，否则方向正好相反 ——
  // 表现就是节点跳转时一直在底部打转、卡在"正在向上加载"。
  function isReversedScroller(sc) {
    return getComputedStyle(sc).flexDirection === 'column-reverse';
  }

  // 内容坐标（0 = 最旧内容顶端，正方向 = 向更新）与容器原生 scrollTop 互转。
  // 非 reverse 容器两者相同；reverse 容器需要反号并以"可滚动量"为基准偏移。
  function scrollSpan(sc) {
    return Math.max(0, sc.scrollHeight - sc.clientHeight);
  }

  // 滚动内容坐标系（相对滚动内容顶部，0 = 最旧端），把 root 滚动、普通容器、
  // column-reverse 容器三种情况拉平到同一套语义。
  function navScrollMetrics(sc) {
    const isRoot = sc === document.scrollingElement || sc === document.documentElement;
    if (isRoot) {
      return { isRoot: true, reversed: false, base: 0, pos: window.scrollY, span: 0 };
    }
    const reversed = isReversedScroller(sc);
    const span = scrollSpan(sc);
    // 原生 scrollTop：reverse 下 -span 是最旧端，0 是最新端。
    // contentPos 统一成"离最旧端的距离"：非 reverse 就是 scrollTop，reverse 要翻转。
    const raw = sc.scrollTop;
    return {
      isRoot: false,
      reversed: reversed,
      base: sc.getBoundingClientRect().top,
      pos: reversed ? raw + span : raw,
      span: span
    };
  }

  // 把内容坐标写回容器。top 是"离最旧端的距离"，由本函数负责翻译成该容器
  // 真正接受的数值 —— 调用方一律按内容坐标思考，不必关心方向。
  function navScrollTo(sc, top, smooth) {
    const m = navScrollMetrics(sc);
    const v = Math.max(0, Math.min(m.span, Math.round(top)));
    if (m.isRoot) {
      window.scrollTo({ top: v, behavior: smooth ? 'smooth' : 'auto' });
      return;
    }
    const target = m.reversed ? v - m.span : v;
    // column-reverse 容器里 scrollTo({top: 负值, behavior:'smooth'}) 会静默失效
    // （实测停在 0 不动，而同样的负值直接赋值就正常）。所以 reverse 容器一律
    // 直接赋值，不走 smooth —— 平滑动画和"能跳过去"之间只能选后者。
    if (smooth && !m.reversed) sc.scrollTo({ top: target, behavior: 'smooth' });
    else sc.scrollTop = target;
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
    const els = mountedUserTurns();
    let min = -1;
    for (let i = 0; i < els.length; i++) {
      const at = navIdxById[getTurnKey(els[i])];
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

  // 元素当前在"内容坐标"里的位置（0 = 最旧端）。视口坐标加上已滚过的距离即可，
  // 与容器方向无关 —— 方向只在写回时由 navScrollTo 处理。
  function contentTopOf(sc, node) {
    const m = navScrollMetrics(sc);
    return node.getBoundingClientRect().top - m.base + m.pos;
  }

  // 目标已加载、只是被卸载：取两侧最近的已挂载邻居，按下标线性插值估它的位置。
  // 用真实几何比全局比例可靠得多，而且这条路不碰接口。
  function jumpByAnchors(sc, idx) {
    const els = mountedUserTurns();
    let lo = null;
    let hi = null;
    for (let i = 0; i < els.length; i++) {
      const at = navIdxById[getTurnKey(els[i])];
      if (at === undefined) continue;
      const top = contentTopOf(sc, els[i]);
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
        const delta = contentTopOf(sc, el) - NAV_SCROLL_OFFSET;
        const m = navScrollMetrics(sc);
        if (Math.abs(delta - m.pos) < 4) break;
        navScrollTo(sc, delta);
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
    const els = mountedUserTurns();
    let act = -1;
    for (let i = 0; i < els.length; i++) {
      const idx = navIdxById[getTurnKey(els[i])];
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
    // 开关关掉就彻底不做事（也顺带撤掉已挂的轨道），别在后台继续请求接口
    if (!uiPrefs.navRail) { hideNavRailNow(); return; }
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
    if (!document.querySelector(TURN_SEL)) {
      // 等不到首屏消息也不能一走了之：长会话首屏可能超过等待上限，直接放弃会让
      // 轨道在这一整个页面生命周期里都不出现（旧版就是这样"消失"的）。
      // 超过上限后换成慢速轮询，直到消息挂出来为止。
      if (navWaitTries++ < NAV_WAIT_MOUNT_MAX) scheduleNavRender(600, force);
      else if (!navRenderTimer) scheduleNavRender(4000, force);
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
      // 接口层已经按 Retry-After 等过了，这里只负责把轨道重排到退避结束之后。
      if (e && e.status === 429) {
        navBackoffMs = Math.min(navBackoffMs ? navBackoffMs * 2 : NAV_429_BACKOFF, NAV_429_BACKOFF_MAX);
        navBackoffUntil = Date.now() + navBackoffMs;
      } else {
        navBackoffMs = 0;
      }
      // 先收起轨道（别在半成品状态露出几个节点），但要排一次重试：
      // 旧版在这里直接隐藏就再也不管了，任何一次失败都会让轨道在本页彻底消失。
      navRailEl.style.display = 'none';
      scheduleNavRender(navBackoffUntil ? navBackoffUntil - Date.now() + 500 : 5000, true);
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
    navBackoffMs = 0;
    navBackoffUntil = 0;   // 换会话是新的开始，别把上一轮吃到的退避带过来
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
    const els = mountedUserTurns();
    for (let i = els.length - 1; i >= 0; i--) {   // 新消息挂在末尾，倒着扫最快命中
      if (navIdxById[getTurnKey(els[i])] === undefined) {
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
   * 项目条：项目内对话页的上下文带
   * ------------------------------------------------------------
   * 项目内的对话页 URL 是 /g/{项目id}/c/{对话id}，但原生界面除了一个小面包屑
   * 之外看不出"这条对话属于哪个项目"，也没有项目内切换对话的入口 —— 项目因此
   * 退化成一个筛选标签，而不是一个可沉浸的空间。
   *
   * 这里在原生 header 下方补一条常驻项目条：
   *   [🦀 项目名 · N个对话] [当前对话标题] [‹ ›] [展开列表]
   * 项目名点击回项目页（一级），‹/› 与展开列表用于项目内切换（二级内的横向移动）。
   * 于是层级变成 项目 > 对话 > 回合，与已有的回合轨道自然衔接。
   * ========================================================== */

  // 项目 id：URL 里 /g/g-p-xxx/… 中的那一段。后面可能跟可读 slug，只取 id 本身。
  // id 是 32 位十六进制（如 g-p-6ac99c86d0688191911f14e1a42723bd），
  // 之后站点会拼可读 slug（如 -pang-xie-de-ke-ti）——[0-9a-f]+ 贪婪匹配
  // 正好在 slug 的第一个非十六进制字符处停下，天然只吃 id 段。
  function getProjectId() {
    const m = location.pathname.match(/\/g\/(g-p-[0-9a-f]+)/);
    return m ? m[1] : null;
  }

  const PPROJ_CACHE_MS = 60 * 1000;
  let pbarEl = null;
  let pbarMenuEl = null;
  let pbarProject = null;     // { id, name }
  let pbarConvs = [];         // [{ id, title, updated }]
  let pbarFetchedAt = 0;
  let pbarForProject = null;  // 上述数据属于哪个项目，换项目要作废
  let pbarRenderedConv = null; // 上一次渲染时的对话 id，用来避免每秒重画
  let pbarRenderedGen = false; // 上一次渲染时是否在生成中（变化时才重画）
  let pbarRenderedGenSet = ''; // 上次菜单渲染时"生成中的会话 id 集合"（跨会话加载环用）

  // 建元素的小助手：项目条节点较多，逐个 createElement + className 太啰嗦
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function pbarIcon(path) {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"' +
      ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }
  const PBAR_ICON = {
    prev: pbarIcon('<path d="M15 5l-7 7 7 7"/>'),
    next: pbarIcon('<path d="M9 5l7 7-7 7"/>'),
    chevron: pbarIcon('<path d="M6 9l6 6 6-6"/>')
  };

  // 相对时间，跟项目条上的粒度（今天 / 昨天 / N天前 / 日期）
  function pbarWhen(iso) {
    const t = Date.parse(iso || '');
    if (!t) return '';
    const d = new Date(t);
    const now = new Date();
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(d, now)) return '今天';
    const y = new Date(now.getTime() - 86400000);
    if (sameDay(d, y)) return '昨天';
    const days = Math.floor((now - d) / 86400000);
    if (days < 7) return days + ' 天前';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  // 取项目信息 + 本项目全部对话。项目接口一次给全，不需要按对话逐个拉。
  // limit 上限实测为 50（超过返回 422），所以按 50 分页取完。
  async function pbarLoad(projectId) {
    const tok = await API.getToken();
    const all = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total && offset < 500) {   // 500 只是防呆上限
      const r = await fetch('/backend-api/gizmos/' + projectId
        + '/conversations?offset=' + offset + '&limit=50',
        { headers: { Authorization: 'Bearer ' + tok }, credentials: 'include' });
      if (!r.ok) throw new Error('项目对话获取失败 ' + r.status);
      const j = await r.json();
      const items = j.items || [];
      total = j.total != null ? j.total : all.length + items.length;
      for (const c of items) all.push(c);
      if (!items.length) break;
      offset += 50;
    }

    let name = null;
    try {
      name = await API.getGizmoName(projectId);
    } catch (e) { /* 名字拿不到就退回"项目" */ }

    const convs = all.map((c) => ({
      id: c.id,
      title: c.title || '未命名对话',
      updated: c.update_time || c.create_time || null
    }));

    // 把结果顺手喂给「侧栏文件夹」模块，避免它再单独发一次同样的请求
    // （同一个接口请求两次既慢又更容易被 Cloudflare 限流）。
    try {
      if (typeof folderAbsorbProjectConvs === 'function') {
        folderAbsorbProjectConvs(projectId, convs);
      }
    } catch (e) { /* 文件夹模块未启用时忽略 */ }

    return {
      project: { id: projectId, name: name || '项目' },
      convs
    };
  }

  function pbarHref(convId) {
    return '/g/' + pbarProject.id + '/c/' + convId;
  }

  function pbarCurrentConvId() {
    return getConvId();
  }

  // 当前会话是否正在生成回复。
  // 判据：Composer 右下角的"停止生成"按钮（aria-label 停止流式输出/Stop streaming）
  // 在生成期间才存在，生成结束立即消失。同时检查是否被禁用（某些中间态会禁用）。
  // 找不到任何判据时视为不在生成 —— 误报会让加载环常转不消。
  function pbarGenerating() {
    const stops = document.querySelectorAll(
      'button[aria-label="停止流式输出"], button[aria-label*="停止"],'
      + ' button[aria-label="Stop streaming"], button[aria-label*="Stop"],'
      + ' button[data-testid="stop-button"]');
    for (const b of stops) {
      if (!b.disabled && b.offsetParent !== null) return true;
    }
    return false;
  }

  // —— 项目内其他会话的生成状态 ——
  //
  // DOM 只能反映"当前打开的会话"（停止按钮在 Composer 里）。其他会话在
  // 浏览器里没有对应的 DOM，只能问后端：ChatGPT 自己刷新页面恢复生成
  // 跟踪用的就是这个端点 ——
  //   GET /backend-api/conversation/{id}/stream_status
  // 返回 { is_streaming: true/false }（或 IS_STREAMING/NOT_STREAMING 字样）。
  // 注意 NOT_STREAMING 只表示"此刻没有流"，不区分"完成"和"已停止"，
  // 对加载环这个用途刚好够。
  //
  // 成本控制：只查"菜单开着时可见的那几条"，不做全项目扫描。轮询节流：
  // 每 4 秒一批、单条间隔 300ms、走全局限流通道（429 退避 + Retry-After）。
  const PGEN_POLL_MS = 4000;
  const PGEN_BATCH_GAP_MS = 300;
  const pgenState = new Map();   // convId -> bool（最后已知状态）
  let pgenLastPoll = 0;
  let pgenPolling = false;

  function pgenIsGenerating(convId) {
    // 当前打开的会话以 DOM 为准（实时、准确）；其余会话用轮询缓存
    if (convId === pbarCurrentConvId()) return pbarGenerating();
    return pgenState.get(convId) === true;
  }

  // 菜单打开时才轮询：要查询的 id 列表由调用方传入（当前可见条目）
  async function pgenPoll(ids) {
    if (pgenPolling) return;
    const now = Date.now();
    if (now - pgenLastPoll < PGEN_POLL_MS) return;
    pgenLastPoll = now;
    pgenPolling = true;
    try {
      const tok = await API.getToken();
      for (const id of ids) {
        if (id === pbarCurrentConvId()) continue;   // 当前会话走 DOM，不浪费请求
        // 静默期（429 退避）内直接放弃本轮，下轮再看
        if (apiBackoffUntil > Date.now()) break;
        try {
          const r = await fetch('/backend-api/conversation/' + id + '/stream_status',
            { headers: { Authorization: 'Bearer ' + tok }, credentials: 'include' });
          if (r.status === 429) { noteRateLimit(r); break; }
          if (!r.ok) { pgenState.delete(id); continue; }
          const j = await r.json();
          // 实测（2026-10，内置浏览器抓包）：空闲会话返回 {"status":"COMPLETE"}。
          // 社区逆向记录里还有 IS_STREAMING/NOT_STREAMING 字样、is_streaming 布尔
          // 字段的形态，全部兼容：状态值明确落在"生成中集合"才算 true，
          // 其余（COMPLETE/NOT_STREAMING/未知）一律视为不在生成 —— 宁可漏显
          // 加载环，也不能常转不消。
          const v = String(j.is_streaming === true ? 'IS_STREAMING'
            : (j.status || j.stream_status || '')).toUpperCase();
          const on = v === 'IS_STREAMING' || v === 'IN_PROGRESS' || v === 'STREAMING'
            || v === 'INPROGRESS' || v === 'RUNNING';
          pgenState.set(id, on);
        } catch (e) { /* 单条失败不影响其余 */ }
        await new Promise((res) => setTimeout(res, PGEN_BATCH_GAP_MS));
      }
    } catch (e) { /* token 拿不到就整轮放弃 */ }
    finally { pgenPolling = false; }
  }

  // 生成中的环形加载动画（14px 圆环，描边缺口旋转）。用 currentColor 取色，
  // 尺寸由使用处的 CSS 决定（列表条目 14px，顶栏会话名 12px）。
  function pbarGenSpinner() {
    const s = el('span', 'craber-pbar-gen');
    s.title = '生成中…';
    s.setAttribute('role', 'status');
    s.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true">'
      + '<circle cx="8" cy="8" r="7"></circle></svg>';
    return s;
  }

  function pbarRenderMenu() {
    if (!pbarMenuEl) return;
    const cur = pbarCurrentConvId();
    pbarMenuEl.textContent = '';
    const hd = el('div', 'craber-pbar-menu-hd');
    hd.textContent = pbarProject.name + ' · ' + pbarConvs.length + ' 个对话';
    pbarMenuEl.append(hd);
    // 菜单展开的这一刻顺路发起一轮其他会话的生成状态轮询（节流在 pgenPoll 内部）
    pgenPoll(pbarConvs.map((c) => c.id));
    pbarConvs.forEach((c) => {
      const b = el('button', 'craber-pbar-item');
      b.type = 'button';
      if (c.id === cur) b.classList.add('current');
      b.append(el('span', 'craber-pbar-item-t', c.title));
      // 生成中的条目日期位换成环形加载动画：当前会话走 DOM 检测，
      // 其他会话走 stream_status 轮询缓存（菜单开着才轮询，每 4 秒一轮）
      if (pgenIsGenerating(c.id)) {
        b.append(pbarGenSpinner());
      } else {
        b.append(el('span', 'craber-pbar-item-d', pbarWhen(c.updated)));
      }
      // 走原生链接点击，ChatGPT 的 router 接管，不整页刷新
      b.addEventListener('click', () => {
        pbarCloseMenu();
        pbarNavigate(c.id);
      });
      pbarMenuEl.append(b);
    });
  }

  // 用原生 <a> 的语义做跳转：造一个锚点并触发 click，让页面自身的路由处理。
  // 直接改 location 会整页刷新，丢失会话状态、也更慢。
  function pbarNavigate(convId) {
    const a = document.createElement('a');
    a.href = pbarHref(convId);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
  }

  // 展开状态同步到会话名按钮的 aria-expanded，箭头据此翻转（见 CSS）。
  // 浮层开合动画的公共件。
  //
  // 之前的做法是「display:none + 一次性 keyframes」：开有动画、关是瞬灭，观感生硬；
  // 且开合互斥靠 display 切换，关掉后紧接着开（快速连点）会因为 display 尚未生效
  // 量不到尺寸。现在改为 opacity/transform 过渡：关 = 先加 closing 类把反向过渡
  // 播完（120ms）再真正隐藏，期间元素保持可见但不可交互（pointer-events:none）。
  // 快速连点时直接重置类名重新进开场——重新触发的开场比残影更自然。
  //
  // 测量注意：关着的菜单常驻布局（opacity/visibility 隐藏，不是 display:none），
  // 所以 open 前后 getBoundingClientRect 都量得到真实尺寸，定位逻辑因此更稳。
  const MENU_OPEN_MS = 160;
  const MENU_CLOSE_MS = 120;

  function menuAnimateOpen(menu) {
    if (!menu) return;
    if (menu.__craberCloseTimer) { clearTimeout(menu.__craberCloseTimer); menu.__craberCloseTimer = null; }
    // 从"正在关"直接改开：先强制回放开场（去掉 closing、重加 open 前先脱离过渡态）
    menu.classList.remove('craber-closing');
    menu.classList.add('craber-open');
  }

  function menuAnimateClose(menu) {
    if (!menu || !menu.classList.contains('craber-open')) return;
    menu.classList.remove('craber-open');
    menu.classList.add('craber-closing');
    if (menu.__craberCloseTimer) clearTimeout(menu.__craberCloseTimer);
    menu.__craberCloseTimer = setTimeout(() => {
      menu.classList.remove('craber-closing');
      menu.__craberCloseTimer = null;
    }, MENU_CLOSE_MS);
  }

  function pbarSetExpanded(on) {
    const b = pbarEl && pbarEl.querySelector('.craber-pbar-title');
    if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
  }

  function pbarToggleMenu(anchor) {
    if (!pbarMenuEl) return;
    if (pbarMenuEl.classList.contains('craber-open')) { pbarCloseMenu(); return; }
    pbarRenderMenu();
    // 先量后开：关着的菜单也常驻布局，这里量到的就是真实宽度，不用等展开
    const r = anchor.getBoundingClientRect();
    const w = pbarMenuEl.getBoundingClientRect().width;
    pbarMenuEl.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    pbarMenuEl.style.top = (r.bottom + 6) + 'px';
    menuAnimateOpen(pbarMenuEl);
    pbarSetExpanded(true);
  }

  function pbarCloseMenu() {
    menuAnimateClose(pbarMenuEl);
    pbarSetExpanded(false);
  }

  function pbarRender() {
    if (!pbarEl) return;
    const cur = pbarCurrentConvId();
    const at = pbarConvs.findIndex((c) => c.id === cur);
    const curConv = at >= 0 ? pbarConvs[at] : null;

    pbarEl.textContent = '';

    // 会话名本身就是开关：用户本来就在读它，直接让它可点开本项目对话列表。
    // 项目名由原生面包屑承担，不重复；会话数只在展开列表的标题里出现。
    const t = el('button', 'craber-pbar-title');
    t.type = 'button';
    t.setAttribute('aria-haspopup', 'true');
    t.setAttribute('aria-expanded', 'false');
    const txt = el('span', 'craber-pbar-title-text',
      curConv ? curConv.title : '（不在本项目对话内）');
    if (curConv) t.title = curConv.title;
    const ico = el('span');
    ico.innerHTML = PBAR_ICON.chevron;
    ico.style.display = 'flex';
    t.append(txt, ico);
    // 当前对话正在生成回复时，会话名旁也挂一个加载环（比列表里的小一号）
    if (curConv && pbarGenerating()) t.append(pbarGenSpinner());
    t.addEventListener('click', (e) => {
      e.stopPropagation();
      pbarToggleMenu(t);
    });
    pbarEl.append(t);

    if (at >= 0 && pbarConvs.length > 1) {
      pbarEl.append(el('span', 'craber-pbar-pos', (at + 1) + '/' + pbarConvs.length));
    }
  }

  // 找项目条的宿主：原生顶栏里那个"吃掉剩余水平空间"的容器。
  //
  // 优先从面包屑往上找（最准），但面包屑并一定存在 —— 窗口偏窄时原生会把它
  // 整个隐藏（实测侧栏展开后 hasBreadcrumb=false），所以不能只依赖它，
  // 否则项目条会静默消失。没有面包屑时改为在顶栏内直接筛：
  // 挑一个 display:flex、flex-grow 生效、且在顶栏左半侧的容器 ——
  // 那正是面包屑原本待的位置，不会跑到右侧按钮组里去。
  function pbarHost() {
    // 路径一：面包屑在，从它往上找 flex:1 的祖先
    const bc = document.querySelector('nav[aria-label="面包屑导航"]');
    if (bc) {
      let e = bc.parentElement;
      for (let i = 0; i < 3 && e; i++) {
        const cs = getComputedStyle(e);
        if (cs.display === 'flex' && cs.flexDirection === 'row'
            && (parseFloat(cs.flexGrow) || 0) >= 1) return e;
        e = e.parentElement;
      }
      if (bc.parentElement) return bc.parentElement;
    }

    // 路径二：面包屑不在（被原生隐藏），在顶栏里自己筛
    const hdr = document.querySelector('header');
    if (!hdr) return null;
    const vw = window.innerWidth;
    const cands = [];
    hdr.querySelectorAll('div').forEach((d) => {
      const cs = getComputedStyle(d);
      if (cs.display !== 'flex' || cs.flexDirection !== 'row') return;
      if ((parseFloat(cs.flexGrow) || 0) < 1) return;      // 只认可伸缩的
      const r = d.getBoundingClientRect();
      if (r.width < 120 || r.height < 24) return;
      if (r.left > vw * 0.6) return;                        // 排除右侧按钮组
      // 不能是已经装了我们的节点的容器
      if (d.querySelector('.craber-pbar')) return;
      cands.push({ el: d, w: r.width });
    });
    if (!cands.length) return null;
    // 取最宽的那个（就是原来放面包屑的空间）
    cands.sort((a, b) => b.w - a.w);
    return cands[0].el;
  }

  // 项目条不再自己定位 —— 它作为顶栏容器的子元素参与原生 flex 排布，
  // 因此不需要任何 fixed 定位，也就不存在遮挡/重叠。
  function pbarPlace() {
    if (!pbarEl) return 0;
    const host = pbarHost();
    if (!host) return 0;
    // 宿主被 React 重建过（引用失效）时重新挂回去
    if (pbarEl.parentElement !== host) host.appendChild(pbarEl);
    return 0;
  }

  function pbarMount() {
    const host = pbarHost();
    if (!host) return false;
    if (pbarEl && pbarEl.parentElement === host) return true;

    if (!pbarEl) {
      pbarEl = el('div', 'craber-pbar');
      pbarEl.setAttribute('role', 'navigation');
      pbarEl.setAttribute('aria-label', '项目内对话导航');
    }
    host.appendChild(pbarEl);

    if (!pbarMenuEl) {
      pbarMenuEl = el('div', 'craber-pbar-menu');
      document.body.appendChild(pbarMenuEl);
    }

    // 点空白处收起菜单。必须放过"项目条自身"的点击 —— 这段用捕获阶段，
    // 早于按钮自己的 click 处理函数；若不排除，点按钮会先被关掉、按钮
    // 又当成"已收起"重新展开，于是再点一次永远关不上。
    if (!pbarMount.__bound) {
      pbarMount.__bound = true;
      document.addEventListener('click', (e) => {
        if (!pbarMenuEl || !pbarMenuEl.classList.contains('craber-open')) return;
        if (pbarMenuEl.contains(e.target)) return;
        if (pbarEl && pbarEl.contains(e.target)) return;
        pbarCloseMenu();
      }, true);
    }
    return true;
  }

  function pbarUnmount() {
    if (pbarEl) { pbarEl.remove(); pbarEl = null; }
    if (pbarMenuEl) { pbarMenuEl.remove(); pbarMenuEl = null; }
    pbarRenderedConv = null;
    pbarRenderedGen = false;
    pbarRenderedGenSet = '';
  }

  // 主循环：判断当前是否在项目内对话页，是则显示并保证数据最新。
  async function pbarTick() {
    // 开关关掉：撤下项目条，也不再去拉项目接口
    if (!uiPrefs.projectUI) {
      if (pbarEl) pbarUnmount();
      pbarForProject = null;
      return;
    }
    const projectId = getProjectId();
    // 不在项目里（普通对话页 / 首页）就把条收掉
    if (!projectId || !getConvId()) {
      if (pbarEl) pbarUnmount();
      pbarForProject = null;
      return;
    }

    const stale = Date.now() - pbarFetchedAt > PPROJ_CACHE_MS;
    const switched = pbarForProject !== projectId;
    if (!stale && !switched && pbarEl) {
      pbarPlace();
      // 当前对话变了才重画。tick 每秒跑一次，若无条件重建整条 DOM，
      // 展开中的列表会被每秒销毁一次（表现为菜单刚点开就消失、点不动）。
      const curId = pbarCurrentConvId();
      // 生成中状态变化也要重画：加载环要在生成开始时出现、结束时消失。
      // 状态没变的秒数里什么都不做，展开中的列表不会被打断。
      const gen = pbarGenerating();
      if (curId !== pbarRenderedConv || gen !== pbarRenderedGen) {
        pbarRenderedConv = curId;
        pbarRenderedGen = gen;
        pbarRender();
        if (pbarMenuEl && pbarMenuEl.classList.contains('craber-open')) pbarRenderMenu();
      } else if (pbarMenuEl && pbarMenuEl.classList.contains('craber-open')) {
        // 菜单开着时持续轮询其他会话的 stream_status（pgenPoll 内部有 4s 节流），
        // 且仅当状态缓存真的有变化时才重画列表——否则又是每秒销毁一次的老坑。
        pgenPoll(pbarConvs.map((c) => c.id)).then(() => {
          if (!pbarMenuEl || !pbarMenuEl.classList.contains('craber-open')) return;
          // 重画条件：任一缓存条目与当前菜单显示不一致。菜单条目里生成中的
          // 会带 .craber-pbar-gen，用"生成中集合"是否变化来判。
          const genSet = pbarConvs.filter((c) => pgenIsGenerating(c.id))
            .map((c) => c.id).join(',');
          if (genSet !== pbarRenderedGenSet) {
            pbarRenderedGenSet = genSet;
            pbarRenderMenu();
          }
        });
      }
      return;
    }

    try {
      // 切项目时先清掉旧数据，免得一闪而过显示上一个项目的信息
      if (switched) { pbarForProject = projectId; pbarConvs = []; pbarProject = null; }
      const data = await pbarLoad(projectId);
      if (getProjectId() !== projectId) return;   // 加载期间又切走了
      pbarProject = data.project;
      pbarConvs = data.convs;
      pbarFetchedAt = Date.now();
      pbarMount();
      pbarPlace();
      pbarRenderedConv = pbarCurrentConvId();
      pbarRender();
    } catch (e) {
      console.warn('[gpt-craber] 项目条加载失败', e);
    }
  }


  /* ============================================================
   * 侧栏文件夹
   * ==========================================================
   * ChatGPT 原生侧栏只有「项目 / 最近」两个区块：不进项目的会话全挤在「最近」
   * 一条长列表里，项目本身也不能再分组。这里在原生「项目」区块下方补一个
   * 文件夹区块，把项目与会话按自己的分类放进去。
   *
   * 为什么不复用原生「项目」：原生项目是后端实体（会话只能属于一个 gizmo），
   * 建项目要打后端接口，还会把会话真的搬过去。文件夹只是本地视图分组 ——
   * 会话在原生列表里的位置、打开方式、URL 全都不变，文件夹只是多一个入口。
   *
   * 数据存 localStorage（键 'gpt_craber_folders'）。一个条目可以同时放进
   * 多个文件夹：用户常按"课题 / 阶段"两个维度看同一批对话，强行一对一反而
   * 逼人先决定删哪边。项目记作 'proj:g-p-xxx'，会话记裸 id。
   */

  /* ---------- WebDAV 同步 ----------
   * 文件夹数据存在 localStorage，换设备就看不到。
   * 这里用 WebDAV 把它同步到用户自己的网盘（坚果云 / Nextcloud / 群晖等）。
   *
   * 设计要点：
   * - 凭证只存在本地 localStorage，不上传到任何第三方
   * - 冲突按 updatedAt 判断，较新的覆盖较旧的
   * - 同步是"整份覆盖"，不做字段级合并：文件夹结构不大，
   *   合并规则反而容易产生难解释的结果
   */
  const DAV_KEY = 'gpt_craber_webdav';
  // 旧版公共文件名：仅在没有账号名时使用（保证老用户仍读得到自己的数据）
  const DAV_REMOTE_NAME = 'craber-folders.json';

  /* 远端文件名：craber-folders.<账号>.json
   * 同一个 WebDAV 被多个账号用时，不分开会互相覆盖文件夹结构。
   * 用点分隔而不是 @：@ 在 URL 里要编成 %40，部分 WebDAV 后端处理不一致。
   */
  function davRemoteName() {
    const who = craberAccountKey();
    return who ? 'craber-folders.' + who + '.json' : DAV_REMOTE_NAME;
  }

  function davLoad() {
    try {
      const j = JSON.parse(localStorage.getItem(DAV_KEY) || 'null');
      if (!j || typeof j !== 'object') return { url: '', user: '', pass: '', auto: false, lastSync: 0 };
      return {
        url: String(j.url || ''),
        user: String(j.user || ''),
        pass: String(j.pass || ''),
        auto: !!j.auto,
        lastSync: Number(j.lastSync) || 0
      };
    } catch (e) {
      return { url: '', user: '', pass: '', auto: false, lastSync: 0 };
    }
  }

  function davSave(cfg) {
    try { localStorage.setItem(DAV_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  // 统一的 WebDAV 请求（用 GM_xmlhttpRequest 绕开 CORS）
  // opts.cfg：显式传入的配置（配置对话框里"测试连接"要用当前输入值，
  // 不能读已保存的 —— 那时用户还没点保存）。
  function davRequest(method, url, opts) {
    opts = opts || {};
    return new Promise((resolve, reject) => {
      const headers = Object.assign({}, opts.headers || {});
      const cfg = opts.cfg || davLoad();
      if (cfg.user || cfg.pass) {
        headers.Authorization = 'Basic ' + btoa(unescape(encodeURIComponent(cfg.user + ':' + cfg.pass)));
      }
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest 不可用'));
        return;
      }
      GM_xmlhttpRequest({
        method,
        url,
        headers,
        data: opts.body,
        timeout: 20000,
        onload: (r) => resolve({ status: r.status, text: r.responseText }),
        onerror: () => reject(new Error('网络错误')),
        ontimeout: () => reject(new Error('请求超时'))
      });
    });
  }

  function davBaseUrl(cfg) {
    let u = String(cfg.url || '').trim();
    if (!u) return '';
    if (u.charAt(u.length - 1) !== '/') u += '/';
    return u;
  }

  // 把当前文件夹数据上传到 WebDAV
  async function davPush(cfg) {
    const base = davBaseUrl(cfg);
    if (!base) throw new Error('未配置 WebDAV 地址');
    // 覆盖前先在本地留一份快照：万一合并逻辑出问题，还能找回上一次的样子
    try {
      const key = folderStoreKey();
      const old = localStorage.getItem(key);
      if (old) localStorage.setItem(key + '_bak', old);
    } catch (e) {}
    const payload = JSON.stringify({
      ver: 1,
      // 用本地数据的真实修改时间，而不是"此刻" ——
      // 否则每次上传都会把时间戳推到现在，另一台设备就永远判不出谁更新
      updatedAt: Number(folderDataUpdatedAt) || Date.now(),
      folders: folderData && folderData.folders ? folderData.folders : [],
      projNames: (folderData && folderData.projNames) || {},
      tombstones: (folderData && folderData.tombstones) || {}
    }, null, 2);

    // 先保证目录在：AList 等服务不会因为 PUT 到深层路径就自动建目录。
    // 目录已存在时 MKCOL 返回 405，davEnsureDir 内部会忽略。
    await davEnsureDir(cfg);

    const r = await davRequest('PUT', base + davRemoteName(), {
      cfg: cfg,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: payload
    });
    if (r.status < 200 || r.status >= 300) {
      throw new Error('上传失败 HTTP ' + r.status
        + (r.status === 401 ? '（用户名或密码不对）' : '')
        + (r.status === 404 ? '（目录不存在）' : '')
        + (r.status === 405 ? '（该地址不接受 PUT）' : ''));
    }
    return { at: Date.now() };
  }

  // 按"文件夹名"合并两边的文件夹列表。
  //
  // 规则：
  //   同名文件夹      → 合并 items（并集去重），保留本地 id/open
  //   只有一边有      → 直接保留（不会因为另一边没它就删掉）
  //
  // 这样两台设备各建各的文件夹时互不覆盖。
  // 已知限制：删除文件夹不会跨设备传播（需要墓碑机制才能做到，
  // 见后续可选的升级方案）。
  function davMergeFolders(localList, remoteList, tombMerged) {
    const out = [];
    const byName = new Map();
    const tombs = tombMerged || folderData.tombstones || {};

    const norm = (n) => String(n || '').trim();
    // 某文件夹是否已被删除（有墓碑）
    const folderDead = (nm) => Number(tombs[folderTombKeyFolder(nm)]) > 0;
    // 某条目是否已从某文件夹移除（有墓碑）
    const itemDead = (nm, key) => Number(tombs[folderTombKeyItem(nm, key)]) > 0;

    // 先放入本地（保持本地顺序），跳过已删除的文件夹与已移除的条目
    for (const f of localList || []) {
      if (!f || typeof f.id !== 'string') continue;
      const nm = norm(f.name) || '未命名';
      if (folderDead(nm)) continue;
      const srcItems = Array.isArray(f.items) ? f.items : [];
      const item = {
        id: f.id,                       // 保留本地 id：菜单、展开状态都靠它
        name: nm,
        open: f.open !== false,
        items: srcItems.filter((k) => typeof k === 'string' && !itemDead(nm, k))
      };
      out.push(item);
      if (!byName.has(nm)) byName.set(nm, item);
    }

    // 再把远端独有的并进来 / 同名的合并 items
    for (const f of remoteList || []) {
      if (!f || typeof f.id !== 'string') continue;
      const nm = norm(f.name) || '未命名';
      if (folderDead(nm)) continue;             // 已被删除
      const items = (Array.isArray(f.items) ? f.items : [])
        .filter((k) => typeof k === 'string' && !itemDead(nm, k));
      const hit = byName.get(nm);
      if (hit) {
        // 同名：并集，保持本地已有顺序
        for (const k of items) {
          if (hit.items.indexOf(k) < 0) hit.items.push(k);
        }
      } else {
        const item = {
          id: f.id || folderUid(),
          name: nm,
          open: f.open !== false,
          items: items.slice()
        };
        out.push(item);
        byName.set(nm, item);
      }
    }
    return out;
  }

  // 合并两侧墓碑：同一个键取较新的时间戳
  function davMergeTombstones(localT, remoteT) {
    const out = Object.assign(Object.create(null), localT || {});
    const r = remoteT && typeof remoteT === 'object' ? remoteT : {};
    for (const k of Object.keys(r)) {
      const a = Number(out[k]) || 0;
      const b = Number(r[k]) || 0;
      if (b > a) out[k] = b;
    }
    return out;
  }

  // 把远端数据落到本地
  function davApplyRemote(remote) {
    if (!remote || !Array.isArray(remote.folders)) return false;
    folderData = {
      ver: 1,
      folders: remote.folders.filter((f) => f && typeof f.id === 'string'),
      projNames: remote.projNames && typeof remote.projNames === 'object' ? remote.projNames : {},
      tombstones: (remote.tombstones && typeof remote.tombstones === 'object') ? remote.tombstones : {}
    };
    folderDataOwner = craberAccountKey();
    saveFolders();
    folderRenderedSig = '';
    renderFolders();
    return true;
  }

  /* ---------- 同步记录 ----------
   * 每次同步留一条：时间、结果、动作、概要。
   * 只留最近 20 条，存 localStorage —— 记录是给人看的，不是审计，
   * 无限增长没有意义。
   */
  const DAV_LOG_KEY = 'gpt_craber_webdav_log';
  const DAV_LOG_MAX = 20;

  function davLogLoad() {
    try {
      const j = JSON.parse(localStorage.getItem(DAV_LOG_KEY) || '[]');
      return Array.isArray(j) ? j : [];
    } catch (e) { return []; }
  }

  function davLogPush(entry) {
    try {
      const list = davLogLoad();
      list.unshift(Object.assign({ at: Date.now() }, entry));
      localStorage.setItem(DAV_LOG_KEY, JSON.stringify(list.slice(0, DAV_LOG_MAX)));
    } catch (e) {}
  }

  function davLogClear() {
    try { localStorage.removeItem(DAV_LOG_KEY); } catch (e) {}
  }

  // 对比前后两份数据，算出增减数量。
  // 分两组：文件夹本身的增删，以及文件夹内条目的增删。
  function davDiff(beforeList, afterList) {
    const keyOf = (list) => {
      const m = new Map();
      for (const f of list || []) {
        if (!f || typeof f.name !== 'string') continue;
        m.set(f.name.trim(), Array.isArray(f.items) ? f.items : []);
      }
      return m;
    };
    const A = keyOf(beforeList);
    const B = keyOf(afterList);

    let folderAdd = 0, folderDel = 0;
    for (const k of B.keys()) if (!A.has(k)) folderAdd++;
    for (const k of A.keys()) if (!B.has(k)) folderDel++;

    // 条目按 名称 + 条目key 对比
    let itemAdd = 0, itemDel = 0;
    const flat = (m) => {
      const s = new Set();
      for (const [name, items] of m) for (const k of items) s.add(name + '\u0000' + k);
      return s;
    };
    const FA = flat(A), FB = flat(B);
    for (const x of FB) if (!FA.has(x)) itemAdd++;
    for (const x of FA) if (!FB.has(x)) itemDel++;

    return { folderAdd, folderDel, itemAdd, itemDel };
  }

  // 把变更量渲染成 "+2 -1" 这样的紧凑文本；没有变化时返回空串
  function davDiffText(d) {
    if (!d) return '';
    const parts = [];
    if (d.folderAdd) parts.push('+' + d.folderAdd + ' 文件夹');
    if (d.folderDel) parts.push('-' + d.folderDel + ' 文件夹');
    if (d.itemAdd) parts.push('+' + d.itemAdd + ' 条目');
    if (d.itemDel) parts.push('-' + d.itemDel + ' 条目');
    return parts.join('  ');
  }

  /* ---------- 会话自动备份 ----------
   * 把当前账号的会话导出成 zip，直接传到 WebDAV，不经过浏览器下载。
   *
   * 设计：
   * - 只备份"自上次备份以来有更新"的会话，靠 update_time 判断
   * - 远端按 <目录>/<ChatGPT 用户名>/YYYY-MM-DD/ 分目录：
   *   同一台 WebDAV 上多个账号各自一份，互不覆盖，也便于回溯
   * - 全量备份时上限可配，避免一次拉几百个会话被限流
   */
  /* 当前 ChatGPT 账号
   * 备份按用户名分目录：同一个 WebDAV 上可能存着多个账号的备份，
   * 混在一起既分不清归属，增量记录也会互相干扰。
   * 名字来源：/api/auth/session 的 user.name / user.email；
   * 该接口偶尔不带 user，退回 /backend-api/me。
   * 结果落 localStorage：页面首屏就能显示，不必等请求。
   */
  const ACCOUNT_KEY = 'gpt_craber_account';
  let acctPromise = null;

  function craberAccountLoad() {
    try {
      const j = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
      return (j && typeof j === 'object') ? j : null;
    } catch (e) { return null; }
  }

  function craberAccountSave(a) {
    try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a)); } catch (e) {}
  }

  // force = true 时忽略缓存重新识别（账号切换后用）
  function craberAccountInfo(force) {
    const cached = craberAccountLoad();
    if (!force && cached && cached.name) return Promise.resolve(cached);
    if (acctPromise) return acctPromise;

    acctPromise = (async () => {
      let u = null;
      try {
        const r = await fetch('/api/auth/session', { credentials: 'include' });
        if (r.ok) {
          const j = await r.json();
          u = (j && j.user) || null;
        }
      } catch (e) { /* 网络失败走下面的兜底 */ }

      if (!u || (!u.name && !u.email)) {
        try {
          const me = await craberApi('/backend-api/me');
          if (me) u = me;
        } catch (e) { /* 拿不到就留空：界面会提示，备份仍可用本地记录的名称 */ }
      }

      const info = {
        name: String((u && (u.name || u.email)) || '').trim(),
        email: String((u && u.email) || ''),
        id: String((u && u.id) || ''),
        at: Date.now()
      };
      if (info.name) craberAccountSave(info);
      return info;
    })().finally(() => { acctPromise = null; });

    return acctPromise;
  }

  // 远端目录名：去掉路径分隔符与 WebDAV 不接受的字符。
  // 中文与空格保留（URL 那层会百分号编码），首尾点会让部分服务拒绝。
  function sanitizeRemoteSeg(s) {
    let t = String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-');
    t = t.replace(/\s+/g, ' ').trim();
    t = t.replace(/^\.+|\.+$/g, '').trim();
    if (t.length > 48) t = t.slice(0, 48).trim();
    return t;
  }

  const DAV_BACKUP_CFG_KEY = 'gpt_craber_backup_cfg';
  const DAV_BACKUP_STATE_KEY = 'gpt_craber_backup_state';

  // 范围不再用互斥的 scope 开关：两组都空 = 备份全部；
  // 任一非空 = 备份「所选项目下的会话 ∪ 所选会话」。
  const DAV_BACKUP_DEFAULT = {
    enabled: false, dir: 'craber-backup', mode: 'incremental', max: 50, lastRun: 0,
    // account：远端按「用户名」分目录，这里记住识别到的名字（留空则回退到匿名目录）
    account: '', scopeProjects: [], scopeConvs: []
  };

  function davBackupCfgLoad() {
    try {
      const j = JSON.parse(localStorage.getItem(DAV_BACKUP_CFG_KEY) || 'null');
      if (!j || typeof j !== 'object') return Object.assign({}, DAV_BACKUP_DEFAULT);
      return {
        enabled: !!j.enabled,
        dir: String(j.dir || 'craber-backup'),
        mode: j.mode === 'full' ? 'full' : 'incremental',
        max: Math.max(1, Math.min(500, Number(j.max) || 50)),
        lastRun: Number(j.lastRun) || 0,
        account: String(j.account || ''),
        scopeProjects: Array.isArray(j.scopeProjects)
          ? j.scopeProjects.filter((x) => typeof x === 'string') : [],
        scopeConvs: Array.isArray(j.scopeConvs)
          ? j.scopeConvs.filter((x) => typeof x === 'string') : []
      };
    } catch (e) {
      return Object.assign({}, DAV_BACKUP_DEFAULT);
    }
  }

  function davBackupCfgSave(c) {
    try { localStorage.setItem(DAV_BACKUP_CFG_KEY, JSON.stringify(c)); } catch (e) {}
  }

  // 已备份记录：convId -> update_time。
  // 带 account 字段：切换账号时整份重来，否则"本月已备份 N 个"会把两个账号混着数。
  function davBackupStateLoad() {
    try {
      const j = JSON.parse(localStorage.getItem(DAV_BACKUP_STATE_KEY) || 'null');
      if (!j || typeof j !== 'object') return { done: {}, lastRun: 0, account: '' };
      return {
        done: (j.done && typeof j.done === 'object') ? j.done : {},
        lastRun: Number(j.lastRun) || 0,
        account: String(j.account || '')
      };
    } catch (e) { return { done: {}, lastRun: 0, account: '' }; }
  }
  function davBackupStateSave(s) {
    try { localStorage.setItem(DAV_BACKUP_STATE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // 本地日期串 YYYY-MM-DD，用于远端分目录
  function davDateStr(d) {
    const t = d || new Date();
    const p = (n) => String(n).padStart(2, '0');
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
  }

  // 备份目录：<用户配的 dir>/<用户名>/<YYYY-MM-DD>/
  // 用户名缺失时调用方会先报错，这里只用 shared 兜底（老配置直接读目录时）。
  function davBackupDirUrl(cfg, dateStr, accountName) {
    const base = davBaseUrl(cfg);
    const bcfg = davBackupCfgLoad();
    const sub = String(bcfg.dir || 'craber-backup').replace(/^\/+|\/+$/g, '');
    const who = sanitizeRemoteSeg(accountName || bcfg.account || '') || 'shared';
    return base + sub + '/' + encodeURIComponent(who) + '/' + dateStr + '/';
  }

  // 把 blob 上传到指定 URL
  async function davPutBlob(url, blob, cfg) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject(new Error('GM_xmlhttpRequest 不可用'));
        return;
      }
      const headers = {};
      if (cfg.user || cfg.pass) {
        headers.Authorization = 'Basic ' + btoa(unescape(encodeURIComponent(cfg.user + ':' + cfg.pass)));
      }
      headers['Content-Type'] = 'application/zip';
      GM_xmlhttpRequest({
        method: 'PUT',
        url,
        headers,
        data: blob,
        timeout: 120000,      // 备份包可能很大
        onload: (r) => resolve({ status: r.status }),
        onerror: () => reject(new Error('网络错误')),
        ontimeout: () => reject(new Error('上传超时'))
      });
    });
  }

  // 确保某个 URL 目录存在（逐级 MKCOL，允许 405）
  async function davEnsureUrlDir(url, cfg) {
    let u;
    try { u = new URL(url); } catch (e) { throw new Error('地址格式不对'); }
    const segs = u.pathname.split('/').filter(Boolean);
    let path = '';
    for (let i = 0; i < segs.length; i++) {
      // pathname 已经是编码过的：先解码再编码，否则 % 会被二次转义
      let seg = segs[i];
      try { seg = decodeURIComponent(seg); } catch (e) { /* 非法序列就按原样用 */ }
      path += '/' + encodeURIComponent(seg);
      if (!/\/$/.test(path)) {
        // 最后一段是目录，需要带尾斜杠
      }
      const r = await davRequest('MKCOL', u.origin + path + '/', { cfg: cfg });
      if (r.status === 201 || r.status === 405 || r.status === 200
        || r.status === 301 || r.status === 302 || r.status === 409) continue;
      if (r.status === 401) throw new Error('用户名或密码不对（HTTP 401）');
      if (r.status === 403) throw new Error('没有权限创建目录（HTTP 403）');
      throw new Error('创建目录失败 HTTP ' + r.status);
    }
  }

  /* 备份历史：每次备份留一条，供页面展示"备份过什么" */
  const DAV_BACKUP_LOG_KEY = 'gpt_craber_backup_log';
  const DAV_BACKUP_LOG_MAX = 30;

  function davBackupLogLoad() {
    try {
      const j = JSON.parse(localStorage.getItem(DAV_BACKUP_LOG_KEY) || '[]');
      return Array.isArray(j) ? j : [];
    } catch (e) { return []; }
  }

  function davBackupLogPush(entry) {
    try {
      const list = davBackupLogLoad();
      list.unshift(Object.assign({ at: Date.now() }, entry));
      localStorage.setItem(DAV_BACKUP_LOG_KEY, JSON.stringify(list.slice(0, DAV_BACKUP_LOG_MAX)));
    } catch (e) {}
  }

  function davBackupLogClear() {
    try { localStorage.removeItem(DAV_BACKUP_LOG_KEY); } catch (e) {}
  }

  // 执行一次备份
  async function davBackupRun(opts) {
    opts = opts || {};
    const cfg = davLoad();
    if (!cfg.url) throw new Error('还没配置 WebDAV');

    const bcfg = davBackupCfgLoad();
    let state = davBackupStateLoad();

    // 0. 先确认是哪个账号：远端目录按用户名分，多个账号互不覆盖
    if (opts.onProgress) opts.onProgress(0, 1, '识别账号…');
    let acct = { name: bcfg.account || '' };
    try {
      const info = await craberAccountInfo(true);
      if (info && info.name) acct = info;
    } catch (e) { /* 识别失败就用上次记住的名字 */ }
    const rawName = String(acct.name || bcfg.account || '').trim();
    const acctName = sanitizeRemoteSeg(rawName) || 'shared';
    if (!rawName || acctName === 'shared') {
      throw new Error('没能识别 ChatGPT 账号名，备份已暂停（请刷新页面后重试）');
    }
    if (bcfg.account !== acctName) {
      bcfg.account = acctName;
      davBackupCfgSave(bcfg);
    }
    // 换了账号：旧的"已备份"记录属于别的账号，不能拿来判断增量
    if (state.account && state.account !== acctName) {
      state = { done: {}, lastRun: 0, account: acctName };
      davBackupStateSave(state);
    }
    state.account = acctName;

    // 1. 拉会话列表
    if (opts.onProgress) opts.onProgress(0, 1, '读取会话列表…');
    const all = await fetchAllConversations((n, total) => {
      if (opts.onProgress) opts.onProgress(n, total, '读取会话列表 ' + n + '/' + (total || '…'));
    });

    // 2a. 按范围过滤。
    // 项目与会话是"取并集"的两个选择器，不是互斥模式：
    // 选 2 个项目 + 3 个会话 = 这 2 个项目下的所有会话 ∪ 这 3 个会话。
    const wantProjs = new Set(bcfg.scopeProjects || []);
    const wantConvs = new Set(bcfg.scopeConvs || []);
    // 项目名 → gizmo_id；缓存里没有的，等下从会话自带的 gizmo_id 反查
    const wantGids = new Set();
    for (const nm of wantProjs) {
      const gid = folderProjIdByName[nm];
      if (gid) wantGids.add(gid);
    }

    let pool = all;
    if (wantProjs.size || wantConvs.size) {
      pool = all.filter((c) => {
        if (!c) return false;
        // 明确选了会话：直接命中
        if (wantConvs.has(c.id)) return true;
        // 按项目命中：gizmo_id 匹配
        if (!wantProjs.size) return false;
        const gid = c.gizmo_id || (c.gizmo && c.gizmo.id);
        if (!gid) return false;
        if (wantGids.has(gid)) return true;
        // 名字还没建立映射时按名兜底
        if (folderProjNameFromKey && wantProjs.has(folderProjNameFromKey('proj:' + gid))) return true;
        return false;
      });
    }

    // 2b. 再按增量/全量筛选
    let targets;
    if (bcfg.mode === 'full') {
      targets = pool.slice();
    } else {
      targets = pool.filter((c) => {
        const id = c.id;
        if (!id) return false;
        const prev = state.done[id];
        const ts = Number(c.update_time) || 0;
        return prev == null || ts > prev;         // 没备过 或 更新过
      });
    }
    // 按上限截断（新会话优先）
    targets.sort((a, b) => (Number(b.update_time) || 0) - (Number(a.update_time) || 0));
    const limited = targets.slice(0, bcfg.max);

    if (!limited.length) {
      const hasScope = (bcfg.scopeProjects || []).length || (bcfg.scopeConvs || []).length;
      return {
        ok: true, skipped: true, count: 0, pending: 0,
        reason: hasScope ? '所选范围内没有待备份的会话' : '没有需要备份的会话'
      };
    }

    // 3. 构建 zip
    const metas = limited.map((c) => ({ id: c.id, title: c.title, gizmo_id: c.gizmo_id }));
    const built = await buildConversationsZip(metas, (done, total, note) => {
      if (opts.onProgress) opts.onProgress(done, total, note);
    }, { zipName: 'backup' });

    // 4. 上传
    const dateStr = davDateStr();
    const dirUrl = davBackupDirUrl(cfg, dateStr, acctName);
    if (opts.onProgress) opts.onProgress(1, 1, '创建远端目录…');
    await davEnsureUrlDir(dirUrl, cfg);

    const stamp = craberStamp();
    const fileName = 'backup_' + stamp + (bcfg.mode === 'full' ? '_full' : '') + '.zip';
    if (opts.onProgress) opts.onProgress(1, 1, '上传 ' + fileName + '…');
    const r = await davPutBlob(dirUrl + fileName, built.blob, cfg);
    if (r.status < 200 || r.status >= 300) {
      throw new Error('上传失败 HTTP ' + r.status);
    }

    // 5. 记录已备份
    for (const c of limited) {
      state.done[c.id] = Number(c.update_time) || Date.now();
    }
    state.lastRun = Date.now();
    davBackupStateSave(state);

    bcfg.lastRun = Date.now();
    davBackupCfgSave(bcfg);

    // 留一条历史：页面据此展示"备份过哪些、多少、多大"
    const bytes = built.blob && built.blob.size ? built.blob.size : 0;
    const relPath = [String(bcfg.dir || 'craber-backup').replace(/^\/+|\/+$/g, ''),
      acctName, dateStr].filter(Boolean).join('/');
    davBackupLogPush({
      ok: true,
      count: limited.length,
      failCount: built.failCount || 0,
      attFail: built.attFail || 0,
      attTotal: built.attTotal || 0,
      bytes: bytes,
      file: fileName,
      mode: bcfg.mode,
      account: acctName,
      path: relPath
    });

    // 还有多少没备（被上限截断的部分）
    const pending = Math.max(0, targets.length - limited.length);

    return {
      ok: true, count: limited.length, file: fileName, dir: dirUrl,
      account: acctName, path: relPath,
      failCount: built.failCount, pending: pending, bytes: bytes,
      skippedText: built.skippedText || '',
      attFail: built.attFail || 0, attTotal: built.attTotal || 0
    };
  }

  // 确保目录存在：逐级 MKCOL。
  // AList / Nextcloud 这类服务不会因为 PUT 到深层路径就自动建目录，
  // 所以先逐级创建，再上传。
  // 405 = 已存在（不同服务返回不一），视为成功。
  async function davEnsureDir(cfg) {
    const base = davBaseUrl(cfg);
    if (!base) throw new Error('未配置 WebDAV 地址');

    // 把 URL 拆成 host + 逐级路径，例：
    //   https://a.com/dav/BaiduNetdisk/craber/
    //   → https://a.com  +  ['dav','BaiduNetdisk','craber']
    let u;
    try { u = new URL(base); } catch (e) { throw new Error('地址格式不对'); }
    const segs = u.pathname.split('/').filter(Boolean);
    if (!segs.length) return;              // 根目录，无需创建

    const origin = u.origin;
    let path = '';
    for (let i = 0; i < segs.length; i++) {
      path += '/' + encodeURIComponent(segs[i]);
      const r = await davRequest('MKCOL', origin + path + '/', { cfg: cfg });
      // 201 创建成功；405 已存在；部分服务对已存在返回 301/302 或 200
      if (r.status === 201 || r.status === 405 || r.status === 200
        || r.status === 301 || r.status === 302) continue;
      if (r.status === 401) throw new Error('用户名或密码不对（HTTP 401）');
      if (r.status === 403) throw new Error('没有权限在该目录创建文件夹（HTTP 403）');
      // 409 = 父目录还不存在（理论上不会发生，因为我们逐级创建），继续尝试让下一级失败时报错
      if (r.status === 409) continue;
      throw new Error('创建目录失败 HTTP ' + r.status + '（' + path + '）');
    }
  }

  // 测试连接：只做一次 PROPFIND，确认地址与凭证可用（不改动任何文件）
  async function davTest(cfg) {
    const base = davBaseUrl(cfg);
    if (!base) throw new Error('请先填写服务器地址');
    // PROPFIND 是 WebDAV 的标准"问一下这个目录有什么"，用 depth:0 只看自身
    const r = await davRequest('PROPFIND', base, {
      cfg: cfg,          // 用调用方传入的（可能是表单里刚填、还没保存的）
      headers: { Depth: '0', 'Content-Type': 'application/xml; charset=utf-8' },
      body: '<?xml version="1.0" encoding="utf-8"?>'
        + '<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>'
    });
    if (r.status === 401) throw new Error('用户名或密码不对（HTTP 401）');
    if (r.status === 403) throw new Error('没有权限访问该目录（HTTP 403）');
    if (r.status === 404) {
      throw new Error('目录不存在（HTTP 404）。点「保存」会让脚本尝试自动创建');
    }
    // 207 是 WebDAV 正常响应；部分服务对根目录返回 200
    if (r.status !== 207 && r.status !== 200 && r.status !== 301 && r.status !== 302) {
      throw new Error('连接失败 HTTP ' + r.status + '（该地址可能不是 WebDAV）');
    }
    return true;
  }

  // WebDAV 设置对话框
  // 记录里用的短时间格式：今天只显示时分，更早显示月-日 时:分
  function davFmtTime(ts) {
    const t = Number(ts) || 0;
    if (!t) return '';
    const d = new Date(t);
    const now = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const hm = p(d.getHours()) + ':' + p(d.getMinutes());
    const sameDay = d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    if (sameDay) return hm;
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + hm;
  }

  // 会话列表里的"日期"列：只到天，今年省略年份，读起来更短
  function davFmtDay(ts) {
    const t = Number(ts) || 0;
    if (!t) return '';
    const d = new Date(t);
    const p = (n) => String(n).padStart(2, '0');
    const md = p(d.getMonth() + 1) + '-' + p(d.getDate());
    return d.getFullYear() === new Date().getFullYear() ? md : (d.getFullYear() + '-' + md);
  }

  function davOpenConfig() {
    const cfg = davLoad();
    folderClosePjify();

    const box = folderEl('div', 'craber-dav');

    /* ---- 区块 1：连接配置 ---- */
    const secConn = folderEl('section', 'craber-dav-sec');
    secConn.append(folderEl('div', 'craber-dav-sectitle', '连接'));

    const mkField = (label, value, ph, type) => {
      const w = folderEl('div', 'craber-dav-field');
      w.append(folderEl('div', 'craber-dav-label', label));
      const inp = document.createElement('input');
      inp.type = type || 'text';
      inp.className = 'craber-dlg-input';
      inp.value = value || '';
      if (ph) inp.placeholder = ph;
      w.append(inp);
      secConn.append(w);
      return inp;
    };

    // placeholder 只作输入格式提示，不再堆示例地址
    const urlIn = mkField('服务器地址', cfg.url, 'https://');
    const userIn = mkField('用户名', cfg.user, '');
    const passIn = mkField('密码 / 应用密码', cfg.pass, '', 'password');

    // 测试连接的结果显示在这里（贴在"连接"区块底部）
    const status = folderEl('div', 'craber-dav-status', '');
    secConn.append(status);
    box.append(secConn);

    /* ---- 区块 2：同步记录 ---- */
    const secLog = folderEl('section', 'craber-dav-sec');
    const logHead = folderEl('div', 'craber-dav-loghead');
    const logTitle = folderEl('span', 'craber-dav-logtitle', '同步记录');
    const logMeta = folderEl('span', 'craber-dav-logmeta',
      cfg.lastSync ? '上次 ' + davFmtTime(cfg.lastSync) : '');
    const clearBtn = folderEl('button', 'craber-dav-clear', '清空');
    clearBtn.type = 'button';
    logHead.append(logTitle, logMeta, clearBtn);

    const logList = folderEl('div', 'craber-dav-loglist');
    const renderLog = () => {
      const rows = davLogLoad();
      logList.innerHTML = '';
      if (!rows.length) {
        logList.append(folderEl('div', 'craber-dav-logempty', '还没有同步记录'));
        return;
      }
      for (const r of rows) {
        const row = folderEl('div', 'craber-dav-logrow' + (r.ok ? '' : ' err'));
        const dot = folderEl('span', 'craber-dav-logdot');
        const main = folderEl('div', 'craber-dav-logmain');

        // 标题行：✓ 动作 +（若有）变更徽标
        const line = folderEl('div', 'craber-dav-logline');
        line.append(folderEl('span', 'craber-dav-logname',
          (r.ok ? '✓ ' : '✗ ') + (r.action || '同步')));

        const add = Number(r.add) || 0;
        const del = Number(r.del) || 0;
        if (add > 0) line.append(folderEl('span', 'craber-dav-chip add', '+' + add));
        if (del > 0) line.append(folderEl('span', 'craber-dav-chip del', '-' + del));

        main.append(line);
        if (r.detail) main.append(folderEl('div', 'craber-dav-logdetail', r.detail));
        const time = folderEl('span', 'craber-dav-logtime', davFmtTime(r.at));
        row.append(dot, main, time);
        logList.append(row);
      }
    };
    renderLog();

    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      davLogClear();
      renderLog();
    });

    secLog.append(logHead, logList);
    box.append(secLog);

    // 把当前表单写进配置
    const collect = () => {
      const c = davLoad();
      c.url = urlIn.value.trim();
      c.user = userIn.value.trim();
      c.pass = passIn.value;
      return c;
    };

    const setStatus = (msg, kind) => {
      status.textContent = msg;
      status.className = 'craber-dav-status' + (kind ? ' ' + kind : '');
    };

    craberDialog({
      title: 'WebDAV 同步',
      subtitle: '在多台设备之间同步侧栏文件夹',
      body: box,
      cancelText: '取消',
      confirmText: '保存',
      extraButtons: [{
        label: '测试连接',
        onClick: async ({ button }) => {
          const c = collect();
          if (!c.url) { setStatus('请先填写服务器地址', 'err'); return; }
          const old = button.textContent;
          button.disabled = true;
          button.textContent = '测试中…';
          setStatus('正在连接…', '');
          try {
            await davTest(c);
            setStatus('连接成功 ✓ 地址与凭证可用', 'ok');
          } catch (e) {
            setStatus(e && e.message ? e.message : '连接失败', 'err');
          } finally {
            button.disabled = false;
            button.textContent = old;
          }
        }
      }],
      onConfirm: (close) => {
        const c = collect();
        davSave(c);
        close();
        // 保存后直接同步一次，省得再点一次「立即同步」
        davSync();
      }
    });
  }

  // 双向同步：比时间戳，谁新用谁
  // direction: 'both'（默认双向合并）| 'pull'（只取远端）| 'push'（只发本地）
  async function davSync(direction) {
    const dir = direction || 'both';
    const cfg = davLoad();
    if (!cfg.url) { navToast('还没配置 WebDAV'); davOpenConfig(); return; }
    craberProgressOpen('WebDAV 同步');
    try {
      craberProgressUpdate(1, 3, '读取远端…');
      const remote = await davPull(cfg);

      if (!remote) {
        // 远端为空：直接把本地传上去
        if (dir === 'pull') {
          craberProgressFinish(true, '远端还没有数据，本地保持不变');
          return;
        }
        craberProgressUpdate(2, 3, '远端为空，上传本地…');
        await davPush(cfg);
        cfg.lastSync = Date.now(); davSave(cfg);
        const n0 = (folderData.folders || []).length;
        davLogPush({
          ok: true, action: '首次上传',
          add: n0, del: 0,
          detail: n0 + ' 个文件夹'
        });
        craberProgressFinish(true, '已上传到 WebDAV');
        return;
      }

      // 按名合并（不再整份覆盖）：
      // 两边各有的文件夹都保留，同名的把 items 并起来。
      craberProgressUpdate(2, 3, '合并中…');
      const localList = (folderData && folderData.folders) || [];
      // 先合并墓碑：这样"一方删除、另一方还有"的情况才能正确收敛
      const tombMerged = davMergeTombstones(folderData.tombstones, remote.tombstones);
      const mergedList = davMergeFolders(localList, remote.folders || [], tombMerged);

      const before = JSON.stringify(localList);
      const after = JSON.stringify(mergedList);
      // 变更量：给记录用，让人一眼看到"这次同步动了多少"
      const diff = davDiff(localList, mergedList);
      const changed = before !== after
        || JSON.stringify(folderData.tombstones || {}) !== JSON.stringify(tombMerged);

      if (changed) {
        folderData.folders = mergedList;
        folderData.tombstones = tombMerged;
        // projNames 也取并集：id -> 名字，不冲突就直接合并
        const rp = remote.projNames && typeof remote.projNames === 'object' ? remote.projNames : {};
        if (!folderData.projNames) folderData.projNames = Object.create(null);
        for (const k of Object.keys(rp)) {
          if (!folderData.projNames[k]) folderData.projNames[k] = rp[k];
        }
        saveFolders();
        folderRenderedSig = '';
        renderFolders();
      }

      // 方向控制：pull 只落到本地，push/both 才回写远端
      if (dir === 'pull') {
        cfg.lastSync = Date.now(); davSave(cfg);
        craberProgressFinish(true, changed
          ? '已从远端拉取（' + mergedList.length + ' 个文件夹）'
          : '本地已是最新');
      } else {
        craberProgressUpdate(3, 3, '同步到远端…');
        await davPush(cfg);
        cfg.lastSync = Date.now(); davSave(cfg);
        craberProgressFinish(true, changed
          ? '已合并并同步（' + mergedList.length + ' 个文件夹）'
          : '两边一致，无需同步');
      }
      davLogPush({
        ok: true,
        action: changed ? '合并同步' : '检查',
        // diff 里的数字直接用于界面上的 +N / -N
        add: diff.itemAdd + diff.folderAdd,
        del: diff.itemDel + diff.folderDel,
        diff: diff,
        detail: mergedList.length + ' 个文件夹'
          + (changed ? '' : '（无变化）')
      });
    } catch (e) {
      const msg = e && e.message ? e.message : '未知错误';
      davLogPush({ ok: false, action: '同步', detail: msg });
      craberProgressFinish(false, '同步失败：' + msg);
    }
  }

  // 生成带 updatedAt 的本地快照（davPush 需要）
  function davLocalUpdatedAt() {
    return Number(folderDataUpdatedAt) || 0;
  }

  // 从 WebDAV 取回文件夹数据
  async function davPull(cfg) {
    const base = davBaseUrl(cfg);
    if (!base) throw new Error('未配置 WebDAV 地址');
    let r = await davRequest('GET', base + davRemoteName(), { cfg: cfg });
    // 本账号还没有专属文件时，再找一次旧版公共文件：
    // 否则升级后会"看不到以前同步上去的文件夹"。
    if (r.status === 404 && davRemoteName() !== DAV_REMOTE_NAME) {
      const legacy = await davRequest('GET', base + DAV_REMOTE_NAME, { cfg: cfg });
      if (legacy.status >= 200 && legacy.status < 300) {
        try {
          const j = JSON.parse(legacy.text);
          if (j && Array.isArray(j.folders)) return j;
        } catch (e) { /* 旧文件坏了就当没有 */ }
      }
      return null;
    }
    if (r.status === 404) return null;            // 远端还没有，正常
    if (r.status < 200 || r.status >= 300) {
      throw new Error('读取失败 HTTP ' + r.status
        + (r.status === 401 ? '（用户名或密码不对）' : ''));
    }
    try {
      const j = JSON.parse(r.text);
      if (!j || !Array.isArray(j.folders)) return null;
      return j;
    } catch (e) {
      throw new Error('远端文件不是有效的 JSON');
    }
  }

  const FOLDERS_KEY = 'gpt_craber_folders';
  const FOLDERS_VER = 1;

  /* 文件夹数据按账号隔离
   * 同一个 WebDAV 可能被多个 ChatGPT 账号共用：远端文件若不分开，
   * A 账号推送就会覆盖 B 账号的文件夹结构；本地若不分开，
   * 换账号后还会看到别人的文件夹。
   * 这里用一个"账号键"同时作用在本地键名与远端文件名上。
   * 拿不到账号名时返回 ''（沿用旧键/旧文件名），保证老用户不丢数据。
   */
  function craberAccountKey() {
    const a = craberAccountLoad();
    const nm = a && a.name ? String(a.name) : '';
    return sanitizeRemoteSeg(nm);
  }

  // 本地存储键：有账号名 → gpt_craber_folders@<账号>；否则沿用旧键
  function folderStoreKey() {
    const who = craberAccountKey();
    return who ? FOLDERS_KEY + '@' + who : FOLDERS_KEY;
  }
  const FOLDER_KID_MAX = 200;   // 单个文件夹最多展示的条目数，超出的只显示计数

  let folderData = null;        // { ver, folders: [{ id, name, open, items: [] }] }
  let folderDataOwner = null;   // folderData 属于哪个账号（切换账号时据此重载）
  let foldersEl = null;         // 区块根节点（挂在原生 nav 里）
  let foldersHostNav = null;    // 当前挂在哪个 nav 上，换了要重挂
  let folderRenderedSig = '';   // 上次渲染的数据指纹，原生重渲染时不重复重建
  let folderPjifyEl = null;     // 「归入文件夹」弹出菜单
  // 二级浮层的关闭句柄：主菜单关闭时必须一并收起，否则会孤零零留在屏幕上
  let folderPjifySubClose = null;
  let folderDndKind = null;     // 拖拽中的条目类型（'conv' | 'proj'）
  let folderDndId = null;
  let folderDndKey = null;    // 拖拽源的完整 key（含 kind 前缀）
  let folderDndLabel = null;  // 拖拽源的显示名（项目需要它来记录名字）
  let folderPjScanAt = 0;       // 原生行按钮扫描的节流时间戳

  // 条目显示名与真实 href 的内存缓存：建条目时从原生行读到什么就先用什么，
  // 之后每轮从原生列表补齐真名。不落盘 —— 原生列表一出现就能刷回来。
  const folderTitleCache = Object.create(null);
  const folderHrefCache = Object.create(null);

  function folderUid() {
    return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  let folderDataUpdatedAt = 0;   // 本地数据最后修改时间（同步用）

  function loadFolders() {
    try {
      const key = folderStoreKey();
      let raw = localStorage.getItem(key);
      // 升级后第一次运行：本账号还没有专属数据，把旧键（未分账号）的内容接过来
      if (!raw && key !== FOLDERS_KEY) {
        const legacy = localStorage.getItem(FOLDERS_KEY);
        if (legacy) {
          raw = legacy;
          // 复制而不是搬走：万一用户切回旧版本还能读到
          try { localStorage.setItem(key, legacy); } catch (e) {}
        }
      }
      if (!raw) return { ver: FOLDERS_VER, projNames: {}, folders: [], tombstones: {} };
      const j = JSON.parse(raw);
      const list = Array.isArray(j && j.folders) ? j.folders : [];
      // 读回时间戳，供同步比较（不放进 folderData，避免被再次写回时干扰）
      folderDataUpdatedAt = Number(j && j.updatedAt) || 0;
      // projNames: "proj:<id>" -> 项目名。项目进文件夹时连名字一起存，
      // 之后显示与"是否已添加"都靠它，不必再反查接口。
      const projNames = (j && j.projNames && typeof j.projNames === 'object') ? j.projNames : {};
      // 墓碑：记录"什么时候删掉了什么"，让删除也能跨设备传播。
      // 并集合并只会做加法，没有墓碑的话删掉的东西下次同步就回来了。
      const tombstones = (j && j.tombstones && typeof j.tombstones === 'object') ? j.tombstones : {};
      return {
        ver: FOLDERS_VER,
        projNames: projNames,
        tombstones: tombstones,
        folders: list.filter((f) => f && typeof f.id === 'string').map((f) => ({
          id: f.id,
          name: typeof f.name === 'string' && f.name ? f.name : '文件夹',
          open: f.open !== false,
          items: Array.isArray(f.items) ? f.items.filter((x) => typeof x === 'string') : []
        }))
      };
    } catch (e) {
      console.warn('[gpt-craber] 文件夹数据损坏，已重置', e);
      return { ver: FOLDERS_VER, projNames: {}, folders: [], tombstones: {} };
    }
  }

  function saveFolders() {
    try {
      // 打上时间戳：WebDAV 同步靠它判断哪边更新
      const snapshot = Object.assign({}, folderData, { updatedAt: Date.now() });
      localStorage.setItem(folderStoreKey(), JSON.stringify(snapshot));
    } catch (e) {}
    folderRenderedSig = '';   // 数据变了，下一轮必须重画
  }

  function folderKeyOf(kind, id) {
    return kind === 'proj' ? 'proj:' + id : String(id || '');
  }

  // 原生行链接 -> 条目。
  //   项目内会话 /g/g-p-xxx/c/<conv>  -> 会话
  //   项目主页   /g/g-p-xxx          -> 项目
  //   普通会话   /c/<conv>           -> 会话
  // 顺序很重要：项目内会话也匹配 /g/，必须先判 /c/，否则会被当成项目。
  function folderEntryFromHref(href) {
    if (!href) return null;
    const cm = String(href).match(/\/c\/([^/?#]+)/);
    if (cm) return { kind: 'conv', id: cm[1], key: folderKeyOf('conv', cm[1]) };
    const pm = String(href).match(/^\/g\/(g-p-[0-9a-f]+)\/?$/);
    if (pm) return { kind: 'proj', id: pm[1], key: folderKeyOf('proj', pm[1]) };
    return null;
  }

  // 侧栏「项目」行不是链接（实测是 role="button" 的 div，没有 href），
  // 拿不到 gizmo id，只能用项目名做键。同名项目在侧栏本就不允许，够用。
  // 名字里可能出现分隔符，统一做一次可逆编码，避免和 conv 的裸 id 撞车。
  function folderProjKeyByName(name) {
    return 'projname:' + encodeURIComponent(String(name || '').trim());
  }

  function folderProjNameFromKey(key) {
    const k = String(key || '');
    // proj:<id>：名字存在 folderData.projNames 里
    if (k.indexOf('proj:') === 0) {
      const byId = folderData && folderData.projNames && folderData.projNames[k];
      if (byId) return byId;
      // 兜底：接口名称缓存
      const gid = k.slice(5);
      if (API._gizmoCache && API._gizmoCache[gid]) {
        // 顺手补写进本地表，下次不再依赖接口缓存
        folderRememberProjName(gid, API._gizmoCache[gid]);
        return API._gizmoCache[gid];
      }
      // 都没有：异步补一次（不阻塞渲染）
      folderEnsureProjName(gid, k);
      return '';
    }
    if (k.indexOf('projname:') !== 0) return '';
    try { return decodeURIComponent(k.slice(9)); } catch (e) { return ''; }
  }

  // 记录"项目 id -> 名字"，供以后显示使用（纯本地，不发请求）
  // 统一的"把某项加入文件夹"入口。
  // 所有路径（对话框、拖拽、菜单）都必须走这里：
  // 项目键是 proj:<id>，名字必须同时记进 projNames，否则只能显示出 ID。
  function folderAddItem(f, key, label) {
    if (!f || !key) return false;
    const nm = String(label || '').trim();

    // proj:<id>：把名字记进 projNames（界面靠它显示，否则只剩 ID）
    if (key.indexOf('proj:') === 0) {
      const gid = key.slice(5);
      const finalName = nm || (API._gizmoCache && API._gizmoCache[gid])
        || folderProjNameFromKey(key);
      if (finalName) folderRememberProjName(gid, finalName);
    } else if (key.indexOf('projname:') === 0) {
      // projname:<名字>：名字就在键里，顺手建立 id 映射（如果已知）
      const name = folderProjNameFromKey(key);
      const gid = folderProjIdByName[name];
      if (gid && name) folderRememberProjName(gid, name);
    }

    if (f.items.indexOf(key) >= 0) return false;
    f.items.push(key);
    // 重新加入：解除该条目的移除墓碑
    folderUntombstone(folderTombKeyItem(f.name, key));
    return true;
  }

  // 已知 ID 但缺名字时，异步补上并重绘（修复"显示出 g-p-xxxx"的旧数据）
  const folderProjNameFetching = Object.create(null);
  function folderEnsureProjName(gid, key) {
    if (!gid || folderProjNameFetching[gid]) return;
    folderProjNameFetching[gid] = true;
    Promise.resolve()
      .then(() => API.getGizmoName(gid))
      .then((nm) => (nm ? nm : folderFetchProjNameCookie(gid)))
      .then((nm) => {
        folderProjNameFetching[gid] = false;
        if (!nm) return;
        folderRememberProjName(gid, nm);
        folderRenderedSig = '';
        renderFolders();
      })
      .catch(() => { folderProjNameFetching[gid] = false; });
  }

  function folderRememberProjName(gid, name) {
    if (!gid || !name) return;
    if (!folderData) return;
    if (!folderData.projNames) folderData.projNames = Object.create(null);
    const k = folderKeyOf('proj', gid);
    if (folderData.projNames[k] === name) return;
    folderData.projNames[k] = name;
    saveFolders();
  }

  // 找侧栏里"项目行"：role=button、无 href、位于「项目」标题之后、「最近」标题之前。
  function folderIsProjectRow(el) {
    if (!el || el.getAttribute('role') !== 'button') return false;
    if (el.querySelector('a[href]')) return false;      // 含链接的是容器不是行
    // 排除我们自己的文件夹行/子项：它们也是 role=button，不加这条会被当成项目行，
    // 于是标题取到文件夹名+计数、点开又把文件夹塞进文件夹（实测）。
    if (el.closest('.craber-folders') || el.classList.contains('craber-folder')
      || el.classList.contains('craber-folder-kid')) return false;
    const h = el.getBoundingClientRect().height;
    return h >= 20 && h <= 60;
  }

  function folderEntryTitle(a) {
    const t = (a.getAttribute('aria-label') || a.textContent || '').trim();
    return t.replace(/\s+/g, ' ').slice(0, 80) || '未命名';
  }

  function folderItemHref(kind, id) {
    if (kind === 'proj') return '/g/' + id;
    return folderHrefCache[id] || ('/c/' + id);
  }

  // 条目的可点击目标。项目按名字存的没有 URL，只能"回侧栏点同名项目行"。
  function folderItemKindOf(key) {
    if (String(key).indexOf('projname:') === 0) return 'projname';
    if (String(key).indexOf('proj:') === 0) return 'proj';
    return 'conv';
  }

  function folderRememberHref(entry, href) {
    if (!entry || !href) return;
    if (entry.kind === 'conv') folderHrefCache[entry.id] = href;
  }

  function folderFind(id) {
    return folderData ? folderData.folders.find((f) => f.id === id) || null : null;
  }

  function folderToggleItem(folderId, key) {
    const f = folderFind(folderId);
    if (!f) return false;
    const i = f.items.indexOf(key);
    if (i >= 0) {
      f.items.splice(i, 1);
      // 移出也留墓碑，否则同步时会被并集带回来
      folderTombstone(folderTombKeyItem(f.name, key));
    } else {
      f.items.push(key);
      // 重新加入：解除这条的移除墓碑
      folderUntombstone(folderTombKeyItem(f.name, key));
    }
    saveFolders();
    renderFolders();
    return i < 0;   // true = 刚加进去
  }

  function folderCreate(name, key) {
    const f = { id: folderUid(), name: name || '新建文件夹', open: true, items: key ? [key] : [] };
    folderData.folders.push(f);
    saveFolders();
    renderFolders();
    return f;
  }

  function folderRename(id) {
    const f = folderFind(id);
    if (!f) return;
    craberPromptDialog({
      title: '重命名文件夹',
      subtitle: '保持简短且易于识别',
      value: f.name,
      confirmText: '保存',
      onOk: (v) => {
        const oldName = f.name;
        const newName = String(v || '').trim();
        if (!newName || newName === oldName) return;
        // 改名 = 旧名留墓碑 + 新名解除墓碑。
        // 不这样的话，另一台设备会把旧名当成"它独有的"再建一个，
        // 结果两个文件夹并存、内容还重复。
        folderTombstone(folderTombKeyFolder(oldName));
        f.name = newName;
        folderUntombstone(folderTombKeyFolder(newName));
        saveFolders();
        renderFolders();
        navToast('已重命名为「' + newName + '」');
      }
    });
  }

  function folderDelete(id) {
    const f = folderFind(id);
    if (!f) return;
    craberConfirmDialog({
      title: '删除「' + f.name + '」？',
      message: '只是取消这个分类，里面的会话与项目本身不会被删除。',
      confirmText: '删除',
      danger: true,
      onOk: () => folderDeleteConfirmed(id)
    });
  }

  /* ---------- 墓碑：让删除/改名能跨设备传播 ----------
   * 键的格式：
   *   folder:<名称>                整个文件夹被删除
   *   item:<文件夹名>|<条目 key>    某条目从某文件夹移出
   *
   * 值是该动作发生的时间戳。合并时：
   *   - 两侧墓碑取并集（较新的时间戳胜出）
   *   - 按墓碑过滤掉对应内容
   *
   * 为什么按"名字"而不是文件夹 id：同一文件夹在不同设备上 id 不同，
   * 名字才是能对齐的标识。
   */
  function folderTombKeyFolder(name) {
    return 'folder:' + String(name || '').trim();
  }
  function folderTombKeyItem(folderName, itemKey) {
    return 'item:' + String(folderName || '').trim() + '|' + String(itemKey || '');
  }

  function folderTombstone(key) {
    if (!folderData.tombstones) folderData.tombstones = Object.create(null);
    folderData.tombstones[key] = Date.now();
  }

  function folderTombOf(key) {
    const t = folderData.tombstones && folderData.tombstones[key];
    return Number(t) || 0;
  }

  // 清掉墓碑（当同一名字/条目又被重新创建时，旧墓碑必须失效，
  // 否则新建的文件夹会被自己上一次的删除标记再次干掉）
  function folderUntombstone(key) {
    if (!folderData.tombstones) return;
    if (key in folderData.tombstones) {
      delete folderData.tombstones[key];
      saveFolders();
    }
  }

  function folderDeleteConfirmed(id) {
    const f = folderFind(id);
    const nm = f ? f.name : '';
    folderData.folders = folderData.folders.filter((x) => x.id !== id);
    // 留墓碑：否则另一台设备同步时会把"并集"又把它带回来
    if (nm) folderTombstone(folderTombKeyFolder(nm));
    saveFolders();
    renderFolders();
  }

  // 项目条目下的子会话列表：原地切换类名播放过渡（不重建 DOM）
  function folderToggleProjOpen(key, row) {
    folderProjOpen[key] = !folderProjOpen[key];
    const open = !!folderProjOpen[key];
    if (row) row.classList.toggle('open', open);
    const host = row ? row.parentElement : null;
    const sub = host && host.querySelector('.craber-folder-kid-sub[data-for="' + key + '"]');
    if (sub) sub.classList.toggle('craber-collapsed', !open);
    return open;
  }

  // 展开/收起：先原地加类触发过渡动画，再落盘。
  // 不能直接 renderFolders()——整体重建 DOM 会让过渡失效（节点被换成新的），
  // 看起来永远是瞬时切换。
  function folderSetOpen(id, open) {
    const f = folderFind(id);
    if (!f) return;
    const next = !!open;
    f.open = next;
    saveFolders();

    // 1) 原地改类：animation 立刻开始
    if (foldersEl) {
      const row = foldersEl.querySelector('.craber-folder[data-folder-id="' + id + '"]');
      if (row) row.classList.toggle('open', next);
      const kids = row && row.nextElementSibling;
      if (kids && kids.classList.contains('craber-folder-kids')) {
        kids.classList.toggle('craber-collapsed', !next);
      }
    }
    // 2) 箭头/高亮等其它视觉同步（不重建结构）
    folderRenderedSig = '';

    // 3) 动画结束后再让整体渲染接管（此时状态已一致，不会跳）
    setTimeout(() => {
      folderRenderedSig = '';
      renderFolders();
    }, 240);
  }

  // 项目行没有 href，只能"在侧栏找到同名行并点它"，让 ChatGPT 自己路由。
  function folderOpenProjectByName(name) {
    if (!name) return;
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (nav) {
      const row = [...nav.querySelectorAll('[role="button"]')].find((el) => {
        if (!folderIsProjectRow(el)) return false;
        return (el.textContent || '').trim() === name;
      });
      if (row) { row.click(); return; }
    }
    // 侧栏没渲染这一行（折叠/滚出视口）：退回项目列表页
    folderNavigate('/projects');
  }

  function folderNavigate(href) {
    folderClosePjify();
    const a = document.createElement('a');
    a.href = href;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
  }

  /* ---------- 图标 ---------- */

  // 图标统一 stroke-width 1.7、viewBox 24，尺寸靠 CSS 控制（文件夹行 14px / 子项 13px）。
  // 侧栏行内的小号螃蟹（复用 CRAB_SVG 的路径，只改尺寸）
  const CRAB_SMALL = CRAB_SVG
    .replace('width="26" height="26"', 'width="15" height="15"');

  /* 图标统一构造器
   * 全脚本的线性图标都从这里出：同一个 24 视框、同一套圆角与端点、
   * 同一条 1.8 描边 —— 16~18px 下 1.7 会发虚，1.8 才结实。
   */
  const mi = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"'
    + ' stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';

  /* 文件夹：开口朝上的梯形文件夹，与系统/原生列表同构。
   * 原来是 1.5 圆角 + 斜切标签，18px 下左侧那道斜线几乎看不见，
   * 于是"文件夹"和"卡片"分不开。改成 2.2 圆角 + 明确的标签片。 */
  const FOLDER_PATH = 'M3 8.5A2.5 2.5 0 0 1 5.5 6h3.1a2 2 0 0 1 1.6.8l.9 1.2h7.4A2.5 2.5 0 0 1 21 10.5v6A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z';
  // 18px 显示，描边回到 1.7（同样的线条在更大尺寸下不需要更粗）
  const FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"'
    + ' stroke-linecap="round" stroke-linejoin="round"><path d="' + FOLDER_PATH + '"/></svg>';

  // 折叠箭头：比原来的 2.4 细一点，和图标整体重量对齐
  const FOLDER_CHEV = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor"'
    + ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>';

  // 会话 = 对话气泡（闭合、圆角统一，尾巴自然收口）
  const FOLDER_CONV_ICON = mi('<path d="M12 3.5c-4.7 0-8.5 3.1-8.5 7 0 2.2 1.2 4.1 3.1 5.4v3.6c0 .5.6.8 1 .5l3-2.1c.5.1 1 .1 1.4.1 4.7 0 8.5-3.1 8.5-7s-3.8-7-8.5-7z"/>');

  // 项目 = 公文包（和文件夹明显区分：有提手、有横向分隔线）
  const FOLDER_PROJ_ICON = mi('<rect x="3" y="7.5" width="18" height="11.5" rx="2.5"/>'
    + '<path d="M8.5 7.5V6.2a2.2 2.2 0 0 1 2.2-2.2h2.6a2.2 2.2 0 0 1 2.2 2.2v1.3"/>'
    + '<path d="M3 12.5h18"/>');

  const FOLDER_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"'
    + ' stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg>';

  // 文件夹行上的"添加"图标（+）
  const FOLDER_PLUS = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5v13M5.5 12h13"/></svg>';
  // 图标全部按原版菜单的样式与尺寸（16px、1.7 描边）
  const MENU_ICON = {
    // 导出（下载箭头到托盘）
    export: mi('<path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>'),
    // 打开（外链箭头）
    open: mi('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
    // 展开/收起
    expand: mi('<path d="M6 9.5l6 6 6-6"/>'),
    // 重命名（铅笔，与原版一致）
    rename: mi('<path d="M16.5 4.5a2.12 2.12 0 0 1 3 3L8 19l-4 1 1-4z"/>'),
    // 置顶（图钉）
    pin: mi('<path d="M12 17v5"/><path d="M9 3h6l-1 7 3 3v2H7v-2l3-3z"/>'),
    // 分享
    share: mi('<path d="M12 16V4"/><path d="M8 8l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'),
    // 归档（盒子）
    archive: mi('<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>'),
    // 文件夹（用于"添加到文件夹"入口）：与侧栏同一枚轮廓
    folder: mi('<path d="' + FOLDER_PATH + '"/>'),
    // 删除（垃圾桶，原版样式）
    remove: mi('<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"/>'),
    // 移入文件夹
    move: mi('<path d="' + FOLDER_PATH + '"/><path d="M12 12v3.6"/><path d="M10.6 14 12 15.4 13.4 14"/>'),
    // 从文件夹移除
    unmove: mi('<path d="' + FOLDER_PATH + '"/><path d="M10.7 12.4l2.6 2.6M13.3 12.4l-2.6 2.6"/>'),
    // 更多（三个点，用于"打开原生菜单"）
    more: mi('<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/>'
      + '<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>'
      + '<circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
    // 向右箭头：二级菜单入口用（原生菜单就是向右弹）
    // 两支箭头原本一个 1.8 一个 2.0，粗细不一致，这里统一
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"'
      + ' stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 5.5L16 12l-6.5 6.5"/></svg>'
  };

  function folderEl(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- 挂载点 ---------- */

  // 原生「项目」区块的边界。
  // 实测侧栏是 nav > 滚动容器 > (contents)> [项目区块][最近区块]，
  // 而项目区块里的行既有项目本身（/g/g-p-xxx），也有最近打开的项目内会话
  // （/g/g-p-xxx/c/yyy），两者都是 /g/ 开头。所以"是否越界"就看父节点里
  // 有没有以 /c/ 开头的普通会话链接 —— 有就说明把「最近」区块也包进来了。
  // 找最深的那个"文本正好等于 text"的元素当区块标题。
  // 用最深（children 最少）避免命中包裹了整个侧栏的大容器。
  function folderSectionHead(nav, text) {
    let best = null;
    for (const d of nav.querySelectorAll('*')) {
      if ((d.textContent || '').trim() !== text) continue;
      if (!best || d.children.length < best.children.length) best = d;
    }
    return best;
  }

  function folderMountPoint(nav) {
    // 目标：插在「项目」区块之前（文件夹在项目上方）。
    //
    // 曾经的坑：靠"往上爬直到遇到 /c/ 链接"来定位区块级容器。
    // 项目折叠时区块里没有 /c/ 链接，条件永不成立，于是爬到侧栏最外层，
    // 结果文件夹被插到了「图像」下面（顶部功能区之间）。实测踩到过。
    //
    // 现在改用稳定特征：原生「项目」区块与「最近」区块是**兄弟**。
    // 向上爬到"父级里出现了「最近」标题、而自己内部还没有"为止，那一层就是项目区块。
    const projHead = folderSectionHead(nav, '项目');
    const recHead = folderSectionHead(nav, '最近');

    if (projHead) {
      let node = projHead;
      for (let i = 0; i < 12 && node.parentElement && node.parentElement !== nav; i++) {
        const p = node.parentElement;
        if (recHead) {
          const recInParent = p.contains(recHead);
          const recInNode = node.contains(recHead);
          if (recInParent && !recInNode) break;   // 这一层已是项目区块（与最近同级）
        } else {
          // 没有「最近」区块可对照：停在"父级有多个孩子"的那层（区块级列表）
          if (p.children.length > 1) break;
        }
        node = p;
      }
      if (node.parentElement) return { parent: node.parentElement, before: node };
    }

    // 退路：没有「项目」标题时，挂在「最近」区块之前
    if (recHead) {
      let node = recHead;
      for (let i = 0; i < 12 && node.parentElement && node.parentElement !== nav; i++) {
        const p = node.parentElement;
        if (p.children.length > 1) break;
        node = p;
      }
      if (node.parentElement) return { parent: node.parentElement, before: node };
    }
    return { parent: nav, before: null };
  }

  /* ---------- 区块渲染 ---------- */

  // 数据指纹：只有内容真的变了才重建 DOM。原生侧栏会频繁重渲染，
  // 无条件重建会把展开动画和 hover 状态一直打断。
  function folderSignature() {
    if (!folderData) return '';

    // 条目的显示标题（重命名后会变）也必须进指纹，
    // 否则改完名字界面不刷新 —— 和项目展开状态是同一类问题。
    const titleOf = (k) => {
      const kind = folderItemKindOf(k);
      if (kind === 'projname') return folderProjNameFromKey(k);
      return folderTitleCache[k] || '';
    };

    const parts = folderData.folders.map((f) => f.id + '|' + f.name + '|' + (f.open ? 1 : 0)
      + '|' + f.items.map((k) => k + '=' + titleOf(k)).join(',')
      + '|' + (folderHasCurrent(f) ? 1 : 0));

    // 项目条目：展开状态 + 该项目的会话列表内容，都必须进签名。
    // 否则"展开项目 / 拉到会话"时签名不变，renderFolders 直接 return，
    // 界面就不会更新（这是前端看起来卡住的根因）。
    const projParts = [];
    const seenProj = new Set();
    for (const f of folderData.folders) {
      for (const k of f.items) {
        const kind = folderItemKindOf(k);
        if (kind !== 'proj' && kind !== 'projname') continue;
        if (seenProj.has(k)) continue;
        seenProj.add(k);
        const convs = folderProjConvs(k) || [];
        const st = folderProjConvState[k] || folderProjConvState[folderKeyOf('proj', folderProjGizmoId(k) || '')] || '';
        projParts.push(k + ':' + (folderProjOpen[k] ? 1 : 0) + ':' + st
          + ':' + convs.map((c) => c.key + (craberIsPinned ? (craberIsPinned(String(c.key).replace(/^conv:/, '')) ? '+' : '') : '')).join(','));
      }
    }

    // 带上当前会话 id / 项目，路径变化时高亮要重算
    return parts.join(';')
      + '||' + projParts.join(';')
      + '|' + location.pathname
      + '|' + (folderCurrentConvId() || '');
  }

  function renderFolders() {
    if (!uiPrefs.folders) { folderUnmount(); return; }
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (!nav) { folderUnmount(); return; }

    const sig = folderSignature();
    if (foldersEl && foldersEl.isConnected && foldersHostNav === nav
      && sig === folderRenderedSig) return;   // 与上一帧一致，不动

    const root = folderEl('div', 'craber-folders');

    const hd = folderEl('div', 'craber-folders-hd');
    hd.append(folderEl('span', 'craber-folders-label', '文件夹'));
    const add = folderEl('button', 'craber-folders-add', '+');
    add.type = 'button';
    add.title = '新建文件夹';
    add.setAttribute('aria-label', '新建文件夹');
    add.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      craberPromptDialog({
        title: '新建文件夹',
        subtitle: '用来给项目和会话分类',
        value: '',
        placeholder: '文件夹名称',
        confirmText: '创建',
        onOk: (v) => { folderCreate(v); }
      });
    });
    hd.append(add);
    root.append(hd);

    if (!folderData.folders.length) {
      root.append(folderEl('div', 'craber-folder-empty', '还没有文件夹。点 + 新建，再把项目或会话拖进来。'));
    }

    for (const f of folderData.folders) {
      root.append(folderBuildRow(f));
      // 始终渲染子项：只有节点在 DOM 里，收起才能播高度过渡动画。
      // 收起态由 .craber-collapsed（grid-template-rows: 0fr）表达，不占空间。
      root.append(folderBuildKids(f));
    }

    // 拖到区块空白处 = 放进第一个文件夹
    root.addEventListener('dragover', (e) => {
      if (!folderDndId) return;
      e.preventDefault();
      root.classList.add('drag-over');
    });
    root.addEventListener('dragleave', () => root.classList.remove('drag-over'));
    root.addEventListener('drop', (e) => {
      root.classList.remove('drag-over');
      if (!folderDndId) return;
      e.preventDefault();
      if (!folderData.folders.length) { navToast('先新建一个文件夹'); return; }
      const f0 = folderData.folders[0];
      const key = folderDndKey || folderKeyOf(folderDndKind, folderDndId);
      folderAddItem(f0, key, folderDndLabel);
      saveFolders();
      renderFolders();
      navToast('已加入「' + f0.name + '」');
      folderDndId = null;
      folderDndKey = null;
    });

    const mp = folderMountPoint(nav);
    try { mp.parent.insertBefore(root, mp.before || null); } catch (e) { mp.parent.appendChild(root); }

    if (foldersEl && foldersEl !== root && foldersEl.parentElement) foldersEl.remove();
    foldersEl = root;
    foldersHostNav = nav;
    folderRenderedSig = sig;
  }

  // 自动展开：进入某个会话时，把它所在的文件夹展开一次。
  // 用户手动收起过的不再强开（用 folderAutoOpened 记住已自动开过）。
  const folderAutoOpened = Object.create(null);
  // 项目行（文件夹内的项目条目）展开状态：key -> boolean。存内存，刷新回到收起。
  const folderProjOpen = Object.create(null);
  function folderAutoExpand() {
    if (!folderData) return false;
    let changed = false;

    // 1) 文件夹层：当前会话所在的文件夹自动展开一次
    for (const f of folderData.folders) {
      if (f.open) continue;
      if (!folderHasCurrent(f)) continue;
      if (folderAutoOpened[f.id]) continue;   // 已经自动开过，尊重用户手动收起
      f.open = true;
      folderAutoOpened[f.id] = true;
      changed = true;
    }

    // 2) 项目层：文件夹里"装着当前会话所属项目"的那一项，也要自动展开，
    //    这样一进会话就能直接看到它在文件夹里的位置，不用手点箭头。
    const conv = folderCurrentConvId();
    if (conv) {
      const href = folderCurrentConvHref();
      // 先从链接取 gid；侧栏没渲染该项目（未展开）时链接里没有 /g/，
      // 这时退回当前 URL —— 用户此刻就在这个项目里，一定对。
      let gid = href ? (String(href).match(/\/g\/(g-p-[0-9a-f]+)/) || [])[1] : null;
      if (!gid) {
        const cur = location.pathname.match(/\/g\/(g-p-[0-9a-f]+)/);
        if (cur) gid = cur[1];
      }
      const pname = folderCurrentProjName();
      const cand = [];
      if (gid) cand.push(folderKeyOf('proj', gid));
      if (pname) cand.push(folderProjKeyByName(pname));
      // 兜底：文件夹里实际存在的项目键，只要"该项目名/ID 与当前会话匹配"也算
      // （projname 与 proj: 两种形式常常只有一个能算出来）
      for (const f of folderData.folders) {
        for (const k of f.items) {
          if (folderItemKindOf(k) !== 'projname') continue;
          if (gid && folderProjIdByName[folderProjNameFromKey(k)] === gid) cand.push(k);
          if (pname && folderProjNameFromKey(k) === pname) cand.push(k);
        }
      }

      for (const key of cand) {
        if (!key) continue;
        if (folderProjOpen[key] === true) continue;
        if (folderAutoOpened['proj:' + key]) continue;   // 已经自动开过，尊重手动收起
        // 只有这个项目确实出现在某个文件夹里才展开（否则没意义）
        const inAny = folderData.folders.some((f) => f.items.indexOf(key) >= 0);
        if (!inAny) continue;
        folderProjOpen[key] = true;
        folderAutoOpened['proj:' + key] = true;
        // 展开后立刻把 DOM 上的类切过来（不然要等整轮 render 才有动画）
        const subEl = foldersEl
          && foldersEl.querySelector('.craber-folder-kid-sub[data-for="' + key + '"]');
        if (subEl) {
          subEl.classList.remove('craber-collapsed');
          const rowEl = subEl.parentElement
            && subEl.parentElement.querySelector('.craber-folder-kid');
          if (rowEl) rowEl.classList.add('open');
        }
        changed = true;
      }
    }

    if (changed) saveFolders();
    return changed;
  }

  // 当前正在浏览的会话 id（会话页才有）
  function folderCurrentConvId() {
    return getConvId();
  }

  // 某个条目是不是"当前正在看的会话"。
  // 不能比整条路径：真实 URL 常带项目 slug（/g/g-p-xxx-可读名/c/id），
  // 而缓存里的 href 是不带 slug 的标准形式，直接比会永远不相等。
  function folderIsActiveConv(c) {
    const cur = folderCurrentConvId();
    if (!cur || !c) return false;
    if (c.key === folderKeyOf('conv', cur)) return true;
    if (c.id === cur) return true;
    return false;
  }

  // 侧栏里"当前会话"那条链接的 href；侧栏没渲染时退回 location.pathname
  function folderCurrentConvHref() {
    const conv = folderCurrentConvId();
    if (!conv) return null;
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (nav) {
      const a = [...nav.querySelectorAll('a[href]')].find((el) => {
        const e = folderEntryFromHref(el.getAttribute('href'));
        return e && e.kind === 'conv' && e.id === conv;
      });
      if (a) return a.getAttribute('href');
    }
    return location.pathname;
  }

  // 当前会话所属项目的 key 列表（项目内会话才有）。
  // 两种键形式都试：proj:<gizmoId> 和 projname:<名字>。
  function folderCurrentProjKeys() {
    const href = folderCurrentConvHref();
    const out = [];
    if (!href) return out;
    const gm = String(href).match(/\/g\/(g-p-[0-9a-f]+)/);
    if (gm) out.push(folderKeyOf('proj', gm[1]));
    // 名字形式：项目行与会话行在原生侧栏里是"兄弟"（同属一个项目块），
    // 所以不能从会话往上找项目行，而要找到包住两者的那个块，再取块里的项目行文本。
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (nav) {
      const a = [...nav.querySelectorAll('a[href]')].find((el) => el.getAttribute('href') === href);
      if (a) {
        let n = a;
        for (let i = 0; i < 8 && n && n.tagName !== 'NAV'; i++) {
          n = n.parentElement;
          if (!n || n.tagName === 'NAV') break;
          // 这个祖先里若有一个"项目行"按钮，就说明找到项目块了
          const projRow = [...n.querySelectorAll('[role="button"]')]
            .find((el) => folderIsProjectRow(el) && (el.textContent || '').trim());
          if (projRow) {
            out.push(folderProjKeyByName((projRow.textContent || '').trim()));
            break;
          }
        }
      }
    }
    return out;
  }

  // 文件夹里是否包含"我现在正在看的东西"：当前会话本身，或它所属的项目。
  // 项目有两种键（proj:<gizmoId> / projname:<名字>），同一项目的两种形式要能互相匹配。
  function folderHasCurrent(f) {
    const conv = folderCurrentConvId();
    if (conv && f.items.indexOf(folderKeyOf('conv', conv)) >= 0) return true;
    const pkeys = folderCurrentProjKeys();
    if (pkeys.some((k) => f.items.indexOf(k) >= 0)) return true;
    // 桥接：把当前项目的名字取出来，和文件夹里的 projname:<名字> 比
    const name = folderCurrentProjName();
    if (name && f.items.indexOf(folderProjKeyByName(name)) >= 0) return true;
    return false;
  }

  // 当前会话所属项目的"名字"。
  // 实测：项目行与会话行在原生侧栏里不在同一条祖先链上（上溯 6 层都碰不到），
  // 所以不能靠 DOM 结构推断。改为按 gizmo id 查缓存名（API.getGizmoName 已带缓存），
  // 缓存里没有就先返回 null，并异步预热，下一轮 tick 就能命中。
  const folderGizmoNameCache = Object.create(null);
  function folderCurrentProjName() {
    const href = folderCurrentConvHref();
    // 侧栏未渲染该项目时链接里没有 /g/，退回当前 URL
    let gid = href ? (String(href).match(/\/g\/(g-p-[0-9a-f]+)/) || [])[1] : null;
    if (!gid) {
      const cur = location.pathname.match(/\/g\/(g-p-[0-9a-f]+)/);
      if (cur) gid = cur[1];
    }
    if (!gid) return null;
    if (folderGizmoNameCache[gid]) return folderGizmoNameCache[gid];
    // 同步拿不到：异步取一次，取到后清签名触发重绘
    if (!folderGizmoNameCache['pending:' + gid]) {
      folderGizmoNameCache['pending:' + gid] = true;
      Promise.resolve().then(() => API.getGizmoName(gid)).then((name) => {
        if (!name) return;
        folderGizmoNameCache[gid] = name;
        folderRenderedSig = '';   // 让下一轮 tick 重画（高亮/自动展开跟上）
      }).catch(() => {});
    }
    return null;
  }

  function folderBuildRow(f) {
    const cur = folderHasCurrent(f);
    const row = folderEl('div', 'craber-folder' + (f.open ? ' open' : '')
      + (cur ? ' has-current' : ''));
    row.dataset.folderId = f.id;
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-expanded', f.open ? 'true' : 'false');

    const chev = folderEl('span', 'craber-folder-chev');
    chev.innerHTML = FOLDER_CHEV;
    const ico = folderEl('span', 'craber-folder-ico');
    ico.innerHTML = FOLDER_ICON;
    const name = folderEl('span', 'craber-folder-name', f.name);
    name.title = f.name + '（双击重命名）';
    const add = folderEl('button', 'craber-folder-more craber-folder-add');
    add.type = 'button';
    add.innerHTML = FOLDER_PLUS;
    add.title = '添加会话或项目到此文件夹';
    add.setAttribute('aria-label', '添加会话或项目');
    add.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderOpenAddPicker(add, f);
    });
    const more = folderEl('button', 'craber-folder-more', '⋯');
    more.type = 'button';
    more.title = '文件夹操作';
    more.setAttribute('aria-label', '文件夹操作');

    more.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderMoreMenu(more, f);
    });
    name.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderRename(f.id);
    });
    row.addEventListener('click', (e) => {
      if (more.contains(e.target)) return;
      folderSetOpen(f.id, !f.open);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); folderSetOpen(f.id, !f.open); }
      else if (e.key === 'F2') { e.preventDefault(); folderRename(f.id); }
      else if (e.key === 'Delete') { e.preventDefault(); folderDelete(f.id); }
    });
    // 行本身也是落点：拖到文件夹头上直接加入
    row.addEventListener('dragover', (e) => {
      if (!folderDndId) return;
      e.preventDefault();
      e.stopPropagation();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (e) => {
      if (!folderDndId) return;
      e.preventDefault();
      e.stopPropagation();
      row.classList.remove('drag-over');
      const key = folderDndKey || folderKeyOf(folderDndKind, folderDndId);
      if (f.items.indexOf(key) >= 0) navToast('已经在「' + f.name + '」里了');
      else {
        // 走统一入口：项目会顺带记下名字
        folderAddItem(f, key, folderDndLabel);
        saveFolders();
        renderFolders();
        navToast('已加入「' + f.name + '」');
      }
      folderDndId = null;
      folderDndKey = null;
    });

    row.append(chev, ico, name, add, more);
    return row;
  }

  function folderBuildKids(f) {
    const box = folderEl('div', 'craber-folder-kids');
    // 渲染前就带好收起态：避免先展开再收起闪一下
    if (!f.open) box.classList.add('craber-collapsed');

    // 内层包裹：缩进放在这里，折叠时才能完全不留空白
    const inner = folderEl('div', 'craber-folder-kids-in');
    box.append(inner);

    if (!f.items.length) {
      inner.append(folderEl('div', 'craber-folder-empty', '空文件夹 · 把会话或项目拖进来'));
      return box;
    }
    for (const key of f.items.slice(0, FOLDER_KID_MAX)) {
      inner.append(folderBuildKid(f, key));
      // 项目行后面挂子会话列表（展开/收起由 folderProjOpen 控制）
      const kind = folderItemKindOf(key);
      if (kind === 'proj' || kind === 'projname') inner.append(folderBuildKidSub(key));
    }
    if (f.items.length > FOLDER_KID_MAX) {
      inner.append(folderEl('div', 'craber-folder-empty',
        '还有 ' + (f.items.length - FOLDER_KID_MAX) + ' 项未显示'));
    }
    return box;
  }

  // 从侧栏 DOM 找某项目下的会话行（/g/g-p-xxx/c/yyy 形式的链接）。
  // 只找当前侧栏已渲染的，虚拟滚动没加载出来的不强求。
  // 项目会话缓存：key -> [{id,title}]。来自后端接口，不再依赖侧栏是否渲染。
  const folderProjConvCache = Object.create(null);   // key -> array
  const folderProjConvState = Object.create(null);   // key -> 'idle'|'loading'|'done'|'error'
  const folderProjConvRetryAt = Object.create(null); // key -> 允许重试的时间戳

  // 解析出项目的 gizmo id。proj:<id> 直接可读；projname:<名字> 需要反查：
  //   1) 当前 URL 里的 g-p（最可靠）
  //   2) 侧栏同名项目块里的 /g/ 链接
  //   3) 异步用项目名反查 gizmo 列表（见 folderResolveProjIdByName）
  // 正在异步反查中的项目名（防止同一名字被反复触发请求）
  const folderProjResolvePending = Object.create(null);

  function folderProjGizmoId(key) {
    const kind = folderItemKindOf(key);
    if (kind === 'proj') {
      const id = key.slice(5);
      return /^g-p-/.test(id) ? id : null;      // 防止 proj: 后跟空串
    }
    const name = folderProjNameFromKey(key);
    if (!name) return null;
    const cached = folderProjIdByName[name];
    if (cached) return cached;

    // 1) 当前页就是这个项目（URL 里有 /g/g-p-xxx/）。
    // 若名字缓存命中且一致，直接采用；名字拿不到（接口 403）时也采用 URL 的 id，
    // 因为用户此刻就在这个项目里，几乎不可能错——拿不到 id 反而整个功能瘫痪。
    const m = location.pathname.match(/\/g\/(g-p-[0-9a-f]+)/);
    if (m) {
      const known = API._gizmoCache && API._gizmoCache[m[1]];
      if (known == null || String(known).trim() === String(name).trim()) return m[1];
    }

    // 2) 纯接口：触发一次名字反查（异步），本轮先返回 null。
    // 不再读侧栏 —— 侧栏只是"已渲染的部分"，不适合当 ID 来源。
    if (!folderProjResolvePending[name]) {
      folderProjResolvePending[name] = true;
      folderResolveProjIdByName(name).then((id) => {
        folderProjResolvePending[name] = false;
        if (id) {
          // 拿到 id 后，把文件夹里的名字键迁移成 id 键，之后永久不用再反查。
          // 关键：迁移时必须把名字一并记进 projNames，
          // 否则 id 键没有对应名字，界面就只剩 "项目 g-p-xxxx"（实测踩到）。
          if (folderData) {
            let changed = false;
            const oldKey = folderProjKeyByName(name);
            const newKey = folderKeyOf('proj', id);
            folderRememberProjName(id, name);
            for (const f of folderData.folders) {
              const i = f.items.indexOf(oldKey);
              if (i >= 0 && f.items.indexOf(newKey) < 0) {
                f.items[i] = newKey;
                changed = true;
              }
            }
            if (changed) saveFolders();
          }
          folderRenderedSig = '';
          renderFolders();
        }
      }).catch(() => { folderProjResolvePending[name] = false; });
    }
    return null;
  }

  // 判断某个 gizmo id 对应的项目名是否等于 name（用 API.getGizmoName 的缓存）。
  // 缓存里没有就返回"未知"，此时保守地认为不匹配，交给其它路径去找。
  function folderNativeProjectNameIs(gid, name) {
    if (!gid || !name) return false;
    const known = API._gizmoCache && API._gizmoCache[gid];
    if (known == null) {
      // 顺手预热缓存
      Promise.resolve().then(() => API.getGizmoName(gid)).catch(() => {});
      return false;
    }
    return String(known).trim() === String(name).trim();
  }

  // 项目名 -> gizmo id 的解析结果缓存
  const folderProjIdByName = Object.create(null);

  // 用项目名在用户的 gizmo 列表里反查 id（只查一次，结果进缓存）
  // 把侧栏里出现过的 gizmo id 都收集起来（含项目内会话链接 /g/g-p-xxx/c/yyy）
  // 收集已知的 gizmo id（纯接口 + URL）。
  // 侧栏不参与：它只包含已渲染的部分，不该被当作数据源。
  function folderCollectGizmoIds() {
    const ids = new Set();
    // 已知映射里的 id
    for (const k of Object.keys(folderProjIdByName)) {
      const id = folderProjIdByName[k];
      if (id) ids.add(id);
    }
    // 当前页面所在项目
    const cur = location.pathname.match(/\/g\/(g-p-[0-9a-f]+)/);
    if (cur) ids.add(cur[1]);
    // 已缓存的项目会话
    for (const k of Object.keys(folderProjConvCache)) {
      const m = String(k).match(/^proj:(g-p-[0-9a-f]+)$/);
      if (m) ids.add(m[1]);
    }
    return [...ids];
  }

  // 用项目名反查 gizmo id：拿侧栏里的候选 id 逐个问名字，命中即返回。
  // 这比猜接口路径稳妥，且 API.getGizmoName 自带缓存，不会重复请求。
  // 用项目名反查 gizmo id（纯接口）。
  // 先问项目列表（一次拿全量，最省）；不行再从候选 id 里逐个问名字。
  async function folderResolveProjIdByName(name) {
    if (!name) return null;
    if (folderProjIdByName[name]) return folderProjIdByName[name];

    // 1) 项目列表接口：一次就能建立"名字 -> id"的全量映射
    try {
      const list = await craberListProjects();
      for (const p of list) {
        if (!p.name || !p.id) continue;
        folderProjIdByName[p.name] = p.id;
      }
      if (folderProjIdByName[name]) {
        folderRenderedSig = '';
        return folderProjIdByName[name];
      }
    } catch (e) { /* 继续走候选 */ }

    // 2) 候选 id 逐个问名字
    const cands = folderCollectGizmoIds();
    for (const gid of cands) {
      try {
        let gn = await API.getGizmoName(gid);
        if (!gn) gn = await folderFetchProjNameCookie(gid);
        if (gn) folderProjIdByName[String(gn).trim()] = gid;
        if (gn && String(gn).trim() === String(name).trim()) {
          folderRenderedSig = '';
          return gid;
        }
      } catch (e) { /* 单个失败不影响其它候选 */ }
    }
    return null;
  }

  // 同步读缓存（渲染用）。缓存空则触发一次异步拉取，拉完清签名重画。
  // 关键：接口返回为空时，仍要保留侧栏已渲染的会话，不能直接显示"没有会话"。
  function folderProjConvs(key) {
    const kind = folderItemKindOf(key);
    const gid = folderProjGizmoId(key);
    const cacheKey = kind === 'proj' ? key : (gid ? folderKeyOf('proj', gid) : key);

    // 已缓存：直接用。
    // 注意：项目有 proj:<id> 与 projname:<名字> 两种键，任一种命中都算有数据。
    if (folderProjConvCache[cacheKey]) return folderProjConvCache[cacheKey];
    if (gid) {
      const byId = folderProjConvCache[folderKeyOf('proj', gid)];
      if (byId) {
        folderProjConvCache[cacheKey] = byId;
        folderProjConvState[cacheKey] = 'done';
        return byId;
      }
    }
    // 反向：只有 projname 键有数据时，proj:<id> 也认它
    if (kind === 'proj' && folderProjConvCache[cacheKey]) {
      folderProjConvState[cacheKey] = 'done';
    }

    // 没缓存：侧栏兜底（当前已渲染的部分先顶上），同时后台拉全量
    const fallback = folderProjConvsFromSidebar(gid);
    // error 状态到点后允许重试（Cloudflare 限流过去就好了）
    if (folderProjConvState[cacheKey] === 'error') {
      const at = folderProjConvRetryAt[cacheKey] || 0;
      if (Date.now() >= at) {
        delete folderProjConvState[cacheKey];
        delete folderProjConvRetryAt[cacheKey];
      }
    }
    if (folderProjConvState[cacheKey] !== 'loading' && folderProjConvState[cacheKey] !== 'done') {
      folderProjConvState[cacheKey] = 'loading';
      if (gid) {
        // 项目条通常也在拉同一个项目：先等一下它，能省掉一次重复请求
        const waitPbar = (pbarForProject === gid && pbarConvs && pbarConvs.length)
          ? Promise.resolve()
          : new Promise((r) => setTimeout(r, 600));
        waitPbar.then(() => {
          // 等的这一会儿项目条可能已经把数据喂过来了
          if (folderProjConvCache[cacheKey] || folderProjConvCache[folderKeyOf('proj', gid)]) {
            folderProjConvState[cacheKey] = 'done';
            folderRenderedSig = '';
            return null;
          }
          return folderLoadProjConvs(key, gid);
        }).catch(() => {
          // 失败：先把侧栏已有的顶上，标记 error 但允许 30 秒后自动重试
          if (fallback.length) {
            folderProjConvCache[cacheKey] = fallback;
            folderProjConvState[cacheKey] = 'done';
          } else {
            folderProjConvState[cacheKey] = 'error';
            folderProjConvRetryAt[cacheKey] = Date.now() + 30000;
          }
          folderRenderedSig = '';
        });
      } else if (kind === 'projname') {
        // 没有 gizmo id：先按名字反查，拿到 id 后再拉会话
        const nm = folderProjNameFromKey(key);
        folderResolveProjIdByName(nm).then((id) => {
          if (!id) {
            folderProjConvState[cacheKey] = 'done';
            folderRenderedSig = '';
            return;
          }
          folderProjIdByName[nm] = id;
          return folderLoadProjConvs(key, id);
        }).catch(() => { folderProjConvState[cacheKey] = 'error'; });
      } else {
        folderProjConvState[cacheKey] = 'done';
      }
    }
    return fallback;
  }

  // 从侧栏 DOM 兜底（首屏先有东西可看）
  function folderProjConvsFromSidebar(gid) {
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (!nav || !gid) return [];
    const out = [];
    const seen = new Set();
    nav.querySelectorAll('a[href]').forEach((a) => {
      const entry = folderEntryFromHref(a.getAttribute('href'));
      if (!entry || entry.kind !== 'conv') return;
      const href = a.getAttribute('href') || '';
      const gm = href.match(/\/g\/(g-p-[0-9a-f]+)\//);
      if (!gm || gm[1] !== gid) return;
      if (seen.has(entry.id)) return;
      seen.add(entry.id);
      folderRememberHref(entry, href);
      out.push({ key: entry.key, label: folderEntryTitle(a), href });
    });
    return out;
  }

  // 吸收「项目条」已经拉到的会话列表，直接写进文件夹缓存。
  // 项目条与文件夹用的是同一个接口，没必要各请求一次。
  function folderAbsorbProjectConvs(gid, convs) {
    if (!gid || !Array.isArray(convs) || !convs.length) return;
    const list = convs.map((c) => {
      const id = c.id;
      if (!id) return null;
      const title = c.title || '未命名对话';
      const k = folderKeyOf('conv', id);
      folderTitleCache[k] = title;
      folderHrefCache[id] = '/g/' + gid + '/c/' + id;
      return { key: k, label: title, href: folderHrefCache[id] };
    }).filter(Boolean);
    if (!list.length) return;
    const pk = folderKeyOf('proj', gid);
    folderProjConvCache[pk] = list;
    folderProjConvState[pk] = 'done';
    // 这个项目名与 id 的对应关系也记住：之后 projname 键直接能查到数据
    try {
      API.getGizmoName(gid).then((nm) => {
        if (!nm) return;
        folderProjIdByName[String(nm).trim()] = gid;
        const nk = folderProjKeyByName(String(nm).trim());
        folderProjConvCache[nk] = list;
        folderProjConvState[nk] = 'done';
        folderRenderedSig = '';
      }).catch(() => {});
    } catch (e) { /* 忽略 */ }
    // projname 形式的键也指同一份：既查反查表，也扫一遍文件夹里实际出现的项目键
    const nameKeys = [];
    for (const nm of Object.keys(folderProjIdByName)) {
      if (folderProjIdByName[nm] === gid) nameKeys.push(nm);
    }
    // 文件夹里可能已经存了 projname 形式的键（名字反查还没跑过时）
    if (folderData) {
      for (const f of folderData.folders) {
        for (const k of f.items) {
          if (k.indexOf('projname:') === 0) nameKeys.push(folderProjNameFromKey(k));
        }
      }
    }
    for (const nm of nameKeys) {
      if (!nm) continue;
      const nk = folderProjKeyByName(nm);
      folderProjConvCache[nk] = list;
      folderProjConvState[nk] = 'done';
      folderProjIdByName[nm] = gid;      // 顺手记住映射，后续不用再反查
    }
    folderRenderedSig = '';
  }

  // 拉项目会话的真实请求：带退避重试。
  // 403/429 多是 Cloudflare 限流（连开多个标签、刷新过快都会触发），
  // 等一会儿再试基本就好了，所以这里不一次失败就放弃。
  async function folderFetchProjConvs(gid) {
    const delays = [0, 900, 2200];        // 三次机会
    let lastErr = null;
    for (let attempt = 0; attempt < delays.length; attempt++) {
      if (delays[attempt]) await new Promise((r) => setTimeout(r, delays[attempt]));
      try {
        let tok = null;
        try { tok = await API.getToken(); } catch (e) { tok = null; }
        const headers = tok ? { Authorization: 'Bearer ' + tok } : {};
        const all = [];
        let offset = 0;
        let total = Infinity;
        while (offset < total && offset < 500) {
          const r = await fetch('/backend-api/gizmos/' + gid
            + '/conversations?offset=' + offset + '&limit=50',
            { headers, credentials: 'include' });
          // 5xx / 429：值得重试
          if (r.status === 429 || r.status >= 500) {
            throw new Error('项目对话获取失败 ' + r.status);
          }
          if (!r.ok) {
            const e = new Error('项目对话获取失败 ' + r.status);
            e.permanent = true;             // 401/403/404 重试没意义
            throw e;
          }
          const j = await r.json();
          const items = j.items || [];
          total = j.total != null ? j.total : all.length + items.length;
          for (const c of items) all.push(c);
          if (!items.length) break;
          offset += 50;
        }
        return all;
      } catch (e) {
        lastErr = e;
        if (e.permanent) break;             // 权限/不存在：不再重试
        console.warn('[gpt-craber] 项目会话第 ' + (attempt + 1) + ' 次失败，稍后重试', e.message);
      }
    }
    throw lastErr || new Error('项目对话获取失败');
  }

  // 走后端接口拉该项目全部会话（与「项目条」同一个接口，已按 50 分页）
  async function folderLoadProjConvs(key, gid) {
    // 防呆：gid 为空会拼出 /gizmos//conversations → 404，直接判错
    if (!gid || String(gid).indexOf('g-p-') !== 0) {
      throw new Error('无效的项目 ID: ' + gid);
    }
    const all = await folderFetchProjConvs(gid);
    // 接口字段名不完全统一：主键可能是 id / conversation_id，标题可能是 title / name
    const list = all.map((c) => {
      const id = c.id || c.conversation_id || (c.conversation && c.conversation.id);
      if (!id) return null;                    // 没有 id 的条目直接丢弃，别塞空壳
      const title = c.title || c.name
        || (c.conversation && c.conversation.title) || '未命名对话';
      const k = folderKeyOf('conv', id);
      folderTitleCache[k] = title;
      folderHrefCache[id] = '/g/' + gid + '/c/' + id;
      // 带上更新时间：添加对话框要按日期筛选
      const updated = c.update_time || c.create_time || null;
      return { key: k, label: title, href: folderHrefCache[id], updated: updated };
    }).filter(Boolean);
    console.log('[gpt-craber] 项目会话拉取', gid, '原始条目', all.length, '有效', list.length,
      all.length ? '示例字段: ' + Object.keys(all[0]).slice(0, 8).join(',') : '');
    folderProjConvCache[folderKeyOf('proj', gid)] = list;
    folderProjConvCache[key] = list;      // projname 键也指同一份
    folderProjConvState[key] = 'done';
    folderProjConvState[folderKeyOf('proj', gid)] = 'done';
    folderRenderedSig = '';               // 让下一轮 tick 重画
    return list;
  }

  function folderBuildKid(f, key) {
    const kind = folderItemKindOf(key);
    const isProj = kind === 'proj' || kind === 'projname';
    const id = kind === 'proj' ? key.slice(5) : (kind === 'projname' ? key : key);
    const href = kind === 'conv' ? folderItemHref('conv', id) : null;
    const active = href ? folderIsActiveConv({ key, id }) : false;
    const row = folderEl('div', 'craber-folder-kid' + (active ? ' active' : ''));

    // 项目行前加展开箭头（会话行没有）
    let chev = null;
    if (isProj) {
      chev = folderEl('span', 'craber-folder-kid-chev');
      chev.innerHTML = FOLDER_CHEV;
      if (folderProjOpen[key]) row.classList.add('open');
    }

    const ico = folderEl('span', 'craber-folder-kid-ico');
    ico.innerHTML = isProj ? FOLDER_PROJ_ICON : FOLDER_CONV_ICON;
    // 标题优先用从原生行读到的真名；拿不到就先用 id 占位，等原生列表出现后刷新。
    // 注意：项目有 proj:<id> 和 projname:<名字> 两种键，
    // 前者的名字在 projNames 里，必须走 folderProjNameFromKey 才取得到。
    const known = isProj
      ? (folderTitleCache[key] || folderProjNameFromKey(key))
      : (folderTitleCache[key] || '');
    const name = folderEl('span', 'craber-folder-kid-name',
      known || (isProj ? '项目 ' + id.slice(0, 8) : '会话 ' + id.slice(0, 8)));
    name.title = known || href || '';
    if (!known) row.classList.add('craber-folder-stale');

    // 拖动排序：给行打上 key 标记，并接管按下/移动/抬手
    row.dataset.sortKey = key;
    row.dataset.sortFolder = f.id;
    folderBindSort(row, key, f);

    // 条目的"更多"菜单：移除等操作都收进菜单，避免行内误点（与原版一致的 ⋯ + 弹出菜单）
    const more = folderEl('button', 'craber-folder-kid-more', '⋯');
    more.type = 'button';
    more.title = '更多操作';
    more.setAttribute('aria-label', '更多操作');
    more.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderKidMenu(more, f, key, known || '', href);
    });

    // 点箭头 = 展开/收起子会话；点行本体 = 跳转项目/会话
    if (chev) {
      chev.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderToggleProjOpen(key, row);
      });
    }

    row.addEventListener('click', (e) => {
      if (more.contains(e.target)) return;
      if (folderJustSorted()) { e.preventDefault(); return; }   // 刚拖完排序，不要跳转
      if (href) { folderNavigate(href); return; }
      // 项目行：切换子会话展开/收起，不触发原生侧栏项目展开
      if (chev) {
        folderToggleProjOpen(key, row);
      }
    });

    if (chev) row.append(chev);
    row.append(ico, name, more);
    return row;
  }

  // 项目展开后渲染其子会话（紧跟在项目行之后）
  // 找某条会话归属的文件夹（菜单需要它做"从文件夹中移除"）。
  // 优先选第一个包含它的文件夹；都没有就返回一个占位对象，
  // 让菜单仍可显示会话操作（打开/重命名/归档…），只是没有文件夹相关项。
  function folderOwnerOfConv(key) {
    if (folderData) {
      for (const f of folderData.folders) {
        if (f.items.indexOf(key) >= 0) return f;
      }
    }
    return { id: '__none__', name: '未归入文件夹', open: true, items: [] };
  }

  function folderBuildKidSub(key) {
    const box = folderEl('div', 'craber-folder-kid-sub');
    box.dataset.for = key;
    // 用类控制而非 hidden：hidden 是瞬间切换，没法过渡
    box.classList.toggle('craber-collapsed', !folderProjOpen[key]);
    // 内层包裹：缩进放这里，折叠时才不留空白
    const inner = folderEl('div', 'craber-folder-kid-sub-in');
    box.append(inner);
    const convs = folderProjConvs(key);
    if (!convs.length) {
      const kind = folderItemKindOf(key);
      const gid = folderProjGizmoId(key);
      const st = folderProjConvState[key] || folderProjConvState[folderKeyOf('proj', gid || '')];
      let msg;
      if (!gid) msg = kind === 'projname' ? '（找不到该项目的 ID，无法读取会话）' : '（没有会话）';
      else if (st === 'loading') msg = '正在读取项目会话…';
      else if (st === 'error') msg = '（读取失败，可能被限流，30 秒后自动重试）';
      else msg = '（该项目没有会话）';
      inner.append(folderEl('div', 'craber-folder-empty', msg));
      return box;
    }
    for (const c of convs) {
      // 项目下的会话行：默认不展开到 34px（子层级更紧凑），但同样带 ⋯ 菜单
      const active = folderIsActiveConv(c);
      const r = folderEl('div', 'craber-folder-kid craber-folder-kid-nested' + (active ? ' active' : ''));
      const i = folderEl('span', 'craber-folder-kid-ico');
      i.innerHTML = FOLDER_CONV_ICON;
      const n = folderEl('span', 'craber-folder-kid-name', c.label);
      n.title = c.label;

      // 这条会话属于哪个文件夹：优先当前打开的文件夹（box 的上级），
      // 找不到就用第一个包含它的文件夹（菜单里的"从文件夹中移除"要落到具体文件夹）
      const ownerF = folderOwnerOfConv(c.key);
      const more = folderEl('button', 'craber-folder-kid-more', '⋯');
      more.type = 'button';
      more.title = '更多操作';
      more.setAttribute('aria-label', '更多操作');
      more.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderKidMenu(more, ownerF, c.key, c.label, c.href);
      });

      r.append(i, n, more);
      r.addEventListener('click', (e) => {
        if (more.contains(e.target)) return;
        if (folderJustSorted()) { e.preventDefault(); return; }   // 刚拖完排序，不要跳转
        folderNavigate(c.href);
      });
      inner.append(r);
    }
    return box;
  }

  // 从原生侧栏补齐已收藏条目的真名与真实 href，有变化就重画一次
  // 刚在本地改过名的条目：在原生侧栏追上之前，不允许被它的旧标题覆盖。
  // 结构是 key -> { title, until }。
  const folderTitleLock = Object.create(null);

  // 本地点改名后调用：把标题设为权威值并锁一段时间
  function folderSetTitleLocal(key, title, ttlMs) {
    folderTitleCache[key] = title;
    folderTitleLock[key] = { title: title, until: Date.now() + (ttlMs || 120000) };
    folderRenderedSig = '';
    renderFolders();
  }

  function folderHydrateTitles() {
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (!nav) return;
    let dirty = false;
    const now = Date.now();
    nav.querySelectorAll('a[href]').forEach((a) => {
      const entry = folderEntryFromHref(a.getAttribute('href'));
      if (!entry) return;
      folderRememberHref(entry, a.getAttribute('href'));
      const title = folderEntryTitle(a);

      // 本地刚改过名：等原生侧栏回显新名字之前，忽略它的旧标题
      const lock = folderTitleLock[entry.key];
      if (lock) {
        if (now < lock.until) {
          if (title !== lock.title) return;    // 侧栏还是旧名，跳过
          delete folderTitleLock[entry.key];   // 侧栏已同步，解锁
        } else {
          delete folderTitleLock[entry.key];
        }
      }

      if (folderTitleCache[entry.key] !== title) {
        folderTitleCache[entry.key] = title;
        dirty = true;
      }
    });
    if (dirty && foldersEl) {
      folderRenderedSig = '';
      renderFolders();
    }
  }

  /* ---------- 「添加会话/项目到文件夹」选择器 ---------- */
  // 扫描侧栏里所有可见的会话和项目，弹出勾选列表，一次加入多个。
  // 从接口收集候选：不受侧栏是否渲染影响（项目收起了也能看到它的会话）
  // 分步收集候选，每有点进展就回调一次，让列表尽快出现内容。
  // 之前的写法是"项目 → 逐个项目拉会话 → 最近会话"全串行，全部拿完才渲染，
  // 项目一多就要等很久，期间一直显示"没有可添加的会话或项目"。
  // 候选列表的本地快照：下次打开先拿它秒开，后台再刷新
  let folderPickerSnapshot = null;
  let folderPickerLastError = '';   // 最近一次取候选失败的原因（供界面如实提示）

  async function folderPickerItemsFromApi(onProgress) {
    const items = [];
    const seen = new Set();
    const emit = () => { try { onProgress(items.slice()); } catch (e) { /* 渲染失败不影响取数 */ } };

    const push = (it) => {
      if (seen.has(it.key)) return;
      seen.add(it.key);
      items.push(it);
    };

    // 1) 项目与最近会话：两者互不依赖，并行发出去
    const projectsP = craberListProjects().catch(() => []);

    // 最近会话：失败时把原因记下来，界面要如实提示，
    // 不能一律显示"没有可添加的"（那是把错误伪装成空结果）。
    let recentErr = null;
    const recentP = craberApi('/backend-api/conversations?offset=0&limit=100&order=updated')
      .catch((e) => { recentErr = e && e.message ? e.message : '请求失败'; return null; });

    // 先到先显示：最近会话通常最快
    recentP.then((j) => {
      for (const c of (j && j.items) || []) {
        const id = c.id;
        if (!id) continue;
        const title = c.title || '未命名对话';
        folderTitleCache[folderKeyOf('conv', id)] = title;
        // 带上更新时间：对话框要按日期筛选
        push({ key: folderKeyOf('conv', id), label: title, kind: 'conv',
          updated: c.update_time || c.create_time || null });
      }
      if (recentErr && !(j && j.items && j.items.length)) {
        folderPickerLastError = '读取会话列表失败：' + recentErr;
      }
      emit();
    });

    const projects = await projectsP;
    for (const p of projects) {
      if (p.id) folderProjIdByName[p.name] = p.id;   // 有 id 才记，便于直接拉会话
      // 有 id 就用 proj:<id> 作为键 —— 这样加入文件夹后不需要反查，
      // 直接就能拉会话。只有拿不到 id 时才退回名字键。
      const hasId = p.id && /^g-p-[0-9a-f]+$/.test(String(p.id));
      push({
        key: hasId ? folderKeyOf('proj', p.id) : folderProjKeyByName(p.name),
        label: p.name,
        kind: hasId ? 'proj' : 'projname',
        gid: p.id || null
      });
    }
    emit();

    // 2) 各项目内的会话：并行拉，谁先回来谁先显示。
    // 没有 id 的项目（只从侧栏拿到名字）先用名字反查一次 id。
    await Promise.all(projects.map(async (p) => {
      let gid = p.id;
      if (!gid) {
        gid = await folderResolveProjIdByName(p.name).catch(() => null);
        if (gid) folderProjIdByName[p.name] = gid;
      }
      if (!gid) return;                     // 实在解析不出来，就只显示项目本身
      const cached = folderProjConvCache[folderKeyOf('proj', gid)];
      const list = cached || await folderLoadProjConvs(folderProjKeyByName(p.name), gid)
        .catch(() => []);
      for (const c of list || []) {
        push({ key: c.key, label: c.label, kind: 'conv', inProj: p.name,
          updated: c.updated || null });
      }
      emit();
    }));

    if (items.length) folderPickerSnapshot = items.slice();   // 存快照给下次秒开
    return items;
  }

  // 添加到文件夹：用对话框展示全部项目与会话。
  // - 已在文件夹里的条目会打勾并置灰（不可点）
  // - 支持批量勾选后一次确认
  // - 读取过程中先显示已有快照/DOM 结果，接口回来再增量刷新
  function folderOpenAddPicker(anchor, f) {
    folderClosePjify();

    // picker-body：页签/筛选固定，列表自己滚动，弹窗整体不滚动
    const body = folderEl('div', 'craber-dlg-body craber-picker-body');

    // 两个页签：会话 / 项目。各自独立列表，但共享同一个"已选"集合。
    // 混在一个列表里时项目常被会话挤到很下面，找项目要滚半天。
    const TABS = [
      { id: 'conv', label: '会话' },
      { id: 'proj', label: '项目' }
    ];
    let activeTab = 'conv';

    // 搜索 + 日期筛选（只在"会话"页签有意义，切到项目页签时隐藏）
    const filterBar = folderEl('div', 'craber-dlg-filter');
    const searchBox = craberSearchBox('搜索标题…');
    const searchEl = searchBox.input;
    const chips = folderEl('div', 'craber-dlg-chips');
    const DATE_OPTS = [
      { v: 'all', t: '全部' }, { v: '7', t: '近7天' },
      { v: '15', t: '近15天' }, { v: '30', t: '近30天' },
      { v: 'custom', t: '自定义' }
    ];
    let dateRange = 'all';
    const radios = {};
    for (const o of DATE_OPTS) {
      const lab = folderEl('label', 'craber-dlg-chip');
      const r = document.createElement('input');
      r.type = 'radio';
      r.name = 'craber-dlg-date';
      r.value = o.v;
      if (o.v === 'all') r.checked = true;
      const sp = folderEl('span', null, o.t);
      lab.append(r, sp);
      r.addEventListener('change', () => {
        if (!r.checked) return;
        dateRange = o.v;
        customRow.hidden = o.v !== 'custom';
        renderAll();
      });
      radios[o.v] = r;
      chips.append(lab);
    }
    const customRow = folderEl('div', 'craber-dlg-custom');
    const fromEl = document.createElement('input');
    fromEl.type = 'date';
    fromEl.className = 'craber-dlg-date';
    const sep = folderEl('span', 'craber-dlg-datesep', '至');
    const toEl = document.createElement('input');
    toEl.type = 'date';
    toEl.className = 'craber-dlg-date';
    customRow.append(fromEl, sep, toEl);
    customRow.hidden = true;
    fromEl.addEventListener('change', () => renderAll());
    toEl.addEventListener('change', () => renderAll());
    searchEl.addEventListener('input', () => renderAll());
    filterBar.append(searchBox.el, chips, customRow);

    const tabBar = folderEl('div', 'craber-dlg-tabs');
    const tabBtns = {};
    for (const t of TABS) {
      const b = folderEl('button', 'craber-dlg-tab', t.label);
      b.type = 'button';
      b.dataset.tab = t.id;
      b.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (activeTab === t.id) return;
        activeTab = t.id;
        syncTabs();
        renderAll();
      });
      tabBtns[t.id] = b;
      tabBar.append(b);
    }
    body.append(tabBar, filterBar);

    // 每个页签的工具条 + 列表 + 加载提示
    const panes = {};
    for (const t of TABS) {
      const pane = folderEl('div', 'craber-dlg-pane');
      pane.dataset.tab = t.id;

      // 「全选」复选框放在右侧，和下面每一行的复选框对齐成一条竖线；
      // 左侧只留文字，右侧是复选框列，视觉上更像原生多选列表。
      const toolbar = folderEl('div', 'craber-dlg-toolbar');
      const cnt = folderEl('span', 'craber-dlg-count', '');
      const allWrap = folderEl('label', 'craber-dlg-all');
      const allLabel = folderEl('span', 'craber-dlg-all-label', '全选');
      const allBox = document.createElement('span');
      allBox.className = 'craber-dlg-check';
      allWrap.append(allLabel, allBox);
      toolbar.append(cnt, allWrap);

      const listBox = folderEl('div', 'craber-dlg-list');
      const tip = folderEl('div', 'craber-dlg-loading');
      const spin = folderEl('span', 'craber-dlg-spin');
      const tipTxt = folderEl('span', null, '正在读取…');
      tip.append(spin, tipTxt);
      tip.hidden = true;

      pane.append(toolbar, listBox, tip);
      body.append(pane);
      panes[t.id] = { pane, allWrap, allBox, cnt, listBox, tip, spin, tipTxt };
    }

    // 已选集合（两个页签共享，确认时一次提交）
    const picked = new Set();
    let allItems = [];
    let pickerLoading = true;      // 接口还没回来时，空列表显示"读取中"

    const dlg = craberDialog({
      title: '添加到「' + f.name + '」',
      subtitle: '选择要放进这个文件夹的项目或会话',
      body,
      confirmText: '添加',
      cancelText: '取消',
      onConfirm: (close) => {
        if (!picked.size) { close(); return; }
        let added = 0;
        for (const key of picked) {
          const it0 = allItems.find((x) => x.key === key);
          if (folderAddItem(f, key, it0 && it0.label)) added++;
          else if (f.items.indexOf(key) < 0) { f.items.push(key); added++; }
          // 项目：把名字一并存下来（key 里只有 id，光靠 id 显示不出名字，
          // 每次再反查接口既慢又可能失败）
          if (key.indexOf('proj:') === 0) {
            const it = allItems.find((x) => x.key === key);
            const gid = key.slice(5);
            const nm = (it && it.label) || folderProjNameFromKey(key);
            if (nm) folderRememberProjName(gid, nm);
          }
        }
        saveFolders();
        close();
        renderFolders();
        if (added) navToast('已添加 ' + added + ' 项到「' + f.name + '」');
      }
    });

    // 确认按钮随选择数量变化
    const okBtn = dlg.root.querySelector('.craber-dlg-primary');
    const syncOk = () => {
      if (!okBtn) return;
      okBtn.textContent = picked.size ? ('添加 ' + picked.size + ' 项') : '添加';
      okBtn.disabled = picked.size === 0;
    };
    syncOk();

    const syncTabs = () => {
      for (const t of TABS) {
        const on = activeTab === t.id;
        tabBtns[t.id].classList.toggle('on', on);
        panes[t.id].pane.hidden = !on;
      }
      // 搜索与日期筛选只对会话有效，项目页签隐藏这一栏
      filterBar.hidden = activeTab !== 'conv';
    };

    // 某个页签对应的条目。
    // 项目有两种 kind：proj（有 id 的 proj:<id> 键）与 projname（只有名字）。
    // 只判断 projname 会把项目的 id 形式错分到"会话"页签里（实测踩到）。
    const isProjItem = (it) => it.kind === 'proj' || it.kind === 'projname';
    const itemsOf = (tab) => (tab === 'proj'
      ? allItems.filter(isProjItem)
      : allItems.filter((it) => !isProjItem(it)));

    // 渲染单个页签
    // 会话的日期范围判断（与"多会话导出"面板同一套语义）
    const inDateRange = (it) => {
      if (dateRange === 'all') return true;
      const ts = it.updated ? new Date(it.updated).getTime() : 0;
      if (!ts) return false;                  // 没有时间的条目在筛选时不显示
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
      const days = parseInt(dateRange, 10);
      if (!days) return true;
      return ts >= Date.now() - days * 24 * 60 * 60 * 1000;
    };

    const paintTab = (tab) => {
      const P = panes[tab];
      // 会话页签：搜索 + 日期筛选；项目页签不筛选
      const kw = (searchEl.value || '').trim().toLowerCase();
      const list = itemsOf(tab).filter((it) => {
        if (tab !== 'conv') return true;
        if (kw && String(it.label || '').toLowerCase().indexOf(kw) < 0) return false;
        return inDateRange(it);
      });

      P.listBox.innerHTML = '';

      // 计数：已在此文件夹中的数量 / 总数
      const inCount = list.filter((it) => f.items.indexOf(it.key) >= 0).length;
      P.cnt.textContent = list.length
        ? (inCount ? inCount + ' / ' + list.length + ' 已添加' : list.length + ' 项')
        : '';

      // 「全选」复选框状态：全选 / 部分（用减号表示）/ 未选
      const selectable = list.filter((it) => f.items.indexOf(it.key) < 0);
      const pickedCount = selectable.filter((it) => picked.has(it.key)).length;
      const allOn = selectable.length > 0 && pickedCount === selectable.length;
      const someOn = pickedCount > 0 && !allOn;
      P.allBox.classList.toggle('on', allOn);
      P.allBox.classList.toggle('partial', someOn);
      P.allBox.classList.toggle('locked', selectable.length === 0);
      P.allBox.innerHTML = allOn ? FOLDER_CHECK
        : (someOn ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"'
          + ' stroke-linecap="round"><path d="M6 12h12"/></svg>' : '');

      if (!list.length) {
        // 读取中才显示转圈；读取完成后仍为空则显示空文案
        P.tip.hidden = false;
        P.spin.hidden = !pickerLoading;
        const filtered = tab === 'conv' && (kw || dateRange !== 'all');
        P.tipTxt.textContent = pickerLoading
          ? '正在读取' + (tab === 'proj' ? '项目' : '会话') + '…'
          : (folderPickerLastError && tab === 'conv'
            ? folderPickerLastError
            : (filtered ? '没有匹配的会话' : '没有可添加的' + (tab === 'proj' ? '项目' : '会话')));
        return;
      }
      P.tip.hidden = true;

      for (const item of list) {
        const inFolder = f.items.indexOf(item.key) >= 0;
        const on = picked.has(item.key);
        const row = folderEl('div', 'craber-dlg-item' + (inFolder ? ' is-added' : ''));
        row.dataset.key = item.key;

        const ic = folderEl('span', 'craber-dlg-item-ico');
        ic.innerHTML = isProjItem(item) ? FOLDER_PROJ_ICON : FOLDER_CONV_ICON;

        const nm = folderEl('span', 'craber-dlg-item-name', item.label);
        nm.title = isProjItem(item)
          ? ('项目 · ' + item.label)
          : (item.inProj ? ('项目内会话 · ' + item.inProj) : '最近会话');

        const ck = folderEl('span', 'craber-dlg-check' + (inFolder ? ' on locked' : (on ? ' on' : '')));
        if (inFolder || on) ck.innerHTML = FOLDER_CHECK;

        row.append(ic, nm, ck);

        if (inFolder) {
          row.title = '已在此文件夹中';
        } else {
          row.addEventListener('click', () => {
            if (picked.has(item.key)) picked.delete(item.key);
            else picked.add(item.key);
            paintTab(tab);      // 重画这一页（勾选态即时反映）
            syncOk();
          });
        }
        P.listBox.append(row);
      }
    };

    const renderAll = () => { paintTab('conv'); paintTab('proj'); };

    // 「全选」复选框：点击在"全选"与"全不选"之间切换，只作用于当前页签
    for (const t of TABS) {
      const tab = t.id;
      panes[tab].allWrap.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const list = itemsOf(tab).filter((it) => f.items.indexOf(it.key) < 0);
        const allOn = list.length > 0 && list.every((it) => picked.has(it.key));
        if (allOn) for (const it of list) picked.delete(it.key);
        else for (const it of list) picked.add(it.key);
        paintTab(tab);
        syncOk();
      });
    }

    // 只用接口数据：上次的快照先顶上（秒开），随后接口增量刷新。
    // 不再读侧栏 DOM —— DOM 里只有已渲染的部分，拿它当数据源会误导。
    allItems = (folderPickerSnapshot && folderPickerSnapshot.length)
      ? folderPickerSnapshot.slice()
      : [];
    syncTabs();
    renderAll();

    const mergeIn = (incoming) => {
      // 增量合并（按 key 去重），保留已有顺序
      const seen = new Set(allItems.map((x) => x.key));
      for (const it of incoming) {
        if (seen.has(it.key)) continue;
        seen.add(it.key);
        allItems.push(it);
      }
      renderAll();
    };

    folderPickerLastError = '';
    folderPickerItemsFromApi((items) => {
      if (!craberDialogStack.length) return;
      if (!items.length) return;
      pickerLoading = false;
      mergeIn(items);
    }).then((items) => {
      if (!craberDialogStack.length) return;
      pickerLoading = false;
      if (items.length) mergeIn(items);
      renderAll();
    }).catch((e) => {
      pickerLoading = false;
      // 只用接口数据：失败就如实报错，不拿侧栏 DOM 凑数
      if (!allItems.length) {
        folderPickerLastError = '读取失败：' + (e && e.message ? e.message : '未知错误');
      }
      renderAll();
    });
  }

  // 关闭按钮的 ×：用描边 SVG 而不是字符，各平台字体下粗细一致
  const DLG_CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';

  /* ---------- 仿原生的对话框组件 ---------- */
  // 原版对话框特征（按截图还原）：居中、白色圆角卡片、大标题 + 灰色副标题、
  // 输入框蓝框聚焦、右下角「取消」（浅底）+「保存」（黑色实心）按钮。
  // 统一在这里实现，替换掉 window.prompt / window.confirm，避免丑陋的原生弹窗。

  /* 对话框栈
   * 之前是单例：开新对话框会先把旧的关掉。于是"设置中心里点【选择项目】"
   * 会连带关掉设置中心 —— 子对话框必须能叠在父对话框之上。
   * 现在用栈：每层记录自己的容器节点与关闭回调，Esc / 点遮罩只作用于最上层。
   */
  const craberDialogStack = [];

  function craberDialogTop() {
    return craberDialogStack.length ? craberDialogStack[craberDialogStack.length - 1] : null;
  }

  // 关闭最上层对话框；不传 layer 就关栈顶
  function craberDialogClose(layer) {
    const target = layer || craberDialogTop();
    if (!target) return;
    const idx = craberDialogStack.indexOf(target);
    if (idx >= 0) craberDialogStack.splice(idx, 1);
    if (target.el && target.el.parentElement) target.el.remove();
    // 恢复下层对话框的可交互状态
    const below = craberDialogTop();
    if (below && below.el) below.el.classList.remove('craber-dlg-behind');
    if (!craberDialogStack.length) {
      document.removeEventListener('keydown', craberDialogKeydown, true);
    }
    const cb = target.onClose;
    target.onClose = null;
    if (cb) { try { cb(); } catch (e) { /* 忽略 */ } }
  }

  function craberDialogKeydown(e) {
    if (e.key !== 'Escape') return;
    const top = craberDialogTop();
    if (!top) return;
    // 输入框里的 Esc 也当关闭处理，和原生弹层一致
    e.preventDefault();
    e.stopPropagation();
    craberDialogClose(top);
  }

  // opts: { title, subtitle, body(el), confirmText, cancelText, onConfirm(close), danger }
  function craberDialog(opts) {
    const o = opts || {};

    // 压栈后才登记回调：关闭时按层取，互不干扰
    const layer = { el: null, onClose: typeof o.onClose === 'function' ? o.onClose : null };
    craberDialogStack.push(layer);

    // 下层对话框压暗，视觉上区分层级
    const below = craberDialogStack.length > 1
      ? craberDialogStack[craberDialogStack.length - 2] : null;
    if (below && below.el) below.el.classList.add('craber-dlg-behind');

    const mask = folderEl('div', 'craber-dlg-mask');
    // wide：设置中心这类双栏页面需要更宽的容器
    const dlg = folderEl('div', 'craber-dlg' + (o.wide ? ' craber-dlg-wide' : ''));
    mask.append(dlg);

    // 标题栏：可选图标 + 标题/副标题（叠成一组，副标题不再单独占一行）+ 右侧关闭 ×
    const hd = folderEl('div', 'craber-dlg-hd');
    if (o.icon) {
      const mark = folderEl('div', 'craber-dlg-mark');
      mark.innerHTML = o.icon;
      hd.append(mark);
    }
    const headText = folderEl('div', 'craber-dlg-headtext');
    headText.append(folderEl('div', 'craber-dlg-title', o.title || ''));
    if (o.subtitle) headText.append(folderEl('div', 'craber-dlg-sub', o.subtitle));
    hd.append(headText);
    if (o.badge) hd.append(folderEl('span', 'craber-dlg-badge', o.badge));
    const x = folderEl('button', 'craber-dlg-x');
    x.type = 'button';
    x.innerHTML = DLG_CLOSE_SVG;
    x.setAttribute('aria-label', '关闭');
    x.title = '关闭（Esc）';
    x.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); craberDialogClose(layer); });
    hd.append(x);
    dlg.append(hd);

    if (o.body) dlg.append(o.body);

    const ft = folderEl('div', 'craber-dlg-ft');
    // cancelText === null 表示不要"取消"（例如设置中心：标题栏的 × / Esc / 点遮罩都能关）
    const hasCancel = o.cancelText !== null;
    const cancel = folderEl('button', 'craber-dlg-btn', o.cancelText || '取消');
    cancel.type = 'button';
    cancel.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); craberDialogClose(layer); });
    // confirmText === null 表示"只有关闭按钮"，用于纯展示/操作面板
    const hasOk = o.confirmText !== null;
    const ok = folderEl('button', 'craber-dlg-btn craber-dlg-primary' + (o.danger ? ' craber-dlg-danger' : ''),
      o.confirmText || '保存');
    ok.type = 'button';
    ok.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (o.onConfirm) o.onConfirm(craberDialogClose);
      else craberDialogClose(layer);
    });
    // 额外的次级按钮（如"测试连接"），排在取消/确认左侧
    // 先挂上取消/确认，再插额外的次级按钮 —— 顺序不能反，
    // insertBefore 要求参照节点已经是子节点，否则抛 NotFoundError。
    if (hasCancel) ft.append(cancel);
    if (hasOk) ft.append(ok);

    if (Array.isArray(o.extraButtons)) {
      const extras = [];
      for (const eb of o.extraButtons) {
        if (!eb) continue;
        const btn = folderEl('button', 'craber-dlg-btn' + (eb.cls ? ' ' + eb.cls : ''),
          eb.label || '');
        btn.type = 'button';
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          if (eb.onClick) eb.onClick({ close: craberDialogClose, button: btn });
        });
        extras.push(btn);
      }
      if (extras.length) {
        // 顺序：[次级按钮…] [弹性空白] [取消] [保存]
        // 先插按钮、再插空白，否则空白会跑到最左边。
        // 没有取消按钮时，次级按钮直接追加即可。
        for (const b of extras) {
          if (hasCancel) ft.insertBefore(b, cancel);
          else ft.append(b);
        }
        if (hasCancel) ft.insertBefore(folderEl('div', 'craber-dlg-ft-spacer'), cancel);
        else ft.insertBefore(folderEl('div', 'craber-dlg-ft-spacer'), ft.firstChild);
      }
    }
    // 一个按钮都没有时不画底栏，卡片底部也不留白（设置中心那种"整页"面板）
    if (ft.childElementCount) {
      dlg.append(ft);
    } else {
      dlg.classList.add('craber-dlg-plain');
    }

    // 点遮罩关闭，点卡片内部不关闭
    mask.addEventListener('click', (e) => {
      if (e.target === mask) craberDialogClose(layer);
    });

    layer.el = mask;
    document.body.appendChild(mask);
    document.addEventListener('keydown', craberDialogKeydown, true);

    // 自动聚焦输入框
    const input = dlg.querySelector('input, textarea');
    if (input) setTimeout(() => { try { input.focus(); input.select && input.select(); } catch (e) {} }, 30);

    return { el: mask, root: dlg, close: () => craberDialogClose(layer) };
  }

  // 单行输入对话框（替代 window.prompt）
  function craberPromptDialog(opts) {
    const o = opts || {};
    const wrap = folderEl('div', 'craber-dlg-body');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'craber-dlg-input';
    input.value = o.value || '';
    input.placeholder = o.placeholder || '';
    wrap.append(input);

    if (o.hint) wrap.append(folderEl('div', 'craber-dlg-hint', o.hint));

    const submit = () => {
      const v = String(input.value || '').trim();
      if (!v) { input.focus(); return; }
      craberDialogClose();
      if (o.onOk) o.onOk(v);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });

    craberDialog({
      title: o.title,
      subtitle: o.subtitle,
      body: wrap,
      confirmText: o.confirmText || '保存',
      cancelText: o.cancelText || '取消',
      onConfirm: submit
    });
  }

  // 确认对话框（替代 window.confirm）
  function craberConfirmDialog(opts) {
    const o = opts || {};
    const wrap = folderEl('div', 'craber-dlg-body');
    if (o.message) wrap.append(folderEl('div', 'craber-dlg-text', o.message));
    craberDialog({
      title: o.title,
      subtitle: o.subtitle,
      body: wrap,
      confirmText: o.confirmText || '确认',
      cancelText: o.cancelText || '取消',
      danger: !!o.danger,
      onConfirm: (close) => { close(); if (o.onOk) o.onOk(); }
    });
  }

  /* ---------- 与原版对齐的会话操作（真实接口） ---------- */

  // 统一的 backend-api 请求：token 拿不到时退回纯 cookie
  async function craberApi(path, opts) {
    opts = opts || {};
    let tok = null;
    try { tok = await API.getToken(); } catch (e) { tok = null; }
    const headers = Object.assign({}, opts.headers || {});
    if (tok) headers.Authorization = 'Bearer ' + tok;
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const r = await fetch(path, {
      method: opts.method || 'GET',
      headers,
      credentials: 'include',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!r.ok) throw new Error('请求失败 ' + r.status);
    try { return await r.json(); } catch (e) { return null; }
  }

  // 重命名会话
  async function craberRenameConv(convId, newTitle) {
    return craberApi('/backend-api/conversation/' + convId, {
      method: 'PATCH',
      body: { title: newTitle }
    });
  }

  // 删除会话
  async function craberDeleteConv(convId) {
    return craberApi('/backend-api/conversation/' + convId, { method: 'DELETE' });
  }

  // 归档 / 取消归档
  async function craberArchiveConv(convId, archived) {
    return craberApi('/backend-api/conversation/' + convId, {
      method: 'PATCH',
      body: { is_archived: !!archived }
    });
  }

  // 置顶 / 取消置顶
  // 实测确认：PATCH /backend-api/conversation/{id}
  //   body { pinned_time: <秒级时间戳> | null, is_pinned: bool }
  //   → 200 {"success":true}
  async function craberPinConv(convId, pinned) {
    return craberApi('/backend-api/conversation/' + convId, {
      method: 'PATCH',
      body: {
        pinned_time: pinned ? Date.now() / 1000 : null,
        is_pinned: !!pinned
      }
    });
  }


  // 置顶状态缓存：本地立刻反映 UI，不必等接口回包或页面重载
  const craberPinnedCache = (() => {
    try {
      const raw = localStorage.getItem('gpt_craber_pinned');
      return raw ? JSON.parse(raw) : Object.create(null);
    } catch (e) { return Object.create(null); }
  })();
  function craberSavePinned() {
    try { localStorage.setItem('gpt_craber_pinned', JSON.stringify(craberPinnedCache)); } catch (e) {}
  }

  // 把置顶的会话在文件夹条目里挪到最前面（置顶的就该在前面），取消则移除标记。
  function craberRepinInFolders(convId, pinned) {
    if (!folderData) return;
    const key = folderKeyOf('conv', convId);
    for (const f of folderData.folders) {
      const i = f.items.indexOf(key);
      if (i < 0) continue;
      if (pinned && i > 0) {
        f.items.splice(i, 1);
        f.items.unshift(key);
      }
    }
    saveFolders();
  }

  // 同步项目会话缓存里的置顶标记，并让该项目的会话列表重新排序。
  // 接口置顶成功后调用：这样文件夹里"项目下的会话"也会立刻把置顶项排到前面。
  function craberApplyPinToConvCache(convId, pinned, pinnedAt) {
    const apply = (list) => {
      if (!Array.isArray(list)) return false;
      let hit = false;
      for (const c of list) {
        if (c.key !== folderKeyOf('conv', convId)) continue;
        c.pinned = !!pinned;
        c.pinnedAt = pinned ? pinnedAt : 0;
        hit = true;
      }
      if (hit) {
        // 置顶优先，其余保持原有顺序
        list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      }
      return hit;
    };
    let changed = false;
    for (const k of Object.keys(folderProjConvCache)) {
      if (apply(folderProjConvCache[k])) changed = true;
    }
    if (changed) {
      folderRenderedSig = '';
      renderFolders();
    }
    return changed;
  }

  // 让原生侧栏重新拉会话列表，使置顶在原生区域也立刻体现。
  //
  // ChatGPT 是 SPA，没有公开的"刷新侧栏"接口，React 自己也不会因为我们改了
  // 数据就重取。可靠做法是触发一次 React Query 的失效：它的缓存挂在 window 上，
  // 找到 queryClient 后 invalidate 会话列表相关 key 即可，无需整页刷新。
  let craberRefreshTimer = null;
  function craberInvalidateConvQueries() {
    // 常见挂载点（不同版本位置不同，逐个探测）
    const roots = [window, window.__NEXT_DATA__, window.__REACT_QUERY_STATE__];
    for (const r of roots) {
      if (!r) continue;
      try {
        const qc = r.queryClient || r.__queryClient || (r.props && r.props.queryClient);
        if (qc && typeof qc.invalidateQueries === 'function') {
          qc.invalidateQueries();
          return true;
        }
      } catch (e) { /* 换下一个 */ }
    }
    return false;
  }

  function craberRefreshSidebarSoon() {
    if (craberRefreshTimer) return;
    craberRefreshTimer = setTimeout(() => {
      craberRefreshTimer = null;
      if (craberInvalidateConvQueries()) return;
      // 拿不到 queryClient：退一步让页面重新获得焦点，多数版本会顺带重取一次
      try { window.dispatchEvent(new Event('focus')); } catch (e) { /* 忽略 */ }
    }, 300);
  }

  function craberIsPinned(convId) {
    return !!craberPinnedCache[convId];
  }

  // 把会话移入/移出项目（gizmo）。projectId 为空表示移出项目。
  async function craberMoveConvToProject(convId, projectId) {
    return craberApi('/backend-api/conversation/' + convId, {
      method: 'PATCH',
      body: { gizmo_id: projectId || null }
    });
  }

  // 重命名项目。
  // 项目（gizmo）的名字在 gizmo.display.name 里，所以 PATCH 要按这个结构提交。
  // 依次尝试几种已知载荷格式，第一个成功的就用它，避免因字段猜测错而整体失败。
  async function craberRenameProject(gid, newName) {
    const name = String(newName || '').trim();
    if (!gid || !name) throw new Error('参数不完整');
    const payloads = [
      { gizmo: { display: { name } } },
      { display: { name } },
      { name }
    ];
    let lastErr = null;
    for (const body of payloads) {
      try {
        await craberApi('/backend-api/gizmos/' + gid, { method: 'PATCH', body });
        API._gizmoCache[gid] = name;          // 立即更新本地缓存
        folderProjIdByName[name] = gid;
        return true;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('重命名失败');
  }

  // 分享项目：先向接口申请一个分享链接，拿不到就返回 null 由调用方给出手动路径。
  async function craberShareProject(gid) {
    if (!gid) return null;
    const tries = [
      { path: '/backend-api/gizmos/' + gid + '/share', method: 'POST', body: {} },
      { path: '/backend-api/share/create', method: 'POST', body: { resource_id: gid, resource_type: 'gizmo' } }
    ];
    for (const t of tries) {
      try {
        const j = await craberApi(t.path, { method: t.method, body: t.body });
        const link = j && (j.share_url || j.url || j.link
          || (j.share && (j.share.url || j.share.link)));
        if (link) return link;
        // 有些接口只返回 id/token
        const id = j && (j.share_id || j.id || j.token);
        if (id) return location.origin + '/share/' + id;
      } catch (e) { /* 换下一个 */ }
    }
    return null;
  }

  // 用纯 cookie（不带 Authorization）查项目名。
  // /api/auth/session 偶发 403 时 token 拿不到，但同源请求带 cookie 仍然有效，
  // 这条路径能让项目名照样解析出来。
  async function folderFetchProjNameCookie(gid) {
    if (!gid) return null;
    try {
      const r = await fetch('/backend-api/gizmos/' + gid, { credentials: 'include' });
      if (!r.ok) return null;
      const j = await r.json();
      const nm = (j && j.gizmo && j.gizmo.display && j.gizmo.display.name)
        || (j && j.display && j.display.name) || null;
      if (nm) {
        API._gizmoCache[gid] = nm;      // 回填，避免下次再请求
        folderProjIdByName[nm] = gid;
      }
      return nm;
    } catch (e) { return null; }
  }

  // 拉当前用户的项目列表（供"移至项目"子菜单用）
  const craberProjectsCache = { at: 0, list: [] };
  async function craberListProjects() {
    if (Date.now() - craberProjectsCache.at < 5 * 60 * 1000 && craberProjectsCache.list.length) {
      return craberProjectsCache.list;
    }
    const out = [];
    const seenName = new Set();
    const add = (id, name) => {
      const nm = String(name || '').trim();
      if (!nm || seenName.has(nm)) return;
      seenName.add(nm);
      out.push({ id: id || null, name: nm });
      if (id) folderProjIdByName[nm] = id;
    };

    // 主路径：从会话列表反推项目。
    //
    // 实测结论（诊断日志）：ChatGPT 没有可用的"项目列表"接口 ——
    //   /gizmos/discovery、/gizmos/mine 返回 200 但没有数组；
    //   GET /gizmos、/projects 是 405；/gizmos/snorlax、/projects/mine 是 404。
    // 但会话对象里带 gizmo_id（属于项目的会话），所以改为：
    //   会话列表 → 收集 gizmo_id → 逐个 /gizmos/{id} 查名字
    // 这也正好满足"只走接口"的要求。
    const candIds = new Set();

    // 当前页面就在某个项目里（URL 里带着它）
    const cur = location.pathname.match(/\/g\/(g-p-[0-9a-f]+)/);
    if (cur) candIds.add(cur[1]);
    // 从会话列表收集 gizmo_id。
    // 翻几页：只有最近 100 条会话时，久未使用的项目就收集不到。
    try {
      let offset = 0;
      const PAGE = 100;
      for (let page = 0; page < 3; page++) {
        const j = await craberApi('/backend-api/conversations?offset=' + offset
          + '&limit=' + PAGE + '&order=updated');
        const items = (j && j.items) || [];
        for (const c of items) {
          const gid = c.gizmo_id || (c.gizmo && c.gizmo.id);
          if (gid) candIds.add(gid);
        }
        if (items.length < PAGE) break;
        offset += PAGE;
      }
    } catch (e) { /* 会话列表拿不到就只用 URL 里的项目 */ }

    // 逐个把 id 换成名字（只用接口）

    await Promise.all([...candIds].map(async (gid) => {
      // 已有映射就不必再问
      const known = Object.keys(folderProjIdByName || {}).find((k) => folderProjIdByName[k] === gid);
      if (known) { add(gid, known); return; }

      // 名字只从接口取：/gizmos/{id}（带 token）→ 纯 cookie 再试一次
      let nm = null;
      try { nm = await API.getGizmoName(gid); } catch (e) { nm = null; }
      if (!nm) nm = await folderFetchProjNameCookie(gid);
      // 名字拿不到就不列这个项目（编个"未命名项目"只会让人困惑）
      if (nm) add(gid, nm);
    }));

    // 只缓存"真拿到了项目"的结果。空结果缓存 5 分钟的话，
    // 一次限流就会让项目列表空五分钟（实测很烦）。
    if (out.length) {
      craberProjectsCache.list = out;
      craberProjectsCache.at = Date.now();
    }
    return out;
  }

  // 用 prompt 重命名（原版是行内编辑，这里用同名对话框保持一致语义）
  function craberPromptRename(oldTitle, cb) {
    craberPromptDialog({
      title: '重命名聊天',
      subtitle: '保持简短且易于识别',
      value: oldTitle || '',
      confirmText: '保存',
      onOk: (t) => { if (t && t !== oldTitle) cb(t); }
    });
  }

  /* ---------- 借用原生菜单 ---------- */
  // 在原生侧栏里找到某条会话/项目对应的行元素。
  // 找不到返回 null（例如该项目没展开、或会话不在"最近"里）。
  function craberFindNativeRow(kind, id, name) {
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (!nav) return null;

    if (kind === 'conv') {
      const a = [...nav.querySelectorAll('a[href]')].find((el) => {
        const e = folderEntryFromHref(el.getAttribute('href'));
        return e && e.kind === 'conv' && e.id === id;
      });
      return a || null;
    }
    // 项目行：按名字匹配（项目行没有 id 属性）
    if (kind === 'proj' || kind === 'projname') {
      const nm = String(name || '').trim();
      if (!nm) return null;
      return [...nav.querySelectorAll('[role="button"]')].find((el) => {
        if (!folderIsProjectRow(el) || el.closest('.craber-folders')) return false;
        return (el.textContent || '').trim() === nm;
      }) || null;
    }
    return null;
  }

  // 在元素上打开原生右键菜单（让 ChatGPT 自己弹它自己的菜单）。
  // 这样菜单项、样式、行为全都与原生一致，我们不必重新实现任何操作。
  function craberOpenNativeMenu(el, x, y) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cx = (typeof x === 'number') ? x : Math.round(r.left + r.width / 2);
    const cy = (typeof y === 'number') ? y : Math.round(r.top + r.height / 2);
    const init = {
      bubbles: true, cancelable: true, view: window,
      clientX: cx, clientY: cy,
      screenX: cx, screenY: cy,
      button: 2, buttons: 2
    };
    try {
      el.dispatchEvent(new MouseEvent('contextmenu', init));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 文件夹内条目的「⋯」菜单：风格对齐原生（左侧图标 + 右侧快捷键位 + 危险项红字）
  /* ---------- 导出进度浮层（菜单导出用） ---------- */
  // 菜单导出没有面板可显示状态，这里给一个轻量浮层：
  // 标题 + 当前阶段 + 进度条 + 计数，完成/失败后自动收起。
  let craberProgEl = null;

  function craberProgressOpen(title) {
    craberProgressClose();
    const el = folderEl('div', 'craber-prog');
    const hd = folderEl('div', 'craber-prog-hd', title || '导出中');
    const bar = folderEl('div', 'craber-prog-bar');
    const fill = folderEl('div', 'craber-prog-fill');
    bar.append(fill);
    const txt = folderEl('div', 'craber-prog-txt', '准备中…');
    el.append(hd, bar, txt);
    document.body.appendChild(el);
    craberProgEl = { el, fill, txt };
    return craberProgEl;
  }

  function craberProgressUpdate(done, total, note) {
    if (!craberProgEl) return;
    const { fill, txt } = craberProgEl;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    fill.style.width = pct + '%';
    txt.textContent = note || ('导出中 ' + done + ' / ' + total);
  }

  function craberProgressClose() {
    if (!craberProgEl) return;
    const { el } = craberProgEl;
    try { el.remove(); } catch (e) {}
    craberProgEl = null;
  }

  // 延迟收起：让用户看一眼「完成 ✓」
  function craberProgressFinish(ok, msg) {
    if (!craberProgEl) return;
    const { fill, txt } = craberProgEl;
    fill.style.width = '100%';
    fill.classList.toggle('err', !ok);
    txt.textContent = msg || (ok ? '完成 ✓' : '导出失败');
    setTimeout(craberProgressClose, ok ? 1200 : 3200);
  }

  /* ---------- 从菜单直接导出 ---------- */

  // 导出单个会话为 Markdown（带图片目录，打包成 zip）。
  // 复用既有渲染管线，行为和"多会话导出"保持一致。
  async function craberExportConvById(convId, title) {
    if (!convId) { navToast('找不到会话 ID，无法导出'); return; }
    const meta = { id: convId, title: title || '会话' };
    craberProgressOpen('导出会话：' + (title || '会话'));
    try {
      await exportConversations([meta], (done, total, note) => {
        craberProgressUpdate(done, total, note);
      }, { zipName: title || '会话' });
      craberProgressFinish(true, '已导出「' + (title || '会话') + '」');
    } catch (e) {
      craberProgressFinish(false, '导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
  }

  // 导出整个项目：把它名下的会话全部导出成一个 zip。
  // 项目 ID 可能缺失（只有名字），先解析再拉会话列表。
  async function craberExportProject(key, name) {
    let gid = folderProjGizmoId(key);
    if (!gid) gid = await folderResolveProjIdByName(name).catch(() => null);
    if (!gid) { navToast('找不到该项目 ID，无法导出'); return; }

    let list = folderProjConvCache[folderKeyOf('proj', gid)]
      || folderProjConvCache[key];
    if (!list || !list.length) {
      try { list = await folderLoadProjConvs(key, gid); } catch (e) { list = null; }
    }
    if (!list || !list.length) { navToast('该项目没有可导出的会话'); return; }

    const metas = list.map((c) => {
      const id = String(c.key || '').indexOf('conv:') === 0 ? c.key.slice(5) : c.key;
      return { id: id, title: c.label || '会话', gizmo_id: gid };
    }).filter((m) => m.id);

    if (!metas.length) { navToast('该项目没有可导出的会话'); return; }
    craberProgressOpen('导出项目：' + name + '（' + metas.length + ' 个会话）');
    try {
      await exportConversations(metas, (done, total, note) => {
        craberProgressUpdate(done, total, note);
      }, { zipName: name });
      craberProgressFinish(true, '已导出「' + name + '」');
    } catch (e) {
      craberProgressFinish(false, '导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
  }

  function folderKidMenu(anchor, f, key, title, href) {
    folderClosePjify();
    const kind = folderItemKindOf(key);
    const isProj = kind === 'proj' || kind === 'projname';
    const m = folderEl('div', 'craber-menu');

    // mk(图标, 文案, 动作, 额外类, 是否带右箭头)
    const mk = (icon, label, fn, cls, arrow) => {
      const b = folderEl('button', 'craber-menu-item' + (cls ? ' ' + cls : ''));
      b.type = 'button';
      const ic = folderEl('span', 'craber-menu-ico');
      ic.innerHTML = icon;
      b.append(ic, folderEl('span', 'craber-menu-label', label));
      if (arrow) {
        const ar = folderEl('span', 'craber-menu-arrow');
        ar.innerHTML = arrow;
        b.append(ar);
      }
      b.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        folderClosePjify(); fn();
      });
      m.append(b);
      return b;
    };

    const convId = kind === 'conv' ? key : null;

    if (isProj) {
      /* ---- 项目条目：与原版项目菜单同构 ---- */
      mk(MENU_ICON.open, '打开项目', () => folderOpenProjectByName(title));
      mk(MENU_ICON.rename, '重命名项目', () => {
        const gid = folderProjGizmoId(key);
        craberPromptDialog({
          title: '重命名项目',
          subtitle: '保持简短且易于识别',
          value: title || '',
          confirmText: '保存',
          onOk: (v) => {
            if (!v || v === title) return;
            if (!gid) { navToast('找不到该项目 ID，无法重命名'); return; }
            craberRenameProject(gid, v).then(() => {
              // 项目在文件夹里是按"名字"记录的：名字变了要同步过去，
              // 否则这条项目会变成找不到的孤儿项。
              const oldKey = key;
              const newKey = folderProjKeyByName(v);
              if (oldKey !== newKey) {
                for (const ff of folderData.folders) {
                  const i = ff.items.indexOf(oldKey);
                  if (i >= 0) {
                    if (ff.items.indexOf(newKey) < 0) ff.items[i] = newKey;
                    else ff.items.splice(i, 1);
                  }
                }
                saveFolders();
              }
              // 项目名存在 key 里（projname:...），锁定新名字一段时间，
              // 免得被原生侧栏的旧项目名覆盖回去
              const lockKey = folderProjKeyByName(v);
              folderTitleCache[lockKey] = v;
              folderTitleLock[lockKey] = { title: v, until: Date.now() + 120000 };
              folderRenderedSig = '';
              renderFolders();
              navToast('已重命名为「' + v + '」');
            }).catch((e) => navToast('重命名失败：' + e.message));
          }
        });
      });
      mk(MENU_ICON.expand, folderProjOpen[key] ? '收起会话列表' : '展开会话列表', () => {
        // 从菜单切换：找到该项目的行再原地过渡
        const nav = document.querySelector('nav[aria-label="聊天记录"]');
        const subEl = nav && nav.querySelector('.craber-folder-kid-sub[data-for="' + key + '"]');
        const rowEl = subEl && subEl.parentElement
          && subEl.parentElement.querySelector('.craber-folder-kid');
        folderToggleProjOpen(key, rowEl);
      });
      m.append(folderEl('div', 'craber-menu-sep'));
      mk(MENU_ICON.export, '导出项目', () => {
        craberExportProject(key, title);
      });
      mk(MENU_ICON.share, '分享项目', () => {
        const gid = folderProjGizmoId(key);
        if (!gid) { navToast('找不到该项目 ID，无法分享'); return; }
        craberShareProject(gid).then((link) => {
          if (!link) {
            // 拿不到分享链接时，直接打开项目页，用户可在原生菜单里分享
            folderOpenProjectByName(title);
            navToast('未能自动生成分享链接，已打开项目页');
            return;
          }
          try {
            navigator.clipboard.writeText(link);
            navToast('分享链接已复制');
          } catch (e) {
            craberDialog({
              title: '分享链接',
              subtitle: '已生成，可手动复制',
              body: (() => {
                const w = folderEl('div', 'craber-dlg-body');
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.className = 'craber-dlg-input';
                inp.value = link;
                w.append(inp);
                setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 30);
                return w;
              })(),
              confirmText: '复制',
              onConfirm: (close) => {
                try { navigator.clipboard.writeText(link); navToast('已复制'); } catch (e) {}
                close();
              }
            });
          }
        }).catch((e) => navToast('分享失败：' + e.message));
      });
    } else {
      /* ---- 会话条目：与原版会话菜单同构（重命名/置顶/分享/归档/删除） ---- */
      mk(MENU_ICON.open, '打开', () => folderNavigate(href || ('/c/' + convId)));

      mk(MENU_ICON.rename, '重命名', () => {
        craberPromptRename(title, (t) => {
          craberRenameConv(convId, t).then(() => {
            // 用锁定版写入：原生侧栏还没回显新名时，别被它的旧标题覆盖
            folderSetTitleLocal(key, t);
            // 项目会话缓存里这一条也要跟着改（展开项目时显示的是它）
            for (const k of Object.keys(folderProjConvCache)) {
              const list = folderProjConvCache[k];
              if (!Array.isArray(list)) continue;
              for (const c of list) if (c.key === key) c.label = t;
            }
            folderRenderedSig = '';
            renderFolders();
            navToast('已重命名');
          }).catch((e) => navToast('重命名失败：' + e.message));
        });
      });

      mk(MENU_ICON.pin, craberIsPinned(convId) ? '取消置顶' : '置顶', () => {
        const next = !craberIsPinned(convId);
        // 先本地生效：菜单立刻变"取消置顶"，列表位置立即上浮，不等网络
        craberPinnedCache[convId] = next;
        craberSavePinned();
        craberRepinInFolders(convId, next);
        folderRenderedSig = '';
        renderFolders();

        craberPinConv(convId, next).then(() => {
          // 接口已确认成功（200 {"success":true}）：同步项目会话缓存里的置顶标记
          craberApplyPinToConvCache(convId, next, Date.now());
          navToast(next ? '已置顶' : '已取消置顶');
          craberRefreshSidebarSoon();
        }).catch((e) => {
          // 失败回滚本地状态，避免显示与实际不符
          craberPinnedCache[convId] = !next;
          craberSavePinned();
          craberRepinInFolders(convId, !next);
          folderRenderedSig = '';
          renderFolders();
          navToast('置顶失败：' + e.message);
        });
      });

      mk(MENU_ICON.export, '导出会话', () => {
        craberExportConvById(convId, title);
      });

      mk(MENU_ICON.share, '分享', () => {
        const link = location.origin + '/share/' + convId;
        try {
          navigator.clipboard.writeText(link);
          navToast('分享链接已复制');
        } catch (e) {
          craberDialog({
            title: '分享链接',
            subtitle: '已生成，可手动复制',
            body: (() => {
              const w = folderEl('div', 'craber-dlg-body');
              const inp = document.createElement('input');
              inp.type = 'text';
              inp.className = 'craber-dlg-input';
              inp.value = link;
              w.append(inp);
              setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 30);
              return w;
            })(),
            confirmText: '复制',
            onConfirm: (close) => {
              try { navigator.clipboard.writeText(link); navToast('已复制'); } catch (e) {}
              close();
            }
          });
        }
      });

      m.append(folderEl('div', 'craber-menu-sep'));

      mk(MENU_ICON.archive, '归档', () => {
        craberArchiveConv(convId, true).then(() => {
          folderToggleItem(f.id, key);       // 归档后从文件夹里移除更符合直觉
          navToast('已归档');
        }).catch((e) => navToast('归档失败：' + e.message));
      });

      mk(MENU_ICON.remove, '删除', () => {
        craberConfirmDialog({
          title: '删除这个对话？',
          message: '此操作不可恢复，该对话将永久删除。',
          confirmText: '删除',
          danger: true,
          onOk: () => {
            craberDeleteConv(convId).then(() => {
              folderToggleItem(f.id, key);
              navToast('已删除');
            }).catch((e) => navToast('删除失败：' + e.message));
          }
        });
      }, 'craber-menu-danger');
    }

    // 分组标题：与原版一致（显示这条内容现在属于哪个文件夹）
    // 未归入文件夹时（项目下的会话默认都没有），不显示文件夹相关项
    const noFolder = f.id === '__none__';
    if (!noFolder) m.append(folderEl('div', 'craber-menu-group', f.name));

    // 会话：原版的「移至项目 / 从项目中移除」（真实调用 gizmo_id 接口）
    if (!isProj && convId) {
      mk(MENU_ICON.move, '移至项目', () => {
        craberOpenMoveToProject(anchor, convId, key, f);
      }, '', MENU_ICON.chevron);
      if (folderCurrentProjKeys().length) {
        mk(MENU_ICON.unmove, '从项目中移除', () => {
          craberMoveConvToProject(convId, null).then(() => {
            navToast('已从项目中移除');
          }).catch((e) => navToast('操作失败：' + e.message));
        });
      }
      m.append(folderEl('div', 'craber-menu-sep'));
    }

    // 文件夹归属相关：移至其它文件夹 / 从文件夹中移除
    if (!noFolder) {
      mk(MENU_ICON.move, '移至其它文件夹', () => {
        folderOpenTomovePicker(anchor, f, key, title);
      }, '', MENU_ICON.chevron);
      mk(MENU_ICON.unmove, '从文件夹中移除', () => {
        folderToggleItem(f.id, key);
        navToast('已从「' + f.name + '」移除');
      }, 'craber-menu-danger');
    }

    // 借用原生菜单：置顶/分享/归档等操作交给 ChatGPT 自己处理，
    // 行为与原生完全一致（也就不用在这里逐项重新实现）。
    const nativeRow = craberFindNativeRow(kind, kind === 'conv' ? key : null, title);
    if (nativeRow) {
      m.append(folderEl('div', 'craber-menu-sep'));
      const b = folderEl('button', 'craber-menu-item');
      b.type = 'button';
      const ic = folderEl('span', 'craber-menu-ico');
      ic.innerHTML = MENU_ICON.more;
      b.append(ic, folderEl('span', 'craber-menu-label', '更多操作…'));
      b.title = '打开 ChatGPT 原生菜单（置顶、分享、归档等）';
      b.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        folderClosePjify();
        // 稍等一下让我们的菜单先收起来，避免和原生菜单叠在一起
        setTimeout(() => {
          const row = craberFindNativeRow(kind, kind === 'conv' ? key : null, title);
          if (!row) { navToast('找不到对应的原生条目'); return; }
          if (!craberOpenNativeMenu(row)) navToast('无法打开原生菜单');
        }, 60);
      });
      m.append(b);
    }

    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = r.right - mw;
    let top = r.bottom + 4;
    if (left < 8) left = 8;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    m.style.left = Math.round(left) + 'px';
    m.style.top = Math.round(top) + 'px';
    folderPjifyEl = m;
    folderCloseOnOutside();
  }

  // 「移至项目」子菜单：列出用户的全部项目，点一个就把会话挪进去
  async function craberOpenMoveToProject(anchor, convId, key, f) {
    folderClosePjify();
    const m = folderEl('div', 'craber-menu');
    m.append(folderEl('div', 'craber-menu-group', '移至项目'));
    const loading = folderEl('div', 'craber-menu-group', '正在读取项目…');
    m.append(loading);
    document.body.appendChild(m);
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const mw = m.offsetWidth, mh = m.offsetHeight;
      let left = r.left;
      let top = r.bottom + 4;
      if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
      if (left < 8) left = 8;
      if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
      m.style.left = Math.round(left) + 'px';
      m.style.top = Math.round(top) + 'px';
    };
    place();
    folderPjifyEl = m;
    folderCloseOnOutside();

    const list = await craberListProjects();
    if (loading.parentElement) loading.remove();
    if (!list.length) {
      m.append(folderEl('div', 'craber-menu-group', '没有可用项目'));
      place();
      return;
    }
    for (const p of list) {
      const b = folderEl('button', 'craber-menu-item');
      b.type = 'button';
      const ic = folderEl('span', 'craber-menu-ico');
      ic.innerHTML = FOLDER_PROJ_ICON;
      b.append(ic, folderEl('span', 'craber-menu-label', p.name));
      b.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        folderClosePjify();
        craberMoveConvToProject(convId, p.id).then(() => {
          navToast('已移至「' + p.name + '」');
        }).catch((err) => navToast('移动失败：' + err.message));
      });
      m.append(b);
    }
    place();
  }

  // "移至其它文件夹"：列出其它文件夹，点一个就把这条内容挪过去
  function folderOpenTomovePicker(anchor, fromF, key, title) {
    folderClosePjify();
    const others = folderData.folders.filter((x) => x.id !== fromF.id);
    const m = folderEl('div', 'craber-menu');
    m.append(folderEl('div', 'craber-menu-group', '移动到'));
    if (!others.length) {
      m.append(folderEl('div', 'craber-menu-group', '没有其它文件夹'));
    }
    for (const t of others) {
      const b = folderEl('button', 'craber-menu-item');
      b.type = 'button';
      const ic = folderEl('span', 'craber-menu-ico');
      ic.innerHTML = FOLDER_ICON;
      b.append(ic, folderEl('span', 'craber-menu-label', t.name));
      b.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        folderClosePjify();
        const i = fromF.items.indexOf(key);
        if (i >= 0) fromF.items.splice(i, 1);
        if (t.items.indexOf(key) < 0) t.items.push(key);
        saveFolders();
        renderFolders();
        navToast('已移动到「' + t.name + '」');
      });
      m.append(b);
    }
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = r.left;
    let top = r.bottom + 4;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    if (left < 8) left = 8;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    m.style.left = Math.round(left) + 'px';
    m.style.top = Math.round(top) + 'px';
    folderPjifyEl = m;
    folderCloseOnOutside();
  }

  // 文件夹本身的「⋯」菜单：同样用 craber-menu，风格与原生一致
  function folderMoreMenu(anchor, f) {
    folderClosePjify();
    const m = folderEl('div', 'craber-menu');
    const mk = (icon, label, fn, cls) => {
      const b = folderEl('button', 'craber-menu-item' + (cls ? ' ' + cls : ''));
      b.type = 'button';
      const ic = folderEl('span', 'craber-menu-ico');
      ic.innerHTML = icon;
      b.append(ic, folderEl('span', 'craber-menu-label', label));
      b.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        folderClosePjify(); fn();
      });
      m.append(b);
    };

    // 顺序与原版菜单一致：重命名 / 置顶(此处为展开收起) → 分组 → 归档(此处为新建并移入) → 删除
    mk(MENU_ICON.rename, '重命名', () => folderRename(f.id));
    mk(MENU_ICON.expand, f.open ? '收起文件夹' : '展开文件夹', () => folderSetOpen(f.id, !f.open));

    m.append(folderEl('div', 'craber-menu-sep'));
    mk(MENU_ICON.move, '新建文件夹并移入', () => {
      craberPromptDialog({
        title: '新建文件夹并移入',
        subtitle: '把「' + f.name + '」里的内容整体搬过去',
        value: '',
        placeholder: '文件夹名称',
        confirmText: '创建',
        onOk: (v) => {
          const nf = folderCreate(v);
          for (const k of f.items.slice()) { if (nf.items.indexOf(k) < 0) nf.items.push(k); }
          f.items = [];
          saveFolders();
          renderFolders();
        }
      });
    });

    m.append(folderEl('div', 'craber-menu-group', f.name));
    mk(MENU_ICON.remove, '删除', () => folderDelete(f.id), 'craber-menu-danger');

    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let left = r.right - mw;
    let top = r.bottom + 4;
    if (left < 8) left = 8;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
    m.style.left = Math.round(left) + 'px';
    m.style.top = Math.round(top) + 'px';
    folderPjifyEl = m;
    folderCloseOnOutside();
  }

  function folderUnmount() {
    if (foldersEl && foldersEl.parentElement) foldersEl.remove();
    foldersEl = null;
    foldersHostNav = null;
    folderRenderedSig = '';
  }

  /* ---------- 原生行上的「归入文件夹」按钮 ---------- */

  // 原生行宿主：从链接往上走，第一个"高度不超过一行、且内部还有原生按钮"的祖先。
  // 挂到纯文本 span 上算不出位置，挂到整个列表上又会让 hover 覆盖全部行。
  function folderPickRowHost(a) {
    // 原生行高度约 36px，往上走超过 1.6 倍行高就说明已经跨到区块级别了。
    // 优先选"行内已经有自己按钮"的那层（原生归档/更多按钮所在容器），
    // 没有按钮就退回到最接近一行的祖先 —— 按钮仍能贴着行显示。
    let best = null;
    let n = a;
    for (let i = 0; i < 6 && n.parentElement && n.parentElement.tagName !== 'NAV'; i++) {
      n = n.parentElement;
      if (n.tagName === 'LI') return n;
      const h = n.getBoundingClientRect().height;
      if (h > 56) break;
      if (n.querySelector(':scope > button, :scope > div > button')) return n;
      if (!best) best = n;   // 记住最贴行的一层（越靠里越贴行）
    }
    return best || a.parentElement;
  }

  function folderScanRows() {
    if (!uiPrefs.folders) return;
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (!nav) return;
    const now = Date.now();
    if (now - folderPjScanAt < 400) return;   // 原生会频繁重渲染，节流一下
    folderPjScanAt = now;

    // 项目行是 role="button" 的 div、没有 href，a[href] 那条查不到它，单独扫一遍
    nav.querySelectorAll('[role="button"]').forEach((el) => {
      if (!folderIsProjectRow(el)) return;
      const name = (el.textContent || '').trim();
      if (!name) return;
      const projEntry = { kind: 'projname', id: name, key: folderProjKeyByName(name) };
      // 项目行用手动拖拽：原生项目行自带拖拽（拖到别处=置顶/排序），
      // 和"拖进文件夹"冲突，必须把 HTML5 拖拽关掉再自己接管手势。
      folderBindManualDrag(el, () => projEntry);
      folderAttachRowButton(el, projEntry, name, null);
    });

    nav.querySelectorAll('a[href]').forEach((a) => {
      const entry = folderEntryFromHref(a.getAttribute('href'));
      if (!entry) return;
      folderRememberHref(entry, a.getAttribute('href'));
      folderBindDrag(a);
      const host = folderPickRowHost(a);
      if (!host) return;
      folderAttachRowButton(host, entry, folderEntryTitle(a), a);
    });
  }

  // 给一行挂上「归入文件夹」按钮（按钮 + 右键菜单）。重复调用是空操作。
  // anchor 用于弹窗定位；链接行传 a，项目行传 null（用行本身定位）。
  function folderAttachRowButton(host, entry, title, a) {
    if (!host) return;
    if (host.querySelector(':scope > .craber-pj-btn')) return;
    host.classList.add('craber-pj-host');
    const btn = folderEl('button', 'craber-pj-btn');
    btn.type = 'button';
    // 🦀 图标：点开后是一个菜单，里面放「添加到文件夹」和「导出」。
    // 用螃蟹而不是文件夹图标，是因为它现在不只管"归入文件夹"了。
    btn.innerHTML = CRAB_SMALL;
    btn.title = '更多操作（文件夹 / 导出）';
    btn.setAttribute('aria-label', '更多操作');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderOpenPjify(btn, entry, title, a);
    });
    // 右键原生行也弹同一个菜单（比去够小按钮顺手）
    host.addEventListener('contextmenu', (ev) => {
      if (!uiPrefs.folders) return;
      if (a && !ev.target.closest('a')) return;      // 链接行只认点在链接上
      ev.preventDefault();
      folderOpenPjify(btn, entry, title, a);
    });
    // 插到"文字块"之后、原生操作按钮之前：原生右侧按钮在 hover 时才出现，
    // 我们排在它前面就不会被它盖住（绝对定位到右缘实测会点成原生菜单）。
    const textCol = a ? (a.closest('div') || null) : null;
    const anchorEl = textCol && textCol.parentElement === host ? textCol : null;
    if (anchorEl && anchorEl.nextSibling) host.insertBefore(btn, anchorEl.nextSibling);
    else host.appendChild(btn);
  }

  // 拖拽归类：原生行本来可拖，这里只在拖起时记下条目，落点由文件夹行处理
  // 通用拖拽绑定：el 可以是会话链接，也可以是项目行。
  // getEntry 每次拖拽开始时才求值（名字/映射可能已变）。
  function folderBindDragEl(el, getEntry) {
    if (!el) return;
    // 每轮都确保 draggable 存在：React 重建/复用节点时可能会把它清掉。
    // 项目行原生本来就是 draggable，我们只保证它是 true。
    if (el.getAttribute('draggable') !== 'true') el.setAttribute('draggable', 'true');
    if (el.dataset.craberDrag) return;
    el.dataset.craberDrag = '1';
    // 用捕获阶段：原生（React）在项目行上也有拖拽逻辑（拖出去会置顶项目），
    // 冒泡阶段我们可能拿到被处理过/被拦截的事件。捕获能先拿到，并决定是否接管。
    el.addEventListener('dragstart', (e) => {
      if (!uiPrefs.folders) return;
      let entry = null;
      try { entry = getEntry(); } catch (err) { entry = null; }
      if (!entry) return;

      folderDndKind = entry.kind;
      folderDndId = entry.id;
      folderDndKey = entry.key;
      folderDndLabel = el.getAttribute('aria-label') || (el.textContent || '').trim() || null;
      if (el.tagName === 'A') folderRememberHref(entry, el.getAttribute('href'));

      try {
        e.dataTransfer.setData('text/plain', 'craber:' + entry.key);
        e.dataTransfer.effectAllowed = 'copyMove';
      } catch (err) {}

      // 项目行：原生也会处理拖拽（拖到别处=置顶项目），必须拦掉原生处理器。
      if (entry.kind === 'proj' || entry.kind === 'projname') {
        e.stopImmediatePropagation();
      }
    }, true);
    el.addEventListener('dragend', () => {
      folderDndKind = null;
      folderDndId = null;
      folderDndKey = null;
      folderDndLabel = null;
      document.querySelectorAll('.drag-over').forEach((n) => n.classList.remove('drag-over'));
    });
  }

  // 会话链接的拖拽（原有入口，内部走通用实现）
  function folderBindDrag(a) {
    folderBindDragEl(a, () => folderEntryFromHref(a.getAttribute('href')));
  }

  // 项目行的拖拽：原生在这类行上自带拖拽（拖到别处会把项目置顶/排序），
  // 和"拖进文件夹"直接冲突，靠拦事件很难彻底压住。
  // 改为把手势抓在自己手里：屏蔽 HTML5 拖拽，用鼠标事件手动发起一个自定义拖拽会话。
  /* ---------- 文件夹内条目拖动排序 ---------- */
  // 用同一套"手动拖拽"（document 捕获层拦截 + 鼠标事件）：
  // 原生在这些行上也有拖拽语义，用 HTML5 drag 会被它抢走。
  let folderSortState = null;   // { el, key, fromF, startX, startY, started }
  let folderSortDoneAt = 0;      // 排序完成的时刻，用于抑制紧随其后的 click
  function folderJustSorted() { return Date.now() - folderSortDoneAt < 300; }

  function folderSortBegin(el, key, f, ev) {
    folderSortState = {
      el, key, fromF: f,
      startX: ev.clientX, startY: ev.clientY,
      started: false
    };
  }

  function folderSortMove(ev) {
    const st = folderSortState;
    if (!st) return;
    if (!st.started) {
      if (Math.abs(ev.clientX - st.startX) < 5 && Math.abs(ev.clientY - st.startY) < 5) return;
      st.started = true;
      st.el.classList.add('craber-sorting');
      document.body.classList.add('craber-dragging');
    }

    // 找到指针下方的其他条目行，计算插入位置
    const under = document.elementFromPoint(ev.clientX, ev.clientY);
    const overRow = under && under.closest ? under.closest('.craber-folder-kid') : null;
    document.querySelectorAll('.craber-folder-kid.sort-over-top, .craber-folder-kid.sort-over-bottom')
      .forEach((n) => n.classList.remove('sort-over-top', 'sort-over-bottom'));
    if (!overRow || overRow === st.el) return;

    const r = overRow.getBoundingClientRect();
    const before = ev.clientY < r.top + r.height / 2;
    overRow.classList.add(before ? 'sort-over-top' : 'sort-over-bottom');
    st.overRow = overRow;
    st.before = before;
    ev.preventDefault();
  }

  function folderSortEnd(ev) {
    const st = folderSortState;
    folderSortState = null;
    if (!st) return false;
    st.el.classList.remove('craber-sorting');
    document.body.classList.remove('craber-dragging');
    document.querySelectorAll('.sort-over-top, .sort-over-bottom')
      .forEach((n) => n.classList.remove('sort-over-top', 'sort-over-bottom'));

    if (!st.started) return false;         // 只是点击
    if (!st.overRow) return true;          // 拖了但没落在其它条目上

    const targetKey = st.overRow.dataset.sortKey;
    if (!targetKey || targetKey === st.key) return true;

    const f = st.fromF;
    const from = f.items.indexOf(st.key);
    const to = f.items.indexOf(targetKey);
    if (from < 0 || to < 0) return true;

    // 先移除，再按"插到目标前/后"计算新位置
    f.items.splice(from, 1);
    let insert = f.items.indexOf(targetKey);
    if (insert < 0) insert = f.items.length;
    if (!st.before) insert += 1;
    f.items.splice(insert, 0, st.key);

    saveFolders();
    renderFolders();
    folderSortDoneAt = Date.now();   // 抑制紧接着的 click（避免误跳转）
    return true;
  }

  // 给文件夹内的条目行绑定拖动排序
  function folderBindSort(row, key, f) {
    if (!row) return;
    folderInstallSortGlobal();
    row.addEventListener('mousedown', (ev) => {
      if (!uiPrefs.folders) return;
      if (ev.button !== undefined && ev.button !== 0) return;
      // 点在行内按钮（⋯ / 箭头）上时不排序
      if (ev.target && ev.target.closest && ev.target.closest('button')) return;
      folderSortBegin(row, key, f, ev);
    }, true);
    row.addEventListener('pointerdown', (ev) => {
      if (!uiPrefs.folders) return;
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      if (ev.target && ev.target.closest && ev.target.closest('button')) return;
      folderSortBegin(row, key, f, ev);
    }, true);
  }

  // 全局分发：只安装一次
  let folderSortInstalled = false;
  function folderInstallSortGlobal() {
    if (folderSortInstalled) return;
    folderSortInstalled = true;
    document.addEventListener('mousemove', (ev) => { if (folderSortState) folderSortMove(ev); }, true);
    document.addEventListener('pointermove', (ev) => { if (folderSortState) folderSortMove(ev); }, true);
    document.addEventListener('mouseup', (ev) => {
      if (!folderSortState) return;
      const moved = folderSortEnd(ev);
      if (moved) {
        // 排序完成：别再让下面的点击触发跳转
        ev.stopPropagation();
        ev.preventDefault();
      }
    }, true);
    document.addEventListener('pointerup', (ev) => {
      if (!folderSortState) return;
      const moved = folderSortEnd(ev);
      if (moved) { ev.stopPropagation(); ev.preventDefault(); }
    }, true);
  }

  // 所有已绑定拖拽的项目行处理函数
  const folderProjDragHandlers = [];

  // 找到一个"这次事件落在哪个已绑定行上"的处理函数
  function folderProjDragHit(ev) {
    const t = ev.target;
    if (!t || !t.closest) return null;
    const rowEl = t.closest('[data-craber-projdrag="1"]');
    if (!rowEl) return null;
    return folderProjDragHandlers.find((h) => h.el === rowEl) || null;
  }

  // 全局只安装一次：document 捕获阶段分发
  let folderProjDragInstalled = false;
  function folderInstallProjDragGlobal() {
    if (folderProjDragInstalled) return;
    folderProjDragInstalled = true;

    const down = (ev) => {
      const h = folderProjDragHit(ev);
      if (!h) return;
      h.onDown(ev);
    };
    const move = (ev) => {
      const h = folderProjDragHit(ev) || folderProjDragActive;
      if (!h) return;
      h.suppress(ev);
      h.onMove(ev);
    };
    const up = (ev) => {
      const h = folderProjDragActive || folderProjDragHit(ev);
      if (!h) return;
      h.suppress(ev);
      h.onUp(ev);
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('mousedown', down, true);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('mousemove', move, true);
    document.addEventListener('pointerup', up, true);
    document.addEventListener('mouseup', up, true);
  }

  // 当前正在拖拽/按下的行处理函数（手势移出行元素后仍能继续）
  let folderProjDragActive = null;

  // 项目行的拖拽：原生在 document 层监听指针事件做"拖动置顶"，
  // 元素级监听拦不住，所以拦截必须挂在 document 的捕获阶段。
  function folderBindManualDrag(el, getEntry) {
    if (!el) return;
    // 关掉 HTML5 拖拽，避免原生走 dragstart 那条路
    if (el.getAttribute('draggable') !== 'false') el.setAttribute('draggable', 'false');
    el.dataset.craberProjdrag = '1';

    let startX = 0, startY = 0, active = false, started = false;
    const THRESHOLD = 5;   // 位移阈值：小于它算点击，不影响"打开项目"

    // 本行的处理集合（下面 onDown 里通过 folderProjDragActive 引用它）
    const self = {};
    self.el = el;
    self.isActive = () => active;
    self.isStarted = () => started;

    const isOurs = (ev) => {
      const t = ev.target;
      return !!(t && t.closest && t.closest('[data-craber-projdrag="1"]') === el);
    };

    // 统一的"开始"处理：按下时若发生在该行上，接管并切断原生手势
    const onDown = (ev) => {
      if (!uiPrefs.folders) return;
      if (ev.button !== undefined && ev.button !== 0) return;
      if (!isOurs(ev)) return;
      if (ev.target && ev.target.closest && ev.target.closest('button')) return;

      active = true;
      started = false;
      startX = ev.clientX;
      startY = ev.clientY;
      folderProjDragActive = self;   // 手势移出行外时仍由这一行接管

      // 原生拿不到这次按下，就不会进入自己的拖拽状态（也就没有蓝色插入线/置顶）
      ev.stopImmediatePropagation();
      ev.stopPropagation();
      ev.preventDefault();
    };

    // 拖拽开始后，持续压掉原生在 document 上的位移处理
    const suppress = (ev) => {
      // 按下即拦（否则原生可能在阈值内就进入自己的拖拽状态）；
      // 但只在本次按下发生在该行、且是我们接管的情况下。
      if (active) {
        ev.stopImmediatePropagation();
        ev.stopPropagation();
      }
    };

    const onMove = (ev) => {
      if (!active) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!started) {
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
        started = true;
        document.body.classList.add('craber-dragging');
      }
      // 落点高亮
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const row = under && under.closest ? under.closest('.craber-folder[data-folder-id]') : null;
      const zone = under && under.closest ? under.closest('.craber-folders') : null;
      document.querySelectorAll('.craber-folder.drag-over').forEach((n) => {
        if (n !== row) n.classList.remove('drag-over');
      });
      if (row) row.classList.add('drag-over');
      else if (zone) zone.classList.add('drag-over');
      else document.querySelectorAll('.craber-folders.drag-over')
        .forEach((n) => n.classList.remove('drag-over'));
      ev.preventDefault();
    };

    const onUp = (ev) => {
      if (!active) return;
      const wasDragging = started;
      active = false;
      started = false;
      folderProjDragActive = null;
      document.body.classList.remove('craber-dragging');
      document.querySelectorAll('.drag-over').forEach((n) => n.classList.remove('drag-over'));

      // 纯点击：原生被我们拦过，这里补回"打开项目"
      if (!wasDragging) {
        const nm = (el.textContent || '').trim();
        if (nm) folderOpenProjectByName(nm);
        return;
      }

      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const row = under && under.closest ? under.closest('.craber-folder[data-folder-id]') : null;
      const zone = under && under.closest ? under.closest('.craber-folders') : null;

      const entry = getEntry();
      if (!entry || !folderData) return;

      let target = null;
      if (row) {
        const fid = row.dataset.folderId;
        target = folderData.folders.find((x) => x.id === fid) || null;
      } else if (zone && folderData.folders.length) {
        target = folderData.folders[0];
      }
      if (!target) return;

      if (target.items.indexOf(entry.key) >= 0) {
        navToast('已经在「' + target.name + '」里了');
        return;
      }
      folderAddItem(target, entry.key,
        el.getAttribute('aria-label') || (el.textContent || '').trim() || null);
      saveFolders();
      renderFolders();
      navToast('已加入「' + target.name + '」');
    };

    // 关键：拦截必须挂在 document 的捕获阶段。
    // 原生 dnd（React 里一般是 document 级 pointerdown 监听）如果也在捕获阶段，
    // 元素级监听会排在它之后 —— 那就是"能加进文件夹但仍会置顶"的原因。
    // document 捕获 + 先注册，才能确保我们先拿到事件。
    // 把具体处理函数挂到 self 上（前面已创建占位对象，避免 TDZ）
    self.onDown = onDown;
    self.onMove = onMove;
    self.onUp = onUp;
    self.suppress = suppress;
    self.getEntry = getEntry;
    folderProjDragHandlers.push(self);
    folderInstallProjDragGlobal();
  }


  /* ---------- 「归入文件夹」弹出菜单 ---------- */

  function folderOpenPjify(anchor, entry, title) {
    folderClosePjify();
    const key = entry.key;
    folderTitleCache[key] = title;

    const m = folderEl('div', 'craber-pjify');
    m.append(folderEl('div', 'craber-pjify-hd',
      (entry.kind === 'proj' || entry.kind === 'projname' ? '项目：' : '会话：') + title));

    // 导出：侧栏原生行右键也能直接导出，不必先进文件夹
    const isProjEntry = entry.kind === 'proj' || entry.kind === 'projname';
    const expRow = folderEl('button', 'craber-pjify-row craber-pjify-export');
    expRow.type = 'button';
    const expIco = folderEl('span', 'craber-pjify-ico');
    expIco.innerHTML = MENU_ICON.export;
    expRow.append(expIco, folderEl('span', null, isProjEntry ? '导出项目' : '导出会话'));
    expRow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      folderClosePjify();
      if (isProjEntry) craberExportProject(key, title);
      else craberExportConvById(entry.id, title);
    });
    m.append(expRow);
    m.append(folderEl('div', 'craber-pjify-sep'));

    /* ---- 添加到文件夹：二级菜单 ----
     * 之前把文件夹列表直接摊平在主菜单里，文件夹一多菜单就长得没法看。
     * 改成一行入口，展开后才是列表；已加入的显示勾。
     */
    const subRow = folderEl('button', 'craber-pjify-row craber-pjify-hassub');
    subRow.type = 'button';
    const subIco = folderEl('span', 'craber-pjify-ico');
    subIco.innerHTML = MENU_ICON.folder;
    const subLabel = folderEl('span', null, '添加到文件夹');
    // 原生是向右的箭头（›），不是向下 —— 因为它往右侧弹出独立浮层
    const subArrow = folderEl('span', 'craber-pjify-arrow');
    subArrow.innerHTML = MENU_ICON.chevron;

    // 三个子元素必须挂上去，否则这行是空的（踩过：替换代码时被漏掉）
    subRow.append(subIco, subLabel, subArrow);

    // 二级浮层：独立定位，挂在 body 上，和主菜单并排
    const subPanel = folderEl('div', 'craber-pjify-sub');
    const subInner = folderEl('div', 'craber-pjify-subinner');
    subPanel.append(subInner);

    // 已加入的文件夹数量，作为入口右侧的小提示
    const joined = folderData.folders.filter((f) => f.items.indexOf(key) >= 0).length;
    if (joined > 0) {
      subRow.append(folderEl('span', 'craber-pjify-count', String(joined)));
    }

    const buildSub = () => {
      subInner.innerHTML = '';
      if (!folderData.folders.length) {
        subInner.append(folderEl('div', 'craber-pjify-subempty', '还没有文件夹'));
      }
      for (const f of folderData.folders) {
        const on = f.items.indexOf(key) >= 0;
        const row = folderEl('button', 'craber-pjify-row craber-pjify-subrow');
        row.type = 'button';
        row.title = on ? '从「' + f.name + '」移出' : '加入「' + f.name + '」';
        row.append(folderEl('span', null, f.name));
        if (on) {
          const ck = folderEl('span', 'craber-pjify-check');
          ck.innerHTML = FOLDER_CHECK;
          row.append(ck);
        }
        row.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // 不关菜单：可以连续往多个文件夹里放
          const added = folderToggleItem(f.id, key);
          navToast(added ? '已加入「' + f.name + '」' : '已从「' + f.name + '」移出');
          buildSub();
          // 同步入口上的计数
          const n = folderData.folders.filter((x) => x.items.indexOf(key) >= 0).length;
          const old = subRow.querySelector('.craber-pjify-count');
          if (old) old.remove();
          if (n > 0) subRow.append(folderEl('span', 'craber-pjify-count', String(n)));
        });
        subInner.append(row);
      }
      subInner.append(folderEl('div', 'craber-pjify-sep'));
      const nw = folderEl('button', 'craber-pjify-row craber-pjify-new');
      nw.type = 'button';
      nw.append(folderEl('span', null, '＋ 新建文件夹并放入'));
      nw.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderClosePjify();
        craberPromptDialog({
          title: '新建文件夹并放入',
          subtitle: '新建后把该项直接放进去',
          value: '',
          placeholder: '文件夹名称',
          confirmText: '创建',
          onOk: (v) => {
            folderCreate(v, key);
            navToast('已新建并放入');
          }
        });
      });
      subInner.append(nw);
    };
    buildSub();

    /* 二级浮层开关：定位到主菜单右侧，垂直对齐入口行 */
    let subOpen = false;
    function positionSub() {
      const r = subRow.getBoundingClientRect();
      const sw = subPanel.offsetWidth;
      const sh = subPanel.offsetHeight;
      // 优先放右侧；右边放不下就翻到左侧（原生菜单也是这个行为）
      let left = r.right + 4;
      if (left + sw > window.innerWidth - 8) left = Math.max(8, r.left - sw - 4);
      let top = r.top - 6;
      if (top + sh > window.innerHeight - 8) top = Math.max(8, window.innerHeight - sh - 8);
      if (top < 8) top = 8;
      subPanel.style.left = Math.round(left) + 'px';
      subPanel.style.top = Math.round(top) + 'px';
    }
    function openSub() {
      if (subOpen) return;
      subOpen = true;
      document.body.appendChild(subPanel);
      // 挂上后才能量到尺寸
      positionSub();
      subPanel.classList.add('craber-open');
      subRow.classList.add('subon');
      subRow.setAttribute('aria-expanded', 'true');
    }
    function closeSub() {
      if (!subOpen) return;
      subOpen = false;
      subPanel.classList.remove('craber-open');
      subPanel.remove();
      subRow.classList.remove('subon');
      subRow.setAttribute('aria-expanded', 'false');
    }
    // 主菜单关闭时二级也要跟着消失，否则会留在屏幕上
    folderPjifySubClose = closeSub;
    // 窗口尺寸变化后浮层位置会失效，直接收起更稳妥
    window.addEventListener('resize', () => { closeSub(); }, { passive: true });

    // 悬停入口即展开；离开入口与浮层区域后收起（留出移动时间）
    let hideTimer = 0;
    const cancelHide = () => { if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; } };
    const scheduleHide = () => {
      cancelHide();
      hideTimer = setTimeout(() => { closeSub(); }, 160);
    };
    subRow.addEventListener('mouseenter', () => { cancelHide(); openSub(); });
    subRow.addEventListener('mouseleave', scheduleHide);
    subPanel.addEventListener('mouseenter', cancelHide);
    subPanel.addEventListener('mouseleave', scheduleHide);
    // 点击入口：固定展开/收起（触屏或不想悬停时用）
    subRow.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (subOpen) closeSub(); else { cancelHide(); openSub(); }
    });

    m.append(subRow);

    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth;
    const mh = m.offsetHeight;
    let left = r.left;
    let top = r.bottom + 6;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    if (left < 8) left = 8;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    m.style.left = Math.round(left) + 'px';
    m.style.top = Math.round(top) + 'px';
    folderPjifyEl = m;
    folderCloseOnOutside();
  }

  function folderClosePjify() {
    if (folderPjifySubClose) {
      try { folderPjifySubClose(); } catch (e) { /* 忽略 */ }
      folderPjifySubClose = null;
    }
    if (folderPjifyEl && folderPjifyEl.parentElement) folderPjifyEl.remove();
    folderPjifyEl = null;
  }

  let folderOutsideBound = false;
  function folderCloseOnOutside() {
    if (folderOutsideBound) return;
    folderOutsideBound = true;
    document.addEventListener('click', (e) => {
      if (!folderPjifyEl) return;
      if (folderPjifyEl.contains(e.target)) return;
      folderClosePjify();
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') folderClosePjify();
    });
    window.addEventListener('resize', folderClosePjify);
  }

  // 主循环：每秒一次。有变化才重建，其余时间几乎零开销。
  /* ---------- 阻止原生「项目」区自动展开 ---------- */
  // 原生会在这些时机自动展开项目行：进入项目内会话、侧栏重渲染、从项目页返回。
  // 开启「锁定项目展开」后，我们把这些自动展开按回去，只有用户亲手点的才放行。
  const folderProjGuard = {
    armed: false,                      // 我们主动按回去时置位，避免和用户点击混淆
    userTouchedAt: 0,                  // 用户最近一次点项目行的时间
    collapsed: Object.create(null)     // 项目名 -> 是否已被我们收起
  };

  function folderProjRowExpanded(row) {
    return row.getAttribute('aria-expanded') === 'true';
  }

  // 收集原生「项目」区块里的项目行（排除区块标题与自家节点）
  function folderNativeProjRows() {
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (!nav) return [];
    return [...nav.querySelectorAll('[role="button"]')].filter((el) => {
      if (!folderIsProjectRow(el)) return false;
      if (el.closest('.craber-folders')) return false;
      const t = (el.textContent || '').trim();
      if (!t || t === '项目' || t === '最近') return false;
      return true;
    });
  }

  // 原生项目行的展开状态记到 localStorage。
  // 之前的实现只存在内存里，而且"只记录看到收起的"——
  // 于是打开开关时项目本来就是展开的、之后就再也没记录过，
  // 原生下次自动展开时我们根本不干预（表现为"锁了没用"）。
  function folderGuardLoad() {
    try {
      const raw = localStorage.getItem('gpt_craber_proj_guard');
      if (raw) {
        const j = JSON.parse(raw);
        if (j && j.collapsed) folderProjGuard.collapsed = j.collapsed;
      }
    } catch (e) { /* 损坏就重来 */ }
  }
  function folderGuardSave() {
    try {
      localStorage.setItem('gpt_craber_proj_guard',
        JSON.stringify({ collapsed: folderProjGuard.collapsed }));
    } catch (e) { /* 忽略 */ }
  }

  function folderGuardProjAutoExpand() {
    if (!uiPrefs.lockProjExpand) return;
    const now = Date.now();
    let dirty = false;
    for (const row of folderNativeProjRows()) {
      const name = (row.textContent || '').trim();
      const expanded = folderProjRowExpanded(row);

      if (!expanded) {
        // 收起状态：记为"用户想让它收起"（下次被原生自动展开时按回去）
        if (folderProjGuard.collapsed[name] !== true) {
          folderProjGuard.collapsed[name] = true;
          dirty = true;
        }
        continue;
      }

      // 展开状态
      if (folderProjGuard.armed) continue;
      if (now - folderProjGuard.userTouchedAt < 500) continue;   // 用户刚点过，放行

      // 从没被收起过的项目：不干预（尊重原生初始状态）。
      // 但用户一旦手动收起过，就一定在表里，之后就会被锁住。
      if (folderProjGuard.collapsed[name] !== true) continue;

      folderProjGuard.armed = true;
      try { row.click(); } catch (e) { /* 点不动就忽略 */ }
      setTimeout(() => { folderProjGuard.armed = false; }, 150);
    }
    if (dirty) folderGuardSave();
  }

  // 记录"用户亲手点了项目行"，并在状态稳定后记住用户要的展开状态
  let folderGuardLoaded = false;
  function folderBindProjRowClick() {
    if (!folderGuardLoaded) { folderGuardLoaded = true; folderGuardLoad(); }   // 恢复上次的收起记录
    const nav = document.querySelector('nav[aria-label="聊天记录"]');
    if (!nav || nav.dataset.craberProjGuard === '1') return;
    nav.dataset.craberProjGuard = '1';
    nav.addEventListener('click', (e) => {
      if (!uiPrefs.lockProjExpand) return;
      const row = e.target && e.target.closest ? e.target.closest('[role="button"]') : null;
      if (!row || !folderIsProjectRow(row) || row.closest('.craber-folders')) return;
      const t = (row.textContent || '').trim();
      if (!t || t === '项目' || t === '最近') return;
      folderProjGuard.userTouchedAt = Date.now();
      setTimeout(() => {
        const name = (row.textContent || '').trim();
        // 用户亲手点过：以点完后的状态为准，并持久化
        folderProjGuard.collapsed[name] = !folderProjRowExpanded(row);
        folderGuardSave();
      }, 300);
    }, true);
  }

  function foldersTick() {
    if (!uiPrefs.folders) { folderUnmount(); return; }
    if (!folderData || folderDataOwner !== craberAccountKey()) {
      folderData = loadFolders();
      folderDataOwner = craberAccountKey();
      folderRenderedSig = '';
    }
    folderScanRows();
    folderBindProjRowClick();
    folderAutoExpand();   // 当前会话所在文件夹自动展开（每个只自动开一次）
    folderGuardProjAutoExpand();
    renderFolders();
    folderHydrateTitles();
  }

  /* ============================================================
   * 对话完成通知
   * ========================================================== */

  // ChatGPT 没有"回复生成完成"的浏览器通知 —— 切到别的标签页就只能干等。
  // 这里复用 pbarGenerating() 的停止按钮检测，每秒看一眼状态，
  // 在"生成中 → 结束"的下降沿发一条系统通知。
  //
  // 会话名读 document.title：普通会话页和项目会话页它都是会话名
  // （站点格式是"会话名 | ChatGPT"，剥掉后缀），不调后端接口，零限流风险。
  function notifyCleanTitle() {
    let t = document.title || '';
    const sep = t.lastIndexOf('|');
    if (sep > 0) t = t.slice(0, sep).trim();
    return t || '当前对话';
  }

  let notifyWasGenerating = false;  // 上一秒是否在生成（下降沿检测的状态位）
  let notifyConvId = null;          // 生成开始时的会话 id（防生成期间切走误报）

  function notifyTick() {
    if (!uiPrefs.notify) {
      // 开关关闭时复位状态位：否则"生成中打开开关"会被误判成结束沿
      notifyWasGenerating = false;
      notifyConvId = null;
      return;
    }
    if (typeof Notification === 'undefined') return;
    const gen = pbarGenerating();
    const convId = getConvId();
    if (gen && !notifyWasGenerating) notifyConvId = convId;   // 生成开始，记下会话
    // 结束沿：生成期间没切走会话才发 —— 切走说明用户在别的对话里，别打扰
    if (!gen && notifyWasGenerating && notifyConvId && convId === notifyConvId) {
      notifyFire(notifyCleanTitle());
    }
    notifyWasGenerating = gen;
    if (!gen) notifyConvId = null;
  }

  function notifyFire(title) {
    try {
      if (Notification.permission !== 'granted') return;
      const n = new Notification('craber · 回复已生成', {
        body: title,
        tag: 'craber-gen-done'   // 同 tag 去重：连发只留一条，不堆积
      });
      n.addEventListener('click', () => {
        try { window.focus(); } catch (e) {}
        n.close();
      });
      // 8 秒后自动关，避免在通知中心留一排过期通知
      setTimeout(() => { try { n.close(); } catch (e) {} }, 8000);
    } catch (e) { /* 通知失败不影响主流程 */ }
  }

  // 权限请求必须在用户点击手势内发出才不会被浏览器拦，所以只挂在
  // 开关的点击分支里（setUiPref），绝不放 tick 里反复骚扰。
  function notifyRequestPermission() {
    try {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'default') Notification.requestPermission();
    } catch (e) {}
  }

  /* ============================================================
   * UI：悬浮按钮 + 单条导出按钮注入
   * ========================================================== */

  // 悬浮球：可拖拽（位置存 localStorage），双击展开菜单（会话列表 / 导出当前）。
  // 固定右下角会挡内容，改成用户可随手拖到不碍事的位置。
  // 导出按钮与它的下拉菜单（都挂在原生顶栏里，见 mountFab）。
  let fabEl = null;

  // 界面增强开关。默认都开，用户可各自关掉。
  // 关掉必须真的卸载（移除已注入的节点 + 停掉后续挂载），而不是只隐藏 ——
  // 否则功能还在后台跑、还会去请求接口。
  const UI_PREFS_KEY = 'gpt_craber_ui_prefs';
  const UI_PREFS_DEFAULT = { navRail: true, projectUI: true, notify: false, folders: true, lockProjExpand: false };
  let uiPrefs = (() => {
    try {
      const raw = localStorage.getItem(UI_PREFS_KEY);
      return Object.assign({}, UI_PREFS_DEFAULT, raw ? JSON.parse(raw) : {});
    } catch (e) { return Object.assign({}, UI_PREFS_DEFAULT); }
  })();

  function setUiPref(key, on) {
    uiPrefs[key] = !!on;
    try { localStorage.setItem(UI_PREFS_KEY, JSON.stringify(uiPrefs)); } catch (e) {}
    if (key === 'navRail') {
      if (on) scheduleNavRender(0, true);
      else hideNavRailNow();          // 立刻收起，不等下一轮 tick
    } else if (key === 'projectUI') {
      if (on) pbarTick();
      else pbarUnmount();
    } else if (key === 'notify') {
      // 借这次点击手势请求通知权限（浏览器只放行用户手势内的权限请求）。
      // 关闭时无需清理：notifyTick 下一秒自己会复位状态位。
      if (on) notifyRequestPermission();
    } else if (key === 'lockProjExpand') {
      // 打开开关的瞬间，把"当前已展开"的项目也纳入守护范围：
      // 用户点这个开关的本意就是"从现在起别再自动弹开"。
      // 关闭时清空记录，回到完全交给原生。
      if (on) {
        for (const row of folderNativeProjRows()) {
          const name = (row.textContent || '').trim();
          // 已展开的：标记为"想让它收起"，这样原生下次自动展开就会被按回去。
          // 注意这里不主动点它（用户可能正看着某个项目的内容）。
          if (folderProjRowExpanded(row)) folderProjGuard.collapsed[name] = true;
        }
        folderGuardSave();
        navToast('已锁定：项目不会再自动展开');
      } else {
        folderProjGuard.collapsed = Object.create(null);
        folderGuardSave();
      }
    } else if (key === 'folders') {
      // 开：立刻挂上；关：撤掉区块和原生行上的小按钮
      if (on) { foldersTick(); }
      else {
        folderUnmount();
        folderClosePjify();
        document.querySelectorAll('.craber-pj-btn').forEach((b) => b.remove());
        document.querySelectorAll('.craber-pj-host').forEach((n) => n.classList.remove('craber-pj-host'));
      }
    }
  }

  // 关掉节点导航时把轨道连同卡片一并撤下
  function hideNavRailNow() {
    resetNavRail();
    if (navRailEl) { navRailEl.remove(); navRailEl = null; }
    hideNavCard();
    hideNavPanel();
  }

  // 判断当前是不是深色主题。
  // 优先看 ChatGPT 自己的 html[data-theme]（它的主题开关），而不是系统偏好 ——
  // 两者可以不一致：站点设成浅色、系统却是深色时，只有按站点算才画得对。
  // data-theme 缺失或取值意外时退回 prefers-color-scheme。
  function isDarkTheme() {
    const t = document.documentElement.dataset.theme ||
      document.body.dataset.theme || '';
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // 描边：深色主题白、浅色主题黑。颜色写自定义属性，由样式表里的
  // outline: 1.5px solid var(--craber-fab-line) 取用。
  function applyFabTheme(ball) {
    const el = ball || document.querySelector('.craber-fab-btn');
    if (!el) return;
    // 顶栏里的按钮比原来悬浮球小得多，描边用较低不透明度即可看清，
    // 太亮会显得脏（尤其是按钮本身就贴着"分享/更多"那排）。
    el.style.setProperty('--craber-fab-line',
      isDarkTheme() ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.4)');
  }

  // 导出按钮的宿主：顶栏右侧那排按钮组（"分享 / 更多"所在处）。
  function fabHost() {
    const hdr = document.querySelector('header');
    if (!hdr) return null;
    const groups = [...hdr.querySelectorAll('div')].filter((d) => {
      const cs = getComputedStyle(d);
      if (cs.display !== 'flex') return false;
      if (cs.marginLeft !== 'auto' && cs.flexGrow !== '0') return false;
      const r = d.getBoundingClientRect();
      return r.height > 24 && r.width > 40 && d.querySelectorAll('button').length > 0;
    });
    if (!groups.length) return null;
    // 取最靠右的那组
    groups.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
    return groups[0];
  }

  // 毛玻璃顶栏只该出现在"会话页"上（/c/{id} 或 /g/{proj}/c/{id}）。
  // 设置页、项目列表页、首页这些页面 ChatGPT 自己的顶栏有自己的观感
  // （设置页甚至是全屏面板），我们再糊一层就是画蛇添足。
  function isConvPage() {
    return !!getConvId();
  }

  // 正文吸顶小标题给顶栏让位。
  //
  // 正文块顶部那条吸顶标题用的是 md:top-(--sticky-padding-top)，而该变量在
  // 当前页面解析为 0px —— 也就是"贴在滚动容器最顶端"。顶栏背景全透明时
  // 两者叠着看不出来；脚本注入项目条后顶栏不再透明，这条吸顶标题就会钻到
  // 顶栏底下被切掉。该变量的本意就是"顶栏下面留多少空间"，设成顶栏高度即可。
  //
  // 落点必须选 main：实测设在 documentElement 上不生效（该变量在更靠内的层级
  // 被重新定义为 0px，根的赋值传不到目标元素）；设在滚动容器上也能生效，但
  // 滚动容器要等内容渲染出来才存在，首屏那几秒会漏设。main 始终在、且是这些
  // 吸顶条的共同祖先，设一处即可覆盖全部。
  function applyHeaderSpacing() {
    const hdr = document.querySelector('header');
    if (!hdr) return;
    const h = Math.round(hdr.getBoundingClientRect().height);
    const main = document.querySelector('main');
    if (main && h > 0) {
      const want = h + 'px';
      if (main.style.getPropertyValue('--sticky-padding-top') !== want) {
        main.style.setProperty('--sticky-padding-top', want);
      }
    }
  }

  // 导出按钮：固定进顶栏右侧，不再做可拖拽悬浮球。
  // 下载/导出和"分享"是同一类操作，放一起位置固定、可预期。
  function mountFab() {
    // 非会话页（设置页 / 首页等）：按钮撤下，不留孤儿 —— 导出入口只在
    // 能导出内容的地方有意义。
    if (!isConvPage()) {
      if (fabEl && fabEl.isConnected) fabEl.remove();
        applyHeaderSpacing();   // 顺路保持吸顶条让位（同一处维护）
      return false;
    }
    const host = fabHost();
    applyHeaderSpacing();   // 顶栏高度变化时吸顶条跟着让位
    if (!host) return false;

    if (fabEl && fabEl.parentElement === host) { applyFabTheme(fabEl); return true; }

    if (!fabEl) {
      fabEl = document.createElement('button');
      fabEl.className = 'craber-fab-btn';
      fabEl.type = 'button';
      fabEl.innerHTML = CRAB_SVG;
      fabEl.title = '导出';
      fabEl.setAttribute('aria-label', '导出');
      fabEl.setAttribute('aria-haspopup', 'true');
      fabEl.setAttribute('aria-expanded', 'false');
      fabEl.addEventListener('click', (e) => {
        // 点在按钮上只开面板；不要冒泡到页面（顶栏里有别的手势处理）
        e.stopPropagation();
        craberOpenSettings();
      });
    }
    host.appendChild(fabEl);



    // 必须在 appendChild 之后再设主题色：元素尚未入 DOM 时先跑一次 transition
    // 注册会生成一个 currentTime 停在 0 的动画，而"运行中的动画"优先级高于内联
    // !important —— 颜色会被永久锁在起始值（实测）。插进文档再设才落得下来。
    applyFabTheme(fabEl);

    // 主题切换联动：data-theme 或 class 一变，所有"JS 算出来的颜色"都要重刷。
    // CSS 变量自己会跟（见样式表里的 html[data-theme] 档），但描边、顶栏底色、
    // 项目条底色是 JS 内联写的，不刷就会残留上一个主题的颜色。
    if (!mountFab.__themed) {
      mountFab.__themed = true;
      // html 的 class 变化非常频繁（滚动状态等都会写），全量重刷浪费；
      // 只在 data-theme 真的变了时才重刷，系统偏好变化走 matchMedia 那条路。
      let lastTheme = document.documentElement.dataset.theme || '';
      const onThemeChange = () => {
        const t = document.documentElement.dataset.theme || '';
        if (t === lastTheme) return;   // 只是 class 抖动，不是换主题
        lastTheme = t;
        applyFabTheme(fabEl);
        pbarTick();               // 项目条挂载状态由它自己判断，重复调用安全
      };
      new MutationObserver(onThemeChange)
        .observe(document.documentElement,
          { attributes: true, attributeFilter: ['data-theme'] });
      try {
        window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', () => {
            lastTheme = document.documentElement.dataset.theme || '';
            applyFabTheme(fabEl);
            pbarTick();
          });
      } catch (e) { /* 老浏览器不支持，忽略 */ }
    }
    return true;
  }

  /* ============================================================
   * 🦀 设置中心：左侧导航 + 右侧内容（多层级）
   *
   * 结构：左侧一级导航（不分组）+ 右侧内容，五个页面平铺：
   *   会话列表 / 功能开关 / 连接设置 / 文件夹同步 / 会话备份
   *
   * 页面用「渲染函数」表达：切页时右栏整体重绘，各自持有自己的状态。
   * 这样每个页面的代码是独立的，不会互相牵连。
   * ========================================================== */

  const CRAB_PAGES = [
    { id: 'conv-list', label: '会话列表', render: () => craberPageConvList() },
    { id: 'features', label: '功能开关', render: () => craberPageFeatures() },
    { id: 'dav-conn', label: '连接设置', render: () => craberPageDavConn() },
    { id: 'dav-sync', label: '文件夹同步', render: () => craberPageDavSync() },
    { id: 'dav-backup', label: '会话备份', render: () => craberPageDavBackup() }
  ];

  /* 设置中心的导航图标
   * 全部按 24 视框精确绘制，共用同一套圆角与端点，缩到 16px 依然清楚。
   * 之前几枚是手搓的近似路径（链条两端弧长不等、同步箭头的钩子角度对不上、
   * 云朵边缘不闭合），小尺寸下显得毛糙；这里换成几何规整的标准造型。
   */
  const SET_ICON = {
    // 列表：三条等长横线 + 左侧圆点（点用 0.01 短线 + 圆头端点，直径与描边一致）
    'conv-list': mi('<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/>'
      + '<path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/>'),
    // 开关：标准胶囊 + 实心旋钮（空心小圆圈在 16px 下会糊成点）
    features: mi('<rect x="2.5" y="6.5" width="19" height="11" rx="5.5"/>'
      + '<circle cx="8" cy="12" r="2.6" fill="currentColor" stroke="none"/>'),
    // 连接：45° 双环链条，两段 5 半径圆弧对称，中间自然咬合
    'dav-conn': mi('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>'
      + '<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
    // 同步：环形双箭头，箭尾钩与圆弧相切，方向感直接
    'dav-sync': mi('<path d="M21 12a9 9 0 0 0-9-9 9.7 9.7 0 0 0-6.7 2.7L3 8"/>'
      + '<path d="M3 3.5V8h4.5"/>'
      + '<path d="M3 12a9 9 0 0 0 9 9 9.7 9.7 0 0 0 6.7-2.7L21 16"/>'
      + '<path d="M21 20.5V16h-4.5"/>'),
    // 备份：闭合云体 + 云内上传箭头（箭头不越出云外，16px 下仍清楚）
    'dav-backup': mi('<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>'
      + '<path d="M12 12v6"/><path d="m9 15 3-3 3 3"/>')
  };

  // 打开设置中心。pageId 可指定初始页。
  function craberOpenSettings(pageId) {
    folderClosePjify();

    let active = pageId || 'features';
    if (!CRAB_PAGES.some((p) => p.id === active)) active = CRAB_PAGES[0].id;

    const wrap = folderEl('div', 'craber-set');
    const nav = folderEl('nav', 'craber-set-nav');
    const body = folderEl('div', 'craber-set-body');

    const navBtns = {};
    for (const p of CRAB_PAGES) {
      const b = folderEl('button', 'craber-set-item');
      b.type = 'button';
      const ic = folderEl('span', 'craber-set-itemico');
      ic.innerHTML = SET_ICON[p.id] || '';
      b.append(ic, folderEl('span', 'craber-set-itemlabel', p.label));
      b.addEventListener('click', (e) => {
        e.preventDefault();
        go(p.id);
      });
      nav.append(b);
      navBtns[p.id] = b;
    }

    function go(id) {
      active = id;
      for (const k of Object.keys(navBtns)) navBtns[k].classList.toggle('on', k === id);
      body.innerHTML = '';
      const page = CRAB_PAGES.find((p) => p.id === id);
      if (page) {
        const el = page.render();
        if (el) body.append(el);
      }
      body.scrollTop = 0;
    }

    wrap.append(nav, body);

    craberDialog({
      title: 'craber',
      subtitle: '导出、界面增强与 WebDAV',
      icon: CRAB_SVG,
      badge: CRABER_VERSION ? 'v' + CRABER_VERSION : '',
      body: wrap,
      confirmText: null,
      // 标题栏的 ×、Esc、点遮罩都能关，底部不再重复放一个「关闭」按钮
      cancelText: null,
      wide: true
    });

    go(active);
  }

  // 工具栏搜索框：图标 + 无边框输入，聚焦时整块亮起
  function craberSearchBox(placeholder, onInput) {
    const wrap = folderEl('div', 'craber-set-searchwrap');
    const ic = folderEl('span', 'craber-set-searchicon');
    ic.innerHTML = mi('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>');
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = placeholder || '';
    inp.addEventListener('input', () => { if (onInput) onInput(inp.value); });
    wrap.append(ic, inp);
    return { el: wrap, input: inp };
  }

  /* 自绘下拉（替代原生 <select>）
   * 原生 select 的弹层由系统绘制：方角、蓝色高亮、字号跟系统走，
   * 在深色主题下还会突然变成白底，和面板整体完全不是一套。
   * 这里用触发器 + 浮层菜单自己画：
   *   - 菜单用 fixed 定位挂到 body 上，避开面板的 overflow 裁切
   *   - 键盘：↑↓ 移动、Enter 选中、Esc 关闭
   *   - 选中项左侧打勾 + 蟹绿淡底，和设置页的 chip 选中态同一套语言
   * 返回 { el, setOptions, getValue, setValue, setDisabled }
   */
  // 所有自绘下拉的浮层菜单（挂在 body 上，需要跟着宿主一起回收）
  const craberMenus = new Set();
  function craberSweepMenus() {
    for (const m of [...craberMenus]) {
      if (m._craberTrigger && m._craberTrigger.isConnected) continue;
      m.remove();
      craberMenus.delete(m);
    }
  }

  function craberDropdown(opts) {
    opts = opts || {};
    let options = (opts.options || []).slice();
    let value = opts.value != null ? opts.value : (options[0] ? options[0].value : '');
    let open = false;
    let hoverIdx = -1;

    const wrap = folderEl('div', 'craber-sel');
    const trigger = folderEl('button', 'craber-sel-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const label = folderEl('span', 'craber-sel-label', '');
    const caret = folderEl('span', 'craber-sel-caret');
    caret.innerHTML = mi('<path d="M6 9.5l6 6 6-6"/>');
    trigger.append(label, caret);
    wrap.append(trigger);

    const menu = folderEl('div', 'craber-selmenu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    // 挂在 body 上：面板有 overflow/transform，放里面会被裁切或定位错乱
    document.body.append(menu);
    // 触发器被移除（关面板 / 切页）后菜单会留在 body 上，
    // 这里登记一下，下次创建或打开下拉时顺手清掉（不做 DOM 监听，避免性能开销）
    craberSweepMenus();
    menu._craberTrigger = trigger;
    craberMenus.add(menu);

    const curLabel = () => {
      const hit = options.find((o) => String(o.value) === String(value));
      return hit ? hit.label : (options[0] ? options[0].label : '');
    };
    const syncLabel = () => {
      label.textContent = curLabel();
      trigger.title = curLabel();
      // 没有可选项时禁用，别留一个点开是空的触发器
      const empty = !options.length;
      trigger.disabled = !!opts.disabled || empty;
      wrap.classList.toggle('craber-sel-empty', empty);
    };

    const placeMenu = () => {
      const r = trigger.getBoundingClientRect();
      const vh = window.innerHeight;
      menu.style.minWidth = Math.round(r.width) + 'px';
      menu.style.maxWidth = Math.max(Math.round(r.width), 260) + 'px';
      menu.style.left = Math.round(r.left) + 'px';
      // 先给个上限，量完高度再决定朝上还是朝下
      let below = vh - r.bottom - 8;
      let above = r.top - 8;
      const h = menu.scrollHeight + 2;
      const up = below < Math.min(h, 140) && above > below;
      menu.style.maxHeight = Math.max(80, Math.min(260, up ? above : below)) + 'px';
      if (up) {
        menu.style.top = '';
        menu.style.bottom = Math.round(vh - r.top + 6) + 'px';
        menu.classList.add('craber-selmenu-up');
      } else {
        menu.style.bottom = '';
        menu.style.top = Math.round(r.bottom + 6) + 'px';
        menu.classList.remove('craber-selmenu-up');
      }
    };

    const paintMenu = () => {
      menu.innerHTML = '';
      options.forEach((o, i) => {
        const on = String(o.value) === String(value);
        const item = folderEl('div', 'craber-selopt' + (on ? ' on' : '')
          + (i === hoverIdx ? ' hi' : ''));
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', on ? 'true' : 'false');
        const t = folderEl('span', 'craber-selopt-txt', o.label);
        const tick = folderEl('span', 'craber-selopt-tick');
        tick.innerHTML = FOLDER_CHECK;
        item.append(t, tick);
        item.addEventListener('mouseenter', () => {
          hoverIdx = i;
          menu.querySelectorAll('.craber-selopt').forEach((n, k) => n.classList.toggle('hi', k === i));
        });
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          choose(o.value);
        });
        menu.append(item);
      });
      if (!options.length) menu.append(folderEl('div', 'craber-selopt-none', '没有可选项'));
    };

    const openMenu = () => {
      if (open || trigger.disabled) return;
      craberSweepMenus();
      open = true;
      hoverIdx = options.findIndex((o) => String(o.value) === String(value));
      paintMenu();
      menu.hidden = false;
      placeMenu();
      // 选中项滚进可视区：几十个项目时否则一打开看不见当前选的是哪个
      const on = menu.querySelector('.craber-selopt.on');
      if (on) {
        const mt = menu.getBoundingClientRect().top;
        const ot = on.getBoundingClientRect().top;
        menu.scrollTop = Math.max(0, menu.scrollTop + (ot - mt) - 6);
      }
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => menu.classList.add('show'));
    };

    const closeMenu = () => {
      if (!open) return;
      open = false;
      menu.classList.remove('show');
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      // 等淡出结束再隐藏，避免"啪"地消失
      const m = menu;
      setTimeout(() => { if (!open) m.hidden = true; }, 120);
    };

    const choose = (v) => {
      value = v;
      syncLabel();
      closeMenu();
      trigger.focus();
      if (opts.onChange) opts.onChange(v);
    };

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (open) closeMenu(); else openMenu();
    });
    // 键盘操作：方向键在菜单里移动，Enter 选中，Esc 收起
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) { openMenu(); return; }
        const step = e.key === 'ArrowDown' ? 1 : -1;
        hoverIdx = (hoverIdx + step + options.length) % options.length;
        const items = menu.querySelectorAll('.craber-selopt');
        items.forEach((n, k) => n.classList.toggle('hi', k === hoverIdx));
        if (items[hoverIdx]) items[hoverIdx].scrollIntoView({ block: 'nearest' });
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && open) {
        e.preventDefault();
        if (options[hoverIdx]) choose(options[hoverIdx].value);
      }
    });

    // 点别处 / 滚动 / 缩放 / Esc：菜单必须收起，否则会飘在错位的地方
    const onDocDown = (e) => {
      if (!open) return;
      if (wrap.contains(e.target) || menu.contains(e.target)) return;
      closeMenu();
    };
    document.addEventListener('pointerdown', onDocDown, true);
    window.addEventListener('scroll', (e) => {
      if (!open) return;
      // 菜单自身滚动（把选中项滚进视野）不能算页面滚动，否则一打开就自己关掉
      const t = e.target;
      if (t === menu) return;
      if (t && t.nodeType === 1 && menu.contains(t)) return;
      closeMenu();
    }, true);
    window.addEventListener('resize', () => { if (open) closeMenu(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) closeMenu();
    }, true);

    syncLabel();

    return {
      el: wrap,
      menu,
      getValue: () => value,
      setValue: (v) => { value = v; syncLabel(); },
      setOptions: (list) => {
        options = (list || []).slice();
        // 选中项没了就退回第一项
        if (!options.some((o) => String(o.value) === String(value)) && options.length) {
          value = options[0].value;
        }
        syncLabel();
        if (open) { paintMenu(); placeMenu(); }
      },
      setDisabled: (d) => { opts.disabled = !!d; syncLabel(); },
      close: closeMenu
    };
  }

  // 加载中的占位行：转圈 + 文案，居中显示在列表区域
  function craberLoadingRow(text) {
    const w = folderEl('div', 'craber-set-loading');
    w.append(folderEl('span', 'craber-spin'));
    w.append(folderEl('span', 'craber-set-loadingtext', text || '加载中…'));
    return w;
  }

  // 页面公共外壳：标题 + 说明 + 内容
  function craberPage(title, desc, ...kids) {
    const p = folderEl('div', 'craber-set-page');
    const hd = folderEl('div', 'craber-set-pagehd');
    hd.append(folderEl('h3', 'craber-set-pagetitle', title));
    if (desc) hd.append(folderEl('div', 'craber-set-pagedesc', desc));
    p.append(hd);
    for (const k of kids) if (k) p.append(k);
    return p;
  }

  /* ---------- 设置中心：各页面 ---------- */

  // 页面 1：会话列表（在设置中心内直接勾选并批量导出）
  function craberPageConvList() {
    const p = craberPage('会话列表', '按时间与项目筛选后勾选导出；列表有缓存，需要最新数据时点刷新。');
    p.classList.add('craber-set-fill');

    let metas = [];
    let loading = false;
    let loadErr = null;
    let kw = '';
    let cacheHit = false;

    /* 筛选状态
     * 原来这页只有搜索框，旧「多会话导出」面板里的项目 / 日期筛选没跟着搬过来，
     * 于是按项目挑会话的功能就丢了。这里按同样的语义补回：
     *   projFilter: 'all' | 'none' | <gizmo_id>
     *   dateRange : 0（全部）| 7 | 15 | 30 | 'custom'
     */
    let projFilter = convFilter.projFilter;
    let dateRange = convFilter.dateRange;
    let dateFrom = convFilter.dateFrom;
    let dateTo = convFilter.dateTo;
    // 任何一项变化都写回模块级状态，切到别的页再回来还是同一套筛选
    const saveFilter = () => {
      convFilter.projFilter = projFilter;
      convFilter.dateRange = dateRange;
      convFilter.dateFrom = dateFrom;
      convFilter.dateTo = dateTo;
    };

    // 工具栏：搜索 + 全选/全不选 + 刷新 + 导出
    const toolbar = folderEl('div', 'craber-set-toolbar');
    const search = craberSearchBox('搜索标题…', (v) => {
      kw = String(v || '').trim().toLowerCase();
      paint();
    });
    toolbar.append(search.el);

    const selAll = folderEl('button', 'craber-set-btn', '全选');
    selAll.type = 'button';
    const selNone = folderEl('button', 'craber-set-btn', '全不选');
    selNone.type = 'button';

    // 刷新：只在需要时重新拉列表（默认走缓存）
    const refreshBtn = folderEl('button', 'craber-set-btn craber-set-iconbtn');
    refreshBtn.type = 'button';
    refreshBtn.title = '重新拉取会话列表';
    refreshBtn.setAttribute('aria-label', '刷新会话列表');
    refreshBtn.innerHTML = mi('<path d="M20 11a8 8 0 0 1-13.7 5.6"/>'
      + '<path d="M4 13a8 8 0 0 1 13.7-5.6"/>'
      + '<path d="M4 5v4h4"/><path d="M20 19v-4h-4"/>');

    const expBtn = folderEl('button', 'craber-set-btn craber-set-btn-primary', '导出所选');
    expBtn.type = 'button';
    toolbar.append(selAll, selNone, refreshBtn, expBtn);
    p.append(toolbar);

    /* 筛选条：日期快捷档 + 项目下拉
     * 日期用 chip（和备份页"备份方式"同一套控件），项目用下拉——
     * 项目数量不定且名字可能很长，chip 会撑成两三行。
     */
    const filterBar = folderEl('div', 'craber-set-filters');

    // 日期
    const dateWrap = folderEl('div', 'craber-set-filter');
    dateWrap.append(folderEl('span', 'craber-set-filterlbl', '时间'));
    const dateChips = folderEl('div', 'craber-dlg-chips');
    const mkDateChip = (val, text) => {
      const lab = folderEl('label', 'craber-dlg-chip');
      const r = document.createElement('input');
      r.type = 'radio';
      r.name = 'craber-conv-date';
      r.value = String(val);
      // 'all' 在状态里存成 0，不能直接比字符串
      const isCur = val === 'all' ? dateRange === 0 : String(dateRange) === String(val);
      if (isCur) r.checked = true;
      lab.append(r, folderEl('span', null, text));
      r.addEventListener('change', () => {
        if (!r.checked) return;
        dateRange = val === 'all' ? 0 : (val === 'custom' ? 'custom' : Number(val));
        dateCustom.hidden = val !== 'custom';
        saveFilter();
        paint();
      });
      dateChips.append(lab);
      return lab;
    };
    mkDateChip('all', '全部');
    mkDateChip(7, '近 7 天');
    mkDateChip(15, '近 15 天');
    mkDateChip(30, '近 30 天');
    mkDateChip('custom', '自定义');

    // 自定义区间：只在选中「自定义」时出现（回到本页时保持上次的状态）
    const dateCustom = folderEl('div', 'craber-set-datecustom');
    dateCustom.hidden = dateRange !== 'custom';
    const mkDateInput = (val, onPick) => {
      const i = document.createElement('input');
      i.type = 'date';
      i.className = 'craber-set-dateinput';
      i.value = val || '';
      i.addEventListener('change', () => { onPick(i.value); saveFilter(); paint(); });
      return i;
    };
    const fromIn = mkDateInput(dateFrom, (v) => { dateFrom = v; });
    const toIn = mkDateInput(dateTo, (v) => { dateTo = v; });
    dateCustom.append(fromIn, folderEl('span', 'craber-set-datesep', '至'), toIn);
    // 自定义行自己占一行（宽度不够时不再把「项目」顶到第三行）
    dateWrap.append(dateChips);
    const dateRow = folderEl('div', 'craber-set-filterrow');
    dateRow.append(dateWrap, dateCustom);

    // 项目：自绘下拉（原生 select 的弹层是系统白框 + 蓝底，跟面板完全不是一套）
    const projWrap = folderEl('div', 'craber-set-filter');
    projWrap.append(folderEl('span', 'craber-set-filterlbl', '项目'));
    const projDD = craberDropdown({
      options: [{ value: 'all', label: '全部项目' }, { value: 'none', label: '无项目' }],
      value: projFilter,
      onChange: (v) => {
        projFilter = v || 'all';
        saveFilter();
        paint();
      }
    });
    projDD.el.setAttribute('aria-label', '按项目筛选');
    projWrap.append(projDD.el);

    filterBar.append(dateRow, projWrap);
    p.append(filterBar);

    // 项目名缓存：gizmo_id -> 名字（异步补，不阻塞首屏）
    const projNames = Object.create(null);
    let projFilled = '';
    const fillProjectOptions = () => {
      const gids = [];
      const seen = Object.create(null);
      for (const m of metas) {
        const gid = getProjectGizmoId(m);
        if (gid && !seen[gid]) { seen[gid] = 1; gids.push(gid); }
      }
      // 没有项目会话时整行隐藏，别留一个只有"全部/无项目"的空下拉
      const sig = gids.slice().sort().join(',');
      projWrap.hidden = !gids.length;
      if (!gids.length) { projFilter = 'all'; return; }
      if (sig === projFilled) return;
      projFilled = sig;

      const build = () => {
        const opts = gids
          .map((gid) => ({ gid, name: projNames[gid] || API._gizmoCache[gid] || gid }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh'));
        // 之前选的项目若已不在列表里就退回"全部"（setOptions 内部也会兜这个底）
        if (projFilter !== 'all' && projFilter !== 'none'
          && !opts.some((o) => o.gid === projFilter)) {
          projFilter = 'all';
        }
        projDD.setOptions([
          { value: 'all', label: '全部项目' },
          { value: 'none', label: '无项目' },
          ...opts.map((o) => ({ value: o.gid, label: o.name }))
        ]);
        projDD.setValue(projFilter);
        // 名字补齐后重绘一次（行内要显示项目名）
        if (!loading) paint();
      };

      // 先就地渲染（有缓存的名字直接用），再异步补齐缺失的。
      // 串行 + 小间隔：几十个项目同时并发会明显放大请求数，更容易触发 401/429。
      build();
      const missing = gids.filter((gid) => !projNames[gid] && !API._gizmoCache[gid]);
      if (!missing.length) return;
      let left = missing.length;
      (async () => {
        for (const gid of missing) {
          const nm = await API.getGizmoName(gid).catch(() => null);
          if (nm) projNames[gid] = nm;
          left--;
          if (left % 5 === 0) await new Promise((r) => setTimeout(r, 120));
        }
        // 名字补齐后重绘一次；不管成功与否都不要再递归重查，
        // 否则取不到的项目会在每次刷新时被反复请求。
        if (!loading) paint();
        projDD.setOptions([
          { value: 'all', label: '全部项目' },
          { value: 'none', label: '无项目' },
          ...gids.map((gid) => ({ value: gid, label: projNames[gid] || API._gizmoCache[gid] || gid }))
            .sort((a, b) => String(a.label).localeCompare(String(b.label), 'zh'))
        ]);
        projDD.setValue(projFilter);
      })();
    };

    const listBox = folderEl('div', 'craber-set-convlist');
    const status = folderEl('div', 'craber-dav-status', '');
    p.append(listBox, status);

    const setStatus = (m, k) => {
      status.textContent = m;
      status.className = 'craber-dav-status' + (k ? ' ' + k : '');
    };

    // 勾选状态存模块级：切到别的页面再回来、或刷新列表后都还在
    const isSel = (id) => !convSelOff.has(id);

    // 会话的更新时间是否落在当前档位内（'all' 时不做判断）
    const inDateRange = (m) => {
      if (dateRange === 0) return true;
      const ts = Number(m.update_time) || 0;
      // 没有时间的会话只在「全部」时才显示，否则无从判断
      if (!ts) return false;
      if (dateRange === 'custom') {
        if (dateFrom) {
          const f = new Date(dateFrom + 'T00:00:00').getTime();
          if (ts < f) return false;
        }
        if (dateTo) {
          const t = new Date(dateTo + 'T23:59:59').getTime();
          if (ts > t) return false;
        }
        return true;
      }
      return ts >= Date.now() - Number(dateRange) * 864e5;
    };

    const shown = () => metas.filter((m) => {
      if (kw && String(m.title || '').toLowerCase().indexOf(kw) < 0) return false;
      if (!inDateRange(m)) return false;
      if (projFilter !== 'all') {
        const gid = getProjectGizmoId(m);
        if (projFilter === 'none') return !gid;
        if (gid !== projFilter) return false;
      }
      return true;
    });

    // 是否有任意筛选生效（用于状态行的"筛选 N"提示）
    const filterActive = () => !!kw || dateRange !== 0 || projFilter !== 'all';

    // 已选数量：始终可见，勾选/取消即时刷新
    const selCount = folderEl('span', 'craber-set-selcount', '');
    toolbar.append(selCount);
    const syncCount = () => {
      const n = metas.filter((m) => isSel(m.id)).length;
      const visible = shown().length;
      const filtered = filterActive() && visible !== metas.length;
      selCount.textContent = metas.length
        ? ('已选 ' + n + ' / ' + metas.length + (filtered ? ' · 筛选 ' + visible : ''))
        : '';
      expBtn.disabled = !n || loading;
      selAll.disabled = loading || !metas.length;
      selNone.disabled = loading || !metas.length;
    };

    // 数据时间提示：缓存命中时说明"这是什么时候的"，刚拉完则说明"已更新"
    const setCacheStatus = () => {
      const c = convCacheLoad();
      if (!c || !c.at) { setStatus(''); return; }
      setStatus('缓存 · ' + davFmtTime(c.at) + ' · 点右侧刷新可重新拉取');
    };

    const paint = () => {
      listBox.innerHTML = '';
      if (loading) {
        listBox.append(craberLoadingRow('正在读取会话列表…'));
        syncCount();
        return;
      }
      if (loadErr) {
        listBox.append(folderEl('div', 'craber-set-note', loadErr));
        syncCount();
        return;
      }
      if (!metas.length) {
        listBox.append(folderEl('div', 'craber-set-note', '没有会话'));
        syncCount();
        return;
      }
      const rows = shown();
      if (!rows.length) { listBox.append(folderEl('div', 'craber-set-note', '没有匹配的会话')); syncCount(); return; }
      rows.forEach((m) => {
        const row = folderEl('label', 'craber-set-convrow');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = isSel(m.id);
        cb.addEventListener('change', () => {
          if (cb.checked) convSelOff.delete(m.id); else convSelOff.add(m.id);
          syncCount();
        });
        // 自绘复选框：原生控件在深色主题下几乎不可见
        const box = folderEl('span', 'craber-box');
        const main = folderEl('div', 'craber-set-turnmain');
        main.append(folderEl('span', 'craber-set-turnq', m.title || m.id));
        // 项目会话补一行项目名：多项目混在一起时，光看标题分不出归属
        const gid = getProjectGizmoId(m);
        const pname = gid ? (projNames[gid] || API._gizmoCache[gid] || '') : '';
        if (pname) main.append(folderEl('span', 'craber-set-turnproj', pname));
        const ts = Number(m.update_time) || 0;
        // 日期挪到行尾只到天：标题一行放得下更多字，右侧一列也便于扫读
        row.append(cb, box, main);
        if (ts) row.append(folderEl('span', 'craber-set-rowdate', davFmtDay(ts)));
        listBox.append(row);
      });
      syncCount();
    };

    // 拉取（force=true 时忽略缓存）
    const load = async (force) => {
      if (!force) {
        const c = convCacheLoad();
        if (convCacheFresh(c)) {
          metas = c.items.slice();
          cacheHit = true;
          loading = false;
          fillProjectOptions();
          paint();
          setCacheStatus();
          return;
        }
      }
      cacheHit = false;
      loading = true;
      loadErr = null;
      refreshBtn.classList.add('craber-spinning');
      refreshBtn.disabled = true;
      paint();
      setStatus(force ? '正在刷新…' : '正在读取会话列表…', '');
      try {
        metas = await fetchAllConversations((n, total) => {
          setStatus('读取中 ' + n + '/' + (total || '…'), '');
        });
        convCacheSave(metas);
        // 列表变了：把已经不存在的 id 从"取消勾选"集合里清掉，
        // 免得同名 id 之后再出现时莫名其妙是未勾选状态
        const alive = new Set(metas.map((m) => m.id));
        for (const id of [...convSelOff]) if (!alive.has(id)) convSelOff.delete(id);
        fillProjectOptions();
      } catch (e) {
        loadErr = '读取失败：' + (e && e.message ? e.message : '未知错误');
        // 有缓存就先用缓存顶着，总比一片空白好
        const c = convCacheLoad();
        if (c && c.items.length) {
          metas = c.items.slice();
          cacheHit = true;
          loadErr = null;
          fillProjectOptions();
        }
      } finally {
        loading = false;
        refreshBtn.classList.remove('craber-spinning');
        refreshBtn.disabled = false;
        paint();
        if (loadErr) setStatus('刷新失败，请稍后重试', 'err');
        else if (cacheHit) setCacheStatus();
        else {
          const c = convCacheLoad();
          setStatus('已更新 · ' + davFmtTime(c ? c.at : Date.now()), 'ok');
        }
      }
    };

    load(false);

    refreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (loading) return;
      load(true);
    });

    selAll.addEventListener('click', (e) => {
      e.preventDefault();
      shown().forEach((m) => convSelOff.delete(m.id));
      paint();
    });
    selNone.addEventListener('click', (e) => {
      e.preventDefault();
      shown().forEach((m) => convSelOff.add(m.id));
      paint();
    });
    expBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const picked = metas.filter((m) => isSel(m.id));
      if (!picked.length) { setStatus('没有勾选任何会话', 'err'); return; }
      expBtn.disabled = true;
      expBtn.textContent = '导出中…';
      try {
        await exportConversations(picked, (done, total, note) => {
          setStatus(note || ('导出中 ' + done + '/' + total), '');
        });
        setStatus('已导出 ' + picked.length + ' 个会话', 'ok');
      } catch (err) {
        setStatus('导出失败：' + (err && err.message ? err.message : '未知错误'), 'err');
      } finally {
        syncCount();
      }
    });

    return p;
  }

  // 页面 2：功能开关
  function craberPageFeatures() {
    const p = craberPage('功能开关', '关掉后对应功能立即卸载，刷新后保持。');
    const list = folderEl('div', 'craber-set-list');
    /* 每行一枚图标：都按 24 视框同一套圆角绘制。
     * 原来"项目 UI 优化"画成信用卡、锁的锁体偏胖，和导航那套不像一家人。
     */
    const items = [
      // 节点导航：竖向轨道 + 两个节点 + 对应的展开行
      ['navRail', '节点导航', '在会话左侧显示回合节点轨道，可悬停预览、点击跳转',
        '<path d="M6.5 4v16"/>'
          + '<circle cx="6.5" cy="8.5" r="2" fill="currentColor" stroke="none"/>'
          + '<circle cx="6.5" cy="15.5" r="2" fill="currentColor" stroke="none"/>'
          + '<path d="M11.5 8.5H20"/><path d="M11.5 15.5H20"/>'],
      // 项目 UI：顶栏 + 内容区（版式示意）
      ['projectUI', '项目 UI 优化', '在顶栏里显示项目对话入口与当前对话位置',
        '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/>'
          + '<path d="M3 9.5h18"/>'
          + '<path d="M6.5 6.9h3"/><path d="M6.5 12.8h6"/><path d="M6.5 16h4"/>'],
      // 完成通知：铃铛（钟形 + 底部铃舌，下缘收窄成真实铃口）
      ['notify', '完成通知', '回复生成完成后发送浏览器通知',
        '<path d="M18 9.5a6 6 0 1 0-12 0c0 4-1.5 5.5-2.5 6.5h17c-1-1-2.5-2.5-2.5-6.5z"/>'
          + '<path d="M10 19.5a2.2 2.2 0 0 0 4 0"/>'],
      // 侧栏文件夹：与侧栏一致的小文件夹
      ['folders', '侧栏文件夹', '在侧栏「项目」上方显示自定义文件夹',
        '<path d="' + FOLDER_PATH + '"/>'],
      // 锁定项目展开：锁（锁体 14 高、锁梁与锁体同宽，比例标准）
      ['lockProjExpand', '锁定项目展开', '阻止原生「项目」区自动展开',
        '<rect x="4" y="10" width="16" height="10.5" rx="2.6"/>'
          + '<path d="M8 10V7.6a4 4 0 0 1 8 0V10"/>'
          + '<path d="M12 14v3"/>']
    ];
    for (const [key, label, desc, iconPath] of items) {
      // craber-fab-toggle 是开关选中态的选择器前缀（.craber-fab-toggle.on），
      // 缺了它开关永远显示为关闭
      const row = folderEl('button', 'craber-set-row craber-set-switch craber-fab-toggle');
      row.type = 'button';
      row.setAttribute('role', 'switch');
      const ico = folderEl('span', 'craber-set-ico');
      ico.innerHTML = mi(iconPath);
      const main = folderEl('div', 'craber-set-rowmain');
      main.append(folderEl('span', 'craber-set-rowlabel', label));
      main.append(folderEl('span', 'craber-set-rowdesc', desc));
      const sw = folderEl('span', 'craber-fab-switch');
      row.append(ico, main, sw);
      const sync = () => {
        const on = !!uiPrefs[key];
        row.setAttribute('aria-checked', on ? 'true' : 'false');
        row.classList.toggle('on', on);
      };
      row.addEventListener('click', (e) => {
        e.preventDefault();
        setUiPref(key, !uiPrefs[key]);
        sync();
      });
      sync();
      list.append(row);
    }
    p.append(list);
    return p;
  }

  // 页面 3：WebDAV 连接设置
  function craberPageDavConn() {
    const cfg = davLoad();
    const p = craberPage('连接设置', '数据存在你自己的网盘里，只同步文件夹结构。');

    const box = folderEl('div', 'craber-set-form');
    // 横向行：左边标签+说明，右边输入框
    const mkField = (label, hint, value, ph, type) => {
      const w = folderEl('div', 'craber-set-field');
      const col = folderEl('div', 'craber-set-fieldcol');
      col.append(folderEl('div', 'craber-set-label', label));
      if (hint) col.append(folderEl('div', 'craber-set-hint', hint));
      const ctrl = folderEl('div', 'craber-set-ctrl');
      const inp = document.createElement('input');
      inp.type = type || 'text';
      inp.className = 'craber-dlg-input';
      inp.value = value || '';
      if (ph) inp.placeholder = ph;
      ctrl.append(inp);
      w.append(col, ctrl);
      box.append(w);
      return inp;
    };
    const urlIn = mkField('服务器地址', 'WebDAV 的根地址', cfg.url, 'https://example.com/dav/');
    const userIn = mkField('用户名', '', cfg.user, '一般就是 WebDAV 的登录名');
    const passIn = mkField('密码', '部分服务要填应用密码', cfg.pass, '••••••••', 'password');

    const status = folderEl('div', 'craber-dav-status', '');
    const setStatus = (m, k) => {
      status.textContent = m;
      status.className = 'craber-dav-status' + (k ? ' ' + k : '');
    };
    p.append(box, status);

    const collect = () => {
      const c = davLoad();
      c.url = urlIn.value.trim();
      c.user = userIn.value.trim();
      c.pass = passIn.value;
      return c;
    };

    const bar = folderEl('div', 'craber-set-actions');
    const testBtn = folderEl('button', 'craber-set-btn', '测试连接');
    testBtn.type = 'button';
    testBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const c = collect();
      if (!c.url) { setStatus('请先填写服务器地址', 'err'); return; }
      const old = testBtn.textContent;
      testBtn.disabled = true;
      testBtn.textContent = '测试中…';
      setStatus('正在连接…', '');
      try {
        await davTest(c);
        setStatus('连接成功 ✓ 地址与凭证可用', 'ok');
      } catch (err) {
        setStatus(err && err.message ? err.message : '连接失败', 'err');
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = old;
      }
    });

    const saveBtn = folderEl('button', 'craber-set-btn craber-set-btn-primary', '保存');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      davSave(collect());
      setStatus('已保存', 'ok');
    });

    bar.append(testBtn, saveBtn);
    p.append(bar);
    return p;
  }

  /* ---------- 页面 4：文件夹同步 ---------- */
  function craberPageDavSync() {
    const cfg = davLoad();
    const p = craberPage('文件夹同步', '按文件夹名合并：两边各有的都保留，同名的把条目并起来。');

    /* 每个账号一个远端文件：同一个 WebDAV 多账号用时互不覆盖。
     * 页面上直接写清楚"同步的是哪个文件"，换账号后发现看不到旧数据时不会以为丢东西。
     */
    const remoteInfo = folderEl('div', 'craber-set-field craber-set-field-stack');
    const rCol = folderEl('div', 'craber-set-fieldcol');
    rCol.append(folderEl('div', 'craber-set-label', '远端文件'));
    const rHint = folderEl('div', 'craber-set-hint', '');
    rCol.append(rHint);
    const rRow = folderEl('div', 'craber-locrow');
    const rBadge = folderEl('div', 'craber-acct');
    const rIco = folderEl('span', 'craber-acct-ico');
    rIco.innerHTML = mi('<path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>');
    const rName = folderEl('span', 'craber-acct-name', '识别中…');
    rBadge.append(rIco, rName);
    const rPath = folderEl('div', 'craber-pathprev');
    const rPathCode = folderEl('span', 'craber-pathprev-path', '');
    rPath.append(folderEl('span', 'craber-pathprev-label', '远端'), rPathCode);
    rRow.append(rBadge, rPath);
    remoteInfo.append(rCol, rRow);
    p.append(remoteInfo);

    const paintRemoteInfo = () => {
      const who = craberAccountKey();
      const file = davRemoteName();
      rName.textContent = who || '未识别账号';
      if (!who) rName.classList.add('craber-acct-name-warn');
      else rName.classList.remove('craber-acct-name-warn');
      rName.title = who ? ('文件夹数据按账号分开存放：' + who) : '没读到账号名，将沿用旧的公共文件';
      rPathCode.textContent = file;
      rPathCode.title = file;
      rHint.textContent = who
        ? '每个账号一个文件，同一台 WebDAV 上多账号互不覆盖'
        : '没读到账号名，暂时沿用旧的公共文件 craber-folders.json';
    };
    paintRemoteInfo();
    // 缓存里可能还没有账号名：异步补一次
    craberAccountInfo(false).then(() => paintRemoteInfo()).catch(() => {});

    const notReady = () => {
      if (!cfg.url) {
        p.append(folderEl('div', 'craber-set-note', '还没配置服务器，请先到「连接设置」填写地址与账号。'));
        return true;
      }
      if (!uiPrefs.folders) {
        p.append(folderEl('div', 'craber-set-note', '「侧栏文件夹」功能当前是关闭的，开启后才有内容可同步。'));
      }
      return false;
    };

    // 本地概况：让用户知道"同步的是什么东西"
    const folders = (folderData && folderData.folders) || [];
    const itemCount = folders.reduce((n, f) => n + (Array.isArray(f.items) ? f.items.length : 0), 0);
    const info = folderEl('div', 'craber-set-stats');
    const stat = (label, value) => {
      const c = folderEl('div', 'craber-set-stat');
      c.append(folderEl('div', 'craber-set-statnum', String(value)));
      c.append(folderEl('div', 'craber-set-statlbl', label));
      return c;
    };
    info.append(
      stat('文件夹', folders.length),
      stat('条目', itemCount),
      stat('上次同步', cfg.lastSync ? davFmtTime(cfg.lastSync) : '—')
    );
    p.append(info);

    if (notReady()) return p;

    const status = folderEl('div', 'craber-dav-status', '');
    const setStatus = (m, k) => {
      status.textContent = m;
      status.className = 'craber-dav-status' + (k ? ' ' + k : '');
    };

    // 三种方向：合并 / 只拉 / 只推
    const bar = folderEl('div', 'craber-set-actions');
    const runBtn = (label, dir, primary, title) => {
      const b = folderEl('button', 'craber-set-btn' + (primary ? ' craber-set-btn-primary' : ''), label);
      b.type = 'button';
      if (title) b.title = title;
      b.addEventListener('click', async (e) => {
        e.preventDefault();
        const all = bar.querySelectorAll('button');
        all.forEach((x) => { x.disabled = true; });
        const old = b.textContent;
        b.textContent = '同步中…';
        setStatus('');
        try {
          await davSync(dir);
          setStatus('完成', 'ok');
        } catch (err) {
          setStatus(err && err.message ? err.message : '同步失败', 'err');
        } finally {
          all.forEach((x) => { x.disabled = false; });
          b.textContent = old;
        }
      });
      return b;
    };
    bar.append(
      runBtn('双向同步', 'both', true, '取远端并合并，然后回写'),
      runBtn('仅从远端拉取', 'pull', false, '只把远端变更应用到本地'),
      runBtn('仅推送到远端', 'push', false, '只把本地变更写到远端')
    );
    p.append(bar, status);

    // 同步记录（带详细变更）
    const logHead = folderEl('div', 'craber-dav-loghead');
    logHead.append(folderEl('span', 'craber-dav-logtitle', '同步记录'));
    const logMeta = folderEl('span', 'craber-dav-logmeta', '');
    const clearBtn = folderEl('button', 'craber-dav-clear', '清空');
    clearBtn.type = 'button';
    logHead.append(logMeta, clearBtn);

    const logList = folderEl('div', 'craber-dav-loglist');
    const renderLog = () => {
      const rows = davLogLoad();
      logList.innerHTML = '';
      logMeta.textContent = rows.length ? (rows.length + ' 条') : '';
      if (!rows.length) {
        logList.append(folderEl('div', 'craber-dav-logempty', '还没有同步记录'));
        return;
      }
      for (const r of rows) {
        const row = folderEl('div', 'craber-dav-logrow' + (r.ok ? '' : ' err'));
        row.append(folderEl('span', 'craber-dav-logdot'));
        const main = folderEl('div', 'craber-dav-logmain');
        const line = folderEl('div', 'craber-dav-logline');
        line.append(folderEl('span', 'craber-dav-logname',
          (r.ok ? '✓ ' : '✗ ') + (r.action || '同步')));
        const add = Number(r.add) || 0;
        const del = Number(r.del) || 0;
        if (add > 0) line.append(folderEl('span', 'craber-dav-chip add', '+' + add));
        if (del > 0) line.append(folderEl('span', 'craber-dav-chip del', '-' + del));
        main.append(line);
        // 细分：文件夹与条目分别计数，比笼统一个数字有用
        const d = r.diff;
        if (d && (d.folderAdd || d.folderDel || d.itemAdd || d.itemDel)) {
          const det = [];
          if (d.folderAdd) det.push('文件夹 +' + d.folderAdd);
          if (d.folderDel) det.push('文件夹 -' + d.folderDel);
          if (d.itemAdd) det.push('条目 +' + d.itemAdd);
          if (d.itemDel) det.push('条目 -' + d.itemDel);
          main.append(folderEl('div', 'craber-dav-logdetail', det.join(' · ')));
        } else if (r.detail) {
          main.append(folderEl('div', 'craber-dav-logdetail', r.detail));
        }
        row.append(main, folderEl('span', 'craber-dav-logtime', davFmtTime(r.at)));
        logList.append(row);
      }
    };
    renderLog();
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      davLogClear();
      renderLog();
    });

    p.append(logHead, logList);
    return p;
  }

  // 选择项目 / 会话的多选对话框。返回 Promise<string[]>，取消时返回 null。
  function craberPickScope(kind, selected) {
    return new Promise((resolve) => {
      const cur = new Set(selected || []);
      const meta = {};          // value -> 展示用标签（chip 要用）
      (selected || []).forEach((v) => { meta[v] = { label: v, meta: '' }; });

      const box = folderEl('div', 'craber-pick');
      const listBox = folderEl('div', 'craber-pick-list');
      const status = folderEl('div', 'craber-dav-status', '');
      // 注意：kw / paint 在搜索回调里被引用，声明必须先于 craberSearchBox，
      // 否则回调执行时命中暂时死区（TDZ）。
      let items = [];
      let kw = '';
      let loading = true;
      let finished = false;

      // 工具条：[搜索框] [全选] [清空]，与列表里的可勾选行同高
      const tools = folderEl('div', 'craber-pick-tools');
      const search = craberSearchBox(kind === 'projects' ? '搜索项目…' : '搜索会话…',
        (v) => {
          kw = String(v || '').trim().toLowerCase();
          paint();
        });
      const allBtn = folderEl('button', 'craber-set-btn craber-set-btn-sm', '全选');
      allBtn.type = 'button';
      allBtn.title = '勾选当前筛选出的全部条目';
      const noneBtn = folderEl('button', 'craber-set-btn craber-set-btn-sm', '清空');
      noneBtn.type = 'button';
      noneBtn.title = '取消全部勾选';
      tools.append(search.el, allBtn, noneBtn);

      // 已选区：勾了哪些一眼可见，点 × 直接移除
      const pickedWrap = folderEl('div', 'craber-pick-pickedwrap');
      const pickedHd = folderEl('div', 'craber-pick-pickedhd');
      const pickedCount = folderEl('span', 'craber-pick-pickedcount', '');
      pickedHd.append(pickedCount);
      const pickedBar = folderEl('div', 'craber-pick-picked');
      pickedWrap.append(pickedHd, pickedBar);
      pickedWrap.hidden = true;
      box.append(tools, pickedWrap, listBox, status);

      // 确定按钮上的数量：paint 里会调用，先声明好
      let okBtn = null;
      const syncOk = () => {
        if (!okBtn) return;
        okBtn.textContent = cur.size ? ('确定（' + cur.size + '）') : '确定';
      };

      const finish = (val) => {
        if (finished) return;
        finished = true;
        resolve(val);
      };

      const shownRows = () => items.filter((it) => {
        if (!kw) return true;
        return String(it.label || '').toLowerCase().indexOf(kw) >= 0;
      });

      // 已选 chip 区：有勾选才显示；右侧「清空」已由工具条提供
      const paintPicked = () => {
        pickedBar.innerHTML = '';
        const pickedList = items.filter((it) => cur.has(it.value));
        // 传进来时已选、但不在本次列表里的：只在数据回来后按缓存名显示，
        // 否则会把 id（conv-xxxx）当成名字画出来。
        const extra = loading
          ? []
          : [...cur].filter((v) => !items.some((it) => it.value === v));
        const total = pickedList.length + extra.length;
        pickedWrap.hidden = !total;
        if (!total) return;
        pickedCount.textContent = '已选 ' + total + ' 项';
        for (const it of pickedList) {
          pickedBar.append(craberSelChip(it.label, () => {
            cur.delete(it.value);
            paint();
          }));
        }
        for (const v of extra) {
          const m = meta[v] || {};
          pickedBar.append(craberSelChip(m.label || v, () => {
            cur.delete(v);
            paint();
          }));
        }
      };

      const syncTools = () => {
        const rows = shownRows();
        const remaining = rows.filter((it) => !cur.has(it.value)).length;
        allBtn.disabled = loading || !rows.length || remaining === 0;
        noneBtn.disabled = loading || cur.size === 0;
      };

      const paint = () => {
        listBox.innerHTML = '';
        if (loading) {
          listBox.append(craberLoadingRow(
            kind === 'projects' ? '正在读取项目列表…' : '正在读取会话列表…'));
          paintPicked();
          syncOk();
          syncTools();
          return;
        }
        const rows = shownRows();
        if (!rows.length) {
          listBox.append(folderEl('div', 'craber-set-note', '没有匹配项'));
        }
        for (const it of rows) {
          const row = folderEl('label', 'craber-set-convrow');
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = cur.has(it.value);
          cb.addEventListener('change', () => {
            if (cb.checked) cur.add(it.value); else cur.delete(it.value);
            paintPicked();
            syncOk();
            syncTools();
          });
          const boxEl = folderEl('span', 'craber-box');
          const main = folderEl('div', 'craber-set-turnmain');
          main.append(folderEl('span', 'craber-set-turnq', it.label));
          if (it.meta) main.append(folderEl('span', 'craber-set-turnmeta', it.meta));
          row.append(cb, boxEl, main);
          listBox.append(row);
        }
        paintPicked();
        syncOk();
        syncTools();
      };

      (async () => {
        try {
          if (kind === 'projects') {
            const list = await craberListProjects();
            items = (list || []).map((p) => ({ value: p.name, label: p.name, meta: '' }));
          } else {
            const all = await fetchAllConversations();
            items = all.map((c) => ({
              value: c.id,
              label: c.title || c.id,
              meta: c.update_time ? davFmtDay(c.update_time) : ''
            }));
          }
          items.forEach((it) => {
            meta[it.value] = it;
            craberRememberPickLabel(it.value, it.label);
          });
          status.textContent = items.length + (kind === 'projects' ? ' 个项目' : ' 个会话');
        } catch (e) {
          items = [];
          status.textContent = '读取失败：' + (e && e.message ? e.message : '未知错误');
          status.className = 'craber-dav-status err';
        } finally {
          loading = false;
          paint();
        }
      })();

      allBtn.addEventListener('click', (e) => {
        e.preventDefault();
        shownRows().forEach((it) => cur.add(it.value));
        paint();
      });
      noneBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cur.clear();
        paint();
      });
      // 先画出加载态：否则从打开到数据回来这段时间列表是空白的，
      // 看起来像"没有内容"而不是"正在读"。
      paint();

      let confirmed = false;
      const dlg = craberDialog({
        title: kind === 'projects' ? '选择项目' : '选择会话',
        subtitle: '只备份勾选的范围',
        icon: kind === 'projects'
          ? mi('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')
          : mi('<path d="M20 12a7 7 0 0 1-7 7H8l-4 2.5V12a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7z"/>'),
        body: box,
        cancelText: '取消',
        confirmText: '确定',
        onConfirm: (close) => {
          confirmed = true;
          close();
        },
        // 任何关闭路径都会走到这里；没点确定就算取消
        onClose: () => finish(confirmed ? [...cur] : null)
      });
      okBtn = dlg.root.querySelector('.craber-dlg-primary');
      paint();
    });
  }

  // 选择器读到过的 value -> 显示名。备份页的 chip 只有 id 时靠它还原标题。
  // 落盘保存：否则刷新后"已保存的范围"会显示成一串 id。
  const PICK_LABEL_KEY = 'gpt_craber_pick_labels';
  const craberPickLabelCache = (() => {
    try {
      const j = JSON.parse(localStorage.getItem(PICK_LABEL_KEY) || '{}');
      return (j && typeof j === 'object') ? j : Object.create(null);
    } catch (e) { return Object.create(null); }
  })();
  let pickLabelDirty = false;
  function craberRememberPickLabel(value, label) {
    if (!value || !label) return;
    if (craberPickLabelCache[value] === label) return;
    craberPickLabelCache[value] = label;
    pickLabelDirty = true;
    // 简单节流：每次记忆都写一次体积很小，但连着勾几十个会略频繁，交给微任务合并
    if (!craberRememberPickLabel._t) {
      craberRememberPickLabel._t = setTimeout(() => {
        craberRememberPickLabel._t = null;
        if (!pickLabelDirty) return;
        pickLabelDirty = false;
        try {
          // 只保留最近 800 条，避免长期使用后无限膨胀
          const keys = Object.keys(craberPickLabelCache);
          if (keys.length > 800) {
            for (const k of keys.slice(0, keys.length - 800)) delete craberPickLabelCache[k];
          }
          localStorage.setItem(PICK_LABEL_KEY, JSON.stringify(craberPickLabelCache));
        } catch (e) { /* 存储满了就算了，下次仍能按需重建 */ }
      }, 400);
    }
  }

  // 已选项 chip：文字截断 + × 移除。选择对话框与备份范围预览共用。
  function craberSelChip(label, onRemove) {
    const chip = folderEl('span', 'craber-selchip');
    const t = folderEl('span', 'craber-selchip-txt', String(label || ''));
    t.title = String(label || '');
    const x = folderEl('button', 'craber-selchip-x');
    x.type = 'button';
    x.setAttribute('aria-label', '移除');
    x.title = '移除';
    x.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"'
      + ' stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
    x.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onRemove) onRemove();
    });
    chip.append(t, x);
    return chip;
  }

  /* ---------- 页面 5：会话备份 ---------- */
  function craberPageDavBackup() {
    const cfg = davLoad();
    const bcfg = davBackupCfgLoad();
    const state = davBackupStateLoad();
    const doneCount = Object.keys(state.done || {}).length;
    const blog = davBackupLogLoad();

    const p = craberPage('会话备份', '把会话导出成 zip 存到 WebDAV，按账号与日期分目录。');

    // 概况：已备份多少、上次什么时候、最近一次多大
    const lastOk = blog.find((x) => x.ok);
    const info = folderEl('div', 'craber-set-stats');
    const stat = (label, value) => {
      const c = folderEl('div', 'craber-set-stat');
      c.append(folderEl('div', 'craber-set-statnum', String(value)));
      c.append(folderEl('div', 'craber-set-statlbl', label));
      return c;
    };
    const fmtBytes = (n) => {
      const b = Number(n) || 0;
      if (!b) return '—';
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
      return (b / 1024 / 1024).toFixed(1) + ' MB';
    };
    info.append(
      stat('已备份会话', doneCount),
      stat('上次备份', bcfg.lastRun ? davFmtTime(bcfg.lastRun) : '—'),
      stat('最近体积', lastOk ? fmtBytes(lastOk.bytes) : '—')
    );
    p.append(info);

    if (!cfg.url) {
      p.append(folderEl('div', 'craber-set-note', '还没配置服务器，请先到「连接设置」填写地址与账号。'));
      return p;
    }

    /* 设置区 */
    const box = folderEl('div', 'craber-set-form');

    /* 备份位置：账号 + 目录 + 实际落盘路径，合成一块
     * 原来拆成「当前账号 / 备份目录 / 远端位置」三行，太占高度，
     * 而且三者本来就是一件事：这个账号的备份会写到哪。
     */
    const fLoc = folderEl('div', 'craber-set-field craber-set-field-stack');
    const locCol = folderEl('div', 'craber-set-fieldcol');
    locCol.append(folderEl('div', 'craber-set-label', '备份位置'));
    const locHint = folderEl('div', 'craber-set-hint',
      '备份按账号名分文件夹，多账号互不覆盖');
    locCol.append(locHint);
    fLoc.append(locCol);

    // 一行：账号徽标 + 目录输入 + 实际路径
    const locRow = folderEl('div', 'craber-locrow');

    const acctVal = folderEl('div', 'craber-acct');
    const acctIcon = folderEl('span', 'craber-acct-ico');
    acctIcon.innerHTML = mi('<circle cx="12" cy="8.5" r="3.6"/>'
      + '<path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>');
    const acctName = folderEl('span', 'craber-acct-name', '识别中…');
    acctVal.append(acctIcon, acctName);
    acctVal.title = '备份目录会按这个账号名分文件夹';

    const dirIn = document.createElement('input');
    dirIn.type = 'text';
    dirIn.className = 'craber-dlg-input craber-locrow-input';
    dirIn.value = bcfg.dir || 'craber-backup';
    dirIn.setAttribute('aria-label', '备份目录');
    dirIn.title = '备份根目录名（位于 WebDAV 地址下）';

    const pathPrev = folderEl('div', 'craber-pathprev');
    const pathLabel = folderEl('span', 'craber-pathprev-label', '远端');
    const pathCode = folderEl('span', 'craber-pathprev-path', '');
    pathPrev.append(pathLabel, pathCode);

    locRow.append(acctVal, dirIn, pathPrev);
    fLoc.append(locRow);
    box.append(fLoc);

    let acctLabel = sanitizeRemoteSeg(bcfg.account || '');
    const paintPathPrev = () => {
      const root = (dirIn.value.trim() || 'craber-backup').replace(/^\/+|\/+$/g, '');
      const who = acctLabel || '<账号>';
      const full = root + '/' + who + '/' + davDateStr() + '/';
      pathCode.textContent = full;
      pathCode.title = root + '/' + who + '/<日期>/';
    };
    paintPathPrev();
    dirIn.addEventListener('input', paintPathPrev);

    // 名字可能来自网络：先显示缓存，再异步刷新
    (async () => {
      const cached = craberAccountLoad();
      if (cached && cached.name) {
        acctLabel = sanitizeRemoteSeg(cached.name);
        acctName.textContent = cached.name;
        paintPathPrev();
      }
      try {
        const info = await craberAccountInfo(false);
        if (info && info.name) {
          acctLabel = sanitizeRemoteSeg(info.name);
          acctName.textContent = info.name;
          acctName.title = (info.email || info.name) + ' · 备份目录会按它分文件夹';
          paintPathPrev();
        } else if (!acctLabel) {
          acctName.textContent = '未识别到账号';
          acctName.classList.add('craber-acct-name-warn');
          locHint.textContent = '没读到账号名，备份会先停下；刷新页面可重试';
          paintPathPrev();
        }
      } catch (e) {
        if (!acctLabel) acctName.textContent = '未识别到账号';
      }
    })();

    /* 备份范围（要备份哪些）
     * 项目与会话是两个并行的选择器，不是互斥模式：
     * 都不选 = 全部；选了任意一组 = 只备份该范围（两组取并集）。
     */
    let scopeProjects = (bcfg.scopeProjects || []).slice();
    let scopeConvs = (bcfg.scopeConvs || []).slice();

    // 范围字段：标签+说明在上，右侧是"选择…"，下方直接铺已选 chip
    // （之前只在说明文字里塞前几个名字，选多了完全看不全，也没法单独移除）
    const mkScopeField = (label, hintDefault, pickLabel) => {
      const field = folderEl('div', 'craber-set-field craber-set-field-stack');
      const hd = folderEl('div', 'craber-set-fieldhd');
      const col = folderEl('div', 'craber-set-fieldcol');
      col.append(folderEl('div', 'craber-set-label', label));
      const hint = folderEl('div', 'craber-set-hint', hintDefault);
      col.append(hint);
      const ctrl = folderEl('div', 'craber-set-ctrl');
      const pickBtn = folderEl('button', 'craber-set-btn craber-set-btn-sm', pickLabel);
      pickBtn.type = 'button';
      ctrl.append(pickBtn);
      hd.append(col, ctrl);
      const bar = folderEl('div', 'craber-set-chipbar');
      field.append(hd, bar);
      box.append(field);
      return { field, hint, bar, pickBtn, hintDefault };
    };
    const projScope = mkScopeField('限定项目', '不选则包含全部项目', '选择项目…');
    const convScope = mkScopeField('限定会话', '不选则包含全部会话', '选择会话…');


    const syncScopeUI = () => {
      const fill = (scope, picker) => {
        picker.bar.innerHTML = '';
        if (!scope.length) {
          picker.bar.hidden = true;
          picker.hint.textContent = picker.hintDefault;
          return;
        }
        picker.bar.hidden = false;
        picker.hint.textContent = '已选 ' + scope.length + ' 项';
        for (const v of scope) {
          picker.bar.append(craberSelChip(craberPickLabelCache[v] || v, () => {
            const i = scope.indexOf(v);
            if (i >= 0) scope.splice(i, 1);
            syncScopeUI();
          }));
        }
      };
      fill(scopeProjects, projScope);
      fill(scopeConvs, convScope);
    };

    projScope.pickBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const picked = await craberPickScope('projects', scopeProjects);
      if (picked === null) return;
      scopeProjects = picked;
      syncScopeUI();
    });
    convScope.pickBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const picked = await craberPickScope('convs', scopeConvs);
      if (picked === null) return;
      scopeConvs = picked;
      syncScopeUI();
    });
    syncScopeUI();

    // 备份方式（怎么备份）—— 增量 / 全量
    let mode = bcfg.mode;
    const fMode = folderEl('div', 'craber-set-field');
    const cMode = folderEl('div', 'craber-set-fieldcol');
    cMode.append(folderEl('div', 'craber-set-label', '备份方式'));
    cMode.append(folderEl('div', 'craber-set-hint', '增量只备份没备过或之后更新过的会话'));
    const cModeCtrl = folderEl('div', 'craber-set-ctrl');
    const chips = folderEl('div', 'craber-dlg-chips');
    const mkChip = (val, text, hint) => {
      const lab = folderEl('label', 'craber-dlg-chip');
      const r = document.createElement('input');
      r.type = 'radio';
      r.name = 'craber-set-bmode';
      r.value = val;
      if (mode === val) r.checked = true;
      lab.title = hint || '';
      lab.append(r, folderEl('span', null, text));
      r.addEventListener('change', () => { if (r.checked) mode = val; });
      chips.append(lab);
    };
    mkChip('incremental', '增量', '只备份有变化的会话');
    mkChip('full', '全量', '每次都备份全部会话');
    cModeCtrl.append(chips);
    fMode.append(cMode, cModeCtrl);
    box.append(fMode);

    // 单次上限
    const fMax = folderEl('div', 'craber-set-field');
    const cMax = folderEl('div', 'craber-set-fieldcol');
    cMax.append(folderEl('div', 'craber-set-label', '单次上限'));
    cMax.append(folderEl('div', 'craber-set-hint', '避免一次拉太多被限流，剩余部分下次继续'));
    const cMaxCtrl = folderEl('div', 'craber-set-ctrl');
    const maxIn = document.createElement('input');
    maxIn.type = 'number';
    maxIn.min = '1';
    maxIn.max = '500';
    maxIn.className = 'craber-dlg-input';
    // 数字框不需要占满整列，但也不能被 flex:1 拉伸
    maxIn.style.flex = 'none';
    maxIn.style.width = '88px';
    maxIn.value = String(bcfg.max || 50);
    cMaxCtrl.append(maxIn, folderEl('span', 'craber-set-unit', '个会话'));
    fMax.append(cMax, cMaxCtrl);
    box.append(fMax);

    p.append(box);

    const status = folderEl('div', 'craber-dav-status', '');
    p.append(status);
    const setStatus = (m, k) => {
      status.textContent = m;
      status.className = 'craber-dav-status' + (k ? ' ' + k : '');
    };

    const collect = () => {
      const c = davBackupCfgLoad();
      c.dir = dirIn.value.trim() || 'craber-backup';
      if (acctLabel) c.account = acctLabel;
      c.mode = mode;
      c.scopeProjects = scopeProjects.slice();
      c.scopeConvs = scopeConvs.slice();
      c.max = Math.max(1, Math.min(500, parseInt(maxIn.value, 10) || 50));
      return c;
    };

    const bar = folderEl('div', 'craber-set-actions');
    const saveBtn = folderEl('button', 'craber-set-btn', '保存设置');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      davBackupCfgSave(collect());
      setStatus('设置已保存', 'ok');
    });

    const runBtn = folderEl('button', 'craber-set-btn craber-set-btn-primary', '开始备份');
    runBtn.type = 'button';
    runBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      davBackupCfgSave(collect());
      const old = runBtn.textContent;
      runBtn.disabled = true;
      saveBtn.disabled = true;
      runBtn.textContent = '备份中…';
      setStatus('准备中…');
      try {
        const r = await davBackupRun({
          onProgress: (done, total, note) => {
            setStatus(note || ('备份中 ' + done + '/' + total));
          }
        });
        if (r.skipped) {
          setStatus('没有需要备份的会话（增量模式）', 'ok');
        } else {
          let msg = '已备份 ' + r.count + ' 个会话 → ' + (r.path || r.file);
          if (r.pending > 0) msg += '（还有 ' + r.pending + ' 个待下次）';
          if (r.skippedText) msg += '；' + r.skippedText;
          setStatus(msg, 'ok');
        }
        // 刷新概况与历史
        const nb = davBackupLogLoad();
        const nstate = davBackupStateLoad();
        info.children[0].querySelector('.craber-set-statnum').textContent =
          String(Object.keys(nstate.done || {}).length);
        renderHistory(nb);
      } catch (err) {
        setStatus('备份失败：' + (err && err.message ? err.message : '未知错误'), 'err');
        davBackupLogPush({ ok: false, detail: err && err.message ? err.message : '未知错误' });
        renderHistory(davBackupLogLoad());
      } finally {
        runBtn.disabled = false;
        saveBtn.disabled = false;
        runBtn.textContent = old;
      }
    });

    bar.append(saveBtn, runBtn);
    p.append(bar);

    /* 备份历史 */
    const hHead = folderEl('div', 'craber-dav-loghead');
    hHead.append(folderEl('span', 'craber-dav-logtitle', '备份历史'));
    const hMeta = folderEl('span', 'craber-dav-logmeta', '');
    const hClear = folderEl('button', 'craber-dav-clear', '清空');
    hClear.type = 'button';
    hHead.append(hMeta, hClear);

    const hList = folderEl('div', 'craber-dav-loglist');
    function renderHistory(rows) {
      hList.innerHTML = '';
      hMeta.textContent = rows.length ? (rows.length + ' 条') : '';
      if (!rows.length) {
        hList.append(folderEl('div', 'craber-dav-logempty', '还没有备份记录'));
        return;
      }
      for (const r of rows) {
        const row = folderEl('div', 'craber-dav-logrow' + (r.ok ? '' : ' err'));
        row.append(folderEl('span', 'craber-dav-logdot'));
        const main = folderEl('div', 'craber-dav-logmain');
        const line = folderEl('div', 'craber-dav-logline');
        line.append(folderEl('span', 'craber-dav-logname',
          (r.ok ? '✓ ' : '✗ ') + (r.ok ? '备份' : '失败')
          + (r.mode === 'full' ? '（全量）' : '')));
        if (r.ok && r.count) line.append(folderEl('span', 'craber-dav-chip add', '+' + r.count));
        main.append(line);
        const det = [];
        if (r.path) det.push(r.path);
        else if (r.file) det.push(r.file);
        if (r.bytes) det.push(fmtBytes(r.bytes));
        if (r.failCount) det.push(r.failCount + ' 个失败');
        if (r.attFail) det.push(r.attFail + '/' + (r.attTotal || '?') + ' 个附件跳过');
        if (!r.ok && r.detail) det.push(r.detail);
        if (det.length) main.append(folderEl('div', 'craber-dav-logdetail', det.join(' · ')));
        row.append(main, folderEl('span', 'craber-dav-logtime', davFmtTime(r.at)));
        hList.append(row);
      }
    }
    renderHistory(blog);
    hClear.addEventListener('click', (e) => {
      e.preventDefault();
      davBackupLogClear();
      renderHistory([]);
    });

    p.append(hHead, hList);
    return p;
  }

  // 从操作栏按钮回溯到它所属回合的 key，用该 id 在 nodeIndex 里定位对应回合。
  // 新版结构（实测）：一个回合就是一个 [data-turn-key]，用户提问与助手回复都在其中，
  // 所以 key 直接落在祖先上。旧版靠 [data-testid^="conversation-turn"] 分段，
  // 助手段的 id 还得往前找一轮 —— 两个路径都保留。
  function resolveUserMessageIdFromToolbar(toolbarBtn) {
    // 新版：回合容器就在祖先链上，key 即该回合的用户消息 id
    const turn = toolbarBtn.closest('[data-turn-key]');
    if (turn) return turn.getAttribute('data-turn-key');

    // 旧版：conversation-turn section 交替出现，user 段带 data-message-id，
    // assistant 段带复制按钮但自身无 message-id，需要往前找一轮。
    const section = toolbarBtn.closest('[data-testid^="conversation-turn"]');
    if (!section) return null;
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

  /* ============ tooltip ============
   * 为什么不用原生 title：浏览器白框样式不受控、显示延迟 1s 左右、深色主题下非常刺眼。
   * 为什么不用 ::after：操作栏有 overflow 裁切，气泡会被切掉一半。
   * 所以统一用一个挂在 body 上的浮层，按目标元素的位置定位，永远逃出父级裁切。
   */
  let _tipEl = null;
  let _tipTimer = null;
  let _tipOwner = null;

  function getTipEl() {
    if (!_tipEl) {
      _tipEl = document.createElement('div');
      _tipEl.className = 'craber-tip';
      _tipEl.setAttribute('role', 'tooltip');
      document.body.appendChild(_tipEl);
    }
    return _tipEl;
  }

  // 把气泡摆到目标元素下方；下方放不下就翻到上方。
  // 水平方向以元素中心对齐，再夹到视口内，箭头单独跟着元素中心走。
  function craberTipPlace(el, text) {
    const tip = getTipEl();
    tip.textContent = text;
    tip.classList.toggle('craber-tip-multiline', text.length > 26);
    // 先量尺寸再定位：需要 display 参与布局
    tip.classList.remove('show');
    tip.style.visibility = 'hidden';
    tip.style.display = 'block';
    tip.classList.remove('craber-tip-up');

    // 目标在自家模态里 → 抬高层级；在页面正文里 → 保持低调，别盖住原生菜单
    tip.classList.toggle('craber-tip-modal', !!el.closest('.craber-dlg-mask'));

    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 下方不够、上方够 → 翻上去
    const belowFits = r.bottom + gap + th <= vh - 8;
    const up = !belowFits && r.top - gap - th >= 8;
    tip.classList.toggle('craber-tip-up', up);

    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, vw - tw - 8));
    let top = up ? (r.top - th - gap) : (r.bottom + gap);
    top = Math.max(8, Math.min(top, vh - th - 8));

    // 箭头指向元素中心：换算成气泡内的坐标并夹住
    const cx = Math.max(10, Math.min(r.left + r.width / 2 - left, tw - 10));
    tip.style.setProperty('--craber-arrow-x', cx + 'px');
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.style.visibility = '';
    requestAnimationFrame(() => tip.classList.add('show'));
    _tipOwner = el;
  }

  function craberTipHide() {
    if (_tipTimer) { clearTimeout(_tipTimer); _tipTimer = null; }
    _tipOwner = null;
    if (!_tipEl) return;
    _tipEl.classList.remove('show');
    _tipEl.style.display = 'none';
  }

  // delay：给"路过"的鼠标一点缓冲，避免一路扫过去闪一片
  function craberTipShow(el, text, delay) {
    if (!text) return;
    if (_tipTimer) { clearTimeout(_tipTimer); _tipTimer = null; }
    // 先登记 owner：延迟期间鼠标移走时，mouseout 要凭它把计时器取消掉
    _tipOwner = el;
    if (!delay) { craberTipPlace(el, text); return; }
    _tipTimer = setTimeout(() => {
      _tipTimer = null;
      // 延迟期间元素可能已经被移除（列表重绘很常见）
      if (!el.isConnected || _tipOwner !== el) return;
      craberTipPlace(el, text);
    }, delay);
  }

  // 显式绑定（调用方自己有文案，比如工具条里的导出按钮）
  function bindTooltip(el, text) {
    el.addEventListener('mouseenter', () => craberTipShow(el, text, 90));
    el.addEventListener('mouseleave', craberTipHide);
    el.addEventListener('click', craberTipHide);
    el.addEventListener('blur', craberTipHide);
  }

  /* title 属性统一接管
   * 脚本里大量用 el.title = '…' 写提示（刷新、全选、更多操作…），
   * 那些都会走浏览器自带的白框，和自定义气泡两套风格并存很难看。
   * 这里在冒泡阶段截住 hover：把 title 收进 data-craber-title 并摘掉属性
   * （否则原生白框还是会弹），改用统一气泡；移开时还原，不影响脚本再次改 title。
   * 只处理我们自己创建的节点（class 带 craber-），原生按钮保持原样。
   */
  const TIP_OWN_ATTR = 'data-craber-title';
  function isOwnUi(el) {
    if (!el) return false;
    const c = el.className;
    if (typeof c === 'string') return c.indexOf('craber-') >= 0;
    // SVG 元素的 className 是 SVGAnimatedString；closest('[title]') 也可能落到 path 上
    if (c && typeof c.baseVal === 'string') return c.baseVal.indexOf('craber-') >= 0;
    // 兜底：按钮里嵌的 svg 没有 class，往上找一层
    const host = el.closest('.craber-tip, [class*="craber-"]');
    return !!host;
  }

  function installTitleTooltip() {
    if (installTitleTooltip._done) return;
    installTitleTooltip._done = true;

    document.addEventListener('mouseover', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest('[title]');
      if (!el || !isOwnUi(el)) return;
      const text = el.getAttribute('title');
      if (!text) return;
      el.setAttribute(TIP_OWN_ATTR, text);
      el.removeAttribute('title');       // 摘掉，禁用原生白框
      craberTipShow(el, text, 350);
    }, true);

    document.addEventListener('mouseout', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const el = t.closest('[' + TIP_OWN_ATTR + ']');
      if (!el) return;
      // 还在本元素内部移动（进出子节点）就忽略
      const to = e.relatedTarget;
      if (to && el.contains(to)) return;
      const text = el.getAttribute(TIP_OWN_ATTR);
      el.removeAttribute(TIP_OWN_ATTR);
      if (text != null && !el.getAttribute('title')) el.setAttribute('title', text);
      if (_tipOwner === el) craberTipHide();
    }, true);

    // 滚动/尺寸变化时气泡会飘到别处，直接收掉最省事。
    // 点击也收：元素被移除（关对话框）时 mouseout 根本不会触发，
    // 否则气泡会僵在屏幕上一整块。
    const off = () => craberTipHide();
    window.addEventListener('scroll', off, true);
    window.addEventListener('resize', off);
    document.addEventListener('pointerdown', off, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') off(); }, true);
  }

  // 收集"助手回复的操作栏"。
  // 新版（实测）：一个回合 [data-turn-key] 内含两条 .turn-action-controls ——
  // 用户提问的在前面，助手回复的在后；取最后一条。回复还没出现时只有用户那一条，
  // 这时不注入（没有回复可导出）。
  // 旧版：以复制按钮所在容器为操作栏。
  function collectAssistantActionBars() {
    const bars = [];
    document.querySelectorAll('[data-turn-key]').forEach((turn) => {
      const all = turn.querySelectorAll('.turn-action-controls');
      if (all.length >= 2) bars.push(all[all.length - 1]);
    });
    if (bars.length) return bars;
    return [...document.querySelectorAll('[data-testid="copy-turn-action-button"]')]
      .map((btn) => btn.parentElement)
      .filter(Boolean);
  }

  // 克隆原生按钮的外观，做一个同款“导出 md”按钮，插进原生操作栏。
  function injectSingleButtons() {
    collectAssistantActionBars().forEach((bar) => {
      if (!bar) return;
      // 防重复：查操作栏里是否已有我们的按钮（且仍在 DOM 中），而不是在 bar 上打标记。
      // ChatGPT(React) 流式输出/重渲染操作栏时会移除我们注入的按钮，却保留 bar 上的
      // 自定义属性；若靠属性标记判重，标记永远为真、按钮再也补不回来（表现为回复里的
      // 导出按钮消失）。改成查子节点后，按钮被删就会在下次扫描时重新补上。
      if (bar.querySelector(':scope > [data-craber-export]')) return;
      // 借同栏原生按钮的 class 保持外观一致；没有按钮就不注入
      const like = bar.querySelector('button');
      if (!like) return;

      const b = document.createElement('button');
      b.type = 'button';
      // 沿用原生按钮的 class，外观与复制/朗读一致
      b.className = like.className;
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
          // 与其它导出入口保持一致：用页面内提示，不弹 alert 打断操作
          navToast('导出失败：' + (err && err.message ? err.message : '未知错误'));
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
      pbarCloseMenu();
    } else {
      // 路径没变时也轻量重定位：侧边栏收起/展开会改变 main 的左边缘
      updateNavRailPos();
    }
    // 顶栏里的导出按钮会被 React 重建清掉，每秒补挂一次（已挂则是空操作）
    mountFab();
    // 项目条：位置要跟着 header 高度与窗口变化走，同时判断是否还在项目内对话页
    pbarTick();
    // 对话完成通知：下降沿检测，见 notifyTick
    notifyTick();
    // 侧栏文件夹：原生侧栏会被 React 重建，每秒补挂一次（有指纹比对，无变化不做）
    foldersTick();
  }, 1000);

  // 统一接管脚本自己节点的 title 提示（原生白框 → 自定义气泡）
  installTitleTooltip();

  mountFab();
  injectSingleButtons();
  // 等 ChatGPT 自己的首屏请求先跑，避免和它的 paginated_conversation 撞车触发 429
  scheduleNavRender(NAV_SWITCH_DELAY);
  pbarTick();
  window.addEventListener('resize', () => { pbarCloseMenu(); });
  console.log('[gpt-craber] 对话导出脚本已加载');
})();
