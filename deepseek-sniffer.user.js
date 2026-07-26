// ==UserScript==
// @name         craber 抓包器（DeepSeek）
// @namespace    deepseek-craber-sniffer
// @version      0.1.0
// @description  临时抓包脚本：拦截 DeepSeek 页面的 fetch/XHR，打印接口 URL/方法/请求体/响应/鉴权，用于分析数据结构。分析完即可卸载。
// @author       craber
// @match        https://chat.deepseek.com/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // 挂到页面 window，方便控制台 top 上下文访问抓到的数据
  const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

  // 只关心这些关键词相关的接口，避免刷屏（埋点/静态资源等无关请求过滤掉）
  const KEYWORDS = [
    'conversation', 'chat', 'session', 'message', 'history',
    'fetch', 'completion', 'file', 'thread'
  ];

  // 抓到的记录都存这里，方便复制：window.__craberSniff
  W.__craberSniff = W.__craberSniff || [];

  function interesting(url) {
    const u = String(url || '').toLowerCase();
    // 只看 deepseek 自己的 api，且命中关键词
    if (u.indexOf('deepseek.com') < 0 && u.charAt(0) !== '/') return false;
    return KEYWORDS.some((k) => u.indexOf(k) >= 0);
  }

  // 鉴权信息：从请求头里挑出 authorization / cookie 等，值打码只留形态
  function summarizeHeaders(headers) {
    const out = {};
    const pick = (k, v) => {
      const key = String(k).toLowerCase();
      if (key === 'authorization') out.authorization = redact(v);
      else if (key === 'cookie') out.cookie = '(有 cookie，长度 ' + String(v).length + ')';
      else if (key.indexOf('token') >= 0 || key.indexOf('auth') >= 0 || key.indexOf('sign') >= 0) {
        out[key] = redact(v);
      }
    };
    if (!headers) return out;
    if (headers instanceof Headers) {
      headers.forEach((v, k) => pick(k, v));
    } else if (Array.isArray(headers)) {
      headers.forEach(([k, v]) => pick(k, v));
    } else if (typeof headers === 'object') {
      Object.keys(headers).forEach((k) => pick(k, headers[k]));
    }
    return out;
  }

  // 打码：只留前 8 位与形态，避免泄露完整 token
  function redact(v) {
    const s = String(v || '');
    if (s.length <= 12) return '(短值 ' + s.length + '位)';
    return s.slice(0, 12) + '…(共' + s.length + '位)';
  }

  // 截断超长响应，避免控制台卡死；完整体存到全局
  function preview(text, max) {
    const s = String(text == null ? '' : text);
    return s.length > max ? s.slice(0, max) + '\n…(截断，完整见 window.__craberSniff)' : s;
  }

  function record(kind, info) {
    W.__craberSniff.push(info);
    const n = W.__craberSniff.length;
    console.log(
      '%c[craber抓包 #' + n + '] ' + kind + ' ' + info.method + ' ' + info.url,
      'color:#4b5bd6;font-weight:bold'
    );
    if (info.auth && Object.keys(info.auth).length) console.log('  鉴权头:', info.auth);
    if (info.reqBody) console.log('  请求体:', preview(info.reqBody, 2000));
    if (info.respBody) console.log('  响应:', preview(info.respBody, 4000));
    console.log('  → 完整记录: window.__craberSniff[' + (n - 1) + ']');
  }

  /* ---------- 拦截 fetch ---------- */
  const _fetch = W.fetch;
  W.fetch = function (input, init) {
    const url = (typeof input === 'string') ? input : (input && input.url);
    const method = (init && init.method) || (input && input.method) || 'GET';
    const reqHeaders = (init && init.headers) || (input && input.headers);
    const reqBody = init && init.body;

    const p = _fetch.apply(this, arguments);

    if (interesting(url)) {
      p.then((resp) => {
        // clone 后读取，不影响页面本身消费响应
        resp.clone().text().then((text) => {
          record('fetch', {
            method: method,
            url: url,
            auth: summarizeHeaders(reqHeaders),
            reqBody: reqBody ? String(reqBody) : null,
            respStatus: resp.status,
            respBody: text
          });
        }).catch(() => {});
      }).catch(() => {});
    }
    return p;
  };

  /* ---------- 拦截 XHR ---------- */
  const XHR = W.XMLHttpRequest;
  const _open = XHR.prototype.open;
  const _send = XHR.prototype.send;
  const _setHeader = XHR.prototype.setRequestHeader;

  XHR.prototype.open = function (method, url) {
    this.__craber = { method: method, url: url, headers: {} };
    return _open.apply(this, arguments);
  };
  XHR.prototype.setRequestHeader = function (k, v) {
    if (this.__craber) this.__craber.headers[k] = v;
    return _setHeader.apply(this, arguments);
  };
  XHR.prototype.send = function (body) {
    const meta = this.__craber;
    if (meta && interesting(meta.url)) {
      this.addEventListener('load', function () {
        let text = '';
        try { text = this.responseText; } catch (e) { text = '(非文本响应)'; }
        record('xhr', {
          method: meta.method,
          url: meta.url,
          auth: summarizeHeaders(meta.headers),
          reqBody: body ? String(body) : null,
          respStatus: this.status,
          respBody: text
        });
      });
    }
    return _send.apply(this, arguments);
  };

  console.log('%c[craber抓包] 已启动。打开对话/滚动加载后，运行 __craberDump() 导出全部抓包',
    'color:#22a06b;font-weight:bold');

  // 一键把所有抓包记录转成 JSON 复制到剪贴板
  W.__craberDump = function () {
    const data = JSON.stringify(W.__craberSniff, null, 2);
    console.log('[craber抓包] 共 ' + W.__craberSniff.length + ' 条记录');
    if (typeof W.copy === 'function') {
      W.copy(data);
      console.log('[craber抓包] 已复制到剪贴板，直接粘贴给开发者');
    } else {
      console.log(data);
    }
    return W.__craberSniff;
  };
})();
