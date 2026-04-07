// 管理员后台页面脚本 - 改进版本，支持真实API和数据库

document.addEventListener('DOMContentLoaded', function() {
    // 初始化菜单
    initMenu();

    // 更新实时时间
    updateTime();
    setInterval(updateTime, 1000);
});

// ============ 全局变量 ============
let currentPage = 1;
let currentPageType = 'all_music';
let currentSelectedUserId = null;
let currentSelectedUsername = null;
let currentMusicLibPage = 1;
let currentSelectedCreatorId = null;
let currentSelectedCreatorUsername = null;
let currentCreatorMusicLibPage = 1;
const rankTypeMap = {
    'all_music': 'all',
    'soaring_music': 'soaring',
    'new_music': 'newsong',
    'hot_music': 'hotsong',
    'mandarin_music': 'chinese',
    'western_music': 'america',
    'korean_music': 'korea',
    'japanese_music': 'japan',
    'soaring_comment': 'soaring',
    'new_comment': 'newsong',
    'hot_comment': 'hotsong',
    'mandarin_comment': 'chinese',
    'western_comment': 'america',
    'korean_comment': 'korea',
    'japanese_comment': 'japan'
};

/**
 * 初始化菜单事件
 */
function initMenu() {
    const menuTitles = document.querySelectorAll('.menu-title');

    menuTitles.forEach(title => {
        title.addEventListener('click', function(e) {
            e.preventDefault();
            const module = this.getAttribute('data-module');
            toggleSubmenu(module);
        });
    });

    // 处理菜单项点击
    const menuLinks = document.querySelectorAll('.submenu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            loadPage(page);

            // 更新活跃状态
            menuLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

/**
 * 切换子菜单显示/隐藏
 */
function toggleSubmenu(module) {
    const submenu = document.getElementById('submenu-' + module);
    const menuTitle = document.querySelector(`[data-module="${module}"]`);

    if (submenu && menuTitle) {
        const isHidden = submenu.style.display === 'none';

        // 隐藏所有其他菜单
        document.querySelectorAll('.submenu').forEach(menu => {
            menu.style.display = 'none';
        });

        // 移除所有菜单标题的 active 类
        document.querySelectorAll('.menu-title').forEach(title => {
            title.classList.remove('active');
        });

        // 显示当前菜单
        if (isHidden) {
            submenu.style.display = 'block';
            menuTitle.classList.add('active');
        }
    }
}

/**
 * 加载页面内容
 */
function loadPage(page) {
    const contentBody = document.getElementById('content-body');
    const pageTitle = document.getElementById('page-title');

    // 清空内容
    contentBody.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    // 获取页面标题
    const pageNames = {
        'all_music': '全部音乐数据',
        'soaring_music': '飙升榜数据',
        'new_music': '新歌榜数据',
        'hot_music': '热歌榜数据',
        'mandarin_music': '国语榜数据',
        'western_music': '欧美榜数据',
        'korean_music': '韩语榜数据',
        'japanese_music': '日语榜数据',
        'normal_user': '普通用户数据',
        'creator_user': '创作者用户数据',
        'user_community': '用户社区数据',
        'user_music_lib': '用户音乐库',
        'creator_music_lib': '创作者音乐库',
        'soaring_comment': '飙升榜评论',
        'new_comment': '新歌榜评论',
        'hot_comment': '热歌榜评论',
        'mandarin_comment': '国语榜评论',
        'western_comment': '欧美榜评论',
        'korean_comment': '韩语榜评论',
        'japanese_comment': '日语榜评论',
        'user_distribution': '用户分布分析',
        'music_popularity': '音乐热度分析',
        'rank_trend': '榜单趋势分析',
        'user_active': '用户活跃度',
        'like_distribution': '点赞分布分析',
        'comment_trend': '评论趋势分析'
    };

    pageTitle.textContent = pageNames[page] || '页面';
    currentPageType = page;
    currentPage = 1;

    // 模拟加载延迟
    setTimeout(() => {
        loadPageContent(page);
    }, 300);
}

/**
 * 加载具体页面内容
 */
function loadPageContent(page) {
    const contentBody = document.getElementById('content-body');

    switch (page) {
        // 音乐数据
        case 'all_music':
        case 'soaring_music':
        case 'new_music':
        case 'hot_music':
        case 'mandarin_music':
        case 'western_music':
        case 'korean_music':
        case 'japanese_music':
            loadMusicData(page);
            break;

            // 用户数据
        case 'normal_user':
        case 'creator_user':
        case 'user_community':
        case 'user_music_lib':
        case 'creator_music_lib':
            loadUserData(page);
            break;

            // 评论数据
        case 'soaring_comment':
        case 'new_comment':
        case 'hot_comment':
        case 'mandarin_comment':
        case 'western_comment':
        case 'korean_comment':
        case 'japanese_comment':
            loadCommentData(page);
            break;

            // 数据分析
        case 'user_distribution':
        case 'music_popularity':
        case 'rank_trend':
        case 'user_active':
        case 'like_distribution':
        case 'comment_trend':
            loadAnalysisData(page);
            break;

        default:
            contentBody.innerHTML = '<div class="empty-state"><p>页面未找到</p></div>';
    }
}

/**
 * 加载音乐数据 - 使用真实API
 */
function loadMusicData(page) {
    const contentBody = document.getElementById('content-body');
    const rankType = rankTypeMap[page];

    let html = `
        <div class="filter-bar">
            <div class="filter-item">
                <label>搜索:</label>
                <input type="text" placeholder="搜索音乐名称或歌手名..." id="music-search">
            </div>
            <button class="filter-btn" onclick="searchMusicData()">搜索</button>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>歌名</th>
                    <th>歌手</th>
                    <th>专辑</th>
                    <th>播放</th>
                    <th>点赞</th>
                    <th>评论</th>
                    <th>歌词</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody id="music-list">
                <tr>
                    <td colspan="9" style="text-align: center; padding: 20px;">加载中...</td>
                </tr>
            </tbody>
        </table>
        <div class="pagination" id="music-pagination"></div>
    `;

    contentBody.innerHTML = html;

    // 加载数据
    fetchMusicData(rankType, 1);
}

/**
 * 获取音乐数据 API
 */
function fetchMusicData(rankType, page) {
    const element = document.getElementById('music-search');
    const search = element ? element.value.trim() : '';

    fetch(`/api/admin/music-data/?rank_type=${rankType}&page=${page}&search=${search}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayMusicTable(data.data);
                displayPagination(data.total_pages, page, 'music');
            } else {
                alert('获取数据失败: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('获取数据出错');
        });
}

/**
 * 显示音乐表格
 */
function displayMusicTable(musics) {
    const musicList = document.getElementById('music-list');

    if (!musics || musics.length === 0) {
        musicList.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">暂无数据</td></tr>';
        return;
    }

    let html = '';
    musics.forEach((music, index) => {
                const lyrics = music.lyrics ? music.lyrics : '暂无歌词';
                const musicId = music.music_id || music.id;

                html += `
            <tr>
                <td>${index + 1}</td>
                <td>${music.music_name}</td>
                <td>${music.author}</td>
                <td>
                    ${music.album_cover ? `<img src="${music.album_cover}" style="width: 80px; height: 80px; border-radius: 5px;">` : '无'}
                </td>
                <td>${music.play_count || 0}</td>
                <td>${music.like_count || 0}</td>
                <td>${music.comment_count || 0}</td>
                <td>
                    <div style="max-width: 200px; max-height: 150px; overflow-y: auto; font-size: 12px; padding: 5px; border: 1px solid #ddd; border-radius: 3px; white-space: pre-wrap; word-wrap: break-word;">
                        ${lyrics}
                    </div>
                </td>
                <td>
                    <button class="action-btn" onclick="playMusic('${rankTypeMap[currentPageType]}', '${musicId}', '${music.music_name}', '${music.author}')">播放</button>
                    <button class="action-btn" style="background-color: #9acd32; margin-left: 5px;" onclick="editMusic('${rankTypeMap[currentPageType]}', '${musicId}')">修改</button>
                    <button class="action-btn" style="background-color: #ff6b6b; margin-left: 5px;" onclick="deleteMusic('${rankTypeMap[currentPageType]}', '${musicId}')">删除</button>
                </td>
            </tr>
        `;
    });
    
    musicList.innerHTML = html;
}

/**
 * 播放音乐
 */
function playMusic(rankType, musicId, musicName, author) {
    // 检查是否是新歌榜
    const isNewSongRank = rankType === 'newsong';
    
    if (isNewSongRank) {
        // 新歌榜：直接从数据库获取play_url
        alert('新歌榜音乐直接使用数据库链接播放，功能开发中...');
    } else {
        // 其他榜：爬取播放链接
        fetch('/api/admin/play-music/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: `music_id=${musicId}&music_name=${encodeURIComponent(musicName)}&author=${encodeURIComponent(author)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 在新窗口打开播放链接
                window.open(data.url, '_blank');
            } else {
                alert('获取播放链接失败: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('播放出错');
        });
    }
}

/**
 * 搜索音乐
 */
function searchMusicData() {
    currentPage = 1;
    fetchMusicData(rankTypeMap[currentPageType], 1);
}

/**
 * 加载评论数据 - 使用真实API
 */
function loadCommentData(page) {
    const contentBody = document.getElementById('content-body');
    const rankType = rankTypeMap[page];
    
    let html = `
        <div class="filter-bar">
            <div class="filter-item">
                <label>搜索用户:</label>
                <input type="text" placeholder="输入用户名..." id="comment-search">
            </div>
            <button class="filter-btn" onclick="searchCommentData()">搜索</button>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>用户</th>
                    <th>评论内容</th>
                    <th>发布时间</th>
                    <th>点赞</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody id="comment-list">
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px;">加载中...</td>
                </tr>
            </tbody>
        </table>
        <div class="pagination" id="comment-pagination"></div>
    `;
    
    contentBody.innerHTML = html;
    
    // 加载数据
    fetchCommentData(rankType, 1);
}

/**
 * 获取评论数据 API
 */
function fetchCommentData(rankType, page) {
    const element = document.getElementById('comment-search');
    const search = element ? element.value.trim() : '';
    
    fetch(`/api/admin/comment-data/?rank_type=${rankType}&page=${page}&search=${search}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayCommentTable(data.data);
                displayPagination(data.total_pages, page, 'comment');
            } else {
                alert('获取数据失败: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('获取数据出错');
        });
}

/**
 * 显示评论表格
 */
function displayCommentTable(comments) {
    const commentList = document.getElementById('comment-list');
    
    if (!comments || comments.length === 0) {
        commentList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">暂无数据</td></tr>';
        return;
    }
    
    let html = '';
    comments.forEach((comment, index) => {
        const contentPreview = comment.comment_content.substring(0, 100) + (comment.comment_content.length > 100 ? '...' : '');
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${comment.username}</td>
                <td>
                    <div style="max-width: 400px; max-height: 100px; overflow-y: auto; font-size: 13px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
                        ${comment.comment_content}
                    </div>
                </td>
                <td>${new Date(comment.comment_time).toLocaleString('zh-CN')}</td>
                <td>${comment.like_count}</td>
                <td>
                    <button class="action-btn" style="background-color: #9acd32; margin-left: 5px;" onclick="editComment('${rankTypeMap[currentPageType]}', '${comment.id}')">修改</button>
                    <button class="action-btn" style="background-color: #ff6b6b; margin-left: 5px;" onclick="deleteComment('${rankTypeMap[currentPageType]}', '${comment.id}')">删除</button>
                </td>
            </tr>
        `;
    });
    
    commentList.innerHTML = html;
}

/**
 * 搜索评论
 */
function searchCommentData() {
    currentPage = 1;
    fetchCommentData(rankTypeMap[currentPageType], 1);
}

/**
 * 显示分页
 */
function displayPagination(totalPages, currentPageNum, type) {
    const paginationId = type === 'music' ? 'music-pagination' : 'comment-pagination';
    const pagination = document.getElementById(paginationId);
    
    if (!pagination) return;
    
    let html = '';
    
    // 上一页
    if (currentPageNum > 1) {
        html += `<a onclick="goPage(${currentPageNum - 1}, '${type}')">上一页</a>`;
    }
    
    // 页码
    let startPage = Math.max(1, currentPageNum - 2);
    let endPage = Math.min(totalPages, currentPageNum + 2);
    
    if (startPage > 1) {
        html += '<a onclick="goPage(1, \'' + type + '\')">1</a>';
        if (startPage > 2) html += '<span>...</span>';
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPageNum) {
            html += `<span class="active">${i}</span>`;
        } else {
            html += `<a onclick="goPage(${i}, '${type}')">${i}</a>`;
        }
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += '<span>...</span>';
        html += `<a onclick="goPage(${totalPages}, '${type}')">${totalPages}</a>`;
    }
    
    // 下一页
    if (currentPageNum < totalPages) {
        html += `<a onclick="goPage(${currentPageNum + 1}, '${type}')">下一页</a>`;
    }
    
    // 页码直接跳转
    html += `
        <div style="margin-left: 20px; display: inline-block;">
            转到第<input type="number" id="jump-page-${type}" min="1" max="${totalPages}" style="width: 50px; padding: 5px;">页
            <button onclick="jumpToPage('${type}', ${totalPages})" style="padding: 5px 10px;">跳转</button>
        </div>
    `;
    
    pagination.innerHTML = html;
}

