import requests
from lxml import etree
import json
import execjs
import sys
import csv
import asyncio
import aiohttp
import pymysql
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.stdout.reconfigure(encoding='utf-8')

# 获取当前文件所在目录的绝对路径
current_dir = os.path.dirname(os.path.abspath(__file__))
neteasy_js_path = os.path.join(current_dir, 'neteasy.js')

with open(neteasy_js_path, 'r', encoding='utf-8') as f:
    js_code = f.read()
ctx = execjs.compile(js_code)

#获取歌曲链接
def get_netease_url(id):
    """
    获取网易云音乐播放链接
    参数：id - 音乐 ID（字符串或整数）
    返回：播放 URL 或 None
    """
    print(f"\n{'='*60}")
    print(f"=== 开始获取网易云音乐链接 ===")
    print(f"{'='*60}")
    print(f"音乐 ID: {id} (类型：{type(id).__name__})")
    
    url = 'https://music.163.com/weapi/song/enhance/player/url/v1?csrf_token=c1e3fcfd69720bd13f637cb4cd7f8614'
    headers = {
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'cookie':'_iuqxldmzr_=32; _ntes_nnid=f16d0c232b61e2d5403e4038a7f6de6f,1775131303391; _ntes_nuid=f16d0c232b61e2d5403e4038a7f6de6f; NMTID=00OZHzQIRi5tau0KEU3qQx2zVcdEHAAAAGdThIgMg; Hm_lvt_1483fb4774c02a30ffa6f0e2945e9b70=1775131304; HMACCOUNT=8D33C72FF23E6821; __snaker__id=KoxIOQw74lO9dRAr; WM_NI=OB2STik7XjiT%2B1G2ku5mY7lDai0EOXELetbkW%2FD%2BZ7CFJX6u1UEsGr6ZVHpJ23Bn0cflZWnp5M%2BCHX2Mq5Y%2Bm4fyngQmCnJn7YxFziWpialcWvG63N7hIyS6DZTcuNSlbjU%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eedaca6185f1f88cf35ebbeb8fa7c84e829b8eacd765f199bca7fb3b908e9689d72af0fea7c3b92a8d9efeb4d763a9e9988bec60e9ef89d3ea7ff7b397d8ef50a3b700a6ce548794ab95e16195f18cccd93d819a86b9b57ff38b8b94c67af6869aa9f342f2ed8e8fb369a6b496b8ed7cf793e5a4cb54f293bfd6dc21afecaa9aed6d93b38d8fc966f587b8a7f96395b0a782ef6995aa89d7b246f5b8879ad23e88869c84f84691b4ae8bd837e2a3; sDeviceId=YD-efYy6oWHuFhAAkEAQUfTsiC5VlhPC8HL; WM_TID=3dzudm1uDqtFVREREQOH9iGsAhwbQcxD; ntes_utid=tid._.rxT4ZH%252F%252FbbxEQxEAEAfD4nC8Ek1aSpXP._.0; JSESSIONID-WYYY=3eSU9lEWoUyE8aqT1k6ztSEEzyKfWqFhNN2H0P7SSDioDMgoAhsJfiq7jjRPKaf%2F8fxcP%5CCBoJYf%2BZx%5C3kaCPKGM%5CI8R3kHDM%5CjZk3RW3qrFf4bkgjxv4EfPxcfTDf4bj0SplQVlkNiKX0yg%5CB8vFF0AjlTPSr2DUSKXT0H0%2FogCTa2K%3A1775136208356; gdxidpyhxdE=LB%2B7GyEoAvJY2hAzO125ZGW2QQBZ%2FV4pm3dhX%2FXaldyRdKK%2Fwy5iKR%5CQYzX4vGihnvjXVbJVpGQi0j9o8BQsaG8ke7dkVI697mrca7Lrg1MUEknsb1Jzl1x6V0unHDsmiSE%2BgHgyxpKoRhIaaqf2mdM%2FOCOSb09N29j0a5mjx2Zpx0hE%3A1775135312249; __csrf=5b5f72a05c2075d8bf9e7fcbba629ce2; __remember_me=true; MUSIC_U=00DB11D8A8418884CD5232C095C37F6D3872EDE602EFB08A74F9AED705A576549DEB5101E1006EE7F852EB82DA75C4CB8274E63FECA0B286A4A3D28440A0B4C10245F4A47271C8C2B01B960486173F703A46C2F54AB18106D90730ABDF26896D629B70233270B865F6B5E46B505A68B1B7BAA766AC308E9E18B4199532058FFE151DDBC2C7FF70A846225327A3ED196836181C6B35719F48ABAFB14997D10CB273C339F34DBB797B08C66E7FF3F0B000EB0EC55AAC8C73917207B66CCBB71E4B589E3CAD135A4AD7E3FF0BFFCB284151521C5C5C20C58B75629DC8B26D1DD8BDC38B7216D3E9F11B82A0EE4BB02C022EA1404BDBA0DA62BB6899A89F27841790EDCF8AAF5363442F4C4F3A904372D8B19EA1B728769EEDF15745F16DBE604F95E00CB5D5495C63F8F40B4E6495D29938AD4E5B84B8EFA5F94AB991E4FC434BD85E1B663D7F62D46E433771E616571DA6DADF6FD9221663FA71D0B34CF86315B46FCED78EB28E1E14E24B1CCD265200DCE3BBD8ACFF96D2D696FEDFA110375F83501DC4085AED797FBAB12A49DA53F86E77; Hm_lpvt_1483fb4774c02a30ffa6f0e2945e9b70=1775134439; ntes_kaola_ad=1'
    }
    
    try:
        # 确保 id 是字符串
        id_str = str(id)
        print(f"转换后的 ID 字符串：{id_str}")
        
        # 调用 JS 加密
        print("调用 neteasy.js 进行加密...")
        data = ctx.call('GetASR', id_str)
        
        if not data or 'params' not in data or 'encseckey' not in data:
            print("错误：JS 加密返回的数据不完整")
            print(f"加密返回数据：{data}")
            return None
        
        print(f"✓ 加密成功")
        print(f"  - params 前 50 字符：{data['params'][:50]}...")
        print(f"  - encSecKey 前 50 字符：{data['encseckey'][:50]}...")
        
        post_data = {
            'params': data['params'],
            'encSecKey': data['encseckey']
        }
        
        # 发送请求
        print(f"\n发送 POST 请求到网易云 API...")
        print(f"请求 URL: {url[:100]}...")
        print(f"请求数据大小：params={len(post_data['params'])}, encSecKey={len(post_data['encSecKey'])}")
        
        response = requests.post(url, headers=headers, data=post_data, timeout=10)
        print(f"✓ 收到响应")
        print(f"  - 状态码：{response.status_code}")
        print(f"  - 响应内容类型：{response.headers.get('Content-Type', 'Unknown')}")

        # 解析响应
        try:
            response_json = response.json()
            print(f"\n响应 JSON 结构:")
            print(f"  - 顶层 keys: {list(response_json.keys())}")
            
            # 检查是否有错误
            if 'code' in response_json and response_json['code'] != 200:
                print(f"警告：API 返回非 200 状态码：{response_json['code']}")
            
            # 检查 data 字段
            if 'data' in response_json:
                print(f"  - data 类型：{type(response_json['data'])}")
                print(f"  - data 长度：{len(response_json['data']) if isinstance(response_json['data'], list) else 'N/A'}")
                
                if isinstance(response_json['data'], list) and len(response_json['data']) > 0:
                    first_item = response_json['data'][0]
                    print(f"  - 第一个项目 keys: {list(first_item.keys())}")
                    
                    if 'url' in first_item:
                        music_url = first_item['url']
                        print(f"\n✓✓✓ 成功获取音乐 URL:")
                        print(f"  URL: {music_url}")
                        print(f"  URL 长度：{len(music_url)}")
                        
                        # 验证 URL
                        if music_url and music_url.startswith('http'):
                            print(f"✓ URL 格式有效")
                            print(f"{'='*60}\n")
                            return music_url
                        else:
                            print(f"✗ URL 格式无效或为空")
                            return None
                    else:
                        print(f"✗ 第一个项目中没有 'url' 字段")
                        print(f"第一个项目内容：{first_item}")
                        return None
                else:
                    print(f"✗ data 不是列表或为空")
                    return None
            else:
                print(f"✗ 响应中没有 'data' 字段")
                print(f"完整响应：{json.dumps(response_json, ensure_ascii=False)[:500]}")
                return None
                
        except json.JSONDecodeError as e:
            print(f"✗ JSON 解析失败：{e}")
            print(f"响应文本：{response.text[:500]}")
            return None
        except Exception as e:
            print(f"✗ 解析响应时出错：{e}")
            return None
            
    except Exception as e:
        print(f"\n✗✗✗ 获取音乐链接异常：{e}")
        import traceback
        print("异常堆栈:")
        traceback.print_exc()
        print(f"{'='*60}\n")
        return None

