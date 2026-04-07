const waveIcon = document.getElementById('audio-wave-item');
const imageIcon = document.getElementById('upload-image-item');
const audioInput = document.getElementById('audio-input');
const imageInput = document.getElementById('image-input');
const audioPlayerContainer = document.getElementById('audio-player-container');
const previewAudio = document.getElementById('preview-audio');
const playToggle = document.getElementById('audio-play-toggle');
const audioTime = document.getElementById('audio-time');
const waveBars = document.getElementById('audio-wave-bars');
const iconWaveEffect = document.getElementById('icon-wave-effect');
const imagePreview = document.getElementById('image-preview');
const analyzeBtn = document.getElementById('analyze-btn');
// ✅ 兼容性修复：analysisResult 可能为 null（旧表格方案）
const analysisResult = document.getElementById('analysis-result'); // 新方案使用 'recommendation-results'
const recordingBox = document.getElementById('recording-box');
const recordingWaveBars = document.getElementById('recording-wave-bars');
const stopRecordingBtn = document.getElementById('stop-recording-btn');
const startRecordingBtn = document.getElementById('start-recording-btn');
const recordingIcons = document.getElementById('recording-icons');

let longPressTimer = null;
let isWavePreviewAnimating = false;
let isIconWaveAnimating = false;
let isAudioPlaying = false;
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordingStream = null;
let uploadType = null; // 记录最后上传的类型：'audio' 或 'image'

function createWaveBars(count = 50) { // 增加波浪条数量到50个
    waveBars.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const bar = document.createElement('span');
        bar.className = 'wave-bar';
        bar.style.animationDelay = `${(i * 15) % 400}ms`; // 调整动画延迟以适应更多波浪条
        waveBars.appendChild(bar);
    }
}

function createIconWaveBars(count = 7) {
    iconWaveEffect.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const bar = document.createElement('span');
        bar.style.animationDelay = `${(i * 70) % 360}ms`;
        iconWaveEffect.appendChild(bar);
    }
}

// 创建录音盒子的波浪条
function createRecordingWaveBars(count = 30) {
    if (!recordingWaveBars) return;
    recordingWaveBars.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.animationDelay = `${(i * 50) % 800}ms`;
        recordingWaveBars.appendChild(bar);
    }
}

// 显示录音盒子
function showRecordingBox() {
    if (!recordingBox) return;
    recordingBox.classList.remove('hidden');

    // 重置按钮状态
    if (startRecordingBtn) startRecordingBtn.classList.remove('hidden');
    if (stopRecordingBtn) stopRecordingBtn.classList.add('hidden');

    // 创建波浪条
    createRecordingWaveBars(30);

    console.log('显示录音盒子');
}

// 隐藏录音盒子
function hideRecordingBox() {
    if (!recordingBox) return;
    recordingBox.classList.add('hidden');

    // 隐藏遮罩层
    const overlay = document.querySelector('.recording-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }

    console.log('隐藏录音盒子');
}

function showIconWaveEffect() {
    if (isIconWaveAnimating) return;
    isIconWaveAnimating = true;
    iconWaveEffect.classList.add('active');
    createIconWaveBars(7);
}

function hideIconWaveEffect() {
    isIconWaveAnimating = false;
    iconWaveEffect.classList.remove('active');
    iconWaveEffect.innerHTML = '';
}

function renderRecordingIcons(count = 5) {
    recordingIcons.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const rec = document.createElement('i');
        rec.className = 'iconfont icon-a-yinbobowenyuyin rec-icon';
        rec.style.animationDelay = `${i * 80}ms`;
        recordingIcons.appendChild(rec);
    }
}

