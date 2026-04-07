from django.db import models

# Create your models here.
class MusicInfo(models.Model):
    id = models.AutoField(primary_key=True)
    music_id = models.IntegerField()
    music_name = models.CharField(max_length=100)
    author_id = models.IntegerField()
    author = models.CharField(max_length=50)
    album = models.CharField(max_length=100)
    album_cover = models.URLField()
    lyrics = models.TextField()
    real_url = models.URLField()
    play_url = models.URLField()
    country = models.CharField(max_length=20)
    like_count = models.IntegerField(default=0)
    click_count = models.IntegerField(default=0)
    
    def __str__(self):
        return self.music_name
    
    class Meta:
        db_table = 'music_info'
        
class LikeMusics(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.CharField(max_length=100)  # 用户ID
    music_id = models.CharField(max_length=50)
    music_name = models.CharField(max_length=200)
    click_count = models.IntegerField(default=0)
    is_liked = models.IntegerField(default=0)  # 0: 不喜爱, 1: 喜爱
    create_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.music_name} - {self.is_liked}"

class CommunityRecords(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.CharField(max_length=100)  # 用户ID
    user_nickname = models.CharField(max_length=100)  # 用户昵称
    user_avatar = models.URLField()  # 用户头像
    publish_time = models.DateTimeField(auto_now_add=True)  # 发布时间
    content = models.TextField()  # 文本内容（包含格式标记的JSON）
    images = models.TextField(default='[]')  # 图片信息（JSON数组）
    audios = models.TextField(default='[]')  # 音频信息（JSON数组）
    location = models.CharField(max_length=200, blank=True)  # 位置
    likes = models.IntegerField(default=0)  # 点赞量
    encoding = models.CharField(max_length=20, default='utf-8')  # 编码方式
    
    def __str__(self):
        return f"{self.user_nickname} - {self.publish_time}"
    
    class Meta:
        db_table = 'community_records'
        ordering = ['-publish_time']  # 默认按时间倒序