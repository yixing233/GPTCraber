// ==UserScript==
// @name         ChatGPT LaTeX Smart Render Fix
// @namespace    chatgpt-latex-smart-fix
// @version      2.0.0
// @description  智能修复 ChatGPT 未渲染的 LaTeX，包括 $...$、$$...$$、\(...\)、\[...\]。会先判断 $...$ 是否像公式，避免把金额误渲染。
// @author       yixing233
// @homepageURL  https://github.com/yixing233/GPTCraber
// @supportURL   https://github.com/yixing233/GPTCraber/issues
// @downloadURL  https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-latex-smart-fix.user.js
// @updateURL    https://raw.githubusercontent.com/yixing233/GPTCraber/main/chatgpt-latex-smart-fix.user.js
// @license      GPL-3.0-only
// @match        https://chatgpt.com/*
// @match        https://www.chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        none
// @run-at       document-idle
// @require      https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/katex.min.js
// ==/UserScript==

(function () {
    'use strict';

    const KATEX_CSS =
        'https://cdn.jsdelivr.net/npm/katex@0.18.7/dist/katex.min.css';

    // @require 理论上会在脚本执行前注入 katex，但 CDN 被拦截、油猴缓存异常等
    // 情况下仍可能缺失。缺了就静默退出，不要在每个文本节点上抛 ReferenceError。
    if (typeof katex === 'undefined') {
        console.warn('[ChatGPT LaTeX Smart Fix] KaTeX 未加载，脚本已退出');
        return;
    }

    /* -----------------------------
       1. 加载 KaTeX CSS 与少量自有样式
    ----------------------------- */

    if (!document.querySelector('#chatgpt-katex-smart-css')) {
        const link = document.createElement('link');
        link.id = 'chatgpt-katex-smart-css';
        link.rel = 'stylesheet';
        link.href = KATEX_CSS;
        document.head.appendChild(link);
    }

    if (!document.querySelector('#chatgpt-katex-smart-style')) {
        const style = document.createElement('style');
        style.id = 'chatgpt-katex-smart-style';
        // 行内公式跟随文字基线，行间公式独占一行居中。
        // 这里用 span + display:block 而不是 div：父节点往往是 <p>，
        // 往 <p> 里插 <div> 是非法嵌套，浏览器会把段落拆开导致排版错乱。
        style.textContent = [
            '.chatgpt-smart-katex-inline{display:inline-block;vertical-align:baseline}',
            '.chatgpt-smart-katex-display{display:block;margin:.8em 0;text-align:center;overflow-x:auto;overflow-y:hidden}',
        ].join('\n');
        document.head.appendChild(style);
    }

    /* -----------------------------
       2. 判断 $...$ 是否真的像数学公式
    ----------------------------- */

    function looksLikeMath(content) {
        const s = content.trim();

        if (!s) return false;

        /*
         * 排除典型金额：
         *
         * $100
         * $29.9
         * $1,299
         * $12.99 USD
         */
        if (
            /^\d[\d,.]*(?:\s?(?:USD|CNY|RMB|EUR|JPY|GBP|美元|元|人民币))?$/i.test(s)
        ) {
            return false;
        }

        /*
         * 明确包含 LaTeX 命令
         *
         * \mathcal
         * \frac
         * \alpha
         * \mathrm
         * ...
         */
        if (/\\[a-zA-Z]+/.test(s)) {
            return true;
        }

        /*
         * 上下标：
         *
         * G_i
         * x^2
         * a_{ij}
         */
        if (/[_^]/.test(s)) {
            return true;
        }

        /*
         * 数学结构符号
         */
        if (/[={}[\]()+\-*/<>≤≥≈≠∑∫√∞]/.test(s)) {
            return true;
        }

        /*
         * 单个数学变量：
         *
         * $x$
         * $G$
         * $T$
         *
         * 科研场景很常见。
         */
        if (/^[A-Za-zα-ωΑ-Ω]$/.test(s)) {
            return true;
        }

        /*
         * 带数字的变量：
         *
         * x1
         * A2
         */
        if (/^[A-Za-z]+\d+$/.test(s)) {
            return true;
        }

        /*
         * 简单变量组合：
         *
         * Re
         * Nu
         * CO_2 已经会被 _ 捕获
         *
         * 限制长度避免普通英文单词被误判。
         */
        if (/^[A-Za-z]{1,3}$/.test(s)) {
            return true;
        }

        return false;
    }

    /* -----------------------------
       3. KaTeX 渲染
    ----------------------------- */

    function createMath(content, displayMode) {
        const span = document.createElement('span');

        span.className = displayMode
            ? 'chatgpt-smart-katex-display'
            : 'chatgpt-smart-katex-inline';

        span.dataset.smartKatex = '1';

        try {
            katex.render(content, span, {
                displayMode,
                // throwOnError=true 才能走到下面的 catch：渲染失败时本函数返回
                // null，调用方保留原始 $...$ 文本。若设成 false，KaTeX 会把错误
                // 原文用红字渲染出来顶掉原本还算可读的公式源码。
                throwOnError: true,
                strict: false,
                trust: false,
                output: 'htmlAndMathml'
            });

            return span;
        } catch (e) {
            console.debug(
                '[ChatGPT LaTeX Smart Fix] render error:',
                content,
                e
            );

            return null;
        }
    }

    /* -----------------------------
       4. 处理单个文本节点
    ----------------------------- */

    // 不进入代码块、textarea、已有 KaTeX 等区域
    const SKIP_SELECTOR = [
        'pre',
        'code',
        'textarea',
        'script',
        'style',
        '.katex',
        '.katex-display',
        '[data-smart-katex="1"]'
    ].join(',');

    function processTextNode(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) {
            return;
        }

        const text = node.nodeValue;

        if (
            !text ||
            (!text.includes('$') &&
                !text.includes('\\(') &&
                !text.includes('\\['))
        ) {
            return;
        }

        const parent = node.parentElement;

        if (!parent) return;

        if (parent.closest(SKIP_SELECTOR)) {
            return;
        }

        /*
         * 匹配顺序非常重要：
         *
         * $$...$$
         * \[...\]
         * \(...\)
         * $...$
         */
        const regex =
            /(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$([^$\n]+?)(?<!\\)\$)/g;

        let match;
        let lastIndex = 0;
        let changed = false;

        const frag = document.createDocumentFragment();

        while ((match = regex.exec(text)) !== null) {
            let latex = '';
            let displayMode = false;
            let shouldRender = true;

            if (match[2] !== undefined) {
                // $$ ... $$
                latex = match[2];
                displayMode = true;
            } else if (match[3] !== undefined) {
                // \[ ... \]
                latex = match[3];
                displayMode = true;
            } else if (match[4] !== undefined) {
                // \( ... \)
                latex = match[4];
                displayMode = false;
            } else {
                // $ ... $
                latex = match[5];
                displayMode = false;

                shouldRender = looksLikeMath(latex);
            }

            if (!shouldRender) {
                continue;
            }

            const rendered = createMath(
                latex.trim(),
                displayMode
            );

            if (!rendered) {
                continue;
            }

            /*
             * 加入公式前的普通文本
             */
            if (match.index > lastIndex) {
                frag.appendChild(
                    document.createTextNode(
                        text.slice(lastIndex, match.index)
                    )
                );
            }

            frag.appendChild(rendered);

            lastIndex = regex.lastIndex;
            changed = true;
        }

        if (!changed) {
            return;
        }

        /*
         * 公式后的剩余普通文本
         */
        if (lastIndex < text.length) {
            frag.appendChild(
                document.createTextNode(
                    text.slice(lastIndex)
                )
            );
        }

        node.replaceWith(frag);
    }

    /* -----------------------------
       5. 遍历 ChatGPT 回答
    ----------------------------- */

    function processElement(root) {
        if (!root) return;

        if (
            root.nodeType === Node.ELEMENT_NODE &&
            root.closest?.(SKIP_SELECTOR)
        ) {
            return;
        }

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const parent = node.parentElement;

                    if (!parent) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (parent.closest(SKIP_SELECTOR)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodes = [];

        let current;

        // 先收集再改写：遍历过程中替换节点会让 TreeWalker 的游标失效。
        while ((current = walker.nextNode())) {
            nodes.push(current);
        }

        nodes.forEach(processTextNode);
    }

    /* -----------------------------
       6. 找出所有 ChatGPT 消息
    ----------------------------- */

    function renderAll() {
        const selectors = [
            '[data-message-author-role="assistant"] .markdown',
            '[data-message-author-role="assistant"]'
        ];

        document
            .querySelectorAll(selectors.join(','))
            .forEach(processElement);
    }

    /* -----------------------------
       7. ChatGPT 流式输出监听
    ----------------------------- */

    let timer = null;

    function scheduleRender() {
        clearTimeout(timer);

        /*
         * 不要每输出一个 token 就重绘，
         * 等流式文本稍微稳定后再处理。
         */
        timer = setTimeout(() => {
            renderAll();
        }, 450);
    }

    const observer = new MutationObserver((mutations) => {
        let relevant = false;

        for (const mutation of mutations) {
            if (
                mutation.type === 'childList' ||
                mutation.type === 'characterData'
            ) {
                relevant = true;
                break;
            }
        }

        if (relevant) {
            scheduleRender();
        }
    });

    function start() {
        renderAll();

        observer.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            start,
            { once: true }
        );
    } else {
        start();
    }

})();
