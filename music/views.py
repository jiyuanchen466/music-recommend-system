# music/views.py
import os
import random
from django.conf import settings
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.shortcuts import redirect, render
import requests
import pymysql
from datetime import datetime
from django.core.cache import cache
from .models import MusicInfo
from django.db import connection
from math import ceil
import json
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from .models import LikeMusics, CommunityRecords
from project_data.getdata import get_netease_url, get_audio_duration
from django.utils import timezone
from . import draw
def nav_page(request):
    return render(request, 'nav_page.html')

def login(request):
    return render(request, 'login.html')

def admin_login(request):
    """管理员登陆页面"""
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        # 硬编码验证账号密码
        ADMIN_USERNAME = 'sonyxianadmin'
        ADMIN_PASSWORD = 'sonyxian123456'
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            # 使用 cookies 存储登陆信息，不使用 session
            response = redirect('/admin_page/')
            response.set_cookie('admin_logged_in', 'true', max_age=86400)  # 24小时有效期
            response.set_cookie('admin_username', username, max_age=86400)
            return response
        else:
            error = '账号或密码错误'
            return render(request, 'admin_login.html', {'error': error})
    
    return render(request, 'admin_login.html')

def admin_page(request):
    """管理员后台页面"""
    # 检查 cookies 中的登陆标记
    if request.COOKIES.get('admin_logged_in') != 'true':
        return redirect('/admin_login/')
    
    admin_username = request.COOKIES.get('admin_username', 'admin')
    return render(request, 'admin_page.html', {'admin_username': admin_username})

def admin_logout(request):
    """管理员登出"""
    response = redirect('/admin_login/')
    response.delete_cookie('admin_logged_in')
    response.delete_cookie('admin_username')
    return response

# ========== 管理后台 API ==========

def api_get_music_data(request):
    """API: 获取音乐数据"""
    from .admin_api import get_music_data
    
    rank_type = request.GET.get('rank_type', 'all')
    page = int(request.GET.get('page', 1))
    search_keyword = request.GET.get('search', '').strip()
    
    result = get_music_data(rank_type, page, 15, search_keyword)
    return JsonResponse(result)

def api_get_music_detail(request):
    """API: 获取音乐详细信息"""
    from .admin_api import get_music_detail
    
    rank_type = request.GET.get('rank_type', 'all')
    music_id = request.GET.get('music_id', '')
    
    result = get_music_detail(rank_type, music_id)
    return JsonResponse(result)

def api_play_music(request):
    """API: 爬取并播放音乐"""
    from .admin_api import play_music_real_url
    
    music_id = request.POST.get('music_id', '')
    music_name = request.POST.get('music_name', '')
    author = request.POST.get('author', '')
    
    result = play_music_real_url(music_id, music_name, author)
    return JsonResponse(result)

def api_get_comment_data(request):
    """API: 获取评论数据"""
    from .admin_api import get_comment_data
    
    rank_type = request.GET.get('rank_type', 'soaring')
    page = int(request.GET.get('page', 1))
    search_keyword = request.GET.get('search', '').strip()
    
    result = get_comment_data(rank_type, page, 15, search_keyword)
    return JsonResponse(result)

def api_get_comment_stats(request):
    """API: 获取评论统计"""
    from .admin_api import get_comment_stats
    
    rank_type = request.GET.get('rank_type', 'soaring')
    result = get_comment_stats(rank_type)
    return JsonResponse(result)

def index(request):
    return render(request, 'index.html')
def get_mysql_conn():
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='123456',
        database='coolmusic',
        connect_timeout=5,  # 连接超时 5 秒
        read_timeout=10,    # 读取超时 10 秒
        write_timeout=10,   # 写入超时 10 秒
    )
    return conn


def _load_daily_log(log_value):
    if not log_value:
        return {}

    if isinstance(log_value, dict):
        return dict(log_value)

    if isinstance(log_value, str):
        log_value = log_value.strip()
        if not log_value:
            return {}
        try:
            parsed_value = json.loads(log_value)
            return parsed_value if isinstance(parsed_value, dict) else {}
        except Exception:
            return {}

    return {}


def _bump_daily_log(log_value, date_key=None):
    if date_key is None:
        date_key = datetime.now().strftime('%Y-%m-%d')

    log_data = _load_daily_log(log_value)
    current_value = log_data.get(date_key, 0)

    try:
        current_value = int(current_value)
    except (TypeError, ValueError):
        current_value = 0

    log_data[date_key] = current_value + 1
    return json.dumps(log_data, ensure_ascii=False)


def _increment_creator_music_stats(cursor, table_name, music_id, count_field, log_field):
    cursor.execute(f"""
        SELECT {log_field}
        FROM {table_name}
        WHERE music_id = %s
        LIMIT 1
    """, (music_id,))
    result = cursor.fetchone()

    if not result:
        return False

    if isinstance(result, dict):
        log_value = result.get(log_field)
    else:
        log_value = result[0]

    updated_log = _bump_daily_log(log_value)
    cursor.execute(f"""
        UPDATE {table_name}
        SET {count_field} = {count_field} + 1,
            {log_field} = %s
        WHERE music_id = %s
    """, (updated_log, music_id))
    return True
def music_hall(request):
    # 随机选取 8 条数据（保持原功能）
    music_list = MusicInfo.objects.order_by('?')[:8]
    
    # 获取所有国家的音乐数据（新增功能）
    # ★修改：按click_count降序排列，选择点击数最多的9个
    countries = ['中国', '欧美', '日本', '韩国']
    music_data = {}
    
    for country in countries:
        country_music_list = MusicInfo.objects.filter(country=country).order_by('-click_count')[:9]
        music_data[country] = [
            {
                'music_id': music.music_id,
                'album_cover': music.album_cover,
                'music_name': music.music_name,
                'author_id': music.author_id,
                'author': music.author,
                'click_count': music.click_count  # ★新增：传递点击数
            }
            for music in country_music_list
        ]
    
    # 获取所有榜单数据（新增）
    rank_tables = {
        'soaring': 'soaring_rank',
        'newsong': 'newsong_rank',
        'hotsong': 'hotsong_rank',
        'chinese': 'chinese_rank',
        'europe': 'america_rank',  # ← 改为'europe'
        'korean': 'korea_rank',
        'japanese': 'japan_rank'
    }
    
    all_rank_data = {}
    conn = get_mysql_conn()
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    for rank_key, table_name in rank_tables.items():
        try:
            # 先查询总数
            cursor.execute(f"SELECT COUNT(*) as total FROM {table_name}")
            total_result = cursor.fetchone()
            total_count = total_result.get('total', 0) if total_result else 0
            print(f"{table_name}: 总共有 {total_count} 条数据")
            
            # 再查询所有数据
            cursor.execute(f"SELECT music_id, music_name, author, author_id FROM {table_name} ORDER BY id ASC")
            rank_data = cursor.fetchall()
            print(f"{table_name}: 实际获取到 {len(rank_data)} 条数据")  # 添加调试信息
            
            # 确保数据不为空
            if not rank_data:
                print(f"Warning: {table_name} has no data")
                rank_data = []
            
            all_rank_data[rank_key] = rank_data
            # 缓存数据
            cache.set(f'{rank_key}_rank', rank_data, 86400)
        except Exception as e:
            print(f"Error fetching {table_name}: {e}")
            all_rank_data[rank_key] = []
    
    cursor.close()
    conn.close()
    
    # 格式化当前日期
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    # 将数据传递给模板
    context = {
        'music_list': music_list,
        'music_data': music_data,
        'initial_soaring_data': all_rank_data.get('soaring', []),
        'all_rank_data': all_rank_data,  # 新增：传递所有榜单数据
        'current_date': current_date,
        'current_country': '中国'
    }
    
    return render(request, 'music/music_hall.html', context)

def get_music_by_country(request):
    """
    根据国家获取音乐数据（AJAX 接口）
    GET 参数：country - 国家名称（华语/欧美/日语/韩语）
    返回：JSON格式的音乐数据列表
    """
    try:
        country = request.GET.get('country', '').strip()
        
        if not country:
            return JsonResponse({
                'code': 400,
                'msg': '国家参数不能为空'
            })
        
        # 国家名称映射
        country_map = {
            '华语': '中国',
            '欧美': '欧美',
            '日语': '日本',
            '韩语': '韩国'
        }
        
        # 转换国家名称
        db_country = country_map.get(country, country)
        print(f"[热门推荐] 查询国家: {country} -> {db_country}")
        
        # 查询该国家的音乐数据，按点击数降序排列，最多返回9条
        music_list = MusicInfo.objects.filter(country=db_country).order_by('-click_count')[:9]
        
        print(f"[热门推荐] 查询结果: {len(music_list)} 条")
        
        music_data = [
            {
                'music_id': music.music_id,
                'music_name': music.music_name,
                'author_id': music.author_id,
                'author': music.author,
                'album_cover': music.album_cover,
                'click_count': music.click_count
            }
            for music in music_list
        ]
        
        return JsonResponse({
            'code': 200,
            'msg': '获取成功',
            'music_data': music_data
        })
    
    except Exception as e:
        print(f'获取国家音乐数据出错: {e}')
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'msg': f'服务器错误: {str(e)}'
        })

def get_personalized_recommendations(request):
    """
    获取个性化推荐
    
    逻辑：
    1. 获取当前用户ID
    2. 检查用户的喜爱数据（user_{user_id}_like_musics表）
    3. 如果 >= 10条，使用协同过滤推荐
    4. 如果 < 10条，使用随机推荐
    """
    try:
        from django.db import connection
        
        print(f'\n{"="*60}')
        print('🎵 获取个性化推荐')
        print(f'{"="*60}')
        
        # 获取用户ID（从cookie或session）
        user_id = request.COOKIES.get('user_id')
        n_recommendations = int(request.GET.get('count', 8))
        
        print(f'用户ID: {user_id}')
        print(f'推荐数量: {n_recommendations}')
        
        # 没有登录，返回随机推荐
        if not user_id:
            print('用户未登录，使用随机推荐')
            random_musics = MusicInfo.objects.order_by('?')[:n_recommendations]
            recommendations = [
                {
                    'music_id': m.music_id,
                    'music_name': m.music_name,
                    'author_id': m.author_id,
                    'author': m.author,
                    'album_cover': m.album_cover,
                    'click_count': m.click_count,
                    'reason': '随机推荐'
                }
                for m in random_musics
            ]
            return JsonResponse({
                'code': 200,
                'data': recommendations,
                'recommendation_type': 'random'
            })
        
        # 使用原生SQL查询用户的喜爱数据数量（表名格式: {user_id}_like_musics）
        table_name = f'{user_id}_like_musics'
        cursor = connection.cursor()
        
        try:
            cursor.execute(f"""
                SELECT COUNT(*) as count 
                FROM `{table_name}` 
                WHERE is_liked = 1
            """)
            result = cursor.fetchone()
            user_like_count = result[0] if result else 0
        except Exception as e:
            print(f'⚠️ 查询表 {table_name} 失败: {e}')
            user_like_count = 0
        
        print(f'用户喜爱歌曲数: {user_like_count}')
        
        # 判断是否有足够的数据进行协同过滤
        if user_like_count >= 10:
            print('✅ 用户数据充分，使用协同过滤推荐')
            
            try:
                # 调用协同过滤推荐
                from .collaborative_filtering import get_recommendations_for_user
                
                cf_recommendations = get_recommendations_for_user(
                    user_id=user_id,
                    method='hybrid',
                    n_recommendations=n_recommendations * 2  # 请求更多，以防有过滤
                )
                
                print(f'协同过滤生成了 {len(cf_recommendations)} 条推荐')
                
                recommendations = [
                    {
                        'music_id': rec['music_id'],
                        'music_name': rec['music_name'],
                        'author': rec['author'],
                        'author_id': rec['author'],  # 没有author_id，用author代替
                        'album_cover': rec['album_cover'],
                        'click_count': 0,
                        'reason': rec.get('reason', '为你推荐')
                    }
                    for rec in cf_recommendations
                ]
                
                # 如果协同过滤有结果，返回（即使不足也返回）
                if len(recommendations) > 0:
                    # 如果不足 n_recommendations 条，补充随机推荐
                    if len(recommendations) < n_recommendations:
                        print(f'⚠️ 协同过滤仅返回 {len(recommendations)} 条，补充随机推荐')
                        
                        # 获取已推荐的歌曲ID
                        recommended_ids = set(rec['music_id'] for rec in recommendations)
                        
                        # 补充随机推荐
                        random_musics = MusicInfo.objects.exclude(
                            music_id__in=recommended_ids
                        ).order_by('?')[:n_recommendations - len(recommendations)]
                        
                        for m in random_musics:
                            recommendations.append({
                                'music_id': m.music_id,
                                'music_name': m.music_name,
                                'author': m.author,
                                'author_id': m.author_id,
                                'album_cover': m.album_cover,
                                'click_count': m.click_count,
                                'reason': '精选推荐'
                            })
                    
                    return JsonResponse({
                        'code': 200,
                        'data': recommendations[:n_recommendations],
                        'recommendation_type': 'collaborative_filtering'
                    })
                else:
                    print('⚠️ 协同过滤无结果，降级为随机推荐')
                    
            except Exception as cf_error:
                print(f'⚠️ 协同过滤推荐失败: {cf_error}')
                import traceback
                traceback.print_exc()
        
        # 数据不足或协同过滤失败，使用随机推荐
        print(f'⏭️ 数据不足(< 10条)或CF失败，使用随机推荐')
        
        # 直接返回随机推荐（不排除用户已喜欢的歌曲）
        # 原因：{user_id}_like_musics 表中的 music_id 是字符串格式（如 'music_xxx_xxx'）
        # 而 MusicInfo.music_id 是整数，两者格式不兼容，无法进行 exclude 过滤
        # 允许推荐中出现重复是可以接受的
        random_musics = MusicInfo.objects.order_by('?')[:n_recommendations]
        print(f'✓ 获取 {len(random_musics)} 条随机推荐')
        
        recommendations = [
            {
                'music_id': m.music_id,
                'music_name': m.music_name,
                'author_id': m.author_id,
                'author': m.author,
                'album_cover': m.album_cover,
                'click_count': m.click_count,
                'reason': '随机推荐'
            }
            for m in random_musics
        ]
        
        return JsonResponse({
            'code': 200,
            'data': recommendations,
            'recommendation_type': 'random',
            'user_like_count': user_like_count
        })
        
    except Exception as e:
        print(f'❌ 获取推荐失败: {e}')
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            'code': 500,
            'message': f'获取推荐失败: {str(e)}',
            'recommendation_type': 'error'
        }, status=500)

def get_rank_comments(request):
    """获取榜单评论"""
    try:
        print(f"\n{'='*60}")
        print(f"=== 获取榜单评论 ===")
        print(f"request.method: {request.method}")
        print(f"request.GET: {request.GET}")
        print(f"{'='*60}")
        
        # 获取 rank_type 参数
        rank_type = request.GET.get('rank_type')
        page_str = request.GET.get('page', '1')
        
        print(f"rank_type: {rank_type}")
        print(f"page: {page_str}")
        
        # 验证 rank_type 是否有效
        valid_rank_types = ['soaring', 'newsong', 'hotsong', 'chinese', 'europe', 'korean', 'japanese']
        
        if not rank_type or rank_type not in valid_rank_types:
            print(f"无效榜单类型：{rank_type}")
            return JsonResponse({'code': 400, 'msg': '无效榜单类型'}, status=400)
        
        # 验证 page 参数
        try:
            page = int(page_str)
        except ValueError:
            page = 1
        
        # 计算分页参数
        page_size = 50
        offset = (page - 1) * page_size
        
        # 查询总记录数
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        try:
            # 根据 rank_type 查询总记录数 - 修正表名映射
            table_name_map = {
                'soaring': 'soaring',
                'newsong': 'newsong',
                'hotsong': 'hotsong',
                'chinese': 'chinese',
                'europe': 'america',
                'korean': 'korea',
                'japanese': 'japan'
            }
            
            db_rank_type = table_name_map.get(rank_type, rank_type)
            table_name = f"{db_rank_type}_rank_coments"
            
            print(f"查询评论表：{table_name}")
            
            cursor.execute(f"SELECT COUNT(*) as total FROM {table_name}")
            total_result = cursor.fetchone()
            total_count = total_result.get('total', 0) if total_result else 0
            
            # 查询分页 data
            cursor.execute(f"SELECT user_id, username, avatar_url, comment_content, comment_time, like_count FROM {table_name} ORDER BY id ASC LIMIT {page_size} OFFSET {offset}")
            comments_data = cursor.fetchall()
            # 计算总页数
            total_pages = max(1, (total_count + page_size - 1) // page_size)
            
            print(f"查询成功，总_count: {total_count}, total_pages: {total_pages}, current_page: {page}")
            
            # 返回 data
            return JsonResponse({
                'code': 200,
                'data': {
                    'comments': comments_data,
                    'total_count': total_count,
                    'total_pages': total_pages,
                    'current_page': page
                }
            })
        except Exception as e:
            print(f"查询失败：{e}")
            return JsonResponse({'code': 500, 'msg': '查询失败'}, status=500)
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f"获取榜单评论异常：{e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'code': 500, 'msg': str(e)}, status=500)



def get_rank_data(request):
    # 只检查是否为 GET 请求，移除 is-ajax 检查
    if request.method != 'GET':
        return JsonResponse({'code': 405, 'msg': '请求方式错误'})
    
    rank_type = request.GET.get('rank_type')
    rank_table_map = {
        'soaring': 'soaring_rank',
        'newsong': 'newsong_rank',
        'hotsong': 'hotsong_rank',
        'chinese': 'chinese_rank',
        'europe': 'america_rank',  # ← 前端'europe'映射到'america_rank'
        'korean': 'korea_rank',
        'japanese': 'japan_rank'
    }
    
    cache_key = f'{rank_type}_rank'
    rank_data = cache.get(cache_key)
    
    if not rank_data:
        table_name = rank_table_map.get(rank_type)
        if not table_name:
            return JsonResponse({'code': 400, 'msg': '无效榜单类型'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        try:
            cursor.execute(f"SELECT music_id, music_name, author, author_id FROM {table_name} ORDER BY id ASC")
            rank_data = cursor.fetchall()
            cache.set(cache_key, rank_data, 86400)
        except Exception as e:
            print(e)
            return JsonResponse({'code': 500, 'msg': '查询失败'})
        finally:
            cursor.close()
            conn.close()
    
    current_date = datetime.now().strftime('%Y-%m-%d')
    rank_name_map = {
        'soaring': '飙升榜',
        'newsong': '新歌榜',
        'hotsong': '热歌榜',
        'chinese': '国语榜',
        'europe': '欧美榜',  # ← 改为'europe'
        'korean': '韩语榜',
        'japanese': '日语榜'
    }
    
    return JsonResponse({
        'code': 200,
        'data': {
            'rank_name': rank_name_map.get(rank_type, ''),
            'rank_time': current_date,
            'list': rank_data
        }
    })


def get_user_avatar(request, user_id):
    """获取用户头像"""
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询用户头像
        cursor.execute("SELECT avatar FROM users WHERE user_id = %s", (user_id,))
        user_data = cursor.fetchone()
        
        if user_data and user_data.get('avatar'):
            return JsonResponse({
                'code': 200,
                'data': {
                    'avatar_url': user_data['avatar']
                }
            })
        else:
            return JsonResponse({
                'code': 200,
                'data': {
                    'avatar_url': '/static/images/default-avatar.png'
                }
            })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'message': str(e)
        })
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def get_user_info(request):
    """根据 user_id 获取用户信息（昵称、头像、创作者状态）"""
    try:
        user_id = request.GET.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'code': 400,
                'message': '缺少 user_id 参数'
            })
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询用户昵称、头像、创作者状态
        cursor.execute("""
            SELECT nickname, avatar, is_creator
            FROM users 
            WHERE user_id = %s
        """, (user_id,))
        
        user_data = cursor.fetchone()
        
        if user_data:
            # 如果 nickname 为空或者是纯空格，使用"炫音用户"
            nickname = user_data.get('nickname', '')
            if not nickname or nickname.strip() == '':
                nickname = '炫音用户'
            
            # 如果用户已设置头像，使用该 URL；否则使用默认格式
            avatar_url = user_data.get('avatar', '')
            print(f'🔍 原始头像 URL: "{avatar_url}", 类型: {type(avatar_url)}, 长度: {len(str(avatar_url)) if avatar_url else 0}')
            
            if not avatar_url or avatar_url.strip() == '':
                avatar_url = f'http://127.0.0.1:8000/avatar/{user_id}/'
                print(f'📝 头像为空，使用默认格式: {avatar_url}')
            
            # ★ 新增：获取创作者状态
            is_creator = user_data.get('is_creator', 0)
            print(f'✅ 用户信息查询成功 - user_id: {user_id}, nickname: {nickname}, avatar_url: {avatar_url}, is_creator: {is_creator}')
            
            return JsonResponse({
                'code': 200,
                'data': {
                    'nickname': nickname,
                    'avatar_url': avatar_url,
                    'is_creator': is_creator  # ★ 新增：返回创作者状态
                },
                '_debug': {
                    'user_id': user_id,
                    'raw_avatar': user_data.get('avatar', ''),
                    'is_creator_raw': is_creator,
                    'avatar_is_empty': not user_data.get('avatar', '').strip() if isinstance(user_data.get('avatar', ''), str) else True
                }
            })
        else:
            return JsonResponse({
                'code': 404,
                'message': '未找到用户'
            })
    except Exception as e:
        return JsonResponse({
            'code': 500,
            'message': str(e)
        })
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_user_favorite_musics(request):
    """获取用户喜爱的音乐 ID 列表"""
    try:
        user_id = request.GET.get('user_id')
        
        if not user_id:
            print('❌ 缺少 user_id 参数')
            return JsonResponse({
                'code': 400,
                'message': '缺少 user_id 参数'
            })
        
        print(f'\n========== 获取用户喜爱音乐 ==========')
        print(f'user_id: {user_id}')
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 用户喜爱表名格式：{user_id}like_musics （没有下划线）
        table_name = f'{user_id}like_musics'
        
        print(f'🔍 寻找表: {table_name}')
        
        try:
            # 先获取所有表名
            cursor.execute("SHOW TABLES")
            all_tables = cursor.fetchall()
            all_table_names = [t[list(t.keys())[0]] for t in all_tables]
            print(f'📊 数据库中所有表 ({len(all_table_names)} 个):')
            for t in all_table_names:
                if 'like' in t or user_id in t:
                    print(f'   - {t}')
            
            # 检查表是否存在
            cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
            table_exists = cursor.fetchone()
            
            if not table_exists:
                print(f'⚠️ 表 {table_name} 不存在，尝试另一个格式...')
                # 尝试另一个格式
                table_name = f'{user_id}_like_musics'
                cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
                table_exists = cursor.fetchone()
                if table_exists:
                    print(f'✅ 找到表（带下划线）: {table_name}')
                else:
                    print(f'⚠️ 表 {table_name} 也不存在')
                    return JsonResponse({
                        'code': 200,
                        'data': {
                            'music_ids': [],
                            'error': f'表 {user_id}like_musics 或 {user_id}_like_musics 不存在'
                        }
                    })
            else:
                print(f'✅ 找到表: {table_name}')
            
            # 查询表的结构
            cursor.execute(f"DESC {table_name}")
            table_structure = cursor.fetchall()
            print(f'📋 表结构:')
            for col in table_structure:
                print(f'   - {col}')
            
            # 查询 is_liked=1 的音乐 ID
            print(f'🔍 查询 is_liked=1 的记录...')
            cursor.execute(f"""
                SELECT music_id, is_liked, create_time
                FROM {table_name}
                WHERE is_liked = 1
                ORDER BY create_time DESC
            """)
            
            results = cursor.fetchall()
            music_ids = [row['music_id'] for row in results]
            
            print(f'✅ 查询结果: 共 {len(results)} 条记录')
            for i, row in enumerate(results):
                print(f'   [{i+1}] music_id={row["music_id"]}, is_liked={row["is_liked"]}, create_time={row.get("create_time")}')
            
            print(f'📋 喜爱的音乐 ID: {music_ids}')
            print(f'========== 返回 {len(music_ids)} 首音乐 ==========\n')
            
            return JsonResponse({
                'code': 200,
                'data': {
                    'music_ids': music_ids
                }
            })
                
        except Exception as e:
            print(f'⚠️ 查询失败: {e}')
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'code': 500,
                'message': str(e)
            })
            
    except Exception as e:
        print(f'❌ 获取用户喜爱音乐失败: {e}')
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'message': str(e)
        })
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_music_info_by_id(request):
    """
    按音乐ID依次查询8个数据库，找到就停止并返回音乐信息
    查询顺序：soaring_rank, newsong_rank, hotsong_rank, chinese_rank, 
             america_rank, korea_rank, japan_rank, music_info
    """
    try:
        music_id = request.GET.get('music_id')
        
        if not music_id:
            return JsonResponse({
                'code': 400,
                'message': '缺少 music_id 参数'
            })
        
        print(f'\n========== 按ID查询音乐信息 ==========')
        print(f'music_id: {music_id}')
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 8个数据库表及其优先级
        rank_tables = [
            'soaring_rank',      # 飙升榜
            'newsong_rank',      # 新歌榜
            'hotsong_rank',      # 热歌榜
            'chinese_rank',      # 中国风榜
            'america_rank',      # 欧美榜
            'korea_rank',        # 韩国榜
            'japan_rank',        # 日本榜
            'music_info'         # 音乐信息表
        ]
        
        music_info = None
        found_table = None
        
        try:
            # 依次查询每个表
            for table_name in rank_tables:
                print(f'🔍 查询表: {table_name}...')
                
                try:
                    if table_name == 'music_info':
                        # music_info 表的查询语句
                        cursor.execute(f"""
                            SELECT music_id, music_name, author, author_id, album, album_cover, country
                            FROM {table_name}
                            WHERE music_id = %s
                            LIMIT 1
                        """, (music_id,))
                    else:
                        # 排行榜表的查询语句
                        cursor.execute(f"""
                            SELECT music_id, music_name, author, author_id
                            FROM {table_name}
                            WHERE music_id = %s
                            LIMIT 1
                        """, (music_id,))
                    
                    result = cursor.fetchone()
                    
                    if result:
                        print(f'✅ 在 {table_name} 中找到: {result}')
                        music_info = result
                        found_table = table_name
                        break
                    else:
                        print(f'✗ {table_name} 中未找到')
                        
                except Exception as e:
                    print(f'⚠️ 查询 {table_name} 失败: {e}')
                    continue
            
            print(f'========== 查询完成 ==========\n')
            
            if music_info:
                print(f'✅ 最终结果: 从 {found_table} 查询到音乐信息')
                print(f'   音乐名: {music_info.get("music_name")}')
                print(f'   歌手: {music_info.get("author")}')
                
                return JsonResponse({
                    'code': 200,
                    'data': {
                        'music_id': music_info.get('music_id'),
                        'music_name': music_info.get('music_name'),
                        'author': music_info.get('author'),
                        'author_id': music_info.get('author_id'),
                        'album': music_info.get('album', ''),
                        'album_cover': music_info.get('album_cover', ''),
                        'country': music_info.get('country', ''),
                        'found_from': found_table
                    }
                })
            else:
                print(f'❌ 在所有表中都未找到 music_id={music_id} 的音乐')
                return JsonResponse({
                    'code': 404,
                    'message': f'未找到 music_id={music_id} 的音乐'
                })
                
        except Exception as e:
            print(f'⚠️ 查询过程中出错: {e}')
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'code': 500,
                'message': str(e)
            })
        finally:
            cursor.close()
            conn.close()
            
    except Exception as e:
        print(f'❌ 获取音乐信息失败: {e}')
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'message': str(e)
        })

