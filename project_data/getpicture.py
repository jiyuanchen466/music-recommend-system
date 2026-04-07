import requests
from lxml import etree
import json
import re
import os
import pymysql
import glob

def getdata(count, page):
    url = f'http://www.daimg.com/pic/%E5%A4%A7%E8%87%AA%E7%84%B6%E5%9B%BE%E7%89%87-0-0-0-0-0_{page}.html'
    headers =  {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'
    }
    response = requests.get(url, headers=headers).text
    source = etree.HTML(response)
    div_list = source.xpath('//ul[@class="ibox2_list"]/li')
    for li in div_list:
        img_url = li.xpath('./a/img/@src')[0]
        img_code = requests.get(img_url, headers=headers).content
        with open(f'../music/static/imgs/bgs/bg{count}.jpg', 'wb') as f:
            f.write(img_code)
        count += 1
    return count
def create_connection():
    """创建MySQL数据库连接"""
    try:
        connection = pymysql.connect(
            host='localhost',
            database='coolmusic',
            user='root',
            password='123456',
            charset='utf8mb4'
        )
        print("成功连接到MySQL数据库")
        return connection
    except Exception as e:
        print(f"连接MySQL数据库时出错: {e}")
        return None

def create_table(connection):
    """创建存储图片的表"""
    cursor = connection.cursor()
    create_table_query = """
    CREATE TABLE IF NOT EXISTS background_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image_data LONGBLOB NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    try:
        cursor.execute(create_table_query)
        connection.commit()
        print("数据表创建成功或已存在")
    except Exception as e:
        print(f"创建数据表时出错: {e}")

def save_local_images_to_db():
    """将本地图片保存到数据库"""
    connection = create_connection()
    if not connection:
        return
    
    try:
        create_table(connection)
        images_dir = "../music/static/imgs/bgs"
        full_images_dir = os.path.join(os.path.dirname(__file__), images_dir)
        
        if not os.path.exists(full_images_dir):
            print(f"图片目录不存在: {full_images_dir}")
            return
        
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.bmp', '*.webp']
        image_files = []
        for ext in image_extensions:
            image_files.extend(glob.glob(os.path.join(full_images_dir, ext)))
            image_files.extend(glob.glob(os.path.join(full_images_dir, ext.upper())))
        print(f"找到 {len(image_files)} 张图片")
        cursor = connection.cursor()
        for idx, img_path in enumerate(image_files):
            img_name = os.path.basename(img_path)
            check_query = "SELECT COUNT(*) FROM background_images WHERE name = %s"
            cursor.execute(check_query, (img_name,))
            result = cursor.fetchone()
            if result[0] > 0:
                print(f"图片 {img_name} 已存在，跳过")
                continue      
            try:
                with open(img_path, 'rb') as img_file:
                    image_data = img_file.read() 
                insert_query = """
                INSERT INTO background_images (name, image_data, description) 
                VALUES (%s, %s, %s)
                """
                description = f"自然风景图片 {img_name}"
                cursor.execute(insert_query, (img_name, image_data, description))
                connection.commit()
                print(f"[{idx+1}/{len(image_files)}] 图片 {img_name} 已保存到数据库")
                
            except Exception as e:
                print(f"保存图片 {img_name} 时出错: {e}")
                continue
    
    except Exception as e:
        print(f"执行过程中出错: {e}")
    
    finally:
        connection.close()
        print("MySQL连接已关闭")


def getcontent():
    data = ''
    path = '../music/static/imgs/bgs'
    files = os.listdir(path)
    for file in files:
        data += "'/static/imgs/bgs/" + file + "',"
    print(data)
            




if __name__ == '__main__':
    # if not os.path.exists('../music/static/imgs/bgs'):
    #     os.makedirs('../music/static/imgs/bgs')
    # count = 0
    # for i in range(1, 11):
    #     count = getdata(count, i)
    # save_local_images_to_db()
    getcontent()