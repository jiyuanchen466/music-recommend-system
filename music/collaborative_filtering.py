# =====================================================================
# 📀 协同过滤推荐系统 - 基于用户和项目的混合推荐算法
# =====================================================================
# 说明：根据用户的听歌历史和喜欢行为，预测用户对未听过歌曲的偏好
# 使用 Pearson 相关系数和余弦相似度进行相似度计算
# =====================================================================

import numpy as np
from django.core.cache import cache
from django.db.models import Q
import json
import math
from datetime import datetime, timedelta
from .models import MusicInfo, LikeMusics


class CollaborativeFilteringEngine:
    """
    协同过滤推荐引擎
    
    核心算法：
    1. 基于用户的CF：找相似用户，推荐他们喜欢但该用户未听过的歌曲
    2. 基于项目的CF：找相似歌曲，推荐用户喜欢的歌曲的相似歌曲
    3. 混合推荐：综合两种方法的结果
    """
    
    def __init__(self):
        """初始化推荐引擎"""
        self.user_item_matrix = {}  # 用户-歌曲矩阵（缓存）
        self.item_similarity_matrix = {}  # 歌曲相似度矩阵（缓存）
        self.user_similarity_matrix = {}  # 用户相似度矩阵（缓存）
        self.cache_timeout = 3600  # 缓存时间（秒）
    
    # ====================================================================
    # 第一部分：数据加载与预处理
    # ====================================================================
    
    def load_user_item_matrix(self):
        """
        加载用户-歌曲交互矩阵
        矩阵含义：matrix[user_id][music_id] = {like_count, click_count}
        
        使用原生SQL查询，支持动态表名格式: {user_id}_like_musics
        
        返回: dict
            {
                user_id: {
                    music_id: {'likes': 1/0, 'clicks': click_count},
                    ...
                },
                ...
            }
        """
        from django.db import connection
        
        # 先尝试从缓存获取
        cache_key = 'user_item_matrix'
        matrix = cache.get(cache_key)
        if matrix:
            print('[缓存] 从缓存获取用户-歌曲矩阵')
            return matrix
        
        print('[加载] 开始加载用户-歌曲矩阵...')
        matrix = {}
        
        try:
            cursor = connection.cursor()
            
            # 查询所有 user_*_like_musics 表中的数据
            # 首先获取所有用户对应的表
            db_name = connection.settings_dict['NAME']
            cursor.execute("""
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = %s 
                AND TABLE_NAME LIKE %s
            """, [db_name, '%_like_musics'])
            
            table_names = [row[0] for row in cursor.fetchall()]
            print(f'[加载] 找到 {len(table_names)} 个用户的喜爱数据表')
            
            # 从每个表中读取数据
            for table_name in table_names:
                # 从表名提取 user_id: {user_id}_like_musics
                user_id = table_name.replace('_like_musics', '')
                
                try:
                    cursor.execute(f"""
                        SELECT music_id, is_liked 
                        FROM `{table_name}` 
                        WHERE is_liked = 1
                    """)
                    
                    records = cursor.fetchall()
                    
                    if records:
                        if user_id not in matrix:
                            matrix[user_id] = {}
                        
                        for music_id, is_liked in records:
                            matrix[user_id][music_id] = {
                                'likes': is_liked,
                                'clicks': 1 if is_liked else 0
                            }
                    
                except Exception as e:
                    print(f'[警告] 读取表 {table_name} 失败: {e}')
                    continue
            
            # 缓存矩阵（避免频繁查询数据库）
            cache.set(cache_key, matrix, self.cache_timeout)
            print(f'[加载] 成功加载 {len(matrix)} 个用户的交互数据')
            return matrix
            
        except Exception as e:
            print(f'[错误] 加载用户-歌曲矩阵失败: {e}')
            import traceback
            traceback.print_exc()
            return {}
    
    def get_user_preferences(self, user_id):
        """
        获取用户的偏好向量
        
        参数:
            user_id: 用户ID
        
        返回: dict
            {music_id: preference_score, ...}
            其中 preference_score 范围 0-1，表示用户对该歌曲的偏好程度
        """
        try:
            from django.db import connection
            
            table_name = f'{user_id}_like_musics'
            cursor = connection.cursor()
            
            # 查询用户喜欢的歌曲
            cursor.execute(f"""
                SELECT music_id 
                FROM `{table_name}` 
                WHERE is_liked = 1
            """)
            
            preferences = {}
            for row in cursor.fetchall():
                music_id = row[0]
                preferences[music_id] = 1.0  # 点赞=偏好1.0
            
            return preferences
            
        except Exception as e:
            print(f'[错误] 获取用户偏好向量失败: {e}')
            return {}
    
    # ====================================================================
    # 第二部分：相似度计算
    # ====================================================================
    
    def calculate_pearson_similarity(self, user1_prefs, user2_prefs):
        """
        计算两个用户的 Pearson 相关系数（适合评分/偏好数据）
        
        Pearson相关系数特点：
        - 范围 [-1, 1]，取值 1 表示完全正相关，-1 表示完全负相关
        - 对偏差有很好的处理，能消除评分偏差的影响
        
        参数:
            user1_prefs: 用户1的偏好字典 {music_id: score}
            user2_prefs: 用户2的偏好字典 {music_id: score}
        
        返回: float [0, 1]
            相似度分数，1 表示完全相似，0 表示完全不相似
        """
        # 找到两个用户都评分过的歌曲
        common_items = set(user1_prefs.keys()) & set(user2_prefs.keys())
        
        if len(common_items) < 2:
            # 公共歌曲少于2首，无法计算相关系数
            return 0.0
        
        # 提取公共歌曲的评分
        prefs1 = [user1_prefs[item] for item in common_items]
        prefs2 = [user2_prefs[item] for item in common_items]
        
        # 计算均值
        mean1 = sum(prefs1) / len(prefs1)
        mean2 = sum(prefs2) / len(prefs2)
        
        # 计算分子（协方差）
        numerator = sum((prefs1[i] - mean1) * (prefs2[i] - mean2) 
                        for i in range(len(prefs1)))
        
        # 计算分母（标准差乘积）
        denominator = math.sqrt(
            sum((p - mean1) ** 2 for p in prefs1) * 
            sum((p - mean2) ** 2 for p in prefs2)
        )
        
        if denominator == 0:
            return 0.0
        
        # Pearson相关系数 [-1, 1] -> [0, 1]
        pearson = numerator / denominator
        return max(0, (pearson + 1) / 2)  # 转换到 [0, 1]
    
    def calculate_cosine_similarity(self, vector1, vector2):
        """
        计算两个向量的余弦相似度（适合统计特征）
        
        余弦相似度特点：
        - 只关注方向，不关注大小
        - 范围 [0, 1]，1 表示完全相同方向，0 表示垂直
        - 适合高维稀疏数据
        
        参数:
            vector1, vector2: 向量（列表或字典）
        
        返回: float [0, 1]
            相似度分数
        """
        # 处理字典输入
        if isinstance(vector1, dict):
            all_keys = set(vector1.keys()) | set(vector2.keys())
            v1 = [vector1.get(k, 0) for k in all_keys]
            v2 = [vector2.get(k, 0) for k in all_keys]
        else:
            v1, v2 = vector1, vector2
        
        # 计算点积
        dot_product = sum(a * b for a, b in zip(v1, v2))
        
        # 计算模长
        magnitude1 = math.sqrt(sum(a ** 2 for a in v1))
        magnitude2 = math.sqrt(sum(b ** 2 for b in v2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        # 余弦相似度
        return dot_product / (magnitude1 * magnitude2)
    
    # ====================================================================
    # 第三部分：基于用户的协同过滤
    # ====================================================================
    
    def find_similar_users(self, user_id, n_neighbors=10):
        """
        找到与目标用户最相似的 n 个用户
        
        参数:
            user_id: 目标用户ID
            n_neighbors: 返回相似用户数量
        
        返回: list
            [(similar_user_id, similarity_score), ...]
            按相似度从高到低排序
        """
        print(f'[查找相似用户] 目标用户: {user_id}')
        
        # 获取目标用户的偏好
        target_prefs = self.get_user_preferences(user_id)
        if not target_prefs:
            print('[查找相似用户] 该用户无偏好数据')
            return []
        
        # 加载用户-歌曲矩阵
        matrix = self.load_user_item_matrix()
        
        similarities = []
        
        # 与所有其他用户计算相似度
        for other_user_id in matrix.keys():
            if other_user_id == user_id:
                continue
            
            other_prefs = self.get_user_preferences(other_user_id)
            if not other_prefs:
                continue
            
            # 使用 Pearson 相关系数计算相似度
            similarity = self.calculate_pearson_similarity(target_prefs, other_prefs)
            
            if similarity > 0:
                similarities.append((other_user_id, similarity))
        
        # 按相似度排序，返回最相似的 n 个
        similarities.sort(key=lambda x: x[1], reverse=True)
        result = similarities[:n_neighbors]
        
        print(f'[查找相似用户] 找到 {len(result)} 个相似用户')
        for uid, sim in result[:3]:
            print(f'  - 用户 {uid}: 相似度 {sim:.3f}')
        
        return result
    
    def recommend_user_based_cf(self, user_id, n_recommendations=10):
        """
        基于用户的协同过滤推荐
        
        算法流程：
        1. 找到与目标用户最相似的 n 个用户
        2. 收集这些相似用户喜欢但目标用户未听过的歌曲
        3. 根据相似度加权计算歌曲评分
        4. 返回评分最高的 n 首歌曲
        
        参数:
            user_id: 目标用户ID
            n_recommendations: 推荐数量
        
        返回: list
            [{music_id, music_name, author, reason}, ...]
        """
        print(f'\n[基于用户的CF] 为用户 {user_id} 生成推荐')
        
        # 获取目标用户已听过的歌曲
        user_prefs = self.get_user_preferences(user_id)
        
        # 找相似用户
        similar_users = self.find_similar_users(user_id, n_neighbors=10)
        if not similar_users:
            print('[基于用户的CF] 找不到相似用户，返回空推荐')
            return []
        
        # 候选歌曲评分 {music_id: weighted_score}
        candidate_scores = {}
        
        # 遍历每个相似用户
        for similar_user_id, similarity_score in similar_users:
            similar_prefs = self.get_user_preferences(similar_user_id)
            
            # 取该相似用户喜欢但目标用户未听过的歌曲
            for music_id, pref_score in similar_prefs.items():
                if music_id not in user_prefs:  # 目标用户未听过
                    # 根据相似度加权
                    weighted_score = similarity_score * pref_score
                    
                    if music_id not in candidate_scores:
                        candidate_scores[music_id] = 0
                    candidate_scores[music_id] += weighted_score
        
        # 排序候选歌曲
        sorted_candidates = sorted(
            candidate_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:n_recommendations]
        
        # 获取歌曲详细信息
        recommendations = []
        for music_id, score in sorted_candidates:
            try:
                # 尝试用 music_id 作为整数查询
                try:
                    # 如果 music_id 是字符串，尝试转换为整数
                    if isinstance(music_id, str):
                        try:
                            int_music_id = int(music_id)
                            music = MusicInfo.objects.get(music_id=int_music_id)
                        except (ValueError, MusicInfo.DoesNotExist):
                            # 如果是字符串格式的外部 ID（如 'music_4851124_...'），跳过
                            print(f'[基于用户的CF] 歌曲 {music_id} 无法匹配到本地 MusicInfo（外部 ID 格式）')
                            continue
                    else:
                        music = MusicInfo.objects.get(music_id=music_id)
                    
                    recommendations.append({
                        'music_id': music.music_id,
                        'music_name': music.music_name,
                        'author': music.author,
                        'album_cover': music.album_cover,
                        'score': score,
                        'reason': '相似用户喜欢'
                    })
                except MusicInfo.DoesNotExist:
                    print(f'[基于用户的CF] 歌曲 {music_id} 不存在于 MusicInfo 表')
                    
            except Exception as e:
                print(f'[基于用户的CF] 查询歌曲 {music_id} 失败: {e}')
        
        print(f'[基于用户的CF] 生成了 {len(recommendations)} 条推荐')
        return recommendations[:n_recommendations]
    
    # ====================================================================
    # 第四部分：基于项目的协同过滤
    # ====================================================================
    
    def find_similar_items(self, music_id, n_similar=10):
        """
        找到与目标歌曲最相似的 n 首歌曲
        
        相似度基于：
        - 同一艺术家
        - 同一国家/风格
        - 被相似用户群体喜欢
        
        参数:
            music_id: 目标歌曲ID
            n_similar: 返回相似歌曲数量
        
        返回: list
            [(similar_music_id, similarity_score), ...]
        """
        print(f'[查找相似歌曲] 目标歌曲: {music_id}')
        
        try:
            # 处理字符串格式的 music_id
            if isinstance(music_id, str):
                try:
                    int_music_id = int(music_id)
                    target_music = MusicInfo.objects.get(music_id=int_music_id)
                except (ValueError, MusicInfo.DoesNotExist):
                    print(f'[查找相似歌曲] 歌曲 {music_id} 不存在（外部 ID 格式）')
                    return []
            else:
                target_music = MusicInfo.objects.get(music_id=music_id)
        except MusicInfo.DoesNotExist:
            print(f'[查找相似歌曲] 歌曲 {music_id} 不存在')
            return []
        
        similarities = []
        
        # 查询其他歌曲
        # 处理 music_id 类型：如果是字符串格式的外部ID，则跳过相似歌曲查询
        if isinstance(music_id, str):
            try:
                int_music_id = int(music_id)
                other_musics = MusicInfo.objects.exclude(music_id=int_music_id)[:100]
            except ValueError:
                print(f'[查找相似歌曲] music_id {music_id} 是外部ID格式，跳过相似歌曲查询')
                return []
        else:
            other_musics = MusicInfo.objects.exclude(music_id=music_id)[:100]  # 限制查询数量
        
        for other_music in other_musics:
            similarity = 0.0
            
            # 相似度因素1：同艺术家（权重: 0.3）
            if target_music.author_id == other_music.author_id:
                similarity += 0.3
            
            # 相似度因素2：同国家（权重: 0.2）
            if target_music.country == other_music.country:
                similarity += 0.2
            
            # 相似度因素3：热度相近（权重: 0.2）
            target_clicks = target_music.click_count or 0
            other_clicks = other_music.click_count or 0
            if target_clicks > 0 and other_clicks > 0:
                click_similarity = 1 - abs(target_clicks - other_clicks) / max(target_clicks, other_clicks)
                similarity += 0.2 * click_similarity
            
            # 相似度因素4：被相似用户群体喜欢（权重: 0.3）
            # 从已加载的矩阵中获取喜欢这两首歌曲的用户
            matrix = self.load_user_item_matrix()
            
            target_likers = set()
            other_likers = set()
            
            for user_id, user_music_dict in matrix.items():
                if str(music_id) in user_music_dict:
                    target_likers.add(user_id)
                if str(other_music.id) in user_music_dict:
                    other_likers.add(user_id)
            
            if target_likers or other_likers:
                # Jaccard 相似系数：交集/并集
                intersection = len(target_likers & other_likers)
                union = len(target_likers | other_likers)
                if union > 0:
                    jaccard = intersection / union
                    similarity += 0.3 * jaccard
            
            if similarity > 0:
                similarities.append((other_music.id, similarity))
        
        # 排序返回
        similarities.sort(key=lambda x: x[1], reverse=True)
        result = similarities[:n_similar]
        
        print(f'[查找相似歌曲] 找到 {len(result)} 首相似歌曲')
        return result
    
    def recommend_item_based_cf(self, user_id, n_recommendations=10):
        """
        基于项目的协同过滤推荐
        
        算法流程：
        1. 获取目标用户喜欢的歌曲
        2. 对每首歌曲，找到相似的歌曲
        3. 筛选用户未听过的相似歌曲
        4. 根据相似度和基础歌曲的重要性加权评分
        5. 返回评分最高的 n 首歌曲
        
        参数:
            user_id: 目标用户ID
            n_recommendations: 推荐数量
        
        返回: list
            [{music_id, music_name, author, reason}, ...]
        """
        print(f'\n[基于项目的CF] 为用户 {user_id} 生成推荐')
        
        # 获取用户的喜欢列表（从已加载的矩阵中获取）
        try:
            matrix = self.load_user_item_matrix()
            
            if user_id in matrix:
                user_liked_set = set(matrix[user_id].keys())
            else:
                user_liked_set = set()
                
        except Exception as e:
            print(f'[基于项目的CF] 获取用户喜欢列表失败: {e}')
            return []
        
        if not user_liked_set:
            print('[基于项目的CF] 用户无喜欢记录')
            return []
        
        print(f'[基于项目的CF] 用户喜欢 {len(user_liked_set)} 首歌曲')
        
        # 候选歌曲评分
        candidate_scores = {}
        
        # 遍历用户喜欢的每首歌曲
        for liked_music_id in list(user_liked_set)[:20]:  # 限制处理数量
            # 找相似歌曲
            similar_items = self.find_similar_items(liked_music_id, n_similar=15)
            
            # 添加到候选
            for similar_music_id, similarity in similar_items:
                if similar_music_id not in user_liked_set:  # 用户未听过
                    if similar_music_id not in candidate_scores:
                        candidate_scores[similar_music_id] = 0
                    candidate_scores[similar_music_id] += similarity
        
        # 排序
        sorted_candidates = sorted(
            candidate_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:n_recommendations]
        
        # 获取歌曲详情
        recommendations = []
        for music_id, score in sorted_candidates:
            try:
                # 尝试用 music_id 作为整数查询
                try:
                    # 如果 music_id 是字符串，尝试转换为整数
                    if isinstance(music_id, str):
                        try:
                            int_music_id = int(music_id)
                            music = MusicInfo.objects.get(music_id=int_music_id)
                        except (ValueError, MusicInfo.DoesNotExist):
                            # 如果是字符串格式的外部 ID（如 'music_4851124_...'），跳过
                            print(f'[基于项目的CF] 歌曲 {music_id} 无法匹配到本地 MusicInfo（外部 ID 格式）')
                            continue
                    else:
                        music = MusicInfo.objects.get(music_id=music_id)
                    
                    recommendations.append({
                        'music_id': music.music_id,
                        'music_name': music.music_name,
                        'author': music.author,
                        'album_cover': music.album_cover,
                        'score': score,
                        'reason': '类似你喜欢的歌曲'
                    })
                except MusicInfo.DoesNotExist:
                    print(f'[基于项目的CF] 歌曲 {music_id} 不存在于 MusicInfo 表')
                    
            except Exception as e:
                print(f'[基于项目的CF] 查询歌曲 {music_id} 失败: {e}')
        
        print(f'[基于项目的CF] 生成了 {len(recommendations)} 条推荐')
        return recommendations[:n_recommendations]
    
    # ====================================================================
    # 第五部分：混合推荐
    # ====================================================================
    
    def recommend_hybrid(self, user_id, n_recommendations=10, 
                        user_cf_weight=0.4, item_cf_weight=0.6):
        """
        混合推荐：综合基于用户和基于项目的协同过滤
        
        权重说明：
        - user_cf_weight: 基于用户CF的权重（默认0.4）
        - item_cf_weight: 基于项目CF的权重（默认0.6）
        
        参数:
            user_id: 用户ID
            n_recommendations: 推荐数量
            user_cf_weight: 用户CF权重
            item_cf_weight: 项目CF权重
        
        返回: list
            混合推荐结果
        """
        print(f'\n[混合推荐] 为用户 {user_id} 生成混合推荐')
        
        # 获取两种推荐
        user_cf_recs = self.recommend_user_based_cf(user_id, n_recommendations * 2)
        item_cf_recs = self.recommend_item_based_cf(user_id, n_recommendations * 2)
        
        # 合并结果
        rec_dict = {}
        
        for rec in user_cf_recs:
            music_id = rec['music_id']
            score = rec['score'] * user_cf_weight
            if music_id not in rec_dict:
                rec_dict[music_id] = rec.copy()
                rec_dict[music_id]['combined_score'] = score
            else:
                rec_dict[music_id]['combined_score'] += score
        
        for rec in item_cf_recs:
            music_id = rec['music_id']
            score = rec['score'] * item_cf_weight
            if music_id not in rec_dict:
                rec_dict[music_id] = rec.copy()
                rec_dict[music_id]['combined_score'] = score
            else:
                rec_dict[music_id]['combined_score'] += score
        
        # 排序
        hybrid_recs = sorted(
            rec_dict.values(),
            key=lambda x: x['combined_score'],
            reverse=True
        )[:n_recommendations]
        
        print(f'[混合推荐] 生成了 {len(hybrid_recs)} 条推荐')
        return hybrid_recs
    
    # ====================================================================
    # 第六部分：工具函数
    # ====================================================================
    
    def clear_cache(self):
        """清空推荐缓存"""
        cache.delete('user_item_matrix')
        print('[缓存] 已清除推荐缓存')
    
    def get_recommendation_summary(self, user_id):
        """
        获取推荐摘要
        
        返回: dict
            {
                'user_id': str,
                'total_recommendations': int,
                'user_cf_count': int,
                'item_cf_count': int,
                'timestamp': datetime
            }
        """
        return {
            'user_id': str(user_id),
            'timestamp': datetime.now().isoformat(),
            'algorithm': 'Hybrid Collaborative Filtering',
            'version': '1.0'
        }


# =====================================================================
# 使用示例
# =====================================================================

def get_recommendations_for_user(user_id, method='hybrid', n_recommendations=10):
    """
    获取用户推荐的便利函数
    
    参数:
        user_id: 用户ID
        method: 推荐方法 ('user_cf', 'item_cf', 'hybrid')
        n_recommendations: 推荐数量
    
    返回: list
        推荐结果
    """
    engine = CollaborativeFilteringEngine()
    
    if method == 'user_cf':
        return engine.recommend_user_based_cf(user_id, n_recommendations)
    elif method == 'item_cf':
        return engine.recommend_item_based_cf(user_id, n_recommendations)
    else:  # hybrid
        return engine.recommend_hybrid(user_id, n_recommendations)
