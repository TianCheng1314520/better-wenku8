// ==UserScript==
// @name         更好的Wenku8
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  屏蔽指定书籍、用户和RID的书评帖子，渐变色文字生成，一键洛阳铲，回复预览
// @author       天秤
// @match        https://www.wenku8.cc/modules/article/reviewslist.php*
// @match        https://www.wenku8.cc/modules/article/reviewshow.php*
// @match        https://www.wenku8.net/modules/article/reviewslist.php*
// @match        https://www.wenku8.net/modules/article/reviewshow.php*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @icon               https://www.wenku8.cc/favicon.ico
// @connect      wenku8.cc
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置存储键名
    const STORAGE_KEY_BOOKS = 'wenku8_blocked_book_ids';
    const STORAGE_KEY_USERS = 'wenku8_blocked_user_ids';
    const STORAGE_KEY_RIDS = 'wenku8_blocked_rids'; // 新增：屏蔽的RID列表
    const STORAGE_KEY_HIDDEN_CONTENT = 'wenku8_hidden_content';

    // 获取屏蔽书籍列表
    function getBlockedBookIds() {
        const stored = GM_getValue(STORAGE_KEY_BOOKS, '');
        return stored ? stored.split(',').filter(id => id.trim() !== '') : [];
    }

    // 获取屏蔽用户列表
    function getBlockedUserIds() {
        const stored = GM_getValue(STORAGE_KEY_USERS, '');
        return stored ? stored.split(',').filter(id => id.trim() !== '') : [];
    }

    // 获取屏蔽RID列表
    function getBlockedRids() {
        const stored = GM_getValue(STORAGE_KEY_RIDS, '');
        return stored ? stored.split(',').filter(id => id.trim() !== '') : [];
    }

    // 保存屏蔽书籍列表
    function saveBlockedBookIds(ids) {
        GM_setValue(STORAGE_KEY_BOOKS, ids.join(','));
    }

    // 保存屏蔽用户列表
    function saveBlockedUserIds(ids) {
        GM_setValue(STORAGE_KEY_USERS, ids.join(','));
    }

    // 保存屏蔽RID列表
    function saveBlockedRids(ids) {
        GM_setValue(STORAGE_KEY_RIDS, ids.join(','));
    }

    // 保存被屏蔽的内容
    function saveHiddenContent(content) {
        GM_setValue(STORAGE_KEY_HIDDEN_CONTENT, JSON.stringify(content));
    }

    // 获取被屏蔽的内容
    function getHiddenContent() {
        const stored = GM_getValue(STORAGE_KEY_HIDDEN_CONTENT, '[]');
        return JSON.parse(stored);
    }

    // 从书籍链接中提取ID
    function extractBookId(link) {
        const match = link.href.match(/\/book\/(\d+)\.htm/);
        return match ? match[1] : null;
    }

    // 从用户链接中提取UID
    function extractUserId(link) {
        const match = link.href.match(/\/userpage\.php\?uid=(\d+)/);
        return match ? match[1] : null;
    }

    // 从主题链接中提取RID
    function extractReviewId(link) {
        const match = link.href.match(/rid=(\d+)/);
        return match ? match[1] : null;
    }

    // 在书评列表中添加ID信息显示
    function appendIdsToReviewsList() {
        const rows = document.querySelectorAll('table.grid tr:not(:first-child)'); // 跳过表头

        rows.forEach(row => {
            // 处理主题列 (第一列)
            const titleCell = row.querySelector('td:nth-child(1)');
            if (titleCell) {
                const titleLink = titleCell.querySelector('a');
                if (titleLink) {
                    const rid = extractReviewId(titleLink);
                    if (rid) {
                        // 添加RID信息
                        const ridSpan = document.createElement('span');
                        ridSpan.textContent = `(RID:${rid})`;
                        ridSpan.style.cssText = 'color: #666; font-size: 11px; margin-left: 5px; font-family: monospace;';
                        titleCell.appendChild(ridSpan);
                    }
                }
            }

            // 处理书名列 (第二列)
            const bookCell = row.querySelector('td:nth-child(2)');
            if (bookCell) {
                const bookLink = bookCell.querySelector('a');
                if (bookLink) {
                    const aid = extractBookId(bookLink);
                    if (aid) {
                        // 添加AID信息
                        const aidSpan = document.createElement('span');
                        aidSpan.textContent = `(AID:${aid})`;
                        aidSpan.style.cssText = 'color: #666; font-size: 11px; margin-left: 5px; font-family: monospace;';
                        bookCell.appendChild(aidSpan);
                    }
                }
            }

            // 处理发表人列 (第四列)
            const userCell = row.querySelector('td:nth-child(4)');
            if (userCell) {
                const userLink = userCell.querySelector('a');
                if (userLink) {
                    const uid = extractUserId(userLink);
                    if (uid) {
                        // 添加UID信息
                        const uidSpan = document.createElement('span');
                        uidSpan.textContent = `(UID:${uid})`;
                        uidSpan.style.cssText = 'color: #666; font-size: 11px; margin-left: 5px; font-family: monospace;';
                        userCell.appendChild(uidSpan);
                    }
                }
            }
        });
    }

    // 过滤书评列表页
    function filterReviewsList() {
        const blockedBookIds = getBlockedBookIds();
        const blockedUserIds = getBlockedUserIds();
        const blockedRids = getBlockedRids(); // 新增：获取屏蔽的RID列表

        // 先添加ID信息显示
        appendIdsToReviewsList();

        if (blockedBookIds.length === 0 && blockedUserIds.length === 0 && blockedRids.length === 0) return;

        const rows = document.querySelectorAll('table.grid tr');
        let hiddenCount = 0;
        let hiddenContent = [];

        rows.forEach(row => {
            let shouldHide = false;
            let reason = '';

            // 检查是否屏蔽了RID
            if (blockedRids.length > 0) {
                const titleLink = row.querySelector('td:nth-child(1) a');
                if (titleLink) {
                    const rid = extractReviewId(titleLink);
                    if (rid && blockedRids.includes(rid)) {
                        shouldHide = true;
                        reason = `屏蔽RID: ${rid}`;
                    }
                }
            }

            // 检查是否屏蔽了书籍
            if (!shouldHide && blockedBookIds.length > 0) {
                const bookLink = row.querySelector('td:nth-child(2) a');
                if (bookLink) {
                    const bookId = extractBookId(bookLink);
                    if (bookId && blockedBookIds.includes(bookId)) {
                        shouldHide = true;
                        reason = `屏蔽书籍: ${bookLink.textContent.trim()} (ID: ${bookId})`;
                    }
                }
            }

            // 检查是否屏蔽了用户
            if (!shouldHide && blockedUserIds.length > 0) {
                const userLink = row.querySelector('td:nth-child(4) a');
                if (userLink) {
                    const userId = extractUserId(userLink);
                    if (userId && blockedUserIds.includes(userId)) {
                        shouldHide = true;
                        reason = `屏蔽用户: ${userLink.textContent.trim()} (UID: ${userId})`;
                    }
                }
            }

            if (shouldHide) {
                // 保存被屏蔽内容的完整HTML
                hiddenContent.push({
                    type: 'review',
                    html: row.outerHTML,
                    reason: reason,
                    timestamp: new Date().toISOString()
                });

                row.style.display = 'none';
                hiddenCount++;
            }
        });

        // 保存被屏蔽的内容
        if (hiddenContent.length > 0) {
            saveHiddenContent(hiddenContent);
        }

        // 显示过滤统计
        if (hiddenCount > 0) {
            showFilterStats(hiddenCount, blockedBookIds.length, blockedUserIds.length, blockedRids.length);
        }
    }

    // 过滤帖子详情页
    function filterReviewDetail() {
        const blockedUserIds = getBlockedUserIds();
        const blockedRids = getBlockedRids(); // 新增：获取屏蔽的RID列表

        if (blockedUserIds.length === 0 && blockedRids.length === 0) return;

        const replyTables = document.querySelectorAll('table.grid');
        let hiddenCount = 0;
        let hiddenContent = [];

        replyTables.forEach(table => {
            // 跳过主题表格
            if (table.querySelector('th')) return;

            let shouldHide = false;
            let reason = '';

            // 检查是否屏蔽了用户
            if (blockedUserIds.length > 0) {
                const userLink = table.querySelector('td.odd a[href*="userpage.php"]');
                if (userLink) {
                    const userId = extractUserId(userLink);
                    if (userId && blockedUserIds.includes(userId)) {
                        shouldHide = true;
                        reason = `屏蔽用户: ${userLink.textContent.trim()} (UID: ${userId})`;
                    }
                }
            }

            // 检查是否屏蔽了RID（新增）
            if (!shouldHide && blockedRids.length > 0) {
                // 在详情页中，RID通常出现在URL参数中
                const currentUrl = window.location.href;
                const urlRidMatch = currentUrl.match(/rid=(\d+)/);
                if (urlRidMatch && blockedRids.includes(urlRidMatch[1])) {
                    shouldHide = true;
                    reason = `屏蔽RID: ${urlRidMatch[1]}`;
                }
            }

            if (shouldHide) {
                // 保存被屏蔽内容的完整HTML
                hiddenContent.push({
                    type: 'reply',
                    html: table.outerHTML,
                    reason: reason,
                    timestamp: new Date().toISOString()
                });

                table.style.display = 'none';
                hiddenCount++;
            }
        });

        // 保存被屏蔽的内容
        if (hiddenContent.length > 0) {
            saveHiddenContent(hiddenContent);
        }

        // 显示过滤统计
        if (hiddenCount > 0) {
            showDetailFilterStats(hiddenCount, blockedUserIds.length, blockedRids.length);
        }
    }

    // 显示列表页过滤统计
    function showFilterStats(totalHidden, bookCount, userCount, ridCount) {
        const stats = document.createElement('div');
        stats.innerHTML = `
            <div>已隐藏 ${totalHidden} 条书评</div>
            <div style="font-size: 12px; color: #666;">
                (屏蔽了 ${bookCount} 本书籍，${userCount} 个用户，${ridCount} 个帖子)
            </div>
            <button id="show-hidden-content" style="margin-top: 8px; padding: 6px 12px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                查看被屏蔽的内容
            </button>
        `;
        stats.style.cssText = `
            background: #e8f4fd;
            border: 1px solid #b8daff;
            border-radius: 4px;
            padding: 10px 15px;
            margin: 10px 0;
            color: #004085;
            font-size: 14px;
            text-align: center;
        `;

        const content = document.getElementById('content');
        if (content) {
            content.insertBefore(stats, content.firstChild);

            // 添加查看被屏蔽内容的功能
            const showHiddenBtn = stats.querySelector('#show-hidden-content');
            showHiddenBtn.addEventListener('click', showHiddenContent);
        }
    }

    // 显示详情页过滤统计
    function showDetailFilterStats(hiddenCount, userCount, ridCount) {
        const stats = document.createElement('div');
        stats.innerHTML = `
            <div>已隐藏 ${hiddenCount} 条用户回复</div>
            <div style="font-size: 12px; color: #666;">
                (屏蔽了 ${userCount} 个用户，${ridCount} 个RID)
            </div>
            <button id="show-hidden-detail" style="margin-top: 8px; padding: 6px 12px; background: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                查看被屏蔽的内容
            </button>
        `;
        stats.style.cssText = `
            background: #e8f4fd;
            border: 1px solid #b8daff;
            border-radius: 4px;
            padding: 10px 15px;
            margin: 10px 0;
            color: #004085;
            font-size: 14px;
            text-align: center;
        `;

        const content = document.getElementById('content');
        if (content) {
            // 插入到主题表格之后
            const themeTable = content.querySelector('table.grid th');
            if (themeTable) {
                themeTable.closest('table').parentNode.insertBefore(stats, themeTable.closest('table').nextSibling);
            } else {
                content.insertBefore(stats, content.firstChild);
            }

            // 添加查看被屏蔽内容的功能
            const showHiddenBtn = stats.querySelector('#show-hidden-detail');
            showHiddenBtn.addEventListener('click', showHiddenContent);
        }
    }

    // 显示被屏蔽的内容
    function showHiddenContent() {
        const hiddenContent = getHiddenContent();
        createHiddenContentModal(hiddenContent, '被屏蔽的内容');
    }

    // 创建显示被屏蔽内容的模态框
    function createHiddenContentModal(content, title) {
        // 移除已存在的模态框
        const existingModal = document.getElementById('hidden-content-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'hidden-content-modal';

        // 生成内容HTML
        let contentHTML = '';
        if (content.length === 0) {
            contentHTML = '<p style="text-align: center; color: #666;">没有找到被屏蔽的内容</p>';
        } else {
            content.forEach((item, index) => {
                contentHTML += `
                    <div class="hidden-item">
                        <div class="hidden-header">
                            <strong>${item.type === 'review' ? '书评' : '回复'} ${index + 1}</strong>
                            <span style="color: #dc3545; font-size: 12px;">${item.reason}</span>
                            <span style="color: #666; font-size: 11px;">${new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="hidden-content">
                            ${item.html}
                        </div>
                    </div>
                `;
            });
        }

        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title} (${content.length}条)</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${contentHTML}
                    </div>
                    <div class="modal-footer">

                    </div>
                </div>
            </div>
        `;

        // 添加模态框样式
        const style = document.createElement('style');
        style.textContent = `
            #hidden-content-modal .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            }
            #hidden-content-modal .modal-content {
                background: white;
                border-radius: 8px;
                width: 95%;
                max-width: 1200px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            #hidden-content-modal .modal-header {
                background: #2c3e50;
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px 8px 0 0;
            }
            #hidden-content-modal .modal-header h3 {
                margin: 0;
                font-size: 16px;
            }
            #hidden-content-modal .modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #hidden-content-modal .modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }
            #hidden-content-modal .modal-footer {
                padding: 15px 20px;
                border-top: 1px solid #e9ecef;
                text-align: right;
            }
            #hidden-content-modal .hidden-item {
                border: 1px solid #e9ecef;
                border-radius: 4px;
                padding: 15px;
                margin-bottom: 15px;
                background: #f8f9fa;
            }
            #hidden-content-modal .hidden-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 1px dashed #ccc;
            }
            #hidden-content-modal .hidden-content {
                overflow-x: auto;
            }
            #hidden-content-modal .hidden-content table {
                width: 100%;
                border-collapse: collapse;
                background: white;
            }
            #hidden-content-modal .hidden-content td,
            #hidden-content-modal .hidden-content th {
                border: 1px solid #ddd;
                padding: 8px;
                font-size: 14px;
            }
            #hidden-content-modal .hidden-content tr {
                background: white !important;
            }
            #hidden-content-modal .hidden-item:last-child {
                margin-bottom: 0;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(modal);

        // 添加事件监听
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        const clearBtn = modal.querySelector('#clear-hidden-content');

        closeBtn.addEventListener('click', () => {
            modal.remove();
            style.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                modal.remove();
                style.remove();
            }
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有被屏蔽的内容吗？这将不会影响您的屏蔽设置，只是清除查看记录。')) {
                saveHiddenContent([]);
                modal.remove();
                style.remove();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                style.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    // 创建配置UI
    function createConfigUI() {
        const sidebar = document.createElement('div');
        sidebar.id = 'book-filter-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>书评过滤器</h3>
                <button id="toggle-sidebar">×</button>
            </div>
            <div class="sidebar-content">
                <div class="config-section">
                    <label>屏蔽的书籍ID：</label>
                    <textarea id="blocked-book-ids-input" placeholder="每行一个书籍ID，如：&#10;1&#10;2&#10;3" rows="6"></textarea>

                    <label style="margin-top: 15px;">屏蔽的用户UID：</label>
                    <textarea id="blocked-user-ids-input" placeholder="每行一个用户UID，如：&#10;1&#10;2&#10;3" rows="6"></textarea>

                    <label style="margin-top: 15px;">屏蔽的书评RID：</label>
                    <textarea id="blocked-rids-input" placeholder="每行一个书评RID，如：&#10;1&#10;2&#10;3" rows="6"></textarea>

                    <div class="button-group">
                        <button id="apply-filter">应用过滤</button>
                        <button id="reset-filter">重置全部</button>
                    </div>
                    <div class="help-text">
                        <p><strong>如何获取书籍ID，用户UID，帖子RID？</strong></p>

                        <p>本插件已经将上述id直接显示在书名/用户名/帖子标题后面</p>

                        <div style="margin-top: 10px; font-size: 11px; color: #666;">
                            <div>当前屏蔽：<span id="blocked-book-count">0</span> 本书籍</div>
                            <div>当前屏蔽：<span id="blocked-user-count">0</span> 个用户</div>
                            <div>当前屏蔽：<span id="blocked-rid-count">0</span> 个帖子</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 侧边栏样式
        sidebar.style.cssText = `
            position: fixed;
            left: -300px;
            top: 0;
            width: 300px;
            height: 100vh;
            background: #f5f5f5;
            border-right: 2px solid #ccc;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
            transition: left 0.3s ease;
            z-index: 10000;
            font-family: Arial, sans-serif;
            overflow-y: auto;
        `;

        document.body.appendChild(sidebar);

        // 蓝色吸入式按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'sidebar-toggle-btn';
        toggleBtn.innerHTML = '屏蔽设置';
        toggleBtn.style.cssText = `
            position: fixed;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            z-index: 9999;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 0 8px 8px 0;
            padding: 12px 8px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 2px 2px 8px rgba(0,0,0,0.2);
            writing-mode: vertical-rl;
            text-orientation: mixed;
            height: auto;
            min-height: 100px;
            transition: all 0.3s ease;
            opacity: 0.9;
        `;
        document.body.appendChild(toggleBtn);

        // 内部样式
        const style = document.createElement('style');
        style.textContent = `
            .sidebar-header {
                background: #2c3e50;
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .sidebar-header h3 {
                margin: 0;
                font-size: 16px;
            }
            .sidebar-header button {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }
            .sidebar-content {
                padding: 15px;
            }
            .config-section label {
                display: block;
                margin-bottom: 8px;
                font-weight: bold;
                color: #333;
                font-size: 14px;
            }
            #blocked-book-ids-input, #blocked-user-ids-input, #blocked-rids-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                resize: vertical;
                font-family: monospace;
                box-sizing: border-box;
                font-size: 12px;
            }
            .button-group {
                margin: 20px 0;
                display: flex;
                gap: 10px;
            }
            .button-group button {
                flex: 1;
                padding: 10px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
            }
            #apply-filter {
                background: #4CAF50;
                color: white;
            }
            #apply-filter:hover {
                background: #45a049;
            }
            #reset-filter {
                background: #f44336;
                color: white;
            }
            #reset-filter:hover {
                background: #da190b;
            }
            .help-text {
                background: #e3f2fd;
                padding: 12px;
                border-radius: 4px;
                font-size: 12px;
                color: #333;
                line-height: 1.4;
            }
            .help-text p {
                margin: 8px 0;
            }
            .help-text strong {
                color: #2c5282;
            }
            .sidebar-expanded {
                left: 0 !important;
            }

            /* 按钮悬停效果 */
            #sidebar-toggle-btn:hover {
                background: #357abd;
                opacity: 1;
                left: 5px;
                padding-left: 12px;
            }
        `;
        document.head.appendChild(style);

        // 事件处理
        const blockedBookIdsInput = sidebar.querySelector('#blocked-book-ids-input');
        const blockedUserIdsInput = sidebar.querySelector('#blocked-user-ids-input');
        const blockedRidsInput = sidebar.querySelector('#blocked-rids-input');
        const applyBtn = sidebar.querySelector('#apply-filter');
        const resetBtn = sidebar.querySelector('#reset-filter');
        const closeBtn = sidebar.querySelector('#toggle-sidebar');
        const bookCountSpan = sidebar.querySelector('#blocked-book-count');
        const userCountSpan = sidebar.querySelector('#blocked-user-count');
        const ridCountSpan = sidebar.querySelector('#blocked-rid-count');

        // 初始化输入框和计数
        const blockedBookIds = getBlockedBookIds();
        const blockedUserIds = getBlockedUserIds();
        const blockedRids = getBlockedRids();
        blockedBookIdsInput.value = blockedBookIds.join('\n');
        blockedUserIdsInput.value = blockedUserIds.join('\n');
        blockedRidsInput.value = blockedRids.join('\n');
        bookCountSpan.textContent = blockedBookIds.length;
        userCountSpan.textContent = blockedUserIds.length;
        ridCountSpan.textContent = blockedRids.length;

        // 切换侧边栏
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-expanded');
        });

        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('sidebar-expanded');
        });

        // 应用过滤
        applyBtn.addEventListener('click', () => {
            const bookIds = blockedBookIdsInput.value.split('\n')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id));
            const userIds = blockedUserIdsInput.value.split('\n')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id));
            const rids = blockedRidsInput.value.split('\n')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id));

            saveBlockedBookIds(bookIds);
            saveBlockedUserIds(userIds);
            saveBlockedRids(rids);
            location.reload();
        });

        // 重置过滤
        resetBtn.addEventListener('click', () => {
            if (confirm('确定要清空所有屏蔽设置吗？（包括书籍、用户和RID）')) {
                saveBlockedBookIds([]);
                saveBlockedUserIds([]);
                saveBlockedRids([]);
                saveHiddenContent([]);
                location.reload();
            }
        });

        // 实时更新计数
        function updateCounts() {
            const bookIds = blockedBookIdsInput.value.split('\n')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id));
            const userIds = blockedUserIdsInput.value.split('\n')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id));
            const rids = blockedRidsInput.value.split('\n')
                .map(id => id.trim())
                .filter(id => id !== '' && !isNaN(id));

            bookCountSpan.textContent = bookIds.length;
            userCountSpan.textContent = userIds.length;
            ridCountSpan.textContent = rids.length;
        }

        blockedBookIdsInput.addEventListener('input', updateCounts);
        blockedUserIdsInput.addEventListener('input', updateCounts);
        blockedRidsInput.addEventListener('input', updateCounts);
    }

    // 检测当前页面类型并应用过滤
    function detectPageTypeAndFilter() {
        const currentUrl = window.location.href;

        if (currentUrl.includes('/modules/article/reviewslist.php')) {
            // 书评列表页
            filterReviewsList();
        } else if (currentUrl.includes('/modules/article/reviewshow.php')) {
            // 帖子详情页
            filterReviewDetail();
        }
    }

    // 初始化
    function init() {
        createConfigUI();
        detectPageTypeAndFilter();
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// === 整合的脚本代码 ===

(function() {
    'use strict';

    // 等待页面加载完成
    setTimeout(() => {
        addGradientTool();
    }, 1000);

    function addGradientTool() {
        // 找到评论框
        const commentBox = document.querySelector('textarea[name="pcontent"]');
        if (!commentBox) return;

        // 创建工具按钮
        const toolButton = document.createElement('input');
        toolButton.type = 'button';
        toolButton.value = ' 渐变文字 ';
        toolButton.className = 'button';
        toolButton.style.cssText = `
            margin-left: 0px;
        `;

        // 创建工具面板
        const toolPanel = document.createElement('div');
        toolPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #ADD8E6;
            border-radius: 8px;
            padding: 0;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: none;
            width: 380px;
            height: 550px;
            box-sizing: border-box;
            user-select: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            overflow: hidden;
        `;

        // 面板内容
        toolPanel.innerHTML = `
            <div id="panelHeader" style="padding: 15px; border-bottom: 1px solid #eee; cursor: move; background: #f8f9fa; border-radius: 8px 8px 0 0; flex-shrink: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 16px;">
                        <span style="color: #1C7ECA;">-</span><span style="color: #1B85CB;">-</span><span style="color: #198DCC;">渐</span><span style="color: #1894CC;">变</span><span style="color: #179CCD;">文</span><span style="color: #15A3CE;">字</span><span style="color: #14ABCF;">生</span><span style="color: #12B2D0;">成</span><span style="color: #11BAD1;">器</span><span style="color: #10C1D1;">-</span><span style="color: #0EC9D2;">-</span>
                    </h3>
                    <button id="closePanel" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
                </div>
            </div>

            <div style="padding: 15px; height: calc(100% - 60px); overflow-y: auto; box-sizing: border-box;">
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">输入文字:</label>
                    <input type="text" id="gradientText" placeholder="输入要生成渐变的文字" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">起始颜色:</label>
                    <input type="color" id="startColor" value="#F0F8FF" style="width: 100%; height: 40px; box-sizing: border-box; cursor: pointer;">
                </div>

                <div id="pathColorsContainer" style="margin-bottom: 10px;">
                    <!-- 路径颜色会动态添加在这里 -->
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">结束颜色:</label>
                    <input type="color" id="endColor" value="#F0F8FF" style="width: 100%; height: 40px; box-sizing: border-box; cursor: pointer;">
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button id="addPath" style="flex: 1; padding: 8px; background: #48D1CC; color: #FFFFFF; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">增加路径点</button>
                    <button id="removePath" style="flex: 1; padding: 8px; background: #48D1CC; color: #FFFFFF; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">减少路径点</button>
                </div>

                <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">预览:</label>
                    <div id="preview" style="min-height: 40px; max-height: 120px; padding: 10px; background: white; border: 1px dashed #ccc; border-radius: 4px; word-wrap: break-word; overflow-y: auto; font-size: 14px;"></div>
                </div>

              <div style="display: flex; gap: 10px; margin-bottom: 10px;">
    <button id="generateGradient" style="flex: 1; padding: 8px; background: #6495ED; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">生成渐变</button>
    <button id="generateRainbow" style="flex: 1; padding: 8px; background: #6495ED; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; overflow: hidden; position: relative;">
        <span style="position: relative; z-index: 2; display: inline-block; animation: rainbowFlow 15s infinite linear; letter-spacing: -2px; background: linear-gradient(90deg, #ff0000, #ffb600, #fff600, #a5ff00, #00a9ff, #0400ff, #8a00fc, #ff00e9, #ff0059, #ff0000); background-size: 400% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;">
            -Rainbow Color-
        </span>
    </button>
</div>

<style>
@keyframes rainbowFlow {
    100% {
        background-position: 0% 50%;
    }
    0% {
        background-position: 400% 50%;
    }
}
</style>

                <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                    <button id="copyCode" style="flex: 1; padding: 8px; background: #6495ED; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">复制代码</button>
                    <button id="insertCode" style="flex: 1; padding: 8px; background: #6495ED; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">插入评论</button>
                </div>
            </div>
        `;

        document.body.appendChild(toolPanel);

        // 路径点管理
        let pathCount = 0;
        const pathColorsContainer = document.getElementById('pathColorsContainer');

        function addPathColor() {
            pathCount++;
            const pathDiv = document.createElement('div');
            pathDiv.style.marginBottom = '10px';
            pathDiv.innerHTML = `
                <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 14px;">路径${pathCount}:</label>
                <input type="color" class="pathColor" value="#F0F8FF" style="width: 100%; height: 40px; box-sizing: border-box; cursor: pointer;">
            `;
            pathColorsContainer.appendChild(pathDiv);
            updateRemoveButtonState();
        }

        function removePathColor() {
            if (pathCount > 0) {
                pathColorsContainer.removeChild(pathColorsContainer.lastChild);
                pathCount--;
                updateRemoveButtonState();
            }
        }

        function updateRemoveButtonState() {
            document.getElementById('removePath').disabled = pathCount === 0;
        }

        // 初始化
        updateRemoveButtonState();

        // 拖拽功能
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        const header = document.getElementById('panelHeader');

        header.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        function startDrag(e) {
            if (e.target.closest('button') || e.target.closest('input')) {
                return; // 不拖拽按钮和输入框
            }
            isDragging = true;
            const rect = toolPanel.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            toolPanel.style.cursor = 'grabbing';
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;

            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;

            // 限制在窗口范围内
            const maxX = window.innerWidth - toolPanel.offsetWidth;
            const maxY = window.innerHeight - toolPanel.offsetHeight;

            const boundedX = Math.max(0, Math.min(x, maxX));
            const boundedY = Math.max(0, Math.min(y, maxY));

            toolPanel.style.left = boundedX + 'px';
            toolPanel.style.top = boundedY + 'px';
            toolPanel.style.transform = 'none';
        }

        function stopDrag() {
            isDragging = false;
            toolPanel.style.cursor = '';
        }

        // 打开面板函数
        function openPanel() {
            toolPanel.style.display = 'block';
            // 重置位置到中央
            toolPanel.style.left = '50%';
            toolPanel.style.top = '50%';
            toolPanel.style.transform = 'translate(-50%, -50%)';

            // 触发重绘
            toolPanel.offsetHeight;

            // 开始淡入动画
            setTimeout(() => {
                toolPanel.style.opacity = '1';
            }, 10);
        }

        // 关闭面板函数
        function closePanel() {
            toolPanel.style.opacity = '0';

            // 等待动画完成后隐藏
            setTimeout(() => {
                toolPanel.style.display = 'none';
            }, 500);
        }

        // 事件处理
        toolButton.addEventListener('click', openPanel);

        document.getElementById('closePanel').addEventListener('click', closePanel);

        // 路径点按钮事件
        document.getElementById('addPath').addEventListener('click', addPathColor);
        document.getElementById('removePath').addEventListener('click', removePathColor);

        // 点击面板外部关闭
        document.addEventListener('click', (e) => {
            if (toolPanel.style.display === 'block' &&
                !toolPanel.contains(e.target) &&
                e.target !== toolButton) {
                closePanel();
            }
        });

        // 阻止面板内点击事件冒泡（避免意外关闭）
        toolPanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 生成渐变文字
        document.getElementById('generateGradient').addEventListener('click', generateGradient);

        // 生成彩虹色文字
        document.getElementById('generateRainbow').addEventListener('click', generateRainbow);

        // 复制代码
        document.getElementById('copyCode').addEventListener('click', copyCode);

        // 插入评论
        document.getElementById('insertCode').addEventListener('click', insertCode);

        // 实时预览
        document.getElementById('gradientText').addEventListener('input', updatePreview);
        document.getElementById('startColor').addEventListener('input', updatePreview);
        document.getElementById('endColor').addEventListener('input', updatePreview);

        // 回车键生成
        document.getElementById('gradientText').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                generateGradient();
            }
        });

        // 将按钮插入到发表书评按钮的右侧
        const submitButton = commentBox.closest('table').querySelector('input[type="submit"]');
        if (submitButton && submitButton.parentNode) {
            submitButton.parentNode.appendChild(toolButton);
        }

        function generateGradient() {
            const text = document.getElementById('gradientText').value.trim();
            if (!text) {
                alert('请输入文字');
                return;
            }

            const startColor = document.getElementById('startColor').value;
            const endColor = document.getElementById('endColor').value;

            // 收集所有路径颜色
            const pathColors = [];
            const pathInputs = document.querySelectorAll('.pathColor');
            pathInputs.forEach(input => {
                pathColors.push(input.value);
            });

            const result = createMultiGradientText(text, startColor, pathColors, endColor);
            document.getElementById('preview').innerHTML = result;
        }

        function generateRainbow() {
            const text = document.getElementById('gradientText').value.trim();
            if (!text) {
                alert('请输入文字');
                return;
            }

            const result = createRainbowText(text);
            document.getElementById('preview').innerHTML = result;
        }

        function updatePreview() {
            const text = document.getElementById('gradientText').value;
            if (text) {
                generateGradient();
            }
        }

        function copyCode() {
            const code = document.getElementById('preview').innerHTML;
            if (!code) {
                alert('请先生成文字');
                return;
            }

            navigator.clipboard.writeText(code).then(() => {
                alert('代码已复制到剪贴板');
            }).catch(() => {
                // 降级方案
                const textarea = document.createElement('textarea');
                textarea.value = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('代码已复制到剪贴板');
            });
        }

        function insertCode() {
            const code = document.getElementById('preview').innerHTML;
            if (!code) {
                alert('请先生成文字');
                return;
            }

            // 插入到评论框
            commentBox.value += code;
            closePanel();
        }

        function createMultiGradientText(text, startHex, pathHexes, endHex) {
            // 构建完整的颜色数组
            const colors = [startHex, ...pathHexes, endHex];
            const colorCount = colors.length;

            if (colorCount === 1) {
                // 只有一种颜色
                const hex = rgbToHex(hexToRgb(colors[0]));
                return `[color=${hex}]${text}[/color]`;
            }

            const result = [];
            const segmentLength = text.length / (colorCount - 1);

            for (let i = 0; i < text.length; i++) {
                // 确定当前字符在哪个色阶段
                const segmentIndex = Math.min(colorCount - 2, Math.floor(i / segmentLength));

                // 计算在当前段内的位置比例 (0.0 - 1.0)
                const segmentPos = (i - segmentIndex * segmentLength) / segmentLength;

                // 获取当前段的起始和结束颜色
                const startRgb = hexToRgb(colors[segmentIndex]);
                const endRgb = hexToRgb(colors[segmentIndex + 1]);

                // 计算当前字符的颜色
                const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * segmentPos);
                const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * segmentPos);
                const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * segmentPos);

                const hex = rgbToHex(r, g, b);
                result.push(`[color=${hex}]${text[i]}[/color]`);
            }

            return result.join('');
        }

        function createRainbowText(text) {
            const result = [];

            for (let i = 0; i < text.length; i++) {
                const hue = (i / (text.length - 1)) * 300;
                const rgb = hslToRgb(hue, 100, 50);
                const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                result.push(`[color=${hex}]${text[i]}[/color]`);
            }

            return result.join('');
        }

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : {r: 0, g: 0, b: 0};
        }

        function rgbToHex(r, g, b) {
            // 移除#号，只返回6位十六进制代码
            return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        }

        function hslToRgb(h, s, l) {
            s /= 100;
            l /= 100;

            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = l - c / 2;

            let r, g, b;

            if (h >= 0 && h < 60) {
                [r, g, b] = [c, x, 0];
            } else if (h >= 60 && h < 120) {
                [r, g, b] = [x, c, 0];
            } else if (h >= 120 && h < 180) {
                [r, g, b] = [0, c, x];
            } else if (h >= 180 && h < 240) {
                [r, g, b] = [0, x, c];
            } else if (h >= 240 && h < 300) {
                [r, g, b] = [x, 0, c];
            } else {
                [r, g, b] = [c, 0, x];
            }

            return {
                r: Math.round((r + m) * 255),
                g: Math.round((g + m) * 255),
                b: Math.round((b + m) * 255)
            };
        }
    }
})();

// === 整合的脚本代码 ===

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

// === 整合的脚本代码 ===

(function() {
    'use strict';

    // 检查页面是否显示"超过允许回复时间"
    const expiredMessage = document.body.innerHTML.includes('超过允许回复时间');
    if (!expiredMessage) return;

    // 获取帖子ID (rid) 和书籍ID (aid)
    const urlParams = new URLSearchParams(window.location.search);
    const rid = urlParams.get('rid');

    // 从页面获取书籍ID
    let aid = null;
    const bookLink = document.querySelector('a[href*="/book/"]');
    if (bookLink) {
        const match = bookLink.href.match(/\/book\/(\d+)\.htm/);
        aid = match ? match[1] : null;
    }

    // 创建铲开按钮
    const shovelButton = document.createElement('input');
    shovelButton.type = 'button';
    shovelButton.value = ' 铲开 ';
    shovelButton.className = 'button';
    shovelButton.style.marginLeft = '10px';

    // 添加点击事件
    shovelButton.addEventListener('click', function() {
        shovelReply(rid, aid);
    });

    // 找到页面中合适的位置插入按钮
    const replyTable = document.querySelector('table.grid caption');
    if (replyTable && replyTable.textContent.includes('回复书评：')) {
        const submitButton = document.querySelector('input[value=" 发表书评 "]');
        if (submitButton) {
            submitButton.parentNode.appendChild(shovelButton);
        }
    }

    // 如果在回复区域没找到按钮位置，就在页面底部添加
    if (!shovelButton.parentNode) {
        const contentDiv = document.querySelector('#centerl #content');
        if (contentDiv) {
            const buttonContainer = document.createElement('div');
            buttonContainer.style.textAlign = 'center';
            buttonContainer.style.margin = '10px 0';
            buttonContainer.appendChild(shovelButton);
            contentDiv.appendChild(buttonContainer);
        }
    }

    // 铲开功能 - 发送7个字节的空格内容
    function shovelReply(rid, aid) {
        if (!confirm('确定要铲开这个帖子吗？')) return;

        // 7个空格字符（每个空格在URL编码中是%20，但实际发送时会自动编码）
        const sevenSpaces = '       '; // 7个空格

        const formData = new URLSearchParams();
        formData.append('pcontent', sevenSpaces);
        formData.append('Submit', ' 发表书评 ');

        console.log('铲开发送的数据:', formData.toString());

        fetch(`/modules/article/reviewshow.php?rid=${rid}&aid=${aid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData,
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error(`HTTP错误: ${response.status}`);
            }
        })
        .then(data => {
            console.log('铲开成功');
            alert('铲开成功！');
            // 延迟刷新页面
            setTimeout(() => {
                location.reload();
            }, 1000);
        })
        .catch(error => {
            console.error('铲开失败:', error);
            alert('铲开失败: ' + error.message);
        });
    }
})();