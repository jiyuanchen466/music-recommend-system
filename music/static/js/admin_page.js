// 管理员后台页面脚本

document.addEventListener('DOMContentLoaded', function() {
    // 初始化菜单
    initMenu();

    // 更新实时时间
    updateTime();
    setInterval(updateTime, 1000);
});

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

    // 模拟加载延迟
    setTimeout(() => {
        loadPageContent(page);
    }, 500);
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
 * 加载音乐数据
 */
function loadMusicData(page) {
    const contentBody = document.getElementById('content-body');

    let html = `
        <div class="filter-bar">
            <div class="filter-item">
                <label>搜索:</label>
                <input type="text" placeholder="搜索音乐名称..." id="music-search">
            </div>
            <button class="filter-btn" onclick="filterMusicData()">筛选</button>
        </div>
        <div class="stats-container">
            <div class="stat-card primary">
                <div class="stat-label">总音乐数</div>
                <div class="stat-value" id="total-music">0</div>
                <div class="stat-trend">↑ 较上周增加</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">总播放数</div>
                <div class="stat-value" id="total-plays">0</div>
                <div class="stat-trend">↑ 较上周增加</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">平均点赞数</div>
                <div class="stat-value" id="avg-likes">0</div>
                <div class="stat-trend">↑ 较上周增加</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-label">平均评论数</div>
                <div class="stat-value" id="avg-comments">0</div>
                <div class="stat-trend">↓ 较上周下降</div>
            </div>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>音乐ID</th>
                    <th>音乐名称</th>
                    <th>歌手</th>
                    <th>所属榜单</th>
                    <th>播放次数</th>
                    <th>点赞数</th>
                    <th>评论数</th>
                    <th>发布时间</th>
                </tr>
            </thead>
            <tbody id="music-list">
                <tr>
                    <td colspan="9" style="text-align: center; padding: 20px;">暂无数据</td>
                </tr>
            </tbody>
        </table>
        <div class="pagination" id="music-pagination"></div>
    `;

    contentBody.innerHTML = html;

    // 模拟加载数据
    loadMusicTableData();
}

/**
 * 加载用户数据
 */
function loadUserData(page) {
    const contentBody = document.getElementById('content-body');

    let html = `
        <div style="display:flex; height:100%; gap:20px;">
            <!-- 左侧：用户选择 -->
            <div style="width:250px;">
                <div style="padding:15px; background:#f8f9fa; border-radius:4px;">
                    <h3 style="margin-bottom:15px; color:#2c3e50;">用户库</h3>
                    
                    <button onclick="userSelectType(0)" id="btn-normal"
                        style="width:100%; padding:12px; background:#9acd32; color:white; border:none; border-radius:4px; cursor:pointer; margin-bottom:10px; font-weight:500; font-size:14px;">
                        普通用户
                    </button>
                    
                    <button onclick="userSelectType(1)" id="btn-creator"
                        style="width:100%; padding:12px; background:white; color:#9acd32; border:2px solid #9acd32; border-radius:4px; cursor:pointer; margin-bottom:15px; font-weight:500; font-size:14px;">
                        创作者
                    </button>
                    
                    <input type="text" id="user-search-input" placeholder="搜索用户..." 
                        style="width:100%; padding:8px; border:1px solid #bdc3c7; border-radius:4px; font-size:13px;">
                    
                    <h3 style="margin-top:25px; margin-bottom:15px; color:#2c3e50;">功能标签</h3>
                    
                    <button onclick="userSelectType('user_lib')" id="btn-user-lib"
                        style="width:100%; padding:10px; background:white; color:#7f8c8d; border:1px solid #ecf0f1; border-radius:4px; cursor:pointer; margin-bottom:8px; font-size:13px;">
                        用户音乐库
                    </button>
                    
                    <button onclick="userSelectType('creator_lib')" id="btn-creator-lib"
                        style="width:100%; padding:10px; background:white; color:#7f8c8d; border:1px solid #ecf0f1; border-radius:4px; cursor:pointer; font-size:13px;">
                        创作者音乐库
                    </button>
                </div>
            </div>
            
            <!-- 右侧：用户列表 -->
            <div style="flex:1; overflow-y:auto;">
                <div id="user-content" style="text-align:center; color:#999; padding:30px;">
                    加载中...
                </div>
            </div>
        </div>
    `;

    contentBody.innerHTML = html;

    // 根据page参数初始化对应的用户类型
    if (page === 'normal_user') {
        userSelectType(0);
    } else if (page === 'creator_user') {
        userSelectType(1);
    } else if (page === 'user_community') {
        userSelectType(0);
    }
}

