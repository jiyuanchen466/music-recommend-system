# ========== 基于 HMM 的音乐推荐系统 ==========
# 使用隐马尔可夫模型进行无监督学习分析音乐统计特征
# 直接从数据库加载数据，不依赖任何外部数据集

import os
import sys
import numpy as np
import pymysql
import json
import jieba
from datetime import datetime

# 机器学习库
try:
    from hmmlearn import hmm
except ImportError:
    print("⚠️ 警告：hmmlearn 未安装，请执行: pip install hmmlearn")

from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter

# ========== 路径定义 ==========
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ========== 日志输出工具 ==========
class Colors:
    """ANSI 颜色代码"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def log_header(text):
    """打印标题"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(70)}{Colors.END}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.END}\n")

def log_step(step, title, description):
    """打印步骤信息"""
    print(f"\n{Colors.BOLD}{Colors.OKBLUE}[步骤 {step}]{Colors.END} {Colors.BOLD}{title}{Colors.END}")
    print(f"  📝 {description}\n")

def log_info(text):
    """信息日志"""
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.END}")

def log_success(text):
    """成功日志"""
    print(f"{Colors.OKGREEN}✓ {text}{Colors.END}")

def log_warning(text):
    """警告日志"""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.END}")

def log_error(text):
    """错误日志"""
    print(f"{Colors.FAIL}✗ {text}{Colors.END}")

# ========== 数据库连接 ==========
def connect_database():
    """连接 MySQL 数据库"""
    log_step(1, "数据库连接", "连接到 coolmusic 数据库")
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='123456',
            database='coolmusic'
        )
        log_success(f"成功连接到 MySQL 数据库: localhost")
        return conn
    except Exception as e:
        log_error(f"数据库连接失败: {e}")
        return None

# ========== 音乐特征加载（从数据库） ==========
def load_music_features(conn, limit=500):
    """
    【核心】从数据库加载音乐统计特征（不使用任何数据集）
    
    提取特征：
    - like_count: 点赞数
    - click_count: 点击数
    - country编码: 国家/地区（编码为数字）
    - 热度趋势: (like_count + click_count) / 2
    - 歌词长度: lyrics 文本长度
    - 歌词词元数: jieba 分词后的词数
    
    返回: (N_samples, N_features) 的归一化特征矩阵
    """
    log_step(2, "加载音乐特征", f"从数据库加载最多 {limit} 首音乐的统计特征（不使用数据集）")
    
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)
        cursor.execute(f"""
            SELECT music_id, music_name, author, album, album_cover, country, lyrics, like_count, click_count
            FROM music_info 
            WHERE like_count IS NOT NULL AND click_count IS NOT NULL
            LIMIT {limit}
        """)
        
        music_data = cursor.fetchall()
        cursor.close()
        
        if len(music_data) == 0:
            log_error("未找到有效的音乐数据")
            return None
        
        log_success(f"加载了 {len(music_data)} 首音乐")
        
        # 构建特征矩阵
        features = []
        music_info = []
        
        # 国家编码映射
        country_codes = {}
        code_counter = 0
        
        print(f"  📊 特征提取中...")
        for music in music_data:
            # 国家编码
            country = music.get('country', 'Unknown')
            if country not in country_codes:
                country_codes[country] = code_counter
                code_counter += 1
            
            country_code = country_codes[country]
            
            # 从数据库获取歌词并提取歌词统计特征
            lyrics = (music.get('lyrics') or '').strip()
            lyric_length = len(lyrics)
            lyric_token_count = len([w for w in jieba.cut(lyrics) if w.strip()]) if lyrics else 0

            # 构建特征向量 (6维)：[like_count, click_count, country_code, 热度, 歌词长度, 歌词词元数]
            like_count = float(music['like_count'] or 0)
            click_count = float(music['click_count'] or 0)
            popularity = (like_count + click_count) / 2 if (like_count + click_count) > 0 else 0.1
            
            feature_vector = np.array([
                like_count,           # 特征1: 点赞数
                click_count,          # 特征2: 点击数
                country_code,         # 特征3: 国家编码
                popularity,           # 特征4: 热度 = (like + click) / 2
                float(lyric_length),  # 特征5: 歌词长度
                float(lyric_token_count)  # 特征6: 歌词词元数
            ])
            
            features.append(feature_vector)
            music_info.append({
                'music_id': music['music_id'],
                'music_name': music['music_name'],
                'author': music['author'],
                'album': music.get('album', ''),
                'album_cover': music.get('album_cover', ''),
                'country': country,
                'like_count': like_count,
                'click_count': click_count,
                'lyric_length': lyric_length,
                'lyric_token_count': lyric_token_count
            })
        
        X_raw = np.array(features)  # (N_samples, 6)
        
        # 特征归一化 (StandardScaler)
        print(f"  ⏳ 特征归一化...")
        scaler = StandardScaler()
        X_normalized = scaler.fit_transform(X_raw)
        
        log_success(f"特征提取完成: {X_normalized.shape}")
        print(f"  📊 特征统计:")
        print(f"     • 样本数: {X_normalized.shape[0]}")
        print(f"     • 特征维度: {X_normalized.shape[1]} (like, click, country, popularity, lyric_len, lyric_tokens)")
        print(f"     • 国家种类: {len(country_codes)}")
        print(f"     • 特征范围: [{X_normalized.min():.4f}, {X_normalized.max():.4f}]")
        
        if len(music_data) > 0:
            print(f"  📋 示例音乐:")
            for i, info in enumerate(music_info[:3]):
                print(f"     {i+1}. {info['music_name']} - {info['author']} ({info['country']})")
        
        return {
            'X_normalized': X_normalized,
            'X_raw': X_raw,
            'music_info': music_info,
            'scaler': scaler,
            'country_codes': country_codes
        }
    
    except Exception as e:
        log_error(f"加载音乐特征失败: {e}")
        import traceback
        traceback.print_exc()
        return None

