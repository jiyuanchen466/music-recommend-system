"""
用户数据分析模块
用于分析用户分布（性别、地区、用户类型）并生成图表数据
"""

# 地区分类映射表
REGION_MAP = {
    # 华东
    '江苏': '华东', '浙江': '华东', '安徽': '华东', '福建': '华东', '江西': '华东', '山东': '华东',
    # 华北
    '北京': '华北', '天津': '华北', '河北': '华北', '山西': '华北', '内蒙古': '华北',
    # 东北
    '辽宁': '东北', '吉林': '东北', '黑龙江': '东北',
    # 华中
    '河南': '华中', '湖北': '华中', '湖南': '华中',
    # 华南
    '广东': '华南', '广西': '华南', '海南': '华南',
    # 西南
    '重庆': '西南', '四川': '西南', '贵州': '西南', '云南': '西南', '西藏': '西南',
    # 西北
    '陕西': '西北', '甘肃': '西北', '青海': '西北', '宁夏': '西北', '新疆': '西北',
}


def parse_region(region_str):
    """
    解析地区字符串，返回区域分类
    
    参数:
        region_str: 格式为 "省份 市" 或空字符串
        
    返回:
        区域名称（如 '华东'）或 '其他'
    """
    if not region_str or not region_str.strip():
        return '其他'
    
    # 获取省份（字符串的第一个空格前的部分）
    parts = region_str.strip().split()
    if len(parts) > 0:
        province = parts[0]
        return REGION_MAP.get(province, '其他')
    
    return '其他'


def analyze_user_distribution(users_data):
    """
    分析用户分布数据
    
    参数:
        users_data: 用户数据列表，每个元素都是用户对象
        
    返回:
        {
            'gender': {'labels': [...], 'values': [...]},
            'region': {'labels': [...], 'values': [...]},
            'user_type': {'labels': [...], 'values': [...]}
        }
    """
    gender_dist = {'男': 0, '女': 0, '保密': 0}
    region_dist = {}
    user_type_dist = {'普通用户': 0, '创作者': 0}
    
    for user in users_data:
        # 1. 性别分布
        gender = user.get('gender')
        if gender == 0:
            gender_dist['男'] += 1
        elif gender == 1:
            gender_dist['女'] += 1
        else:
            gender_dist['保密'] += 1
        
        # 2. 地区分布
        region_str = user.get('region', '')
        region = parse_region(region_str)
        region_dist[region] = region_dist.get(region, 0) + 1
        
        # 3. 用户类型
        is_creator = user.get('is_creator', 0)
        if is_creator == 1:
            user_type_dist['创作者'] += 1
        else:
            user_type_dist['普通用户'] += 1
    
    return {
        'gender': {
            'labels': list(gender_dist.keys()),
            'values': list(gender_dist.values())
        },
        'region': {
            'labels': list(region_dist.keys()),
            'values': list(region_dist.values())
        },
        'user_type': {
            'labels': list(user_type_dist.keys()),
            'values': list(user_type_dist.values())
        }
    }


def generate_chart_data(analysis_result):
    """
    生成前端可用的图表数据
    
    参数:
        analysis_result: analyze_user_distribution 的返回结果
        
    返回:
        {
            'gender_chart': {...},
            'region_chart': {...},
            'user_type_chart': {...}
        }
    """
    gender = analysis_result['gender']
    region = analysis_result['region']
    user_type = analysis_result['user_type']
    
    return {
        'gender_chart': {
            'title': '用户性别分布',
            'type': 'pie',
            'labels': gender['labels'],
            'values': gender['values']
        },
        'region_chart': {
            'title': '用户地区分布',
            'type': 'pie',
            'labels': region['labels'],
            'values': region['values']
        },
        'user_type_chart': {
            'title': '用户类型分布',
            'type': 'pie',
            'labels': user_type['labels'],
            'values': user_type['values']
        }
    }


