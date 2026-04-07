// ============================================================================
// 🔥 立即执行的测试脚本 - 不依赖 DOMContentLoaded
// ============================================================================
// console.clear(); - 已注释掉，避免清除其他页面的控制台输出
console.log('%c=== 🚀 music_hall.js 已加载 ===', 'color: greenyellow; font-size: 16px; font-weight: bold;');
console.log('当前时间:', new Date().toLocaleTimeString());
console.log('document.readyState:', document.readyState);

// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('.mid-img img');
    const dots = document.querySelectorAll('.dots .dot');
    const arrowLeft = document.querySelector('.arrow-left');
    const arrowRight = document.querySelector('.arrow-right');
    const container = document.querySelector('.main-content-one');

    let currentIndex = 0;
    let timer = null;
    let isAnimating = false;

    const intervalTime = 5000; // 自动播放间隔
    const transitionTime = 800; // 动画时间（必须和CSS一致）

    // ======================
    // 初始化
    // ======================
    function init() {
        if (!images.length) return;
        updateUI(0);
        startAutoPlay();
    }

    // ======================
    // 更新UI状态
    // ======================
    function updateUI(index) {
        images.forEach(img => img.classList.remove('img-active'));
        dots.forEach(dot => dot.classList.remove('dot-active'));

        images[index].classList.add('img-active');
        dots[index].classList.add('dot-active');

        currentIndex = index;
    }

    // ======================
    // 切换核心逻辑（带锁）
    // ======================
    function switchTo(newIndex) {
        if (isAnimating || newIndex === currentIndex) return;

        isAnimating = true;

        images[currentIndex].classList.add('img-fade');

        setTimeout(() => {
            images[currentIndex].classList.remove('img-fade');
            updateUI(newIndex);
            isAnimating = false;
        }, transitionTime);
    }

    function next() {
        const nextIndex = (currentIndex + 1) % images.length;
        switchTo(nextIndex);
    }

    function prev() {
        const prevIndex = (currentIndex - 1 + images.length) % images.length;
        switchTo(prevIndex);
    }

    // ======================
    // 自动播放（稳定版）
    // ======================
    function startAutoPlay() {
        if (timer) return; // 防止重复创建
        timer = setInterval(next, intervalTime);
    }

    function stopAutoPlay() {
        clearInterval(timer);
        timer = null;
    }

    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    // ======================
    // 事件绑定
    // ======================
    dots.forEach((dot, index) => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            switchTo(index);
            resetAutoPlay();
        });
    });

    if (arrowLeft) {
        arrowLeft.addEventListener('click', (e) => {
            e.preventDefault();
            prev();
            resetAutoPlay();
        });
    }

    if (arrowRight) {
        arrowRight.addEventListener('click', (e) => {
            e.preventDefault();
            next();
            resetAutoPlay();
        });
    }

    container.addEventListener('mouseenter', stopAutoPlay);
    container.addEventListener('mouseleave', startAutoPlay);

    init();
});
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有包含图片和隐藏播放按钮的容器
    const imgContainers = document.querySelectorAll('.img-box-left');

    imgContainers.forEach(container => {
        const hiddenBofang = container.querySelector('.hidden-bofang');

        // 鼠标进入时显示播放按钮
        container.addEventListener('mouseenter', function() {
            if (hiddenBofang) {
                hiddenBofang.style.opacity = '1';
                hiddenBofang.style.visibility = 'visible';
            }
        });

        // 鼠标离开时隐藏播放按钮
        container.addEventListener('mouseleave', function() {
            if (hiddenBofang) {
                hiddenBofang.style.opacity = '0';
                hiddenBofang.style.visibility = 'hidden';
            }
        });
    });
});
document.addEventListener('DOMContentLoaded', function() {
    // 获取热门推荐列表容器
    const hotRecommendList = document.getElementById('hot-recommend-list');
    console.log('Hot recommend list element:', hotRecommendList);

    const navItems = document.querySelectorAll('.hot-nav li');
    console.log('Nav items:', navItems);

    // 从Django模板获取初始数据
    const initialData = window.initialMusicData || {};
    console.log('Initial data from template:', initialData);

    // 缓存已加载的数据
    const musicCache = {};

    // 初始化缓存
    Object.keys(initialData).forEach(country => {
        const countryMap = {
            '中国': '华语',
            '欧美': '欧美',
            '日本': '日语',
            '韩国': '韩语'
        };
        const displayName = countryMap[country];
        if (displayName && initialData[country] && initialData[country].length > 0) {
            musicCache[displayName] = initialData[country];
            console.log(`Cached data for ${displayName}:`, initialData[country]);
        }
    });

    // 显示初始数据（华语）
    setTimeout(() => {
        if (musicCache['华语'] && musicCache['华语'].length > 0) {
            displayMusicData(musicCache['华语'], '华语');
        } else {
            loadMusicData('华语');
        }
    }, 0);

    // 点击导航项的事件处理
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const country = this.getAttribute('data-country');
            console.log('Clicked on country:', country);

            // 更新活动状态
            navItems.forEach(navItem => navItem.classList.remove('active-nav'));
            this.classList.add('active-nav');

            // 加载或显示数据
            loadMusicData(country);
        });
    });

    // 加载音乐数据的函数
    function loadMusicData(country) {
        console.log('Loading music data for:', country);

        // 如果缓存中有数据，直接使用
        if (musicCache[country]) {
            console.log('Using cached data for:', country);
            displayMusicData(musicCache[country], country);
            return;
        }

        console.log('Fetching data via AJAX for:', country);
        // 否则通过AJAX请求获取数据
        fetch(`/get_music_by_country/?country=${encodeURIComponent(country)}`)
            .then(response => {
                console.log('Response received:', response);
                return response.json();
            })
            .then(data => {
                console.log('Data received:', data);
                // 缓存数据
                musicCache[country] = data.music_data;
                // 显示数据
                displayMusicData(data.music_data, country);
            })
            .catch(error => {
                console.error('Error loading music data:', error);
            });
    }

    // 显示音乐数据的函数
    function displayMusicData(musicData, country) {
        console.log('Displaying music data for:', country, musicData);

        // 更新容器的class
        hotRecommendList.className = `hot-recommend-list ${getCountryClass(country)}`;
        console.log('Updated container class to:', hotRecommendList.className);

        // 生成HTML ★新增：显示点击数排序信息
        const html = musicData.map(music => `
            <li>
                <div class="img-box-left" id="${music.music_id}">
                    <img src="${music.album_cover}" id="${music.music_id}">
                    <div class="hidden-bofang"><i class="iconfont icon-bofang1"></i></div>
                    <div style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #ccff00; padding: 4px 8px; border-radius: 4px; font-size: 12px; z-index: 2;">▶ ${music.click_count || 0}</div>
                </div>
                <div class="text-box-right">
                    <div class="top-text" id="${music.music_id}">${music.music_name}</div>
                    <div class="bottom-text" id="${music.author_id}">${music.author}</div>
                </div>
            </li>
        `).join('');


        // 更新内容
        const ulElement = hotRecommendList.querySelector('ul');
        if (ulElement) {
            ulElement.innerHTML = html;
            console.log('Updated UL content');
        } else {
            console.error('UL element not found');
        }

        // 重新绑定鼠标悬停事件
        bindHoverEvents();
    }

    // 获取国家对应的class名
    function getCountryClass(country) {
        const classMap = {
            '华语': 'huayu',
            '欧美': 'oumei',
            '日语': 'riyu',
            '韩语': 'hanyu'
        };
        return classMap[country] || 'huayu';
    }

    // 绑定鼠标悬停事件
    function bindHoverEvents() {
        const imgContainers = document.querySelectorAll('.img-box-left');
        console.log('Binding hover events to', imgContainers.length, 'containers');

        imgContainers.forEach(container => {
            const hiddenBofang = container.querySelector('.hidden-bofang');

            container.addEventListener('mouseenter', function() {
                if (hiddenBofang) {
                    hiddenBofang.style.opacity = '1';
                    hiddenBofang.style.visibility = 'visible';
                }
            });

            container.addEventListener('mouseleave', function() {
                if (hiddenBofang) {
                    hiddenBofang.style.opacity = '0';
                    hiddenBofang.style.visibility = 'hidden';
                }
            });
        });
    }

    // 初始绑定鼠标悬停事件
    bindHoverEvents();
});
// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有的 rank-table-item 元素
    const items = document.querySelectorAll('.rank-table-item');

    items.forEach(function(item) {
        // 鼠标移入时显示操作按钮
        item.addEventListener('mouseenter', function() {
            const operate = this.querySelector('.rank-table-item-operate');
            if (operate) {
                operate.style.display = 'flex';
            } else {
                operate.style.display = 'none';
            }
        });

        // 鼠标移出时隐藏操作按钮
        item.addEventListener('mouseleave', function() {
            const operate = this.querySelector('.rank-table-item-operate');
            if (operate) {
                operate.style.display = 'none';
            } else {
                operate.style.display = 'flex';

            }
        });
    });
});
// 新增：格式化日期时间
function formatDateTime(dateTime) {
    if (!dateTime) return '';

    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

function renderRankData(data, rankType) {
    const rankTableContent = document.querySelector('.rank-table-content');
    if (!rankTableContent) return;

    // 清空现有内容
    rankTableContent.innerHTML = '';

    // 检查是否有数据
    if (!data || data.length === 0) {
        rankTableContent.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">暂无数据</div>';
        return;
    }

    // 渲染每条数据
    data.forEach((item, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-table-item';

        // 创建排名数字
        const rankNum = document.createElement('div');
        rankNum.className = 'rank-table-item-num';
        rankNum.textContent = index + 1;

        // 创建歌曲名称
        const songName = document.createElement('div');
        songName.className = 'rank-table-item-song';
        const songLink = document.createElement('a');
        songLink.href = '#';
        songLink.id = item.music_id;
        songLink.textContent = item.music_name;
        songName.appendChild(songLink);

        // 创建歌手名称
        const singerName = document.createElement('div');
        singerName.className = 'rank-table-item-singer';
        const singerLink = document.createElement('a');
        singerLink.href = '#';
        singerLink.id = item.author_id;
        singerLink.textContent = item.author;
        singerName.appendChild(singerLink);

        // 创建操作按钮
        const operateBox = document.createElement('div');
        operateBox.className = 'rank-table-item-operate';

        const playBtn = document.createElement('span');
        playBtn.className = 'litter-icon';
        playBtn.title = '播放';
        playBtn.innerHTML = '<i class="iconfont icon-bofang1"></i>';
        playBtn.onclick = function(e) {
            e.stopPropagation();
            playMusic(item.music_id);
        };

        const addBtn = document.createElement('span');
        addBtn.className = 'litter-icon';
        addBtn.title = '添加到歌单';
        addBtn.innerHTML = '<i class="iconfont icon-tianjia-1"></i>';
        addBtn.onclick = function(e) {
            e.stopPropagation();
            addToPlaylist(item.music_id);
        };

        operateBox.appendChild(playBtn);
        operateBox.appendChild(addBtn);

        // 组装元素
        rankItem.appendChild(rankNum);
        rankItem.appendChild(songName);
        rankItem.appendChild(singerName);
        rankItem.appendChild(operateBox);

        rankTableContent.appendChild(rankItem);
    });
}
// 将全局变量移到最前面
const rankDataCache = {};
const rankTypeMap = {
    'soaring': 'soaring',
    'newsong': 'newsong',
    'hotsong': 'hotsong',
    'chinese': 'chinese',
    'europe': 'americe',
    'korean': 'korean',
    'japanese': 'japanese'
};
const rankNameMap = {
    'soaring': '飙升榜',
    'newsong': '新歌榜',
    'hotsong': '热歌榜',
    'chinese': '国语榜',
    'americe': '欧美榜',
    'korean': '韩语榜',
    'japanese': '日语榜'
};
let currentRankType = 'soaring';

// 简化渲染函数 - 只关注核心逻辑
function renderRank(rankType) {
    console.log('【渲染开始】', rankType);

    // 确保 rankType 有效
    if (!rankTypeMap[rankType]) {
        console.error('无效的榜单类型:', rankType);
        return;
    }

    // 获取数据
    const cacheData = rankDataCache[rankType];
    if (!cacheData) {
        console.warn('缓存中无数据，尝试从 window 对象获取');

        // 直接从 window 对象获取数据
        if (rankType === 'soaring' && window.initialSoaringData) {
            cacheData = {
                rank_name: '飙升榜',
                rank_time: window.currentDate || new Date().toISOString().split('T')[0],
                list: window.initialSoaringData
            };
            rankDataCache[rankType] = cacheData;
        } else if (window.initialAllRankData && window.initialAllRankData[rankType]) {
            cacheData = {
                rank_name: rankNameMap[rankType] || rankType,
                rank_time: window.currentDate || new Date().toISOString().split('T')[0],
                list: window.initialAllRankData[rankType]
            };
            rankDataCache[rankType] = cacheData;
        }
    }

    // 检查数据
    if (!cacheData || !cacheData.list || cacheData.list.length === 0) {
        console.warn('没有可用数据:', rankType);
        document.querySelector('.rank-table-content').innerHTML =
            '<div style="text-align: center; padding: 20px; color: #999;">暂无数据</div>';
        return;
    }

    // 更新 UI
    document.querySelector('.rank-title').textContent = cacheData.rank_name;
    document.querySelector('.rank-time').textContent = `更新时间：${cacheData.rank_time}`;

    // 渲染列表（为播放按钮添加 onclick 事件）
    const container = document.querySelector('.rank-table-content');
    container.innerHTML = cacheData.list.map((item, index) => `
        <div class="rank-table-item">
            <div class="rank-table-item-num">${index + 1}</div>
            <div class="rank-table-item-song"><a id="${item.music_id || ''}">${item.music_name || '未知歌曲'}</a></div>
            <div class="rank-table-item-singer"><a id="${item.author_id || ''}">${item.author || '未知歌手'}</a></div>
            <div class="rank-table-item-operate">
                <span class="litter-icon" title="播放" onclick="event.stopPropagation(); playMusic('${item.music_id || ''}')"><i class="iconfont icon-bofang1"></i></span>
                <span class="litter-icon" title="添加到歌单" onclick="event.stopPropagation(); addToPlaylist('${item.music_id || ''}')"><i class="iconfont icon-tianjia-1"></i></span>
            </div>
        </div>
    `).join('');

    console.log(`【渲染完成】${rankType}，共${cacheData.list.length}条`);
}

// 初始化所有榜单数据
function initAllRankData() {
    const currentDate = window.currentDate || new Date().toISOString().split('T')[0];

    console.log('Initializing all rank data:', window.initialAllRankData);

    Object.keys(rankTypeMap).forEach(rankType => {
        if (window.initialAllRankData && window.initialAllRankData[rankType]) {
            rankDataCache[rankType] = {
                rank_name: rankNameMap[rankType] || rankType,
                rank_time: currentDate,
                list: window.initialAllRankData[rankType]
            };
            console.log(`Cached ${rankType}:`, rankDataCache[rankType]);
        } else {
            console.warn(`No data for ${rankType} in initialAllRankData`);
        }
    });
}

// 初始化飙升榜
function initSoaringRank() {
    const currentDate = window.currentDate || new Date().toISOString().split('T')[0];

    console.log('=== initSoaringRank 开始执行 ===');
    console.log('rankDataCache:', rankDataCache);

    // 首先检查缓存中是否有数据
    if (rankDataCache['soaring'] && rankDataCache['soaring'].list && rankDataCache['soaring'].list.length > 0) {
        console.log('使用缓存的 soaring 数据:', rankDataCache['soaring']);
        renderRank('soaring');
        return;
    }

    // 如果 initialSoaringData 存在，直接使用
    const soaringData = window.initialSoaringData;
    console.log('使用 initialSoaringData:', soaringData);

    if (soaringData && soaringData.length > 0) {
        rankDataCache['soaring'] = {
            rank_name: '飙升榜',
            rank_time: currentDate,
            list: soaringData
        };
        console.log('创建缓存并渲染:', rankDataCache['soaring']);
        renderRank('soaring');
    } else {
        // 如果 initialSoaringData 不存在，尝试从 initialAllRankData 获取
        console.warn('没有可用的飙升榜数据，尝试从 initialAllRankData 获取');

        if (window.initialAllRankData && window.initialAllRankData.soaring && window.initialAllRankData.soaring.length > 0) {
            // 将 initialAllRankData.soaring 赋值给 window.initialSoaringData
            window.initialSoaringData = window.initialAllRankData.soaring;

            // 创建缓存
            rankDataCache['soaring'] = {
                rank_name: '飙升榜',
                rank_time: currentDate,
                list: window.initialSoaringData
            };

            console.log('从 initialAllRankData 获取数据并创建缓存:', rankDataCache['soaring']);
            renderRank('soaring');
        } else {
            console.warn('没有可用的飙升榜数据');
            const rankTableContent = document.querySelector('.rank-table-content');
            if (rankTableContent) {
                rankTableContent.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">暂无数据</div>';
            }
        }
    }
}

// 获取榜单数据
function fetchRankData(rankType) {
    console.log('Fetching rank data for:', rankType);

    if (rankDataCache[rankType]) {
        console.log('Using cached data for:', rankType);
        renderRank(rankType);
        return;
    }

    const backendType = rankTypeMap[rankType];
    console.log('Backend type:', backendType);

    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/get_rank_data/?rank_type=${backendType}`, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    console.log('Rank data response:', res);
                    if (res.code === 200) {
                        rankDataCache[rankType] = res.data;
                        renderRank(rankType);
                    } else {
                        console.error('Error response:', res.msg);
                    }
                } catch (e) {
                    console.error('Parse error:', e);
                }
            } else {
                console.error('Request failed with status:', xhr.status);
            }
        }
    };
    xhr.send();
}

// 绑定榜单点击事件
function bindRankClick() {
    const leftMenus = document.querySelectorAll('.menu-left > div');
    leftMenus.forEach(menu => {
        menu.addEventListener('click', function() {
            leftMenus.forEach(m => m.classList.remove('menu-active'));
            this.classList.add('menu-active');

            const rankType = this.id;
            currentRankType = rankType;

            fetchRankData(rankType);
            fetchAndRenderComments(1);
        });
    });
}

// 获取榜单评论
async function fetchRankComments(rankType, page = 1) {
    console.log('Fetching comments for:', rankType, 'page:', page);

    const url = `/get_rank_comments/?rank_type=${encodeURIComponent(rankType)}&page=${page}`;
    console.log('Request URL:', url);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Comments data received:', data);

        if (data.code === 200) {
            return data.data;
        } else {
            throw new Error(data.msg || 'request failure');
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        throw error;
    }
}

// 渲染评论数据
function renderComments(commentsData, rankType) {
    console.log('Rendering comments:', commentsData);

    const commentBox = document.getElementById('comment-box-one');
    if (!commentBox) {
        console.error('Comment box element not found');
        return;
    }

    const commentCountElement = commentBox.querySelector('.comment-count');
    if (commentCountElement) {
        commentCountElement.textContent = commentsData.total_count || 0;
    }

    const noCommentDiv = document.getElementById('no-comment');
    const showCommentContent = document.getElementById('show-comment-content');

    if (!showCommentContent) {
        console.error('Show comment content element not found');
        return;
    }

    showCommentContent.innerHTML = '';

    if (!commentsData.comments || commentsData.comments.length === 0) {
        if (noCommentDiv) {
            noCommentDiv.style.display = 'block';
        }
        console.log('No comments to display');
    } else {
        if (noCommentDiv) {
            noCommentDiv.style.display = 'none';
        }

        commentsData.comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.className = 'show-comment-item';
            commentItem.id = `${comment.id || ''}`; // 前缀确保id以字母开头
            commentItem.setAttribute('data-comment-id', comment.id || ''); // 真实id存在数据属性
            commentItem.setAttribute('data-liked', 'false');

            let formattedTime = '';
            if (comment.comment_time) {
                try {
                    const date = new Date(comment.comment_time);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    formattedTime = `${year}年${month}月${day}日 ${hours}:${minutes}`;
                } catch (e) {
                    formattedTime = comment.comment_time;
                }
            }

            commentItem.innerHTML = `
                <div class="show-comment-item-user" id="${comment.user_id || ''}">
                    <div class="show-comment-item-user-avatar">
                        <img src="${comment.avatar_url || ''}" alt="avatar">
                    </div>
                    <div class="show-comment-item-user-name">${comment.username || '匿名用户'}</div>
                </div>
                <div class="show-comment-item-content">${comment.comment_content || ''}</div>
                <div class="show-comment-item-footer">
                    <div class="show-comment-item-footer-time">${formattedTime}</div>
                    <div class="show-comment-item-footer-like">
                        <span class="litter-icon" title="赞" onclick="toggleCommentLike(event, this)" style="cursor: pointer;">
                            <i class="iconfont icon-zan"></i>
                            <a class="like-count">${comment.like_count || 0}</a>
                        </span>
                    </div>
                </div>
            `;

            showCommentContent.appendChild(commentItem);
        });
    }

    renderPagination(commentsData.total_pages || 1, commentsData.current_page || 1);
}

// 渲染分页
function renderPagination(totalPages, currentPage) {
    console.log('Rendering pagination:', totalPages, currentPage);

    const pagination = document.getElementById('show-comment-page');
    if (!pagination) {
        console.error('Pagination element not found');
        return;
    }

    const pageNumWrap = document.getElementById('page-num-wrap');
    if (!pageNumWrap) {
        console.error('Page num wrap element not found');
        return;
    }

    pageNumWrap.innerHTML = '';

    const prevBtn = document.getElementById('prev-page');
    if (prevBtn) {
        prevBtn.style.display = currentPage <= 1 ? 'none' : 'block';
        prevBtn.style.cursor = currentPage <= 1 ? 'not-allowed' : 'pointer';
        prevBtn.style.color = currentPage <= 1 ? '#ccc' : 'black';

        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);

        if (currentPage > 1) {
            newPrevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    fetchAndRenderComments(currentPage - 1);
                }
            });
        }
    }

    const nextBtn = document.getElementById('next-page');
    if (nextBtn) {
        nextBtn.style.display = 'block';
        nextBtn.style.cursor = currentPage >= totalPages ? 'not-allowed' : 'pointer';
        nextBtn.style.color = currentPage >= totalPages ? '#ccc' : 'black';

        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

        if (currentPage < totalPages) {
            newNextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    fetchAndRenderComments(currentPage + 1);
                }
            });
        }
    }

    const pageNumbers = [];
    pageNumbers.push(1);

    if (totalPages > 1) {
        if (currentPage <= 3) {
            for (let i = 2; i <= Math.min(4, totalPages); i++) {
                pageNumbers.push(i);
            }
            if (totalPages > 4) {
                pageNumbers.push('...');
                pageNumbers.push(totalPages - 1);
                pageNumbers.push(totalPages);
            }
        } else if (currentPage >= totalPages - 2) {
            pageNumbers.push('...');
            pageNumbers.push(totalPages - 3);
            pageNumbers.push(totalPages - 2);
            pageNumbers.push(totalPages - 1);
            pageNumbers.push(totalPages);
        } else {
            pageNumbers.push('...');
            pageNumbers.push(currentPage - 1);
            pageNumbers.push(currentPage);
            pageNumbers.push(currentPage + 1);
            pageNumbers.push('...');
            pageNumbers.push(totalPages - 1);
            pageNumbers.push(totalPages);
        }
    }

    pageNumbers.forEach(pageNum => {
        const pageNumElement = document.createElement('div');
        pageNumElement.className = `show-comment-page-num page-num ${pageNum === currentPage ? 'current-page' : ''}`;

        if (pageNum === '...') {
            pageNumElement.textContent = pageNum;
            pageNumElement.style.color = '#ccc';
            pageNumElement.style.cursor = 'default';
        } else {
            pageNumElement.textContent = pageNum;
            if (pageNum !== currentPage) {
                pageNumElement.addEventListener('click', () => {
                    fetchAndRenderComments(pageNum);
                });
            }
        }

        pageNumWrap.appendChild(pageNumElement);
    });
}

// 获取并渲染评论
async function fetchAndRenderComments(page) {
    try {
        console.log('Fetching and rendering comments for page:', page, 'rank type:', currentRankType);

        // ✅ 添加调试信息
        console.log('Current rankType:', currentRankType);
        console.log('Valid rank types:', ['soaring', 'newsong', 'hotsong', 'chinese', 'europe', 'korean', 'japanese']);

        if (!currentRankType || !['soaring', 'newsong', 'hotsong', 'chinese', 'europe', 'korean', 'japanese'].includes(currentRankType)) {
            console.error('Invalid rank type:', currentRankType);
            return;
        }

        const commentsData = await fetchRankComments(currentRankType, page);
        renderComments(commentsData, currentRankType);
    } catch (error) {
        console.error('Error fetching comments:', error);
        const showCommentContent = document.getElementById('show-comment-content');
        if (showCommentContent) {
            showCommentContent.innerHTML = '<div style="text-align: center; padding: 20px; color: red;">加载评论失败，请稍后重试</div>';
        }
        renderPagination(1, 1);
    }
}

// 通用 Cookie 读取函数
function getCookie(name) {
    const cookieStr = document.cookie;
    const matches = cookieStr.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
}

// CSRF 令牌获取
function getCsrfToken() {
    return getCookie('csrftoken');
}

// 提交评论到后端接口
async function submitRankComment(rankType, commentText) {
    const url = '/api/comment/';
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        alert('未发现 CSRF 令牌，请先登录或刷新页面');
        console.error('CSRF token missing');
        return null;
    }

    const user_id = getCookie('user_id');
    const username = getCookie('username');
    const avatar_url = getCookie('user_avatar') || getCookie('avatar_url') || '';

    if (!user_id || !username) {
        alert('请先登录后再评论');
        console.error('user_id 或 username 缺失', user_id, username);
        return null;
    }

    const payload = {
        user_id: user_id,
        username: username,
        avatar_url: avatar_url,
        rank_type: rankType,
        comment_content: commentText
    };


    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(payload),
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error('提交评论失败', response.status, data);
            const msg = data.msg || '提交评论失败';
            alert(msg);
            return null;
        }

        return data;
    } catch (error) {
        console.error('网络异常，提交评论失败', error);
        alert('网络异常，提交评论失败，请稍后重试');
        return null;
    }
}

// 绑定评论按钮点击事件
function bindCommentClick() {
    const commentBtn = document.getElementById('comment-btn-one');
    if (commentBtn) {
        commentBtn.addEventListener('click', async() => {
            const commentInput = document.querySelector('.comment-input');
            if (!commentInput) {
                console.error('评论输入框未找到');
                return;
            }

            const commentText = commentInput.value.trim();
            if (!commentText) {
                alert('请输入评论内容');
                return;
            }

            if (!currentRankType) {
                alert('当前榜单类型未定义，无法发表评论');
                return;
            }

            commentBtn.disabled = true;
            commentBtn.textContent = '正在提交...';

            const result = await submitRankComment(currentRankType, commentText);

            commentBtn.disabled = false;
            commentBtn.textContent = '发表评论';

            if (result && result.comment) {
                alert('评论发表成功');
                commentInput.value = '';

                // 立即将新评论插入到页面顶部（无需重新加载全部）
                const showCommentContent = document.querySelector('.show-comment-content');
                if (showCommentContent) {
                    const newComment = result.comment;
                    const commentItem = document.createElement('div');
                    commentItem.className = 'show-comment-item';
                    commentItem.id = `c${newComment.id}`; // c前缀 + 自增id
                    commentItem.setAttribute('data-comment-id', newComment.id);
                    commentItem.setAttribute('data-liked', 'false');

                    // 格式化时间
                    let formattedTime = newComment.comment_time;
                    try {
                        const date = new Date(newComment.comment_time);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        formattedTime = `${year}年${month}月${day}日 ${hours}:${minutes}`;
                    } catch (e) {
                        formattedTime = newComment.comment_time;
                    }

                    commentItem.innerHTML = `
                        <div class="show-comment-item-user" id="${newComment.user_id || ''}">
                            <div class="show-comment-item-user-avatar">
                                <img src="${newComment.avatar_url || ''}" alt="avatar">
                            </div>
                            <div class="show-comment-item-user-name">${newComment.username || '匿名用户'}</div>
                        </div>
                        <div class="show-comment-item-content">${newComment.comment_content || ''}</div>
                        <div class="show-comment-item-footer">
                            <div class="show-comment-item-footer-time">${formattedTime}</div>
                            <div class="show-comment-item-footer-like">
                                <span class="litter-icon" title="赞" onclick="toggleCommentLike(event, this)" style="cursor: pointer;">
                                    <i class="iconfont icon-zan"></i>
                                    <a class="like-count">${newComment.like_count || 0}</a>
                                </span>
                            </div>
                        </div>
                    `;

                    // 插入到列表顶部
                    showCommentContent.insertBefore(commentItem, showCommentContent.firstChild);
                    console.log('✅ 新评论已加入列表，ID:', newComment.id);
                }
            }
        });
    }
}

var currentMainSection = 'main-one';
// 页面加载完成后执行 - 统一入口
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded ===');

    // 1. 初始化所有榜单数据缓存
    initAllRankData();

    // 2. 初始化飙升榜显示
    initSoaringRank();

    // 3. 绑定榜单点击事件
    bindRankClick();

    // 4. 绑定评论按钮事件
    bindCommentClick();

    // 5. 初始加载评论
    console.log('Initial load comments');
    fetchAndRenderComments(1);
    // ====================新增：导航栏点击切换内容====================
    var navLinks = document.querySelectorAll('.header ul li a');

    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            var navText = this.textContent.trim();
            console.log('点击导航:', navText);

            // 根据导航文字切换不同的内容区域
            if (navText === '推荐') {
                switchMainContent('main-one');
            } else if (navText === '排行榜') {
                switchMainContent('main-two');
            } else if (navText === '搜索') {
                switchMainContent('main-three');
            }
        });
    });

    // 定义切换函数
    window.switchMainContent = function(sectionId) {
        console.log('切换到:', sectionId);

        // 获取所有内容区域
        var mainOne = document.querySelector('.main-one');
        var mainTwo = document.querySelector('.main-two');
        var mainThree = document.querySelector('.main-three');

        // 隐藏所有内容区域
        if (mainOne) mainOne.style.display = 'none';
        if (mainTwo) mainTwo.style.display = 'none';
        if (mainThree) mainThree.style.display = 'none';

        // 显示目标内容区域
        if (sectionId === 'main-one') {
            if (mainOne) mainOne.style.display = 'block';
            currentMainSection = 'main-one';
        } else if (sectionId === 'main-two') {
            if (mainTwo) mainTwo.style.display = 'block';
            currentMainSection = 'main-two';
        } else if (sectionId === 'main-three') {
            if (mainThree) mainThree.style.display = 'block';
            currentMainSection = 'main-three';
        }

        console.log('当前显示:', currentMainSection);
    };
});

// ============================================================================
// 【新增】记录音乐播放到数据库 - 添加到用户喜爱表
// ============================================================================
function recordMusicPlayToDatabase(musicId) {
    try {
        // 获取用户ID
        const userId = getCookie('user_id');
        if (!userId) {
            console.warn('⚠️ 用户未登录，跳过записи播放记录');
            return;
        }

        console.log('📝 正在记录播放到数据库...');
        console.log('  - 音乐 ID:', musicId);
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

// ============================================================================
// 播放音乐函数（通过 postMessage 与父窗口通信）
// ============================================================================
function playMusic(musicId, rankType = null) {
    console.log('\n========================================');
    console.log('=== 准备播放音乐 ===');
    console.log('========================================');
    console.log('音乐 ID:', musicId);
    console.log('排行榜类型参数:', rankType);

    // 🎵【新增】记录音乐播放到用户喜爱数据库
    recordMusicPlayToDatabase(musicId);
    console.log('当前主区域:', currentMainSection);
    console.log('当前排行榜类型:', currentRankType);

    // ★改进★：优先判断 currentRankType（如果已设置则表示在排行榜）
    // 如果没有传入 rankType 参数，则使用 currentRankType
    const detectedRankType = rankType || (currentMainSection === 'main-two' ? currentRankType : null);

    // ★★★ 新增：新歌榜特殊处理 - 只更新数据库，不播放音乐 ★★★
    if (detectedRankType === 'newsong' && currentMainSection === 'main-two') {
        console.log('检测到新歌榜点击，使用数据更新端点（不播放）');

        // 从DOM中获取author_id和music_name（在同一行中）
        const rankTableItem = event.target.closest('.rank-table-item');
        if (!rankTableItem) {
            console.error('✗ 错误：找不到歌曲行信息');
            alert('✗ 获取歌曲信息失败');
            return;
        }

        const singerLink = rankTableItem.querySelector('.rank-table-item-singer a');
        const songLink = rankTableItem.querySelector('.rank-table-item-song a');

        const authorId = singerLink ? singerLink.id : null;
        const musicName = songLink ? songLink.textContent : null;

        if (!authorId) {
            console.error('✗ 错误：找不到创作者ID');
            alert('✗ 获取创作者信息失败');
            return;
        }

        if (!musicName) {
            console.error('✗ 错误：找不到歌曲名称');
            alert('✗ 获取歌曲名称失败');
            return;
        }

        // 从cookie中获取user_id
        const userId = getCookie('user_id');
        if (!userId) {
            console.error('✗ 错误：用户未登录或user_id缺失');
            alert('✗ 用户信息缺失，请刷新页面后重试');
            return;
        }

        console.log('✓ 获取到必要信息:');
        console.log('  - 音乐 ID:', musicId);
        console.log('  - 音乐名：', musicName);
        console.log('  - 创作者 ID:', authorId);
        console.log('  - 用户 ID:', userId);

        // 调用数据更新端点（不播放音乐）
        fetch('/api/newsong/update-data/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    music_id: musicId.toString(),
                    music_name: musicName.toString(),
                    user_id: userId.toString(),
                    author_id: authorId.toString()
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('✓ 数据更新响应:', data);
                if (data.success || data.code === 200) {
                    console.log('✓ 新歌榜数据已更新');
                    // 可选：显示成功提示
                    // alert('✓ 已记录您的播放');
                } else {
                    console.error('✗ 数据更新失败:', data.msg || '未知错误');
                    alert('✗ 数据更新失败: ' + (data.msg || '未知错误'));
                }
            })
            .catch(error => {
                console.error('✗ 数据更新请求出错:', error);
                alert('✗ 请求出错: ' + error.message);
            });

        console.log('========================================\n');
        return;
    }

    if (detectedRankType && currentMainSection === 'main-two') {
        console.log('检测到在排行榜页面 (main-two)');

        // 验证榜单类型是否有效
        const validRankTypes = ['soaring', 'newsong', 'hotsong', 'chinese', 'europe', 'korean', 'japanese'];
        if (!validRankTypes.includes(detectedRankType)) {
            console.error('✗ 错误：无效的榜单类型:', detectedRankType);
            alert('无效的排行榜类型');
            return;
        }

        // 向父窗口发送消息（使用 play_rank_music 类型）
        if (!window.parent || window === window.parent) {
            console.error('✗ 错误：当前页面不在 iframe 中');
            alert('页面结构错误，请刷新页面重试');
            return;
        }

        const message = {
            type: 'play_rank_music',
            music_id: musicId.toString(),
            rank_type: detectedRankType
        };

        console.log('✓ 准备发送消息给父窗口:');
        console.log('  - 消息类型:', message.type);
        console.log('  - 音乐 ID:', message.music_id);
        console.log('  - 排行榜类型:', message.rank_type);

        try {
            window.parent.postMessage(message, '*');
            console.log('✓ 消息发送成功');
        } catch (error) {
            console.error('✗ 发送消息失败:', error);
            alert('发送播放请求失败，请刷新页面重试');
        }
    } else {
        console.log('检测到在推荐页面或其他页面:', currentMainSection);

        // 在推荐页面，不传 rank_type，查询 music_info 表
        if (!window.parent || window === window.parent) {
            console.error('✗ 错误：当前页面不在 iframe 中');
            return;
        }

        const message = {
            type: 'play_music_url',
            music_id: musicId.toString()
        };

        console.log('✓ 准备发送消息给父窗口:');
        console.log('  - 消息类型:', message.type);
        console.log('  - 音乐 ID:', message.music_id);

        try {
            window.parent.postMessage(message, '*');
            console.log('✓ 消息发送成功');
        } catch (error) {
            console.error('✗ 发送消息失败:', error);
        }
    }

    console.log('========================================\n');
}


// 添加到播放列表函数
function addToPlaylist(musicId) {
    console.log('添加到播放列表，ID:', musicId);
    console.log('当前排行榜类型:', currentRankType);

    // 调用后端接口添加到播放列表
    fetch('/api/add_to_playlist/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                music_id: musicId.toString(),
                rank_type: currentRankType // 传递当前排行榜类型
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('添加成功:', data);
                alert(`已将"${data.music_name}"添加到播放列表`);
            } else {
                console.error('添加失败:', data.msg);
                alert('添加失败：' + data.msg);
            }
        })
        .catch(error => {
            console.error('请求错误:', error);
            alert('网络错误，请稍后重试');
        });
}

// 绑定精彩推荐的播放按钮点击事件
document.addEventListener('DOMContentLoaded', function() {
    // 使用事件委托处理动态生成的元素
    document.body.addEventListener('click', function(e) {
        // 检查是否点击了精彩推荐的播放按钮
        if (e.target.classList.contains('play-btn') ||
            (e.target.parentElement && e.target.parentElement.classList.contains('play-btn'))) {

            e.preventDefault();
            e.stopPropagation();

            const playBtn = e.target.classList.contains('play-btn') ? e.target : e.target.parentElement;
            const musicId = playBtn.getAttribute('data-music-id');

            if (musicId) {
                console.log('\n=== 点击精彩推荐播放按钮 ===');
                console.log('音乐 ID:', musicId);
                console.log('window.globalCurrentMusicId:', window.globalCurrentMusicId);
                console.log('类型对比:', typeof window.globalCurrentMusicId, typeof musicId);

                // 检查是否是当前正在播放的歌曲
                if (window.globalCurrentMusicId === String(musicId)) {
                    // 如果是当前歌曲，点击应该暂停/继续播放
                    console.log('当前正在播放这首歌曲，切换播放状态');
                    // 通过 postMessage 通知父窗口切换暂停状态
                    if (window.parent) {
                        window.parent.postMessage({
                            type: 'toggle_play_pause'
                        }, '*');
                        console.log('已发送 toggle_play_pause 消息给父窗口');
                    }
                } else {
                    // 如果不是当前歌曲，播放新歌曲
                    console.log('播放新歌曲');

                    // 立即更新全局当前播放 ID（在发送消息之前）
                    window.globalCurrentMusicId = String(musicId);
                    console.log('已更新 window.globalCurrentMusicId:', window.globalCurrentMusicId);

                    playMusic(musicId);
                }
                console.log('=================================\n');
            }
        }

        // 检查是否点击了热门推荐的图片容器（也可以播放）
        if (e.target.closest('.img-box-left')) {
            const container = e.target.closest('.img-box-left');
            const musicId = container.getAttribute('id');

            if (musicId) {
                console.log('点击热门推荐，音乐 ID:', musicId);
                playMusic(musicId);
            }
        }

        // 检查是否点击了排行榜的播放按钮（小图标）
        if (e.target.closest('.litter-icon')) {
            const litterIcon = e.target.closest('.litter-icon');
            const parentOperate = litterIcon.closest('.rank-table-item-operate');

            if (parentOperate) {
                e.preventDefault();
                e.stopPropagation();

                const item = e.target.closest('.rank-table-item');
                if (item) {
                    const songLink = item.querySelector('.rank-table-item-song a');
                    if (songLink && songLink.id) {
                        const musicId = songLink.id;
                        console.log('点击排行榜播放按钮，音乐 ID:', musicId);
                        playMusic(musicId);
                    }
                }
            }
        }
    });
});

// 监听来自子窗口的消息（如果在 iframe 中）
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'play_music_request') {
        const musicId = event.data.music_id;
        console.log('收到子窗口播放请求，音乐 ID:', musicId);
        playMusic(musicId);
    }

    // 监听父窗口发送的正在播放状态
    if (event.data && event.data.type === 'music_playing') {
        console.log('收到父窗口播放状态同步，音乐 ID:', event.data.music_id);
        // 更新全局当前播放音乐 ID（从父窗口同步）
        window.globalCurrentMusicId = String(event.data.music_id || null);
    }
});

// ======================
// 通知父窗口调整 iframe 高度
// ======================
function notifyParentHeight() {
    if (window.parent && window.parent !== window) {
        // 计算实际高度
        const bodyHeight = document.body.scrollHeight;
        const htmlHeight = document.documentElement.scrollHeight;
        const height = Math.max(bodyHeight, htmlHeight, 800);


        try {
            window.parent.postMessage({
                type: 'resize',
                height: height
            }, '*');
        } catch (e) {
            console.error('[iframe] 发送消息失败:', e);
        }
    } else {
        console.log('[iframe] 不在 iframe 中，无需通知');
    }
}

// 页面加载完成后立即通知一次
document.addEventListener('DOMContentLoaded', function() {
    console.log('[iframe] DOMContentLoaded');
    setTimeout(notifyParentHeight, 100);
    setTimeout(notifyParentHeight, 300);
    setTimeout(notifyParentHeight, 500);
});

// 窗口加载完成后通知
window.addEventListener('load', function() {
    console.log('[iframe] Window loaded');
    notifyParentHeight();
    setTimeout(notifyParentHeight, 200);
    setTimeout(notifyParentHeight, 500);
});

// 使用 MutationObserver 持续监控 DOM 变化
if (window.MutationObserver) {
    let timeoutId = null;

    const observer = new MutationObserver(function(mutations) {
        // 防抖处理
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(function() {
            notifyParentHeight();
        }, 200);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
        attributeOldValue: true,
        characterDataOldValue: true
    });
}


// 定期通知（防止遗漏）
setInterval(notifyParentHeight, 1000);
// 监听来自子窗口的消息（如果在 iframe 中）
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'play_music_request') {
        const musicId = event.data.music_id;
        console.log('收到子窗口播放请求，音乐 ID:', musicId);
        playMusic(musicId);
    }
});

// ======================
// 新增：强制通知父窗口调整高度
// ======================
function notifyParentHeight() {
    if (window.parent && window.parent !== window) {
        // 计算实际高度
        const bodyHeight = document.body.scrollHeight;
        const htmlHeight = document.documentElement.scrollHeight;
        const height = Math.max(bodyHeight, htmlHeight, 800);


        try {
            window.parent.postMessage({
                type: 'resize',
                height: height
            }, '*');
        } catch (e) {
            console.error('[iframe] 发送消息失败:', e);
        }
    } else {
        console.log('[iframe] 不在 iframe 中，无需通知');
    }
}

// DOM 加载完成后立即通知
document.addEventListener('DOMContentLoaded', function() {
    console.log('[iframe] DOMContentLoaded');
    setTimeout(notifyParentHeight, 100);
    setTimeout(notifyParentHeight, 300);
    setTimeout(notifyParentHeight, 500);
});

// 窗口加载完成后通知
window.addEventListener('load', function() {
    console.log('[iframe] Window loaded');
    notifyParentHeight();
    setTimeout(notifyParentHeight, 200);
    setTimeout(notifyParentHeight, 500);
});

// 使用 MutationObserver 持续监控 DOM 变化
if (window.MutationObserver) {
    let timeoutId = null;

    const observer = new MutationObserver(function(mutations) {
        // 防抖处理
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(notifyParentHeight, 100);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });

    // 初始状态
    const containerEl = document.querySelector('.main-content-one');
    if (containerEl) {
        containerEl.style.setProperty('--mid-width', '0px');
        containerEl.style.setProperty('--side-width', '0px');
    }

    init();
}

// 定期通知（作为备用方案）
let notifyCount = 0;
const notifyInterval = setInterval(function() {
    notifyCount++;
    notifyParentHeight();

    // 最多执行 10 次
    if (notifyCount >= 10) {
        clearInterval(notifyInterval);
        console.log('[iframe] 停止定期通知');
    }
}, 1000);

// ======================
// 点击评论按钮滚动到评论区域（事件委托方式）
// ======================
console.log('\n' + '='.repeat(60));
console.log('🔍 绑定评论按钮事件（事件委托）');
console.log('='.repeat(60) + '\n');

document.addEventListener('click', function(e) {
    const commentBtn = e.target.closest('#comment');
    console.log('👆 检测到点击事件，目标元素:', e.target.tagName, 'ID:', e.target.id, 'Class:', e.target.className);

    if (commentBtn) {
        console.log('\n' + '='.repeat(60));
        console.log('✅ 匹配到评论按钮 #comment');
        console.log('='.repeat(60) + '\n');

        e.preventDefault();
        const commentBox = document.getElementById('comment-box-one');

        console.log('评论按钮元素:', commentBtn ? '✓ 找到' : '✗ 未找到');
        console.log('评论框元素:', commentBox ? '✓ 找到' : '✗ 未找到');

        if (commentBox) {
            // 获取评论框的位置
            const commentBoxRect = commentBox.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetPosition = commentBoxRect.top + scrollTop - 100; // 减去 100px 的偏移量

            console.log('评论框位置信息:', {
                top: commentBoxRect.top,
                bottom: commentBoxRect.bottom,
                scrollTop: scrollTop,
                targetPosition: targetPosition
            });

            // 平滑滚动到评论区域
            if (window.parent && window.parent !== window) {
                // 如果在 iframe 中，通知父窗口滚动
                console.log('📤 向父窗口发送滚动消息');
                window.parent.postMessage({
                    type: 'scroll_to_comment',
                    position: targetPosition
                }, '*');
            } else {
                // 如果不在 iframe 中，直接滚动
                console.log('📜 直接执行页面滚动');
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }

            // 同时触发评论输入框聚焦
            setTimeout(function() {
                const commentInput = commentBox.querySelector('.comment-input');
                if (commentInput) {
                    console.log('🎯 聚焦评论输入框');
                    commentInput.focus();
                }
            }, 800);
        } else {
            console.error('❌ 未找到评论框 #comment-box-one');
        }
    }
});

// 排行榜数据加载时也通知
const originalFetch = window.fetch;
if (originalFetch) {
    window.fetch = function(...args) {
        return originalFetch.apply(this, args).then(response => {
            response.clone().json().then(data => {
                console.log('[iframe] AJAX 请求完成，准备通知父窗口');
                setTimeout(notifyParentHeight, 100);
            }).catch(() => {});
            return response;
        });
    };
}
// ======================
// 新增：播放全部功能
// ======================
document.addEventListener('DOMContentLoaded', function() {
    const playAllBtn = document.getElementById('play-all');

    if (playAllBtn) {
        playAllBtn.addEventListener('click', function(e) {
            e.preventDefault();

            console.log('点击了播放全部按钮');

            // 获取当前排行榜类型
            const currentRankType = getCurrentRankType();
            console.log('当前排行榜类型:', currentRankType);

            // 获取当前排行榜的所有音乐数据
            const allMusicList = getAllMusicFromCurrentRank(currentRankType);

            if (!allMusicList || allMusicList.length === 0) {
                alert('当前排行榜暂无可播放的音乐');
                return;
            }

            console.log('获取到音乐列表:', allMusicList.length, '首');

            // 添加到播放列表并播放第一首
            addAllToPlaylistAndPlay(allMusicList);
        });
    }
});
// 获取当前排行榜类型
function getCurrentRankType() {
    const menuItems = document.querySelectorAll('.menu-left div');
    let currentType = 'soaring'; // 默认飙升榜

    menuItems.forEach(item => {
        if (item.classList.contains('menu-active')) {
            const id = item.getAttribute('id');
            switch (id) {
                case 'soaring':
                    currentType = 'soaring';
                    break;
                case 'newsong':
                    currentType = 'newsong';
                    break;
                case 'hotsong':
                    currentType = 'hotsong';
                    break;
                case 'chinese':
                    currentType = 'chinese';
                    break;
                case 'europe':
                    currentType = 'europe';
                    break;
                case 'korean':
                    currentType = 'korean';
                    break;
                case 'japanese':
                    currentType = 'japanese';
                    break;
            }
        }
    });

    return currentType;
}

// 从当前排行榜获取所有音乐数据
function getAllMusicFromCurrentRank(rankType) {
    const musicList = [];

    // 方法 1: 从已渲染的 DOM 中获取
    const rankTableContent = document.querySelector('.rank-table-content');
    if (rankTableContent) {
        const items = rankTableContent.querySelectorAll('.rank-table-item');

        items.forEach(item => {
            try {
                const songLink = item.querySelector('.rank-table-item-song a');
                const artistLink = item.querySelector('.rank-table-item-artist a');
                const albumLink = item.querySelector('.rank-table-item-album a');
                const playBtn = item.querySelector('.litter-icon .play-icon');

                if (songLink && songLink.id) {
                    musicList.push({
                        music_id: songLink.id,
                        music_name: songLink.textContent || '',
                        author: artistLink ? artistLink.textContent : '',
                        album: albumLink ? albumLink.textContent : '',
                        album_cover: playBtn ? playBtn.getAttribute('data-cover') || '/static/imgs/default-cover.jpg' : '/static/imgs/default-cover.jpg'
                    });
                }
            } catch (error) {
                console.error('解析音乐项失败:', error);
            }
        });
    }

    // 方法 2: 如果 DOM 中没有，从缓存数据中获取
    if (musicList.length === 0 && window.initialAllRankData) {
        const rankData = window.initialAllRankData[rankType];

        if (rankData && Array.isArray(rankData)) {
            rankData.forEach(music => {
                musicList.push({
                    music_id: music.music_id.toString(),
                    music_name: music.music_name || '',
                    author: music.author || '',
                    album: music.album || '',
                    album_cover: music.album_cover || '/static/imgs/default-cover.jpg'
                });
            });
        }
    }

    return musicList;
}

// 添加所有音乐到播放列表并播放
function addAllToPlaylistAndPlay(musicList) {
    if (!musicList || musicList.length === 0) {
        console.error('音乐列表为空');
        return;
    }

    console.log('开始添加所有音乐到播放列表，共', musicList.length, '首');

    // 向父窗口发送消息，添加所有音乐到播放列表
    if (window.parent && window.parent !== window) {
        // 先清空播放列表（可选）
        window.parent.postMessage({
            type: 'clear_playlist'
        }, '*');

        // 逐首添加（延迟发送，避免阻塞）
        musicList.forEach((music, index) => {
            setTimeout(() => {
                window.parent.postMessage({
                    type: 'add_to_playlist_batch',
                    music: music
                }, '*');

                console.log('已添加第', index + 1, '首:', music.music_name);

                // 如果是第一首，立即播放
                if (index === 0) {
                    window.parent.postMessage({
                        type: 'play_music_url',
                        music_id: music.music_id.toString()
                    }, '*');

                    console.log('开始播放第一首:', music.music_name);
                }

                // 如果是最后一首，显示提示
                if (index === musicList.length - 1) {
                    setTimeout(() => {
                        console.log('所有音乐已添加完成');
                        // 可以在这里显示一个成功提示
                    }, 500);
                }
            }, index * 50); // 每首间隔 50ms
        });
    } else {
        // 如果不在 iframe 中，直接处理
        console.warn('当前不在 iframe 中，无法与父窗口通信');
    }
}
// ★新增：播放全部按钮事件
$('#play-all').click(function() {
    console.log('\n========================================');
    console.log('=== 点击播放全部 ===');
    console.log('========================================');

    // 获取当前活跃的榜单 ID
    const activeMenu = $('.menu-left .menu-active');
    if (!activeMenu || activeMenu.length === 0) {
        console.error('未找到当前选中的榜单');
        alert('请先选择一个排行榜');
        return;
    }

    const rankType = activeMenu.attr('id');
    console.log('当前榜单类型:', rankType);

    // 获取当前排行榜的所有音乐数据
    const currentRankData = window.currentRankData || [];
    console.log('当前排行榜音乐数量:', currentRankData.length);

    if (currentRankData.length === 0) {
        console.error('当前排行榜无音乐数据');
        alert('当前排行榜暂无音乐');
        return;
    }

    // ★关键修改：不清空播放列表，直接批量添加
    if (window.parent) {
        console.log('准备发送批量添加消息给父窗口...');

        // 依次添加所有音乐到播放列表（通过后端查询完整信息）
        currentRankData.forEach((music, index) => {
            const message = {
                type: 'add_rank_music_to_playlist',
                music_id: music.music_id.toString(),
                rank_type: rankType,
                index: index,
                total: currentRankData.length
            };

            window.parent.postMessage(message, '*');
            console.log(`已发送添加音乐 ${index + 1}/${currentRankData.length}:`, music.music_name);
        });

        console.log('✓ 所有音乐添加消息已发送');

        // 延迟一下，确保所有音乐都已添加到播放列表
        setTimeout(() => {
            const firstMusic = currentRankData[0];
            console.log('\n准备播放第一首音乐:', firstMusic.music_name);

            // 使用排行榜播放模式播放第一首
            window.parent.postMessage({
                type: 'play_rank_music',
                music_id: firstMusic.music_id.toString(),
                rank_type: rankType
            }, '*');

            console.log('✓ 已发送播放第一首的消息');
            console.log('========================================\n');
        }, 1000);
    } else {
        console.error('不在 iframe 中，无法发送消息');
        alert('页面结构错误，请刷新页面重试');
    }
});
// 页面加载完成后初始化
$(document).ready(function() {
    // ★新增：播放全部按钮事件
    $('#play-all').click(function() {
        console.log('\n========================================');
        console.log('=== 点击播放全部 ===');
        console.log('========================================');

        // 获取当前活跃的榜单 ID
        const activeMenu = $('.menu-left .menu-active');
        if (!activeMenu || activeMenu.length === 0) {
            console.error('未找到当前选中的榜单');
            alert('请先选择一个排行榜');
            return;
        }

        const rankType = activeMenu.attr('id');
        console.log('当前榜单类型:', rankType);

        // 获取当前排行榜的所有音乐数据
        const currentRankData = window.currentRankData || [];
        console.log('当前排行榜音乐数量:', currentRankData.length);

        if (currentRankData.length === 0) {
            console.error('当前排行榜无音乐数据');
            alert('当前排行榜暂无音乐');
            return;
        }

        // 向父窗口发送批量添加消息
        if (window.parent) {
            console.log('准备发送批量添加消息给父窗口...');

            // 先清空播放列表
            window.parent.postMessage({
                type: 'clear_playlist'
            }, '*');
            console.log('已发送清空播放列表消息');

            // 延迟一下，确保播放列表已清空
            setTimeout(() => {
                // 依次添加所有音乐到播放列表
                currentRankData.forEach((music, index) => {
                    const message = {
                        type: 'add_to_playlist_batch',
                        music: {
                            music_id: music.music_id.toString(),
                            music_name: music.music_name,
                            author: music.author,
                            album_cover: music.album_cover || '/static/imgs/default_cover.jpg',
                            url: ''
                        },
                        index: index
                    };

                    window.parent.postMessage(message, '*');
                    console.log(`已发送添加音乐 ${index + 1}/${currentRankData.length}:`, music.music_name);
                });

                console.log('✓ 所有音乐已添加到播放列表');

                // 最后发送播放第一首的指令
                setTimeout(() => {
                    const firstMusic = currentRankData[0];
                    console.log('\n准备播放第一首音乐:', firstMusic.music_name);

                    // 使用排行榜播放模式
                    window.parent.postMessage({
                        type: 'play_rank_music',
                        music_id: firstMusic.music_id.toString(),
                        rank_type: rankType
                    }, '*');

                    console.log('✓ 已发送播放第一首的消息');
                    console.log('========================================\n');
                }, 500);
            }, 200);
        } else {
            console.error('不在 iframe 中，无法发送消息');
            alert('页面结构错误，请刷新页面重试');
        }
    });

});
// ======================
// 绑定所有播放按钮点击事件
// ======================
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded: 绑定播放按钮事件 ===');

    // 使用事件委托处理动态生成的元素
    document.body.addEventListener('click', function(e) {
        console.log('检测到点击事件，目标:', e.target.className);

        // 1️⃣ 检查是否点击了精彩推荐的播放按钮
        if (e.target.classList.contains('play-btn') ||
            (e.target.parentElement && e.target.parentElement.classList.contains('play-btn'))) {

            e.preventDefault();
            e.stopPropagation();

            const playBtn = e.target.classList.contains('play-btn') ? e.target : e.target.parentElement;
            const musicId = playBtn.getAttribute('data-music-id');

            if (musicId) {
                console.log('✓ 点击精彩推荐播放按钮，音乐 ID:', musicId);
                playMusic(musicId); // 不传 rankType，查询 music_info 表
            } else {
                console.warn('✗ 未找到 music_id');
            }
        }

        // 2️⃣ 检查是否点击了热门推荐的图片容器
        if (e.target.closest('.img-box-left')) {
            const container = e.target.closest('.img-box-left');
            const musicId = container.getAttribute('id');

            if (musicId) {
                console.log('✓ 点击热门推荐图片，音乐 ID:', musicId);
                playMusic(musicId); // 不传 rankType，查询 music_info 表
            } else {
                console.warn('✗ 未找到 music_id');
            }
        }

        // 3️⃣ ★关键★：检查是否点击了排行榜的播放按钮（小图标）
        if (e.target.closest('.litter-icon')) {
            const litterIcon = e.target.closest('.litter-icon');
            const parentOperate = litterIcon.closest('.rank-table-item-operate');

            if (parentOperate) {
                e.preventDefault();
                e.stopPropagation();

                const item = e.target.closest('.rank-table-item');
                if (item) {
                    const songLink = item.querySelector('.rank-table-item-song a');
                    if (songLink && songLink.id) {
                        const musicId = songLink.id;
                        // ★关键★：使用当前的 currentRankType
                        console.log('✓ 点击排行榜播放按钮');
                        console.log('  - 音乐 ID:', musicId);
                        console.log('  - 当前排行榜:', currentRankType);
                        console.log('  - 将查询数据库:', currentRankType + '_rank');

                        // ★关键★：传递 currentRankType 给 playMusic 函数
                        playMusic(musicId, currentRankType);
                    } else {
                        console.warn('✗ 未找到歌曲链接');
                    }
                } else {
                    console.warn('✗ 未找到排行榜项');
                }
            }
        }
    });

    // 这里模块在后面由全局搜索区域实现，先移除旧的早期冗余代码
});

// 已删除旧版重复搜索实现，使用后续全局搜索模块。
// 注：搜索功能已移至 music_hall.html 中的内联 <script> 标签
// 这样可以确保搜索模块随 HTML 一起加载，避免外部 JS 文件加载问题

// ============================================================================
// 👍 评论点赞功能
// ============================================================================
// ============================================================================
// 👍 评论点赞功能 - 计数加一/减一 (切换点赞状态)
// ============================================================================
function toggleCommentLike(event, likeBtn) {
    event.preventDefault();
    event.stopPropagation();

    // 获取评论项
    const commentItem = likeBtn.closest('.show-comment-item');
    if (!commentItem) {
        console.error('❌ 无法找到评论项');
        return;
    }

    const commentId = commentItem.getAttribute('data-comment-id');
    const isLiked = commentItem.getAttribute('data-liked') === 'true';

    if (!commentId) {
        console.error('❌ 评论 ID 未找到');
        return;
    }

    // 获取点赞数元素
    const likeCountElement = likeBtn.querySelector('.like-count');
    if (!likeCountElement) {
        console.error('❌ 赞数元素未找到');
        return;
    }

    const currentCount = parseInt(likeCountElement.textContent) || 0;

    // 决定是加一还是减一
    const isAdding = !isLiked;
    const newCount = isAdding ? currentCount + 1 : Math.max(0, currentCount - 1);

    console.log(`👍 ${isAdding ? '点赞' : '取消点赞'}`);
    console.log(`  - 评论 ID: ${commentId}`);
    console.log(`  - 排行榜类型: ${currentRankType}`);
    console.log(`  - 原赞数: ${currentCount}, 新赞数: ${newCount}`);

    // 立即更新前端显示
    likeCountElement.textContent = newCount;
    commentItem.setAttribute('data-liked', isAdding ? 'true' : 'false');

    // 更新样式
    if (isAdding) {
        likeBtn.style.color = '#ff4d4f';
    } else {
        likeBtn.style.color = '';
    }

    // 获取 CSRF token
    function getCsrfTokenForLike() {
        const name = 'csrftoken';
        const matches = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return matches ? decodeURIComponent(matches[1]) : null;
    }

    const csrfToken = getCsrfTokenForLike();

    // 调用后端 API 同步数据
    const method = isAdding ? 'POST' : 'DELETE';
    const url = `/api/comment/like/${commentId}/?rank_type=${encodeURIComponent(currentRankType)}`;

    fetch(url, {
            method: method,
            headers: {
                'X-CSRFToken': csrfToken || '',
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ 服务器同步成功，赞数:', data.like_count);
                // 更新为服务器返回的真实赞数
                likeCountElement.textContent = data.like_count || newCount;
            } else {
                console.error('❌ 服务器同步失败:', data.msg);
                // 恢复前端状态
                likeCountElement.textContent = currentCount;
                commentItem.setAttribute('data-liked', isLiked ? 'true' : 'false');
                likeBtn.style.color = isLiked ? '#ff4d4f' : '';
            }
        })
        .catch(error => {
            console.error('❌ 网络请求异常:', error);
            // 恢复前端状态
            likeCountElement.textContent = currentCount;
            commentItem.setAttribute('data-liked', isLiked ? 'true' : 'false');
            likeBtn.style.color = isLiked ? '#ff4d4f' : '';
        });
}