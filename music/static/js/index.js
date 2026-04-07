// ★ 绑定主导航（统一的 header）
const li_list = document.querySelectorAll('#main-header .middle ul li');
const iframeIdMap = {
    'music_hall': 'iframe-music_hall',
    'music_recommendation': 'iframe-music_recommendation',
    'music_community': 'iframe-music_community',
    'creator_centered': 'iframe-creator_centered',
    'my_music': 'iframe-my_music'
};

// 为每个 iframe 维护独立的高度缓存
// 使用 index.html 中定义的全局 iframeHeightCache，避免重复定义

// 特殊页面固定高度配置（单位：px）
const FIXED_PAGE_HEIGHTS = {
    'iframe-music_recommendation': 1200, // 乐曲智荐页面固定高度
};

function setActiveIframe(key) {
    Object.keys(iframeIdMap).forEach(pageKey => {
        const iframe = document.getElementById(iframeIdMap[pageKey]);
        if (iframe) {
            if (pageKey === key) {
                // 显示当前页面
                iframe.style.display = 'block';
                iframe.classList.add('active-iframe');

                // ★ 关键修改：music_recommendation 页面强制使用固定高度
                if (iframe.id === 'iframe-music_recommendation') {
                    iframe.style.height = '1200px';
                } else if (FIXED_PAGE_HEIGHTS[iframe.id]) {
                    // 其他固定高度的页面
                    const fixedHeight = FIXED_PAGE_HEIGHTS[iframe.id];
                    iframe.style.height = fixedHeight + 'px';
                } else {
                    // 恢复缓存的高度
                    const cachedHeight = iframeHeightCache.get(iframe.id);
                    if (cachedHeight) {
                        iframe.style.height = cachedHeight + 'px';
                    } else {
                        // 如果没有缓存，调用 setIframeHeight 重新计算
                        setTimeout(() => setIframeHeight(iframe), 100);
                    }
                }
            } else {
                // 隐藏其他页面，保存当前高度到缓存（music_recommendation 除外）
                iframe.style.display = 'none';
                iframe.classList.remove('active-iframe');

                // music_recommendation 不需要缓存，始终是 1200px
                if (iframe.id !== 'iframe-music_recommendation') {
                    const currentHeight = parseFloat(iframe.style.height) || 800;
                    iframeHeightCache.set(iframe.id, currentHeight);
                }
            }
        }
    });
}

li_list.forEach(li => {
    li.addEventListener('click', () => {
        li_list.forEach(el => el.classList.remove('visited_li'));
        li.classList.add('visited_li');

        const key = li.getAttribute('data-key');
        console.log('导航点击 key:', key);
        if (!key) {
            console.warn('未设置 data-key，忽略切换。', li);
            return;
        }

        console.log('切换至预加载 iframe:', key);
        setActiveIframe(key);

        // 不再立即调用 setIframeHeight，而是让 setActiveIframe 使用缓存高度
        // 延迟检查内容是否完全加载，仅在首次加载时计算高度
        const activeIframe = document.getElementById(iframeIdMap[key]);
        if (activeIframe && !iframeHeightCache.has(activeIframe.id)) {
            setTimeout(() => setIframeHeight(activeIframe), 300);
        }
    });
});

// 初始显示第一页面
setActiveIframe('music_hall');

// ... existing code ...

function hoverIcon(el, enterClass, leaveClass) {
    const icon = el.querySelector('i');

    el.addEventListener('mouseenter', () => {
        icon.className = `iconfont8 ${enterClass}`;
    });

    el.addEventListener('mouseleave', () => {
        icon.className = `iconfont8 ${leaveClass}`;
    });
}

hoverIcon(document.querySelector('.weibo'), 'icon-weibo1', 'icon-weibo');
hoverIcon(document.querySelector('.weixin'), 'icon-weixin1', 'icon-weixin');
hoverIcon(document.querySelector('.qq'), 'icon-QQ1', 'icon-QQ');
const weibo = document.querySelector('.weibo');
const weixin = document.querySelector('.weixin');
const qq = document.querySelector('.qq');

const weiboBox = document.querySelector('.weibo-qrcode-box');
const weixinBox = document.querySelector('.weixin-qrcode-box');
const qqBox = document.querySelector('.qq-qrcode-box');

function hoverBox(trigger, box) {
    trigger.addEventListener('mouseenter', () => {
        box.style.display = 'block';
    });
    trigger.addEventListener('mouseleave', () => {
        box.style.display = 'none';
    });
}

hoverBox(weibo, weiboBox);
hoverBox(weixin, weixinBox);
hoverBox(qq, qqBox);
const playMusicLike = document.querySelector('.play-music-like');
const icon = playMusicLike.querySelector('i');