function userSelectType(type) {
    // 更新左侧按钮样式
    if (type === 0 || type === 1) {
        document.getElementById('btn-normal').style.background = type === 0 ? '#9acd32' : 'white';
        document.getElementById('btn-normal').style.color = type === 0 ? 'white' : '#9acd32';
        document.getElementById('btn-normal').style.border = type === 0 ? 'none' : '2px solid #9acd32';

        document.getElementById('btn-creator').style.background = type === 1 ? '#9acd32' : 'white';
        document.getElementById('btn-creator').style.color = type === 1 ? 'white' : '#9acd32';
        document.getElementById('btn-creator').style.border = type === 1 ? 'none' : '2px solid #9acd32';

        document.getElementById('btn-user-lib').style.background = 'white';
        document.getElementById('btn-user-lib').style.color = '#7f8c8d';
        document.getElementById('btn-creator-lib').style.background = 'white';
        document.getElementById('btn-creator-lib').style.color = '#7f8c8d';

        // 加载用户列表
        loadUsersList(type, 1);
    } else if (type === 'user_lib') {
        document.getElementById('btn-user-lib').style.background = '#9acd32';
        document.getElementById('btn-user-lib').style.color = 'white';
        document.getElementById('btn-creator-lib').style.background = 'white';
        document.getElementById('btn-creator-lib').style.color = '#7f8c8d';

        document.getElementById('btn-normal').style.background = 'white';
        document.getElementById('btn-normal').style.color = '#9acd32';
        document.getElementById('btn-normal').style.border = '2px solid #9acd32';
        document.getElementById('btn-creator').style.background = 'white';
        document.getElementById('btn-creator').style.color = '#9acd32';
        document.getElementById('btn-creator').style.border = '2px solid #9acd32';

        document.getElementById('user-content').innerHTML = '<div style="text-align:center; padding:30px; color:#999;">功能开发中...</div>';
    } else if (type === 'creator_lib') {
        document.getElementById('btn-creator-lib').style.background = '#9acd32';
        document.getElementById('btn-creator-lib').style.color = 'white';
        document.getElementById('btn-user-lib').style.background = 'white';
        document.getElementById('btn-user-lib').style.color = '#7f8c8d';

        document.getElementById('btn-normal').style.background = 'white';
        document.getElementById('btn-normal').style.color = '#9acd32';
        document.getElementById('btn-normal').style.border = '2px solid #9acd32';
        document.getElementById('btn-creator').style.background = 'white';
        document.getElementById('btn-creator').style.color = '#9acd32';
        document.getElementById('btn-creator').style.border = '2px solid #9acd32';

        document.getElementById('user-content').innerHTML = '<div style="text-align:center; padding:30px; color:#999;">功能开发中...</div>';
    }
}