/**
 * 跳转到指定页
 */
function jumpToPage(type, maxPage) {
    const page = parseInt(document.getElementById('jump-page-' + type).value);
    if (page >= 1 && page <= maxPage) {
        goPage(page, type);
    } else {
        alert(`请输入1到${maxPage}之间的页码`);
    }
}

/**
 * 转到指定页
 */
function goPage(page, type) {
    currentPage = page;
    
    if (type === 'music') {
        fetchMusicData(rankTypeMap[currentPageType], page);
    } else if (type === 'comment') {
        fetchCommentData(rankTypeMap[currentPageType], page);
    }
}

/**
 * 加载用户数据
 */
function loadUserData(page) {
    const contentBody = document.getElementById('content-body');
    let isCreator = 0;
    let title = '普通用户';
    
    if (page === 'creator_user') {
        isCreator = 1;
        title = '创作者';
    } else if (page === 'user_music_lib') {
        // ★用户音乐库 - 左右布局
        contentBody.innerHTML = `
            <div style="display:flex; height:calc(100vh - 180px); gap:20px; padding:20px;">
                <!-- 左侧用户列表 -->
                <div style="width:200px; border:1px solid #bdc3c7; border-radius:4px; overflow-y:auto; background:#f8f9fa;">
                    <div style="padding:10px; font-weight:bold; border-bottom:1px solid #ddd; background:#9acd32; color:white;">用户列表</div>
                    <div id="user-list-container" style="padding:0;"></div>
                </div>
                <!-- 右侧音乐数据 -->
                <div style="flex:1; border:1px solid #bdc3c7; border-radius:4px; overflow-y:auto; background:white;">
                    <div id="music-lib-container" style="padding:20px; text-align:center; color:#999;">请选择左侧用户查看其喜爱的音乐</div>
                </div>
            </div>
        `;
        
        // 加载用户列表
        loadUserListForMusicLib();
        return;
    } else if (page === 'creator_music_lib') {
        // ★创作者音乐库 - 左右布局
        contentBody.innerHTML = `
            <div style="display:flex; height:calc(100vh - 180px); gap:20px; padding:20px;">
                <!-- 左侧创作者列表 -->
                <div style="width:200px; border:1px solid #bdc3c7; border-radius:4px; overflow-y:auto; background:#f8f9fa;">
                    <div style="padding:10px; font-weight:bold; border-bottom:1px solid #ddd; background:#9acd32; color:white;">创作者列表</div>
                    <div id="creator-list-container" style="padding:0;"></div>
                </div>
                <!-- 右侧音乐数据 -->
                <div style="flex:1; border:1px solid #bdc3c7; border-radius:4px; overflow-y:auto; background:white;">
                    <div id="creator-music-lib-container" style="padding:20px; text-align:center; color:#999;">请选择左侧创作者查看其上传的音乐</div>
                </div>
            </div>
        `;
        
        // 加载创作者列表
        loadCreatorListForMusicLib();
        return;
    } else if (page === 'user_community') {
        // ★用户社区 - 社区内容列表
        contentBody.innerHTML = `
            <div style="padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <div>
                        <select id="community-sort-box" 
                            style="padding:8px 12px; border:1px solid #bdc3c7; border-radius:4px; font-size:14px;">
                            <option value="latest">最新发布</option>
                            <option value="hottest">最热排序</option>
                        </select>
                    </div>
                    <div id="pagination-info" style="color:#666; font-size:14px;"></div>
                </div>
                <div id="community-records-container" style="display:grid; gap:20px;"></div>
                <div id="community-pagination" style="display:flex; justify-content:center; gap:10px; margin-top:30px; flex-wrap:wrap;"></div>
            </div>
        `;
        
        // 绑定排序改变事件
        setTimeout(() => {
            const sortBox = document.getElementById('community-sort-box');
            if (sortBox) {
                sortBox.addEventListener('change', function() {
                    loadCommunityRecords(1, this.value);
                });
            }
        }, 100);
        
        // 加载社区内容
        loadCommunityRecords(1, 'latest');
        return;
    }
    
    contentBody.innerHTML = `
        <div style="padding:20px;">
            <input type="text" id="user-search-box" placeholder="搜索用户..." 
                style="width:100%; padding:10px; border:1px solid #bdc3c7; border-radius:4px; font-size:14px; margin-bottom:20px;">
            <div id="user-data-container"></div>
        </div>
    `;

    // 加载数据
    loadUsersList(isCreator, 1);
}

