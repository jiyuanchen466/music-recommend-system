// music_community.js - 音乐社区页面交互逻辑

function notifyParentOfHeightChange() {
    const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.documentElement.clientHeight
    );
    parent.postMessage({ type: 'updateHeight', height: height, page: 'music_community' }, '*');
    console.log('📤 通知父页面高度变化:', height);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 音乐社区页面加载完成');
    try {
        initEditor();
        console.log('✅ initEditor完成');
    } catch (e) {
        console.error('❌ initEditor错误:', e);
    }

    try {
        bindEvents();
        console.log('✅ bindEvents完成');
    } catch (e) {
        console.error('❌ bindEvents错误:', e);
    }

    try {
        initRecordingWave();
        console.log('✅ initRecordingWave完成');
    } catch (e) {
        console.error('❌ initRecordingWave错误:', e);
    }

    // ★ 初始化后通知父页面
    setTimeout(notifyParentOfHeightChange, 100);
    setTimeout(notifyParentOfHeightChange, 500);
    setTimeout(notifyParentOfHeightChange, 1000);

    // ★ 监控DOM变化，自动通知父页面
    const observer = new MutationObserver(() => {
        notifyParentOfHeightChange();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: false
    });
});

let defaultFontSize = 14; // 默认字体大小
let nextFontSize = 14; // ★ 下次输入的字体大小
let currentTextColor = '#333333'; // 默认字体颜色
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let savedRange = null; // 用于保存选区，以便工具栏操作后恢复

function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        savedRange = sel.getRangeAt(0).cloneRange();
    }
}

function restoreSelection() {
    const editor = document.getElementById('contentEditor');
    if (!editor) return;

    editor.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    if (savedRange) {
        sel.addRange(savedRange);
    }
}

function initEditor() {
    const editor = document.getElementById('contentEditor');
    if (editor) {
        editor.innerHTML = '';
        updateCharCount();
    }
}

function getCurrentFontSize() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return defaultFontSize;

    const range = selection.getRangeAt(0);
    let node = range.startContainer;

    // 如果是文本节点，获取其父元素
    if (node.nodeType === 3) {
        node = node.parentNode;
    }

    // 向上查找，找到有 fontSize 样式的元素
    while (node && node !== document) {
        if (node.nodeType === 1) {
            const fontSize = window.getComputedStyle(node).fontSize;
            if (fontSize && fontSize !== '0px') {
                return parseInt(fontSize);
            }
        }
        node = node.parentNode;
    }

    return defaultFontSize;
}

function getCurrentTextColor() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return '#333333';

    const range = selection.getRangeAt(0);
    let node = range.startContainer;

    // 如果是文本节点，获取其父元素
    if (node.nodeType === 3) {
        node = node.parentNode;
    }

    // 向上查找，找到有 color 样式的元素
    while (node && node !== document) {
        if (node.nodeType === 1) {
            const color = window.getComputedStyle(node).color;
            if (color && color !== 'rgba(0, 0, 0, 0)') {
                // 将 rgb 转换为 hex
                return rgbToHex(color);
            }
        }
        node = node.parentNode;
    }

    return '#333333';
}

function rgbToHex(rgb) {
    const match = rgb.match(/\d+/g);
    if (!match) return '#333333';

    const r = parseInt(match[0]);
    const g = parseInt(match[1]);
    const b = parseInt(match[2]);

    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function updateFontSizeHints() {
    // ★ 使用 nextFontSize 显示下次输入的字体大小
    const fontSizeUpHint = document.getElementById('fontSizeUpHint');
    const fontSizeDownHint = document.getElementById('fontSizeDownHint');
    const textColorHint = document.getElementById('textColorHint');

    if (fontSizeUpHint) {
        fontSizeUpHint.textContent = nextFontSize;
    }
    if (fontSizeDownHint) {
        fontSizeDownHint.textContent = nextFontSize;
    }
    if (textColorHint) {
        textColorHint.textContent = currentTextColor;
    }
}

function initRecordingWave() {
    const waveContainer = document.getElementById('recordingWave');
    if (waveContainer) {
        // 生成 20 个波浪条
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'recording-bar';
            bar.style.animationDelay = (i * 0.05) + 's';
            waveContainer.appendChild(bar);
        }
    }
}