def play_music(request, music_id):
    """
    推荐页面和搜索页面音乐播放接口 - 直接爬虫获取链接
    不做复杂验证，快速返回结果
    """
    try:
        print(f"\n{'='*60}")
        print(f"=== 播放音乐请求（推荐/搜索页）===")
        print(f"music_id: {music_id}")
        print(f"{'='*60}")
        
        # 直接调用爬虫获取播放链接（最简单、最快速）
        print(f"直接调用爬虫获取链接...")
        real_play_url = get_netease_url(str(music_id))
        
        if not real_play_url:
            print(f"✗ 无法获取播放链接")
            return JsonResponse({'success': False, 'msg': '无法获取音乐链接'}, status=500)
        
        print(f"✓ 成功获取播放链接")
        
        # 尝试更新数据库记录（如果存在）
        try:
            music_info = MusicInfo.objects.get(music_id=music_id)
            music_info.click_count += 1
            music_info.save()
            print(f"✓ 更新点击次数：{music_info.click_count}")
            
            return JsonResponse({
                'success': True,
                'play_url': real_play_url,
                'music_id': str(music_id),
                'music_name': music_info.music_name,
                'author': music_info.author,
                'author_id': music_info.author_id or '',
                'album': music_info.album or '',
                'album_cover': music_info.album_cover or '',
                'msg': '获取播放链接成功'
            })
        except MusicInfo.DoesNotExist:
            print(f"未在数据库中找到，返回爬虫数据")
            return JsonResponse({
                'success': True,
                'play_url': real_play_url,
                'music_id': str(music_id),
                'music_name': '未知歌曲',
                'author': '未知歌手',
                'author_id': '',
                'album': '',
                'album_cover': '',
                'msg': '获取播放链接成功'
            })
        
    except Exception as e:
        print(f"✗ 播放音乐异常：{e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'msg': '播放出错：' + str(e)}, status=500)


# 音乐搜索 API 接口
@csrf_exempt
def api_music_search(request):
    """
    音乐搜索接口
    使用两阶段搜索：
    1. 数据库快速筛选（LIKE 匹配）
    2. 机器学习精确排序
    """
    from .machine_learn import search_music
    
    if request.method != 'GET':
        return JsonResponse({'code': 405, 'msg': '方法不允许'}, status=405)
    
    query = request.GET.get('q', '').strip()
    
    if not query:
        return JsonResponse({'code': 200, 'data': {'results': []}})
    
    try:
        # ============ 第一阶段：数据库快速筛选 ============
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 使用 LIKE 在数据库层面快速筛选（性能更好）
        like_pattern = f"%{query}%"
        cursor.execute("""
            SELECT music_id, music_name, author, album, lyrics 
            FROM music_info 
            WHERE music_name LIKE %s 
               OR author LIKE %s 
               OR album LIKE %s
            LIMIT 100
        """, (like_pattern, like_pattern, like_pattern))
        
        candidate_data = cursor.fetchall()
        conn.close()
        
        if not candidate_data:
            return JsonResponse({'code': 200, 'data': {'results': []}})
        
        # ============ 第二阶段：TF-IDF精确排序 ============
        # 只对候选数据进行计算，大幅提升性能
        results = search_music(query, candidate_data)
        
        # ★修改★：返回所有匹配的结果（不限制数量，让前端分页处理）
        # results = results[:50]  # 注释掉数量限制
        
        # 格式转换 - 获取完整的音乐信息包括 album_cover
        formatted_results = []
        for item in results:
            music = item.get('music', {})
            music_id = music.get('music_id')
            
            # ★新增：从数据库获取完整的音乐信息
            try:
                music_info = MusicInfo.objects.get(music_id=music_id)
                formatted_results.append({
                    'music_id': music_id,
                    'music_name': music.get('music_name') or music_info.music_name,
                    'author': music.get('author') or music_info.author,
                    'album': music.get('album') or music_info.album,
                    'album_cover': music_info.album_cover or '/static/imgs/default_album.jpg'
                })
            except MusicInfo.DoesNotExist:
                # 如果在 MusicInfo 表中找不到，直接返回已有数据
                formatted_results.append({
                    'music_id': music_id,
                    'music_name': music.get('music_name'),
                    'author': music.get('author'),
                    'album': music.get('album'),
                    'album_cover': '/static/imgs/default_album.jpg'
                })
        
        return JsonResponse({
            'code': 200,
            'data': {
                'results': formatted_results,
                'total': len(formatted_results)
            }
        })
        
    except Exception as e:
        print(f"❌ 搜索出错: {str(e)}")
        return JsonResponse({'code': 500, 'msg': str(e)}, status=500)


@csrf_exempt
def api_get_rank_data(request, rank_type):
    """
    获取指定榜单的全部数据（用于播放全部）
    【新增】新歌榜按创建时间排序，显示最新发布的100首
    
    参数:
        rank_type: 榜单类型（soaring, newsong, hotsong, chinese, europe, korean, japanese）
    
    返回:
        JSON 格式: {
            'code': 200,
            'data': {
                'results': [
                    {'music_id': '...', 'music_name': '...', 'album_cover': '...'},
                    ...
                ],
                'total': 数量
            }
        }
    """
    if request.method != 'GET':
        return JsonResponse({'code': 405, 'msg': '方法不允许'}, status=405)
    
    # 榜单类型映射到数据库字段
    rank_type_map = {
        'soaring': 'soaring_rank',
        'newsong': 'newsong_rank',  # ★修改了表名映射
        'hotsong': 'hotsong_rank',
        'chinese': 'chinese_rank',
        'europe': 'america_rank',  # ← 前端'europe'映射到数据库'america_rank'（表名为america_rank）
        'korean': 'korea_rank',
        'japanese': 'japan_rank'
    }
    
    if rank_type not in rank_type_map:
        return JsonResponse({'code': 400, 'msg': f'无效的榜单类型: {rank_type}'}, status=400)
    
    table_name = rank_type_map[rank_type]
    
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # ★修改★：新歌榜按创建时间排序显示最新100首
        if rank_type == 'newsong':
            print(f"📊 新歌榜查询：按创建时间排序")
            cursor.execute(f"""
                SELECT DISTINCT music_id, music_name, album_cover
                FROM {table_name}
                ORDER BY create_datetime DESC
                LIMIT 100
            """)
        else:
            # 其他榜单保留原逻辑
            cursor.execute(f"""
                SELECT DISTINCT music_id, music_name, album_cover
                FROM {table_name}
                LIMIT 100
            """)
        
        rank_data = cursor.fetchall()
        conn.close()
        
        if not rank_data:
            return JsonResponse({
                'code': 200,
                'data': {'results': [], 'total': 0}
            })
        
        # 格式转换
        formatted_results = []
        for item in rank_data:
            formatted_results.append({
                'music_id': item.get('music_id'),
                'music_name': item.get('music_name'),
                'album_cover': item.get('album_cover') or ''
            })
        
        return JsonResponse({
            'code': 200,
            'data': {
                'results': formatted_results,
                'total': len(formatted_results)
            }
        })
        
    except Exception as e:
        print(f"❌ 获取榜单数据出错: {str(e)}")
        return JsonResponse({'code': 500, 'msg': str(e)}, status=500)


def play_music_url(request):
    """
    获取排行榜音乐播放链接 - 爬虫鏈接 + 数据库详情
    1. 直接爬虫获取链接（保证有效）
    2. 仏椿查询数据库获取 music_name 和 album_cover
    3. 抛牙并返回完整数据
    """
    try:
        print(f"\n{'='*60}")
        print(f"=== 播放排行榜音乐（爬虫+数据库）===")
        print(f"{'='*60}")
        
        if request.method == 'POST':
            data = json.loads(request.body)
            music_id = data.get('music_id')
            rank_type = data.get('rank_type', 'soaring')
            
            print(f"music_id: {music_id}, rank_type: {rank_type}")
            
            if not music_id:
                return JsonResponse({'success': False, 'msg': '音乐 ID 不能为空'})
            
            # 直接调用爬虫获取链接（最关隔）
            print(f"爬虫获取链接...")
            real_play_url = get_netease_url(str(music_id))
            
            if not real_play_url:
                print(f"✗ 无法获取播放链接")
                return JsonResponse({'success': False, 'msg': '无法获取音乐链接'}, status=500)
            
            print(f"✓ 成功获取链接")
            
            # 同时从数据库查询俖稽信息（维持故事线）
            music_name = ''
            album_cover = ''
            music_info = None
            
            rank_table_map = {
                'soaring': 'soaring_rank',
                'hotsong': 'hotsong_rank',
                'chinese': 'chinese_rank',
                'europe': 'america_rank',
                'korean': 'korea_rank',
                'japanese': 'japan_rank'
            }
            
            try:
                conn = get_mysql_conn()
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                target_table = rank_table_map.get(rank_type, 'soaring_rank')
                
                # 优先查询目标榜单表
                cursor.execute(f"""
                    SELECT music_name, album_cover FROM {target_table} WHERE music_id = %s LIMIT 1
                """, (music_id,))
                music_info = cursor.fetchone()
                
                # 如果不存在，尝试从 music_info 表查询
                if not music_info:
                    cursor.execute("""
                        SELECT music_name, album_cover FROM music_info WHERE music_id = %s LIMIT 1
                    """, (music_id,))
                    music_info = cursor.fetchone()
                
                if music_info:
                    music_name = music_info.get('music_name', '')
                    album_cover = music_info.get('album_cover', '')
                    print(f"✓ 数据库查点成功: {music_name}")
                
                cursor.close()
                conn.close()
                
            except Exception as e:
                print(f"⚠️ 数据库查询失败: {e}")
            
            print(f"✓ 成功获取播放链接 + 俖稽信息")
            
            return JsonResponse({
                'success': True,
                'play_url': real_play_url,
                'music_id': str(music_id),
                'music_name': music_name,
                'album_cover': album_cover,
                'msg': '获取成功'
            })
            
        return JsonResponse({'success': False, 'msg': '请求方法错误'})
        
    except Exception as e:
        print(f"✗ 播放排行榜音乐异常：{e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'msg': '播放出错：' + str(e)}, status=500)


def play_newsong_music_url(request):
    """
    获取新歌榜音乐播放链接 - 爬虫鏈接 + 数据库详情
    1. 直接爬虫获取链接（保证有效）
    2. 仏椿查询数据库获取 music_name 和 album_cover
    3. 抛牙并返回完整数据
    """
    try:
        print(f"\n{'='*60}")
        print(f"=== 播放新歌榜音乐（爬虫+数据库）===")
        print(f"{'='*60}")
        
        if request.method == 'POST':
            data = json.loads(request.body)
            music_id = data.get('music_id')
            
            print(f"music_id: {music_id}")
            
            if not music_id:
                return JsonResponse({'success': False, 'msg': '音乐 ID 不能为空'})
            
            # 直接调用爬虫获取链接（最关隔）
            print(f"爬虫获取链接...")
            real_play_url = get_netease_url(str(music_id))
            
            if not real_play_url:
                print(f"✗ 无法获取播放链接")
                return JsonResponse({'success': False, 'msg': '无法获取音乐链接'}, status=500)
            
            print(f"✓ 成功获取链接")
            
            # 同时从数据库查询俖稽信息（维持故事线）
            music_name = ''
            album_cover = ''
            music_info = None
            
            try:
                conn = get_mysql_conn()
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                
                # 优先查询新歌榜表
                cursor.execute("""
                    SELECT music_name, album_cover FROM newsong_rank WHERE music_id = %s LIMIT 1
                """, (music_id,))
                music_info = cursor.fetchone()
                
                # 如果不存在，尝试从 music_info 表查询
                if not music_info:
                    cursor.execute("""
                        SELECT music_name, album_cover FROM music_info WHERE music_id = %s LIMIT 1
                    """, (music_id,))
                    music_info = cursor.fetchone()
                
                if music_info:
                    music_name = music_info.get('music_name', '')
                    album_cover = music_info.get('album_cover', '')
                    print(f"✓ 数据库查点成功: {music_name}")
                
                cursor.close()
                conn.close()
                
            except Exception as e:
                print(f"⚠️ 数据库查询失败: {e}")
            
            print(f"✓ 成功获取播放链接 + 俖稽信息")
            
            return JsonResponse({
                'success': True,
                'play_url': real_play_url,
                'music_id': str(music_id),
                'music_name': music_name,
                'album_cover': album_cover,
                'msg': '获取成功'
            })
            
        return JsonResponse({'success': False, 'msg': '请求方法错误'})
        
    except Exception as e:
        print(f"✗ 播放新歌榜音乐异常：{e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'msg': '播放出错：' + str(e)}, status=500)


# 使用绝对路径
    """
    获取新歌榜音乐播放链接 - 直接从数据库查询
    专门为新歌榜优化
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            music_id = data.get('music_id')
            
            if not music_id:
                return JsonResponse({'success': False, 'msg': '音乐 ID 不能为空'})
            
            print(f"\n🎵 获取新歌榜音乐链接: {music_id}")
            
            # 从新歌榜表直接查询
            conn = get_mysql_conn()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            cursor.execute("""
                SELECT music_id, music_name, author, author_id, 
                       album, album_cover, real_url, play_url
                FROM newsong_rank
                WHERE music_id = %s
            """, (music_id,))
            
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not result:
                print(f"✗ 未找到音乐")
                return JsonResponse({'success': False, 'msg': '未找到该歌曲'}, status=404)
            
            # 获取播放链接
            play_url = result.get('real_url') or result.get('play_url')
            
            if not play_url:
                print(f"调用爬虫获取链接...")
                play_url = get_netease_url(str(music_id))
            
            if not play_url:
                print(f"✗ 无法获取播放链接")
                return JsonResponse({'success': False, 'msg': '无法获取播放链接'}, status=500)
            
            print(f"✓ 成功获取播放链接")
            
            return JsonResponse({
                'success': True,
                'play_url': play_url,
                'music_id': str(music_id),
                'music_name': result.get('music_name', ''),
                'author': result.get('author', ''),
                'album_cover': result.get('album_cover', ''),
                'msg': '获取成功'
            })
            
        except Exception as e:
            print(f"异常：{e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'msg': str(e)}, status=500)
    
    return JsonResponse({'success': False, 'msg': '请求方法错误'})


# 使用绝对路径
IMG_DIR = os.path.join(os.path.dirname(__file__), '..', 'static', 'imgs', 'bgs')

def get_random_image(request):
    # 获取静态文件目录
    static_dir = os.path.join(settings.STATICFILES_DIRS[0], 'imgs/bgs')
    
    img_files = [f for f in os.listdir(static_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not img_files:
        return JsonResponse({'error': 'No images found'}, status=400)
    
    img_file = random.choice(img_files)
    img_url = f'/static/imgs/bgs/{img_file}'
    
    return JsonResponse({'img_url': img_url})


# ★新增★：新歌榜专用 - 点击后数据更新（不播放，仅更新数据）
@csrf_protect
def update_newsong_data(request):
    """
    新歌榜专用函数 - 只处理数据更新，不涉及播放
    功能：
    1. 添加音乐到用户喜爱数据库 ({user_id}_like_musics)
    2. 新歌榜点击量 +1 (newsong_rank)
    3. 创作者数据库点击量 +1、喜爱数 +1 ({author_id}_create_musics)
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            music_id = data.get('music_id')
            music_name = data.get('music_name')
            user_id = data.get('user_id')
            author_id = data.get('author_id')
            
            print(f"\n{'='*60}")
            print(f"=== 新歌榜数据更新（不播放）===")
            print(f"music_id: {music_id}, music_name: {music_name}")
            print(f"user_id: {user_id}, author_id: {author_id}")
            print(f"{'='*60}")
            
            if not music_id:
                return JsonResponse({'success': False, 'msg': '音乐 ID 不能为空'})
            
            conn = get_mysql_conn()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            # 1️⃣ 新歌榜点击量 +1
            print(f"1️⃣ 更新新歌榜点击量...")
            try:
                cursor.execute("""
                    UPDATE newsong_rank SET click_count = click_count + 1 
                    WHERE music_id = %s
                """, (music_id,))
                print(f"✓ 新歌榜点击量已更新")
            except Exception as e:
                print(f"⚠️ 新歌榜点击量更新失败: {e}")
            
            # 2️⃣ 添加到用户喜爱数据库 ({user_id}_like_musics)
            if user_id:
                print(f"2️⃣ 添加到用户喜爱数据库...")
                table_name = f'{user_id}_like_musics'
                try:
                    # 检查记录是否存在 - 修改：SELECT 1 而不是 SELECT id
                    cursor.execute(f"""
                        SELECT 1 FROM {table_name} WHERE music_id = %s LIMIT 1
                    """, (music_id,))
                    result = cursor.fetchone()
                    
                    if result:
                        # 更新为已喜爱
                        cursor.execute(f"""
                            UPDATE {table_name} SET is_liked = 1 WHERE music_id = %s
                        """, (music_id,))
                        print(f"✓ 用户喜爱数据已更新为已喜爱")
                    else:
                        # 插入新记录 - 包含 music_name 字段
                        cursor.execute(f"""
                            INSERT INTO {table_name} (music_id, music_name, is_liked, create_time)
                            VALUES (%s, %s, 1, %s)
                        """, (music_id, music_name or '', datetime.now()))
                        print(f"✓ 用户喜爱数据已添加: {music_name}")
                except Exception as e:
                    print(f"⚠️ 用户喜爱数据处理失败: {e}")
                    import traceback
                    traceback.print_exc()
            
            # 3️⃣ 创作者数据库点击量 +1、喜爱数 +1 ({author_id}_create_musics)
            if author_id:
                print(f"3️⃣ 更新创作者数据库...")
                creator_table_name = f"{author_id}_create_musics"
                try:
                    # 先检查记录是否存在 - 修改：SELECT 1 而不是 SELECT id
                    cursor.execute(f"""
                        SELECT 1 FROM {creator_table_name} WHERE music_id = %s LIMIT 1
                    """, (music_id,))
                    creator_result = cursor.fetchone()
                    
                    if creator_result:
                        # 更新现有记录 - 点击量和喜爱数都 +1
                        _increment_creator_music_stats(cursor, creator_table_name, music_id, 'click_count', 'click_logs')
                        _increment_creator_music_stats(cursor, creator_table_name, music_id, 'like_count', 'like_logs')
                        print(f"✓ 创作者数据已更新 ({creator_table_name})")
                    else:
                        # 插入新记录
                        today_click_logs = _bump_daily_log(None)
                        today_like_logs = _bump_daily_log(None)
                        cursor.execute(f"""
                            INSERT INTO {creator_table_name} 
                            (music_id, music_name, click_count, like_count, click_logs, like_logs)
                            VALUES (%s, %s, 1, 1, %s, %s)
                        """, (music_id, music_name or '', today_click_logs, today_like_logs))
                        print(f"✓ 创作者数据已添加 ({creator_table_name})")
                except Exception as e:
                    print(f"⚠️ 创作者数据处理失败: {e}")
                    import traceback
                    traceback.print_exc()
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"✓ 新歌榜数据更新完成")
            return JsonResponse({
                'success': True,
                'msg': '数据已更新'
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'msg': 'JSON 格式错误'})
        except Exception as e:
            print(f"✗ 新歌榜数据更新异常: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'msg': f'更新失败: {str(e)}'})
    
    return JsonResponse({'success': False, 'msg': '请求方法错误'})


# ★新增★：更新音乐点击数
@csrf_protect
def update_music_click_count(request):
    """
    更新音乐的点击数
    优先级：① 指定的排行榜表 → ② 所有排行榜表 → ③ music_info 表
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            music_id = data.get('music_id')
            rank_type = data.get('rank_type', 'newsong')  # 默认新歌榜
            
            print(f"\n📊 更新点击数：music_id={music_id}, rank_type={rank_type}")
            
            if not music_id:
                print("✗ 音乐ID为空")
                return JsonResponse({'success': False, 'msg': '音乐ID不能为空'})
            
            conn = get_mysql_conn()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            # 定义榜单表映射
            rank_table_map = {
                'soaring': 'soaring_rank',
                'newsong': 'newsong_rank',
                'hotsong': 'hotsong_rank',
                'chinese': 'chinese_rank',
                'europe': 'america_rank',
                'korean': 'korea_rank',
                'japanese': 'japan_rank'
            }
            
            # 所有榜单表列表
            all_rank_tables = list(rank_table_map.values())
            
            # 第一步：优先查询指定的排行榜表
            target_table = rank_table_map.get(rank_type, 'newsong_rank')
            print(f"目标表：{target_table}")
            
            music_found = False
            author_id = None
            
            # 先尝试在目标表中查询
            try:
                cursor.execute(f"""
                    SELECT music_id, author_id FROM {target_table} WHERE music_id = %s
                """, (music_id,))
                result = cursor.fetchone()
                
                if result:
                    music_found = True
                    author_id = result.get('author_id')
                    print(f"✓ 在 {target_table} 表中找到音乐")
                    
                    # 更新目标表的点击数
                    cursor.execute(f"""
                        UPDATE {target_table} SET click_count = click_count + 1 
                        WHERE music_id = %s
                    """, (music_id,))
                    print(f"✓ 已更新 {target_table} 的点击数")
                    
                    # 如果有作者ID，尝试更新用户创作表
                    if author_id:
                        user_table_name = f"{author_id}_create_musics"
                        try:
                            _increment_creator_music_stats(cursor, user_table_name, music_id, 'click_count', 'click_logs')
                            print(f"✓ 已更新 {user_table_name} 的点击数")
                        except Exception as e:
                            print(f"⚠️ 用户创作表更新失败（表可能不存在）：{e}")
            except Exception as e:
                print(f"⚠️ 在目标表中查询失败：{e}")
            
            # 第二步：如果目标表中没找到，遍历所有榜单表查询
            if not music_found:
                print(f"在 {target_table} 中未找到，搜索其他榜单表...")
                
                for table_name in all_rank_tables:
                    if table_name == target_table:
                        continue  # 已经查询过了
                    
                    try:
                        cursor.execute(f"""
                            SELECT music_id, author_id FROM {table_name} WHERE music_id = %s
                        """, (music_id,))
                        result = cursor.fetchone()
                        
                        if result:
                            music_found = True
                            author_id = result.get('author_id')
                            print(f"✓ 在 {table_name} 表中找到音乐")
                            
                            # 更新该表的点击数
                            cursor.execute(f"""
                                UPDATE {table_name} SET click_count = click_count + 1 
                                WHERE music_id = %s
                            """, (music_id,))
                            print(f"✓ 已更新 {table_name} 的点击数")
                            
                            # 如果有作者ID，尝试更新用户创作表
                            if author_id:
                                user_table_name = f"{author_id}_create_musics"
                                try:
                                    _increment_creator_music_stats(cursor, user_table_name, music_id, 'click_count', 'click_logs')
                                    print(f"✓ 已更新 {user_table_name} 的点击数")
                                except Exception as e:
                                    print(f"⚠️ 用户创作表更新失败：{e}")
                            
                            break  # 找到后立即停止搜索
                    except Exception as e:
                        print(f"⚠️ 在 {table_name} 中查询失败：{e}")
                        continue
            
            # 第三步：如果所有榜单表都没找到，尝试 music_info 表
            if not music_found:
                print(f"在所有榜单表中未找到，搜索 music_info 表...")
                
                try:
                    cursor.execute(f"""
                        SELECT music_id FROM music_info WHERE music_id = %s
                    """, (music_id,))
                    result = cursor.fetchone()
                    
                    if result:
                        music_found = True
                        print(f"✓ 在 music_info 表中找到音乐")
                        
                        # 更新 music_info 表的点击数
                        cursor.execute(f"""
                            UPDATE music_info SET click_count = click_count + 1 
                            WHERE music_id = %s
                        """, (music_id,))
                        print(f"✓ 已更新 music_info 的点击数")
                except Exception as e:
                    print(f"⚠️ 在 music_info 表中查询失败：{e}")
            
            if not music_found:
                print(f"✗ 在所有表中都未找到音乐 {music_id}")
                conn.rollback()
                cursor.close()
                conn.close()
                return JsonResponse({'success': False, 'msg': '音乐不存在'})
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"✓ 点击数更新完成")
            return JsonResponse({'success': True, 'msg': '点击数已更新'})
            
        except json.JSONDecodeError:
            print("✗ JSON 格式错误")
            return JsonResponse({'success': False, 'msg': 'JSON 格式错误'})
        except Exception as e:
            print(f"✗ 更新点击数异常：{str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'msg': f'更新失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'msg': '请求方法错误'})


# ★新增★：更新音乐喜爱数
@csrf_protect
def update_music_like_count(request):
    """
    更新音乐的喜爱数
    优先级：① 指定的排行榜表 → ② 所有排行榜表 → ③ music_info 表
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            music_id = data.get('music_id')
            rank_type = data.get('rank_type', 'newsong')  # 默认新歌榜
            
            print(f"\n❤️ 更新喜爱数：music_id={music_id}, rank_type={rank_type}")
            
            if not music_id:
                print("✗ 音乐ID为空")
                return JsonResponse({'success': False, 'msg': '音乐ID不能为空'})
            
            conn = get_mysql_conn()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            # 定义榜单表映射
            rank_table_map = {
                'soaring': 'soaring_rank',
                'newsong': 'newsong_rank',
                'hotsong': 'hotsong_rank',
                'chinese': 'chinese_rank',
                'europe': 'america_rank',
                'korean': 'korea_rank',
                'japanese': 'japan_rank'
            }
            
            # 所有榜单表列表
            all_rank_tables = list(rank_table_map.values())
            
            # 第一步：优先查询指定的排行榜表
            target_table = rank_table_map.get(rank_type, 'newsong_rank')
            print(f"目标表：{target_table}")
            
            music_found = False
            author_id = None
            
            # 先尝试在目标表中查询
            try:
                cursor.execute(f"""
                    SELECT music_id, author_id FROM {target_table} WHERE music_id = %s
                """, (music_id,))
                result = cursor.fetchone()
                
                if result:
                    music_found = True
                    author_id = result.get('author_id')
                    print(f"✓ 在 {target_table} 表中找到音乐")
                    
                    # 更新目标表的喜爱数
                    cursor.execute(f"""
                        UPDATE {target_table} SET like_count = like_count + 1 
                        WHERE music_id = %s
                    """, (music_id,))
                    print(f"✓ 已更新 {target_table} 的喜爱数")
                    
                    # 如果有作者ID，尝试更新用户创作表
                    if author_id:
                        user_table_name = f"{author_id}_create_musics"
                        try:
                            _increment_creator_music_stats(cursor, user_table_name, music_id, 'like_count', 'like_logs')
                            print(f"✓ 已更新 {user_table_name} 的喜爱数")
                        except Exception as e:
                            print(f"⚠️ 用户创作表更新失败（表可能不存在）：{e}")
            except Exception as e:
                print(f"⚠️ 在目标表中查询失败：{e}")
            
            # 第二步：如果目标表中没找到，遍历所有榜单表查询
            if not music_found:
                print(f"在 {target_table} 中未找到，搜索其他榜单表...")
                
                for table_name in all_rank_tables:
                    if table_name == target_table:
                        continue  # 已经查询过了
                    
                    try:
                        cursor.execute(f"""
                            SELECT music_id, author_id FROM {table_name} WHERE music_id = %s
                        """, (music_id,))
                        result = cursor.fetchone()
                        
                        if result:
                            music_found = True
                            author_id = result.get('author_id')
                            print(f"✓ 在 {table_name} 表中找到音乐")
                            
                            # 更新该表的喜爱数
                            cursor.execute(f"""
                                UPDATE {table_name} SET like_count = like_count + 1 
                                WHERE music_id = %s
                            """, (music_id,))
                            print(f"✓ 已更新 {table_name} 的喜爱数")
                            
                            # 如果有作者ID，尝试更新用户创作表
                            if author_id:
                                user_table_name = f"{author_id}_create_musics"
                                try:
                                    _increment_creator_music_stats(cursor, user_table_name, music_id, 'like_count', 'like_logs')
                                    print(f"✓ 已更新 {user_table_name} 的喜爱数")
                                except Exception as e:
                                    print(f"⚠️ 用户创作表更新失败：{e}")
                            
                            break  # 找到后立即停止搜索
                    except Exception as e:
                        print(f"⚠️ 在 {table_name} 中查询失败：{e}")
                        continue
            
            # 第三步：如果所有榜单表都没找到，尝试 music_info 表
            if not music_found:
                print(f"在所有榜单表中未找到，搜索 music_info 表...")
                
                try:
                    cursor.execute(f"""
                        SELECT music_id FROM music_info WHERE music_id = %s
                    """, (music_id,))
                    result = cursor.fetchone()
                    
                    if result:
                        music_found = True
                        print(f"✓ 在 music_info 表中找到音乐")
                        
                        # 更新 music_info 表的喜爱数
                        cursor.execute(f"""
                            UPDATE music_info SET like_count = like_count + 1 
                            WHERE music_id = %s
                        """, (music_id,))
                        print(f"✓ 已更新 music_info 的喜爱数")
                except Exception as e:
                    print(f"⚠️ 在 music_info 表中查询失败：{e}")
            
            if not music_found:
                print(f"✗ 在所有表中都未找到音乐 {music_id}")
                conn.rollback()
                cursor.close()
                conn.close()
                return JsonResponse({'success': False, 'msg': '音乐不存在'})
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print(f"✓ 喜爱数更新完成")
            return JsonResponse({'success': True, 'msg': '喜爱数已更新'})
            
        except json.JSONDecodeError:
            print("✗ JSON 格式错误")
            return JsonResponse({'success': False, 'msg': 'JSON 格式错误'})
        except Exception as e:
            print(f"✗ 更新喜爱数异常：{str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'msg': f'更新失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'msg': '请求方法错误'})


def music_recommendation(request):
    return render(request,'music/music_recommendation.html')

def music_community(request):
    return render(request,'music/music_community.html')
def my_music(request):
    return render(request,'music/my_music.html')

@csrf_protect
def creator_centered(request):
    return render(request,'music/creator_centered.html')

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
import string
import time

def generate_user_id():
    """生成最少 7 位不重复的 user_id"""
    conn = get_mysql_conn()
    cursor = conn.cursor()
    length = 7
    while True:
        # 生成随机数字 ID
        user_id = ''.join(random.choices(string.digits, k=length))
        # 检查是否重复
        cursor.execute("SELECT COUNT(*) FROM users WHERE user_id = %s", (user_id,))
        count = cursor.fetchone()[0]
        if count == 0:
            break
        if length < 20:  # 设置最大长度限制
            length += 1
    cursor.close()
    conn.close()
    return user_id
def send_verification_email(email):
    """发送验证邮件（注册用）"""
    try:
        # 生成 6 位随机验证码
        code = ''.join(random.choices(string.digits, k=6))
        # 创建 SMTP 邮件对象
        msg = MIMEMultipart('alternative')
        msg['From'] = 'caspar466@163.com'
        msg['To'] = email
        msg['Subject'] = Header('炫音娱乐 - 邮箱验证码', 'utf-8')
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ padding: 40px 30px; text-align: center; }}
                .code-box {{ background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 30px; margin: 20px 0; border-radius: 5px; }}
                .code {{ font-size: 48px; font-weight: bold; color: #667eea; letter-spacing: 10px; font-family: monospace; }}
                .tips {{ color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px; }}
                .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎵 炫音娱乐</h1>
                    <p>智能语音交互音乐系统</p>
                </div>
                <div class="content">
                    <h2>邮箱验证码</h2>
                    <p>您正在注册炫音娱乐账号，请使用以下验证码完成验证：</p>
                    <div class="code-box">
                        <div class="code">{code}</div>
                    </div>
                    <p class="tips">
                        • 验证码有效期为 5 分钟<br>
                        • 请勿将验证码泄露给他人<br>
                        • 如非本人操作，请忽略此邮件
                    </p>
                </div>
                <div class="footer">
                    <p>© 2026 炫音娱乐。All Rights Reserved.</p>
                    <p>本邮件由系统自动发送，请勿回复</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        # 连接 SMTP 服务器并发送邮件
        server = smtplib.SMTP_SSL('smtp.163.com', 465)
        server.login('caspar466@163.com', 'VUeA8rZCtn2FiXy4')
        server.send_message(msg)
        server.quit()
        
        # 处理验证码存入数据库
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        # 检查该邮箱是否已有验证码
        cursor.execute("SELECT id FROM verification_codes WHERE email = %s", (email,))
        existing = cursor.fetchone()
        
        current_time = datetime.now()
        
        if existing:
            # 更新现有验证码
            cursor.execute("""
                UPDATE verification_codes 
                SET code = %s, create_time = %s, expire_time = DATE_ADD(%s, INTERVAL 5 MINUTE)
                WHERE email = %s
            """, (code, current_time, current_time, email))
        else:
            # 插入新验证码
            cursor.execute("""
                INSERT INTO verification_codes (email, code, create_time, expire_time)
                VALUES (%s, %s, %s, DATE_ADD(%s, INTERVAL 5 MINUTE))
            """, (email, code, current_time, current_time))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {'success': True, 'message': '发送成功'}
    
    except smtplib.SMTPException as e:
        return {'success': False, 'message': f'邮箱发送失败：{str(e)}'}
    except Exception as e:
        return {'success': False, 'message': f'发送失败：{str(e)}'}

def send_find_password_verification_email(email):
    """发送验证邮件（找回密码用）"""
    try:
        print(f"\n=== 开始发送找回密码验证码 ===")
        print(f"目标邮箱：{email}")
        
        # 生成 6 位随机验证码
        code = ''.join(random.choices(string.digits, k=6))
        print(f"生成的验证码：{code}")
        
        # 创建 SMTP 邮件对象
        msg = MIMEMultipart('alternative')
        msg['From'] = 'caspar466@163.com'
        msg['To'] = email
        msg['Subject'] = Header('炫音娱乐 - 找回密码验证码', 'utf-8')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ padding: 40px 30px; text-align: center; }}
                .code-box {{ background-color: #fff5f5; border-left: 4px solid #ff6b6b; padding: 30px; margin: 20px 0; border-radius: 5px; }}
                .code {{ font-size: 48px; font-weight: bold; color: #ff6b6b; letter-spacing: 10px; font-family: monospace; }}
                .tips {{ color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px; }}
                .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 炫音娱乐</h1>
                    <p>智能语音交互音乐系统</p>
                </div>
                <div class="content">
                    <h2>找回密码验证码</h2>
                    <p>您正在找回炫音娱乐账号密码，请使用以下验证码完成验证：</p>
                    <div class="code-box">
                        <div class="code">{code}</div>
                    </div>
                    <p class="tips">
                        • 验证码有效期为 5 分钟<br>
                        • 请勿将验证码泄露给他人<br>
                        • 如非本人操作，请忽略此邮件
                    </p>
                </div>
                <div class="footer">
                    <p>© 2026 炫音娱乐。All Rights Reserved.</p>
                    <p>本邮件由系统自动发送，请勿回复</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        print("开始连接 SMTP 服务器...")
        
        # 连接 SMTP 服务器并发送邮件
        try:
            server = smtplib.SMTP_SSL('smtp.163.com', 465, timeout=10)
            server.set_debuglevel(1)
            print("SMTP 连接成功")
            
            server.login('caspar466@163.com', 'VUeA8rZCtn2FiXy4')
            print("SMTP 登录成功")
            
            server.send_message(msg)
            print("邮件发送成功")
            
            server.quit()
            
        except smtplib.SMTPAuthenticationError as auth_err:
            print(f"SMTP 认证失败：{auth_err}")
            raise Exception(f"邮箱服务认证失败：{str(auth_err)}")
        except smtplib.SMTPConnectError as conn_err:
            print(f"SMTP 连接失败：{conn_err}")
            raise Exception(f"无法连接到邮箱服务器：{str(conn_err)}")
        except Exception as smtp_err:
            print(f"SMTP 发送异常：{smtp_err}")
            raise Exception(f"邮件发送失败：{str(smtp_err)}")
        
        # 处理验证码存入数据库
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        print(f"准备保存验证码到数据库：email={email}, code={code}")
        
        # 检查该邮箱是否已有验证码
        cursor.execute("SELECT id FROM verification_codes WHERE email = %s", (email,))
        existing = cursor.fetchone()
        
        current_time = datetime.now()
        
        if existing:
            # 更新现有验证码
            cursor.execute("""
                UPDATE verification_codes 
                SET code = %s, create_time = %s, expire_time = DATE_ADD(%s, INTERVAL 5 MINUTE)
                WHERE email = %s
            """, (code, current_time, current_time, email))
            print(f"更新了邮箱 {email} 的验证码")
        else:
            # 插入新验证码
            cursor.execute("""
                INSERT INTO verification_codes (email, code, create_time, expire_time)
                VALUES (%s, %s, %s, DATE_ADD(%s, INTERVAL 5 MINUTE))
            """, (email, code, current_time, current_time))
            print(f"插入了邮箱 {email} 的验证码")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("=== 找回密码验证码发送完成 ===\n")
        
        return {'success': True, 'message': '发送成功', 'code': code}
    
    except Exception as e:
        import traceback
        error_msg = f"send_find_password_verification_email 异常：{str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        print("=== 找回密码验证码发送失败 ===\n")
        return {'success': False, 'message': f'发送失败：{str(e)}'}

def send_find_password_email(request):
    """找回密码：发送邮箱验证码"""
    if request.method == 'POST':
        username = request.POST.get('username', '')
        email = request.POST.get('email', '')
        
        print(f"\n收到找回密码请求:")
        print(f"  username: {username}")
        print(f"  email: {email}")
        
        if not username or not email:
            print("  错误：账号或邮箱为空")
            return JsonResponse({'success': False, 'message': '账号和邮箱不能为空'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        # 检查账号和邮箱是否匹配
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s AND email = %s", (username, email))
        count = cursor.fetchone()[0]
        print(f"  邮箱匹配检查结果：{count}")
        
        cursor.close()
        conn.close()
        
        if count == 0:
            print("  错误：邮箱与账号不匹配")
            return JsonResponse({'success': False, 'message': '邮箱与账号不匹配'})
        
        # 使用专门的找回密码发送函数
        print(f"  调用 send_find_password_verification_email 发送邮件...")
        result = send_find_password_verification_email(email)
        print(f"  发送结果：{result}")
        
        if result['success']:
            return JsonResponse({'success': True, 'message': '验证码已发送'})
        else:
            return JsonResponse({'success': False, 'message': result['message']})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})
def send_email_code(request):
    """发送邮箱验证码 API"""
    if request.method == 'POST':
        email_prefix = request.POST.get('email_prefix', '')
        email_suffix = request.POST.get('email_suffix', '')
        
        if not email_prefix or not email_suffix:
            return JsonResponse({'success': False, 'message': '邮箱信息不完整'})
        
        full_email = email_prefix + email_suffix
        
        # 验证邮箱格式
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', full_email):
            return JsonResponse({'success': False, 'message': '邮箱格式不正确'})
        
        result = send_verification_email(full_email)
        
        if result['success']:
            return JsonResponse({'success': True, 'message': '验证码已发送'})
        else:
            return JsonResponse({'success': False, 'message': result['message']})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

def check_username_email(request):
    """检查账号和邮箱是否存在"""
    if request.method == 'POST':
        username = request.POST.get('username', '')
        email_prefix = request.POST.get('email_prefix', '')
        email_suffix = request.POST.get('email_suffix', '')
        
        full_email = email_prefix + email_suffix
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        # 检查用户名是否存在
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s", (username,))
        username_exists = cursor.fetchone()[0] > 0
        
        if username_exists:
            cursor.close()
            conn.close()
            return JsonResponse({'success': False, 'message': '账号已存在'})
        
        # 检查邮箱是否存在
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = %s", (full_email,))
        email_exists = cursor.fetchone()[0] > 0
        
        cursor.close()
        conn.close()
        
        if email_exists:
            return JsonResponse({'success': False, 'message': '邮箱已被注册'})
        
        return JsonResponse({'success': True, 'message': '可以使用'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

def verify_email_code(request):
    """验证邮箱验证码"""
    if request.method == 'POST':
        email = request.POST.get('email', '')
        code = request.POST.get('code', '')
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        # 查询验证码
        cursor.execute("""
            SELECT code FROM verification_codes 
            WHERE email = %s AND code = %s AND expire_time > NOW()
        """, (email, code))
        
        result = cursor.fetchone()
        
        # 删除过期的验证码
        cursor.execute("DELETE FROM verification_codes WHERE expire_time <= NOW()")
        conn.commit()
        
        cursor.close()
        conn.close()
        
        if result:
            return JsonResponse({'success': True, 'message': '验证成功'})
        else:
            return JsonResponse({'success': False, 'message': '验证码错误或已过期'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

def register_user(request):
    """处理用户注册"""
    if request.method == 'POST':
        username = request.POST.get('username', '')
        password = request.POST.get('password', '')
        email_prefix = request.POST.get('email_prefix', '')
        email_suffix = request.POST.get('email_suffix', '')
        email_code = request.POST.get('email_code', '')
        
        full_email = email_prefix + email_suffix
        
        # 1. 检查账号是否存在
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s", (username,))
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conn.close()
            return JsonResponse({'success': False, 'message': '账号已存在'})
        
        # 2. 检查邮箱是否存在
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = %s", (full_email,))
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conn.close()
            return JsonResponse({'success': False, 'message': '邮箱已被注册'})
        
        # 3. 验证验证码
        cursor.execute("""
            SELECT code FROM verification_codes 
            WHERE email = %s AND code = %s AND expire_time > NOW()
        """, (full_email, email_code))
        
        code_result = cursor.fetchone()
        
        # 删除过期验证码
        cursor.execute("DELETE FROM verification_codes WHERE expire_time <= NOW()")
        conn.commit()
        
        if not code_result:
            cursor.close()
            conn.close()
            return JsonResponse({'success': False, 'message': '验证码错误或已过期'})
        
        # 4. 生成 user_id
        user_id = generate_user_id()
        
        print(f"\n=== 开始注册用户 ===")
        print(f"user_id: {user_id}")
        print(f"username: {username}")
        
        # 5. 插入用户数据
        try:
            cursor.execute("""
                INSERT INTO users (user_id, username, password, email, is_creator)
                VALUES (%s, %s, %s, %s, 0)
            """, (user_id, username, password, full_email))
            
            conn.commit()
            print(f"用户 {username} 插入成功")
            
            # 6. 创建用户的喜欢音乐表
            table_name = f"`{user_id}_like_musics`"
            create_table_sql = f"""
            CREATE TABLE {table_name} (
                `music_id` VARCHAR(50) NOT NULL PRIMARY KEY COMMENT '音乐 ID（作为主键）',
                `music_name` VARCHAR(200) NOT NULL COMMENT '音乐名称',
                `click_count` INT DEFAULT 0 COMMENT '播放次数',
                `is_liked` TINYINT DEFAULT 0 COMMENT '是否喜爱：0-不喜爱，1-喜爱',
                `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
                INDEX `idx_music_name` (`music_name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户 {username} 的喜欢音乐表';
            """


            
            print(f"创建表 SQL: {create_table_sql}")
            cursor.execute(create_table_sql)
            conn.commit()
            print(f"表 {table_name} 创建成功")
            
            cursor.close()
            conn.close()
            
            print(f"用户 {username} 注册完成")
            return JsonResponse({'success': True, 'message': '注册成功'})
        
        except Exception as e:
            import traceback
            error_msg = f"注册失败：{str(e)}\n{traceback.format_exc()}"
            print(error_msg)
            cursor.close()
            conn.close()
            return JsonResponse({'success': False, 'message': error_msg})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

def check_find_password_username(request):
    """找回密码：检查账号是否存在"""
    if request.method == 'POST':
        username = request.POST.get('username', '')
        
        if not username:
            return JsonResponse({'success': False, 'message': '请输入账号'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        # 检查用户名是否存在
        cursor.execute("SELECT user_id, username, email, password FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return JsonResponse({'success': False, 'message': '账号不存在'})
        
        # 返回用户信息（包括完整邮箱和密码）
        return JsonResponse({
            'success': True,
            'message': '账号存在',
            'data': {
                'user_id': user[0],
                'username': user[1],
                'email': user[2],  # 完整的注册邮箱
                'password': user[3]  # 用于第三步比较
            }
        })
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})  

def send_find_password_email(request):
    """找回密码：发送邮箱验证码"""
    if request.method == 'POST':
        username = request.POST.get('username', '')
        email = request.POST.get('email', '')
        
        if not username or not email:
            return JsonResponse({'success': False, 'message': '账号和邮箱不能为空'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        # 检查账号和邮箱是否匹配
        cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s AND email = %s", (username, email))
        count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        if count == 0:
            return JsonResponse({'success': False, 'message': '邮箱与账号不匹配'})
        
        # 发送验证码
        result = send_verification_email(email)
        
        if result['success']:
            return JsonResponse({'success': True, 'message': '验证码已发送'})
        else:
            return JsonResponse({'success': False, 'message': result['message']})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

def verify_find_password_code(request):
    """找回密码：验证邮箱验证码"""
    if request.method == 'POST':
        email = request.POST.get('email', '')
        code = request.POST.get('code', '')
        
        if not email or not code:
            return JsonResponse({'success': False, 'message': '邮箱和验证码不能为空'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        # 查询验证码
        cursor.execute("""
            SELECT code FROM verification_codes 
            WHERE email = %s AND code = %s AND expire_time > NOW()
        """, (email, code))
        
        result = cursor.fetchone()
        
        # 删除过期验证码
        cursor.execute("DELETE FROM verification_codes WHERE expire_time <= NOW()")
        conn.commit()
        
        cursor.close()
        conn.close()
        
        if result:
            return JsonResponse({'success': True, 'message': '验证成功'})
        else:
            return JsonResponse({'success': False, 'message': '验证码错误或已过期'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

@csrf_protect
def update_password(request):
    """更新密码 - 支持两种模式：
    1. 用户中心修改密码（从 Cookie 获取 user_id）
    2. 找回密码（从请求体获取 username, old_password, new_password）
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # 判断是哪种模式
            if 'username' in data and 'old_password' in data and 'new_password' in data:
                # 找回密码模式
                username = data.get('username', '')
                old_password = data.get('old_password', '')
                new_password = data.get('new_password', '')
                
                if not username or not old_password or not new_password:
                    return JsonResponse({'success': False, 'message': '请填写完整信息'})
                
                conn = get_mysql_conn()
                cursor = conn.cursor()
                
                try:
                    # 验证旧密码
                    cursor.execute("SELECT user_id FROM users WHERE username = %s AND password = %s", 
                                 (username, old_password))
                    user = cursor.fetchone()
                    
                    if not user:
                        cursor.close()
                        conn.close()
                        return JsonResponse({'success': False, 'message': '用户名或旧密码错误'})
                    
                    # 更新密码
                    cursor.execute("UPDATE users SET password = %s WHERE username = %s", 
                                 (new_password, username))
                    
                    conn.commit()
                    cursor.close()
                    conn.close()
                    
                    return JsonResponse({'success': True, 'message': '密码修改成功'})
                
                except Exception as e:
                    cursor.close()
                    conn.close()
                    return JsonResponse({'success': False, 'message': f'修改失败：{str(e)}'})
            
            else:
                # 用户中心修改密码模式
                password = data.get('password', '')
                
                if not password:
                    return JsonResponse({'success': False, 'message': '密码不能为空'})
                
                user_id = request.COOKIES.get('user_id')
                if not user_id:
                    return JsonResponse({'success': False, 'message': '未登录'})
                
                conn = get_mysql_conn()
                cursor = conn.cursor()
                
                try:
                    cursor.execute("""
                        UPDATE users 
                        SET password = %s 
                        WHERE user_id = %s
                    """, (password, user_id))
                    
                    conn.commit()
                    cursor.close()
                    conn.close()
                    
                    return JsonResponse({'success': True, 'message': '更新成功'})
                
                except Exception as e:
                    cursor.close()
                    conn.close()
                    return JsonResponse({'success': False, 'message': f'更新失败：{str(e)}'})
        
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'解析失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

from django.http import HttpResponseRedirect
from django.urls import reverse

def login_user(request):
    """处理用户登录（使用 Cookie 版本）"""
    if request.method == 'POST':
        username_or_email = request.POST.get('username', '').strip()
        password = request.POST.get('password', '').strip()
        remember_me = request.POST.get('remember_me', 'false')
        
        print(f"\n=== 登录请求 ===")
        print(f"用户名/邮箱：{username_or_email}")
        print(f"记住我：{remember_me}")
        
        # 验证输入
        if not username_or_email:
            return JsonResponse({'success': False, 'message': '请输入账号或邮箱'})
        
        if not password:
            return JsonResponse({'success': False, 'message': '请输入密码'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        try:
            # 先按 username 查询
            cursor.execute("""
                SELECT user_id, username, password, email, is_creator, avatar
                FROM users 
                WHERE username = %s
            """, (username_or_email,))
            user = cursor.fetchone()
            
            # 如果 username 没查到，再按 email 查询
            if not user:
                cursor.execute("""
                    SELECT user_id, username, password, email, is_creator, avatar
                    FROM users 
                    WHERE email = %s
                """, (username_or_email,))
                user = cursor.fetchone()
            
            if not user:
                # 账号或邮箱不存在
                return JsonResponse({
                    'success': False, 
                    'message': '账号或邮箱不存在',
                    'need_clear_username': True
                })
            
            # 提取用户基本信息
            user_id = user[0]
            db_username = user[1]
            db_password = user[2]
            db_email = user[3]
            is_creator = user[4]
            db_avatar = user[5] or '/static/imgs/hp1.png'
            
            # ★ 额外查询一次获取 nickname（确保能拿到最新值）
            cursor.execute("SELECT nickname FROM users WHERE user_id = %s", (user_id,))
            nickname_result = cursor.fetchone()
            db_nickname = (nickname_result[0] if nickname_result and nickname_result[0] else None) or db_username
            print(f"✓ 成功获取昵称: user_id={user_id}, nickname={db_nickname}")
            
            # 检查密码
            if password != db_password:
                # 密码错误
                return JsonResponse({
                    'success': False, 
                    'message': '密码错误',
                    'need_clear_password': True
                })
            
            # 登录成功
            print(f"登录成功：user_id={user_id}, username={db_username}, nickname={db_nickname}")
            
            # 创建响应对象
            response = JsonResponse({'success': True, 'message': '登录成功', 'redirect': '/index/'})
            
            # 将用户信息写入 Cookie（所有用户都设置 30 天有效期）
            import hashlib
            from urllib.parse import quote  # ★ 导入 URL 编码函数
            
            # 生成一个简单的登录令牌
            login_token = hashlib.md5(f"{user_id}{db_username}{datetime.now()}".encode()).hexdigest()
            
            # 设置用户信息 cookie
            # ★ 重要：指定 path='/' 确保 Cookie 在整个网站有效，samesite='Lax' 确保跨页面传递
            # ★ 对中文字符进行 URL 编码，确保能写入 HTTP 响应头
            response.set_cookie('user_id', str(user_id), max_age=30*24*60*60, path='/', samesite='Lax')
            response.set_cookie('username', quote(db_username, safe=''), max_age=30*24*60*60, path='/', samesite='Lax')
            response.set_cookie('nickname', quote(db_nickname, safe=''), max_age=30*24*60*60, path='/', samesite='Lax')  # ★ 昵称Cookie - URL编码
            print(f"✓ 已设置 Cookie:")
            print(f"  - user_id: {user_id}")
            print(f"  - username: {quote(db_username, safe='')}")
            print(f"  - nickname: {quote(db_nickname, safe='')}")
            response.set_cookie('email', quote(db_email, safe=''), max_age=30*24*60*60, path='/', samesite='Lax')
            response.set_cookie('is_creator', str(is_creator), max_age=30*24*60*60, path='/', samesite='Lax')
            response.set_cookie('login_token', login_token, max_age=30*24*60*60, path='/', samesite='Lax')
            response.set_cookie('is_logged_in', 'true', max_age=30*24*60*60, path='/', samesite='Lax')
            response.set_cookie('user_avatar', quote(db_avatar, safe='/'), max_age=30*24*60*60, path='/', samesite='Lax')
            
            # 如果没有选择"记住我"，删除 remembered_username cookie
            if remember_me != 'true':
                response.delete_cookie('remembered_username')
            
            return response
                
        except Exception as e:
            print(f"登录异常：{e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': f'登录失败：{str(e)}'})
        finally:
            try:
                if cursor:
                    cursor.close()
            except Exception as e:
                print(f"关闭 cursor 异常：{e}")
            
            try:
                if conn:
                    conn.close()
            except Exception as e:
                print(f"关闭连接异常：{e}")
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

def logout_user(request):
    """处理用户登出（Cookie 版本）"""
    if request.method == 'POST':
        try:
            # 清除所有用户相关的 cookie
            response = JsonResponse({'success': True, 'message': '登出成功'})
            response.delete_cookie('user_id')
            response.delete_cookie('username')
            response.delete_cookie('nickname')  # ★ 补充删除 nickname Cookie
            response.delete_cookie('email')
            response.delete_cookie('is_creator')
            response.delete_cookie('login_token')
            response.delete_cookie('is_logged_in')
            response.delete_cookie('user_avatar')  # ★ 补充删除 user_avatar Cookie
            
            return response
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'登出失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

@csrf_protect
def apply_creator(request):
    """处理用户申请成为创作者 - 同时创建个人创作数据库表"""
    if request.method == 'POST':
        try:
            # 获取当前用户 ID
            user_id = request.COOKIES.get('user_id')
            if not user_id:
                return JsonResponse({'success': False, 'message': '用户未登录'})
            
            # 连接数据库
            import pymysql
            connection = pymysql.connect(
                host='localhost',
                user='root',
                password='123456',
                database='coolmusic'
            )
            cursor = connection.cursor()
            
            try:
                # ★新增★：创建个人创作数据库表
                table_name = f"{user_id}_create_musics"
                print(f"\n创建创作者表：{table_name}")
                
                create_table_sql = f'''
                    CREATE TABLE IF NOT EXISTS {table_name} (
                        music_id varchar(50) PRIMARY KEY COMMENT '首个随机小写字母+随机7-10位数字',
                        music_name varchar(255) NOT NULL COMMENT '歌名',
                        author_id varchar(50) NOT NULL COMMENT 'user_id',
                        author varchar(255) NOT NULL COMMENT '用户昵称',
                        album varchar(255) NOT NULL COMMENT '专辑',
                        album_cover longtext NOT NULL COMMENT '封面',
                        lyrics text NOT NULL COMMENT '歌词',
                        real_url longtext NOT NULL COMMENT '链接编码后的链接',
                        play_url longtext NOT NULL COMMENT '链接',
                        country varchar(255) NOT NULL COMMENT '国家',
                        like_count int DEFAULT 0 COMMENT '点赞数',
                        click_count int DEFAULT 0 COMMENT '点击量',
                        click_logs longtext NOT NULL COMMENT '每日点击日志(JSON)',
                        like_logs longtext NOT NULL COMMENT '每日点赞日志(JSON)',
                        comment_count int DEFAULT 0 COMMENT '评论数',
                        state int DEFAULT 0 COMMENT '审核状态(0-待审核,1-未通过,2-已通过)',
                        create_datetime datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创作时间',
                        INDEX idx_author_id (author_id),
                        INDEX idx_create_datetime (create_datetime)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户创作音乐表';
                '''
                
                cursor.execute(create_table_sql)

                cursor.execute(
                    """
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
                    """,
                    (table_name,)
                )
                existing_columns = {row[0] for row in cursor.fetchall()}

                if 'click_logs' not in existing_columns:
                    cursor.execute(f"""
                        ALTER TABLE {table_name}
                        ADD COLUMN click_logs longtext NOT NULL COMMENT '每日点击日志(JSON)'
                    """)

                if 'like_logs' not in existing_columns:
                    cursor.execute(f"""
                        ALTER TABLE {table_name}
                        ADD COLUMN like_logs longtext NOT NULL COMMENT '每日点赞日志(JSON)'
                    """)

                connection.commit()
                print(f"✓ 创作者表 {table_name} 创建成功")
                
                # 更新用户的 is_creator 字段
                cursor.execute(
                    'UPDATE users SET is_creator = 1 WHERE user_id = %s',
                    (user_id,)
                )
                connection.commit()
                print(f"✓ 用户 {user_id} 已成为创作者")
                
                cursor.close()
                connection.close()
                
                return JsonResponse({'success': True, 'message': '已成为创作者'})
            except Exception as e:
                connection.rollback()
                print(f"✗ 创建创作者表出错：{str(e)}")
                # 如果表已存在，仍然更新 is_creator 字段
                if 'already exists' in str(e):
                    try:
                        cursor.execute(
                            'UPDATE users SET is_creator = 1 WHERE user_id = %s',
                            (user_id,)
                        )
                        connection.commit()
                        cursor.close()
                        connection.close()
                        return JsonResponse({'success': True, 'message': '已成为创作者'})
                    except:
                        pass
                raise e
        except Exception as e:
            print(f'创作者申请错误: {str(e)}')
            return JsonResponse({'success': False, 'message': f'申请失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

@csrf_protect
def publish_music(request):
    """发布音乐 - 只写入个人创作表，state=0（待审核），不直接写入新歌榜"""
    if request.method == 'POST':
        try:
            import json
            import pymysql
            import base64
            
            data = json.loads(request.body)
            
            # 获取必要信息
            user_id = request.COOKIES.get('user_id')
            if not user_id:
                return JsonResponse({'success': False, 'message': '用户未登录'})
            
            music_id = data.get('music_id')
            music_name = data.get('music_name', '')
            author = data.get('author', '')
            album = data.get('album', '')
            album_cover = data.get('album_cover', '')
            lyrics = data.get('lyrics', '')
            play_url = data.get('play_url', '')
            country = data.get('country', '')
            
            # 验证必填项
            if not music_name or not author or not album_cover or not lyrics or not country or not play_url:
                return JsonResponse({'success': False, 'message': '缺少必填项'})
            
            if len(lyrics) < 30:
                return JsonResponse({'success': False, 'message': '歌词必须不少于30个字符'})
            
            # 连接数据库
            connection = pymysql.connect(
                host='localhost',
                user='root',
                password='123456',
                database='coolmusic'
            )
            cursor = connection.cursor()
            
            try:
                # 对音乐链接进行编码保存
                if play_url.startswith('http'):
                    real_url = base64.b64encode(play_url.encode()).decode()
                    print(f"✓ 网络链接已编码保存")
                else:
                    real_url = play_url
                
                # 获取用户信息用于写入创作表
                cursor.execute('SELECT nickname FROM users WHERE user_id = %s', (user_id,))
                user_info = cursor.fetchone()
                author_name = user_info[0] if user_info else author
                creator_logs_empty = json.dumps({}, ensure_ascii=False)
                
                # 准备插入数据
                insert_data = (
                    music_id,
                    music_name,
                    user_id,
                    author_name,
                    album,
                    album_cover,
                    lyrics,
                    real_url,
                    play_url,
                    country,
                    0,  # like_count
                    0,  # click_count
                    creator_logs_empty,  # click_logs
                    creator_logs_empty,  # like_logs
                    0   # state - 待审核
                )
                
                # 只写入个人创作表，state=0（待审核）
                user_table_name = f"{user_id}_create_musics"
                user_insert_sql = f'''
                    INSERT INTO {user_table_name}
                    (music_id, music_name, author_id, author, album, album_cover,
                     lyrics, real_url, play_url, country, like_count, click_count,
                     click_logs, like_logs, state, create_datetime)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                '''
                
                cursor.execute(user_insert_sql, insert_data)
                connection.commit()
                print(f"✓ 音乐已写入用户创作表 {user_table_name}（待审核）")
                
                cursor.close()
                connection.close()
                
                return JsonResponse({
                    'success': True,
                    'message': '歌曲已提交，等待管理员审核',
                    'music_id': music_id
                })
            except Exception as e:
                connection.rollback()
                cursor.close()
                connection.close()
                print(f'插入音乐错误: {str(e)}')
                return JsonResponse({'success': False, 'message': f'数据库错误: {str(e)}'})
        except Exception as e:
            print(f'发布音乐错误: {str(e)}')
            return JsonResponse({'success': False, 'message': f'发布失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

def get_remembered_username(request):
    """获取记住的用户名"""
    if request.method == 'GET':
        remembered_username = request.COOKIES.get('remembered_username', '')
        return JsonResponse({
            'success': True,
            'remembered_username': remembered_username
        })
    return JsonResponse({'success': False})


# ========== 辅助函数：将 HMM 等级结果映射到数据库音乐 ==========
def map_hmm_results_to_database_music(hmm_recommendations):
    """
    将 HMM 样本推荐结果映射到数据库中的真实音乐
    
    策略：
    1. 从数据库中查询足够的音乐记录
    2. 根据 HMM 相似度分数进行排序和映射
    3. 返回数据库中的真实音乐信息
    """
    if not hmm_recommendations:
        return []
    
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 需要的推荐数量（加上缓冲，防止查询不足）
        needed_count = len(hmm_recommendations) * 2
        
        print(f"\n📊 将 HMM 结果映射到数据库音乐...")
        print(f"   需要推荐数量: {len(hmm_recommendations)}")
        
        # 策略：从 music_info 表中随机选择音乐，然后按 HMM 相似度排序
        cursor.execute(f"""
            SELECT music_id, music_name, author, author_id, album, album_cover, country
            FROM music_info
            ORDER BY RAND()
            LIMIT %s
        """, (needed_count,))
        
        database_musics = cursor.fetchall()
        print(f"   从数据库获取: {len(database_musics)} 条音乐记录")
        
        if not database_musics:
            print(f"   ⚠️ 数据库为空或查询失败")
            return []
        
        # 映射：将 HMM 推荐与数据库音乐配对
        mapped_recommendations = []
        for i, hmm_rec in enumerate(hmm_recommendations):
            if i < len(database_musics):
                db_music = database_musics[i]
                mapped_recommendations.append({
                    'id': db_music.get('music_id'),
                    'name': db_music.get('music_name'),
                    'artist': db_music.get('author', ''),
                    'album': db_music.get('album', ''),
                    'cover_url': db_music.get('album_cover', ''),
                    'score': hmm_rec['score'],  # 使用 HMM 的相似度分数
                    'rank': hmm_rec['rank'],
                    'audio_similarity': hmm_rec['audio_similarity'],
                    'hmm_state': hmm_rec['hmm_state']
                })
        
        cursor.close()
        conn.close()
        
        print(f"   ✅ 映射完成: {len(mapped_recommendations)} 条音乐")
        return mapped_recommendations
        
    except Exception as e:
        print(f"   ❌ 映射失败: {e}")
        import traceback
        traceback.print_exc()
        return []


# ========== Markov 音乐推荐 API ==========
@csrf_exempt
def api_recommend_by_markov(request):
    """
    使用 HMM（隐马尔可夫模型）进行音乐推荐
    
    完整流程：
    1. 接收用户上传的音频文件
    2. 提取音频的 MFCC 特征（26 维）
    3. 使用 THCHS-30 数据集训练 HMM 模型
    4. 基于音频特征的隐状态预测和相似度计算进行推荐
    5. 将推荐的样本映射到数据库中的真实音乐
    6. 返回数据库音乐推荐结果列表
    
    请求方式：POST
    请求体：multipart/form-data with audio file
    返回：JSON with recommendations list
    """
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': '请求方法必须为 POST'
        }, status=405)
    
    try:
        print(f"\n{'='*70}")
        print("🎵 HMM 音乐推荐 API - 接收请求")
        print(f"{'='*70}")
        
        # 1. 获取上传的音频文件
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return JsonResponse({
                'success': False,
                'message': '未找到音频文件'
            }, status=400)
        
        print(f"✓ 获取到音频文件: {audio_file.name} ({audio_file.size} 字节)")
        
        # 2. 导入推荐函数
        try:
            from music.markov_model import recommend_music
        except ImportError as e:
            print(f"❌ 导入推荐模块失败: {e}")
            return JsonResponse({
                'success': False,
                'message': f'推荐系统模块不完整：{str(e)}'
            }, status=500)
        
        # 3. 读取音频文件
        print(f"📖 读取音频文件内容...")
        audio_data = audio_file.read()
        print(f"✓ 读取完成，音频大小: {len(audio_data)} 字节")
        
        # 4. 调用 HMM 推荐函数
        print(f"\n⏳ 开始 HMM 推荐流程...")
        hmm_recommendations = recommend_music(audio_data, max_results=20)
        
        if not hmm_recommendations:
            return JsonResponse({
                'success': False,
                'message': 'HMM 推荐失败'
            }, status=500)
        
        # 5. 直接返回真实推荐结果（不再随机映射）
        if not hmm_recommendations:
            return JsonResponse({
                'success': False,
                'message': '无法获取推荐音乐'
            }, status=500)

        recommendations = []
        for item in hmm_recommendations:
            recommendations.append({
                'id': item.get('music_id'),
                'name': item.get('music_name', ''),
                'artist': item.get('author', ''),
                'album': item.get('album', ''),
                'cover_url': item.get('cover_url', ''),
                'score': item.get('score', 0),
                'hmm_state': item.get('hmm_state', -1),
                'lyric_length': item.get('lyric_length', 0),
                'lyric_token_count': item.get('lyric_token_count', 0)
            })
        
        print(f"\n✓ 推荐 API 处理完成")
        print(f"{'='*70}\n")
        
        return JsonResponse({
            'success': True,
            'recommendations': recommendations,
            'total': len(recommendations),
            'message': '推荐成功'
        })
    
    except Exception as e:
        print(f"❌ 推荐 API 异常: {e}")
        import traceback
        traceback.print_exc()
        print(f"{'='*70}\n")
        return JsonResponse({
            'success': False,
            'message': f'推荐失败：{str(e)}'
        }, status=500)


# ========== 【新增】音乐推荐播放接口 ==========
@csrf_exempt
def api_get_play_url_for_recommendation(request):
    """
    【新增函数】为音乐推荐页面获取播放链接
    
    功能：
    1. 接收推荐页面发来的音乐 ID
    2. 直接使用爬虫获取真实播放链接
    3. 返回可直接播放的数据
    
    请求方式：POST
    请求体：{music_id: "12345", rank_type: "soaring"}
    返回：{success: true, play_url: "http://...", music_name: "...", album_cover: "..."}
    """
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': '请求方法必须为 POST'
        }, status=405)
    
    try:
        print(f"\n{'='*70}")
        print("🎵 【推荐播放】获取音乐播放链接")
        print(f"{'='*70}")
        
        # 1. 解析请求数据
        try:
            data = json.loads(request.body)
        except:
            data = request.POST
        
        music_id = data.get('music_id') or request.POST.get('music_id')
        rank_type = data.get('rank_type', 'soaring') or request.POST.get('rank_type', 'soaring')
        
        if not music_id:
            return JsonResponse({
                'success': False,
                'message': '音乐 ID 不能为空'
            }, status=400)
        
        music_id = str(music_id).strip()
        print(f"📥 请求参数：music_id={music_id}, rank_type={rank_type}")
        
        # 2. 直接调用爬虫获取播放链接
        print(f"🕷️ 调用爬虫获取播放链接...")
        try:
            play_url = get_netease_url(music_id)
            if not play_url:
                print(f"❌ 爬虫获取失败（返回为空）")
                return JsonResponse({
                    'success': False,
                    'message': '无法获取音乐播放链接，请稍后重试'
                }, status=404)
            
            print(f"✅ 爬虫获取成功: {play_url[:80]}...")
        except Exception as e:
            print(f"❌ 爬虫调用异常: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'message': f'爬虫获取失败: {str(e)}'
            }, status=500)
        
        # 3. 返回播放数据
        print(f"✅ 完成播放链接获取")
        print(f"   - 播放链接: {play_url[:80]}...")
        print(f"{'='*70}\n")
        
        return JsonResponse({
            'success': True,
            'play_url': play_url,
            'music_id': str(music_id),
            'message': '获取成功'
        })
        
    except Exception as e:
        print(f"❌ 异常: {e}")
        import traceback
        traceback.print_exc()
        print(f"{'='*70}\n")
        return JsonResponse({
            'success': False,
            'message': f'获取播放链接失败: {str(e)}'
        }, status=500)


# ========== 【新增】音乐代理端点 ==========
@csrf_exempt
def api_proxy_music_stream(request):
    """
    【新增函数】音乐流代理端点
    
    功能：由后端代理音乐下载，解决网易云 CORS 限制
    
    请求方式：GET
    参数：music_id=12345
    返回：音频流（audio/mpeg）
    """
    try:
        music_id = request.GET.get('music_id') or request.POST.get('music_id')
        
        if not music_id:
            return JsonResponse({
                'success': False,
                'message': '音乐 ID 不能为空'
            }, status=400)
        
        music_id = str(music_id).strip()
        print(f"\n🎵 【音乐代理】获取音乐流: music_id={music_id}")
        
        # 获取播放链接
        try:
            play_url = get_netease_url(music_id)
            if not play_url:
                print(f"❌ 获取播放链接失败")
                return JsonResponse({
                    'success': False,
                    'message': '无法获取音乐播放链接'
                }, status=404)
            
            print(f"✅ 获取播放链接成功: {play_url[:80]}...")
        except Exception as e:
            print(f"❌ 获取播放链接异常: {e}")
            return JsonResponse({
                'success': False,
                'message': f'获取播放链接失败: {str(e)}'
            }, status=500)
        
        # 代理请求音乐数据
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://music.163.com/',
                'Range': 'bytes=0-'
            }
            
            print(f"🕷️ 向网易云代理请求音乐数据...")
            response = requests.get(play_url, headers=headers, timeout=30, stream=True)
            
            if response.status_code not in [200, 206]:
                print(f"❌ 网易云返回状态码: {response.status_code}")
                return JsonResponse({
                    'success': False,
                    'message': f'网易云服务器返回错误: {response.status_code}'
                }, status=response.status_code)
            
            print(f"✅ 代理成功，响应状态: {response.status_code}")
            
            # 获取网易云响应的关键头信息
            content_length = response.headers.get('Content-Length')
            content_range = response.headers.get('Content-Range')
            content_encoding = response.headers.get('Content-Encoding', '')
            
            print(f"  - Content-Length: {content_length}")
            print(f"  - Content-Range: {content_range}")
            print(f"  - Content-Encoding: {content_encoding}")
            
            # 以流形式返回音乐数据
            def stream_generator():
                try:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            yield chunk
                except Exception as e:
                    print(f"❌ 流传输异常: {e}")
            
            # 创建流式响应
            stream_response = StreamingHttpResponse(
                stream_generator(),
                content_type='audio/mpeg'
            )
            
            # 设置关键响应头
            stream_response['Content-Disposition'] = 'inline'
            stream_response['Accept-Ranges'] = 'bytes'
            stream_response['Cache-Control'] = 'public, max-age=86400'  # 缓存一天
            
            # 转发网易云的头信息
            if content_length:
                stream_response['Content-Length'] = content_length
            if content_range:
                stream_response['Content-Range'] = content_range
            if content_encoding:
                stream_response['Content-Encoding'] = content_encoding
            
            # 允许跨域访问
            stream_response['Access-Control-Allow-Origin'] = '*'
            stream_response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            stream_response['Access-Control-Allow-Headers'] = 'Content-Type, Range'
            
            return stream_response
            
        except requests.Timeout:
            print(f"❌ 网易云请求超时")
            return JsonResponse({
                'success': False,
                'message': '网易云服务器超时，请稍后重试'
            }, status=504)
        except Exception as e:
            print(f"❌ 代理异常: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'message': f'代理失败: {str(e)}'
            }, status=500)
            
    except Exception as e:
        print(f"❌ 异常: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'message': f'代理异常: {str(e)}'
        }, status=500)


# ========== 【新增】图片识别推荐 API ==========
@csrf_exempt
def api_recommend_by_image(request):
    """
    【新增函数】通过图片识别推荐音乐
    
    功能：
    1. 接收上传的图片
    2. 使用 CNN 识别图片内容
    3. 根据识别结果查询 music_info 数据库推荐音乐
    4. 返回推荐的音乐列表
    
    请求方式：POST
    请求体：multipart/form-data with image file
    返回：JSON with recommendations list
    """
    if request.method != 'POST':
        return JsonResponse({
            'success': False,
            'message': '请求方法必须为 POST'
        }, status=405)
    
    try:
        print(f"\n{'='*70}")
        print("🎨 【图片推荐】识别图片并推荐音乐")
        print(f"{'='*70}")
        
        # 1. 获取上传的图片文件
        image_file = request.FILES.get('image')
        if not image_file:
            return JsonResponse({
                'success': False,
                'message': '未找到图片文件'
            }, status=400)
        
        print(f"✓ 获取到图片文件: {image_file.name} ({image_file.size} 字节)")
        
        # 2. 导入 CNN 模块
        try:
            from music.cnn import predict_image_from_bytes
        except ImportError as e:
            print(f"❌ 导入 CNN 模块失败: {e}")
            
            # 备用：使用 predict_image 接口
            try:
                import tempfile
                import os
                from music.cnn import predict_image
                
                # 保存图片到临时文件
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                    for chunk in image_file.chunks():
                        tmp.write(chunk)
                    tmp_path = tmp.name
                
                print(f"📁 保存到临时文件: {tmp_path}")
                class_name, recommended_music_types = predict_image(tmp_path)
                
                # 删除临时文件
                os.remove(tmp_path)
            except ImportError as e2:
                print(f"❌ 导入 CNN 模块失败: {e2}")
                return JsonResponse({
                    'success': False,
                    'message': f'CNN 模块不完整：{str(e2)}'
                }, status=500)
        else:
            # 使用字节流版本
            image_data = image_file.read()
            print(f"📖 读取图片数据: {len(image_data)} 字节")
            
            class_name, recommended_music_types = predict_image_from_bytes(image_data)
        
        print(f"✓ 图片识别完成")
        print(f"  - 识别内容: {class_name}")
        print(f"  - 推荐音乐类型: {recommended_music_types}")
        
        # 3. 根据推荐的音乐类型查询数据库
        print(f"\n🔍 查询数据库推荐音乐...")
        recommendations = []
        
        try:
            conn = get_mysql_conn()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            # 为每个音乐类型查询相关歌曲
            for music_type in recommended_music_types:
                print(f"  - 查询音乐类型: {music_type}")
                
                # 从 music_info 表查询，根据评论或其他字段匹配
                # 这里简化处理：可根据音乐特征、风格等字段查询
                cursor.execute("""
                    SELECT music_id, music_name, author, album, album_cover, country
                    FROM music_info
                    WHERE country LIKE %s OR author LIKE %s OR music_name LIKE %s
                    ORDER BY RAND()
                    LIMIT 5
                """, (f'%{music_type}%', f'%{music_type}%', f'%{music_type}%'))
                
                results = cursor.fetchall()
                print(f"    ✓ 找到 {len(results)} 条结果")
                
                for result in results:
                    recommendations.append({
                        'id': result.get('music_id'),
                        'name': result.get('music_name'),
                        'artist': result.get('author', ''),
                        'album': result.get('album', ''),
                        'cover_url': result.get('album_cover', ''),
                        'music_type': music_type
                    })
            
            cursor.close()
            conn.close()
            
            # 如果没有查到结果，从数据库随机推荐
            if not recommendations:
                print(f"⚠️  没有找到匹配的音乐，返回随机推荐")
                conn = get_mysql_conn()
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                
                cursor.execute("""
                    SELECT music_id, music_name, author, album, album_cover
                    FROM music_info
                    ORDER BY RAND()
                    LIMIT 20
                """)
                
                results = cursor.fetchall()
                for result in results:
                    recommendations.append({
                        'id': result.get('music_id'),
                        'name': result.get('music_name'),
                        'artist': result.get('author', ''),
                        'album': result.get('album', ''),
                        'cover_url': result.get('album_cover', '')
                    })
                
                cursor.close()
                conn.close()
        
        except Exception as e:
            print(f"⚠️  数据库查询异常: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"\n✓ 推荐 API 处理完成，获得 {len(recommendations)} 条推荐")
        print(f"{'='*70}\n")
        
        return JsonResponse({
            'success': True,
            'recommendations': recommendations,
            'total': len(recommendations),
            'image_class': class_name,
            'music_types': recommended_music_types,
            'message': '推荐成功'
        })
    
    except Exception as e:
        print(f"❌ 图片推荐 API 异常: {e}")
        import traceback
        traceback.print_exc()
        print(f"{'='*70}\n")
        return JsonResponse({
            'success': False,
            'message': f'图片推荐失败：{str(e)}'
        }, status=500)


@csrf_protect
def get_creator_musics(request):
    """获取创作者发布的所有音乐"""
    if request.method == 'GET':
        user_id = request.COOKIES.get('user_id')
        
        if not user_id:
            return JsonResponse({
                'success': False,
                'message': '用户未登录'
            })
        
        try:
            conn = get_mysql_conn()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            table_name = f'{user_id}_create_musics'
            
            # 检查表是否存在
            cursor.execute("""
                SELECT COUNT(*) as cnt FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
            """, (table_name,))
            table_exists = cursor.fetchone()['cnt'] > 0
            
            if not table_exists:
                print(f'⚠️ 创作者表不存在: {table_name}')
                cursor.close()
                conn.close()
                return JsonResponse({
                    'success': True,
                    'musics': []
                })
            
            # 查询所有音乐（包括待审核、已拒绝、已通过）
            cursor.execute(f"""
                SELECT 
                    music_id, music_name, album, album_cover, 
                    play_url, country, lyrics, 
                    click_count, like_count,
                    click_logs, like_logs, create_datetime, state
                FROM {table_name}
                ORDER BY create_datetime DESC
            """)
            
            musics = cursor.fetchall()
            print(f'✅ 查询结果: {len(musics)} 首音乐 from {table_name}')
            for music in musics:
                print(f'  - {music["music_name"]} (state={music.get("state", "N/A")})')
            
            # 处理返回数据，确保 JSON 兼容性
            for music in musics:
                # 处理歌词（确保转义）
                if music['lyrics']:
                    # 歌词已经是字符串，保持原样，JSON 会自动转义
                    pass
                else:
                    music['lyrics'] = ''
                
                # 处理音频链接
                if not music['play_url']:
                    music['play_url'] = ''
                
                # 处理专辑封面
                if not music['album_cover']:
                    music['album_cover'] = ''
                
                # 保持 click_logs 和 like_logs 为字符串供前端处理
                if not music['click_logs']:
                    music['click_logs'] = '{}'
                if not music['like_logs']:
                    music['like_logs'] = '{}'
            
            cursor.close()
            conn.close()
            
            return JsonResponse({
                'success': True,
                'musics': musics
            })
        
        except Exception as e:
            print(f'❌ 获取创作者音乐错误: {str(e)}')
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'message': f'获取失败: {str(e)}'
            })
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})


# ★新增★：获取音乐统计数据API
def get_music_stats(request):
    """
    获取指定音乐的统计数据（点击数、喜爱数）
    
    POST 请求体：
    {
        'music_id': 'music_xxx_xxx',
        'time_range': '5days' | '30days' | '12months'
    }
    """
    if request.method == 'POST':
        try:
            import json
            from music.draw import get_music_stats as draw_get_music_stats
            
            data = json.loads(request.body)
            music_id = data.get('music_id')
            time_range = data.get('time_range', '5days')
            user_id = request.COOKIES.get('user_id')
            
            if not user_id:
                return JsonResponse({
                    'success': False,
                    'message': '用户未登录'
                })
            
            if not music_id:
                return JsonResponse({
                    'success': False,
                    'message': '缺少music_id参数'
                })
            
            # 调用draw.py中的函数获取统计数据
            stats_data = draw_get_music_stats(music_id, user_id, time_range)
            
            return JsonResponse({
                'success': True,
                'labels': stats_data.get('labels', []),
                'clicks': stats_data.get('clicks', []),
                'likes': stats_data.get('likes', []),
                'total_clicks': stats_data.get('total_clicks', 0),
                'total_likes': stats_data.get('total_likes', 0)
            })
        
        except Exception as e:
            print(f'获取音乐统计数据错误: {str(e)}')
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False,
                'message': f'获取失败: {str(e)}'
            })
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

# def user(request):
#     return render(request, 'user.html')
def user(request, user_id):
    """用户个人资料页面"""
    # 获取 URL 中的 user_id
    print(f"\n{'='*50}")
    print(f"=== 访问用户页面 ===")
    print(f"{'='*50}")
    print(f"URL 中的 user_id: {user_id}")
    print(f"Cookie 中的 user_id: {request.COOKIES.get('user_id')}")
    
    conn = None
    cursor = None
    
    try:
        # 查询所有省份（用于地区选择）
        provinces = list(china_divisions.keys())
        
        # 尝试转换为整数查询（如果数据库是 INT 类型）
        try:
            user_id_int = int(user_id)
            query_condition = user_id_int
            print(f"使用整数类型查询：{query_condition}")
        except ValueError:
            query_condition = user_id
            print(f"使用字符串类型查询：{query_condition}")
        
        # 创建数据库连接
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询用户信息
        cursor.execute("""
            SELECT user_id, username, nickname, gender, birthday, region,
                   introduce, email, password, avatar, is_creator
            FROM users 
            WHERE user_id = %s
        """, (query_condition,))
        
        user_data = cursor.fetchone()
        
        print(f"查询结果：{user_data}")
        
        if not user_data:
            print(f"未找到用户 {user_id}")
            # 尝试用字符串查询一次
            if isinstance(query_condition, int):
                print(f"尝试用字符串重新查询...")
                cursor.execute("""
                    SELECT user_id, username, nickname, gender, birthday, region,
                           introduce, email, password, avatar, is_creator
                    FROM users 
                    WHERE user_id = %s
                """, (str(user_id),))
                user_data = cursor.fetchone()
                print(f"字符串查询结果：{user_data}")
            
            if not user_data:
                context = {
                    'error': f'未找到用户 ID: {user_id}',
                    'current_user_id': user_id,
                    'provinces': provinces
                }
                return render(request, 'user.html', context)
        
                # 确保所有字段都有值
        if user_data:
            # 处理性别字段（确保是字符串）
            if user_data.get('gender') is None:
                user_data['gender'] = ''
            else:
                user_data['gender'] = str(user_data['gender'])
            
            # 处理生日字段 - 确保转换为字符串
            if user_data.get('birthday') is None:
                user_data['birthday'] = ''
            else:
                # 如果是 date 类型，转换为字符串
                from datetime import date
                if isinstance(user_data['birthday'], date):
                    user_data['birthday'] = user_data['birthday'].strftime('%Y-%m-%d')
                else:
                    user_data['birthday'] = str(user_data['birthday'])
            
            # 处理地区字段 - 拆分为省份和城市
            region_full = user_data.get('region', '')
            if region_full:
                # 如果地区包含空格，拆分为省份和城市
                if ' ' in region_full:
                    parts = region_full.split(' ')
                    user_data['region_province'] = parts[0]
                    user_data['region_city'] = parts[1] if len(parts) > 1 else ''
                else:
                    # 如果没有空格，整个作为省份
                    user_data['region_province'] = region_full
                    user_data['region_city'] = ''
            else:
                user_data['region_province'] = ''
                user_data['region_city'] = ''
            
            # 处理城市字段
            if user_data.get('city') is None:
                user_data['city'] = ''
            
            # 处理介绍字段
            if user_data.get('introduce') is None:
                user_data['introduce'] = ''
            
            # 处理昵称字段
            if user_data.get('nickname') is None or user_data.get('nickname') == '':
                user_data['nickname'] = '' 
        context = {
            'user': user_data,
            'current_user_id': user_id,
            'provinces': provinces
        }
        
        print(f"用户 {user_id} 页面渲染成功")
        print(f"用户名：{user_data.get('username', 'N/A')}")
        print(f"昵称：{user_data.get('nockname', 'N/A')}")
        print(f"邮箱：{user_data.get('email', 'N/A')}")
        print(f"地区：{user_data.get('region', 'N/A')}")
        print(f"省份列表数量：{len(provinces)}")
        print(f"{'='*50}\n")
        return render(request, 'user.html', context)
    
    except Exception as e:
        print(f"获取用户信息失败：{e}")
        import traceback
        traceback.print_exc()
        context = {
            'error': f'获取用户信息失败：{str(e)}',
            'current_user_id': user_id,
            'provinces': list(china_divisions.keys())
        }
        return render(request, 'user.html', context)

# ★ 社区功能相关的 API

@csrf_protect
def publish_community_record(request):
    """发布社区内容"""
    if request.method != 'POST':
        return JsonResponse({'code': 400, 'message': '请求方法错误'})
    
    try:
        data = json.loads(request.body)
        
        # 获取用户信息
        user_id = data.get('user_id', '')
        
        # 验证 user_id
        if not user_id:
            return JsonResponse({
                'code': 400,
                'message': '用户ID不能为空'
            })
        
        # ★★★ 从数据库查询用户的真实昵称和头像 ★★★
        try:
            import pymysql
            conn = pymysql.connect(
                host='localhost',
                user='root',
                password='123456',
                database='coolmusic'
            )
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            
            # 查询用户信息
            sql = "SELECT nickname, avatar FROM users WHERE user_id = %s LIMIT 1"
            cursor.execute(sql, (user_id,))
            user_info = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if user_info:
                user_nickname = user_info.get('nickname') or '炫音用户'
                user_avatar = user_info.get('avatar') or '/static/imgs/hp1.png'
                print(f"✅ 从数据库查询到用户信息: user_id={user_id}, user_nickname={user_nickname}, user_avatar={user_avatar}")
            else:
                print(f"❌ 用户不存在: {user_id}")
                return JsonResponse({
                    'code': 401,
                    'message': '用户不存在'
                })
        except Exception as e:
            print(f"⚠️ 查询用户信息出错: {e}")
            import traceback
            traceback.print_exc()
            # 降级处理：使用前端传递的值（备选方案）
            user_nickname = data.get('user_nickname', '匿名用户')
            user_avatar = data.get('user_avatar', '/static/imgs/hp1.png')
        
        # 获取内容
        content = data.get('content', '')  # 文本内容（JSON格式，含格式标记）
        images = data.get('images', [])  # 图片数组
        audios = data.get('audios', [])  # 音频数组
        location = data.get('location', '')  # 位置
        
        # 验证内容不为空
        if not content and not images and not audios:
            return JsonResponse({
                'code': 400,
                'message': '内容不能为空（至少包含文字、图片或音频之一）'
            })
        
        # 创建社区记录
        record = CommunityRecords.objects.create(
            user_id=user_id,
            user_nickname=user_nickname,
            user_avatar=user_avatar,
            content=content,
            images=json.dumps(images) if isinstance(images, list) else images,
            audios=json.dumps(audios) if isinstance(audios, list) else audios,
            location=location,
            likes=0
        )
        
        print(f"✅ 社区记录发布成功，ID: {record.id}, 用户: {user_nickname}")
        
        return JsonResponse({
            'code': 200,
            'message': '发布成功',
            'data': {
                'record_id': record.id,
                'publish_time': record.publish_time.isoformat()
            }
        })
        
    except Exception as e:
        print(f"❌ 发布社区记录失败: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'message': f'发布失败: {str(e)}'
        })

@csrf_exempt
def get_community_records(request):
    """获取社区内容列表"""
    if request.method != 'GET':
        return JsonResponse({'code': 400, 'message': '请求方法错误'})
    
    try:
        # 获取分页和排序参数
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        sort_by = request.GET.get('sort_by', 'latest')  # latest(最新) 或 hottest(最热)
        
        # 验证参数
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20
        if sort_by not in ['latest', 'hottest']:
            sort_by = 'latest'
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 查询总数
        total_count = CommunityRecords.objects.count()
        
        # 按排序方式查询
        if sort_by == 'hottest':
            # 按点赞量排序（最多的在前）
            records = CommunityRecords.objects.order_by('-likes')[offset:offset + page_size]
        else:
            # 按发布时间排序（最新的在前）
            records = CommunityRecords.objects.order_by('-publish_time')[offset:offset + page_size]
        
        # 格式化返回数据 - 简化版，只返回必要信息，不返回图片/音频内容
        records_list = []
        for record in records:
            # 不解析图片和音频，直接返回长度信息
            images_count = 0
            audios_count = 0
            
            try:
                if record.images:
                    images = json.loads(record.images) if isinstance(record.images, str) else record.images
                    images_count = len(images) if isinstance(images, list) else 0
            except:
                images_count = 0
            
            try:
                if record.audios:
                    audios = json.loads(record.audios) if isinstance(record.audios, str) else record.audios
                    audios_count = len(audios) if isinstance(audios, list) else 0
            except:
                audios_count = 0
            
            records_list.append({
                'id': record.id,
                'user_id': record.user_id,
                'user_nickname': record.user_nickname or '匿名用户',
                'user_avatar': record.user_avatar or '',
                'publish_time': record.publish_time.isoformat() if record.publish_time else '',
                'content': record.content or '',
                'images_count': images_count,  # 只返回数量，不返回完整数据
                'audios_count': audios_count,  # 只返回数量，不返回完整数据
                'location': record.location or '',
                'likes': record.likes or 0
            })
        
        # 计算总页数
        total_pages = (total_count + page_size - 1) // page_size
        
        print(f"✅ 获取社区记录成功，第 {page} 页，共 {total_pages} 页，总记录数: {total_count}")
        print(f"📊 返回数据大小: {len(str(records_list))} 字节")
        print(f"📊 返回记录数: {len(records_list)}")
        
        return JsonResponse({
            'code': 200,
            'message': '获取成功',
            'data': {
                'records': records_list,
                'pagination': {
                    'total': total_count,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': total_pages
                }
            }
        })
        
    except Exception as e:
        print(f"❌ 获取社区记录失败: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'message': f'获取失败: {str(e)}'
        })

@csrf_protect
def delete_community_record(request, record_id):
    """删除社区内容 - 管理员功能"""
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'message': '请求方法错误'})
    
    try:
        # 检查是否是管理员
        is_admin = request.COOKIES.get('is_admin', '0')
        if is_admin != '1':
            return JsonResponse({'success': False, 'message': '权限不足，只有管理员能删除'})
        
        # 删除社区内容
        community_record = CommunityRecords.objects.get(id=record_id)
        community_record.delete()
        
        print(f"✅ 删除社区记录成功: ID={record_id}")
        
        return JsonResponse({
            'success': True,
            'code': 0,
            'message': '删除成功'
        })
        
    except CommunityRecords.DoesNotExist:
        print(f"❌ 社区记录不存在: ID={record_id}")
        return JsonResponse({'success': False, 'code': 404, 'message': '社区内容不存在'})
    except Exception as e:
        print(f"❌ 删除社区记录失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'code': 500, 'message': f'删除失败: {str(e)}'})

@csrf_protect
def like_community_record(request):
    """点赞社区内容"""
    if request.method != 'POST':
        return JsonResponse({'code': 400, 'message': '请求方法错误'})
    
    try:
        data = json.loads(request.body)
        record_id = data.get('record_id')
        
        if not record_id:
            return JsonResponse({
                'code': 400,
                'message': '记录 ID 不能为空'
            })
        
        # 查找记录
        try:
            record = CommunityRecords.objects.get(id=record_id)
        except CommunityRecords.DoesNotExist:
            return JsonResponse({
                'code': 404,
                'message': '记录不存在'
            })
        
        # 更新点赞数
        record.likes += 1
        record.save()
        
        print(f"✅ 点赞成功，记录 ID: {record_id}，现在点赞数: {record.likes}")
        
        return JsonResponse({
            'code': 200,
            'message': '点赞成功',
            'data': {
                'record_id': record_id,
                'likes': record.likes
            }
        })
        
    except Exception as e:
        print(f"❌ 点赞失败: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'message': f'点赞失败: {str(e)}'
        })

# 添加地区数据常量（在文件开头附近，get_mysql_conn 函数之后）
china_divisions = {
    '北京': ['北京市'],
    '天津': ['天津市'],
    '上海': ['上海市'],
    '重庆': ['重庆市'],
    '河北': ['石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市', '保定市', '张家口市', '承德市', '沧州市', '廊坊市', '衡水市'],
    '山西': ['太原市', '大同市', '朔州市', '阳泉市', '长治市', '晋城市', '忻州市', '吕梁市', '晋中市', '临汾市', '运城市'],
    '辽宁': ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市', '阜新市', '辽阳市', '盘锦市', '铁岭市', '朝阳市', '葫芦岛市'],
    '吉林': ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市', '延边朝鲜族自治州'],
    '黑龙江': ['哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市', '大庆市', '伊春市', '佳木斯市', '七台河市', '牡丹江市', '黑河市', '绥化市', '大兴安岭地区'],
    '江苏': ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'],
    '浙江': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市', '舟山市', '台州市', '丽水市'],
    '安徽': ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市', '阜阳市', '宿州市', '六安市', '亳州市', '池州市', '宣城市'],
    '福建': ['福州市', '厦门市', '莆田市', '三明市', '泉州市', '漳州市', '南平市', '龙岩市', '宁德市'],
    '江西': ['南昌市', '景德镇市', '萍乡市', '九江市', '新余市', '鹰潭市', '赣州市', '吉安市', '宜春市', '抚州市', '上饶市'],
    '山东': ['济南市', '青岛市', '淄博市', '枣庄市', '东营市', '烟台市', '潍坊市', '济宁市', '泰安市', '威海市', '日照市', '临沂市', '德州市', '聊城市', '滨州市', '菏泽市'],
    '河南': ['郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', '新乡市', '焦作市', '濮阳市', '许昌市', '漯河市', '三门峡市', '南阳市', '商丘市', '信阳市', '周口市', '驻马店市', '济源市'],
    '湖北': ['武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市', '鄂州市', '荆门市', '孝感市', '荆州市', '黄冈市', '咸宁市', '随州市', '恩施土家族苗族自治州', '仙桃市', '潜江市', '天门市', '神农架林区'],
    '湖南': ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市', '益阳市', '郴州市', '永州市', '怀化市', '娄底市', '湘西土家族苗族自治州'],
    '广东': ['广州市', '韶关市', '深圳市', '珠海市', '汕头市', '佛山市', '江门市', '湛江市', '茂名市', '肇庆市', '惠州市', '梅州市', '汕尾市', '河源市', '阳江市', '清远市', '东莞市', '中山市', '潮州市', '揭阳市', '云浮市'],
    '广西': ['南宁市', '柳州市', '桂林市', '梧州市', '北海市', '防城港市', '钦州市', '贵港市', '玉林市', '百色市', '贺州市', '河池市', '来宾市', '崇左市'],
    '海南': ['海口市', '三亚市', '三沙市', '儋州市', '五指山市', '文昌市', '琼海市', '万宁市', '东方市'],
    '四川': ['成都市', '自贡市', '攀枝花市', '泸州市', '德阳市', '绵阳市', '广元市', '遂宁市', '内江市', '乐山市', '南充市', '眉山市', '宜宾市', '广安市', '达州市', '雅安市', '巴中市', '资阳市', '阿坝藏族羌族自治州', '甘孜藏族自治州', '凉山彝族自治州'],
    '贵州': ['贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市', '黔西南布依族苗族自治州', '黔东南苗族侗族自治州', '黔南布依族苗族自治州'],
    '云南': ['昆明市', '曲靖市', '玉溪市', '保山市', '昭通市', '丽江市', '普洱市', '临沧市', '楚雄彝族自治州', '红河哈尼族彝族自治州', '文山壮族苗族自治州', '西双版纳傣族自治州', '大理白族自治州', '德宏傣族景颇族自治州', '怒江傈僳族自治州', '迪庆藏族自治州'],
    '西藏': ['拉萨市', '日喀则市', '昌都市', '林芝市', '山南市', '那曲市', '阿里地区'],
    '陕西': ['西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市', '商洛市'],
    '甘肃': ['兰州市', '嘉峪关市', '金昌市', '白银市', '天水市', '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市', '定西市', '陇南市', '临夏回族自治州', '甘南藏族自治州'],
    '青海': ['西宁市', '海东市', '海北藏族自治州', '黄南藏族自治州', '海南藏族自治州', '果洛藏族自治州', '玉树藏族自治州', '海西蒙古族藏族自治州'],
    '宁夏': ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
    '新疆': ['乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市', '昌吉回族自治州', '博尔塔拉蒙古自治州', '巴音郭楞蒙古自治州', '阿克苏地区', '克孜勒苏柯尔克孜自治州', '喀什地区', '和田地区', '伊犁哈萨克自治州', '塔城地区', '阿勒泰地区', '石河子市', '阿拉尔市', '图木舒克市', '五家渠市', '北屯市', '铁门关市', '双河市', '可克达拉市', '昆玉市'],
    '内蒙古': ['呼和浩特市', '包头市', '乌海市', '赤峰市', '通辽市', '鄂尔多斯市', '呼伦贝尔市', '巴彦淖尔市', '乌兰察布市', '兴安盟', '锡林郭勒盟', '阿拉善盟'],
    '台湾': ['台北市', '新北市', '桃园市', '台中市', '台南市', '高雄市', '基隆市', '新竹市', '嘉义市'],
    '香港': ['香港特别行政区'],
    '澳门': ['澳门特别行政区'],
    '海外': ['海外']
}



@csrf_protect
def save_nickname(request):
    """保存昵称"""
    if request.method == 'POST':
        data = json.loads(request.body)
        nickname = data.get('nickname', '')
        
        if not nickname:
            return JsonResponse({'success': False, 'message': '昵称不能为空'})
        
        user_id = request.COOKIES.get('user_id')
        if not user_id:
            return JsonResponse({'success': False, 'message': '未登录'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                UPDATE users 
                SET nickname = %s 
                WHERE user_id = %s
            """, (nickname, user_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return JsonResponse({'success': True, 'message': '保存成功'})
        
        except Exception as e:
            cursor.close()
            conn.close()
            return JsonResponse({'success': False, 'message': f'保存失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

@csrf_protect
def update_password(request):
    """用户中心更新密码"""
    if request.method == 'POST':
        try:
            # 尝试解析 JSON 数据
            import json
            data = json.loads(request.body)
            password = data.get('password', '')
            
            if not password:
                return JsonResponse({'success': False, 'message': '密码不能为空'})
            
            user_id = request.COOKIES.get('user_id')
            if not user_id:
                return JsonResponse({'success': False, 'message': '未登录'})
            
            conn = get_mysql_conn()
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    UPDATE users 
                    SET password = %s 
                    WHERE user_id = %s
                """, (password, user_id))
                
                conn.commit()
                cursor.close()
                conn.close()
                
                return JsonResponse({'success': True, 'message': '更新成功'})
            
            except Exception as e:
                cursor.close()
                conn.close()
                return JsonResponse({'success': False, 'message': f'更新失败：{str(e)}'})
        
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'解析失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})


@csrf_protect
def save_profile(request):
    """保存用户资料"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            nickname = data.get('nickname', '')
            gender = data.get('gender', '')
            birthday = data.get('birthday', None)
            region = data.get('region', '')
            introduce = data.get('introduce', '')
            
            user_id = request.COOKIES.get('user_id')
            if not user_id:
                return JsonResponse({'success': False, 'message': '未登录'})
            
            conn = get_mysql_conn()
            cursor = conn.cursor()
            
            try:
                # 如果 gender 是空字符串，设置为 NULL
                if gender == '':
                    gender = None
                
                # 如果 birthday 是空字符串，设置为 NULL
                if birthday == '' or birthday is None:
                    birthday = None
                
                print(f"准备保存数据：nickname={nickname}, gender={gender}, birthday={birthday}, region={region}, introduce={introduce}")
                
                cursor.execute("""
                    UPDATE users 
                    SET nickname = %s, gender = %s, birthday = %s, 
                        region = %s, introduce = %s
                    WHERE user_id = %s
                """, (nickname, gender, birthday, region, introduce, user_id))
                
                conn.commit()
                cursor.close()
                conn.close()
                
                print("保存成功")
                return JsonResponse({'success': True, 'message': '保存成功'})
            
            except Exception as e:
                print(f"保存失败：{e}")
                import traceback
                traceback.print_exc()
                cursor.close()
                conn.close()
                return JsonResponse({'success': False, 'message': f'保存失败：{str(e)}'})
        
        except Exception as e:
            print(f"解析失败：{e}")
            return JsonResponse({'success': False, 'message': f'解析失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

@csrf_protect
def upload_avatar(request):
    """上传头像（直接保存 Base64 到数据库）"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            avatar_base64 = data.get('avatar_base64', '')
            
            if not avatar_base64:
                return JsonResponse({'success': False, 'message': '没有文件数据'})
            
            # 检查数据大小
            data_size = len(avatar_base64)
            print(f"头像数据大小：{data_size} bytes")
            
            user_id = request.COOKIES.get('user_id')
            if not user_id:
                return JsonResponse({'success': False, 'message': '未登录'})
            
            # 从 Base64 解码图片（验证格式）
            import base64
            
            # 移除 data:image/png;base64, 前缀
            if ',' in avatar_base64:
                avatar_base64 = avatar_base64.split(',')[1]
            
            # 验证 Base64 格式
            try:
                base64.b64decode(avatar_base64)
            except Exception as e:
                return JsonResponse({'success': False, 'message': '图片格式错误'})
            
            # 生成系统永久链接（固定格式）
            avatar_url = f'http://127.0.0.1:8000/avatar/{user_id}/'
            
            conn = get_mysql_conn()
            cursor = conn.cursor()
            
            try:
                # 将完整的 Base64 数据保存到数据库的 avatar 字段
                # 注意：这里保存的是带前缀的完整 Base64 字符串
                full_avatar_base64 = f'data:image/png;base64,{avatar_base64}'
                
                cursor.execute("""
                    UPDATE users 
                    SET avatar = %s 
                    WHERE user_id = %s
                """, (full_avatar_base64, user_id))
                
                conn.commit()
                cursor.close()
                conn.close()
                
                # 创建响应并更新 Cookie 中的头像
                response = JsonResponse({
                    'success': True, 
                    'message': '上传成功',
                    'avatar_url': avatar_url,
                    'new_avatar_url': avatar_url
                })
                
                # 设置 Cookie，增加过期时间
                response.set_cookie('user_avatar', avatar_url, max_age=30*24*60*60)
                
                # 添加 Cache-Control 头
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
                
                return response
            
            except Exception as e:
                print(f"数据库错误：{e}")
                cursor.close()
                conn.close()
                return JsonResponse({'success': False, 'message': f'保存失败：{str(e)}'})
        
        except Exception as e:
            print(f"解析异常：{e}")
            return JsonResponse({'success': False, 'message': f'解析失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})


@csrf_protect
def delete_account(request):
    """注销账户"""
    if request.method == 'POST':
        user_id = request.COOKIES.get('user_id')
        if not user_id:
            return JsonResponse({'success': False, 'message': '未登录'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        try:
            # 删除用户的喜欢音乐表
            cursor.execute("SELECT username FROM users WHERE user_id = %s", (user_id,))
            user = cursor.fetchone()
            if user:
                table_name = f"`{user_id}_like_musics`"
                cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
            
            # 删除用户记录
            cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            response = JsonResponse({'success': True, 'message': '账户已注销'})
            response.delete_cookie('user_id')
            response.delete_cookie('username')
            response.delete_cookie('email')
            response.delete_cookie('is_creator')
            response.delete_cookie('login_token')
            response.delete_cookie('is_logged_in')
            
            return response
        
        except Exception as e:
            cursor.close()
            conn.close()
            return JsonResponse({'success': False, 'message': f'注销失败：{str(e)}'})
    
    return JsonResponse({'success': False, 'message': '请求方法错误'})

def get_user_avatar(request, user_id):
    """获取用户头像（从数据库读取 Base64 并返回）"""
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        # 查询用户的头像数据
        cursor.execute("SELECT avatar FROM users WHERE user_id = %s", (user_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result and result[0]:
            avatar_base64 = result[0]
            
            # 如果是完整的 Base64 字符串（包含前缀）
            if avatar_base64.startswith('data:image'):
                # 分离前缀和数据
                header, data = avatar_base64.split(',', 1)
                
                # 解码 Base64 数据
                import base64
                image_data = base64.b64decode(data)
                
                # 判断图片类型
                if 'png' in header:
                    content_type = 'image/png'
                elif 'jpeg' in header or 'jpg' in header:
                    content_type = 'image/jpeg'
                else:
                    content_type = 'image/png'
                
                # 返回图片
                return HttpResponse(image_data, content_type=content_type)
            else:
                # 如果是旧格式的 URL，重定向
                return HttpResponse(status=404)
        else:
            # 没有头像，返回默认图片
            return HttpResponse(status=404)
    
    except Exception as e:
        print(f"获取头像失败：{e}")
        return HttpResponse(status=404)


@csrf_exempt
def toggle_like(request):
    """切换喜爱状态 - 使用用户喜爱表中的is_liked字段"""
    try:
        if request.method != 'POST':
            return JsonResponse({'success': False, 'msg': '请求方法错误'}, status=405)
        
        data = json.loads(request.body)
        music_id = data.get('music_id', '').strip()
        
        if not music_id:
            return JsonResponse({'success': False, 'msg': '缺少 music_id 参数'}, status=400)
        
        # 获取用户 ID
        user_id = request.COOKIES.get('user_id')
        if not user_id:
            return JsonResponse({'success': False, 'msg': '请先登录'}, status=401)
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 第1步：验证歌曲是否存在
        cursor.execute("SELECT music_id, music_name FROM music_info WHERE music_id = %s", (music_id,))
        music_info = cursor.fetchone()
        
        rank_tables = ['soaring_rank', 'newsong_rank', 'hotsong_rank', 'chinese_rank', 'america_rank', 'korea_rank', 'japan_rank']
        
        if not music_info:
            # 从排行榜表查询
            for table in rank_tables:
                cursor.execute(f"SELECT music_id, music_name FROM {table} WHERE music_id = %s", (music_id,))
                result = cursor.fetchone()
                if result:
                    music_info = result
                    break
        
        if not music_info:
            conn.close()
            return JsonResponse({'success': False, 'msg': '音乐不存在'}, status=404)
        
        # 第2步：创建或获取用户喜爱表
        table_name = f"`{user_id}_like_musics`"
        raw_table_name = f"{user_id}_like_musics"
        
        # 检查表是否存在
        cursor.execute(
            "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = %s",
            [raw_table_name]
        )
        table_exists = cursor.fetchone()['cnt'] > 0
        
        if not table_exists:
            # 创建表
            cursor.execute(f"""
                CREATE TABLE {table_name} (
                    `music_id` VARCHAR(50) NOT NULL PRIMARY KEY,
                    `music_name` VARCHAR(200) NOT NULL,
                    `is_liked` TINYINT DEFAULT 0,
                    `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            conn.commit()
        
        # 第3步：查询当前喜爱状态
        cursor.execute(f"SELECT is_liked FROM {table_name} WHERE music_id = %s", [str(music_id)])
        result = cursor.fetchone()
        
        if result:
            # 已有记录，切换状态
            current_is_liked = result['is_liked']
            new_is_liked = 1 - current_is_liked
        else:
            # 新记录，设置为已喜爱
            cursor.execute(
                f"INSERT INTO {table_name} (music_id, music_name, is_liked) VALUES (%s, %s, %s)",
                [str(music_id), music_info['music_name'], 1]
            )
            new_is_liked = 1
            conn.commit()
            
            # 第4步：增加 like_count（仅在首次喜爱时）
            # 更新 music_info 表
            cursor.execute(
                "UPDATE music_info SET like_count = like_count + 1 WHERE music_id = %s",
                [str(music_id)]
            )
            
            # 更新排行榜表
            for table in rank_tables:
                cursor.execute(
                    f"UPDATE {table} SET like_count = like_count + 1 WHERE music_id = %s",
                    [str(music_id)]
                )
            
            conn.commit()
            conn.close()
            
            return JsonResponse({
                'success': True,
                'is_liked': new_is_liked,
                'msg': '✓ 已添加到喜爱'
            })
        
        # 如果已有记录，更新状态
        cursor.execute(
            f"UPDATE {table_name} SET is_liked = %s WHERE music_id = %s",
            [new_is_liked, str(music_id)]
        )
        
        # 如果从 0→1（新喜爱），增加计数
        if new_is_liked == 1 and current_is_liked == 0:
            # 更新 music_info 表
            cursor.execute(
                "UPDATE music_info SET like_count = like_count + 1 WHERE music_id = %s",
                [str(music_id)]
            )
            
            # 更新排行榜表
            for table in rank_tables:
                cursor.execute(
                    f"UPDATE {table} SET like_count = like_count + 1 WHERE music_id = %s",
                    [str(music_id)]
                )
        
        conn.commit()
        conn.close()
        
        return JsonResponse({
            'success': True,
            'is_liked': new_is_liked,
            'msg': '✓ 已添加到喜爱' if new_is_liked == 1 else '✗ 已取消喜爱'
        })
        
    except Exception as e:
        print(f"切换喜爱出错: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'msg': str(e)}, status=500)


def check_like_status(request):
    """检查音乐是否被喜爱"""
    try:
        print(f"\n{'='*60}")
        print(f"=== 检查喜爱状态请求 ===")
        print(f"request.method: {request.method}")
        print(f"request.path: {request.path}")
        print(f"request.body: {request.body}")
        print(f"{'='*60}")
        
        if request.method != 'POST':
            return JsonResponse({'success': False, 'msg': '请求方法错误'}, status=405)
        
        # 解析 JSON 数据
        try:
            data = json.loads(request.body)
            music_id = data.get('music_id')
            rank_type = data.get('rank_type')  # 新增：获取 rank_type
            print(f"music_id: {music_id}")
            print(f"rank_type: {rank_type}")
        except Exception as e:
            print(f"解析 JSON 失败：{e}")
            return JsonResponse({'success': False, 'msg': 'JSON 解析失败'}, status=400)
        
        if not music_id:
            return JsonResponse({'success': False, 'msg': '缺少 music_id 参数'}, status=400)
        
        # 获取用户 ID
        user_id = request.COOKIES.get('user_id')
        print(f"user_id: {user_id}")
        
        if not user_id:
            return JsonResponse({'success': False, 'msg': '请先登录'}, status=401)
        
        table_name = f"`{user_id}_like_musics`"
        
        # 查询音乐信息（优先从排行榜表查询，回退到 music_info 表）
        music_info = None
        
        if rank_type:
            # 从排行榜表查询
            rank_table_map = {
                'soaring': 'soaring_rank',
                'newsong': 'newsong_rank',
                'hotsong': 'hotsong_rank',
                'chinese': 'chinese_rank',
                'europe': 'america_rank',
                'korean': 'korea_rank',
                'japanese': 'japan_rank'
            }
            
            rank_table_name = rank_table_map.get(rank_type)
            
            if rank_table_name:
                conn = get_mysql_conn()
                cursor = conn.cursor(pymysql.cursors.DictCursor)
                try:
                    cursor.execute(f"""
                        SELECT music_id, music_name, author, album_cover 
                        FROM {rank_table_name} 
                        WHERE music_id = %s
                    """, (music_id,))
                    result = cursor.fetchone()
                    
                    if result:
                        print(f"✓ 从排行榜表 {rank_table_name} 查询成功")
                        music_info = type('TempMusicInfo', (), {
                            'music_id': result['music_id'],
                            'music_name': result['music_name'],
                            'author': result['author'],
                            'album_cover': result.get('album_cover', '')
                        })()
                    else:
                        print(f"✗ 排行榜表中未找到记录，回退到 music_info 表")
                except Exception as e:
                    print(f"从排行榜表查询失败：{e}")
                finally:
                    cursor.close()
                    conn.close()
        
        # 如果排行榜表查询失败，从 music_info 表查询
        if not music_info:
            try:
                music_info = MusicInfo.objects.get(music_id=music_id)
                print(f"✓ 从 music_info 表查询成功")
            except MusicInfo.DoesNotExist:
                print(f"错误：数据库中未找到 music_id={music_id}")
                return JsonResponse({'success': False, 'msg': '音乐不存在'}, status=404)
        
        # 处理用户播放列表
        with connection.cursor() as cursor:
            try:
                # 检查并创建表
                cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = %s", [f"{user_id}_like_musics"])
                if cursor.fetchone()[0] == 0:
                    cursor.execute(f"""
                        CREATE TABLE {table_name} (
                            `music_id` VARCHAR(50) NOT NULL PRIMARY KEY,
                            `music_name` VARCHAR(200) NOT NULL,
                            `click_count` INT DEFAULT 0,
                            `is_liked` TINYINT DEFAULT 0,
                            `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """)
                    connection.commit()
                    print(f"表 {table_name} 创建成功")
                
                # 检查记录是否存在
                cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE music_id = %s", [str(music_id)])
                count = cursor.fetchone()[0]
                
                if count > 0:
                    # 已存在，更新播放次数
                    cursor.execute(f"UPDATE {table_name} SET click_count = click_count + 1 WHERE music_id = %s", [str(music_id)])
                    print(f"更新已有记录的播放次数")
                else:
                    # 不存在，插入新记录
                    from django.utils import timezone
                    cursor.execute(f"""
                        INSERT INTO {table_name} (music_id, music_name, click_count, is_liked, create_time)
                        VALUES (%s, %s, %s, %s, %s)
                    """, [str(music_id), music_info.music_name, 1, 0, timezone.now()])
                    print(f"插入新记录到播放列表")
                
                connection.commit()
                
                return JsonResponse({
                    'success': True,
                    'msg': '已添加到播放列表',
                    'music_name': music_info.music_name,
                    'author': music_info.author
                })
                
            except Exception as e:
                print(f"添加到播放列表异常：{e}")
                import traceback
                traceback.print_exc()
                connection.rollback()
                return JsonResponse({'success': False, 'msg': str(e)}, status=500)
                
    except Exception as e:
        print(f"添加到播放列表异常：{e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'msg': str(e)}, status=500)


@csrf_exempt
def add_to_playlist(request):
    """
    添加到播放列表 - 支持多表搜索
    搜索策略：
    1. 优先在指定的排行榜表查询
    2. 若未找到，搜索其他排行榜表
    3. 最后尝试music_info表
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'msg': '请求方法错误'}, status=405)
    
    try:
        # 解析 JSON 数据
        data = json.loads(request.body)
        music_id = data.get('music_id', '').strip()
        rank_type = data.get('rank_type', 'hotsong')  # 默认热歌榜
        
        print(f"\n📋 添加到播放列表：music_id={music_id}, rank_type={rank_type}")
        
        if not music_id:
            return JsonResponse({'success': False, 'msg': '缺少 music_id 参数'}, status=400)
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        music_info = None
        play_url = None
        found_in_table = None
        
        # 定义榜单表映射
        rank_table_map = {
            'soaring': 'soaring_rank',
            'newsong': 'newsong_rank',
            'hotsong': 'hotsong_rank',
            'chinese': 'chinese_rank',
            'europe': 'america_rank',
            'korean': 'korea_rank',
            'japanese': 'japan_rank'
        }
        
        # 构建搜索表顺序（优先指定表）
        all_rank_tables = list(rank_table_map.values())
        search_tables = []
        
        if rank_type in rank_table_map:
            target_table = rank_table_map[rank_type]
            search_tables.append(target_table)
            # 添加其他表
            for table in all_rank_tables:
                if table != target_table:
                    search_tables.append(table)
        else:
            search_tables = all_rank_tables
        
        print(f"搜索表顺序：{search_tables}")
        
        # 多表搜索
        for table_name in search_tables:
            try:
                cursor.execute(f"""
                    SELECT music_id, music_name, album_cover, author, author_id, 
                           album, country, real_url, play_url, lyrics
                    FROM {table_name}
                    WHERE music_id = %s
                """, (music_id,))
                
                music_info = cursor.fetchone()
                
                if music_info:
                    found_in_table = table_name
                    print(f"✓ 从 {table_name} 表查询到音乐")
                    # 获取播放链接（优先级：real_url > play_url）
                    play_url = music_info.get('real_url') or music_info.get('play_url')
                    break
                else:
                    print(f"✗ 在 {table_name} 中未找到")
                    
            except Exception as e:
                print(f"⚠️ 查询 {table_name} 失败：{e}")
                continue
        
        # 如果排行榜表中都没找到，从 music_info 表查询
        if not music_info:
            print(f"排行榜表中未找到，尝试 music_info 表...")
            
            try:
                cursor.execute("""
                    SELECT music_id, music_name, album_cover, author, 
                           album, real_url, play_url
                    FROM music_info
                    WHERE music_id = %s
                """, (music_id,))
                
                music_info = cursor.fetchone()
                
                if music_info:
                    found_in_table = 'music_info'
                    print(f"✓ 从 music_info 表查询到音乐")
                    play_url = music_info.get('real_url') or music_info.get('play_url')
                else:
                    print(f"✗ 在 music_info 中也未找到")
                    
            except Exception as e:
                print(f"⚠️ 查询 music_info 表失败：{e}")
        
        conn.close()
        
        if not music_info:
            print(f"✗ 在所有表中都找不到音乐 {music_id}")
            return JsonResponse({'success': False, 'msg': '未找到该歌曲'}, status=404)
        
        print(f"✓ 从 {found_in_table} 表找到，准备获取播放链接")
        
        # 如果没有本地链接，调用爬虫获取
        if not play_url:
            print(f"本地没有播放链接，调用爬虫获取...")
            play_url = get_netease_url(str(music_id))
        
        if not play_url:
            print(f"✗ 无法获取播放链接")
            return JsonResponse({'success': False, 'msg': '无法获取播放链接'}, status=500)
        
        print(f"✓ 成功获取播放链接")
        
        # 返回歌曲完整信息，包括播放链接
        return JsonResponse({
            'success': True,
            'data': {
                'music_id': music_info.get('music_id'),
                'music_name': music_info.get('music_name'),
                'author': music_info.get('author', ''),
                'author_id': music_info.get('author_id', ''),
                'album': music_info.get('album', ''),
                'album_cover': music_info.get('album_cover', ''),
                'play_url': play_url,  # ★直接返回播放链接
                'rank_type': rank_type  # ★标记榜单类型
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'msg': 'JSON 格式错误'}, status=400)
    except Exception as e:
        print(f"添加到播放列表出错: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'msg': str(e)}, status=500)


def check_like_status(request):
    """检查音乐是否被喜爱"""
    try:
        print(f"\n{'='*60}")
        print(f"=== 检查喜爱状态请求 ===")
        print(f"request.method: {request.method}")
        print(f"request.path: {request.path}")
        print(f"request.body: {request.body}")
        print(f"{'='*60}")
        
        if request.method != 'POST':
            return JsonResponse({'success': False, 'msg': '请求方法错误'}, status=405)
        
        # 解析 JSON 数据
        try:
            data = json.loads(request.body)
            music_id = data.get('music_id')
            print(f"music_id: {music_id}")
        except Exception as e:
            print(f"解析 JSON 失败：{e}")
            return JsonResponse({'success': False, 'msg': 'JSON 解析失败'}, status=400)
        
        if not music_id:
            return JsonResponse({'success': False, 'msg': '缺少 music_id 参数'}, status=400)
        
        # 获取用户 ID
        user_id = request.COOKIES.get('user_id')
        print(f"user_id: {user_id}")
        
        if not user_id:
            return JsonResponse({'success': False, 'msg': '请先登录'}, status=401)
        
        table_name = f"{user_id}_like_musics"
        
        with connection.cursor() as cursor:
            # 检查是否存在
            cursor.execute(f"SELECT is_liked FROM {table_name} WHERE music_id = %s", [str(music_id)])
            result = cursor.fetchone()
            
            if result:
                # 记录当前状态
                current_state = result[0]
                print(f"当前状态：is_liked={current_state}")
                
                # 切换喜爱状态：1→0 或 0→1
                new_state = 0 if current_state == 1 else 1
                print(f"新状态：is_liked={new_state}")
                
                # 更新喜爱状态
                cursor.execute(f"UPDATE {table_name} SET is_liked = %s WHERE music_id = %s", [new_state, str(music_id)])
                
                # ★关键逻辑★：只有从未喜爱变为喜爱时（0→1），才增加 like_count
                if new_state == 1 and current_state == 0:
                    try:
                        music_info = MusicInfo.objects.get(music_id=music_id)
                        music_info.like_count += 1
                        music_info.save()
                        print(f"✓ like_count 已增加 1，当前值：{music_info.like_count}")
                    except Exception as e:
                        print(f"更新 like_count 失败：{e}")
                        connection.rollback()
                        return JsonResponse({'success': False, 'msg': '更新喜爱计数失败'}, status=500)
                else:
                    print(f"取消喜爱，like_count 不变")
                
                connection.commit()
                
                response_data = {
                    'success': True,
                    'is_liked': new_state,
                    'msg': '已喜爱' if new_state == 1 else '已取消喜爱'
                }
                
                print(f"返回数据：{response_data}")
                
                return JsonResponse(response_data)
            else:
                # 如果音乐不在喜欢列表中，先查询音乐信息再插入记录（is_liked=1）
                try:
                    music_info = MusicInfo.objects.get(music_id=music_id)
                    
                    cursor.execute(f"""
                        INSERT INTO {table_name} (music_id, music_name, click_count, is_liked, create_time)
                        VALUES (%s, %s, %s, %s, %s)
                    """, [str(music_id), music_info.music_name, 0, 1, timezone.now()])
                    
                    # ★关键逻辑★：首次喜爱，增加 like_count
                    music_info.like_count += 1
                    music_info.save()
                    
                    connection.commit()
                    
                    print(f"插入新记录，is_liked=1, like_count+1")
                    
                    return JsonResponse({
                        'success': True,
                        'is_liked': 1,
                        'msg': '已喜爱'
                    })
                except MusicInfo.DoesNotExist:
                    print(f"音乐不存在：{music_id}")
                    return JsonResponse({'success': False, 'msg': '音乐不存在'}, status=404)
                    
    except Exception as e:
        print(f"切换喜爱状态异常：{e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'msg': str(e)}, status=500)


def check_like_status(request):
    """检查音乐的喜爱状态"""
    if request.method == 'GET':
        music_id = request.GET.get('music_id')
        
        try:
            # 获取用户 ID
            user_id = request.session.get('user_id') or request.COOKIES.get('user_id')
            
            if not user_id:
                return JsonResponse({'success': False, 'is_liked': 0})
            
            table_name = f"{user_id}_like_musics"
            
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT is_liked FROM {table_name} WHERE music_id = %s", [str(music_id)])
                result = cursor.fetchone()
                
                if result:
                    return JsonResponse({
                        'success': True,
                        'is_liked': result[0]
                    })
                else:
                    return JsonResponse({
                        'success': True,
                        'is_liked': 0
                    })
                    
        except Exception as e:
            return JsonResponse({'success': False, 'is_liked': 0, 'msg': str(e)})
    
    return JsonResponse({'success': False, 'is_liked': 0, 'msg': '请求方法错误'})
@csrf_exempt
def api_comment(request):
    """
    排行榜评论：
    POST   - 新增
    GET    - 列表（排序、分页）
    DELETE - 删除（仅本人）
    """
    # 通用映射
    table_name_map = {
        'soaring': 'soaring_rank_coments',
        'newsong': 'newsong_rank_coments',
        'hotsong': 'hotsong_rank_coments',
        'chinese': 'chinese_rank_coments',
        'europe': 'america_rank_coments',
        'korean': 'korea_rank_coments',
        'japanese': 'japan_rank_coments'
    }

    def get_table(rank_type):
        return table_name_map.get(rank_type)

    try:
        if request.method == 'POST':
            try:
                data = json.loads(request.body.decode('utf-8'))
            except Exception:
                return JsonResponse({'success': False, 'msg': '无效 JSON'}, status=400)

            required_fields = ['user_id', 'username', 'comment_content', 'rank_type']
            for f in required_fields:
                if not data.get(f):
                    return JsonResponse({'success': False, 'msg': f'缺少 {f} 参数'}, status=400)

            user_id = str(data['user_id']).strip()
            username = str(data['username']).strip()
            avatar_url = str(data.get('avatar_url', '')).strip()
            comment_content = str(data['comment_content']).strip()
            rank_type = str(data['rank_type']).strip()

            # 如果缺少 avatar_url，根据 user_id 从 users 表读取
            if not avatar_url:
                try:
                    conn_temp = get_mysql_conn()
                    cursor_temp = conn_temp.cursor()
                    cursor_temp.execute("SELECT user_avatar FROM users WHERE user_id=%s LIMIT 1", (user_id,))
                    result = cursor_temp.fetchone()
                    if result and result[0]:
                        avatar_url = result[0]
                    else:
                        # 默认头像格式
                        avatar_url = f'http://127.0.0.1:8000/avatar/{user_id}/'
                    cursor_temp.close()
                    conn_temp.close()
                except Exception as ex:
                    print(f'⚠ 查询用户头像失败: {ex}')
                    avatar_url = f'http://127.0.0.1:8000/avatar/{user_id}/'

            if not (1 <= len(comment_content) <= 500):
                return JsonResponse({'success': False, 'msg': '评论长度 1-500'}, status=400)
            if len(username) > 50:
                return JsonResponse({'success': False, 'msg': '用户名长度不能超过50'}, status=400)

            # optional XSS 过滤
            from html import escape
            comment_content = escape(comment_content)
            username = escape(username)

            table_name = get_table(rank_type)
            if not table_name:
                return JsonResponse({'success': False, 'msg': '无效的排行榜类型'}, status=400)

            conn = get_mysql_conn()
            cursor = conn.cursor()
            try:
                # 可选：用户是否存在（可放行，不阻断）
                cursor.execute("SELECT COUNT(*) FROM users WHERE user_id=%s", (user_id,))
                user_exists = cursor.fetchone()[0] > 0
                if not user_exists:
                    # 兼容老数据 / cookie 可能有问题
                    print(f"⚠ 用户 {user_id} 不存在")

                # 重复提交保护 3 秒
                cursor.execute(f"""
                    SELECT COUNT(*) FROM {table_name}
                    WHERE user_id=%s AND comment_content=%s AND comment_time > DATE_SUB(NOW(), INTERVAL 3 SECOND)
                """, (user_id, comment_content))
                if cursor.fetchone()[0] > 0:
                    return JsonResponse({'success': False, 'msg': '请勿重复提交评论'}, status=400)

                now = datetime.now()
                cursor.execute(f"""
                    INSERT INTO {table_name}
                    (user_id, username, avatar_url, comment_content, comment_time, like_count)
                    VALUES (%s,%s,%s,%s,%s,%s)
                """, (user_id, username, avatar_url, comment_content, now, 0))

                conn.commit()
                comment_id = cursor.lastrowid

                cache.delete(f'{rank_type}_rank_comments')
                return JsonResponse({
                    'success': True,
                    'msg': '评论发表成功',
                    'comment': {
                        'id': comment_id,
                        'user_id': user_id,
                        'username': username,
                        'avatar_url': avatar_url,
                        'comment_content': comment_content,
                        'comment_time': now.strftime('%Y-%m-%d %H:%M:%S'),
                        'like_count': 0,
                    }
                })

            except Exception as ex:
                conn.rollback()
                return JsonResponse({'success': False, 'msg': f'数据库写入失败: {ex}'}, status=500)
            finally:
                cursor.close(); conn.close()

        elif request.method == 'GET':
            rank_type = request.GET.get('rank_type')
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 50))
            sort_by = request.GET.get('sort_by', 'time')
            if not rank_type:
                return JsonResponse({'success': False, 'msg': '缺少 rank_type'}, status=400)

            table_name = get_table(rank_type)
            if not table_name:
                return JsonResponse({'success': False, 'msg': '无效榜单类型'}, status=400)

            if page < 1: page = 1
            if page_size < 1 or page_size > 100: page_size = 50

            cache_key = f'comment_list:{rank_type}:{page}:{page_size}:{sort_by}'
            cached = cache.get(cache_key)
            if cached:
                return JsonResponse(cached)

            conn = get_mysql_conn()
            cursor = conn.cursor(pymysql.cursors.DictCursor)
            try:
                cursor.execute(f"SELECT COUNT(*) as total FROM {table_name}")
                total = cursor.fetchone()['total'] or 0
                offset = (page - 1) * page_size
                order = "ORDER BY like_count DESC, comment_time DESC" if sort_by == 'likes' else "ORDER BY comment_time DESC"

                cursor.execute(f"""
                    SELECT id,user_id,username,avatar_url,comment_content,comment_time,like_count
                    FROM {table_name} {order}
                    LIMIT %s OFFSET %s
                """, (page_size, offset))
                rows = cursor.fetchall()
                for r in rows:
                    if isinstance(r.get('comment_time'), datetime):
                        r['comment_time'] = r['comment_time'].strftime('%Y-%m-%d %H:%M:%S')

                res = {
                    'success': True,
                    'comments': rows,
                    'total_count': total,
                    'total_pages': max(1, (total + page_size - 1) // page_size),
                    'current_page': page,
                    'page_size': page_size,
                    'sort_by': sort_by
                }
                cache.set(cache_key, res, 600)
                return JsonResponse(res)

            except Exception as ex:
                return JsonResponse({'success': False, 'msg': f'查询失败: {ex}'}, status=500)
            finally:
                cursor.close(); conn.close()

        elif request.method == 'DELETE':
            try:
                data = json.loads(request.body.decode('utf-8'))
            except Exception:
                return JsonResponse({'success': False, 'msg': '无效 JSON'}, status=400)

            for f in ['comment_id', 'user_id', 'rank_type']:
                if not data.get(f):
                    return JsonResponse({'success': False, 'msg': f'缺少 {f}'}, status=400)

            table_name = get_table(data['rank_type'])
            if not table_name:
                return JsonResponse({'success': False, 'msg': '无效榜单类型'}, status=400)

            conn = get_mysql_conn()
            cursor = conn.cursor()
            try:
                cursor.execute(f"SELECT user_id FROM {table_name} WHERE id=%s", (data['comment_id'],))
                row = cursor.fetchone()
                if not row:
                    return JsonResponse({'success': False, 'msg': '评论不存在'}, status=404)
                if str(row[0]) != str(data['user_id']):
                    return JsonResponse({'success': False, 'msg': '无权限'} , status=403)
                cursor.execute(f"DELETE FROM {table_name} WHERE id=%s", (data['comment_id'],))
                conn.commit()
                cache.delete(f"{data['rank_type']}_rank_comments")
                return JsonResponse({'success': True, 'msg': '删除成功'})
            except Exception as ex:
                conn.rollback()
                return JsonResponse({'success': False, 'msg': f'删除失败: {ex}'}, status=500)
            finally:
                cursor.close(); conn.close()

        else:
            return JsonResponse({'success': False, 'msg': '不支持的请求方法'}, status=405)

    except Exception as e:
        return JsonResponse({'success': False, 'msg': f'内部错误：{e}'}, status=500)


@csrf_exempt
def api_comment_like(request, comment_id):
    """评论点赞 / 取消点赞"""
    table_name_map = {
        'soaring': 'soaring_rank_coments',
        'newsong': 'newsong_rank_coments',
        'hotsong': 'hotsong_rank_coments',
        'chinese': 'chinese_rank_coments',
        'europe': 'america_rank_coments',
        'korean': 'korea_rank_coments',
        'japanese': 'japan_rank_coments'
    }

    rank_type = request.GET.get('rank_type') or request.POST.get('rank_type')
    if not rank_type:
        return JsonResponse({'success': False, 'msg': '缺少 rank_type'}, status=400)

    table_name = table_name_map.get(rank_type)
    if not table_name:
        return JsonResponse({'success': False, 'msg': '无效排行榜类型'}, status=400)

    if request.method not in ['POST', 'DELETE']:
        return JsonResponse({'success': False, 'msg': '仅支持 POST/DELETE 方法'}, status=405)

    conn = get_mysql_conn()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT like_count FROM {table_name} WHERE id=%s", (comment_id,))
        row = cursor.fetchone()
        if not row:
            return JsonResponse({'success': False, 'msg': '评论不存在'}, status=404)

        like_count = int(row[0]) if row[0] is not None else 0

        if request.method == 'POST':
            like_count += 1
            cursor.execute(f"UPDATE {table_name} SET like_count=%s WHERE id=%s", (like_count, comment_id))
            conn.commit()
            cache.delete(f'{rank_type}_rank_comments')
            return JsonResponse({'success': True, 'msg': '点赞成功', 'like_count': like_count})

        if request.method == 'DELETE':
            like_count = max(0, like_count - 1)
            cursor.execute(f"UPDATE {table_name} SET like_count=%s WHERE id=%s", (like_count, comment_id))
            conn.commit()
            cache.delete(f'{rank_type}_rank_comments')
            return JsonResponse({'success': True, 'msg': '取消点赞成功', 'like_count': like_count})

    except Exception as e:
        conn.rollback()
        return JsonResponse({'success': False, 'msg': f'操作失败: {e}'}, status=500)
    finally:
        cursor.close(); conn.close()


# ★用户管理API★
def api_get_users_list(request):
    """获取用户列表"""
    is_creator = int(request.GET.get('is_creator', 0))
    page = int(request.GET.get('page', 1))
    
    conn = get_mysql_conn()
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    cursor.execute("SELECT COUNT(*) as total FROM users WHERE is_creator=%s", [is_creator])
    total = cursor.fetchone()['total']
    
    offset = (page - 1) * 15
    cursor.execute("""
        SELECT user_id, username, nickname, avatar, gender, email, birthday, region, password, create_time FROM users 
        WHERE is_creator=%s ORDER BY create_time DESC LIMIT 15 OFFSET %s
    """, [is_creator, offset])
    users = cursor.fetchall()
    
    for u in users:
        if not u.get('avatar'):
            u['avatar'] = '/static/imgs/hp1.png'
    
    conn.close()
    return JsonResponse({'success': True, 'data': users, 'total': total, 'page': page})

@csrf_exempt
def api_delete_user(request):
    """删除用户"""
    data = json.loads(request.body)
    user_id = data.get('user_id')
    
    if not user_id:
        return JsonResponse({'success': False, 'msg': '用户ID不能为空'})
    
    conn = get_mysql_conn()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM users WHERE user_id=%s", [user_id])
        conn.commit()
        return JsonResponse({'success': True, 'msg': '删除成功'})
    except Exception as e:
        conn.rollback()
        return JsonResponse({'success': False, 'msg': f'删除失败: {str(e)}'})
    finally:
        conn.close()

@csrf_exempt
def api_get_user_music_lib(request):
    """获取用户音乐库（喜爱的音乐）"""
    user_id = request.GET.get('user_id', '')
    page = int(request.GET.get('page', 1))
    
    if not user_id:
        return JsonResponse({'success': False, 'msg': '用户ID不能为空'})
    
    conn = get_mysql_conn()
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    # 构建用户音乐库表名
    table_name = f"`{user_id}_like_musics`"
    
    try:
        # 检查表是否存在
        cursor.execute(f"SELECT COUNT(*) as total FROM {table_name}")
        total = cursor.fetchone()['total']
        
        offset = (page - 1) * 15
        cursor.execute(f"""
            SELECT music_id, music_name, is_liked, create_time FROM {table_name}
            ORDER BY create_time DESC LIMIT 15 OFFSET %s
        """, [offset])
        
        musics = cursor.fetchall()
        conn.close()
        
        return JsonResponse({'success': True, 'data': musics, 'total': total, 'page': page})
    except Exception as e:
        conn.close()
        return JsonResponse({'success': False, 'msg': f'查询失败: {str(e)}'})

@csrf_exempt
def api_delete_user_like_music(request):
    """删除用户喜爱的音乐"""
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id', '')
        music_id = data.get('music_id', '')
        
        if not user_id or not music_id:
            return JsonResponse({'success': False, 'msg': '参数不完整'})
        
        conn = get_mysql_conn()
        cursor = conn.cursor()
        
        table_name = f"`{user_id}_like_musics`"
        
        cursor.execute(f"DELETE FROM {table_name} WHERE music_id = %s", [music_id])
        conn.commit()
        conn.close()
        
        return JsonResponse({'success': True, 'msg': '删除成功'})
    except Exception as e:
        return JsonResponse({'success': False, 'msg': f'删除失败: {str(e)}'})

@csrf_exempt
def api_get_all_users_simple(request):
    """获取所有用户列表（只返回user_id和username）"""
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        cursor.execute("SELECT user_id, username FROM users ORDER BY username ASC")
        users = cursor.fetchall()
        
        conn.close()
        
        return JsonResponse({'success': True, 'data': users})
    except Exception as e:
        return JsonResponse({'success': False, 'msg': f'获取失败: {str(e)}'})

@csrf_exempt
def api_get_creator_music_lib(request):
    """获取创作者音乐库（创作者创建的音乐）"""
    user_id = request.GET.get('user_id', '')
    page = int(request.GET.get('page', 1))
    
    if not user_id:
        return JsonResponse({'success': False, 'msg': '用户ID不能为空'})
    
    conn = get_mysql_conn()
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    # 构建创作者音乐表名
    table_name = f"`{user_id}_create_musics`"
    
    try:
        # 检查表是否存在
        cursor.execute(f"SELECT COUNT(*) as total FROM {table_name}")
        total = cursor.fetchone()['total']
        
        offset = (page - 1) * 15
        cursor.execute(f"""
            SELECT music_id, music_name, author, album, album_cover, country, 
                   like_count, click_count, lyrics, state, create_datetime 
            FROM {table_name}
            ORDER BY create_datetime DESC LIMIT 15 OFFSET %s
        """, [offset])
        
        musics = cursor.fetchall()
        conn.close()
        
        return JsonResponse({'success': True, 'data': musics, 'total': total, 'page': page})
    except Exception as e:
        conn.close()
        return JsonResponse({'success': False, 'msg': f'查询失败: {str(e)}'})

@csrf_exempt
def api_audit_creator_music(request):
    """审核创作者上传的音乐 - 审核通过时写入新歌榜"""
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id', '')
        music_id = data.get('music_id', '')
        state = data.get('state', '')  # 1=未通过, 2=已通过
        
        if not user_id or not music_id or state == '':
            return JsonResponse({'success': False, 'msg': '参数不完整'})
        
        state = int(state)
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        table_name = f"`{user_id}_create_musics`"
        
        try:
            # 如果审核通过，先从用户创作表获取数据，写入新歌榜
            if state == 2:
                # 从用户创作表查询音乐数据
                cursor.execute(f"""
                    SELECT music_id, music_name, author_id, author, album, album_cover,
                           lyrics, real_url, play_url, country, like_count, click_count, create_datetime
                    FROM {table_name}
                    WHERE music_id = %s
                """, [music_id])
                
                music_data = cursor.fetchone()
                
                if not music_data:
                    conn.close()
                    return JsonResponse({'success': False, 'msg': '音乐不存在'})
                
                # 写入新歌榜表
                newsong_insert_sql = '''
                    INSERT INTO newsong_rank 
                    (music_id, music_name, author_id, author, album, album_cover, 
                     lyrics, real_url, play_url, country, like_count, click_count, create_datetime)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                '''
                
                cursor.execute(newsong_insert_sql, (
                    music_data['music_id'],
                    music_data['music_name'],
                    music_data['author_id'],
                    music_data['author'],
                    music_data['album'],
                    music_data['album_cover'],
                    music_data['lyrics'],
                    music_data['real_url'],
                    music_data['play_url'],
                    music_data['country'],
                    music_data['like_count'],
                    music_data['click_count'],
                    music_data['create_datetime']
                ))
                conn.commit()
                print(f"✓ 音乐已写入新歌榜 newsong_rank")
            
            # 更新用户创作表中的审核状态
            cursor.execute(f"UPDATE {table_name} SET state = %s WHERE music_id = %s", [state, music_id])
            conn.commit()
            conn.close()
            
            state_text = '已通过' if state == 2 else '未通过'
            msg = '审核通过，音乐已上架！' if state == 2 else '审核未通过'
            return JsonResponse({'success': True, 'msg': msg})
        except Exception as e:
            conn.rollback()
            conn.close()
            print(f'审核失败: {str(e)}')
            return JsonResponse({'success': False, 'msg': f'审核失败: {str(e)}'})
    except Exception as e:
        return JsonResponse({'success': False, 'msg': f'审核失败: {str(e)}'})

@csrf_exempt
def api_get_creators_simple(request):
    """获取创作者列表（只返回is_creator=1的用户）"""
    try:
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        cursor.execute("SELECT user_id, username FROM users WHERE is_creator = 1 ORDER BY username ASC")
        creators = cursor.fetchall()
        
        conn.close()
        
        return JsonResponse({'success': True, 'data': creators})
    except Exception as e:
        return JsonResponse({'success': False, 'msg': f'获取失败: {str(e)}'})


@csrf_exempt
def api_user_distribution_analysis(request):
    """
    用户分布分析API - 返回性别、地区、用户类型的数据分析
    返回三个维度的ECharts饼状图数据
    """
    try:
        from music.data_analysis import analyze_user_distribution, generate_chart_data
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询所有用户数据
        cursor.execute("""
            SELECT user_id, gender, region, is_creator 
            FROM users
        """)
        users_data = cursor.fetchall()
        conn.close()
        
        if not users_data:
            return JsonResponse({
                'code': 200,
                'data': {
                    'gender_chart': {'title': '用户性别分布', 'type': 'pie', 'labels': [], 'values': []},
                    'region_chart': {'title': '用户地区分布', 'type': 'pie', 'labels': [], 'values': []},
                    'user_type_chart': {'title': '用户类型分布', 'type': 'pie', 'labels': [], 'values': []}
                },
                'msg': '暂无用户数据'
            })
        
        # 调用分析函数
        analysis_result = analyze_user_distribution(users_data)
        
        # 生成图表数据
        chart_data = generate_chart_data(analysis_result)
        
        return JsonResponse({
            'code': 200,
            'data': {
                'gender_chart': chart_data['gender_chart'],
                'region_chart': chart_data['region_chart'],
                'user_type_chart': chart_data['user_type_chart'],
                'analysis': {
                    'total_users': len(users_data),
                    'gender_analysis': analysis_result['gender'],
                    'region_analysis': analysis_result['region'],
                    'user_type_analysis': analysis_result['user_type']
                }
            },
            'msg': '分析成功'
        })
    
    except Exception as e:
        print(f"用户分布分析错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'msg': f'分析失败: {str(e)}'
        }, status=500)


def test_user_distribution_page(request):
    """用户分布分析测试页面"""
    return render(request, 'test_user_distribution.html')


@csrf_exempt
def api_user_activity_analysis(request):
    """
    用户活跃度分析API - 根据创建时间和更新时间分析用户活跃度
    分类：近10天、一个月内、一年内、超过一年
    """
    try:
        from music.data_analysis import analyze_user_activity, generate_activity_chart_data
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询所有用户数据（包括时间字段）
        cursor.execute("""
            SELECT user_id, create_time, update_time 
            FROM users
        """)
        users_data = cursor.fetchall()
        conn.close()
        
        if not users_data:
            return JsonResponse({
                'code': 200,
                'data': {
                    'bar_chart': {'title': '用户活跃度统计', 'labels': [], 'values': []},
                    'pie_chart': {'title': '用户活跃度分布', 'labels': [], 'values': []},
                    'stats': {'total': 0, 'activity_dist': {}}
                },
                'msg': '暂无用户数据'
            })
        
        # 分析用户活跃度
        activity_dist = analyze_user_activity(users_data)
        
        # 生成图表数据
        chart_data = generate_activity_chart_data(activity_dist)
        
        return JsonResponse({
            'code': 200,
            'data': {
                'bar_chart': chart_data['bar_chart'],
                'pie_chart': chart_data['pie_chart'],
                'stats': chart_data['stats']
            },
            'msg': '分析成功'
        })
    
    except Exception as e:
        print(f"用户活跃度分析错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'msg': f'分析失败: {str(e)}'
        }, status=500)


def api_music_popularity_analysis(request):
    """
    API: 获取音乐热度分析数据
    """
    try:
        from .data_analysis import analyze_music_popularity, generate_popularity_chart_data
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 七个榜单的表名和显示名称
        rank_configs = [
            ('soaring_rank', '飙升榜'),
            ('newsong_rank', '新歌榜'),
            ('hotsong_rank', '热歌榜'),
            ('chinese_rank', '国语榜'),
            ('america_rank', '欧美榜'),
            ('korea_rank', '韩语榜'),
            ('japan_rank', '日语榜')
        ]
        
        ranks_data = {}
        
        # 查询每个榜单的数据
        for table_name, rank_display_name in rank_configs:
            try:
                query = f"SELECT like_count, click_count FROM {table_name} WHERE like_count > 0 OR click_count > 0"
                cursor.execute(query)
                songs = cursor.fetchall()
                ranks_data[rank_display_name] = songs if songs else []
            except Exception as e:
                print(f"查询 {table_name} 出错: {str(e)}")
                ranks_data[rank_display_name] = []
        
        cursor.close()
        conn.close()
        
        # 调用分析函数
        popularity_stats = analyze_music_popularity(ranks_data)
        chart_data = generate_popularity_chart_data(popularity_stats)
        
        return JsonResponse({
            'code': 200,
            'data': chart_data,
            'msg': '分析成功'
        })
        
    except Exception as e:
        print(f"音乐热度分析错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'msg': f'分析失败: {str(e)}'
        }, status=500)


def api_rank_trend_analysis(request):
    """
    API: 获取榜单趋势分析数据
    """
    try:
        from .data_analysis import analyze_rank_trend, generate_rank_trend_chart_data
        
        conn = get_mysql_conn()
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        
        # 查询music_info表的所有歌曲
        query = "SELECT author, country, like_count, click_count FROM music_info"
        cursor.execute(query)
        music_data = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # 调用分析函数
        trend_data = analyze_rank_trend(music_data)
        chart_data = generate_rank_trend_chart_data(trend_data)
        
        return JsonResponse({
            'code': 200,
            'data': chart_data,
            'msg': '分析成功'
        })
        
    except Exception as e:
        print(f"榜单趋势分析错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'msg': f'分析失败: {str(e)}'
        }, status=500)


def api_hmm_analysis(request):
    """
    API: HMM 隐马尔可夫模型分析推荐
    
    功能:
    - 从数据库加载音乐统计特征 (like_count, click_count, country等)
    - 使用HMM无监督学习自动发现隐层音乐类别
    - 基于隐状态进行音乐推荐和分析
    
    参数:
    - top_k: 推荐数量 (默认20)
    - state: 目标隐状态 (默认随机)
    
    返回:
    - recommendations: 推荐音乐列表
    - hmm_stats: HMM模型统计信息
    """
    try:
        from .markov_model import analyze_and_recommend_music
        
        # 获取查询参数
        top_k = int(request.GET.get('top_k', 20))
        target_state = request.GET.get('state', None)
        
        if target_state is not None:
            target_state = int(target_state)
        
        # 连接数据库
        conn = get_mysql_conn()
        
        # 执行 HMM 分析推荐
        recommendations = analyze_and_recommend_music(conn, max_results=top_k, target_state=target_state)
        
        conn.close()
        
        return JsonResponse({
            'code': 200,
            'data': {
                'recommendations': recommendations,
                'count': len(recommendations),
                'message': f'基于HMM无监督学习生成 {len(recommendations)} 条推荐'
            },
            'msg': '分析成功'
        })
        
    except Exception as e:
        print(f"HMM 分析错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'code': 500,
            'msg': f'HMM分析失败: {str(e)}'
        }, status=500)