// ★新增：加载用户音乐库左侧用户列表
function loadUserListForMusicLib() {
    fetch('/api/admin/all-users-simple/')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                displayUserListForMusicLib(data.data);
            }
        })
        .catch(e => console.error('加载失败:', e));
}

// ★新增：显示用户列表（只显示username）
function displayUserListForMusicLib(users) {
    let html = '';
    users.forEach(user => {
        html += `
            <div onclick="selectUserMusicLib('${user.user_id}', '${user.username}')" 
                class="user-item-music-lib"
                style="padding:12px; cursor:pointer; border-bottom:1px solid #ddd; transition:all 0.2s; user-select:none;"
                onmouseover="this.style.backgroundColor='#e8f5e9'; this.style.fontWeight='bold';" 
                onmouseout="this.style.backgroundColor='transparent'; this.style.fontWeight='normal';">
                👤 ${user.username}
            </div>
        `;
    });
    
    document.getElementById('user-list-container').innerHTML = html || '<div style="padding:10px; color:#999; text-align:center;">暂无用户</div>';
}

// ★新增：选中用户后加载其音乐库
function selectUserMusicLib(userId, username, page = 1) {
    currentSelectedUserId = userId;
    currentSelectedUsername = username;
    currentMusicLibPage = page;
    
    const container = document.getElementById('music-lib-container');
    container.innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner"></div>加载中...</div>';
    
    fetch(`/api/admin/user-music-lib/?user_id=${userId}&page=${page}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                displayUserMusicLibTable(data.data, userId, username, data.total, page);
            } else {
                container.innerHTML = `<div style="padding:20px; color:red;">加载失败: ${data.msg}</div>`;
            }
        })
        .catch(e => {
            container.innerHTML = `<div style="padding:20px; color:red;">网络错误: ${e}</div>`;
        });
}

// ★新增：显示用户音乐库表格
function displayUserMusicLibTable(musics, userId, username, total, page = 1) {
    const pageSize = 15;
    const totalPages = Math.ceil(total / pageSize);
    
    let html = `
        <div style="padding:15px; border-bottom:1px solid #ddd; background:#f8f9fa;">
            <strong>${username} 的喜爱音乐</strong> (共 ${total} 首)
        </div>
        <table class="data-table" style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="background:#f8f9fa;">
                    <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">序号</th>
                    <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">歌曲名</th>
                    <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">喜爱状态</th>
                    <th style="padding:10px; text-align:left; border-bottom:1px solid #ddd;">收藏时间</th>
                    <th style="padding:10px; text-align:center; border-bottom:1px solid #ddd;">操作</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    if (musics.length === 0) {
        html += '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">暂无喜爱的音乐</td></tr>';
    } else {
        musics.forEach((music, idx) => {
            const likedText = music.is_liked === 1 ? '✓ 已喜爱' : '未喜爱';
            const createTime = music.create_time ? music.create_time.substring(0, 10) : '-';
            const rowNum = (page - 1) * pageSize + idx + 1;
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;">${rowNum}</td>
                    <td style="padding:10px;">${music.music_name}</td>
                    <td style="padding:10px;">${likedText}</td>
                    <td style="padding:10px;">${createTime}</td>
                    <td style="padding:10px; text-align:center;">
                        <button onclick="deleteUserLikeMusic('${userId}', '${music.music_id}')" 
                            style="padding:6px 12px; background:#e74c3c; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">删除</button>
                    </td>
                </tr>
            `;
        });
    }
    
    html += '</tbody></table>';
    
    // ★新增：分页控制
    if (totalPages > 1) {
        html += '<div style="text-align:center; margin-top:20px; padding:10px; border-top:1px solid #ddd;">';
        
        if (page > 1) {
            html += `<button onclick="selectUserMusicLib('${userId}', '${username}', 1)" style="padding:8px 12px; margin:0 2px; cursor:pointer;">首页</button>`;
            html += `<button onclick="selectUserMusicLib('${userId}', '${username}', ${page - 1})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">上一页</button>`;
        }
        
        html += `<span style="margin:0 10px;">第 ${page} / ${totalPages} 页</span>`;
        
        if (page < totalPages) {
            html += `<button onclick="selectUserMusicLib('${userId}', '${username}', ${page + 1})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">下一页</button>`;
            html += `<button onclick="selectUserMusicLib('${userId}', '${username}', ${totalPages})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">末页</button>`;
        }
        
        html += '</div>';
    }
    
    document.getElementById('music-lib-container').innerHTML = html;
}

// ★新增：删除用户喜爱的音乐
function deleteUserLikeMusic(userId, musicId) {
    if (!confirm('确认删除此歌曲吗？')) return;
    
    fetch('/api/admin/delete-user-like-music/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, music_id: musicId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert('✓ ' + data.msg);
            // 重新加载当前用户的音乐库，保持分页状态
            if (currentSelectedUserId && currentSelectedUsername) {
                selectUserMusicLib(currentSelectedUserId, currentSelectedUsername, currentMusicLibPage);
            }
        } else {
            alert('✗ ' + (data.msg || '删除失败'));
        }
    })
    .catch(e => {
        alert('✗ 删除出错: ' + e);
    });
}

// ★新增：加载创作者音乐库左侧创作者列表
function loadCreatorListForMusicLib() {
    fetch('/api/admin/creators-simple/')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                displayCreatorListForMusicLib(data.data);
            }
        })
        .catch(e => console.error('加载失败:', e));
}

// ★新增：显示创作者列表（只显示username）
function displayCreatorListForMusicLib(creators) {
    let html = '';
    creators.forEach(creator => {
        html += `
            <div onclick="selectCreatorMusicLib('${creator.user_id}', '${creator.username}')" 
                class="creator-item-music-lib"
                style="padding:12px; cursor:pointer; border-bottom:1px solid #ddd; transition:all 0.2s; user-select:none;"
                onmouseover="this.style.backgroundColor='#e8f5e9'; this.style.fontWeight='bold';" 
                onmouseout="this.style.backgroundColor='transparent'; this.style.fontWeight='normal';">
                👤 ${creator.username}
            </div>
        `;
    });
    document.getElementById('creator-list-container').innerHTML = html || '<div style="padding:10px; color:#999;">暂无创作者</div>';
}

// ★新增：选中创作者后加载其上传的音乐
function selectCreatorMusicLib(creatorId, creatorUsername, page = 1) {
    currentSelectedCreatorId = creatorId;
    currentSelectedCreatorUsername = creatorUsername;
    currentCreatorMusicLibPage = page;
    
    const container = document.getElementById('creator-music-lib-container');
    container.innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner"></div>加载中...</div>';
    
    fetch(`/api/admin/creator-music-lib/?user_id=${creatorId}&page=${page}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                displayCreatorMusicLibTable(data.data, creatorId, creatorUsername, data.total, page);
            } else {
                container.innerHTML = `<div style="padding:20px; color:red;">加载失败: ${data.msg}</div>`;
            }
        })
        .catch(e => {
            container.innerHTML = `<div style="padding:20px; color:red;">网络错误: ${e}</div>`;
        });
}

// ★新增：显示创作者上传的音乐表格
function displayCreatorMusicLibTable(musics, creatorId, creatorUsername, total, page = 1) {
    const pageSize = 15;
    const totalPages = Math.ceil(total / pageSize);
    
    let html = `
        <div style="padding:15px; border-bottom:1px solid #ddd; background:#f8f9fa;">
            <strong>${creatorUsername} 的上传音乐</strong> (共 ${total} 首)
        </div>
        <table class="data-table" style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="background:#f8f9fa;">
                    <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd;">序号</th>
                    <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd;">歌曲名</th>
                    <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd;">作者</th>
                    <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd;">专辑</th>
                    <th style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">封面</th>
                    <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd;">国家</th>
                    <th style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">喜爱数</th>
                    <th style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">播放数</th>
                    <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd;">发布时间</th>
                    <th style="padding:8px; text-align:left; border-bottom:1px solid #ddd;">歌词</th>
                    <th style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">播放</th>
                    <th style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">审核状态</th>
                    <th style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">操作</th>
                </tr></thead>
            <tbody>
    `;
    
    if (musics.length === 0) {
        html += '<tr><td colspan="13" style="text-align:center; padding:20px; color:#999;">暂无上传的音乐</td></tr>';
    } else {
        musics.forEach((music, idx) => {
            const rowNum = (page - 1) * pageSize + idx + 1;
            const stateMap = {0: '待审核', 1: '未通过', 2: '已通过'};
            const stateText = stateMap[music.state] || '未知';
            const stateColor = music.state === 0 ? '#ff9800' : (music.state === 1 ? '#f44336' : '#4caf50');
            
            // 处理歌词显示：带滚动条
            const lyricsDisplay = music.lyrics ? 
                `<div style="max-height:40px; max-width:150px; overflow-y:auto; overflow-x:hidden; border:1px solid #bdc3c7; padding:4px; font-size:11px; background:#f9f9f9; word-wrap:break-word;">${music.lyrics}</div>` 
                : '-';
            
            // 格式化发布时间
            const publishTime = music.create_datetime ? music.create_datetime.substring(0, 10) : '-';
            
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:8px;">${rowNum}</td>
                    <td style="padding:8px;">${music.music_name}</td>
                    <td style="padding:8px;">${music.author || '-'}</td>
                    <td style="padding:8px;">${music.album || '-'}</td>
                    <td style="padding:8px; text-align:center;">
                        ${music.album_cover ? `<img src="${music.album_cover}" alt="封面" style="width:40px; height:40px; border-radius:3px; object-fit:cover; cursor:pointer;" onclick="alert('封面: ' + '${music.album_cover}');">` : '-'}
                    </td>
                    <td style="padding:8px;">${music.country || '-'}</td>
                    <td style="padding:8px; text-align:center;"><span style="padding:2px 6px; background:#ffebee; color:#c62828; border-radius:3px;">${music.like_count || 0}</span></td>
                    <td style="padding:8px; text-align:center;"><span style="padding:2px 6px; background:#e3f2fd; color:#1565c0; border-radius:3px;">${music.click_count || 0}</span></td>
                    <td style="padding:8px;">${publishTime}</td>
                    <td style="padding:8px;">${lyricsDisplay}</td>
                    <td style="padding:8px; text-align:center;">
                        <button onclick="playCreatorMusic('${creatorId}', '${music.music_id}')" 
                            style="padding:6px 12px; background:#2196f3; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">▶</button>
                    </td>
                    <td style="padding:8px; text-align:center;">
                        <span style="padding:4px 8px; border-radius:3px; background:${stateColor}; color:white; font-size:12px;">${stateText}</span>
                    </td>
                    <td style="padding:8px; text-align:center;">
                        ${music.state === 0 ? `
                            <button onclick="auditCreatorMusic('${creatorId}', '${music.music_id}', 2)" 
                                style="padding:4px 8px; background:#4caf50; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px; margin-right:2px;">通过</button>
                            <button onclick="auditCreatorMusic('${creatorId}', '${music.music_id}', 1)" 
                                style="padding:4px 8px; background:#f44336; color:white; border:none; border-radius:3px; cursor:pointer; font-size:11px;">拒绝</button>
                        ` : '<span style="color:#999; font-size:12px;">已审核</span>'}
                    </td>
                </tr>
            `;
        });
    }
    
    html += '</tbody></table>';
    
    // ★新增：分页控制
    if (totalPages > 1) {
        html += '<div style="text-align:center; margin-top:20px; padding:10px; border-top:1px solid #ddd;">';
        
        if (page > 1) {
            html += `<button onclick="selectCreatorMusicLib('${creatorId}', '${creatorUsername}', 1)" style="padding:8px 12px; margin:0 2px; cursor:pointer;">首页</button>`;
            html += `<button onclick="selectCreatorMusicLib('${creatorId}', '${creatorUsername}', ${page - 1})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">上一页</button>`;
        }
        
        html += `<span style="margin:0 10px;">第 ${page} / ${totalPages} 页</span>`;
        
        if (page < totalPages) {
            html += `<button onclick="selectCreatorMusicLib('${creatorId}', '${creatorUsername}', ${page + 1})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">下一页</button>`;
            html += `<button onclick="selectCreatorMusicLib('${creatorId}', '${creatorUsername}', ${totalPages})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">末页</button>`;
        }
        
        html += '</div>';
    }
    
    document.getElementById('creator-music-lib-container').innerHTML = html;
}

// ★新增：播放创作者音乐
function playCreatorMusic(creatorId, musicId) {
    // 实际应用中，这里应该调用播放器API
    alert(`播放音乐: ${musicId}`);
}

// ★新增：审核创作者上传的音乐
function auditCreatorMusic(creatorId, musicId, state) {
    const msg = state === 2 ? '通过' : '拒绝';
    if (!confirm(`确认${msg}此音乐吗？`)) return;
    
    fetch('/api/admin/audit-creator-music/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creatorId, music_id: musicId, state: state })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert('✓ ' + data.msg);
            // 重新加载当前创作者的音乐库，保持分页状态
            if (currentSelectedCreatorId && currentSelectedCreatorUsername) {
                selectCreatorMusicLib(currentSelectedCreatorId, currentSelectedCreatorUsername, currentCreatorMusicLibPage);
            }
        } else {
            alert('✗ ' + (data.msg || '审核失败'));
        }
    })
    .catch(e => {
        alert('✗ 审核出错: ' + e);
    });
}

function loadUsersList(isCreator, page) {
    fetch(`/api/admin/users-list/?is_creator=${isCreator}&page=${page}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                displayUsersTable(data.data, page, data.total, isCreator);
            } else {
                document.getElementById('user-data-container').innerHTML = '<div style="color:red;">加载失败</div>';
            }
        })
        .catch(e => {
            console.error('获取列表失败:', e);
            document.getElementById('user-data-container').innerHTML = '<div style="color:red;">网络错误</div>';
        });
}

function displayUsersTable(users, page, total, isCreator) {
    let html = `
        <table class="data-table" style="width:100%;">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>头像</th>
                    <th>用户ID</th>
                    <th>账号</th>
                    <th>昵称</th>
                    <th>邮箱</th>
                    <th>性别</th>
                    <th>生日</th>
                    <th>地区</th>
                    <th>密码</th>
                    <th>注册时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (users.length === 0) {
        html += '<tr><td colspan="12" style="text-align:center;">暂无用户</td></tr>';
    } else {
        users.forEach((user, idx) => {
            const avatar = user.avatar || '/static/imgs/hp1.png';
            const genderText = user.gender === 0 ? '男' : (user.gender === 1 ? '女' : '保密');
            const birthday = user.birthday || '-';
            const region = user.region || '-';
            const password = user.password || '-';
            html += `
                <tr>
                    <td>${(page-1)*15 + idx + 1}</td>
                    <td><img src="${avatar}" alt="avatar" style="width:40px; height:40px; border-radius:50%; border:2px solid #9acd32; object-fit:cover;"></td>
                    <td>${user.user_id}</td>
                    <td>${user.username}</td>
                    <td>${user.nickname || '-'}</td>
                    <td>${user.email || '-'}</td>
                    <td>${genderText}</td>
                    <td>${birthday}</td>
                    <td>${region}</td>
                    <td>${password}</td>
                    <td>${user.create_time ? user.create_time.substring(0,10) : '-'}</td>
                    <td><button onclick="deleteUserConfirm('${user.user_id}', ${page}, ${isCreator})" 
                        style="padding:6px 12px; background:#e74c3c; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">删除</button></td>
                </tr>
            `;
        });
    }

    html += '</tbody></table>';

    // 分页
    const totalPages = Math.ceil(total / 15);
    if (totalPages > 1) {
        html += '<div style="text-align:center; margin-top:20px;">';
        if (page > 1) {
            html += `<button onclick="loadUsersList(${isCreator}, 1)" style="padding:8px 12px; margin:0 2px; cursor:pointer;">首页</button>`;
            html += `<button onclick="loadUsersList(${isCreator}, ${page-1})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">上一页</button>`;
        }
        html += `<span style="margin:0 10px;">第 ${page} / ${totalPages} 页</span>`;
        if (page < totalPages) {
            html += `<button onclick="loadUsersList(${isCreator}, ${page+1})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">下一页</button>`;
            html += `<button onclick="loadUsersList(${isCreator}, ${totalPages})" style="padding:8px 12px; margin:0 2px; cursor:pointer;">末页</button>`;
        }
        html += '</div>';
    }

    document.getElementById('user-data-container').innerHTML = html;
}

function deleteUserConfirm(userId, page, isCreator) {
    if (!confirm('确认删除此用户吗？')) return;

    fetch('/api/admin/delete-user/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert('✓ ' + data.msg);
            loadUsersList(isCreator, page);
        } else {
            alert('✗ ' + (data.msg || '删除失败'));
        }
    })
    .catch(e => {
        alert('✗ 删除出错: ' + e);
    });
}

function deleteMusic(userId, musicId) {
    if (!confirm('确认删除吗？')) return;
    fetch('/api/admin/delete-like-music/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: userId, music_id: musicId})
    }).then(r => r.json()).then(d => {
        alert(d.msg || '删除成功');
        selectUser(userId, '', '', window.currentUserType);
    });
}

function reviewMusic(userId, musicId, state) {
    const msg = state === 1 ? '通过' : '拒绝';
    if (!confirm(`确认${msg}此音乐吗？`)) return;
    fetch('/api/admin/review-music/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({user_id: userId, music_id: musicId, state: state})
    }).then(r => r.json()).then(d => {
        alert(d.msg || '操作成功');
        selectUser(userId, '', '', window.currentUserType);
    });
}

/**
 * 加载数据分析
 */
function loadAnalysisData(page) {
    const contentBody = document.getElementById('content-body');
    
    // 根据不同的分析类型加载对应的内容
    switch(page) {
        case 'user_distribution':
            loadUserDistributionAnalysis();
            break;
        case 'user_active':
            loadUserActivityAnalysis();
            break;
        case 'music_popularity':
            loadMusicPopularityAnalysis();
            break;
        case 'rank_trend':
            loadRankTrendAnalysis();
            break;
        case 'like_distribution':
        case 'comment_trend':
            // 暂未实现其他分析
            const html = `
                <div class="chart-container">
                    <h3>${page} - 开发中</h3>
                    <p>此功能正在开发中...</p>
                </div>
            `;
            contentBody.innerHTML = html;
            break;
        default:
            contentBody.innerHTML = '<div class="empty-state"><p>分析页面未找到</p></div>';
    }
}

/**
 * 加载用户分布分析 - 显示三个维度的饼图
 */
function loadUserDistributionAnalysis() {
    const contentBody = document.getElementById('content-body');
    
    // 创建容器
    let html = `
        <div class="analysis-container">
            <div class="analysis-header">
                <h2>用户分布分析</h2>
                <p>显示用户在性别、地区、用户类型三个维度的分布情况</p>
            </div>
            
            <div class="charts-wrapper">
                <div class="chart-box">
                    <div id="gender-chart" class="echarts-container"></div>
                </div>
                <div class="chart-box">
                    <div id="region-chart" class="echarts-container"></div>
                </div>
                <div class="chart-box">
                    <div id="user-type-chart" class="echarts-container"></div>
                </div>
            </div>
            
            <div class="analysis-stats">
                <div class="stat-item">
                    <span class="stat-label">用户总数:</span>
                    <span class="stat-value" id="total-users">加载中...</span>
                </div>
            </div>
        </div>
    `;
    
    contentBody.innerHTML = html;
    console.log('✅ 用户分布分析页面已加载');
    
    // 获取分析数据 - 延迟以确保DOM渲染
    setTimeout(() => {
        fetch('/api/admin/user-distribution/')
            .then(response => {
                console.log('📡 API响应状态:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('📊 用户分布分析数据:', data);
                
                if(data.code === 200 && data.data) {
                    const analysisData = data.data;
                    console.log('✓ 数据有效，开始渲染图表');
                    
                    // 更新总用户数
                    const totalUsersElement = document.getElementById('total-users');
                    if(totalUsersElement) {
                        totalUsersElement.textContent = analysisData.analysis.total_users;
                    }
                    
                    // 绘制三个饼图
                    console.log('🎨 绘制性别分布图...');
                    renderGenderChart(analysisData.gender_chart);
                    
                    console.log('🎨 绘制地区分布图...');
                    renderRegionChart(analysisData.region_chart);
                    
                    console.log('🎨 绘制用户类型图...');
                    renderUserTypeChart(analysisData.user_type_chart);
                    
                    console.log('✅ 所有图表渲染完成');
                } else {
                    console.error('❌ 数据无效:', data);
                    alert('获取分析数据失败: ' + (data.msg || '未知错误'));
                }
            })
            .catch(error => {
                console.error('❌ 获取分析数据错误:', error);
                alert('获取分析数据出错: ' + error.message);
            });
    }, 100);
}

/**
 * 绘制性别分布饼图
 */
function renderGenderChart(chartConfig) {
    const container = document.getElementById('gender-chart');
    
    if(!container) {
        console.error('❌ 性别分布图容器不存在');
        return;
    }
    
    console.log('容器尺寸:', container.clientWidth, 'x', container.clientHeight);
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.labels || chartConfig.labels.length === 0) {
            console.warn('⚠️ 性别分布无数据');
            return;
        }
        
        const pieData = chartConfig.labels.map((label, index) => ({
            name: label,
            value: chartConfig.values[index]
        }));
        
        const option = {
            title: {
                text: chartConfig.title || '用户性别分布',
                left: 'center',
                textStyle: {
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'middle'
            },
            series: [
                {
                    name: chartConfig.title || '用户性别分布',
                    type: 'pie',
                    radius: '50%',
                    center: ['60%', '60%'],
                    data: pieData,
                    label: {
                        show: true
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ]
        };
        
        chart.setOption(option);
        
        // 窗口resize事件处理
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('图表resize出错:', e);
            }
        });
        
        console.log('✓ 性别分布图已渲染');
    } catch(error) {
        console.error('❌ 性别分布图渲染失败:', error);
    }
}

/**
 * 绘制地区分布饼图
 */
function renderRegionChart(chartConfig) {
    const container = document.getElementById('region-chart');
    
    if(!container) {
        console.error('❌ 地区分布图容器不存在');
        return;
    }
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.labels || chartConfig.labels.length === 0) {
            console.warn('⚠️ 地区分布无数据');
            return;
        }
        
        const pieData = chartConfig.labels.map((label, index) => ({
            name: label,
            value: chartConfig.values[index]
        }));
        
        const option = {
            title: {
                text: chartConfig.title || '用户地区分布',
                left: 'center',
                textStyle: {
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                right: 10,
                top: 'middle'
            },
            series: [
                {
                    name: chartConfig.title || '用户地区分布',
                    type: 'pie',
                    radius: '50%',
                    center: ['40%', '60%'],
                    data: pieData,
                    label: {
                        show: true
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ]
        };
        
        chart.setOption(option);
        
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('图表resize出错:', e);
            }
        });
        
        console.log('✓ 地区分布图已渲染');
    } catch(error) {
        console.error('❌ 地区分布图渲染失败:', error);
    }
}

/**
 * 绘制用户类型分布饼图
 */
function renderUserTypeChart(chartConfig) {
    const container = document.getElementById('user-type-chart');
    
    if(!container) {
        console.error('❌ 用户类型分布图容器不存在');
        return;
    }
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.labels || chartConfig.labels.length === 0) {
            console.warn('⚠️ 用户类型分布无数据');
            return;
        }
        
        const pieData = chartConfig.labels.map((label, index) => ({
            name: label,
            value: chartConfig.values[index]
        }));
        
        const option = {
            title: {
                text: chartConfig.title || '用户类型分布',
                left: 'center',
                textStyle: {
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'middle'
            },
            series: [
                {
                    name: chartConfig.title || '用户类型分布',
                    type: 'pie',
                    radius: '50%',
                    center: ['60%', '60%'],
                    data: pieData,
                    label: {
                        show: true
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ]
        };
        
        chart.setOption(option);
        
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('图表resize出错:', e);
            }
        });
        
        console.log('✓ 用户类型分布图已渲染');
    } catch(error) {
        console.error('❌ 用户类型分布图渲染失败:', error);
    }
}

/**
 * 加载用户活跃度分析
 */
function loadUserActivityAnalysis() {
    const contentBody = document.getElementById('content-body');
    
    // 创建容器
    let html = `
        <div class="analysis-container">
            <div class="analysis-header">
                <h2>🎯 用户活跃度分析</h2>
                <p>根据用户的创建时间和更新时间分析用户活跃情况</p>
            </div>
            
            <div class="charts-wrapper">
                <div class="chart-box">
                    <div id="activity-bar-chart" class="echarts-container"></div>
                </div>
                <div class="chart-box">
                    <div id="activity-pie-chart" class="echarts-container"></div>
                </div>
            </div>
            
            <div class="analysis-stats">
                <div class="stat-item">
                    <span class="stat-label">总用户数:</span>
                    <span class="stat-value" id="total-active-users">加载中...</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">近10天活跃:</span>
                    <span class="stat-value" id="active-10days">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">一个月内活跃:</span>
                    <span class="stat-value" id="active-1month">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">一年内活跃:</span>
                    <span class="stat-value" id="active-1year">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">超过一年:</span>
                    <span class="stat-value" id="active-over1year">0</span>
                </div>
            </div>
        </div>
    `;
    
    contentBody.innerHTML = html;
    console.log('✅ 用户活跃度分析页面已加载');
    
    // 延迟以确保DOM已渲染
    setTimeout(() => {
        fetch('/api/admin/user-activity/')
            .then(response => {
                console.log('📡 API响应状态:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('📊 用户活跃度数据:', data);
                
                if(data.code === 200 && data.data) {
                    const analysisData = data.data;
                    console.log('✓ 数据有效，开始渲染图表');
                    
                    // 更新统计数据
                    const stats = analysisData.stats;
                    document.getElementById('total-active-users').textContent = stats.total;
                    document.getElementById('active-10days').textContent = stats.activity_dist['近10天'] || 0;
                    document.getElementById('active-1month').textContent = stats.activity_dist['一个月内'] || 0;
                    document.getElementById('active-1year').textContent = stats.activity_dist['一年内'] || 0;
                    document.getElementById('active-over1year').textContent = stats.activity_dist['超过一年'] || 0;
                    
                    // 绘制柱状图和饼图
                    console.log('🎨 绘制用户活跃度柱状图...');
                    renderActivityBarChart(analysisData.bar_chart);
                    
                    console.log('🎨 绘制用户活跃度饼图...');
                    renderActivityPieChart(analysisData.pie_chart);
                    
                    console.log('✅ 所有图表渲染完成');
                } else {
                    console.error('❌ 数据无效:', data);
                    alert('获取分析数据失败: ' + (data.msg || '未知错误'));
                }
            })
            .catch(error => {
                console.error('❌ 获取分析数据错误:', error);
                alert('获取分析数据出错: ' + error.message);
            });
    }, 100);
}

/**
 * 绘制用户活跃度柱状图
 */
function renderActivityBarChart(chartConfig) {
    const container = document.getElementById('activity-bar-chart');
    
    if(!container) {
        console.error('❌ 柱状图容器不存在');
        return;
    }
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.labels || chartConfig.labels.length === 0) {
            console.warn('⚠️ 柱状图无数据');
            return;
        }
        
        const option = {
            title: {
                text: chartConfig.title || '用户活跃度统计',
                left: 'center',
                textStyle: {
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'axis',
                formatter: '{b} <br/> 用户数: {c}'
            },
            xAxis: {
                type: 'category',
                data: chartConfig.labels
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    data: chartConfig.values,
                    type: 'bar',
                    itemStyle: {
                        color: '#9acd32'
                    }
                }
            ]
        };
        
        chart.setOption(option);
        
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('图表resize出错:', e);
            }
        });
        
        console.log('✓ 用户活跃度柱状图已渲染');
    } catch(error) {
        console.error('❌ 柱状图渲染失败:', error);
    }
}

/**
 * 绘制用户活跃度饼图
 */
function renderActivityPieChart(chartConfig) {
    const container = document.getElementById('activity-pie-chart');
    
    if(!container) {
        console.error('❌ 饼图容器不存在');
        return;
    }
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.labels || chartConfig.labels.length === 0) {
            console.warn('⚠️ 饼图无数据');
            return;
        }
        
        const pieData = chartConfig.labels.map((label, index) => ({
            name: label,
            value: chartConfig.values[index]
        }));
        
        const option = {
            title: {
                text: chartConfig.title || '用户活跃度分布',
                left: 'center',
                textStyle: {
                    fontSize: 14,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'middle'
            },
            series: [
                {
                    name: chartConfig.title || '用户活跃度',
                    type: 'pie',
                    radius: '50%',
                    center: ['60%', '50%'],
                    data: pieData,
                    label: {
                        show: true
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ]
        };
        
        chart.setOption(option);
        
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('图表resize出错:', e);
            }
        });
        
        console.log('✓ 用户活跃度饼图已渲染');
    } catch(error) {
        console.error('❌ 饼图渲染失败:', error);
    }
}

/**
 * 加载音乐热度分析 - 显示七个榜单的点赞量和点击量比较
 */
function loadMusicPopularityAnalysis() {
    const contentBody = document.getElementById('content-body');
    
    // 创建页面容器
    let html = `
        <div class="analysis-container">
            <div class="analysis-header">
                <h2>🎵 音乐热度分析</h2>
                <p>对比七个榜单的点赞量（❤️）和点击量（👆）数据</p>
            </div>
            
            <div class="charts-wrapper">
                <div class="chart-box" style="width: 100%; margin-bottom: 30px;">
                    <h3>各榜单点赞量 vs 点击量比较</h3>
                    <div id="popularity-bar-chart" class="echarts-container" style="height: 400px;"></div>
                </div>
                
                <div class="chart-box" style="width: 100%; margin-bottom: 30px;">
                    <h3>点赞量分布</h3>
                    <div id="popularity-pie-chart" class="echarts-container" style="height: 400px;"></div>
                </div>
            </div>
            
            <div class="analysis-stats">
                <div class="stat-item">
                    <span class="stat-label">总点赞量:</span>
                    <span class="stat-value" id="total-likes">加载中...</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">总点击量:</span>
                    <span class="stat-value" id="total-clicks">加载中...</span>
                </div>
            </div>
            
            <div id="rank-details" style="margin-top: 30px;"></div>
        </div>
    `;
    
    contentBody.innerHTML = html;
    console.log('✅ 音乐热度分析页面已加载');
    
    // 获取分析数据
    setTimeout(() => {
        fetch('/api/admin/music-popularity/')
            .then(response => {
                console.log('📡 API响应状态:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('📊 音乐热度分析数据:', data);
                
                if(data.code === 200 && data.data) {
                    const analysisData = data.data;
                    console.log('✓ 数据有效，开始渲染图表');
                    
                    // 更新统计信息
                    const totalLikesElement = document.getElementById('total-likes');
                    const totalClicksElement = document.getElementById('total-clicks');
                    if(totalLikesElement) totalLikesElement.textContent = analysisData.stats.total_likes.toLocaleString();
                    if(totalClicksElement) totalClicksElement.textContent = analysisData.stats.total_clicks.toLocaleString();
                    
                    // 绘制柱状图
                    console.log('🎨 绘制热度柱状图...');
                    renderPopularityBarChart(analysisData.bar_chart);
                    
                    // 绘制饼图
                    console.log('🎨 绘制点赞分布饼图...');
                    renderPopularityPieChart(analysisData.pie_chart);
                    
                    // 显示详细信息
                    renderRankDetails(analysisData.stats.ranks);
                    
                    console.log('✅ 所有图表渲染完成');
                } else {
                    console.error('❌ 数据无效:', data);
                }
            })
            .catch(error => {
                console.error('❌ 获取音乐热度分析数据失败:', error);
                contentBody.innerHTML += '<div class="error-message">获取数据失败，请检查控制台错误</div>';
            });
    }, 100);
}

/**
 * 绘制音乐热度柱状图
 */
function renderPopularityBarChart(chartConfig) {
    const container = document.getElementById('popularity-bar-chart');
    
    if(!container) {
        console.error('❌ 柱状图容器不存在');
        return;
    }
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.xAxis || chartConfig.xAxis.data.length === 0) {
            console.warn('⚠️ 柱状图无数据');
            container.innerHTML = '<p style="text-align: center; padding: 20px;">暂无数据</p>';
            return;
        }
        
        chart.setOption(chartConfig);
        
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('柱状图resize出错:', e);
            }
        });
        
        console.log('✓ 音乐热度柱状图已渲染');
    } catch(error) {
        console.error('❌ 柱状图渲染失败:', error);
    }
}

/**
 * 绘制音乐热度饼图
 */
function renderPopularityPieChart(chartConfig) {
    const container = document.getElementById('popularity-pie-chart');
    
    if(!container) {
        console.error('❌ 饼图容器不存在');
        return;
    }
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.series || chartConfig.series[0].data.length === 0) {
            console.warn('⚠️ 饼图无数据');
            container.innerHTML = '<p style="text-align: center; padding: 20px;">暂无数据</p>';
            return;
        }
        
        chart.setOption(chartConfig);
        
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('饼图resize出错:', e);
            }
        });
        
        console.log('✓ 音乐热度饼图已渲染');
    } catch(error) {
        console.error('❌ 饼图渲染失败:', error);
    }
}

/**
 * 显示榜单详细信息
 */
function renderRankDetails(ranksData) {
    const container = document.getElementById('rank-details');
    
    if(!container || !ranksData) return;
    
    let html = '<div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">';
    html += '<h3 style="margin-top: 0;">📋 各榜单详情</h3>';
    html += '<table style="width: 100%; border-collapse: collapse; font-size: 14px;">';
    html += `
        <thead>
            <tr style="background: #eee; border-bottom: 2px solid #ccc;">
                <th style="padding: 10px; text-align: left;">榜单名称</th>
                <th style="padding: 10px; text-align: right;">总点赞量</th>
                <th style="padding: 10px; text-align: right;">总点击量</th>
                <th style="padding: 10px; text-align: right;">音乐数量</th>
                <th style="padding: 10px; text-align: right;">平均点赞</th>
                <th style="padding: 10px; text-align: right;">平均点击</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    for(const [rankName, stats] of Object.entries(ranksData)) {
        html += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px; text-align: left;"><strong>${rankName}</strong></td>
                <td style="padding: 10px; text-align: right;">${stats.total_likes.toLocaleString()}</td>
                <td style="padding: 10px; text-align: right;">${stats.total_clicks.toLocaleString()}</td>
                <td style="padding: 10px; text-align: right;">${stats.music_count}</td>
                <td style="padding: 10px; text-align: right;">${stats.avg_likes}</td>
                <td style="padding: 10px; text-align: right;">${stats.avg_clicks}</td>
            </tr>
        `;
    }
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
    console.log('✓ 榜单详情已渲染');
}

/**
 * 加载榜单趋势分析
 */
function loadRankTrendAnalysis() {
    const contentBody = document.getElementById('content-body');
    
    // 创建页面容器
    let html = `
        <div class="analysis-container">
            <div class="analysis-header">
                <h2>📊 榜单趋势分析</h2>
                <p>展示最受欢迎的十名歌手和不同国家歌曲的数据对比</p>
            </div>
            
            <div class="charts-wrapper">
                <div class="chart-box" style="width: 100%; margin-bottom: 30px;">
                    <h3>🎤 最受欢迎的十名歌手</h3>
                    <div id="top-authors-chart" class="echarts-container" style="height: 400px;"></div>
                </div>
                
                <div class="chart-box" style="width: 100%; margin-bottom: 30px;">
                    <h3>🌍 不同国家歌曲对比</h3>
                    <div id="country-chart" class="echarts-container" style="height: 400px;"></div>
                </div>
            </div>
        </div>
    `;
    
    contentBody.innerHTML = html;
    console.log('✅ 榜单趋势分析页面已加载');
    
    // 获取分析数据
    setTimeout(() => {
        fetch('/api/admin/rank-trend/')
            .then(response => {
                console.log('📡 API响应状态:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('📊 榜单趋势分析数据:', data);
                
                if(data.code === 200 && data.data) {
                    const analysisData = data.data;
                    console.log('✓ 数据有效，开始渲染图表');
                    
                    // 绘制歌手排行图
                    console.log('🎨 绘制歌手排行图...');
                    renderTopAuthorsChart(analysisData.top_authors_chart);
                    
                    // 绘制国家分布图
                    console.log('🎨 绘制国家分布图...');
                    renderCountryChart(analysisData.country_chart);
                    
                    console.log('✅ 所有图表渲染完成');
                } else {
                    console.error('❌ 数据无效:', data);
                }
            })
            .catch(error => {
                console.error('❌ 获取榜单趋势分析数据失败:', error);
                contentBody.innerHTML += '<div class="error-message">获取数据失败，请检查控制台错误</div>';
            });
    }, 100);
}

/**
 * 绘制歌手排行图
 */
function renderTopAuthorsChart(chartConfig) {
    const container = document.getElementById('top-authors-chart');
    
    if(!container) {
        console.error('❌ 歌手排行图容器不存在');
        return;
    }
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.xAxis || chartConfig.xAxis.data.length === 0) {
            console.warn('⚠️ 歌手排行图无数据');
            container.innerHTML = '<p style="text-align: center; padding: 20px;">暂无数据</p>';
            return;
        }
        
        chart.setOption(chartConfig);
        
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('歌手排行图resize出错:', e);
            }
        });
        
        console.log('✓ 歌手排行图已渲染');
    } catch(error) {
        console.error('❌ 歌手排行图渲染失败:', error);
    }
}

/**
 * 绘制国家分布图
 */
function renderCountryChart(chartConfig) {
    const container = document.getElementById('country-chart');
    
    if(!container) {
        console.error('❌ 国家分布图容器不存在');
        return;
    }
    
    try {
        const chart = echarts.init(container);
        
        if(!chartConfig.xAxis || chartConfig.xAxis.data.length === 0) {
            console.warn('⚠️ 国家分布图无数据');
            container.innerHTML = '<p style="text-align: center; padding: 20px;">暂无数据</p>';
            return;
        }
        
        chart.setOption(chartConfig);
        
        window.addEventListener('resize', () => {
            try {
                chart.resize();
            } catch(e) {
                console.warn('国家分布图resize出错:', e);
            }
        });
        
        console.log('✓ 国家分布图已渲染');
    } catch(error) {
        console.error('❌ 国家分布图渲染失败:', error);
    }
}

/**
 * 更新时间
 */
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// ★新增：加载社区内容记录 - 分页每页15条
function loadCommunityRecords(page = 1, sortBy = 'latest') {
    const container = document.getElementById('community-records-container');
    if (container) {
        container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:40px;"><div class="spinner"></div>加载中...</div>';
    }
    
    const pageSize = 15;
    fetch(`/api/community/records/?page=${page}&page_size=${pageSize}&sort_by=${sortBy}`)
        .then(r => r.json())
        .then(data => {
            console.log('📦 社区记录API响应:', data);
            console.log('📦 data.code:', data.code);
            console.log('📦 data.data:', data.data);
            if (data.data) {
                console.log('📦 data.data.records:', data.data.records);
                if (data.data.records) {
                    console.log('📦 data.data.records.length:', data.data.records.length);
                    if (data.data.records.length > 0) {
                        console.log('📦 第一条记录:', data.data.records[0]);
                    }
                }
                console.log('📦 data.data.pagination:', data.data.pagination);
            }
            
            // ★ 修复：检查后端返回的实际格式
            if (data.code === 200 && data.data && data.data.records && data.data.records.length > 0) {
                console.log('✅ 准备显示', data.data.records.length, '条记录');
                displayCommunityRecords(data.data.records, data.data.pagination.total, page, pageSize, sortBy);
                generateCommunityPagination(data.data.pagination.total, page, pageSize, sortBy);
                updatePaginationInfo(data.data.pagination.total, page, pageSize);
            } else if (data.code === 200 && data.data) {
                // 没有数据
                console.warn('⚠️ 没有社区内容数据');
                container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:40px; color:#999;">暂无社区内容</div>';
                document.getElementById('community-pagination').innerHTML = '';
            } else {
                console.error('❌ API 返回错误:', data);
                container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:40px; color:#f44336;">加载失败: ' + (data.message || '未知错误') + '</div>';
            }
        })
        .catch(e => {
            console.error('❌ 加载社区内容失败:', e);
            if (container) {
                container.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:40px; color:#f44336;">加载失败，请重试</div>';
            }
        });
}

// 显示社区内容记录
function displayCommunityRecords(records, total, page, pageSize, sortBy) {
    const container = document.getElementById('community-records-container');
    console.log('🎨 displayCommunityRecords 被调用，records count:', records.length);
    
    if (!container) {
        console.error('❌ 找不到容器: community-records-container');
        return;
    }
    
    let html = '';
    
    records.forEach((record, idx) => {
        console.log(`  🔹 处理第 ${idx + 1} 条记录:`, record);
        
        const publishTime = new Date(record.publish_time).toLocaleString('zh-CN');
        
        // 简化版 - 只显示基本信息
        html += `
            <div style="background:white; border:1px solid #e0e0e0; border-radius:8px; padding:16px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                <!-- 用户信息头 -->
                <div style="display:flex; align-items:center; margin-bottom:12px;">
                    <img src="${record.user_avatar || '/static/imgs/default_avatar.png'}" alt="头像" 
                        style="width:40px; height:40px; border-radius:50%; margin-right:12px; object-fit:cover; border:1px solid #ddd;">
                    <div style="flex:1;">
                        <div style="font-weight:bold; color:#333;">
                            <span style="margin-right:8px;">ID: ${record.user_id}</span>
                            <span>${record.user_nickname || '匿名用户'}</span>
                        </div>
                        <div style="color:#999; font-size:12px;">${publishTime}</div>
                    </div>
                    <button onclick="deleteCommunityRecord(${record.id}, this)" 
                        style="padding:6px 12px; background:#f44336; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
                        🗑️ 删除
                    </button>
                </div>
                
                <!-- 文本内容 -->
                <div style="color:#333; line-height:1.6; margin-bottom:12px; word-wrap:break-word; white-space:pre-wrap;">
                    ${record.content || '(空)'}
                </div>
                
                <!-- 位置 -->
                ${record.location ? `<div style="color:#666; font-size:12px; margin-bottom:8px;">📍 ${record.location}</div>` : ''}
                
                <!-- 媒体信息 -->
                <div style="display:flex; gap:15px; margin-top:12px; padding-top:12px; border-top:1px solid #f0f0f0; color:#666; font-size:13px;">
                    ${record.images_count > 0 ? `<span>🖼️ ${record.images_count}张图片</span>` : ''}
                    ${record.audios_count > 0 ? `<span>🎵 ${record.audios_count}个音频</span>` : ''}
                    <span style="margin-left:auto;">❤️ ${record.likes || 0}次点赞</span>
                </div>
            </div>
        `;
    });
    
    console.log('📝 生成的 HTML 长度:', html.length);
    
    container.innerHTML = html;
    console.log('✅ HTML 已设置到容器');
}

// 生成分页按钮
function generateCommunityPagination(total, currentPage, pageSize, sortBy) {
    const paginationDiv = document.getElementById('community-pagination');
    const totalPages = Math.ceil(total / pageSize);
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // 前一页
    if (currentPage > 1) {
        html += `<button onclick="loadCommunityRecords(${currentPage - 1}, '${sortBy}')" 
            style="padding:8px 12px; border:1px solid #bdc3c7; background:white; border-radius:4px; cursor:pointer;">
            ⬅ 上一页
        </button>`;
    }
    
    // 页码
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button onclick="loadCommunityRecords(1, '${sortBy}')" 
            style="padding:8px 12px; border:1px solid #bdc3c7; background:white; border-radius:4px; cursor:pointer;">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding:8px 12px;">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button onclick="loadCommunityRecords(${i}, '${sortBy}')" 
            style="padding:8px 12px; border:1px solid ${isActive ? '#9acd32' : '#bdc3c7'}; background:${isActive ? '#9acd32' : 'white'}; color:${isActive ? 'white' : '#333'}; border-radius:4px; cursor:pointer; font-weight:${isActive ? 'bold' : 'normal'};">
            ${i}
        </button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding:8px 12px;">...</span>`;
        }
        html += `<button onclick="loadCommunityRecords(${totalPages}, '${sortBy}')" 
            style="padding:8px 12px; border:1px solid #bdc3c7; background:white; border-radius:4px; cursor:pointer;">${totalPages}</button>`;
    }
    
    // 下一页
    if (currentPage < totalPages) {
        html += `<button onclick="loadCommunityRecords(${currentPage + 1}, '${sortBy}')" 
            style="padding:8px 12px; border:1px solid #bdc3c7; background:white; border-radius:4px; cursor:pointer;">
            下一页 ➡
        </button>`;
    }
    
    paginationDiv.innerHTML = html;
}