function bindEvents() {
    try {
        console.log('🔗 bindEvents 开始');

        // 工具栏图标点击事件
        const icons = document.querySelectorAll('.toolbar-icons .iconfont');
        console.log('🔍 找到工具栏图标数量:', icons.length);

        icons.forEach((icon, index) => {
            icon.addEventListener('click', function(e) {
                handleIconClick(e);
            });
            icon.addEventListener('mouseenter', function() {
                updateFontSizeHints();
            });
        });

        // 字体颜色选项点击
        const colors = document.querySelectorAll('.color-option');
        colors.forEach(option => {
            option.addEventListener('click', function() {
                const color = this.dataset.color;
                applyTextColor(color);

                // 更新选中状态
                colors.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');

                // ★ 更新颜色图标的颜色
                const textColorIcon = document.querySelector('[data-action="textColor"]');
                if (textColorIcon) {
                    textColorIcon.style.color = color;

                    // 更新颜色提示文本
                    const colorHint = document.getElementById('textColorHint');
                    if (colorHint) {
                        colorHint.textContent = color;
                    }
                }

                // ★ 更新提示信息
                updateFontSizeHints();
            });
        });

        // 输入框内容变化和光标移动
        const editor = document.getElementById('contentEditor');
        if (editor) {
            editor.addEventListener('input', function() {
                updateCharCount();

                // ★ 在输入时应用保存的颜色和字体大小
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const startNode = range.startContainer;
                    const parent = startNode.nodeType === 3 ? startNode.parentNode : startNode;

                    // 检查是否需要应用样式
                    let needStyle = false;
                    if (currentTextColor && currentTextColor !== '#333333') {
                        const currentColor = window.getComputedStyle(parent).color;
                        // 检查父元素是否已有该颜色
                        if (!parent.style.color || parent.style.color !== currentTextColor) {
                            needStyle = true;
                        }
                    }

                    // 如果需要应用样式，使用 execCommand
                    if (needStyle) {
                        document.execCommand('foreColor', false, currentTextColor);
                    }
                }
            });

            editor.addEventListener('keyup', () => {
                updateCharCount();
                updateFontSizeHints();
                saveSelection();
            });
            editor.addEventListener('mouseup', () => {
                updateFontSizeHints();
                saveSelection();
            });
            editor.addEventListener('click', () => {
                updateFontSizeHints();
                saveSelection();
            });
            editor.addEventListener('blur', saveSelection);
        }

        // 发布按钮
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', handlePublish);
        }

        // 录音控制按钮
        const stopRecordBtn = document.getElementById('stopRecordBtn');
        const finishRecordBtn = document.getElementById('finishRecordBtn');

        if (stopRecordBtn) {
            stopRecordBtn.addEventListener('click', stopRecording);
        }

        if (finishRecordBtn) {
            finishRecordBtn.addEventListener('click', finishRecording);
        }

        // 点击其他地方关闭弹出框
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.toolbar-section')) {
                hideAllPopups();
            }
        });

        // ★ 音乐选择弹出框事件监听
        const musicSelectionModal = document.getElementById('musicSelectionModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');
        const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');

        if (modalOverlay) {
            modalOverlay.addEventListener('click', closeMusicSelectionModal);
        }

        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeMusicSelectionModal);
        }

        if (cancelSelectionBtn) {
            modalOverlay.addEventListener('click', closeMusicSelectionModal);
        }

        if (confirmSelectionBtn) {
            confirmSelectionBtn.addEventListener('click', function() {
                // 此按钮可选，用户可以通过每个音乐项的确定按钮或弹出框关闭来完成操作
                closeMusicSelectionModal();
            });
        }

        // 阻止弹出框内的点击事件冒泡
        if (musicSelectionModal) {
            const modalContent = musicSelectionModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }
        }

        // ★ 图片上传区事件
        const imageUploadArea = document.getElementById('imageUploadArea');
        if (imageUploadArea) {
            console.log('📸 绑定图片上传区事件');
            // 点击打开文件选择
            imageUploadArea.addEventListener('click', function() {
                insertImage();
            });

            // 拖拽上传
            imageUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                imageUploadArea.style.borderColor = '#667eea';
                imageUploadArea.style.background = '#e6f7ff';
            });

            imageUploadArea.addEventListener('dragleave', () => {
                imageUploadArea.style.borderColor = '#ddd';
                imageUploadArea.style.background = '#fafafa';
            });

            imageUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                imageUploadArea.style.borderColor = '#ddd';
                imageUploadArea.style.background = '#fafafa';

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const file = files[0];
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            displayUploadedImage(event.target.result);
                            window.uploadedImageBase64 = event.target.result;
                        };
                        reader.readAsDataURL(file);
                    }
                }
            });
        }

        // ★ 音频上传区事件
        const audioUploadArea = document.getElementById('audioUploadArea');
        if (audioUploadArea) {
            console.log('🎵 绑定音频上传区事件');
            // 点击打开文件选择
            audioUploadArea.addEventListener('click', function() {
                insertAudio();
            });

            // 拖拽上传
            audioUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                audioUploadArea.style.borderColor = '#667eea';
                audioUploadArea.style.background = '#e6f7ff';
            });

            audioUploadArea.addEventListener('dragleave', () => {
                audioUploadArea.style.borderColor = '#ddd';
                audioUploadArea.style.background = '#fafafa';
            });

            audioUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                audioUploadArea.style.borderColor = '#ddd';
                audioUploadArea.style.background = '#fafafa';

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const file = files[0];
                    if (file.type.startsWith('audio/')) {
                        displayUploadedAudio(file);
                        window.uploadedAudioFile = file;
                        window.uploadedAudioUrl = URL.createObjectURL(file);
                    }
                }
            });
        }

        // ★ 已上传的图片点击切换
        const uploadedImage = document.getElementById('uploadedImage');
        if (uploadedImage) {
            uploadedImage.addEventListener('click', function() {
                insertImage();
            });
        }

        // ★ 已上传的音频点击切换
        const uploadedAudio = document.getElementById('uploadedAudio');
        if (uploadedAudio) {
            uploadedAudio.addEventListener('click', function() {
                insertAudio();
            });
        }

        console.log('✅ bindEvents完成');
    } catch (e) {
        console.error('❌ bindEvents 错误:', e, e.stack);
    }
}

function handleIconClick(e) {
    // 先恢复用户选区，避免点击工具栏后选区丢失
    restoreSelection();

    const action = e.target.dataset.action;

    switch (action) {
        case 'fontSizeUp':
            increaseFontSize();
            break;
        case 'fontSizeDown':
            decreaseFontSize();
            break;
        case 'textColor':
            toggleColorPicker();
            break;
        case 'insertImage':
            insertImage();
            break;
        case 'insertAudio':
            insertAudio();
            break;
        case 'record':
            startRecording();
            break;
        case 'location':
            getLocation();
            break;
    }
}

function increaseFontSize() {
    // ★ 使用 nextFontSize 跟踪下次输入的字体大小
    if (nextFontSize < 30) {
        nextFontSize += 2;
        applyFontSizeToSelection(nextFontSize);
        updateFontSizeHints();
    }
}

function decreaseFontSize() {
    // ★ 使用 nextFontSize 跟踪下次输入的字体大小
    if (nextFontSize > 12) {
        nextFontSize -= 2;
        applyFontSizeToSelection(nextFontSize);
        updateFontSizeHints();
    }
}

function applyFontSizeToSelection(size) {
    const editor = document.getElementById('contentEditor');
    const selection = window.getSelection();

    if (selection.rangeCount === 0 && savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }

    if (selection.rangeCount === 0) {
        // ★ 无选中时创建字体大小标记，影响后续输入
        if (editor) {
            const span = document.createElement('span');
            span.style.fontSize = size + 'px';
            span.style.color = currentTextColor;
            span.innerHTML = '​'; // 零宽空格
            editor.appendChild(span);

            // 将光标放在 span 后面
            const range = document.createRange();
            range.setStartAfter(span);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            savedRange = range.cloneRange();
        }
        return;
    }

    const range = selection.getRangeAt(0);

    if (!range.collapsed) {
        try {
            const span = document.createElement('span');
            span.style.fontSize = size + 'px';
            span.style.color = currentTextColor;
            range.surroundContents(span);
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            newRange.collapse(false);
            selection.addRange(newRange);
            savedRange = selection.getRangeAt(0).cloneRange();
        } catch (e) {
            // 如果 surroundContents 失败，使用 execCommand
            document.execCommand('fontSize', false, '7');
            const fontElements = document.querySelectorAll('font[size="7"]');
            fontElements.forEach(font => {
                font.removeAttribute('size');
                font.style.fontSize = size + 'px';
                font.style.color = currentTextColor;
            });
        }
    } else {
        // 无选区时影响输入点和后续文字
        const span = document.createElement('span');
        span.style.fontSize = size + 'px';
        span.style.color = currentTextColor;
        span.textContent = '\u200B'; // 零宽空格
        range.insertNode(span);
        range.setStartAfter(span);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRange = range.cloneRange();
    }
}

