// ==UserScript==
// @name         轻小说文库帖子预览
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  在书评列表页面悬停显示帖子最新回复预览
// @author       You
// @match        https://www.wenku8.cc/modules/article/reviewslist.php*
// @grant        GM_xmlhttpRequest
// @connect      wenku8.cc
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 创建浮动框元素
    const tooltip = document.createElement('div');
    tooltip.id = 'wenku8-preview-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: #fff;
        border: 2px solid #666;
        border-radius: 0;
        padding: 12px;
        width: 600px;
        max-height: 500px;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        display: none;
        font-size: 12px;
        line-height: 1.5;
        font-family: Arial, sans-serif;
        pointer-events: auto;
    `;
    document.body.appendChild(tooltip);

    let currentRequest = null;
    let currentHoverLink = null;
    let currentMouseEvent = null;
    let isOverTooltip = false;
    let isOverLink = false;

    // 调试函数
    function debug(...args) {
        console.log('[wenku8-preview]', ...args);
    }

    // GBK转UTF-8函数
    function gbkToUtf8(gbkBuffer) {
        try {
            const decoder = new TextDecoder('gbk');
            return decoder.decode(gbkBuffer);
        } catch (e) {
            debug('TextDecoder不支持GBK，使用转码方法');
            return backupDecode(gbkBuffer);
        }
    }

    function backupDecode(buffer) {
        return new Promise(resolve => {
            const blob = new Blob([buffer], {type: 'text/html; charset=gbk'});
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.readAsText(blob, 'gbk');
        });
    }

    // 初始化悬停事件
    function initHoverEvents() {
        const rows = document.querySelectorAll('table.grid tr');
        debug('找到行数:', rows.length);

        rows.forEach((row, index) => {
            if (index === 0) return; // 跳过标题行

            const postLink = row.querySelector('td:nth-child(1) a');
            const replyCell = row.querySelector('td:nth-child(3)');

            if (postLink && replyCell) {
                // 移除旧的事件监听器
                postLink.removeEventListener('mouseenter', handleMouseEnter);
                postLink.removeEventListener('mouseleave', handleMouseLeave);
                postLink.removeEventListener('mousemove', handleMouseMove);

                // 添加新的事件监听器
                postLink.addEventListener('mouseenter', handleMouseEnter);
                postLink.addEventListener('mouseleave', handleMouseLeave);
                postLink.addEventListener('mousemove', handleMouseMove);
            }
        });
    }

    async function handleMouseEnter(event) {
        currentHoverLink = event.target;
        currentMouseEvent = event;
        isOverLink = true;
        
        const row = currentHoverLink.closest('tr');
        
        if (!row) {
            debug('未找到行元素');
            return;
        }

        // 获取回复数量
        const replyCountCell = row.querySelector('td:nth-child(3)');
        if (!replyCountCell) {
            debug('未找到回复数量单元格');
            return;
        }

        const replyText = replyCountCell.textContent.trim();
        debug('回复文本:', replyText);

        const replyMatch = replyText.match(/(\d+)\/(\d+)/);
        if (!replyMatch) {
            debug('无法解析回复数量');
            return;
        }

        const replyCount = parseInt(replyMatch[1]);
        const targetFloor = replyCount + 1; // X+1楼层

        if (isNaN(replyCount)) {
            debug('回复数量不是数字');
            return;
        }

        // 从链接中提取rid
        const href = currentHoverLink.getAttribute('href');
        const ridMatch = href.match(/rid=(\d+)/);
        if (!ridMatch) {
            debug('未找到rid参数');
            return;
        }

        const rid = ridMatch[1];
        debug(`RID: ${rid}, 目标楼层: ${targetFloor}`);

        // 显示加载提示
        showTooltip('加载中...', event);
        
        // 取消之前的请求
        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }

        // 获取帖子内容
        await fetchPostContent(rid, targetFloor);
    }

    function handleMouseMove(event) {
        currentMouseEvent = event;
        if (tooltip.style.display === 'block' && !isOverTooltip) {
            updateTooltipPosition(event);
        }
    }

    function handleMouseLeave() {
        isOverLink = false;
        // 延迟隐藏，检查是否鼠标移到了浮框上
        setTimeout(() => {
            if (!isOverTooltip && !isOverLink) {
                hideTooltip();
            }
        }, 100);
        
        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }
        currentHoverLink = null;
        currentMouseEvent = null;
    }

    // 浮框鼠标事件
    function handleTooltipMouseEnter() {
        isOverTooltip = true;
    }

    function handleTooltipMouseLeave() {
        isOverTooltip = false;
        // 延迟隐藏，检查是否鼠标移回了链接上
        setTimeout(() => {
            if (!isOverLink && !isOverTooltip) {
                hideTooltip();
            }
        }, 100);
    }

    function updateTooltipPosition(event) {
        // 使用 clientX/clientY 而不是 pageX/pageY，这样不受滚动影响
        const x = event.clientX;
        const y = event.clientY;
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        let left = x + 15;
        let top = y + 15;
        
        // 防止浮框超出右边界
        if (left + tooltipWidth > windowWidth) {
            left = x - tooltipWidth - 15;
        }
        
        // 防止浮框超出下边界
        if (top + tooltipHeight > windowHeight) {
            top = y - tooltipHeight - 15;
        }
        
        // 防止浮框超出左边界
        if (left < 0) {
            left = 15;
        }
        
        // 防止浮框超出上边界
        if (top < 0) {
            top = 15;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    function showTooltip(content, event) {
        if (typeof content === 'string') {
            tooltip.innerHTML = `<div style="padding: 20px; text-align: center; color: #666;">${content}</div>`;
        } else {
            tooltip.innerHTML = content;
        }
        
        tooltip.style.display = 'block';
        updateTooltipPosition(event || currentMouseEvent);
        
        // 添加浮框的鼠标事件监听器
        tooltip.addEventListener('mouseenter', handleTooltipMouseEnter);
        tooltip.addEventListener('mouseleave', handleTooltipMouseLeave);
        
        // 监听滚动事件，滚动时更新位置
        window.addEventListener('scroll', handleWindowScroll);
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
        // 移除事件监听器
        tooltip.removeEventListener('mouseenter', handleTooltipMouseEnter);
        tooltip.removeEventListener('mouseleave', handleTooltipMouseLeave);
        window.removeEventListener('scroll', handleWindowScroll);
        
        if (currentRequest) {
            currentRequest.abort();
            currentRequest = null;
        }
    }

    function handleWindowScroll() {
        // 滚动时如果有活动的鼠标事件，更新浮框位置
        if (currentMouseEvent && tooltip.style.display === 'block' && !isOverTooltip) {
            updateTooltipPosition(currentMouseEvent);
        }
    }

    async function fetchPostContent(rid, targetFloor) {
        const lastPageUrl = `https://www.wenku8.cc/modules/article/reviewshow.php?rid=${rid}&page=last`;
        debug('请求URL:', lastPageUrl);

        currentRequest = GM_xmlhttpRequest({
            method: 'GET',
            url: lastPageUrl,
            timeout: 15000,
            responseType: 'arraybuffer',
            onload: async function(response) {
                currentRequest = null;
                debug('请求完成，状态:', response.status, '数据长度:', response.response.byteLength);

                if (response.status === 200) {
                    try {
                        // 将GBK编码转换为UTF-8
                        let utf8Html;
                        try {
                            utf8Html = gbkToUtf8(new Uint8Array(response.response));
                        } catch (e) {
                            debug('直接解码失败，使用备用方法');
                            utf8Html = await backupDecode(new Uint8Array(response.response));
                        }
                        
                        debug('转换后HTML长度:', utf8Html.length);
                        
                        // 在HTML中查找目标楼层
                        const targetPostHtml = findExactTargetPost(utf8Html, targetFloor);
                        
                        if (targetPostHtml) {
                            debug('成功找到目标楼层');
                            showTooltip(targetPostHtml, currentMouseEvent);
                        } else {
                            debug('未找到目标楼层');
                            showTooltip(`未找到第 ${targetFloor} 楼回复`, currentMouseEvent);
                        }
                    } catch (error) {
                        debug('处理HTML错误:', error);
                        showTooltip('处理页面内容失败: ' + error.message, currentMouseEvent);
                    }
                } else {
                    debug('HTTP错误:', response.status);
                    showTooltip(`加载失败: HTTP ${response.status}`, currentMouseEvent);
                }
            },
            onerror: function(error) {
                currentRequest = null;
                debug('请求错误:', error);
                showTooltip('网络请求失败', currentMouseEvent);
            },
            ontimeout: function() {
                currentRequest = null;
                debug('请求超时');
                showTooltip('请求超时，请稍后重试', currentMouseEvent);
            }
        });
    }

    function findExactTargetPost(html, targetFloor) {
        debug(`开始精确查找第 ${targetFloor} 楼`);
        
        // 精确匹配锚点格式：<a href="#yid*" name="yid*">楼层号#</a>
        const anchorPattern = new RegExp(
            `<a\\s+[^>]*href="#yid\\d+"[^>]*name="yid\\d+"[^>]*>${targetFloor}#</a>`,
            'i'
        );
        
        const anchorMatch = html.match(anchorPattern);
        if (anchorMatch) {
            debug('找到精确匹配的锚点');
        } else {
            debug('精确匹配失败，尝试宽松匹配');
            // 宽松匹配：包含楼层号的任何锚点
            const loosePattern = new RegExp(
                `<a[^>]*>${targetFloor}#</a>`,
                'i'
            );
            const looseMatch = html.match(loosePattern);
            if (looseMatch) {
                debug('宽松匹配找到锚点');
                return extractTableFromAnchor(html, looseMatch[0]);
            }
            return null;
        }
        
        return extractTableFromAnchor(html, anchorMatch[0]);
    }

    function extractTableFromAnchor(html, anchorHtml) {
        const anchorIndex = html.indexOf(anchorHtml);
        if (anchorIndex === -1) return null;
        
        debug('锚点位置:', anchorIndex);
        
        // 向上查找最近的表格开始
        const htmlBeforeAnchor = html.substring(0, anchorIndex);
        const tableStartRegex = /<table\s+class="grid"\s+width="100%"\s+align="center">/gi;
        
        let lastTableStart = -1;
        let match;
        while ((match = tableStartRegex.exec(htmlBeforeAnchor)) !== null) {
            lastTableStart = match.index;
        }
        
        if (lastTableStart === -1) {
            debug('未找到表格开始标签');
            return null;
        }
        
        debug('表格开始位置:', lastTableStart);
        
        // 从表格开始位置查找表格结束
        const htmlFromTable = html.substring(lastTableStart);
        const tableEndIndex = htmlFromTable.indexOf('</table>');
        
        if (tableEndIndex === -1) {
            debug('未找到表格结束标签');
            return null;
        }
        
        const fullTableHtml = html.substring(lastTableStart, lastTableStart + tableEndIndex + '</table>'.length);
        debug('提取的表格HTML长度:', fullTableHtml.length);
        
        return fullTableHtml;
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHoverEvents);
    } else {
        initHoverEvents();
    }

    // 监听动态内容变化
    const observer = new MutationObserver(function(mutations) {
        let shouldReinit = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1 && (node.matches('table.grid') || node.querySelector('table.grid'))) {
                        shouldReinit = true;
                        break;
                    }
                }
            }
        });
        if (shouldReinit) {
            setTimeout(initHoverEvents, 1000);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    debug('脚本已加载 - 版本1.9 (修复滚动位置错位)');
})();