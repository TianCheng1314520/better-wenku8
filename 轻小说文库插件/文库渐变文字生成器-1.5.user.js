// ==UserScript==
// @name         文库渐变文字生成器
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  在文库评论框处添加渐变文字生成功能
// @author       天秤
// @match        https://www.wenku8.cc/modules/article/reviewshow.php*
// @match        https://www.wenku8.cc/modules/article/reviewedit.php*
// @match        https://www.wenku8.net/modules/article/reviewedit.php*
// @match        https://www.wenku8.net/modules/article/reviewshow.php*
// @grant        none
// @icon               https://www.wenku8.cc/favicon.ico
// ==/UserScript==

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