def analyze_user_activity(users_data):
    """
    分析用户活跃度 - 根据创建时间和更新时间分类
    
    参数:
        users_data: 用户数据列表，包含create_time和update_time
        
    返回:
        {
            '近10天': 用户数,
            '一个月内': 用户数,
            '一年内': 用户数
        }
    """
    from datetime import datetime, timedelta
    
    now = datetime.now()
    ten_days_ago = now - timedelta(days=10)
    one_month_ago = now - timedelta(days=30)
    one_year_ago = now - timedelta(days=365)
    
    activity_dist = {
        '近10天': 0,
        '一个月内': 0,
        '一年内': 0,
        '超过一年': 0
    }
    
    for user in users_data:
        # 使用update_time作为活跃时间，如果没有则使用create_time
        active_time = user.get('update_time') or user.get('create_time')
        
        if not active_time:
            activity_dist['超过一年'] += 1
            continue
        
        # 处理datetime对象或字符串格式
        if isinstance(active_time, str):
            try:
                active_time = datetime.fromisoformat(active_time.replace('Z', '+00:00'))
                # 转换为本地时区（去掉时区信息）
                if active_time.tzinfo:
                    active_time = active_time.replace(tzinfo=None)
            except:
                activity_dist['超过一年'] += 1
                continue
        
        # 分类活跃度
        if active_time >= ten_days_ago:
            activity_dist['近10天'] += 1
        elif active_time >= one_month_ago:
            activity_dist['一个月内'] += 1
        elif active_time >= one_year_ago:
            activity_dist['一年内'] += 1
        else:
            activity_dist['超过一年'] += 1
    
    return activity_dist


def generate_activity_chart_data(activity_dist):
    """
    生成用户活跃度图表数据
    
    参数:
        activity_dist: analyze_user_activity 的返回结果
        
    返回:
        {
            'bar_chart': {...},          # 柱状图
            'pie_chart': {...}           # 饼图
        }
    """
    labels = list(activity_dist.keys())
    values = list(activity_dist.values())
    
    return {
        'bar_chart': {
            'title': '用户活跃度统计',
            'type': 'bar',
            'labels': labels,
            'values': values
        },
        'pie_chart': {
            'title': '用户活跃度分布',
            'type': 'pie',
            'labels': labels,
            'values': values
        },
        'stats': {
            'total': sum(values),
            'activity_dist': activity_dist
        }
    }


def analyze_music_popularity(ranks_data):
    """
    分析七个榜单的音乐热度数据
    
    参数:
        ranks_data: 字典，格式为
        {
            '飙升榜': [{'like_count': ..., 'click_count': ...}, ...],
            '新歌榜': [...],
            ...
        }
        
    返回:
        {
            'soaring_rank': {'total_likes': ..., 'total_clicks': ..., ...},
            ...
        }
    """
    result = {}
    
    for rank_name, songs in ranks_data.items():
        if not songs:
            result[rank_name] = {
                'total_likes': 0,
                'total_clicks': 0,
                'music_count': 0,
                'avg_likes': 0,
                'avg_clicks': 0
            }
            continue
        
        total_likes = sum(song.get('like_count', 0) for song in songs)
        total_clicks = sum(song.get('click_count', 0) for song in songs)
        music_count = len(songs)
        avg_likes = round(total_likes / music_count, 2) if music_count > 0 else 0
        avg_clicks = round(total_clicks / music_count, 2) if music_count > 0 else 0
        
        result[rank_name] = {
            'total_likes': total_likes,
            'total_clicks': total_clicks,
            'music_count': music_count,
            'avg_likes': avg_likes,
            'avg_clicks': avg_clicks
        }
    
    return result


def generate_popularity_chart_data(popularity_stats):
    """
    生成音乐热度图表数据
    
    参数:
        popularity_stats: analyze_music_popularity 的返回结果
        
    返回:
        {
            'bar_chart': {...},          # 柱状图配置
            'pie_chart': {...},          # 饼图配置
            'stats': {...}               # 统计信息
        }
    """
    rank_names = list(popularity_stats.keys())
    like_data = [popularity_stats[name]['total_likes'] for name in rank_names]
    click_data = [popularity_stats[name]['total_clicks'] for name in rank_names]
    
    total_likes = sum(like_data)
    total_clicks = sum(click_data)
    
    # 柱状图配置
    bar_chart_config = {
        'tooltip': {'trigger': 'axis'},
        'legend': {'data': ['点赞量', '点击量']},
        'grid': {'left': '3%', 'right': '4%', 'bottom': '3%', 'containLabel': True},
        'xAxis': {
            'type': 'category',
            'data': rank_names
        },
        'yAxis': {
            'type': 'value'
        },
        'series': [
            {
                'name': '点赞量',
                'data': like_data,
                'type': 'bar',
                'itemStyle': {'color': '#FF6B6B'}
            },
            {
                'name': '点击量',
                'data': click_data,
                'type': 'bar',
                'itemStyle': {'color': '#4ECDC4'}
            }
        ]
    }
    
    # 饼图配置
    pie_chart_config = {
        'tooltip': {'trigger': 'item'},
        'legend': {'data': rank_names},
        'series': [{
            'name': '点赞量分布',
            'type': 'pie',
            'radius': '50%',
            'data': [{'value': v, 'name': n} for v, n in zip(like_data, rank_names)],
            'emphasis': {'itemStyle': {'shadowBlur': 10, 'shadowOffsetX': 0, 'shadowColor': 'rgba(0, 0, 0, 0.5)'}}
        }]
    }
    
    return {
        'bar_chart': bar_chart_config,
        'pie_chart': pie_chart_config,
        'stats': {
            'total_likes': total_likes,
            'total_clicks': total_clicks,
            'ranks': popularity_stats
        }
    }