function loadUsersList(isCreator, page) {
    fetch(`/api/admin/users-list/?is_creator=${isCreator}&page=${page}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                displayUsersTable(data.data, page, data.total, isCreator);
            }
        })
        .catch(e => {
            console.error('获取列表失败:', e);
            document.getElementById('user-content').innerHTML = '<div style="color:red;">加载失败</div>';
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
                    <th>注册时间</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (users.length === 0) {
        html += '<tr><td colspan="9" style="text-align:center;">暂无用户</td></tr>';
    } else {
        users.forEach((user, idx) => {
            const avatar = user.avatar || '/static/imgs/hp1.png';
            const genderText = user.gender === 0 ? '男' : (user.gender === 1 ? '女' : '保密');
            html += `
                <tr>
                    <td>${(page-1)*15 + idx + 1}</td>
                    <td><img src="${avatar}" alt="avatar" style="width:40px; height:40px; border-radius:50%; border:2px solid #9acd32; object-fit:cover;"></td>
                    <td>${user.user_id}</td>
                    <td>${user.username}</td>
                    <td>${user.nickname || '-'}</td>
                    <td>${user.email || '-'}</td>
                    <td>${genderText}</td>
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

    document.getElementById('user-content').innerHTML = html;
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

// 保留旧函数避免报错
function fetchUsersList(isCreator, page, pageTitle) {
    loadUsersList(isCreator, page);
}

function deleteUser(userId, page, isCreator, pageTitle) {
    deleteUserConfirm(userId, page, isCreator);
}

/**
 * 加载评论数据
 */
function loadCommentData(page) {
    const contentBody = document.getElementById('content-body');

    let html = `
        <div class="filter-bar">
            <div class="filter-item">
                <label>搜索用户:</label>
                <input type="text" placeholder="输入用户名..." id="comment-search">
            </div>
            <div class="filter-item">
                <label>评论状态:</label>
                <select id="comment-status">
                    <option value="">全部</option>
                    <option value="approved">已审核</option>
                    <option value="pending">待审核</option>
                    <option value="rejected">已拒绝</option>
                </select>
            </div>
            <button class="filter-btn" onclick="filterCommentData()">筛选</button>
        </div>
        <div class="stats-container">
            <div class="stat-card primary">
                <div class="stat-label">总评论数</div>
                <div class="stat-value" id="total-comments">0</div>
                <div class="stat-trend">↑ 较上周增加</div>
            </div>
            <div class="stat-card success">
                <div class="stat-label">待审核评论</div>
                <div class="stat-value" id="pending-comments">0</div>
                <div class="stat-trend">↑ 较上周增加</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-label">已批准评论</div>
                <div class="stat-value" id="approved-comments">0</div>
                <div class="stat-trend">↑ 较上周增加</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-label">已拒绝评论</div>
                <div class="stat-value" id="rejected-comments">0</div>
                <div class="stat-trend">↓ 较上周下降</div>
            </div>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>序号</th>
                    <th>评论ID</th>
                    <th>用户</th>
                    <th>评论内容</th>
                    <th>所属音乐</th>
                    <th>点赞数</th>
                    <th>发布时间</th>
                    <th>状态</th>
                </tr>
            </thead>
            <tbody id="comment-list">
                <tr>
                    <td colspan="8" style="text-align: center; padding: 20px;">暂无数据</td>
                </tr>
            </tbody>
        </table>
        <div class="pagination" id="comment-pagination"></div>
    `;

    contentBody.innerHTML = html;
    loadCommentTableData();
}

/**
 * 加载数据分析
 */
function loadAnalysisData(page) {
    const contentBody = document.getElementById('content-body');

    let html = `
        <div class="filter-bar">
            <div class="filter-item">
                <label>时间范围:</label>
                <select id="analysis-range">
                    <option value="week">最近7天</option>
                    <option value="month">最近30天</option>
                    <option value="quarter">最近3个月</option>
                    <option value="year">最近一年</option>
                </select>
            </div>
            <button class="filter-btn" onclick="refreshChart()">刷新</button>
        </div>
    `;

    switch (page) {
        case 'user_distribution':
            html += `
                <div class="chart-container">
                    <h3>用户分布分析</h3>
                    <div id="user-chart" class="chart"></div>
                </div>
            `;
            break;

        case 'music_popularity':
            html += `
                <div class="chart-container">
                    <h3>音乐热度排名Top 10</h3>
                    <div id="popularity-chart" class="chart"></div>
                </div>
            `;
            break;

        case 'rank_trend':
            html += `
                <div class="chart-container">
                    <h3>各榜单趋势分析</h3>
                    <div id="rank-chart" class="chart"></div>
                </div>
            `;
            break;

        case 'user_active':
            html += `
                <div class="chart-container">
                    <h3>用户活跃度统计</h3>
                    <div id="active-chart" class="chart"></div>
                </div>
            `;
            break;

        case 'like_distribution':
            html += `
                <div class="chart-container">
                    <h3>每日点赞分布</h3>
                    <div id="like-chart" class="chart"></div>
                </div>
            `;
            break;

        case 'comment_trend':
            html += `
                <div class="chart-container">
                    <h3>评论趋势分析</h3>
                    <div id="comment-chart" class="chart"></div>
                </div>
            `;
            break;
    }

    contentBody.innerHTML = html;

    // 初始化图表
    setTimeout(() => {
        initCharts(page);
    }, 300);
}

/**
 * 初始化图表
 */
function initCharts(page) {
    // 检查是否加载了 ECharts
    if (typeof echarts === 'undefined') {
        console.warn('ECharts 库未加载');
        return;
    }

    switch (page) {
        case 'user_distribution':
            initUserChart();
            break;
        case 'music_popularity':
            initPopularityChart();
            break;
        case 'rank_trend':
            initRankChart();
            break;
        case 'user_active':
            initActiveChart();
            break;
        case 'like_distribution':
            initLikeChart();
            break;
        case 'comment_trend':
            initCommentChart();
            break;
    }
}

/**
 * 初始化用户分布图
 */
function initUserChart() {
    const chartDom = document.getElementById('user-chart');
    const myChart = echarts.init(chartDom);

    const option = {
        title: {
            text: '',
            left: 'center'
        },
        tooltip: {
            trigger: 'item'
        },
        legend: {
            orient: 'vertical',
            left: 'left'
        },
        series: [{
            name: '用户类型',
            type: 'pie',
            radius: '50%',
            data: [
                { value: 1048, name: '普通用户' },
                { value: 735, name: '创作者用户' },
                { value: 548, name: '管理员' }
            ],
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}

/**
 * 初始化音乐热度图
 */
function initPopularityChart() {
    const chartDom = document.getElementById('popularity-chart');
    const myChart = echarts.init(chartDom);

    const option = {
        title: {
            text: ''
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        xAxis: {
            type: 'category',
            data: ['音乐1', '音乐2', '音乐3', '音乐4', '音乐5', '音乐6', '音乐7', '音乐8', '音乐9', '音乐10']
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            data: [2088, 1951, 1880, 1850, 1770, 1680, 1650, 1600, 1550, 1500],
            type: 'bar',
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#83bff6' },
                    { offset: 0.5, color: '#188df0' },
                    { offset: 1, color: '#188df0' }
                ])
            }
        }]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}

/**
 * 初始化榜单趋势图
 */
function initRankChart() {
    const chartDom = document.getElementById('rank-chart');
    const myChart = echarts.init(chartDom);

    const option = {
        title: {
            text: ''
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['飙升榜', '新歌榜', '热歌榜', '国语榜', '欧美榜']
        },
        xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            type: 'value'
        },
        series: [
            { name: '飙升榜', data: [120, 132, 101, 134, 90, 230, 210], type: 'line' },
            { name: '新歌榜', data: [220, 182, 191, 234, 290, 330, 310], type: 'line' },
            { name: '热歌榜', data: [150, 232, 201, 154, 190, 330, 410], type: 'line' },
            { name: '国语榜', data: [320, 332, 301, 334, 290, 330, 320], type: 'line' },
            { name: '欧美榜', data: [220, 132, 191, 234, 190, 130, 110], type: 'line' }
        ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}

/**
 * 初始化活跃度图
 */
function initActiveChart() {
    const chartDom = document.getElementById('active-chart');
    const myChart = echarts.init(chartDom);

    const option = {
        title: {
            text: ''
        },
        tooltip: {
            trigger: 'axis'
        },
        xAxis: {
            type: 'category',
            data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            name: '活跃用户数',
            data: [820, 932, 1100, 1234, 1290, 1330, 1320],
            type: 'line',
            smooth: true,
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#83bff6' },
                    { offset: 1, color: '#188df0' }
                ])
            }
        }]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}

/**
 * 初始化点赞分布图
 */
function initLikeChart() {
    const chartDom = document.getElementById('like-chart');
    const myChart = echarts.init(chartDom);

    const option = {
        title: {
            text: ''
        },
        tooltip: {
            trigger: 'axis'
        },
        xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            name: '点赞数',
            data: [450, 520, 480, 590, 620, 700, 680],
            type: 'bar',
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#83ee6f' },
                    { offset: 0.5, color: '#27ae60' },
                    { offset: 1, color: '#27ae60' }
                ])
            }
        }]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}