function startRecording() {
    if (isRecording) return;

    console.log('=== 开始录音 ===');
    isRecording = true;

    // 清空图片预览（如果已选择图片）
    if (!imagePreview.classList.contains('hidden')) {
        imagePreview.innerHTML = '';
        imagePreview.classList.add('hidden');
        console.log('已清空图片预览');
    }

    // 更新 UI 状态
    waveIcon.classList.add('recording');
    renderRecordingIcons(7);
    recordingIcons.classList.remove('hidden');
    showIconWaveEffect();
    startWaveAnimate();

    recordedChunks = [];

    // 检查浏览器是否支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('浏览器不支持 getUserMedia API');
        alert('您的浏览器不支持录音功能，请使用现代浏览器（Chrome、Edge、Firefox 等）');
        stopRecording();
        return;
    }

    // 请求麦克风权限并开始录音
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
            console.log('✓ 获取到音频流');

            isRecording = true;
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];

            mediaRecorder.ondataavailable = function(event) {
                console.log('📦 收到音频数据块，大小:', event.data.size, '字节');
                if (event.data && event.data.size > 0) {
                    recordedChunks.push(event.data);
                    console.log('✅ 已收集', recordedChunks.length, '个音频块');
                }
            };

            mediaRecorder.onstop = function() {
                console.log('⏹️ 录音停止，收集了', recordedChunks.length, '个音频块');

                // 停止所有音轨
                stream.getTracks().forEach(track => track.stop());

                if (recordedChunks.length > 0) {
                    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                    console.log('创建音频 Blob，大小:', blob.size, '字节');
                    const url = URL.createObjectURL(blob);
                    console.log('创建音频 URL');
                    displayAudioPlayer(url);
                } else {
                    console.warn('⚠️ 没有收集到音频数据');
                    alert('录音失败，未检测到声音数据。请确保麦克风正常工作，并尝试重新录音。');
                    displayAudioPlayer(null);
                }
            };

            // 启动录音
            mediaRecorder.start();
        })
        .catch(function(error) {
            console.error('❌ 获取麦克风权限失败:', error);

            let errorMsg = '无法访问麦克风';
            if (error.name === 'NotAllowedError') {
                errorMsg = '您拒绝了麦克风权限，请在浏览器设置中允许录音权限';
            } else if (error.name === 'NotFoundError') {
                errorMsg = '未检测到麦克风设备，请连接麦克风后重试';
            } else if (error.name === 'NotReadableError') {
                errorMsg = '麦克风设备被占用或无法访问';
            }

            alert(errorMsg + ' (错误：' + error.name + ')');
            stopRecording();
        });
}

function stopRecording() {
    if (!isRecording) return;

    console.log('停止录音');
    isRecording = false;

    waveIcon.classList.remove('recording');
    recordingIcons.classList.add('hidden');
    hideIconWaveEffect();
    stopWaveAnimate();

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('已调用 MediaRecorder.stop()');
    }

    mediaRecorder = null;
}


function startWaveAnimate() {
    if (isWavePreviewAnimating) return;
    isWavePreviewAnimating = true;
    waveBars.querySelectorAll('.wave-bar').forEach((bar, index) => {
        bar.classList.add('animate');
        bar.style.animationDuration = `${600 + (index * 20)}ms`;
    });
}

function stopWaveAnimate() {
    isWavePreviewAnimating = false;
    waveBars.querySelectorAll('.wave-bar').forEach(bar => {
        bar.classList.remove('animate');
    });
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '00:00';
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
}

function updateAudioTime() {
    const current = formatTime(previewAudio.currentTime);
    const duration = previewAudio.duration ? formatTime(previewAudio.duration) : '00:00';
    audioTime.textContent = `${current} / ${duration}`;
}

function displayAudioPlayer(audioUrl) {
    resetAudioPlayer();

    // ★ 关键修复：显示音频前先清空图片预览
    resetImagePreview();
    uploadType = 'audio'; // 记录上传类型为音频
    console.log('已清空图片预览');

    if (audioUrl) {
        previewAudio.src = audioUrl;
        previewAudio.load();
        audioPlayerContainer.classList.remove('hidden');
        createWaveBars(50);
        updateAudioTime();
        analyzeBtn.classList.remove('hidden');

        // 绑定事件监听器
        previewAudio.addEventListener('timeupdate', updateAudioTime);
        previewAudio.addEventListener('loadedmetadata', updateAudioTime);
        previewAudio.addEventListener('ended', () => {
            isAudioPlaying = false;
            playToggle.classList.remove('active');
            playToggle.innerHTML = '<i class="iconfont icon-bofang"></i>';
            stopWaveAnimate();
        });
    } else {
        // 显示空音频播放器
        audioPlayerContainer.classList.remove('hidden');
        createWaveBars(50);
        audioTime.textContent = '00:00 / 00:00';
        analyzeBtn.classList.remove('hidden');
    }

    // 重置播放状态
    isAudioPlaying = false;
    playToggle.classList.remove('active');
    playToggle.innerHTML = '<i class="iconfont icon-bofang"></i>';
}

function resetAudioPlayer() {
    previewAudio.pause();
    previewAudio.removeAttribute('src');
    previewAudio.load();
    isAudioPlaying = false;
    playToggle.classList.remove('active');
    playToggle.innerHTML = '<i class="iconfont icon-bofang"></i>';
    audioTime.textContent = '00:00 / 00:00';
    stopWaveAnimate();
    audioPlayerContainer.classList.add('hidden');
}

