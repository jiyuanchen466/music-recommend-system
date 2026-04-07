# 炫音娱乐 - 智能语音交互音乐系统

本项目是一个基于 Django 的综合音乐平台，包含音乐大厅、语音/图片推荐、社区互动、个人中心、创作者中心、管理后台与多维数据分析能力。

项目当前主要使用 MySQL 作为业务数据库，前端采用 Django 模板 + 原生 JavaScript。

---

## 1. 核心功能

1. 音乐大厅
- 国家分类音乐展示（中国、欧美、日本、韩国）。
- 榜单数据浏览（飙升榜、新歌榜、热歌榜、国语榜、欧美榜、韩语榜、日语榜）。
- 音乐播放、评论、点赞、收藏等交互。

2. 智能推荐
- 音频推荐：基于 HMM（隐马尔可夫模型）对数据库特征进行无监督学习推荐。
- 图片推荐：基于 ResNet50 图像识别并映射音乐风格。
- 协同过滤推荐：基于用户喜好行为的 CF 混合推荐。

3. 搜索与相似度
- 基于 jieba + TF-IDF + 余弦相似度的中文音乐搜索。
- 支持歌名、歌手、专辑、歌词多字段搜索。

4. 用户与社区
- 注册、登录、找回密码、头像与昵称管理。
- 社区动态发布（文本、图片、音频）与点赞。
- 用户喜爱歌单与播放行为跟踪。

5. 创作者与管理后台
- 创作者申请、发布音乐、审核状态流转。
- 管理端音乐/评论/用户治理。
- 管理端数据分析：用户分布、用户活跃度、榜单热度、榜单趋势。

---

## 2. 技术栈

后端
- Django 3.1.12
- PyMySQL
- requests

算法与数据处理
- numpy
- scikit-learn
- hmmlearn
- jieba

图像推荐
- torch
- torchvision
- Pillow

前端
- Django Template
- 原生 JavaScript
- jQuery 3.6.0
- ECharts（管理后台统计图）

---

## 3. 目录结构（关键）

```text
音乐推荐系统/
├─ manage.py
├─ web/
│  ├─ settings.py
│  └─ urls.py
├─ music/
│  ├─ views.py                    # 主要业务接口
│  ├─ models.py                   # 核心数据模型
│  ├─ markov_model.py             # HMM 音频推荐
│  ├─ collaborative_filtering.py  # 协同过滤推荐
│  ├─ machine_learn.py            # TF-IDF 搜索
│  ├─ cnn.py                      # 图片推荐模型
│  ├─ data_analysis.py            # 管理后台分析逻辑
│  ├─ static/
│  │  ├─ js/
│  │  │  ├─ music_recommendation.js
│  │  │  └─ admin_page_real.js
│  │  └─ css/
│  └─ templates/
│     └─ music/
│        ├─ music_hall.html
│        ├─ music_recommendation.html
│        ├─ music_community.html
│        ├─ creator_centered.html
│        └─ my_music.html
└─ project_data/
   ├─ getdata.py
   └─ package.json
```

---

## 4. 环境准备

建议环境
- Python 3.9+（Windows）
- MySQL 5.7+ 或 8.x

安装依赖

```bash
pip install django==3.1.12 pymysql requests numpy scikit-learn hmmlearn jieba pillow torch torchvision
```

可选（project_data 下 Node 依赖）

```bash
cd project_data
npm install
```

---

## 5. 数据库配置

项目默认在 web/settings.py 中使用 MySQL：

- 数据库名：coolmusic
- 用户名：root
- 密码：123456
- 主机：localhost
- 端口：3306

请根据本地环境修改 web/settings.py 的 DATABASES 配置。

注意
- 项目中部分代码对 MySQL 结构有较强依赖（包括动态表名，如 user_id_like_musics）。
- music/__init__.py 已启用 pymysql.install_as_MySQLdb()。

---

## 6. 启动方式

1. 进入项目根目录

```bash
cd e:\Code\毕设\音乐推荐系统
```

2. 迁移数据库

```bash
python manage.py migrate
```

3. 启动开发服务

```bash
python manage.py runserver
```

4. 访问地址
- 首页：http://127.0.0.1:8000/
- 音乐推荐页：http://127.0.0.1:8000/music_recommendation/
- 管理登录页：http://127.0.0.1:8000/admin_login/

---

## 7. 关键接口说明

推荐相关
- POST /api/music/recommend-by-markov/
- POST /api/music/recommend-by-image/
- GET /api/recommendations/

播放与歌曲信息
- GET /api-get-play-url-for-recommendation/
- GET /api/proxy-music-stream/
- GET /api/music/info/

音乐大厅与搜索
- GET /get_music_by_country/
- GET /get_rank_data/
- GET /get_rank_comments/
- GET /api/music_hall/search/

用户与账号
- POST /register_user/
- POST /login_user/
- POST /logout_user/
- POST /update_password/
- GET /api/user/info/

社区
- POST /api/community/publish/
- GET /api/community/records/
- POST /api/community/like/

管理端分析
- GET /api/admin/user-distribution/
- GET /api/admin/user-activity/
- GET /api/admin/music-popularity/
- GET /api/admin/rank-trend/

---

## 8. 推荐模块说明（最新）

HMM 推荐位于 music/markov_model.py，当前流程：

1. 从 music_info 读取特征：
- 点赞数 like_count
- 点击数 click_count
- 国家编码
- 热度
- 歌词长度 lyric_length
- 歌词词元数 lyric_token_count

2. 对特征做标准化并训练 GaussianHMM。

3. 训练过程含稳定性处理：
- 自动降隐状态数重试。
- 修复 startprob_ 与 transmat_ 归一化，避免 transmat 行和为 0 的报错。

4. 直接返回真实推荐结果（不再随机映射到其它歌曲）。

---

## 9. 常见问题排查

1. 报错：导入 recommend_music 失败
- 检查 music/markov_model.py 是否存在 recommend_music 函数。
- 检查文件末尾是否有语法错误（如重复或空的 if __name__ == "__main__" 块）。

2. 报错：transmat_ rows must sum to 1
- 这是 HMM 训练空状态导致的典型问题。
- 当前代码已包含自动降阶与矩阵修复逻辑，若仍出现可减少 n_components 或增大样本量。

3. 服务提示有未迁移
- 执行 python manage.py migrate。

4. MySQL 连接失败
- 检查数据库服务是否启动。
- 检查 web/settings.py 中账号密码、端口、库名。

5. 图片推荐加载慢
- 首次加载 ResNet50 权重耗时较长，属于正常现象。

---

## 10. 安全与生产建议

当前项目适合开发/学习环境，若部署生产建议：

- 将数据库密码、邮箱密钥等敏感信息改为环境变量。
- 关闭 DEBUG，配置 ALLOWED_HOSTS。
- 使用 Gunicorn/Uvicorn + Nginx。
- 引入 Redis 做缓存与会话。
- 增加接口鉴权、限流、日志与监控。

---

## 11. 维护建议

- 将超大 views.py 按领域拆分为多个模块（auth、recommendation、community、admin、analytics）。
- 为关键接口补充单元测试与集成测试。
- 增加 requirements.txt 或 pyproject.toml 固化依赖版本。
- 给核心推荐接口记录输入输出样本，便于回归验证。

---

如需我继续补一份“接口测试手册（Postman 版）”或“部署文档（Windows + MySQL + Nginx）”，可以在本 README 基础上直接扩展。