/**
 * 初始化评论趋势图
 */
function initCommentChart() {
    const chartDom = document.getElementById('comment-chart');
    const myChart = echarts.init(chartDom);

    const option = {
        title: {
            text: ''
        },
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['新增评论', '待审核', '已批准']
        },
        xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        },
        yAxis: {
            type: 'value'
        },
        series: [
            { name: '新增评论', data: [120, 132, 101, 134, 90, 230, 210], type: 'line' },
            { name: '待审核', data: [220, 182, 191, 234, 290, 330, 310], type: 'line' },
            { name: '已批准', data: [150, 232, 201, 154, 190, 330, 410], type: 'line' }
        ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}

/**
 * 模拟加载音乐表格数据
 */
function loadMusicTableData() {
    const musicList = document.getElementById('music-list');
    if (!musicList) return;

    const data = [
        ['1', 'M001', '晴天', '周杰伦', '飙升榜', '50000', '2500', '1200', '2024-01-15'],
        ['2', 'M002', '千里之外', '周杰伦', '热歌榜', '45000', '2200', '1100', '2024-01-14'],
        ['3', 'M003', '夜曲', '周杰伦', '国语榜', '42000', '2000', '950', '2024-01-13'],
        ['4', 'M004', 'Shape of You', 'Ed Sheeran', '欧美榜', '38000', '1800', '850', '2024-01-12'],
        ['5', 'M005', 'Blinding Lights', 'The Weeknd', '欧美榜', '35000', '1600', '750', '2024-01-11']
    ];

    let html = '';
    data.forEach(row => {
        html += `<tr>
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td>${row[5]}</td>
            <td>${row[6]}</td>
            <td>${row[7]}</td>
            <td>${row[8]}</td>
        </tr>`;
    });

    musicList.innerHTML = html;

    // 更新统计数据
    document.getElementById('total-music').textContent = '125';
    document.getElementById('total-plays').textContent = '210K';
    document.getElementById('avg-likes').textContent = '2.1K';
    document.getElementById('avg-comments').textContent = '950';
}

