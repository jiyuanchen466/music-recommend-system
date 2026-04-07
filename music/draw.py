"""
音乐数据统计和分析模块
用于处理点击数、喜爱数的统计和图表数据生成
"""

import json
from datetime import datetime, timedelta
import pymysql


def parse_json_logs(logs_str):
    """
    解析JSON格式的日志字符串
    返回字典格式：{'2026-04-05': 5, '2026-04-04': 3, ...}
    """
    try:
        if not logs_str or logs_str == '':
            return {}
        return json.loads(logs_str)
    except:
        return {}


def get_music_stats_5days(music_id, user_id):
    """
    获取近5天的音乐数据统计
    返回格式：{
        'labels': ['日期1', '日期2', ...],
        'clicks': [点击数1, 点击数2, ...],
        'likes': [喜爱数1, 喜爱数2, ...],
        'total_clicks': 总点击数,
        'total_likes': 总喜爱数
    }
    """
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='123456',
            database='coolmusic'
        )
        cursor = connection.cursor()
        
        # 获取该音乐的日志数据
        table_name = f"{user_id}_create_musics"
        
        cursor.execute(f'''
            SELECT click_logs, like_logs FROM {table_name}
            WHERE music_id = %s
        ''', (music_id,))
        
        result = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not result:
            return {
                'labels': [],
                'clicks': [],
                'likes': [],
                'total_clicks': 0,
                'total_likes': 0
            }
        
        click_logs = parse_json_logs(result[0])
        like_logs = parse_json_logs(result[1])
        
        # 生成最近5天的日期列表
        labels = []
        clicks_data = []
        likes_data = []
        total_clicks = 0
        total_likes = 0
        
        for i in range(4, -1, -1):  # 从4天前到今天
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            labels.append(date)
            
            click_count = int(click_logs.get(date, 0))
            like_count = int(like_logs.get(date, 0))
            
            clicks_data.append(click_count)
            likes_data.append(like_count)
            
            total_clicks += click_count
            total_likes += like_count
        
        return {
            'labels': labels,
            'clicks': clicks_data,
            'likes': likes_data,
            'total_clicks': total_clicks,
            'total_likes': total_likes
        }
    
    except Exception as e:
        print(f'获取近5天数据错误: {str(e)}')
        return {
            'labels': [],
            'clicks': [],
            'likes': [],
            'total_clicks': 0,
            'total_likes': 0
        }


def get_music_stats_30days(music_id, user_id):
    """
    获取近30天的音乐数据统计（按周聚合）
    """
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='123456',
            database='coolmusic'
        )
        cursor = connection.cursor()
        
        table_name = f"{user_id}_create_musics"
        
        cursor.execute(f'''
            SELECT click_logs, like_logs FROM {table_name}
            WHERE music_id = %s
        ''', (music_id,))
        
        result = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not result:
            return {
                'labels': [],
                'clicks': [],
                'likes': [],
                'total_clicks': 0,
                'total_likes': 0
            }
        
        click_logs = parse_json_logs(result[0])
        like_logs = parse_json_logs(result[1])
        
        # 生成最近30天的周标签
        labels = []
        clicks_data = []
        likes_data = []
        total_clicks = 0
        total_likes = 0
        
        # 按周聚合（向后4周）
        for week in range(4, -1, -1):
            week_start = datetime.now() - timedelta(days=(week * 7 + 6))
            week_label = f"第{5-week}周"
            labels.append(week_label)
            
            week_clicks = 0
            week_likes = 0
            
            # 计算该周各天的数据
            for day in range(7):
                date = (week_start + timedelta(days=day)).strftime('%Y-%m-%d')
                week_clicks += int(click_logs.get(date, 0))
                week_likes += int(like_logs.get(date, 0))
            
            clicks_data.append(week_clicks)
            likes_data.append(week_likes)
            
            total_clicks += week_clicks
            total_likes += week_likes
        
        return {
            'labels': labels,
            'clicks': clicks_data,
            'likes': likes_data,
            'total_clicks': total_clicks,
            'total_likes': total_likes
        }
    
    except Exception as e:
        print(f'获取近30天数据错误: {str(e)}')
        return {
            'labels': [],
            'clicks': [],
            'likes': [],
            'total_clicks': 0,
            'total_likes': 0
        }


def get_music_stats_12months(music_id, user_id):
    """
    获取一年内的音乐数据统计（按月聚合）
    """
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='123456',
            database='coolmusic'
        )
        cursor = connection.cursor()
        
        table_name = f"{user_id}_create_musics"
        
        cursor.execute(f'''
            SELECT click_logs, like_logs FROM {table_name}
            WHERE music_id = %s
        ''', (music_id,))
        
        result = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not result:
            return {
                'labels': [],
                'clicks': [],
                'likes': [],
                'total_clicks': 0,
                'total_likes': 0
            }
        
        click_logs = parse_json_logs(result[0])
        like_logs = parse_json_logs(result[1])
        
        # 生成最近12个月的月标签
        labels = []
        clicks_data = []
        likes_data = []
        total_clicks = 0
        total_likes = 0
        
        for month_offset in range(11, -1, -1):
            # 计算该月的起始和结束日期
            today = datetime.now()
            month = today.month - month_offset
            year = today.year
            
            if month <= 0:
                month += 12
                year -= 1
            
            labels.append(f"{year}-{month:02d}")
            
            month_clicks = 0
            month_likes = 0
            
            # 计算该月所有天的数据
            # 获取该月的天数
            if month == 12:
                next_month_date = datetime(year + 1, 1, 1)
            else:
                next_month_date = datetime(year, month + 1, 1)
            
            current_date = datetime(year, month, 1)
            
            while current_date < next_month_date:
                date_str = current_date.strftime('%Y-%m-%d')
                month_clicks += int(click_logs.get(date_str, 0))
                month_likes += int(like_logs.get(date_str, 0))
                current_date += timedelta(days=1)
            
            clicks_data.append(month_clicks)
            likes_data.append(month_likes)
            
            total_clicks += month_clicks
            total_likes += month_likes
        
        return {
            'labels': labels,
            'clicks': clicks_data,
            'likes': likes_data,
            'total_clicks': total_clicks,
            'total_likes': total_likes
        }
    
    except Exception as e:
        print(f'获取12月数据错误: {str(e)}')
        return {
            'labels': [],
            'clicks': [],
            'likes': [],
            'total_clicks': 0,
            'total_likes': 0
        }


def get_music_stats(music_id, user_id, time_range='5days'):
    """
    根据时间范围获取音乐统计数据的主函数
    
    Args:
        music_id: 音乐ID
        user_id: 用户ID
        time_range: 时间范围 ('5days', '30days', '12months')
    
    Returns:
        包含图表数据的字典
    """
    if time_range == '5days':
        return get_music_stats_5days(music_id, user_id)
    elif time_range == '30days':
        return get_music_stats_30days(music_id, user_id)
    elif time_range == '12months':
        return get_music_stats_12months(music_id, user_id)
    else:
        return get_music_stats_5days(music_id, user_id)
