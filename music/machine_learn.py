import math
import os
from collections import Counter
import jieba

# 加载停用词文件
def load_stop_words():
    """从 stopwords.txt 文件加载停用词"""
    stop_words = set()
    # 获取当前文件所在目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    stop_words_path = os.path.join(current_dir, 'stopwords.txt')
    
    try:
        with open(stop_words_path, 'r', encoding='utf-8') as f:
            for line in f:
                word = line.strip()
                if word and len(word) > 0:
                    stop_words.add(word)
    except FileNotFoundError:
        print(f'警告：停用词文件未找到：{stop_words_path}')
        # 如果文件不存在，使用默认停用词
        stop_words = {
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
            '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
            '你', '会', '着', '没有', '看', '好', '自己', '这', '那',
            '他', '她', '它', '们', '这个', '那个', '什么', '怎么', '可以',
            '啊', '呢', '吗', '哦', '呀', '哇', '啦', '嘿', '哈'
        }
    
    return stop_words

# 加载停用词
STOP_WORDS = load_stop_words()

# 分词函数（支持中文分词）
def tokenize(document):
    if not document:
        return []
    # 使用 jieba 分词
    words = jieba.lcut(str(document))
    # 去除停用词和单字
    return [word for word in words if word.strip() and word not in STOP_WORDS and len(word) > 1]

# 计算词频 TF
def calculate_tf(word, doc_tokens):
    if not doc_tokens:
        return 0.0
    return doc_tokens.count(word) / len(doc_tokens)

# 计算逆文档频率 IDF
def calculate_idf(word, all_documents):
    total_docs = len(all_documents)
    if total_docs == 0:
        return 0.0
    contain_count = sum(1 for doc_tokens in all_documents if word in doc_tokens)
    return math.log((total_docs + 1) / (contain_count + 1)) + 1

# 计算文档的 TF-IDF 向量
def get_tfidf_vector(target_doc_tokens, corpus_tokens_list):
    tfidf_dict = {}
    unique_words = set(target_doc_tokens)
    for word in unique_words:
        tf_val = calculate_tf(word, target_doc_tokens)
        idf_val = calculate_idf(word, corpus_tokens_list)
        tfidf_dict[word] = tf_val * idf_val
    return tfidf_dict

# 计算两个 TF-IDF 向量的余弦相似度
def cosine_similarity(vec1, vec2):
    if not vec1 or not vec2:
        return 0.0
    
    # 获取所有词的并集
    all_words = set(vec1.keys()) | set(vec2.keys())
    
    # 计算分子（点积）
    dot_product = sum(vec1.get(word, 0) * vec2.get(word, 0) for word in all_words)
    
    # 计算分母（模长乘积）
    magnitude1 = math.sqrt(sum(val ** 2 for val in vec1.values()))
    magnitude2 = math.sqrt(sum(val ** 2 for val in vec2.values()))
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return dot_product / (magnitude1 * magnitude2)

# 搜索音乐（主函数）
def search_music(query, all_music_data):
    """
    搜索音乐函数 - 快速版本
    
    参数:
        query: 搜索关键词
        all_music_data: 快速筛选后的候选数据（通常 100 条左右）
    
    返回:
        排序后的搜索结果列表（按相似度降序）
    """
    if not query or not all_music_data:
        return []
    
    # 1. 对查询词分词
    query_tokens = tokenize(query)
    if not query_tokens:
        return []
    
    # 2. 预处理音乐数据
    music_documents = []
    for music in all_music_data:
        # 组合所有字段：歌名 + 歌手 + 专辑 + 歌词
        combined_text = f"{music.get('music_name', '')} {music.get('author', '')} {music.get('album', '')} {music.get('lyrics', '')}"
        tokens = tokenize(combined_text)
        music_documents.append({
            'music': music,
            'tokens': tokens
        })
    
    if not music_documents:
        return []
    
    # 3. 提取所有文档的词用于 IDF 计算
    all_tokens_list = [doc['tokens'] for doc in music_documents]
    
    # 4. 计算查询词的 TF-IDF 向量
    query_tfidf = get_tfidf_vector(query_tokens, all_tokens_list)
    
    # 5. 计算每首音乐与查询的相似度
    results = []
    for doc in music_documents:
        music_tfidf = get_tfidf_vector(doc['tokens'], all_tokens_list)
        similarity = cosine_similarity(query_tfidf, music_tfidf)
        
        if similarity > 0.01:  # 保留任何有相似度的结果
            results.append({
                'music': doc['music'],
                'similarity': similarity
            })
    
    # 6. 按相似度降序排序
    results.sort(key=lambda x: x['similarity'], reverse=True)
    
    return results


