// ==UserScript==
// @name         轻小说文库铲开按钮
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  为过期帖子添加铲开按钮
// @author       You
// @match        https://www.wenku8.cc/modules/article/reviewshow.php?rid=*
// @match        https://www.wenku8.net/modules/article/reviewshow.php?rid=*
// @grant        none
// @icon               https://www.wenku8.cc/favicon.ico
// ==/UserScript==

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