// ★ 应用字体颜色到选中文本
function applyTextColor(color) {
    const editor = document.getElementById('contentEditor');
    const selection = window.getSelection();

    // ★ 记录当前颜色
    currentTextColor = color;

    if (selection.rangeCount === 0 && savedRange) {
        selection.removeAllRanges();
        selection.addRange(savedRange);
    }

    // 如果没有选区
    if (selection.rangeCount === 0) {
        // 先在光标处插入一个零宽空格，设置其颜色
        if (editor) {
            editor.focus();
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);

            // ★ 使用 execCommand 设置后续输入的颜色
            // 这样能确保新输入的文字有该颜色
            document.execCommand('foreColor', false, color);
        }
        return;
    }

    // 有选区时处理
    const range = selection.getRangeAt(0);

    if (!range.collapsed) {
        // ★ 先尝试用 execCommand 改变颜色
        const success = document.execCommand('foreColor', false, color);

        if (success) {
            // 保存选区供后续使用
            savedRange = selection.getRangeAt(0).cloneRange();
        } else {
            // 如果 execCommand 失败，用手动方式
            try {
                const span = document.createElement('span');
                span.style.color = color;
                range.surroundContents(span);
                savedRange = selection.getRangeAt(0).cloneRange();
            } catch (e) {
                // 最后的备选方案
                range.deleteContents();
                const span = document.createElement('span');
                span.style.color = color;
                span.textContent = '';
                range.insertNode(span);

                const newRange = document.createRange();
                newRange.setStartAfter(span);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                savedRange = newRange.cloneRange();
            }
        }
    } else {
        // 无选区但有光标时在光标处创建颜色标记
        const span = document.createElement('span');
        span.style.color = color;
        span.style.fontSize = nextFontSize + 'px';
        span.innerHTML = '​'; // 零宽空格
        range.insertNode(span);
        range.setStartAfter(span);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        savedRange = range.cloneRange();
    }

    updateFontSizeHints();
}

// ★ 切换颜色选择器
function toggleColorPicker() {
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.classList.toggle('show');
    }
}

// ★ 隐藏所有弹出框
function hideAllPopups() {
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.classList.remove('show');
    }
}

// ★ 插入图片
function insertImage() {
    console.log('📸 insertImage 被调用');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = function(e) {
        const files = e.target.files;

        // 检查是否有文件被选中
        if (!files || files.length === 0) {
            console.log('📸 没有选择图片文件');
            return;
        }

        const file = files[0];
        console.log('📸 选择的文件:', file);

        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                console.log('📸 图片转换为Base64完成');
                // 显示在固定的图片上传区
                displayUploadedImage(event.target.result);
                // 也保存为Base64数据用于提交
                window.uploadedImageBase64 = event.target.result;
            };
            reader.onerror = function(error) {
                console.error('❌ 图片读取失败:', error);
            };
            reader.readAsDataURL(file);
        }
    };

    input.click();
}

// ★ 显示上传的图片
function displayUploadedImage(imageBase64) {
    const uploadArea = document.getElementById('imageUploadArea');
    const uploadedImg = document.getElementById('uploadedImage');
    const placeholder = uploadArea.querySelector('.upload-placeholder');

    if (uploadedImg && placeholder) {
        // 隐藏占位符
        placeholder.style.display = 'none';

        // 显示图片
        uploadedImg.style.cssText = `
            display: block !important;
            width: 100% !important;
            max-height: 200px !important;
            object-fit: cover !important;
            border-radius: 8px !important;
            cursor: pointer !important;
        `;
        uploadedImg.src = imageBase64;

        console.log('✅ 图片已显示在上传区', {
            src: imageBase64.substring(0, 50) + '...',
            displayed: uploadedImg.style.display,
            visibility: window.getComputedStyle(uploadedImg).visibility
        });
    } else {
        console.error('❌ 无法找到图片或占位符元素', {
            uploadArea: !!uploadArea,
            uploadedImg: !!uploadedImg,
            placeholder: !!placeholder
        });
    }
}

// ★ 插入音频
function insertAudio() {
    console.log('🎵 insertAudio 被调用');

    // 创建文件输入
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';

    input.onchange = function(e) {
        const files = e.target.files;

        // 检查是否有文件被选中
        if (!files || files.length === 0) {
            console.log('🎵 没有选择音频文件');
            return;
        }

        const file = files[0];
        console.log('🎵 选择的音频文件:', file);

        if (file) {
            // 显示在固定的音频上传区
            displayUploadedAudio(file);
            // 保存文件供后续使用
            window.uploadedAudioFile = file;
            window.uploadedAudioUrl = URL.createObjectURL(file);
        }
    };

    input.click();
}

// ★ 显示上传的音频
function displayUploadedAudio(file) {
    const uploadArea = document.getElementById('audioUploadArea');
    const audioPlayer = document.getElementById('audioPlayer');
    const uploadedAudio = document.getElementById('uploadedAudio');
    const placeholder = uploadArea.querySelector('.upload-placeholder');

    if (uploadedAudio && placeholder && audioPlayer) {
        // 创建对象URL用于音频
        const audioUrl = URL.createObjectURL(file);

        // 隐藏占位符
        placeholder.style.display = 'none';

        // 显示音频播放器（父容器）
        audioPlayer.style.cssText = `
            display: block !important;
            width: 100% !important;
            padding: 10px 0 !important;
        `;

        // 设置音频元素样式
        uploadedAudio.style.cssText = `
            width: 100% !important;
            height: 40px !important;
            display: block !important;
        `;
        uploadedAudio.src = audioUrl;

        console.log('✅ 音频已显示在上传区', {
            file: file.name,
            size: file.size,
            type: file.type,
            displayed: audioPlayer.style.display,
            audioSrc: audioUrl.substring(0, 50) + '...'
        });
    } else {
        console.error('❌ 无法找到音频相关元素', {
            uploadArea: !!uploadArea,
            uploadedAudio: !!uploadedAudio,
            placeholder: !!placeholder,
            audioPlayer: !!audioPlayer
        });
    }
}

