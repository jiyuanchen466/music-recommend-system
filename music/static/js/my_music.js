// my_music.js - 我的音乐页面交互逻辑

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 我的音乐页面加载完成');
    loadUserInfo();
    loadFavoriteMusics();
});

async function loadUserInfo() {
    const userId = getCookie('user_id');

    if (!userId) {
        console.log('⚠️ 未登录，使用默认用户信息');
        document.getElementById('userNickname').textContent = '炫音用户';
        document.getElementById('userAvatar').src = '/static/imgs/hp1.png';
        return;
    }

    try {
        console.log('🔍 正在获取用户信息，userId:', userId);

        const response = await fetch(`/api/user/info/?user_id=${userId}`);
        const data = await response.json();

        console.log('📦 完整响应数据:', JSON.stringify(data, null, 2));

        if (data.code === 200 && data.data) {
            const { nickname, avatar_url } = data.data;

            console.log('✓ 获取到用户信息:', { nickname, avatar_url });
            console.log('  - avatar_url 类型:', typeof avatar_url);
            console.log('  - avatar_url 长度:', avatar_url ? avatar_url.length : 0);
            console.log('  - avatar_url 值:', JSON.stringify(avatar_url));

            if (data._debug) {
                console.log('🐛 后端调试信息:', data._debug);
            }

            // 设置昵称（如果为空则使用"炫音用户"）
            document.getElementById('userNickname').textContent = nickname || '炫音用户';

            // 设置头像
            const userAvatarEl = document.getElementById('userAvatar');
            userAvatarEl.src = avatar_url || '/static/imgs/hp1.png';
            console.log('  - 最终设置的 src:', userAvatarEl.src);

            // 图片加载失败时使用默认头像
            userAvatarEl.onerror = function() {
                console.warn('⚠️ 头像加载失败，使用默认头像:', this.src);
                this.src = '/static/imgs/hp1.png';
            };

            userAvatarEl.onload = function() {
                console.log('✅ 头像加载成功:', this.src);
            };
        } else {
            console.warn('⚠️ 获取用户信息失败:', data.message);
            document.getElementById('userNickname').textContent = '炫音用户';
            document.getElementById('userAvatar').src = '/static/imgs/hp1.png';
        }
    } catch (error) {
        console.error('❌ 获取用户信息异常:', error);
        document.getElementById('userNickname').textContent = '炫音用户';
        document.getElementById('userAvatar').src = '/static/imgs/hp1.png';
    }
}

async function loadFavoriteMusics() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const musicTable = document.getElementById('musicTable');

    if (loadingState) loadingState.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    if (musicTable) musicTable.style.display = 'none';

    try {
        const userId = getCookie('user_id');

        if (!userId) {
            showEmptyState('请先登录后查看喜爱的音乐');
            return;
        }

        console.log('🔍 开始加载用户喜爱的音乐，userId:', userId);

        // 第一步：查询用户喜爱数据库，获取 is_liked=1 的音乐 ID 列表
        const favoriteMusicIds = await queryUserFavoriteMusics(userId);

        if (!favoriteMusicIds || favoriteMusicIds.length === 0) {
            showEmptyState();
            return;
        }

        console.log('✓ 获取到', favoriteMusicIds.length, '首喜爱的音乐');

        // 第二步：根据 music_id 依次查询 music_info 表和所有排行榜数据库
        const musicDetails = await queryMusicDetails(favoriteMusicIds);

        console.log('✓ 查询到', musicDetails.length, '首音乐的详细信息');

        updateFavoriteCount(musicDetails.length);
        renderMusicList(musicDetails);

    } catch (error) {
        console.error('❌ 加载音乐列表失败:', error);
        showEmptyState('加载失败，请刷新重试');
    } finally {
        if (loadingState) loadingState.style.display = 'none';
    }
}

async function queryUserFavoriteMusics(userId) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `/api/user/favorite_musics/?user_id=${userId}`;
        console.log('📤 发送请求:', url);

        xhr.open('GET', url, true);

        xhr.onload = function() {
            console.log('📥 收到响应，状态码:', xhr.status);
            console.log('📥 响应内容:', xhr.responseText);

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('✅ 解析响应成功:', response);

                    if (response.code === 200 && response.data && response.data.music_ids) {
                        console.log('📊 获取到音乐 ID 列表:', response.data.music_ids);
                        resolve(response.data.music_ids);
                    } else {
                        console.warn('⚠️ 响应格式不符合预期:', response);
                        resolve([]);
                    }
                } catch (e) {
                    console.error('❌ JSON 解析失败:', e);
                    resolve([]);
                }
            } else {
                console.error('❌ HTTP 错误:', xhr.status);
                resolve([]);
            }
        };

        xhr.onerror = function() {
            console.error('❌ 网络请求失败');
            resolve([]);
        };

        xhr.send();
    });
}