playMusicLike.addEventListener('click', function() {
    // toggle 会根据是否存在该类名进行 开启/关闭，并返回布尔值
    const isActive = playMusicLike.classList.toggle('active');

    // 根据状态修改 title 内容
    icon.title = isActive ? "取消喜爱" : "喜爱";
});
const playmusiccycle = document.querySelector('.play-music-cycle');
// icon-bofang-xunhuanbofang icon-suijibofang icon-danquxunhuan
playmusiccycle.addEventListener('click', function() {
    const icon = playmusiccycle.querySelector('i');
    if (icon.className === 'iconfont icon-bofang-xunhuanbofang') {
        icon.className = 'iconfont icon-suijibofang';
        icon.title = '随机播放';
    } else if (icon.className === 'iconfont icon-suijibofang') {
        icon.className = 'iconfont icon-danquxunhuan';
        icon.title = '单曲循环';
    } else {
        icon.className = 'iconfont icon-bofang-xunhuanbofang';
        icon.title = '列表循环';
    }
});
const playMusicVoice = document.querySelector('.play-music-voice');
const volumeBox1 = document.querySelector('.play-music-volume-box');

playMusicVoice.addEventListener('click', (e) => {
    // 阻止冒泡（防止点击音量条时意外关闭，视需求而定）
    e.stopPropagation();

    // 一行代码搞定显示/隐藏切换
    volumeBox1.classList.toggle('show');
});

// 可选：点击页面其他地方自动关闭音量盒
document.addEventListener('click', () => {
    volumeBox1.classList.remove('show');
});
// ==================== 音量调节功能 ====================
const voiceBtn = document.querySelector('.play-music-voice');
const volumeBox = document.querySelector('.play-music-volume-box');
const volumeBar = document.querySelector('.play-music-volume-bar');
const voiceIcon = voiceBtn.querySelector('i');

if (volumeBox && volumeBar && voiceBtn) {
    let currentVolume = 80; // 默认音量 80%
    let isDragging = false;
    let hideTimer = null;

    // 初始化音量条
    updateVolumeBar(currentVolume);

    // 鼠标移入显示音量条
    voiceBtn.addEventListener('mouseenter', function() {
        clearTimeout(hideTimer);
        volumeBox.classList.add('show');
    });

    // 鼠标移出隐藏音量条
    voiceBtn.addEventListener('mouseleave', function() {
        hideTimer = setTimeout(() => {
            if (!volumeBox.matches(':hover')) {
                volumeBox.classList.remove('show');
            }
        }, 200);
    });

    volumeBox.addEventListener('mouseenter', function() {
        clearTimeout(hideTimer);
    });

    volumeBox.addEventListener('mouseleave', function() {
        hideTimer = setTimeout(() => {
            volumeBox.classList.remove('show');
        }, 200);
    });

    // 点击音量条调节
    volumeBox.addEventListener('click', function(e) {
        e.stopPropagation();
        const rect = volumeBox.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const percentage = ((rect.height - clickY) / rect.height) * 100;
        const newVolume = Math.max(0, Math.min(100, percentage));
        updateVolumeBar(newVolume);
        currentVolume = newVolume;
        console.log('设置音量:', currentVolume);
    });

    // 拖动音量条
    volumeBox.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        isDragging = true;
        const rect = volumeBox.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const percentage = ((rect.height - clickY) / rect.height) * 100;
        const newVolume = Math.max(0, Math.min(100, percentage));
        updateVolumeBar(newVolume);
        currentVolume = newVolume;
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        const rect = volumeBox.getBoundingClientRect();
        let clickY = e.clientY - rect.top;

        // 限制在音量条范围内
        if (clickY < 0) clickY = 0;
        if (clickY > rect.height) clickY = rect.height;

        const percentage = ((rect.height - clickY) / rect.height) * 100;
        const newVolume = Math.max(0, Math.min(100, percentage));
        updateVolumeBar(newVolume);
        currentVolume = newVolume;
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
    });

    // 更新音量条显示函数
    function updateVolumeBar(volume) {
        // 创建红色进度条（从上向下）
        const redBarHeight = (volume / 100) * 130; // 130px 是音量条总高度

        // 检查是否已有红色进度条
        let redBar = volumeBar.querySelector('.volume-red-bar');
        if (!redBar) {
            redBar = document.createElement('div');
            redBar.className = 'volume-red-bar';
            volumeBar.appendChild(redBar);
        }

        redBar.style.height = redBarHeight + 'px';

        // 根据音量改变图标
        if (volume === 0) {
            voiceIcon.className = 'iconfont icon-shengyinwu';
            voiceBtn.setAttribute('title', '静音');
        } else {
            voiceIcon.className = 'iconfont icon-shengyin';
            voiceBtn.setAttribute('title', '音量');
        }
    }
}
const playMusicList = document.querySelector('.play-music-list');
const playMusicListBox = document.querySelector('.play-music-list-box');

playMusicList.addEventListener('click', function(e) {
    // 阻止事件冒泡（防止触发 document 的点击事件）
    e.stopPropagation();

    // 切换 active 类名：有则删掉，无则加上
    playMusicListBox.classList.toggle('active');
});

// 点击页面其他地方时，自动收起播放列表
document.addEventListener('click', function() {
    playMusicListBox.classList.remove('active');
});

// 防止点击列表内部时列表意外关闭
playMusicListBox.addEventListener('click', function(e) {
    e.stopPropagation();
});
// 绑定播放按钮点击事件
$(document).on('click', '.play-btn', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const musicId = $(this).data('music-id');
    console.log('播放音乐 ID:', musicId);

    // 向父窗口发送消息
    if (window.parent) {
        window.parent.postMessage({
            type: 'play_music',
            music_id: musicId
        }, '*');
    }
});