# ========== HMM 模型训练（无监督学习） ==========
def train_hmm_model(X_train, n_hidden_states=6, n_iter=100):
    """
    【核心】使用音乐统计特征直接训练 HMM 模型（无监督学习）
    
    这是真正的无监督学习：
    - X_train: (N_samples, N_features) 的特征矩阵（音乐统计特征）
    - 不需要任何标签
    - HMM 自动学到音乐特征之间的隐层结构
    
    隐状态解释：
    - 每个隐状态代表一类音乐（基于点赞数、点击数、地区等特征）
    - 转移矩阵显示不同类型音乐之间的转移规律
    """
    log_step(5, "HMM 无监督训练", 
             f"使用音乐统计特征训练HMM (隐状态数: {n_hidden_states}, 迭代: {n_iter})")
    
    try:
        print(f"\n  ⏳ 初始化 Gaussian HMM 模型...")
        print(f"     • 输入维度: {X_train.shape[1]}")
        print(f"     • 样本数: {X_train.shape[0]}")
        print(f"     • 协方差类型: 'diag' (对角线)")
        print(f"     • 最大迭代: {n_iter}")
        print(f"     • 随机种子: 42 (可重复)")

        def _sanitize_model_probs(model_obj):
            # 修复 startprob_ 和 transmat_ 归一化，避免出现全 0 行导致 score/predict 失败
            start_sum = float(np.sum(model_obj.startprob_))
            if start_sum <= 0:
                model_obj.startprob_ = np.full(model_obj.n_components, 1.0 / model_obj.n_components)
            else:
                model_obj.startprob_ = model_obj.startprob_ / start_sum

            row_sums = model_obj.transmat_.sum(axis=1, keepdims=True)
            zero_rows = (row_sums.flatten() <= 0)
            if np.any(zero_rows):
                model_obj.transmat_[zero_rows] = 1.0 / model_obj.n_components
                row_sums = model_obj.transmat_.sum(axis=1, keepdims=True)
            model_obj.transmat_ = model_obj.transmat_ / np.where(row_sums == 0, 1.0, row_sums)

        # 自适应降阶训练，防止空状态导致 transmat_ 非法
        n_samples = int(X_train.shape[0])
        max_components = min(n_hidden_states, max(2, n_samples // 5))
        if max_components < 2:
            max_components = 2

        model = None
        hidden_states = None
        best_ll = None

        for components in range(max_components, 1, -1):
            print(f"\n  ⏳ 尝试训练 HMM: n_components={components}")
            trial_model = hmm.GaussianHMM(
                n_components=components,
                covariance_type='diag',
                n_iter=n_iter,
                random_state=42,
                verbose=1
            )
            try:
                trial_model.fit(X_train)
                _sanitize_model_probs(trial_model)
                trial_hidden_states = trial_model.predict(X_train)
                trial_ll = float(trial_model.score(X_train))
                model = trial_model
                hidden_states = trial_hidden_states
                best_ll = trial_ll
                break
            except Exception as train_err:
                print(f"     ⚠️ n_components={components} 训练失败: {train_err}")
                continue

        if model is None or hidden_states is None:
            raise ValueError("所有 HMM 状态数尝试均失败")

        log_success(f"HMM 模型训练完成!")

        # 输出模型的详细参数
        print(f"\n  📊 HMM 模型训练结果:")
        print(f"     • 收敛状态: {'✓ 已收敛' if model.monitor_.converged else '✗ 未完全收敛'}")
        print(f"     • 最终对数似然: {best_ll:.4f}")
        print(f"     • 迭代次数: {model.monitor_.iter}")

        print(f"\n  📊 模型参数统计:")
        print(f"     • 转移矩阵 (A): {model.transmat_.shape}")
        print(f"     • 均值向量 (μ): {model.means_.shape}")
        print(f"     • 协方差矩阵 (Σ): {model.covars_.shape}")
        
        # 预测所有样本的隐状态
        print(f"\n  🔮 预测所有音乐的隐状态...")
        
        # 分析隐状态分布
        state_dist = Counter(hidden_states)
        
        print(f"  📊 隐状态分布 (学到的音乐类别):")
        total = len(hidden_states)
        for state in sorted(state_dist.keys()):
            count = state_dist[state]
            percentage = (count / total) * 100
            bar = "█" * int(percentage / 2)
            print(f"     • 隐状态 {state}: {count:3d} 首 [{bar:<25s}] {percentage:5.1f}%")
        
        log_success(f"发现 {len(state_dist)} 个隐层音乐类别")
        
        # 计算状态转移的有效模式
        print(f"\n  📊 转移矩阵分析 (状态转移模式):")
        for i in range(min(3, n_hidden_states)):
            transitions = model.transmat_[i]
            top_transitions = np.argsort(transitions)[-3:][::-1]
            print(f"     • 从状态{i}主要转移到: ", end="")
            for j, trans_state in enumerate(top_transitions):
                if transitions[trans_state] > 0.01:
                    print(f"状态{trans_state}({transitions[trans_state]:.1%})", end=" ")
            print()
        
        return {
            'model': model,
            'n_components': model.n_components,
            'hidden_states': hidden_states,
            'state_distribution': state_dist,
            'X_train': X_train,
            'log_likelihood': best_ll
        }
    
    except Exception as e:
        log_error(f"HMM 训练失败: {e}")
        import traceback
        traceback.print_exc()
        return None

# ========== 基于 HMM 的音乐推荐 ==========
def recommend_music_by_hmm_features(hmm_result, music_info_list, user_preference=None, top_k=20):
    """
    使用训练好的 HMM 模型进行基于隐状态的音乐推荐
    
    工作流程：
    1. 分析用户偏好 (可选)
    2. 基于HMM隐状态聚类音乐
    3. 推荐相同或邻近隐状态的音乐
    4. 按热度排序
    """
    log_step(6, "HMM 特征相似推荐", f"基于隐状态和统计特征进行推荐 (top-{top_k})")
    
    try:
        if not hmm_result:
            log_error("HMM 模型为空，无法推荐")
            return []
        
        model = hmm_result['model']
        hidden_states = hmm_result['hidden_states']
        X_train = hmm_result['X_train']
        
        # 步骤 1: 定义用户的目标隐状态
        print(f"\n  🎯 步骤1: 分析用户偏好...")
        
        if user_preference is None:
            # 随机选择一个隐状态作为用户偏好
            target_state = np.random.randint(0, hmm_result['n_components'])
            print(f"     • 默认目标隐状态: {target_state}")
        else:
            target_state = user_preference
            print(f"     • 用户指定隐状态: {target_state}")
        
        # 步骤 2: 找出所有属于目标隐状态的音乐
        print(f"\n  🎯 步骤2: 聚类音乐...")
        target_music_indices = np.where(hidden_states == target_state)[0]
        print(f"     • 隐状态 {target_state} 包含 {len(target_music_indices)} 首音乐")
        
        # 步骤 3: 获取相邻隐状态的音乐
        transition_probs = model.transmat_[target_state]
        adjacent_states = np.argsort(transition_probs)[-3:][::-1]
        
        print(f"     • 相邻隐状态: {[s for s in adjacent_states if s != target_state and transition_probs[s] > 0.01]}")
        
        # 收集目标和相邻状态的音乐
        candidate_indices = list(target_music_indices)
        for adj_state in adjacent_states:
            if adj_state != target_state:
                adj_indices = np.where(hidden_states == adj_state)[0]
                candidate_indices.extend(adj_indices)
        
        # 步骤 4: 按热度 (like_count + click_count) 排序
        print(f"\n  🎯 步骤3: 按热度排序...")
        scored_items = []
        for idx in candidate_indices:
            music = music_info_list[idx]
            popularity = music['like_count'] + music['click_count']
            lyric_score = (music.get('lyric_token_count', 0) * 0.5) + (music.get('lyric_length', 0) / 100.0)
            state = hidden_states[idx]
            state_weight = 1.0 if state == target_state else 0.7
            score = (popularity * state_weight) + (lyric_score * 0.3)
            
            scored_items.append({
                'rank': 0,
                'music_id': music['music_id'],
                'music_name': music['music_name'],
                'author': music['author'],
                'album': music.get('album', ''),
                'cover_url': music.get('album_cover', ''),
                'country': music['country'],
                'score': float(score),
                'like_count': float(music['like_count']),
                'click_count': float(music['click_count']),
                'lyric_length': int(music.get('lyric_length', 0)),
                'lyric_token_count': int(music.get('lyric_token_count', 0)),
                'hmm_state': int(state),
                'state_weight': float(state_weight)
            })
        
        # 按得分排序
        scored_items.sort(key=lambda x: x['score'], reverse=True)
        
        # 步骤 5: 输出推荐
        print(f"\n  📋 推荐结果 (Top-{top_k}):")
        print(f"     {'排名':<4} {'歌曲':<20} {'歌手':<12} {'热度':<10} {'隐状态':<8}")
        print(f"     {'-'*60}")
        
        recommendations = []
        for rank, item in enumerate(scored_items[:top_k], 1):
            item['rank'] = rank
            recommendations.append(item)
            print(f"     {rank:<4} {item['music_name'][:18]:<20} {item['author'][:10]:<12} {item['score']:<10.0f} {item['hmm_state']:<8}")
        
        log_success(f"生成了 {len(recommendations)} 条推荐结果")
        return recommendations
    
    except Exception as e:
        log_error(f"HMM 推荐失败: {e}")
        import traceback
        traceback.print_exc()
        return []

# ========== 【核心】主推荐函数：完整的 HMM 无监督学习推荐流程 ==========
def analyze_and_recommend_music(conn, max_results=20, target_state=None):
    """
    【完整流程】数据库音乐 → 统计特征提取 → HMM 无监督学习 → 基于隐状态的推荐
    
    工作流程：
    1️⃣  从数据库加载所有音乐的统计特征（不使用任何数据集）
    2️⃣  特征包括: 点赞数、点击数、国家编码、热度
    3️⃣  使用特征矩阵直接训练 HMM（无监督学习，无需标签）
    4️⃣  HMM 自动发现音乐的隐层类别结构
    5️⃣  基于隐状态进行音乐推荐
    
    【关键点】完全基于数据库数据，不依赖任何外部数据集
    """
    log_header(f"🎵 HMM 音乐分析推荐系统 (数据库驱动) 🎵")
    print(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    try:
        # ========== 001: 从数据库加载音乐统计特征 ==========
        music_data = load_music_features(conn, limit=500)
        if not music_data:
            log_error("无法加载音乐特征")
            return []
        
        X_normalized = music_data['X_normalized']  # 归一化特征
        music_info_list = music_data['music_info']
        
        # ========== 002: 用特征矩阵直接训练 HMM（无监督） ==========
        log_step(3, "HMM 模型训练", f"用 {X_normalized.shape[0]} 个样本的统计特征训练 HMM")
        hmm_result = train_hmm_model(X_normalized, n_hidden_states=6, n_iter=100)
        if not hmm_result:
            log_error("HMM 模型训练失败")
            return []
        
        # ========== 003: 基于 HMM 进行推荐 ==========
        log_step(4, "HMM 隐状态推荐", f"基于学到的隐层结构进行推荐")
        recommendations = recommend_music_by_hmm_features(
            hmm_result,
            music_info_list,
            user_preference=target_state,
            top_k=max_results
        )
        
        # ========== 完成 ==========
        log_header(f"✅ 分析推荐完成！共生成 {len(recommendations)} 条结果")
        print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        return recommendations
    
    except Exception as e:
        log_error(f"推荐过程出错: {e}")
        import traceback
        traceback.print_exc()
        return []

# ========== 辅助函数：文本分析 ==========
def analyze_user_input(text):
    """
    分析用户文本输入并提取关键信息
    """
    log_info(f"分析用户输入: \"{text}\"")
    
    keywords = {
        'song_name': [],
        'artist': [],
        'style': [],
        'keywords': []
    }
    
    # 音乐风格词典
    style_keywords = {
        'rock': ['摇滚', '摇滚乐', 'rock'],
        'pop': ['流行', '流行乐', 'pop'],
        'rap': ['说唱', 'rap', 'hiphop'],
        'classical': ['古典', '交响', 'classical'],
        'jazz': ['爵士', 'jazz'],
        'electronic': ['电子', '电子乐', 'edm'],
        'folk': ['民谣', '民族', 'folk'],
        'country': ['乡村', 'country']
    }
    
    # 分词
    words = jieba.cut(text)
    for word in words:
        if len(word) < 2:
            continue
        
        # 检查是否为风格关键词
        for style, style_words in style_keywords.items():
            if word in style_words:
                keywords['style'].append(style)
        
        keywords['keywords'].append(word)
    
    return keywords


def recommend_music(audio_data, max_results=20):
    """主入口：使用 HMM 进行音乐推荐"""
    try:
        conn = pymysql.connect(
            host='localhost',
            user='root',
            password='123456',
            database='coolmusic'
        )
        print(f"🎵 HMM 推荐流程启动, 音频数据: {len(audio_data)} 字节, 推荐数量: {max_results}")
        recommendations = analyze_and_recommend_music(conn=conn, max_results=max_results, target_state=None)
        conn.close()
        print(f"✓ 推荐完成，共 {len(recommendations)} 条结果")
        return recommendations
    except Exception as e:
        print(f"❌ 推荐失败: {e}")
        import traceback
        traceback.print_exc()
        return []


if __name__ == "__main__":
    # ========== 【简单演示】命令行测试函数 ==========
    print(f"本模块为 views.py 导入使用")
    print(f"使用方式: from .markov_model import analyze_and_recommend_music")
    print(f"然后在 Django 视图中调用: analyze_and_recommend_music(conn, max_results=20)")