// ★ 显示音频预览
function showAudioPreview(file) {
    const previewArea = document.getElementById('filePreviewArea');
    const previewContent = document.getElementById('previewContent');

    if (previewArea && previewContent) {
        previewArea.style.display = 'block';

        const audioPreview = document.createElement('div');
        audioPreview.className = 'audio-preview';

        // 播放按钮
        const playBtn = document.createElement('button');
        playBtn.className = 'play-btn';
        playBtn.innerHTML = '▶';

        // 时间显示
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'audio-time';
        timeDisplay.textContent = '00:00';

        // 波浪容器
        const waveContainer = document.createElement('div');
        waveContainer.className = 'wave-container';

        // 生成波浪条
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'wave-bar';
            bar.style.height = (8 + Math.random() * 24) + 'px';
            waveContainer.appendChild(bar);
        }

        // 删除按钮
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = function() {
            audioPreview.remove();
            if (previewContent.children.length === 0) {
                previewArea.style.display = 'none';
            }
        };

        audioPreview.appendChild(playBtn);
        audioPreview.appendChild(timeDisplay);
        audioPreview.appendChild(waveContainer);
        audioPreview.appendChild(removeBtn);
        previewContent.appendChild(audioPreview);

        // 创建音频对象
        const audio = new Audio(URL.createObjectURL(file));
        let isPlaying = false;
        let duration = 0;

        audio.addEventListener('loadedmetadata', function() {
            duration = audio.duration;
            timeDisplay.textContent = formatTime(duration);
        });

        audio.addEventListener('timeupdate', function() {
            timeDisplay.textContent = formatTime(audio.currentTime);
        });

        audio.addEventListener('ended', function() {
            isPlaying = false;
            playBtn.innerHTML = '▶';
            stopWaveAnimation(waveContainer);
        });

        playBtn.onclick = function() {
            if (isPlaying) {
                audio.pause();
                playBtn.innerHTML = '▶';
                stopWaveAnimation(waveContainer);
            } else {
                audio.play();
                playBtn.innerHTML = '⏸';
                startWaveAnimation(waveContainer);
            }
            isPlaying = !isPlaying;
        };
    }
}

// ★ 显示文件预览
function showFilePreview(type, data) {
    console.log('👁️ showFilePreview 被调用，类型:', type);
    const previewArea = document.getElementById('filePreviewArea');
    const previewContent = document.getElementById('previewContent');

    console.log('👁️ previewArea 元素:', previewArea);
    console.log('👁️ previewContent 元素:', previewContent);

    if (!previewArea || !previewContent) {
        console.error('❌ 预览区域元素不存在！');
        return;
    }

    previewArea.style.display = 'block';
    console.log('✅ 预览区域已显示');

    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.style.position = 'relative';
    previewItem.style.display = 'inline-block';
    previewItem.style.margin = '10px';

    if (type === 'image') {
        const img = document.createElement('img');
        img.src = data;
        img.style.maxWidth = '200px';
        img.style.maxHeight = '150px';
        img.style.borderRadius = '6px';
        previewItem.appendChild(img);
        console.log('✅ 图片已添加到预览');
    }

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '5px';
    removeBtn.style.right = '5px';
    removeBtn.style.background = '#ff4d4f';
    removeBtn.style.color = 'white';
    removeBtn.style.border = 'none';
    removeBtn.style.borderRadius = '50%';
    removeBtn.style.width = '24px';
    removeBtn.style.height = '24px';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.fontSize = '16px';
    removeBtn.style.padding = '0';

    removeBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        previewItem.remove();
        console.log('🗑️ 删除了预览项');
        if (previewContent.children.length === 0) {
            previewArea.style.display = 'none';
        }
        // 更新父iframe的高度
        updateParentIframeHeight();
    };
    previewItem.appendChild(removeBtn);

    previewContent.appendChild(previewItem);
    console.log('✅ 预览项已添加到页面');

    // 更新父iframe的高度（显示了新内容，需要通知父页面更新高度）
    setTimeout(() => {
        updateParentIframeHeight();
    }, 100);
}

// ★ 更新父iframe的高度（通知父页面调整iframe高度）
function updateParentIframeHeight() {
    try {
        const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        console.log('📏 当前页面高度:', docHeight);

        // 通过 postMessage 通知父页面更新iframe高度
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'updateIframeHeight',
                height: docHeight
            }, '*');
        }
    } catch (e) {
        console.warn('⚠️ 更新父iframe高度失败:', e);
    }
}

// ★ 启动波浪动画
function startWaveAnimation(container) {
    const bars = container.querySelectorAll('.wave-bar');
    bars.forEach((bar, index) => {
        bar.classList.add('active');
        bar.style.animationDelay = (index * 0.05) + 's';
    });
}

// ★ 停止波浪动画
function stopWaveAnimation(container) {
    const bars = container.querySelectorAll('.wave-bar');
    bars.forEach(bar => {
        bar.classList.remove('active');
    });
}

// ★ 开始录音
function startRecording() {
    const overlay = document.getElementById('recordingOverlay');
    if (overlay) {
        overlay.classList.add('show');
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = function(event) {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = function() {
                    audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                };

                mediaRecorder.start();
                isRecording = true;

                // 启动波浪动画
                const waveContainer = document.getElementById('recordingWave');
                if (waveContainer) {
                    const bars = waveContainer.querySelectorAll('.recording-bar');
                    bars.forEach((bar, index) => {
                        bar.style.animationDelay = (index * 0.05) + 's';
                    });
                }
            })
            .catch(function(error) {
                console.error('获取麦克风权限失败:', error);
                alert('无法访问麦克风，请检查权限设置');
                overlay.classList.remove('show');
            });
    } else {
        alert('您的浏览器不支持录音功能');
    }
}

// ★ 停止录音
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;

        // 停止所有音轨
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        const overlay = document.getElementById('recordingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }

        alert('录音已停止，点击"完成录制"添加到内容中');
    }
}

// ★ 完成录音
function finishRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;

        // 停止所有音轨
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        const overlay = document.getElementById('recordingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }

        if (audioBlob) {
            const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
            showAudioPreview(audioFile);
        }

        audioBlob = null;
    }
}

// ★ 获取位置
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const locationInfo = document.getElementById('locationInfo');
                if (locationInfo) {
                    locationInfo.innerHTML = '<span class="iconfont icon-weizhi"></span> 已获取位置 (' + lat.toFixed(4) + ', ' + lng.toFixed(4) + ')';
                }
            },
            function(error) {
                console.error('获取位置失败:', error);
                alert('无法获取您的位置，请检查浏览器权限设置');
            }
        );
    } else {
        alert('您的浏览器不支持地理位置功能');
    }
}