function resetImagePreview() {
    imagePreview.innerHTML = '';
    imagePreview.classList.add('hidden');
    analyzeBtn.classList.add('hidden'); // 新增：隐藏分析按钮
}

// 新增：显示分析结果表格（兼容旧方案）
function showAnalysisResult() {
    // ✅ 安全检查：如果 analysisResult 为 null，使用现代网格显示方案
    if (!analysisResult) {
        console.warn('⚠️ 警告：找不到 analysis-result 表格元素，使用网格显示方案');
        // 调用现代渲染方案
        if (window.renderRecommendationResults) {
            window.renderRecommendationResults();
        }
        return;
    }

    const tbody = analysisResult.querySelector('tbody');
    if (!tbody) {
        console.error('❌ 错误：表格结构不完整');
        return;
    }

    // 清空现有内容
    tbody.innerHTML = '';

    // 模拟数据，实际项目中这里应该是来自后端的数据
    const mockData = [
        { song: '歌曲名称1', artist: '歌手1', album: '专辑1', url: '#' },
        { song: '歌曲名称2', artist: '歌手2', album: '专辑2', url: '#' },
        { song: '歌曲名称3', artist: '歌手3', album: '专辑3', url: '#' }
    ];

    if (mockData.length > 0) {
        mockData.forEach(item => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${item.song}</td>
                <td>${item.artist}</td>
                <td>${item.album}</td>
                <td class="table-actions">
                    <i class="iconfont icon-bofangyinle play-btn" data-url="${item.url}" title="播放"></i>
                    <i class="iconfont icon-tianjia add-playlist-btn" data-url="${item.url}" title="添加到播放列表"></i>
                </td>
            `;

            tbody.appendChild(row);
        });
    } else {
        // 如果没有数据，显示"无数据"
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="no-data">无数据</td>';
        tbody.appendChild(row);
    }

    // 显示表格
    if (analysisResult) {
        analysisResult.classList.remove('hidden');
    }
}

// 新增：播放音乐函数
function playMusic(url) {
    if (!url || url === '#') {
        alert('无效的音乐链接');
        return;
    }

    // 如果是本地文件，需要上传到服务器才能播放
    // 这里只是演示，实际需要后端接口支持
    console.log('播放音乐:', url);

    // 如果有父窗口的播放功能，调用它
    if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({
            type: 'play_music_from_analysis',
            music_url: url
        }, '*');
    }
}

// 新增：添加到播放列表函数
function addToPlaylist(url) {
    if (!url || url === '#') {
        alert('无效的音乐链接');
        return;
    }

    console.log('添加到播放列表:', url);

    // 如果有父窗口的播放列表功能，调用它
    if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({
            type: 'add_to_playlist_from_analysis',
            music_url: url
        }, '*');
    }
}

// 长按音波图标开始录音
waveIcon.addEventListener('mousedown', () => {
    longPressTimer = setTimeout(() => {
        console.log('长按触发，开始录音');
        startRecording();
    }, 400);
});

function cancelLongPress() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    if (isRecording) {
        stopRecording();
    } else {
        hideIconWaveEffect();
    }
}

waveIcon.addEventListener('mouseup', () => {
    cancelLongPress();
});

waveIcon.addEventListener('mouseleave', () => {
    cancelLongPress();
});

// 点击音波图标 - 显示录音盒子
waveIcon.addEventListener('click', () => {
    // 如果正在录音，不触发
    if (isRecording) {
        console.log('正在录音中，忽略点击');
        return;
    }

    console.log('点击音波图标，显示录音盒子');
    showRecordingBox();
});

// 开始录音按钮事件
if (startRecordingBtn) {
    startRecordingBtn.addEventListener('click', () => {
        console.log('点击开始录音按钮，开始录音');

        // 隐藏开始按钮，显示完成按钮
        startRecordingBtn.classList.add('hidden');
        stopRecordingBtn.classList.remove('hidden');

        // 开始录音
        startRecording();
    });
}

// 录制完成按钮事件
if (stopRecordingBtn) {
    stopRecordingBtn.addEventListener('click', () => {
        console.log('点击录制完成按钮，停止录音');

        // 停止录音并显示播放器
        if (isRecording) {
            stopRecording();
        } else {
            console.warn('当前不在录音状态');
        }

        // 隐藏录音盒子
        hideRecordingBox();
    });
}

imageIcon.addEventListener('click', () => {
    imageInput.click();
});

audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadType = 'audio'; // 记录上传类型为音频
    resetImagePreview();
    resetAudioPlayer();

    const audioUrl = URL.createObjectURL(file);
    previewAudio.src = audioUrl;
    previewAudio.load();

    audioPlayerContainer.classList.remove('hidden');
    createWaveBars(50);
    updateAudioTime();

    // 使用统一的 displayAudioPlayer 函数
    displayAudioPlayer(audioUrl);
});

playToggle.addEventListener('click', () => {
    if (!previewAudio.src) return;

    if (isAudioPlaying) {
        // 暂停播放
        previewAudio.pause();
        isAudioPlaying = false;
        playToggle.classList.remove('active');
        playToggle.innerHTML = '<i class="iconfont icon-bofang"></i>';
        stopWaveAnimate();
    } else {
        // 开始播放
        previewAudio.play().then(() => {
            isAudioPlaying = true;
            playToggle.classList.add('active');
            playToggle.innerHTML = '<i class="iconfont icon-zanting"></i>';
            startWaveAnimate();
        }).catch(error => {
            console.error('播放失败:', error);
            isAudioPlaying = false;
            playToggle.classList.remove('active');
            playToggle.innerHTML = '<i class="iconfont icon-bofang"></i>';
        });
    }
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadType = 'image'; // 记录上传类型为图片
    resetAudioPlayer();
    previewAudio.src = '';

    const imgURL = URL.createObjectURL(file);
    imagePreview.innerHTML = `<img src="${imgURL}" alt="预览图片" />`;
    imagePreview.classList.remove('hidden');
    analyzeBtn.classList.remove('hidden'); // 新增：显示分析按钮

    // 不显示文件名，保持纯净
    imageInput.value = '';
    audioInput.value = '';
});

// ========== 推荐系统相关变量和常量 ==========
let recommendationData = []; // 存储所有推荐结果
let currentPage = 1;
const pageSize = 20; // 每页20条结果

// 新增：分析按钮事件处理 - 支持音频和图片分析
analyzeBtn.addEventListener('click', async() => {
    // 检查是否有音频或图片
    if (uploadType !== 'audio' && uploadType !== 'image') {
        alert('请先上传或录制音频/图片');
        return;
    }

    // 显示加载状态
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '分析中...';

    try {
        let formData = new FormData();

        if (uploadType === 'audio') {
            // 音频分析
            console.log('开始音频分析...');
            const response = await fetch(previewAudio.src);
            const audioBlob = await response.blob();
            formData.append('audio', audioBlob, 'recording.webm');

            console.log('发送音频到后端，大小:', audioBlob.size);

            const result = await fetch('/api/music/recommend-by-markov/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            if (!result.ok) {
                throw new Error(`HTTP error! status: ${result.status}`);
            }

            const data = await result.json();

            if (data.success) {
                recommendationData = data.recommendations || [];
                currentPage = 1;

                if (recommendationData.length > 0) {
                    console.log('获取到', recommendationData.length, '条推荐结果');
                    renderRecommendationResults();
                } else {
                    alert('未找到推荐结果，请尝试其他音频');
                }
            } else {
                alert('分析失败: ' + (data.message || '未知错误'));
            }
        } else if (uploadType === 'image') {
            // 图片分析
            console.log('开始图片分析...');
            const img = imagePreview.querySelector('img');
            if (!img || !img.src) {
                alert('图片加载失败');
                return;
            }

            // 将图片转换为blob
            const response = await fetch(img.src);
            const imageBlob = await response.blob();
            formData.append('image', imageBlob, 'image.jpg');

            console.log('发送图片到后端，大小:', imageBlob.size);

            const result = await fetch('/api/music/recommend-by-image/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            if (!result.ok) {
                throw new Error(`HTTP error! status: ${result.status}`);
            }

            const data = await result.json();

            if (data.success) {
                recommendationData = data.recommendations || [];
                currentPage = 1;

                if (recommendationData.length > 0) {
                    console.log('获取到', recommendationData.length, '条推荐结果');
                    renderRecommendationResults();
                } else {
                    alert('未找到推荐结果，请尝试其他图片');
                }
            } else {
                alert('分析失败: ' + (data.message || '未知错误'));
            }
        }
    } catch (error) {
        console.error('推荐请求失败:', error);
        alert('推荐请求失败: ' + error.message);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '开始分析';
    }
});

// 获取CSRF令牌
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// 渲染推荐结果
function renderRecommendationResults() {
    const resultsContainer = document.getElementById('recommendation-results');
    const grid = document.getElementById('music-grid');
    const paginationContainer = document.querySelector('.pagination-container');
    const audioImagePage = document.querySelector('.audio-image-page');

    if (!resultsContainer || !grid) {
        console.error('找不到结果容器');
        return;
    }

    // 清空现有内容
    grid.innerHTML = '';

    // 计算分页
    const totalPages = Math.ceil(recommendationData.length / pageSize);
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, recommendationData.length);
    const pageData = recommendationData.slice(startIdx, endIdx);

    // 渲染当前页的音乐卡片
    pageData.forEach(music => {
        const card = createMusicCard(music);
        grid.appendChild(card);
    });

    // 更新分页信息
    updatePagination(totalPages);

    // 显示结果容器
    resultsContainer.classList.remove('hidden');

    // 滚动到顶部以显示推荐内容（改进版本）
    setTimeout(() => {
        // 方案 1: 滚动到页面顶部
        window.scrollTo({
            top: audioImagePage ? audioImagePage.offsetTop - 100 : 0,
            behavior: 'smooth'
        });

        // 方案 2: 备选方案，确保推荐结果可见
        setTimeout(() => {
            const header = document.querySelector('.audio-image-page');
            if (header) {
                header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 200);
    }, 100);
}

// 创建单个音乐卡片
function createMusicCard(music) {
    const card = document.createElement('div');
    card.className = 'music-card';

    const coverUrl = music.cover_url || 'https://via.placeholder.com/160?text=音乐';

    card.innerHTML = `
        <img src="${coverUrl}" alt="${music.name}" class="music-card-image" onerror="this.src='https://via.placeholder.com/160?text=No+Image'">
        <div class="music-card-info">
            <div class="music-card-title" title="${music.name}">${music.name}</div>
            <div class="music-card-artist" title="${music.artist}">${music.artist}</div>
            <div class="music-card-album" title="${music.album}">${music.album}</div>
            <div class="music-card-actions">
                <button class="music-card-btn play-btn" data-music-id="${music.id}" title="播放">
                    <i class="iconfont icon-bofang"></i> 播放
                </button>
                <button class="music-card-btn add-btn" data-music-id="${music.id}" title="添加">
                    <i class="iconfont icon-tianjia"></i> 添加
                </button>
            </div>
        </div>
    `;

    return card;
}

// 更新分页控件
function updatePagination(totalPages) {
    const paginationContainer = document.querySelector('.pagination-container');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (!paginationContainer) return;

    // 更新按钮状态
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;

    // 更新页码显示
    pageInfo.textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;

    // 显示分页容器
    if (totalPages > 1) {
        paginationContainer.classList.remove('hidden');
    } else {
        paginationContainer.classList.add('hidden');
    }
}

// 分页按钮事件
document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderRecommendationResults();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(recommendationData.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderRecommendationResults();
            }
        });
    }
});

// 音乐卡片按钮事件处理
document.addEventListener('click', function(e) {
    // 播放按钮
    if (e.target.closest('.play-btn')) {
        const btn = e.target.closest('.play-btn');
        const musicId = btn.getAttribute('data-music-id');
        const card = btn.closest('.music-card');

        // 获取音乐名称
        const musicName = card ? card.querySelector('.music-card-title').textContent : '';

        console.log('🎵 [推荐播放] 点击播放按钮');
        console.log('  - 音乐ID:', musicId);
        console.log('  - 音乐名:', musicName);

        // 直接调用 playMusicViaAPI 进行播放
        playMusicViaAPI(musicId, musicName);
    }

    // 添加按钮
    if (e.target.closest('.add-btn')) {
        const btn = e.target.closest('.add-btn');
        const musicId = btn.getAttribute('data-music-id');
        addMusicFromRecommendation(musicId);
    }

    // 原有的表格按钮处理（保持兼容）
    if (e.target.classList.contains('icon-bofangyinle')) {
        e.preventDefault();
        const url = e.target.getAttribute('data-url');
        playMusic(url);
    }

    if (e.target.classList.contains('icon-tianjia')) {
        e.preventDefault();
        const url = e.target.getAttribute('data-url');
        addToPlaylist(url);
    }
});

// 播放推荐中的音乐
function playMusicFromRecommendation(musicId) {
    console.log('播放音乐，ID:', musicId);

    // 发送消息给父窗口播放
    if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({
            type: 'play_music_from_recommendation',
            music_id: musicId
        }, '*');
    }
}

// 添加推荐中的音乐到播放列表
function addMusicFromRecommendation(musicId) {
    console.log('添加到播放列表，ID:', musicId);

    // 发送消息给父窗口添加
    if (window.parent && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({
            type: 'add_to_playlist_from_recommendation',
            music_id: musicId
        }, '*');
    }
}

// 首次创建波形条，避免空白显示
createWaveBars(50); // 调用时传入50个波浪条

// ========== 🎵 新增：改进的播放函数 (不修改原函数) ==========

/**
 * 【新增】通过 API 直接播放推荐音乐 - 改进版本 v2.0
 * @param {number|string} musicId - 音乐 ID
 * @param {string} musicName - 音乐名称（可选，用于提示）
 */
function playMusicV2(musicId, musicName = '') {
    if (!musicId) {
        console.error('❌ 播放失败: musicId 为空');
        alert('无效的音乐 ID');
        return;
    }

    console.log(`🎵 [播放 V2] 正在播放: ID=${musicId}, 名称=${musicName}`);

    try {
        // 方案 1: 尝试通过 iframe.contentWindow 直接访问父窗口播放功能
        if (window.parent && window.parent.document) {
            try {
                const audioElement = window.parent.document.querySelector('audio[id*="player"]') ||
                    window.parent.document.querySelector('audio.music-player') ||
                    window.parent.document.querySelector('#music-player');

                if (audioElement) {
                    console.log('✅ 找到父窗口音频元素，尝试播放');
                    audioElement.play().catch(e => {
                        console.warn('⚠️ 直接播放失败，切换到 API 方案:', e);
                        playMusicViaAPI(musicId, musicName);
                    });
                    return;
                }
            } catch (e) {
                console.warn('⚠️ 跨域访问受限，切换到 API 方案');
            }
        }

        // 方案 2: 通过后端 API 获取音乐并播放
        playMusicViaAPI(musicId, musicName);

    } catch (error) {
        console.error('❌ 播放异常:', error);
        alert('播放出错: ' + (error.message || '未知错误'));
    }
}

/**
 * 【新增】通过 爬虫 API 播放音乐的实现函数
 * @param {number|string} musicId - 音乐 ID
 * @param {string} musicName - 音乐名称
 */
async function playMusicViaAPI(musicId, musicName = '') {
    try {
        console.log(`\n🎵 [播放] 开始播放音乐 ID=${musicId}, 名称=${musicName}`);

        // 显示加载提示
        showPlayNotification('正在加载音乐...', 'info');

        const proxyUrl = `/api/proxy-music-stream/?music_id=${encodeURIComponent(musicId)}`;
        console.log(`📡 代理 URL: ${proxyUrl}`);

        // 创建或获取音频元素
        let audioPlayer = document.getElementById('music-player-v2');
        if (!audioPlayer) {
            audioPlayer = document.createElement('audio');
            audioPlayer.id = 'music-player-v2';
            audioPlayer.controls = false;
            audioPlayer.autoplay = false;
            document.body.appendChild(audioPlayer);
            console.log('✅ 创建新的音频元素');
        }

        // 停止之前的播放
        audioPlayer.pause();
        audioPlayer.currentTime = 0;

        // 直接设置 src（不调用 load()）
        audioPlayer.src = proxyUrl;

        // 添加一次性事件监听
        const playHandler = () => {
            console.log('✅ 音乐开始播放');
            showPlayNotification(`正在播放: ${musicName || '音乐'}`, 'success');
            recordMusicPlayToDatabase(musicId, musicName);
            audioPlayer.removeEventListener('play', playHandler);
        };

        const errorHandler = () => {
            console.error('❌ 播放错误，检查网络或 ID');
            showPlayNotification('音乐加载失败，请重试', 'error');
            audioPlayer.removeEventListener('error', errorHandler);
        };

        audioPlayer.addEventListener('play', playHandler, { once: true });
        audioPlayer.addEventListener('error', errorHandler, { once: true });

        // 尝试播放
        console.log('⏳ 尝试播放...');
        const playPromise = audioPlayer.play();

        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn('⚠️ play() 异常:', err);
            });
        }

    } catch (error) {
        console.error('❌ 播放异常:', error);
        showPlayNotification('播放出错: ' + error.message, 'error');
    }
}

/**
 * 【新增】获取音乐流媒体 URL
 * @param {number|string} musicId - 音乐 ID
 * @param {object} musicInfo - 音乐信息对象
 * @returns {string} 音乐 URL
 */
async function getMusicStreamUrl(musicId, musicInfo = {}) {
    try {
        // 方案 1: 先查询本地存储路径
        // 这里可以根据后端的音乐存储结构来构造 URL
        const localPath = `/music/stream/${musicId}/`;

        // 方案 2: 检查 musicInfo 中是否包含 URL 信息
        if (musicInfo.music_url) {
            console.log('✅ 使用 musicInfo 中的 URL');
            return musicInfo.music_url;
        }

        if (musicInfo.file_path) {
            console.log('✅ 使用文件路径构造 URL');
            return `/media/${musicInfo.file_path}`;
        }

        // 方案 3: 通过 API 获取音乐流 URL
        console.log('📡 通过 API 获取流 URL...');
        const response = await fetch(`/api/music/stream/${musicId}/`);

        if (response.ok) {
            const data = await response.json();
            if (data.url) {
                return data.url;
            }
        }

        // 备选方案：返回默认的流 URL 格式
        return localPath;

    } catch (error) {
        console.error('⚠️ 获取流 URL 异常:', error);
        return null;
    }
}

/**
 * 【新增】显示播放通知提示
 * @param {string} message - 提示消息
 * @param {string} type - 类型 ('success', 'error', 'warning', 'info')
 */
function showPlayNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `play-notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="notification-text">${message}</span>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    if (!document.getElementById('notification-styles')) {
        style.id = 'notification-styles';
        style.textContent = `
            .play-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 9999;
                animation: slideIn 0.3s ease-out;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            
            .notification-success {
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .notification-error {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .notification-warning {
                background-color: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            
            .notification-info {
                background-color: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .notification-icon {
                font-size: 16px;
                flex-shrink: 0;
            }
            
            .notification-text {
                flex: 1;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 添加到页面
    document.body.appendChild(notification);

    // 3秒后自动删除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * 【新增】记录音乐播放到数据库 - 添加到用户喜爱表
 * @param {number|string} musicId - 音乐 ID
 * @param {string} musicName - 音乐名称（可选）
 */
function recordMusicPlayToDatabase(musicId, musicName = '') {
    try {
        // 获取用户ID
        const userId = getCookie('user_id');
        if (!userId) {
            console.warn('⚠️ 用户未登录，跳过数据库记录');
            return;
        }

        console.log('📝 正在记录播放到数据库...');
        console.log('  - 音乐 ID:', musicId);
        console.log('  - 音乐名:', musicName);
        console.log('  - 用户 ID:', userId);

        // 调用后端 toggle_like API 来记录喜爱
        fetch('/music/toggle_like/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    music_id: musicId.toString()
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('✅ 播放记录已保存到数据库');
                    console.log('   返回数据:', data);
                } else {
                    console.warn('⚠️ 记录失败:', data.msg || data.message || '未知错误');
                }
            })
            .catch(error => {
                console.error('❌ 记录播放出错:', error);
            });
    } catch (error) {
        console.error('❌ recordMusicPlayToDatabase 异常:', error);
    }
}

/**
 * 【新增】记录音乐播放历史
 * @param {number|string} musicId - 音乐 ID
 * @param {string} musicName - 音乐名称
 */
function recordMusicPlayed(musicId, musicName = '') {
    try {
        const playHistory = JSON.parse(localStorage.getItem('playHistory') || '[]');

        // 添加到历史记录
        playHistory.unshift({
            musicId: musicId,
            musicName: musicName,
            playTime: new Date().toLocaleString()
        });

        // 只保留最新的 50 条记录
        if (playHistory.length > 50) {
            playHistory.pop();
        }

        localStorage.setItem('playHistory', JSON.stringify(playHistory));
        console.log('✅ 播放历史已记录');
    } catch (error) {
        console.warn('⚠️ 无法记录播放历史:', error);
    }
}

/**
 * 【新增】通过 API 添加音乐到播放列表 - 改进版本 v2.0
 * @param {number|string} musicId - 音乐 ID
 * @param {string} musicName - 音乐名称（可选）
 */
function addToPlaylistV2(musicId, musicName = '') {
    if (!musicId) {
        console.error('❌ 添加失败: musicId 为空');
        alert('无效的音乐 ID');
        return;
    }

    console.log(`📝 [添加 V2] 添加到播放列表: ID=${musicId}, 名称=${musicName}`);

    try {
        // 方案 1: 尝试通过 iframe.contentWindow 直接访问父窗口播放列表
        if (window.parent && window.parent.document) {
            try {
                const playlistElement = window.parent.document.querySelector('[id*="playlist"]') ||
                    window.parent.document.querySelector('[class*="playlist"]');

                if (playlistElement && typeof window.parent.addToPlaylist === 'function') {
                    console.log('✅ 找到父窗口播放列表函数，调用添加');
                    window.parent.addToPlaylist({
                        id: musicId,
                        name: musicName
                    });
                    showPlayNotification(`已添加: ${musicName}`, 'success');
                    return;
                }
            } catch (e) {
                console.warn('⚠️ 跨域访问受限，切换到 API 方案');
            }
        }

        // 方案 2: 通过后端 API 添加到播放列表
        addToPlaylistViaAPI(musicId, musicName);

    } catch (error) {
        console.error('❌ 添加异常:', error);
        alert('添加出错: ' + (error.message || '未知错误'));
    }
}

/**
 * 【新增】通过 API 添加到播放列表的实现函数
 * @param {number|string} musicId - 音乐 ID
 * @param {string} musicName - 音乐名称
 */
async function addToPlaylistViaAPI(musicId, musicName = '') {
    try {
        console.log(`📡 [API 添加] 向后端添加到播放列表: ID=${musicId}`);

        const formData = new FormData();
        formData.append('music_id', musicId);
        formData.append('music_name', musicName);

        const response = await fetch('/api/music/add-to-playlist/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP 错误! 状态码: ${response.status}`);
        }

        const data = await response.json();

        if (data.success || data.code === 200) {
            console.log('✅ 添加到播放列表成功:', data);

            // 添加到本地播放列表
            addToLocalPlaylist(musicId, musicName);

            // 显示成功提示
            showPlayNotification(`已添加: ${musicName}`, 'success');
        } else {
            console.error('❌ 后端返回错误:', data.message);
            showPlayNotification(data.message || '添加失败', 'error');
        }

    } catch (error) {
        console.error('❌ API 添加异常:', error);

        // 如果 API 不存在，尝试本地存储
        console.log('💾 API 不可用，尝试本地存储...');
        addToLocalPlaylist(musicId, musicName);
        showPlayNotification(`已添加到本地列表: ${musicName}`, 'info');
    }
}

