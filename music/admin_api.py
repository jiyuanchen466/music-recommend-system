# admin_api.py - 管理后台 API 函数

import pymysql
import json
from datetime import datetime
from project_data.getdata import get_netease_url

def get_mysql_conn():
    """获取数据库连接"""
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='123456',
        database='coolmusic',
        charset='utf8mb4'
    )
    return conn

# ========== 音乐数据相关 ==========

def get_music_data(rank_type, page=1, page_size=15, search_keyword=''):
    """
    获取音乐数据
    rank_type: 'all', 'soaring', 'newsong', 'hotsong', 'chinese', 'america', 'korea', 'japan'
    """
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 确定查询的表名
        if rank_type == 'all':
            table_name = 'music_info'
        else:
            table_name = f'{rank_type}_rank'
        
        # 构建查询条件
        where_clause = ''
        if search_keyword:
            where_clause = f"WHERE music_name LIKE '%{search_keyword}%' OR author LIKE '%{search_keyword}%'"
        
        # 获取总数
        count_query = f"SELECT COUNT(*) as total FROM {table_name} {where_clause}"
        cursor.execute(count_query)
        total = cursor.fetchone()['total']
        
        # 计算分页
        offset = (page - 1) * page_size
        
        # 获取数据
        query = f"""
            SELECT 
                id, music_id, music_name, author, album, album_cover,
                like_count, click_count as play_count, comment_count, country,
                lyrics
            FROM {table_name}
            {where_clause}
            LIMIT {offset}, {page_size}
        """
        
        cursor.execute(query)
        musics = cursor.fetchall()
        
        # 处理数据
        result_musics = []
        for music in musics:
            result_musics.append({
                'id': music.get('id'),
                'music_id': music.get('music_id'),
                'music_name': music.get('music_name'),
                'author': music.get('author'),
                'album': music.get('album'),
                'album_cover': music.get('album_cover'),
                'play_count': music.get('play_count', 0),
                'like_count': music.get('like_count', 0),
                'comment_count': music.get('comment_count', 0),
                'country': music.get('country'),
                'lyrics': music.get('lyrics', '')
            })
        
        cursor.close()
        conn.close()
        
        return {
            'success': True,
            'data': result_musics,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size
        }
        
    except Exception as e:
        print(f"获取音乐数据错误: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': []
        }

def get_music_detail(rank_type, music_id):
    """获取音乐详细信息（包括play_url）"""
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        if rank_type == 'all':
            table_name = 'music_info'
        else:
            table_name = f'{rank_type}_rank'
        
        query = f"""
            SELECT 
                id, music_id, music_name, author, album, album_cover,
                like_count, click_count as play_count, comment_count, country,
                lyrics, play_url
            FROM {table_name}
            WHERE id = %s OR music_id = %s
        """
        
        cursor.execute(query, (music_id, music_id))
        music = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if music:
            return {
                'success': True,
                'data': {
                    'id': music.get('id'),
                    'music_id': music.get('music_id'),
                    'music_name': music.get('music_name'),
                    'author': music.get('author'),
                    'album': music.get('album'),
                    'album_cover': music.get('album_cover'),
                    'play_count': music.get('play_count'),
                    'like_count': music.get('like_count'),
                    'comment_count': music.get('comment_count'),
                    'country': music.get('country'),
                    'lyrics': music.get('lyrics'),
                    'play_url': music.get('play_url')
                }
            }
        else:
            return {'success': False, 'error': '音乐不存在'}
        
    except Exception as e:
        print(f"获取音乐详情错误: {str(e)}")
        return {'success': False, 'error': str(e)}

def play_music_real_url(music_id, music_name, author):
    """
    爬取真实播放链接
    仅用于非新歌榜的音乐
    """
    try:
        # 直接使用 get_netease_url 爬取
        url = get_netease_url(music_id)
        if url:
            return {'success': True, 'url': url}
        else:
            return {'success': False, 'error': '无法获取播放链接'}
    except Exception as e:
        print(f"爬取播放链接错误: {str(e)}")
        return {'success': False, 'error': str(e)}

# ========== 评论数据相关 ==========

def get_comment_data(rank_type, page=1, page_size=15, search_keyword=''):
    """
    获取评论数据
    rank_type: 'soaring', 'newsong', 'hotsong', 'chinese', 'america', 'korea', 'japan'
    注意：没有 'all' 因为 music_info 没有评论
    """
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 确定查询的表名
        table_name = f'{rank_type}_rank_coments'
        
        # 构建查询条件
        where_clause = ''
        if search_keyword:
            where_clause = f"WHERE username LIKE '%{search_keyword}%' OR comment_content LIKE '%{search_keyword}%'"
        
        # 获取总数
        count_query = f"SELECT COUNT(*) as total FROM {table_name} {where_clause}"
        cursor.execute(count_query)
        total = cursor.fetchone()['total']
        
        # 计算分页
        offset = (page - 1) * page_size
        
        # 获取数据
        query = f"""
            SELECT 
                id, user_id, username, avatar_url, comment_content,
                comment_time, like_count
            FROM {table_name}
            {where_clause}
            ORDER BY comment_time DESC
            LIMIT {offset}, {page_size}
        """
        
        cursor.execute(query)
        comments = cursor.fetchall()
        
        # 处理数据
        result_comments = []
        for comment in comments:
            result_comments.append({
                'id': comment.get('id'),
                'user_id': comment.get('user_id'),
                'username': comment.get('username'),
                'avatar_url': comment.get('avatar_url'),
                'comment_content': comment.get('comment_content'),
                'comment_time': str(comment.get('comment_time', '')),
                'like_count': comment.get('like_count', 0)
            })
        
        cursor.close()
        conn.close()
        
        return {
            'success': True,
            'data': result_comments,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size
        }
        
    except Exception as e:
        print(f"获取评论数据错误: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'data': []
        }

def get_comment_stats(rank_type):
    """获取评论统计数据"""
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        table_name = f'{rank_type}_rank_coments'
        
        # 获取各种统计
        query = f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN like_count > 0 THEN 1 ELSE 0 END) as approved_count
            FROM {table_name}
        """
        
        cursor.execute(query)
        stats = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return {
            'success': True,
            'total_comments': stats.get('total', 0),
            'approved_comments': stats.get('approved_count', 0)
        }
        
    except Exception as e:
        print(f"获取评论统计错误: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