// ★ 格式化时间
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return (minutes < 10 ? '0' + minutes : minutes) + ':' +
        (secs < 10 ? '0' + secs : secs);
}

// ★ 更新字符计数
function updateCharCount() {
    const editor = document.getElementById('contentEditor');
    const countSpan = document.getElementById('charCount');

    if (editor && countSpan) {
        const text = editor.innerText || editor.textContent;
        const length = text.length;
        countSpan.textContent = length;

        if (length >= 3000) {
            countSpan.style.color = '#ff4d4f';
        } else {
            countSpan.style.color = '#999';
        }
    }
}

// ★ 处理发布
async function handlePublish() {
    const editor = document.getElementById('contentEditor');
    const content = editor ? editor.innerHTML : '';
    const textContent = editor ? (editor.innerText || editor.textContent) : '';

    if (!textContent.trim()) {
        alert('请输入内容后再发布');
        return;
    }

    if (textContent.length > 3000) {
        alert('内容不能超过 3000 字');
        return;
    }

    // 获取用户ID
    const userId = getCookie('user_id');
    if (!userId) {
        alert('请先登录');
        return;
    }

    // 收集上传的图片
    const images = [];

    // 从上传区收集图片
    const uploadedImage = document.getElementById('uploadedImage');
    if (uploadedImage && uploadedImage.src && uploadedImage.style.display !== 'none') {
        images.push(uploadedImage.src);
    }

    // 从预览区域收集其他图片
    const previewContent = document.getElementById('previewContent');
    if (previewContent) {
        const imgElements = previewContent.querySelectorAll('img');
        for (const img of imgElements) {
            if (img.src && !img.src.includes('http')) {
                // 本地图片（Base64），直接使用
                images.push(img.src);
            } else if (img.src) {
                // 网络图片，保持原URL
                images.push(img.src);
            }
        }
    }

    // 收集上传的音频
    const audios = [];
    const uploadedAudio = document.getElementById('uploadedAudio');
    if (uploadedAudio && uploadedAudio.src && document.getElementById('audioPlayer').style.display !== 'none') {
        audios.push({
            type: 'upload',
            url: uploadedAudio.src,
            file: window.uploadedAudioFile // 可能需要转换为 Base64
        });
    }

    // 收集位置信息
    const locationInfo = document.getElementById('locationInfo');
    const location = locationInfo ? locationInfo.textContent : '';

    // 准备发布数据
    const publishData = {
        user_id: userId,
        content: content,
        images: images,
        audios: audios, // 现在支持音频
        location: location
    };

    console.log('📤 准备发布数据:', publishData);

    try {
        // 调用后端API发布
        const response = await fetch('/api/community/publish/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(publishData)
        });

        const data = await response.json();
        console.log('📥 后端响应:', data);

        if (data.code === 200) {
            alert('✅ 发布成功！');

            // 清空编辑器
            if (editor) {
                editor.innerHTML = '';
            }
            updateCharCount();

            // 清空预览区
            const previewArea = document.getElementById('filePreviewArea');
            const previewContent = document.getElementById('previewContent');
            if (previewArea && previewContent) {
                previewArea.style.display = 'none';
                previewContent.innerHTML = '';
            }

            // 清空位置信息
            const locationInfo = document.getElementById('locationInfo');
            if (locationInfo) {
                locationInfo.innerHTML = '';
            }

            // 清空图片上传区
            const imageUploadArea = document.getElementById('imageUploadArea');
            const uploadedImage = document.getElementById('uploadedImage');
            const imagePlaceholder = imageUploadArea ? imageUploadArea.querySelector('.upload-placeholder') : null;
            if (uploadedImage && imagePlaceholder) {
                uploadedImage.style.display = 'none';
                uploadedImage.src = '';
                imagePlaceholder.style.display = 'flex';
            }
            window.uploadedImageBase64 = null;

            // 清空音频上传区
            const audioUploadArea = document.getElementById('audioUploadArea');
            const uploadedAudio = document.getElementById('uploadedAudio');
            const audioPlayer = document.getElementById('audioPlayer');
            const audioPlaceholder = audioUploadArea ? audioUploadArea.querySelector('.upload-placeholder') : null;
            if (uploadedAudio && audioPlayer && audioPlaceholder) {
                uploadedAudio.src = '';
                audioPlayer.style.display = 'none';
                audioPlaceholder.style.display = 'flex';
            }
            window.uploadedAudioFile = null;
            window.uploadedAudioUrl = null;

            // 刷新Feed
            loadFeedContent();
        } else {
            alert(`❌ 发布失败: ${data.message}`);
        }
    } catch (error) {
        console.error('❌ 发布出错:', error);
        alert('发布出错，请稍后重试');
    }
}

// ★ 获取Cookie中的值
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// ★ 显示音乐选择弹出框
function showMusicSelectionModal() {
    console.log('📢 showMusicSelectionModal 被调用');
    const modal = document.getElementById('musicSelectionModal');
    if (!modal) {
        console.error('❌ 音乐选择弹出框元素不存在');
        return;
    }

    console.log('✅ 找到 modal 元素，设置显示');
    modal.style.display = 'flex';
    modal.classList.add('show');
    console.log('✅ modal 已显示');
    loadUserFavoriteMusics();
}