/**
 * 模拟加载用户表格数据
 */
function loadUserTableData() {
    const userList = document.getElementById('user-list');
    if (!userList) return;

    const data = [
        ['1', 'U001', 'user001', 'user001@qq.com', '普通用户', '2024-01-10', '2024-01-15', '正常'],
        ['2', 'U002', 'user002', 'user002@qq.com', '创作者', '2024-01-09', '2024-01-15', '正常'],
        ['3', 'U003', 'user003', 'user003@qq.com', '普通用户', '2024-01-08', '2024-01-14', '正常'],
        ['4', 'U004', 'user004', 'user004@qq.com', '普通用户', '2024-01-07', '2024-01-13', '正常'],
        ['5', 'U005', 'user005', 'user005@qq.com', '创作者', '2024-01-06', '2024-01-15', '正常']
    ];

    let html = '';
    data.forEach(row => {
        html += `<tr>
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td>${row[5]}</td>
            <td>${row[6]}</td>
            <td>${row[7]}</td>
        </tr>`;
    });

    userList.innerHTML = html;

    // 更新统计数据
    document.getElementById('total-users').textContent = '5000';
    document.getElementById('active-users').textContent = '2500';
    document.getElementById('creator-count').textContent = '450';
    document.getElementById('new-users').textContent = '280';
}

/**
 * 模拟加载评论表格数据
 */
function loadCommentTableData() {
    const commentList = document.getElementById('comment-list');
    if (!commentList) return;

    const data = [
        ['1', 'C001', '用户001', '这是一条很好的评论...', '晴天', '128', '2024-01-15 10:30', '已批准'],
        ['2', 'C002', '用户002', '不错的音乐', '千里之外', '45', '2024-01-15 09:45', '已批准'],
        ['3', 'C003', '用户003', '评论内容待审核...', '夜曲', '23', '2024-01-15 08:20', '待审核'],
        ['4', 'C004', '用户004', '优质评论', 'Shape of You', '156', '2024-01-15 07:15', '已批准'],
        ['5', 'C005', '用户005', '垃圾评论', 'Blinding Lights', '0', '2024-01-15 06:00', '已拒绝']
    ];

    let html = '';
    data.forEach(row => {
        html += `<tr>
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td>${row[5]}</td>
            <td>${row[6]}</td>
            <td>${row[7]}</td>
        </tr>`;
    });

    commentList.innerHTML = html;

    // 更新统计数据
    document.getElementById('total-comments').textContent = '8500';
    document.getElementById('pending-comments').textContent = '320';
    document.getElementById('approved-comments').textContent = '7890';
    document.getElementById('rejected-comments').textContent = '290';
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

/**
 * 筛选音乐数据
 */
function filterMusicData() {
    alert('音乐数据筛选功能开发中...');
}

/**
 * 筛选用户数据
 */
function filterUserData() {
    alert('用户数据筛选功能开发中...');
}

/**
 * 筛选评论数据
 */
function filterCommentData() {
    alert('评论数据筛选功能开发中...');
}

/**
 * 刷新图表
 */
function refreshChart() {
    alert('图表刷新功能开发中...');
}