# ==================== 测试函数 ====================
def test_search_from_database(keyword="周杰伦"):
    """
    测试函数：从数据库读取数据，搜索与关键词相似的内容
    
    参数:
        keyword: 搜索关键词，默认为"周杰伦"
    
    功能:
        1. 连接数据库读取 music_info 表所有记录
        2. 遍历每条记录，检查歌名、歌手、专辑、歌词是否与关键词相似
        3. 只要有一项相似就输出该条记录
    """
    import pymysql
    
    print(f"\n{'='*60}")
    print(f"🔍 开始测试搜索功能 - 关键词：'{keyword}'")
    print(f"{'='*60}\n")
    
    # 1. 连接数据库
    try:
        db = pymysql.connect(
            host='localhost',
            user='root',
            password='123456',  # 请修改为你的数据库密码
            database='coolmusic',
            charset='utf8mb4'
        )
        cursor = db.cursor()
        print("✓ 数据库连接成功")
    except Exception as e:
        print(f"✗ 数据库连接失败：{e}")
        return
    
    # 2. 读取所有音乐数据
    try:
        sql = "SELECT * FROM music_info"
        cursor.execute(sql)
        results = cursor.fetchall()
        print(f"✓ 从数据库读取了 {len(results)} 条记录\n")
    except Exception as e:
        print(f"✗ 读取数据库失败：{e}")
        db.close()
        return
    
    # 3. 获取所有字段名
    columns = [desc[0] for desc in cursor.description]
    print(f"📋 数据表字段：{columns}\n")
    
    # 4. 遍历每条记录，检查是否有关联字段与关键词相似
    matched_count = 0
    total_count = len(results)
    
    print(f"🔍 开始逐条比对 {total_count} 条记录...\n")
    
    for row in results:
        # 将行数据转换为字典
        music_data = dict(zip(columns, row))
        
        # 提取需要比对的字段
        music_name = str(music_data.get('music_name', '') or '')
        author = str(music_data.get('author', '') or '')
        album = str(music_data.get('album', '') or '')
        lyrics = str(music_data.get('lyrics', '') or '')
        
        # 检查每个字段是否与关键词相似
        is_matched = False
        matched_fields = []
        
        # 检查歌名
        if keyword in music_name or music_name in keyword:
            is_matched = True
            matched_fields.append('歌名')
        
        # 检查歌手
        if keyword in author or author in keyword:
            is_matched = True
            matched_fields.append('歌手')
        
        # 检查专辑
        if keyword in album or album in keyword:
            is_matched = True
            matched_fields.append('专辑')
        
        # 检查歌词（只要歌词中包含关键词）
        if keyword in lyrics:
            is_matched = True
            matched_fields.append('歌词')
        
        # 如果有任何字段匹配，输出该条记录
        if is_matched:
            matched_count += 1
            print(f"\n{'='*60}")
            print(f"✅ 找到匹配记录 (匹配字段：{', '.join(matched_fields)})")
            print(f"{'='*60}")
            print(f"ID: {music_data.get('id', 'N/A')}")
            print(f"歌名：{music_name}")
            print(f"歌手：{author}")
            print(f"专辑：{album}")
            print(f"歌词预览：{lyrics[:100]}{'...' if len(lyrics) > 100 else ''}")
            print(f"匹配字段详情:")
            if '歌名' in matched_fields:
                print(f"  - 歌名包含：'{music_name}'")
            if '歌手' in matched_fields:
                print(f"  - 歌手包含：'{author}'")
            if '专辑' in matched_fields:
                print(f"  - 专辑包含：'{album}'")
            if '歌词' in matched_fields:
                # 显示歌词中包含关键词的部分
                import re
                # 找到关键词在歌词中的位置
                match_positions = []
                start = 0
                while True:
                    pos = lyrics.find(keyword, start)
                    if pos == -1:
                        break
                    match_positions.append(pos)
                    start = pos + len(keyword)
                
                # 显示关键词前后的歌词片段
                for pos in match_positions[:3]:  # 最多显示 3 处匹配
                    start_pos = max(0, pos - 20)
                    end_pos = min(len(lyrics), pos + len(keyword) + 20)
                    snippet = lyrics[start_pos:end_pos]
                    print(f"  - 歌词片段：'...{snippet}...'")
            print()
    
    # 5. 输出统计信息
    print(f"\n{'='*60}")
    print(f"📊 搜索完成统计")
    print(f"{'='*60}")
    print(f"总记录数：{total_count}")
    print(f"匹配记录数：{matched_count}")
    print(f"匹配率：{matched_count/total_count*100:.2f}%" if total_count > 0 else "总记录数为 0")
    print(f"{'='*60}\n")
    
    # 关闭数据库连接
    db.close()
    print("✓ 数据库连接已关闭")
    
    return matched_count


if __name__ == '__main__':
    # 运行测试
    test_search_from_database("周杰伦")