// ★ 隐藏音乐选择弹出框
function closeMusicSelectionModal() {
    const modal = document.getElementById('musicSelectionModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

// ★ 加载用户喜爱的音乐
async function loadUserFavoriteMusics() {
    const userId = getCookie('user_id');
    console.log('🔍 获取 user_id:', userId);

    if (!userId) {
        console.warn('⚠️ 未登录，user_id 为空');
        alert('请先登录');
        closeMusicSelectionModal();
        return;
    }

    const musicList = document.getElementById('musicList');
    if (!musicList) {
        console.error('❌ musicList 元素不存在');
        return;
    }

    // 显示加载动画
    musicList.innerHTML = '<div class="loading-spinner">加载中...</div>';

    try {
        // 获取用户喜爱的音乐ID列表
        console.log('📤 请求 API: /api/user/favorite_musics/?user_id=' + userId);
        const response = await fetch(`/api/user/favorite_musics/?user_id=${userId}`);
        console.log('📥 响应状态码:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📥 API 响应:', data);

        if (data.code !== 200 || !data.data || !data.data.music_ids) {
            const errorMsg = data.message || data.msg || '无法获取音乐列表';
            console.warn('⚠️ API 返回错误:', errorMsg);
            musicList.innerHTML = `<div class="loading-spinner">获取音乐失败: ${errorMsg}</div>`;
            return;
        }

        const musicIds = data.data.music_ids;
        if (musicIds.length === 0) {
            console.log('ℹ️ 没有喜爱的音乐');
            musicList.innerHTML = '<div class="loading-spinner">还没有喜爱的音乐</div>';
            return;
        }

        console.log('✅ 获取到 ' + musicIds.length + ' 首音乐');

        // 获取每个音乐的基本信息（不调用爬虫，在点击确定时再调用）
        const musicDetailsPromises = musicIds.map(musicId =>
            fetch(`/api/music/info/?music_id=${musicId}`)
            .then(res => {
                console.log(`📥 获取音乐 ${musicId} 的响应状态:`, res.status);
                if (!res.ok) {
                    throw new Error(`获取音乐 ${musicId} 失败: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                if (data.code === 200 && data.data) {
                    console.log(`✅ 成功获取音乐 ${musicId}:`, data.data.music_name);
                    return data;
                } else {
                    console.warn(`⚠️ 音乐 ${musicId} 数据格式错误:`, data);
                    return null;
                }
            })
            .catch(err => {
                console.error(`❌ 获取音乐 ${musicId} 详情失败:`, err.message);
                return null;
            })
        );

        const musicDetailsResponses = await Promise.all(musicDetailsPromises);
        const musicDetails = musicDetailsResponses
            .filter(res => res && res.code === 200 && res.data)
            .map(res => res.data);

        console.log('✅ 获取到 ' + musicDetails.length + ' 首音乐的详细信息');

        if (musicDetails.length === 0) {
            console.warn('⚠️ 没有获取到音乐详情');
            musicList.innerHTML = '<div class="loading-spinner">暂无音乐信息（API 返回数据为空）</div>';
            return;
        }

        // 渲染音乐列表
        console.log('🎨 开始渲染音乐列表');
        renderMusicList(musicDetails);

    } catch (error) {
        console.error('❌ 加载音乐列表失败:', error.message, error);
        musicList.innerHTML = `<div class="loading-spinner">加载失败: ${error.message}</div>`;
    }
}

// ★ 渲染音乐列表（全局函数）
function renderMusicList(musicDetails) {
    const musicList = document.getElementById('musicList');
    if (!musicList) {
        console.error('❌ musicList 元素不存在');
        return;
    }

    if (!musicDetails || musicDetails.length === 0) {
        console.warn('⚠️ 没有音乐数据需要渲染');
        musicList.innerHTML = '<div class="loading-spinner">暂无音乐数据</div>';
        return;
    }

    musicList.innerHTML = '';
    console.log('🎨 开始渲染 ' + musicDetails.length + ' 首音乐');

    musicDetails.forEach((music, index) => {
        try {
            const musicItem = document.createElement('div');
            musicItem.className = 'music-item';

            const musicId = music.music_id || music.id || index;
            const musicName = music.music_name || '未知歌曲';
            const musicUrl = music.play_url || music.real_url || '';

            musicItem.setAttribute('data-music-id', musicId);
            musicItem.setAttribute('data-music-name', musicName);
            musicItem.setAttribute('data-music-url', musicUrl);

            if (!musicUrl) {
                console.warn(`⚠️ 音乐 ${musicName} (ID: ${musicId}) 缺少 play_url`);
            }

            const musicInfo = document.createElement('div');
            musicInfo.className = 'music-item-info';

            const musicNameEl = document.createElement('div');
            musicNameEl.className = 'music-item-name';
            musicNameEl.textContent = musicName;

            const musicArtist = document.createElement('div');
            musicArtist.className = 'music-item-artist';
            const author = music.author || '未知歌手';
            const album = music.album || '未知专辑';
            musicArtist.textContent = author + ' - ' + album;

            musicInfo.appendChild(musicNameEl);
            musicInfo.appendChild(musicArtist);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'music-item-checkbox';
            checkbox.value = musicId;

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'music-item-confirm-btn';
            confirmBtn.textContent = '确定';
            confirmBtn.onclick = function(e) {
                e.preventDefault();
                console.log('📌 用户选择了音乐:', musicName);
                addSelectedMusic(musicItem);
            };

            musicItem.appendChild(checkbox);
            musicItem.appendChild(musicInfo);
            musicItem.appendChild(confirmBtn);

            musicItem.addEventListener('change', function() {
                if (checkbox.checked) {
                    musicItem.classList.add('selected');
                    console.log('✅ 音乐项被选中:', musicName);
                } else {
                    musicItem.classList.remove('selected');
                    console.log('❌ 音乐项被取消选中:', musicName);
                }
            });

            musicList.appendChild(musicItem);
            console.log(`✅ 已渲染音乐 [${index + 1}]: ${musicName}`);
        } catch (err) {
            console.error('❌ 渲染音乐项出错:', err, music);
        }
    });

    console.log('✅ 音乐列表渲染完成，共 ' + musicList.children.length + ' 项');
}

// ★ 添加选中的音乐到预览区（全局函数）
function addSelectedMusic(musicItem) {
    const musicId = musicItem.getAttribute('data-music-id');
    const musicName = musicItem.getAttribute('data-music-name');

    console.log('🎵 用户点击确定，准备添加音乐:', { musicId, musicName });

    const previewArea = document.getElementById('filePreviewArea');
    const previewContent = document.getElementById('previewContent');

    if (!previewArea || !previewContent) {
        console.error('❌ 预览区域元素不存在');
        return;
    }

    previewArea.style.display = 'block';

    // 创建音乐预览元素
    const audioPreview = document.createElement('div');
    audioPreview.className = 'audio-preview';
    audioPreview.setAttribute('data-music-id', musicId);
    audioPreview.setAttribute('data-music-name', musicName);

    // 播放按钮
    const playBtn = document.createElement('button');
    playBtn.className = 'play-btn';
    playBtn.innerHTML = '▶';
    playBtn.disabled = true; // ★ 初始禁用，等待链接获取
    playBtn.style.opacity = '0.5';
    playBtn.title = '正在加载音乐...';

    // 音乐名称显示
    const musicNameDisplay = document.createElement('div');
    musicNameDisplay.className = 'audio-time';
    musicNameDisplay.textContent = musicName;
    musicNameDisplay.style.flex = '1';

    // 音乐时间显示
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'audio-time';
    timeDisplay.textContent = '加载中...';

    // 波浪容器
    const waveContainer = document.createElement('div');
    waveContainer.className = 'wave-container';

    // 生成波浪条
    for (let i = 0; i < 15; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.height = (8 + Math.random() * 20) + 'px';
        waveContainer.appendChild(bar);
    }

    // 删除按钮
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = function() {
        audioPreview.remove();
        if (previewContent.children.length === 0) {
            previewArea.style.display = 'none';
        }
    };

    audioPreview.appendChild(playBtn);
    audioPreview.appendChild(musicNameDisplay);
    audioPreview.appendChild(waveContainer);
    audioPreview.appendChild(timeDisplay);
    audioPreview.appendChild(removeBtn);
    previewContent.appendChild(audioPreview);

    // ★ 调用爬虫获取真实播放链接
    console.log('🕷️ 开始调用爬虫获取音乐链接，music_id:', musicId);

    fetch('/play_music_url/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                music_id: musicId
            })
        })
        .then(res => {
            console.log('📥 爬虫响应状态码:', res.status);
            if (!res.ok) {
                throw new Error(`爬虫请求失败: ${res.status} ${res.statusText}`);
            }
            return res.json();
        })
        .then(playData => {
            console.log('🕷️ 爬虫返回数据:', playData);

            if (playData.success && playData.play_url) {
                console.log(`✅ 成功获取播放链接:`, playData.play_url.substring(0, 80) + '...');

                // ★ 保存播放链接到预览元素（发布时需要用到）
                audioPreview.setAttribute('data-music-url', playData.play_url);

                // ★ 启用播放按钮（链接获取成功）
                playBtn.disabled = false;
                playBtn.style.opacity = '1';
                playBtn.title = '播放音乐';

                // 创建音频对象
                const audio = new Audio(playData.play_url);
                let isPlaying = false;
                let duration = 0;

                audio.addEventListener('loadstart', function() {
                    console.log('📥 开始加载音乐音频');
                    timeDisplay.textContent = '加载中...';
                });

                audio.addEventListener('loadedmetadata', function() {
                    duration = audio.duration;
                    timeDisplay.textContent = formatTime(duration);
                    console.log('✅ 音乐元数据加载完成，时长:', formatTime(duration));
                });

                audio.addEventListener('canplay', function() {
                    console.log('✅ 音乐可以播放');
                });

                audio.addEventListener('timeupdate', function() {
                    timeDisplay.textContent = formatTime(audio.currentTime);
                });

                audio.addEventListener('ended', function() {
                    isPlaying = false;
                    playBtn.innerHTML = '▶';
                    stopWaveAnimation(waveContainer);
                    console.log('✅ 音乐播放完成');
                });

                audio.addEventListener('error', function(e) {
                    console.error('❌ 音乐加载失败:', audio.error);
                    timeDisplay.textContent = '加载失败';
                    audioPreview.style.opacity = '0.5';
                    alert('加载音乐失败，音乐链接可能已过期');
                });

                playBtn.onclick = function() {
                    if (isPlaying) {
                        audio.pause();
                        playBtn.innerHTML = '▶';
                        stopWaveAnimation(waveContainer);
                        console.log('⏸  暂停播放');
                    } else {
                        audio.play().catch(err => {
                            console.error('❌ 播放音乐失败:', err);
                            alert('无法播放音乐: ' + err.message);
                        });
                        playBtn.innerHTML = '⏸';
                        startWaveAnimation(waveContainer);
                        console.log('▶ 开始播放');
                    }
                    isPlaying = !isPlaying;
                };
            } else {
                console.error('❌ 爬虫获取链接失败:', playData.msg || playData.message);
                timeDisplay.textContent = '❌ 获取失败';
                audioPreview.style.opacity = '0.5';
                playBtn.disabled = true;
                playBtn.title = '获取链接失败';
                console.error('❌ 无法获取音乐链接: ' + (playData.msg || '未知错误'));
            }
        })
        .catch(err => {
            console.error('❌ 调用爬虫失败:', err.message);
            timeDisplay.textContent = '❌ 加载失败';
            audioPreview.style.opacity = '0.5';
            playBtn.disabled = true;
            playBtn.title = '加载出错';
            console.error('❌ 调用爬虫失败: ' + err.message);
        });

    // 关闭弹出框
    closeMusicSelectionModal();
}

// ==================== ★ 社区发布和显示功能 ====================

let currentPage = 1;
let currentSort = 'latest';
const PAGE_SIZE = 20;

// 发布内容
document.getElementById('publishBtn').addEventListener('click', function() {
    publishCommunityRecord();
});

function publishCommunityRecord() {
    // 获取用户信息
    const userId = getCookie('user_id');
    const userNickname = getCookie('username') || '炫音用户';
    const userAvatar = getCookie('user_avatar') || '/static/imgs/hp1.png';

    // 验证登录
    if (!userId || !userNickname) {
        alert('请先登录');
        return;
    }

    console.log('📤 开始发布社区内容...');
    console.log(`用户: ${userNickname} (${userId})`);

    // 收集内容
    const contentEditor = document.getElementById('contentEditor');
    const textContent = contentEditor.innerText.trim();

    // 获取音频信息
    const audioItems = document.querySelectorAll('#previewContent .audio-preview');
    const audios = [];
    audioItems.forEach(item => {
        const musicName = item.getAttribute('data-music-name') || '音乐';
        const musicUrl = item.getAttribute('data-music-url');

        if (musicUrl) {
            audios.push({
                url: musicUrl,
                name: musicName,
                type: 'audio'
            });
        }
    });

    // 获取图片信息
    const imageItems = document.querySelectorAll('#previewContent .preview-item img');
    const images = [];
    imageItems.forEach(img => {
        if (img.src) {
            images.push(img.src);
        }
    });

    // 获取位置信息
    const locationInfo = document.getElementById('locationInfo');
    const location = (locationInfo && locationInfo.textContent) ? locationInfo.textContent.replace('📍 ', '') : '';

    // 验证内容
    if (!textContent && audios.length === 0 && images.length === 0) {
        alert('请输入内容或添加音频/图片');
        return;
    }

    // 构建请求数据
    const publishData = {
        user_id: userId,
        user_nickname: userNickname,
        user_avatar: userAvatar,
        content: textContent,
        images: images,
        audios: audios,
        location: location
    };

    console.log('📦 发布数据:', publishData);

    // 发送请求
    fetch('/api/community/publish/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(publishData)
        })
        .then(res => res.json())
        .then(data => {
            console.log('✅ 发布响应:', data);

            if (data.code === 200) {
                alert('🎉 发布成功！');

                // 清除编辑区
                contentEditor.innerText = '';
                document.getElementById('charCount').textContent = '0';
                document.getElementById('filePreviewArea').style.display = 'none';
                document.getElementById('previewContent').innerHTML = '';

                // 刷新社区内容列表
                currentPage = 1;
                loadCommunityRecords();
            } else {
                alert(`发布失败: ${data.message}`);
            }
        })
        .catch(err => {
            console.error('❌ 发布失败:', err);
            alert('发布失败，请重试');
        });
}

// 加载社区内容列表
function loadCommunityRecords() {
    console.log(`📥 加载社区内容... 页码: ${currentPage}, 排序: ${currentSort}`);

    const feedList = document.getElementById('feedList');
    feedList.innerHTML = '<div class="loading-spinner">加载中...</div>';

    fetch(`/api/community/records/?page=${currentPage}&page_size=${PAGE_SIZE}&sort_by=${currentSort}`)
        .then(res => res.json())
        .then(data => {
            console.log('✅ 获取社区内容成功:', data);

            if (data.code === 200) {
                renderCommunityRecords(data.data.records);
                updatePagination(data.data.pagination);
            } else {
                feedList.innerHTML = `<div style="text-align: center; color: #999; padding: 40px;">加载失败: ${data.message}</div>`;
            }
        })
        .catch(err => {
            console.error('❌ 加载失败:', err);
            feedList.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">加载出错，请刷新重试</div>';
        });
}

// 渲染社区内容
function renderCommunityRecords(records) {
    const feedList = document.getElementById('feedList');
    feedList.innerHTML = '';

    if (records.length === 0) {
        feedList.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">还没有内容，赶快发布吧！</div>';
        return;
    }

    records.forEach(record => {
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.id = `feed-${record.id}`;

        // 用户信息区
        const header = document.createElement('div');
        header.className = 'feed-header';
        const userAvatar = record.user_avatar || '/static/imgs/hp1.png';
        const userNickname = record.user_nickname || '匿名用户';
        header.innerHTML = `
            <img src="${userAvatar}" class="user-avatar" alt="${userNickname}" onerror="this.src='/static/imgs/hp1.png'">
            <div class="user-info">
                <div class="user-name">${userNickname}</div>
                <div class="publish-time">${formatPublishTime(record.publish_time)}</div>
            </div>
        `;

        // 内容主体
        const content = document.createElement('div');
        content.className = 'feed-content';
        let contentHTML = '';

        // 显示音频（如果有）
        if (record.audios && Array.isArray(record.audios) && record.audios.length > 0) {
            contentHTML += '<div class="feed-audios">';
            record.audios.forEach(audio => {
                const audioUrl = audio.url || audio;
                const audioName = audio.name || '音乐';
                contentHTML += `
                    <div class="feed-audio-item">
                        <button class="feed-play-btn" data-url="${audioUrl}">▶</button>
                        <div class="feed-audio-info">
                            <div class="feed-audio-title">${audioName}</div>
                            <div class="feed-audio-time">点击播放</div>
                        </div>
                    </div>
                `;
            });
            contentHTML += '</div>';
        }

        // 显示图片（如果有）
        if (record.images && Array.isArray(record.images) && record.images.length > 0) {
            contentHTML += '<div class="feed-images">';
            record.images.forEach(image => {
                contentHTML += `<img src="${image}" class="feed-image" alt="图片" onerror="this.style.display='none'">`;
            });
            contentHTML += '</div>';
        }

        // 显示文本
        if (record.content) {
            contentHTML += `<div class="feed-text">${record.content.replace(/\n/g, '<br>')}</div>`;
        }

        content.innerHTML = contentHTML;

        // 位置信息
        let locationHTML = '';
        if (record.location) {
            locationHTML = `<div class="feed-location">${record.location}</div>`;
        }

        // 互动区域（点赞）
        const footer = document.createElement('div');
        footer.className = 'feed-footer';
        footer.innerHTML = `
            ${locationHTML}
            <button class="like-btn" data-record-id="${record.id}">
                <span class="like-icon iconfont icon-dianzan"></span>
                <span class="like-count">${record.likes}</span>
            </button>
        `;

        // 点赞事件
        footer.querySelector('.like-btn').addEventListener('click', function() {
            likeRecord(this);
        });

        // 音频播放事件
        content.querySelectorAll('.feed-play-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                playAudio(this.dataset.url);
            });
        });

        // 组装完整的条目
        item.appendChild(header);
        item.appendChild(content);
        item.appendChild(footer);
        feedList.appendChild(item);
    });
}

// 更新分页信息
function updatePagination(pagination) {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    pageInfo.textContent = `第 ${pagination.page} / ${pagination.total_pages} 页`;

    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.total_pages;
}

// 排序按钮事件
document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentSort = this.dataset.sort;
        currentPage = 1;
        loadCommunityRecords();
    });
});

// 分页按钮事件
document.getElementById('prevBtn').addEventListener('click', function() {
    if (currentPage > 1) {
        currentPage--;
        loadCommunityRecords();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

document.getElementById('nextBtn').addEventListener('click', function() {
    currentPage++;
    loadCommunityRecords();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// 点赞功能
function likeRecord(btn) {
    const recordId = btn.dataset.recordId;
    const likeCount = btn.querySelector('.like-count');
    const currentCount = parseInt(likeCount.textContent);

    console.log(`👍 点赞记录 ${recordId}`);

    fetch('/api/community/like/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ record_id: recordId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                likeCount.textContent = data.data.likes;
                btn.classList.add('liked');
                console.log(`✅ 点赞成功，当前点赞数: ${data.data.likes}`);
            }
        })
        .catch(err => console.error('❌ 点赞失败:', err));
}

// 播放音频
function playAudio(url) {
    console.log(`🎵 播放音频: ${url}`);

    const audio = new Audio(url);
    audio.play().catch(err => {
        console.error('❌ 播放失败:', err);
        alert('无法播放音频');
    });
}

// 格式化发布时间
function formatPublishTime(isoTime) {
    const date = new Date(isoTime);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return '刚刚';
    } else if (minutes < 60) {
        return `${minutes}分钟前`;
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else if (days < 7) {
        return `${days}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 页面初始化时加载社区内容
window.addEventListener('load', function() {
    console.log('🔄 页面加载完成，初始化社区内容...');
    loadCommunityRecords();
});