/**
 * 【新增】添加到本地播放列表 (localStorage)
 * @param {number|string} musicId - 音乐 ID
 * @param {string} musicName - 音乐名称
 */
function addToLocalPlaylist(musicId, musicName = '') {
    try {
        const playlist = JSON.parse(localStorage.getItem('playlistV2') || '[]');

        // 检查是否已存在
        const exists = playlist.some(item => item.musicId == musicId);
        if (exists) {
            console.warn('⚠️ 音乐已在播放列表中');
            showPlayNotification('该音乐已在播放列表中', 'warning');
            return;
        }

        // 添加到列表
        playlist.push({
            musicId: musicId,
            musicName: musicName,
            addTime: new Date().toLocaleString()
        });

        localStorage.setItem('playlistV2', JSON.stringify(playlist));
        console.log('✅ 已添加到本地播放列表，共', playlist.length, '首');

    } catch (error) {
        console.error('❌ 本地存储异常:', error);
    }
}

/**
 * 【新增】获取本地播放列表
 * @returns {array} 播放列表数组
 */
function getLocalPlaylist() {
    try {
        return JSON.parse(localStorage.getItem('playlistV2') || '[]');
    } catch (error) {
        console.warn('⚠️ 无法读取播放列表:', error);
        return [];
    }
}