async function queryMusicDetails(musicIds) {
    const musicDetails = [];
    const processed = new Set();

    const rankTypes = [
        'soaring', 'newsong', 'hotsong', 'chinese',
        'europe', 'korean', 'japanese'
    ];

    const rankTableMap = {
        'soaring': 'soaring_rank',
        'newsong': 'newsong_rank',
        'hotsong': 'hotsong_rank',
        'chinese': 'chinese_rank',
        'europe': 'america_rank',
        'korean': 'korea_rank',
        'japanese': 'japan_rank'
    };

    const promises = musicIds.map(async(musicId) => {
        if (processed.has(musicId)) return null;
        processed.add(musicId);

        try {
            // 1. 先查询所有排行榜数据库
            for (const rankType of rankTypes) {
                const rankTableName = rankTableMap[rankType];
                const musicInfo = await queryMusicFromRankTable(rankTableName, musicId);

                if (musicInfo) {
                    console.log(`✓ 从排行榜表 ${rankTableName} 查询到 ${musicId}`);
                    return musicInfo;
                }
            }

            // 2. 如果排行榜都没有，查询 music_info 表
            const musicInfo = await queryMusicFromMusicInfo(musicId);

            if (musicInfo) {
                console.log(`✓ 从 music_info 表查询到 ${musicId}`);
                return musicInfo;
            }

            console.warn(`✗ 未找到 ${musicId} 的信息`);
            return null;

        } catch (error) {
            console.error(`查询 ${musicId} 失败:`, error);
            return null;
        }
    });

    const results = await Promise.all(promises);
    return results.filter(item => item !== null);
}

async function queryMusicFromRankTable(tableName, musicId) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/api/music/rank_detail/?table=${tableName}&music_id=${musicId}`, true);

        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.code === 200 && response.data) {
                        resolve({
                            music_id: response.data.music_id,
                            music_name: response.data.music_name,
                            author: response.data.author,
                            album: response.data.album || '',
                            album_cover: response.data.album_cover || ''
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        };

        xhr.onerror = function() {
            resolve(null);
        };

        xhr.send();
    });
}

async function queryMusicFromMusicInfo(musicId) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/api/music/info/?music_id=${musicId}`, true);

        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.code === 200 && response.data) {
                        resolve({
                            music_id: response.data.music_id,
                            music_name: response.data.music_name,
                            author: response.data.author,
                            album: response.data.album || '',
                            album_cover: response.data.album_cover || ''
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        };

        xhr.onerror = function() {
            resolve(null);
        };

        xhr.send();
    });
}

function renderMusicList(musicList) {
    const musicTableBody = document.getElementById('musicTableBody');
    const musicTable = document.getElementById('musicTable');
    const emptyState = document.getElementById('emptyState');

    if (!musicTableBody) return;

    musicTableBody.innerHTML = '';

    if (!musicList || musicList.length === 0) {
        showEmptyState();
        return;
    }

    if (musicTable) musicTable.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';

    musicList.forEach((music, index) => {
        const row = document.createElement('tr');

        // 创建播放按钮（旋转 90°的三角）
        const playButton = document.createElement('td');
        playButton.className = 'play-button-cell';
        playButton.innerHTML = '<span class="play-icon">▶</span>';
        playButton.title = '播放';
        playButton.onclick = function() {
            playMusic(music.music_id);
        };

        // 序号
        const indexCell = document.createElement('td');
        indexCell.className = 'index-cell';
        indexCell.textContent = index + 1;

        // 歌名
        const nameCell = document.createElement('td');
        nameCell.className = 'music-name-cell';
        nameCell.title = escapeHtml(music.music_name);
        nameCell.textContent = escapeHtml(music.music_name);

        // 歌手
        const artistCell = document.createElement('td');
        artistCell.className = 'artist-name-cell';
        artistCell.title = escapeHtml(music.author);
        artistCell.textContent = escapeHtml(music.author);

        // 专辑
        const albumCell = document.createElement('td');
        albumCell.className = 'album-name-cell';
        albumCell.title = escapeHtml(music.album || '未知专辑');
        albumCell.textContent = escapeHtml(music.album || '未知专辑');

        // 按顺序添加单元格：序号、播放按钮、歌名、歌手、专辑
        row.appendChild(indexCell);
        row.appendChild(playButton);
        row.appendChild(nameCell);
        row.appendChild(artistCell);
        row.appendChild(albumCell);

        musicTableBody.appendChild(row);
    });

    console.log('✓ 音乐列表渲染完成，共', musicList.length, '首');
}

// 播放音乐函数
function playMusic(musicId) {
    console.log('🎵 准备播放音乐:', musicId);

    // 跳转到播放页面或调用播放接口
    window.open(`/music/play/${musicId}/`, '_blank');
}

function showEmptyState(message) {
    const emptyState = document.getElementById('emptyState');
    const musicTable = document.getElementById('musicTable');

    if (emptyState) {
        emptyState.style.display = 'block';
        if (message) {
            const emptyText = emptyState.querySelector('.empty-text');
            if (emptyText) emptyText.textContent = message;
        }
    }

    if (musicTable) musicTable.style.display = 'none';
}

function updateFavoriteCount(count) {
    const countEl = document.getElementById('favoriteCount');
    if (countEl) {
        countEl.textContent = count;
    }
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}