def analyze_rank_trend(music_data):
    """
    分析榜单趋势数据（歌手和国家）
    
    参数:
        music_data: 列表，每项是 {'author': ..., 'like_count': ..., 'click_count': ..., 'country': ...}
    
    返回:
        {
            'top_authors': [...],      # 最受欢迎的10名歌手
            'country_stats': {...}     # 不同国家的统计
        }
    """
    from collections import defaultdict
    
    # 统计歌手数据
    author_stats = defaultdict(lambda: {'like_count': 0, 'click_count': 0, 'songs': 0})
    country_stats = defaultdict(lambda: {'like_count': 0, 'click_count': 0})
    
    for song in music_data:
        author = song.get('author', '未知歌手')
        country = song.get('country', '未知')
        like_count = song.get('like_count', 0)
        click_count = song.get('click_count', 0)
        
        # 统计歌手数据
        author_stats[author]['like_count'] += like_count
        author_stats[author]['click_count'] += click_count
        author_stats[author]['songs'] += 1
        
        # 统计国家数据
        country_stats[country]['like_count'] += like_count
        country_stats[country]['click_count'] += click_count
    
    # 获取TOP 10歌手
    top_authors = sorted(
        author_stats.items(),
        key=lambda x: x[1]['like_count'],
        reverse=True
    )[:10]
    
    top_authors_result = []
    for author, stats in top_authors:
        top_authors_result.append({
            'author': author,
            'like_count': stats['like_count'],
            'click_count': stats['click_count'],
            'songs': stats['songs']
        })
    
    # 处理国家统计
    country_result = {}
    for country, stats in country_stats.items():
        country_result[country] = {
            'like_count': stats['like_count'],
            'click_count': stats['click_count']
        }
    
    return {
        'top_authors': top_authors_result,
        'country_stats': country_result
    }


def generate_rank_trend_chart_data(trend_data):
    """
    生成榜单趋势图表数据
    
    参数:
        trend_data: analyze_rank_trend 的返回结果
    
    返回:
        {
            'top_authors_chart': {...},    # 歌手排行图表
            'country_chart': {...}         # 国家分布图表
        }
    """
    # 歌手TOP 10柱状图
    authors = [item['author'] for item in trend_data['top_authors']]
    author_likes = [item['like_count'] for item in trend_data['top_authors']]
    author_clicks = [item['click_count'] for item in trend_data['top_authors']]
    
    top_authors_chart = {
        'tooltip': {'trigger': 'axis'},
        'legend': {'data': ['喜爱数', '点击数']},
        'grid': {'left': '3%', 'right': '4%', 'bottom': '3%', 'containLabel': True},
        'xAxis': {
            'type': 'category',
            'data': authors,
            'axisLabel': {'rotate': 45, 'interval': 0}
        },
        'yAxis': {
            'type': 'value'
        },
        'series': [
            {
                'name': '喜爱数',
                'data': author_likes,
                'type': 'bar',
                'itemStyle': {'color': '#FF6B6B'}
            },
            {
                'name': '点击数',
                'data': author_clicks,
                'type': 'bar',
                'itemStyle': {'color': '#4ECDC4'}
            }
        ]
    }
    
    # 国家分布柱状图
    countries = list(trend_data['country_stats'].keys())
    country_likes = [trend_data['country_stats'][c]['like_count'] for c in countries]
    country_clicks = [trend_data['country_stats'][c]['click_count'] for c in countries]
    
    country_chart = {
        'tooltip': {'trigger': 'axis'},
        'legend': {'data': ['喜爱数', '点击数']},
        'grid': {'left': '3%', 'right': '4%', 'bottom': '3%', 'containLabel': True},
        'xAxis': {
            'type': 'category',
            'data': countries
        },
        'yAxis': {
            'type': 'value'
        },
        'series': [
            {
                'name': '喜爱数',
                'data': country_likes,
                'type': 'bar',
                'itemStyle': {'color': '#95DE64'}
            },
            {
                'name': '点击数',
                'data': country_clicks,
                'type': 'bar',
                'itemStyle': {'color': '#5DADE2'}
            }
        ]
    }
    
    return {
        'top_authors_chart': top_authors_chart,
        'country_chart': country_chart,
        'stats': {
            'top_authors': trend_data['top_authors'],
            'countries': trend_data['country_stats']
        }
    }