// 更新分页信息
function updatePaginationInfo(total, page, pageSize) {
    const info = document.getElementById('pagination-info');
    if (info) {
        const start = (page - 1) * pageSize + 1;
        const end = Math.min(page * pageSize, total);
        info.textContent = `显示第 ${start} - ${end} 条，共 ${total} 条`;
    }
}

// 删除社区内容
function deleteCommunityRecord(recordId, button) {
    if (!confirm('确定要删除这条社区内容吗？')) {
        return;
    }
    
    button.disabled = true;
    button.textContent = ' 删除中...';
    
    fetch(`/api/admin/community/record/${recordId}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        }
    })
    .then(r => r.json())
    .then(data => {
        if (data.success || data.code === 0) {
            alert('✅ 删除成功');
            // 获取当前排序方式
            const sortBox = document.getElementById('community-sort-box');
            const sortBy = sortBox ? sortBox.value : 'latest';
            // 重新加载当前页
            const paginationDiv = document.getElementById('community-pagination');
            const currentPageBtn = paginationDiv.querySelector('button[style*="#9acd32"]') || 
                                  paginationDiv.querySelector('button[style*="bold"]');
            const currentPage = currentPageBtn ? parseInt(currentPageBtn.textContent) : 1;
            loadCommunityRecords(currentPage, sortBy);
        } else {
            alert('❌ 删除失败: ' + (data.message || data.error || '未知错误'));
            button.disabled = false;
            button.textContent = '🗑️ 删除';
        }
    })
    .catch(e => {
        console.error('删除失败:', e);
        alert('❌ 删除失败，请重试');
        button.disabled = false;
        button.textContent = '🗑️ 删除';
    });
}

// 获取 Cookie
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

/**
 * 获取 cookie
 */
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

/**
 * 修改音乐信息
 */
function editMusic(rankType, musicId) {
    alert(`修改音乐功能开发中...\n排行榜: ${rankType}\n音乐ID: ${musicId}`);
}

/**
 * 删除音乐
 */
function deleteMusic(rankType, musicId) {
    if (confirm('确定要删除这首音乐吗？')) {
        alert(`删除音乐功能开发中...\n排行榜: ${rankType}\n音乐ID: ${musicId}`);
    }
}

/**
 * 修改评论
 */
function editComment(rankType, commentId) {
    alert(`修改评论功能开发中...\n排行榜: ${rankType}\n评论ID: ${commentId}`);
}

/**
 * 删除评论
 */
function deleteComment(rankType, commentId) {
    if (confirm('确定要删除这条评论吗？')) {
        alert(`删除评论功能开发中...\n排行榜: ${rankType}\n评论ID: ${commentId}`);
    }
}

// 为 inline 事件处理器提供全局作用域
window.playMusic = playMusic;
window.searchMusicData = searchMusicData;
window.searchCommentData = searchCommentData;
window.goPage = goPage;
window.jumpToPage = jumpToPage;
window.filterUserData = filterUserData;
window.loadAnalysisData = loadAnalysisData;


window.editMusic = editMusic;
window.deleteMusic = deleteMusic;
window.editComment = editComment;
window.deleteComment = deleteComment;
window.selectUserMusicLib = selectUserMusicLib;
window.deleteUserLikeMusic = deleteUserLikeMusic;