def validate_music_url(url):
    """
    验证音乐URL是否有效
    返回：(是否有效, 新URL 或 None)
    """
    if not url:
        return False, None
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://music.163.com/'
        }
        
        # 发送 HEAD 请求检查
        response = requests.head(url, headers=headers, timeout=5, allow_redirects=True)
        
        print(f"URL验证：{response.status_code}")
        
        # 检查状态码
        if response.status_code == 200:
            # 检查是否是音频文件
            content_type = response.headers.get('Content-Type', '')
            print(f"Content-Type: {content_type}")
            
            if 'audio' in content_type or 'mp3' in content_type or 'application/octet-stream' in content_type:
                print(f"✓ URL 有效")
                return True, response.url
            else:
                print(f"✗ 不是有效的音频格式")
                return False, None
        else:
            print(f"✗ URL 返回错误状态码：{response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"⚠️ 验证 URL 失败：{e}")
        return False, None


def get_audio_duration(url):
    """
    获取音频时长
    方法 1: 使用 ffprobe（如果安装了 ffmpeg）
    方法 2: 使用 mutagen 库（纯 Python）
    方法 3: 返回默认值
    """
    # 方法 1: 尝试使用 ffprobe
    try:
        import subprocess
        print(f"尝试使用 ffprobe 获取时长...")
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', url],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            duration = float(result.stdout.strip())
            print(f"✓ ffprobe 成功获取时长：{duration}秒")
            return int(duration)
        else:
            print(f"ffprobe 未返回有效结果")
    except FileNotFoundError:
        print("ffprobe 未安装，尝试其他方法...")
    except Exception as e:
        print(f"ffprobe 失败：{e}")
    
    # 方法 2: 尝试使用 mutagen 库
    try:
        from mutagen.mp3 import MP3
        from mutagen.oggvorbis import OggVorbis
        from mutagen.flac import FLAC
        import tempfile
        import requests
        
        print(f"尝试使用 mutagen 获取时长...")
        
        # 下载音频片段到临时文件（只下载前 1MB 来获取元数据）
        headers = {'Range': 'bytes=0-1048576'}  # 只下载前 1MB
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code in [200, 206]:
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
                f.write(response.content)
                temp_path = f.name
            
            try:
                # 尝试不同的格式
                try:
                    audio = MP3(temp_path)
                    duration = audio.info.length
                    print(f"✓ mutagen (MP3) 成功获取时长：{duration}秒")
                    return int(duration)
                except:
                    pass
                
                try:
                    audio = OggVorbis(temp_path)
                    duration = audio.info.length
                    print(f"✓ mutagen (OGG) 成功获取时长：{duration}秒")
                    return int(duration)
                except:
                    pass
                
                try:
                    audio = FLAC(temp_path)
                    duration = audio.info.length
                    print(f"✓ mutagen (FLAC) 成功获取时长：{duration}秒")
                    return int(duration)
                except:
                    pass
                    
            finally:
                # 清理临时文件
                try:
                    import os
                    os.unlink(temp_path)
                except:
                    pass
        else:
            print(f"mutagen 方法：无法下载音频片段，状态码 {response.status_code}")
            
    except ImportError:
        print("mutagen 库未安装，请运行：pip install mutagen")
    except Exception as e:
        print(f"mutagen 失败：{e}")
    
    # 方法 3: 返回默认值
    print("使用默认时长：300 秒（5 分钟）")
    return 300  # 默认 5 分钟




#获取歌词
def get_music_lyrics(id):
    url = 'https://music.163.com/weapi/song/lyric?csrf_token=c1e3fcfd69720bd13f637cb4cd7f8614'
    headers = {
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
    }
    data = ctx.call('GetASR1', id)
    data = {
        'params': data['params'],
        'encSecKey': data['encseckey']
    }
    response = requests.post(url, headers=headers, data=data).json()
    lyrics = response['lrc']['lyric']
    return lyrics
#获取歌曲详情(歌名，歌手，专辑，专辑封面)
def get_song_detail(id):
    url = 'https://music.163.com/weapi/v3/song/detail?csrf_token=de0a8eb8391e8be7235e0e3d8fcd7902'
    headers = {
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
    }
    data = ctx.call('GetASR2', id)
    data = {
        'params': data['params'],
        'encSecKey': data['encseckey']
    }
    response = requests.post(url, headers=headers, data=data).text
    source = json.loads(response)
    song_name = source['songs'][0]['name'] if source['songs'][0]['name'] else '未知歌曲'
    author = source['songs'][0]['ar'][0]['name'] if source['songs'][0]['ar'][0]['name'] else '未知歌手'
    album = source['songs'][0]['al']['name'] if source['songs'][0]['al']['name'] else '未知专辑'
    album_cover = source['songs'][0]['al']['picUrl'] if source['songs'][0]['al']['picUrl'] else '未知专辑封面'
    return song_name, author, album, album_cover
# 存储数据到mysql
def save_to_mysql():
    conn = pymysql.connect(host='localhost', user='root', password='123456', db='coolmusic', charset='utf8mb4')
    cursor = conn.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS music_info(id INT AUTO_INCREMENT PRIMARY KEY,music_id VARCHAR(50),music_name VARCHAR(255),author VARCHAR(255),album VARCHAR(255),album_cover VARCHAR(500),lyrics TEXT,real_url VARCHAR(500),play_url VARCHAR(500));""")
    conn.close()
    music_list = []
    with open('neteasy_music_id.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        next(reader)
        for i, row in enumerate(reader):
            music_name, music_id = row
            music_list.append((music_name, music_id))
    total = len(music_list)
    print(f"总歌曲数：{total}")
    batch_data = []
    batch_size = 50
    processed = 0
    # 定义每个任务的处理函数
    def process_one(music_name, music_id):
        try:
            song_name, author, album, album_cover = get_song_detail(music_id)
            lyrics = get_music_lyrics(music_id)
            real_url = get_netease_url(music_id)
            play_url = f"http://127.0.0.1:8000/music/play/{music_id}/"
            return (music_id, song_name, author, album, album_cover, lyrics, real_url, play_url)
        except Exception as e:
            print(f"跳过错误: {e} for music_id {music_id}")
            return None
    # 使用线程池，设置最大并发数
    max_workers = 20
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # 提交所有任务
        future_to_item = {executor.submit(process_one, name, mid): (name, mid) for name, mid in music_list}
        # 按完成顺序处理结果
        for future in as_completed(future_to_item):
            result = future.result()
            if result:
                batch_data.append(result)
                processed += 1
            # 达到批量大小时插入数据库
            if len(batch_data) >= batch_size:
                # 每个批次使用独立的数据库连接
                conn_insert = pymysql.connect(host='localhost', user='root', password='123456', db='coolmusic', charset='utf8mb4')
                cursor_insert = conn_insert.cursor()
                cursor_insert.executemany("INSERT INTO music_info(music_id,music_name,author,album,album_cover,lyrics,real_url,play_url) VALUES(%s,%s,%s,%s,%s,%s,%s,%s);", batch_data)
                conn_insert.commit()
                cursor_insert.close()
                conn_insert.close()
                print(f"已插入 {processed} 条")
                batch_data.clear()
            # 每处理一定数量可以简单打印进度
            if processed % 100 == 0:
                print(f"进度: {processed}/{total}")
        # 处理剩余数据
        if batch_data:
            conn_insert = pymysql.connect(host='localhost', user='root', password='123456', db='coolmusic', charset='utf8mb4')
            cursor_insert = conn_insert.cursor()
            cursor_insert.executemany("INSERT INTO music_info(music_id,music_name,author,album,album_cover,lyrics,real_url,play_url) VALUES(%s,%s,%s,%s,%s,%s,%s,%s);", batch_data)
            conn_insert.commit()
            cursor_insert.close()
            conn_insert.close()
            print(f"最后一批插入完成，共 {processed} 条")
    print("全部插入完成")
#附属
def get_neteasy_artist_id():
    url = 'https://music.163.com/weapi/cloudsearch/get/web?csrf_token=c1e3fcfd69720bd13f637cb4cd7f8614'
    headers = {
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'referer':'https://music.163.com/search/',
        'accept-encoding': 'gzip, deflate, br, zstd',
        "Content-Type": "application/x-www-form-urlencoded",
        'cookie':'_ntes_nnid=03133ac6d0d58e41f95cfb868b4094c7,1770201507086; _ntes_nuid=03133ac6d0d58e41f95cfb868b4094c7; NMTID=00Ob42YsNmBkdSIC0NOoSVeojSb804AAAGcKDtpeg; WEVNSM=1.0.0; WNMCID=pqtuqp.1770201511154.01.0; WM_TID=eCifY5PIkBFBFBBREEPTsEiRH8su0hQb; __snaker__id=5ITSich7lUKp47SJ; sDeviceId=YD-LYjwv7jlEshFUlFRFFKS4QnVW5%2FVD2U3; __remember_me=true; ntes_utid=tid._.bQ6RPRUa54dARlQERROH9UzFH96VXzE1._.0; ntes_kaola_ad=1; hb_MA-BFB6-AC673A756684_source=mail.163.com; Hm_lvt_1483fb4774c02a30ffa6f0e2945e9b70=1770201508,1770350244,1770791783; HMACCOUNT=5289B0AC0C133300; _iuqxldmzr_=32; playerid=25817844; hb_MA-9ADA-91BF1A6C9E06_source=www.google.com; timing_user_id=time_iyr0fmS9rt; NTES_YD_SESS=cenCOZjr7__j_yCp.bv2R8D54r0OcsKi0bfny93Ju9mkZ2qhZLps8NKWRe8JrKSnpOOD02fpJeLZ6wDt0xLBF08DrWWRfuHh_k3gfoNHyTO9jrVQRRMZD3H.PAFtPOg5.rK_rE38lQwu5O82j7p34DIG1OY37QdFdaWUDS6W5gN2lUWnr0TdUxxI_DzrJEnI6rdQli8wAf5loebJlX0F2j9jbDeUG42fA; S_INFO=1771731271|0|0&60##|13255479029; P_INFO=13255479029|1771731271|1|oahz|00&99|null&null&null#shd&370100#10#0|&0||13255479029; JSESSIONID-WYYY=UTVPi7E8INzcs7tFi5ZgDmE42di%5CQNNei50u9nmYIfGCjyPrq8012VsftSBFOxyBy9ViB6tRP5OUDRmcxb%5CssjJgFvI4gAyPBv7EReID2g1lGzKJZpoSfUE65ZnPTvA%2FT3cAANA86XqRYw8DueEz6dvopHsbwXWbMzR6ueRt8dNtWOUK%3A1771758340046; WM_NI=zaum6drM6nNU%2Fe5ackPSAHHloZOqIYd5VClf%2Fu816aEZcv7dzqbNP0jTb3o%2BcHe%2BPiofCLOdSOteKEGa1jI3i2lBiUGPrKLkjLRLSJ4rrqBNUDIxBp%2FIgRqV5zxXeYc6SXE%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eeb9e17bb4b99a90b4348fbc8aa7d15a979b8ab0db348a8ba2b2c55ab2a8b699d42af0fea7c3b92ababfbb8eb570b293fa8fcd5fedbbfb82e261948d8fa9cb68ad868192cc53a8eb9aa4ef6eedabf8d2b56b8786ad97b670baafaeafd33caa8caed4ee21a198abccd363adba8dadce709191bc86ca4f85bfff8bcc39abeea4a3ec5f8590beaccf61aa949eadd242f8aebe92c146979c8799c17ced97a9b3f45ef7a6b8b9e853a1ea9db9c837e2a3; gdxidpyhxdE=MuVtchrSNDVErC0miOWnNwZmBpKxj0w3wOU29%2Fe%2BGjzYK8euM%2FBZA5z5U%2BqQ7VVzmWBi%2FZ43oxe00OZvId32%2Ftq4xgVeSGm%2FudWsi2qzjXA0MPY1K%2BaswNYE%5C367%2Fda9XumoqrAEmJHx0VvAPr6KN%5CutuQHw1QOaHYYJd5Gu8nUw5PIl%3A1771758828250; MUSIC_U=0017C82528406AC74C5FE89A9DFDE646680F12212326D6823117492F38C9D38C729CCA87AF23DC2591AA320613D9DFEF0BC7A784465CE8A0FA60F68FE909D8AF51E22B1FDEF53B521B93B73BED5FB127A5A85C177E69F3DB8E51EB8116C62ACC904E4AECBB04B736C5D61127C012B64F87729920477A9BBE3CD86C1537F9967B6D863EC28A1880A19A5F65964FE88B380101B4862F5A4C37817311700EB7E1E703F100CCC14644099C7820EB546EB31BE546C9AA510A051ABB90A227A2BBB7205AD30120A23B821AEAEEEADF331198AEC4ED0B4C6E8C2CEA6B8459921956569BB9DAE33DF7F6A279786A559430F2C3A04995072AAABF70C13A3980932B5234CEE27B0F3D178C6BD5908658736EC38BB670ED37ED2C4622F7C9D6688FC22FC4FF88182DBBD03BBEE1B63853EAB88A44AD3DA0C3388BBBB9BFA5D566970625B06051D91AEBF8C1FED40EB3DE70DBFDB2589AE75092397407E39B95A40730C4C351487CCDA7FC5798444060434DF62BC9C6A4AB4877B99258BE0EA1511FF1C4BB073542BB4AB4E48F8F76A56212977E597C80; __csrf=c1e3fcfd69720bd13f637cb4cd7f8614; Hm_lpvt_1483fb4774c02a30ffa6f0e2945e9b70=1771758230'
    }
    with open('neteasy.js', 'r', encoding='utf-8') as f:
        js_code = f.read()
    ctx = execjs.compile(js_code)
    data = ctx.call('GetListAre')
    data = {
        'params': data['params'],
        'encSecKey': data['encseckey']
    }
    response = requests.post(url, headers=headers, data=data).json()
    print(response)
    # songs = response['result']['songs']
    # for song in songs:
    #     name = song['name']
    #     print(name)
# 获取歌手id
def get_music_id(id):
    url = f'https://music.163.com/discover/artist/cat?id={id}'
    headers = {
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'cookie':'_ntes_nnid=03133ac6d0d58e41f95cfb868b4094c7,1770201507086; _ntes_nuid=03133ac6d0d58e41f95cfb868b4094c7; NMTID=00Ob42YsNmBkdSIC0NOoSVeojSb804AAAGcKDtpeg; WEVNSM=1.0.0; WNMCID=pqtuqp.1770201511154.01.0; WM_TID=eCifY5PIkBFBFBBREEPTsEiRH8su0hQb; __snaker__id=5ITSich7lUKp47SJ; sDeviceId=YD-LYjwv7jlEshFUlFRFFKS4QnVW5%2FVD2U3; __remember_me=true; ntes_utid=tid._.bQ6RPRUa54dARlQERROH9UzFH96VXzE1._.0; ntes_kaola_ad=1; hb_MA-BFB6-AC673A756684_source=mail.163.com; Hm_lvt_1483fb4774c02a30ffa6f0e2945e9b70=1770201508,1770350244,1770791783; HMACCOUNT=5289B0AC0C133300; _iuqxldmzr_=32; playerid=25817844; hb_MA-9ADA-91BF1A6C9E06_source=www.google.com; timing_user_id=time_iyr0fmS9rt; NTES_YD_SESS=cenCOZjr7__j_yCp.bv2R8D54r0OcsKi0bfny93Ju9mkZ2qhZLps8NKWRe8JrKSnpOOD02fpJeLZ6wDt0xLBF08DrWWRfuHh_k3gfoNHyTO9jrVQRRMZD3H.PAFtPOg5.rK_rE38lQwu5O82j7p34DIG1OY37QdFdaWUDS6W5gN2lUWnr0TdUxxI_DzrJEnI6rdQli8wAf5loebJlX0F2j9jbDeUG42fA; S_INFO=1771731271|0|0&60##|13255479029; P_INFO=13255479029|1771731271|1|oahz|00&99|null&null&null#shd&370100#10#0|&0||13255479029; MUSIC_U=0017C82528406AC74C5FE89A9DFDE646680F12212326D6823117492F38C9D38C729CCA87AF23DC2591AA320613D9DFEF0BC7A784465CE8A0FA60F68FE909D8AF51E22B1FDEF53B521B93B73BED5FB127A5A85C177E69F3DB8E51EB8116C62ACC904E4AECBB04B736C5D61127C012B64F87729920477A9BBE3CD86C1537F9967B6D863EC28A1880A19A5F65964FE88B380101B4862F5A4C37817311700EB7E1E703F100CCC14644099C7820EB546EB31BE546C9AA510A051ABB90A227A2BBB7205AD30120A23B821AEAEEEADF331198AEC4ED0B4C6E8C2CEA6B8459921956569BB9DAE33DF7F6A279786A559430F2C3A04995072AAABF70C13A3980932B5234CEE27B0F3D178C6BD5908658736EC38BB670ED37ED2C4622F7C9D6688FC22FC4FF88182DBBD03BBEE1B63853EAB88A44AD3DA0C3388BBBB9BFA5D566970625B06051D91AEBF8C1FED40EB3DE70DBFDB2589AE75092397407E39B95A40730C4C351487CCDA7FC5798444060434DF62BC9C6A4AB4877B99258BE0EA1511FF1C4BB073542BB4AB4E48F8F76A56212977E597C80; __csrf=c1e3fcfd69720bd13f637cb4cd7f8614; gdxidpyhxdE=itQ%5CHDHAYSSCCnzbTNnx6hqsSmeIGGfYPNUeZhszcv38jKrtIhJ4Y5ZoX4XGJ1iRGuJJHSjjA4DuOj4CWpI%2B7BiZL8lWWABnbR%2Fk35pfL7tM0Q%5CKC7l%2Bs5ymDXklU%2F%5Cp%2FrUh8q2mJBrqrPE4B3WSLK2RhQxjDUlSEGZALEdkZzSwwOzC%3A1771759696300; WM_NI=LjL%2BIcujoJsWF%2FWQc1ALZnecaP1OCa1AkiNEzxZFicMjm1%2FcYwnqdBqDo1ag30xLkVWFl0J9bSghlNQxPd8%2FuXA6Tu8AVOC%2F9FvWImB%2B9XPui9z4mIaD1aopmAosQijDT2I%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eeb2c86ef7bf8dbad967b0b08fb3c15b978f8eb0c2348a98c0d3f24fb199ba8aeb2af0fea7c3b92a90b684cccc69b7b6a1abf25d86f199b2e23b8394968fe869a390ffb0c26bf39fa58acd4fbaa896a7ec698fb6a3d2ae699ba9a292e74ab39ca1d2e46df1f0b8adea5e959aa4d1c933a28da989ef4693a8a085bb25b7888fd7d77ffc9f9ab0c225fb9abab8cc6782f5f7b9d37fabe7b6d5f043a39cff82ee7caf9fa194d463aa9c9cd3cc37e2a3; JSESSIONID-WYYY=EYU7IP8ytiupgoxZpQbmcF9c5QUknM8Mdgb0lZvQskSIOXyIcRD6mlj0M7jn9r7v6%2BVyHl%2BqFRZ4O7j3qzd9qFJGM0gXK4Edx0tmtptxnc%2FT3uriigfD%5CuiQAmXXUeHH2%5COO1bhrg%2BzYQO9HQjYBtKVuJEa9rqeGpUEA3297H6ClzJeW%3A1771934909506; Hm_lpvt_1483fb4774c02a30ffa6f0e2945e9b70=1771933534'
    }
    response = requests.get(url, headers=headers).text
    source = etree.HTML(response)
    lines = source.xpath('//a[@class="nm nm-icn f-thide s-fc0"]')
    for li in lines:
        artist_name = li.xpath('./text()')[0]
        artist_id = li.xpath('./@href')[0].split('=')[-1]
        print(artist_name, artist_id)
        with open('netease_artist_id.csv', 'a', encoding='utf-8-sig') as f:
            f.write(f'{artist_name},{artist_id}\n')
# 获取歌手歌曲id      
def get_aitist_music_id(artist_id):
    url = f'https://music.163.com/artist?id={artist_id}'
    headers = {
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'cookie':'_ntes_nnid=03133ac6d0d58e41f95cfb868b4094c7,1770201507086; _ntes_nuid=03133ac6d0d58e41f95cfb868b4094c7; NMTID=00Ob42YsNmBkdSIC0NOoSVeojSb804AAAGcKDtpeg; WEVNSM=1.0.0; WNMCID=pqtuqp.1770201511154.01.0; WM_TID=eCifY5PIkBFBFBBREEPTsEiRH8su0hQb; __snaker__id=5ITSich7lUKp47SJ; sDeviceId=YD-LYjwv7jlEshFUlFRFFKS4QnVW5%2FVD2U3; __remember_me=true; ntes_utid=tid._.bQ6RPRUa54dARlQERROH9UzFH96VXzE1._.0; ntes_kaola_ad=1; hb_MA-BFB6-AC673A756684_source=mail.163.com; Hm_lvt_1483fb4774c02a30ffa6f0e2945e9b70=1770201508,1770350244,1770791783; HMACCOUNT=5289B0AC0C133300; _iuqxldmzr_=32; playerid=25817844; hb_MA-9ADA-91BF1A6C9E06_source=www.google.com; timing_user_id=time_iyr0fmS9rt; NTES_YD_SESS=cenCOZjr7__j_yCp.bv2R8D54r0OcsKi0bfny93Ju9mkZ2qhZLps8NKWRe8JrKSnpOOD02fpJeLZ6wDt0xLBF08DrWWRfuHh_k3gfoNHyTO9jrVQRRMZD3H.PAFtPOg5.rK_rE38lQwu5O82j7p34DIG1OY37QdFdaWUDS6W5gN2lUWnr0TdUxxI_DzrJEnI6rdQli8wAf5loebJlX0F2j9jbDeUG42fA; S_INFO=1771731271|0|0&60##|13255479029; P_INFO=13255479029|1771731271|1|oahz|00&99|null&null&null#shd&370100#10#0|&0||13255479029; MUSIC_U=0017C82528406AC74C5FE89A9DFDE646680F12212326D6823117492F38C9D38C729CCA87AF23DC2591AA320613D9DFEF0BC7A784465CE8A0FA60F68FE909D8AF51E22B1FDEF53B521B93B73BED5FB127A5A85C177E69F3DB8E51EB8116C62ACC904E4AECBB04B736C5D61127C012B64F87729920477A9BBE3CD86C1537F9967B6D863EC28A1880A19A5F65964FE88B380101B4862F5A4C37817311700EB7E1E703F100CCC14644099C7820EB546EB31BE546C9AA510A051ABB90A227A2BBB7205AD30120A23B821AEAEEEADF331198AEC4ED0B4C6E8C2CEA6B8459921956569BB9DAE33DF7F6A279786A559430F2C3A04995072AAABF70C13A3980932B5234CEE27B0F3D178C6BD5908658736EC38BB670ED37ED2C4622F7C9D6688FC22FC4FF88182DBBD03BBEE1B63853EAB88A44AD3DA0C3388BBBB9BFA5D566970625B06051D91AEBF8C1FED40EB3DE70DBFDB2589AE75092397407E39B95A40730C4C351487CCDA7FC5798444060434DF62BC9C6A4AB4877B99258BE0EA1511FF1C4BB073542BB4AB4E48F8F76A56212977E597C80; __csrf=c1e3fcfd69720bd13f637cb4cd7f8614; gdxidpyhxdE=itQ%5CHDHAYSSCCnzbTNnx6hqsSmeIGGfYPNUeZhszcv38jKrtIhJ4Y5ZoX4XGJ1iRGuJJHSjjA4DuOj4CWpI%2B7BiZL8lWWABnbR%2Fk35pfL7tM0Q%5CKC7l%2Bs5ymDXklU%2F%5Cp%2FrUh8q2mJBrqrPE4B3WSLK2RhQxjDUlSEGZALEdkZzSwwOzC%3A1771759696300; WM_NI=LjL%2BIcujoJsWF%2FWQc1ALZnecaP1OCa1AkiNEzxZFicMjm1%2FcYwnqdBqDo1ag30xLkVWFl0J9bSghlNQxPd8%2FuXA6Tu8AVOC%2F9FvWImB%2B9XPui9z4mIaD1aopmAosQijDT2I%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eeb2c86ef7bf8dbad967b0b08fb3c15b978f8eb0c2348a98c0d3f24fb199ba8aeb2af0fea7c3b92a90b684cccc69b7b6a1abf25d86f199b2e23b8394968fe869a390ffb0c26bf39fa58acd4fbaa896a7ec698fb6a3d2ae699ba9a292e74ab39ca1d2e46df1f0b8adea5e959aa4d1c933a28da989ef4693a8a085bb25b7888fd7d77ffc9f9ab0c225fb9abab8cc6782f5f7b9d37fabe7b6d5f043a39cff82ee7caf9fa194d463aa9c9cd3cc37e2a3; JSESSIONID-WYYY=EYU7IP8ytiupgoxZpQbmcF9c5QUknM8Mdgb0lZvQskSIOXyIcRD6mlj0M7jn9r7v6%2BVyHl%2BqFRZ4O7j3qzd9qFJGM0gXK4Edx0tmtptxnc%2FT3uriigfD%5CuiQAmXXUeHH2%5COO1bhrg%2BzYQO9HQjYBtKVuJEa9rqeGpUEA3297H6ClzJeW%3A1771934909506; Hm_lpvt_1483fb4774c02a30ffa6f0e2945e9b70=1771933534'
    }
    response = requests.get(url, headers=headers).text
    source = etree.HTML(response)
    li_list = source.xpath('//ul[@class="f-hide"]/li')
    for li in li_list:
        try:
            music_name = li.xpath('./a/text()')[0]
            music_id = li.xpath('./a/@href')[0].split('=')[-1]
            print(music_name, music_id)
            with open('neteasy_music_id.csv', 'a', encoding='utf-8-sig') as f:
                f.write(f'{music_name},{music_id}\n')
        except:
            pass
# 保存歌曲国家
def get_music_country(id):
    country_dict = {'1001': '中国','1002':'中国','1003':'中国', '2001':'欧美','2002':'欧美','2003':'欧美', '6001':'日本','6002':'日本','6003':'日本', '7001':'韩国','7002':'韩国','7003':'韩国'}
    country = country_dict[id]
    url = f'https://music.163.com/discover/artist/cat?id={id}'
    headers = {
        'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'cookie':'_ntes_nnid=03133ac6d0d58e41f95cfb868b4094c7,1770201507086; _ntes_nuid=03133ac6d0d58e41f95cfb868b4094c7; NMTID=00Ob42YsNmBkdSIC0NOoSVeojSb804AAAGcKDtpeg; WEVNSM=1.0.0; WNMCID=pqtuqp.1770201511154.01.0; WM_TID=eCifY5PIkBFBFBBREEPTsEiRH8su0hQb; __snaker__id=5ITSich7lUKp47SJ; sDeviceId=YD-LYjwv7jlEshFUlFRFFKS4QnVW5%2FVD2U3; __remember_me=true; ntes_utid=tid._.bQ6RPRUa54dARlQERROH9UzFH96VXzE1._.0; ntes_kaola_ad=1; hb_MA-BFB6-AC673A756684_source=mail.163.com; Hm_lvt_1483fb4774c02a30ffa6f0e2945e9b70=1770201508,1770350244,1770791783; HMACCOUNT=5289B0AC0C133300; _iuqxldmzr_=32; playerid=25817844; hb_MA-9ADA-91BF1A6C9E06_source=www.google.com; timing_user_id=time_iyr0fmS9rt; NTES_YD_SESS=cenCOZjr7__j_yCp.bv2R8D54r0OcsKi0bfny93Ju9mkZ2qhZLps8NKWRe8JrKSnpOOD02fpJeLZ6wDt0xLBF08DrWWRfuHh_k3gfoNHyTO9jrVQRRMZD3H.PAFtPOg5.rK_rE38lQwu5O82j7p34DIG1OY37QdFdaWUDS6W5gN2lUWnr0TdUxxI_DzrJEnI6rdQli8wAf5loebJlX0F2j9jbDeUG42fA; S_INFO=1771731271|0|0&60##|13255479029; P_INFO=13255479029|1771731271|1|oahz|00&99|null&null&null#shd&370100#10#0|&0||13255479029; MUSIC_U=0017C82528406AC74C5FE89A9DFDE646680F12212326D6823117492F38C9D38C729CCA87AF23DC2591AA320613D9DFEF0BC7A784465CE8A0FA60F68FE909D8AF51E22B1FDEF53B521B93B73BED5FB127A5A85C177E69F3DB8E51EB8116C62ACC904E4AECBB04B736C5D61127C012B64F87729920477A9BBE3CD86C1537F9967B6D863EC28A1880A19A5F65964FE88B380101B4862F5A4C37817311700EB7E1E703F100CCC14644099C7820EB546EB31BE546C9AA510A051ABB90A227A2BBB7205AD30120A23B821AEAEEEADF331198AEC4ED0B4C6E8C2CEA6B8459921956569BB9DAE33DF7F6A279786A559430F2C3A04995072AAABF70C13A3980932B5234CEE27B0F3D178C6BD5908658736EC38BB670ED37ED2C4622F7C9D6688FC22FC4FF88182DBBD03BBEE1B63853EAB88A44AD3DA0C3388BBBB9BFA5D566970625B06051D91AEBF8C1FED40EB3DE70DBFDB2589AE75092397407E39B95A40730C4C351487CCDA7FC5798444060434DF62BC9C6A4AB4877B99258BE0EA1511FF1C4BB073542BB4AB4E48F8F76A56212977E597C80; __csrf=c1e3fcfd69720bd13f637cb4cd7f8614; gdxidpyhxdE=itQ%5CHDHAYSSCCnzbTNnx6hqsSmeIGGfYPNUeZhszcv38jKrtIhJ4Y5ZoX4XGJ1iRGuJJHSjjA4DuOj4CWpI%2B7BiZL8lWWABnbR%2Fk35pfL7tM0Q%5CKC7l%2Bs5ymDXklU%2F%5Cp%2FrUh8q2mJBrqrPE4B3WSLK2RhQxjDUlSEGZALEdkZzSwwOzC%3A1771759696300; WM_NI=LjL%2BIcujoJsWF%2FWQc1ALZnecaP1OCa1AkiNEzxZFicMjm1%2FcYwnqdBqDo1ag30xLkVWFl0J9bSghlNQxPd8%2FuXA6Tu8AVOC%2F9FvWImB%2B9XPui9z4mIaD1aopmAosQijDT2I%3D; WM_NIKE=9ca17ae2e6ffcda170e2e6eeb2c86ef7bf8dbad967b0b08fb3c15b978f8eb0c2348a98c0d3f24fb199ba8aeb2af0fea7c3b92a90b684cccc69b7b6a1abf25d86f199b2e23b8394968fe869a390ffb0c26bf39fa58acd4fbaa896a7ec698fb6a3d2ae699ba9a292e74ab39ca1d2e46df1f0b8adea5e959aa4d1c933a28da989ef4693a8a085bb25b7888fd7d77ffc9f9ab0c225fb9abab8cc6782f5f7b9d37fabe7b6d5f043a39cff82ee7caf9fa194d463aa9c9cd3cc37e2a3; JSESSIONID-WYYY=EYU7IP8ytiupgoxZpQbmcF9c5QUknM8Mdgb0lZvQskSIOXyIcRD6mlj0M7jn9r7v6%2BVyHl%2BqFRZ4O7j3qzd9qFJGM0gXK4Edx0tmtptxnc%2FT3uriigfD%5CuiQAmXXUeHH2%5COO1bhrg%2BzYQO9HQjYBtKVuJEa9rqeGpUEA3297H6ClzJeW%3A1771934909506; Hm_lpvt_1483fb4774c02a30ffa6f0e2945e9b70=1771933534'
    }
    conn = pymysql.connect(host='localhost', user='root', password='123456', db='coolmusic', charset='utf8mb4')
    cursor = conn.cursor()
    sql1 = "CREATE TABLE IF NOT EXISTS music_country (id INT PRIMARY KEY AUTO_INCREMENT, artist_name VARCHAR(255), country VARCHAR(255));"
    cursor.execute(sql1)
    response = requests.get(url, headers=headers).text
    source = etree.HTML(response)
    lines = source.xpath('//a[@class="nm nm-icn f-thide s-fc0"]')
    sql2 = "INSERT INTO music_country (artist_name, country) VALUES (%s, %s);"
    for li in lines:
        artist_name = li.xpath('./text()')[0]
        print(artist_name, country)
        cursor.execute(sql2, (artist_name, country))
    conn.commit()
def update_author_id():
    conn = pymysql.connect(
        host='localhost',
        user='root',
        password='123456',
        db='coolmusic',
        charset='utf8mb4'
    )
    cursor = conn.cursor()
    author_dict = {}
    with open('netease_artist_id.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) != 2:
                continue
            author, author_id = row
            author_dict[author.strip()] = author_id.strip()
    cursor.execute("SELECT id, author FROM music_info")
    rows = cursor.fetchall()
    count = 0
    for music_id, author in rows:
        if not author:
            continue
        author = author.strip()
        if author in author_dict:
            cursor.execute(
                "UPDATE music_info SET author_id=%s WHERE id=%s",
                (author_dict[author], music_id)
            )
            count += 1
    conn.commit()
    print("更新成功:", count)
    cursor.close()
    conn.close()
#获取排行榜数据
def get_top_list(id):
    url = f'https://music.163.com/discover/toplist?id={id}'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    }
    sqldb_name = id_dict[id]
    sql = f"INSERT INTO {sqldb_name} (music_id, music_name, author, album, album_cover, lyrics, real_url, play_url, like_count, click_count, comment_count) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
    response = requests.get(url, headers=headers).text
    source = etree.HTML(response)
    li_list = source.xpath('//ul[@class="f-hide"]/li')
    for li in li_list:
        music_id = li.xpath('./a/@href')[0].split('=')[-1]
        song_name, author, album, album_cover = get_song_detail(music_id)
        song_url = get_netease_url(music_id)
        lyrics = get_music_lyrics(music_id)
        print(song_name, author, album, album_cover, song_url)
        play_url = f"http://127.0.0.1:8000/music/play/{music_id}/"
        like_count = 0
        comment_count = 0
        click_count = 0
        cursor.execute(sql, (music_id, song_name, author, album, album_cover, lyrics, song_url, play_url, like_count, click_count, comment_count))
    conn.commit()
if __name__ == "__main__":
    conn = pymysql.connect(host='localhost', user='root', password='123456', db='coolmusic', charset='utf8mb4')
    cursor = conn.cursor()
    id_dict = {'19723756':'soaring_rank','3779629':'newsong_rank','3778678':'hotsong_rank','991319590':'chinese_rank','2809513713':'amarica_rank','745956260':'korea_rank','5059644681':'japan_rank'}
    # for id in id_dict:
    #     get_top_list(id)
    # update_author_id()
    print(get_netease_url('2686870381'))
    print(get_audio_duration(get_netease_url('2686870381')))
    # print(get_music_lyrics('108914'))
    # print(get_song_detail('108914'))
    # get_neteasy_artist_id()
    # save_to_mysql()
    # with open('netease_artist_id.csv', 'w', encoding='utf-8-sig') as f:
    #     f.write('artist_name,artist_id\n')
    # ids = ['1001', '1002', '1003', '2001', '2002', '2003', '6001', '6002', '6003', '7001', '7002', '7003']
    # for id in ids:
    #     get_music_country(id)
    # for id in ids:
    #     get_music_id(id)
    # with open('neteasy_music_id.csv', 'w', encoding='utf-8-sig') as f:
    #     f.write('music_name,music_id\n')
    # with open('netease_artist_id.csv', 'r', encoding='utf-8-sig') as f:
    #     reader = csv.reader(f)
    #     next(reader)
    #     for row in reader:
    #         try:
    #             artist_name, artist_id = row
    #             get_aitist_music_id(artist_id)
    #         except:
    #             pass
    