// ==UserScript==
// @name         轻小说书评过滤器
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  屏蔽指定书籍、用户和RID的书评帖子，并显示详细信息
// @author       天秤
// @match        https://www.wenku8.cc/modules/article/reviewslist.php*
// @match        https://www.wenku8.cc/modules/article/reviewshow.php*
// @match        https://www.wenku8.net/modules/article/reviewslist.php*
// @match        https://www.wenku8.net/modules/article/reviewshow.php*
// @grant        GM_setValue
// @grant        GM_getValue
// @icon               https://www.wenku8.cc/favicon.ico
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