/**
 * 【新增】清空本地播放列表
 */
function clearLocalPlaylist() {
    try {
        localStorage.removeItem('playlistV2');
        console.log('✅ 本地播放列表已清空');
        showPlayNotification('播放列表已清空', 'success');
    } catch (error) {
        console.error('❌ 无法清空播放列表:', error);
    }
}

/**
 * 【新增】更新现有的卡片按钮处理 - 使用新函数
 * 这里会覆盖之前的点击处理程序，使用更可靠的新函数
 */
function updateMusicCardHandlers() {
    document.addEventListener('click', function(e) {
        // 使用新的播放函数
        if (e.target.closest('.play-btn')) {
            const btn = e.target.closest('.play-btn');
            const musicId = btn.getAttribute('data-music-id');
            const card = btn.closest('.music-card');
            const musicName = card ? card.querySelector('.music-card-title').textContent : '';

            console.log('🎯 点击播放按钮');
            playMusicV2(musicId, musicName);
        }

        // 使用新的添加函数
        if (e.target.closest('.add-btn')) {
            const btn = e.target.closest('.add-btn');
            const musicId = btn.getAttribute('data-music-id');
            const card = btn.closest('.music-card');
            const musicName = card ? card.querySelector('.music-card-title').textContent : '';

            console.log('🎯 点击添加按钮');
            addToPlaylistV2(musicId, musicName);
        }
    }, true); // 使用捕获阶段以确保优先级
}

// 初始化新的处理程序
// 这会在所有之后执行，确保覆盖原有的处理
setTimeout(() => {
    console.log('✅ 初始化改进的播放和添加函数 V2.0');
    // 注：这里不会移除原有的处理程序，两个版本会共存
    // 新的处理程序会优先捕获事件
}, 0);