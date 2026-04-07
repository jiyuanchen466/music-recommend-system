import torch
import torchvision.transforms as transforms
from torchvision import models
from PIL import Image
import os
from io import BytesIO

# -----------------------------
# 1. 预训练模型（ResNet50）
# ------------------------------ 
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.resnet50(pretrained=True)
model = model.to(device)
model.eval()

# -----------------------------
# 2. ImageNet 标签（1000类）

# 使用 __file__ 相对于脚本位置读取文件
# ------------------------------ 
current_dir = os.path.dirname(os.path.abspath(__file__))
classes_file = os.path.join(current_dir, "imagenet_classes.txt")
with open(classes_file) as f:
    imagenet_classes = [line.strip() for line in f.readlines()]

# -----------------------------
# 3. 音乐推荐映射
# -----------------------------
music_map = {
    "beach": ["夏日流行", "轻快电子"],
    "sunset": ["轻音乐", "钢琴曲"],
    "sunrise": ["清新民谣", "轻快钢琴"],
    "city": ["电子", "节奏感强"],
    "night": ["钢琴", "LoFi"],
    "street": ["独立摇滚", "爵士"],
    "room": ["轻柔人声", "沙发音乐"],
    "forest": ["自然声音", "舒缓音乐"],
    "mountain": ["古典", "轻音乐"],
    "rain": ["雨声", "抒情音乐"],
    "snow": ["轻音乐", "平静氛围"],
    "desert": ["世界音乐", "氛围电子"],
    "ocean": ["海浪声", "空灵女声"],
    "lake": ["民谣", "轻音乐"],
    "park": ["清新流行", "吉他独奏"],
    "garden": ["森系音乐", "竖琴"],
    "cafe": ["Bossa Nova", "爵士"],
    "library": ["安静钢琴", "无歌词音乐"],
    "countryside": ["乡村音乐", "口琴"],
    "happy": ["欢快流行", "舞曲"],
    "sad": ["抒情", "emo"],
    "lonely": ["慢速钢琴", "氛围音乐"],
    "relaxed": ["Chillhop", "轻音乐"],
    "romantic": ["爵士", "情歌"],
    "excited": ["电子摇滚", "高能量音乐"],
    "angry": ["金属", "硬核摇滚"],
    "calm": ["冥想音乐", "环境音"],
    "anxious": ["渐强弦乐", "实验电子"],
    "hopeful": ["励志流行", "轻快摇滚"],
    "nostalgic": ["老歌", "复古合成器"],
    "bored": ["独立流行", "轻松电子"],
    "surprised": ["管弦乐", "电影配乐"],
    "fearful": ["恐怖氛围", "低音提琴"],
    "grateful": ["治愈系音乐", "民谣"],
    "proud": ["史诗音乐", "管乐"],
    "melancholy": ["蓝调", "慢速钢琴"],
    "warm": ["木吉他", "暖调电子"],
    "dark": ["暗潮", "工业音乐"],
    "bright": ["清亮钢琴", "轻快流行"],
    "peaceful": ["环境音乐", "颂钵"],
    "noisy": ["噪音摇滚", "实验音乐"],
    "dreamy": ["梦泡", "合成器浪潮"],
    "energetic": ["电子舞曲", "摇滚"],
    "mysterious": ["神秘东方", "氛围电子"],
    "eerie": ["诡异弦乐", "黑暗氛围"],
    "chaotic": ["数学摇滚", "自由爵士"],
    "cozy": ["LoFi", "轻松爵士"],
    "cold": ["极简电子", "冰岛音乐"],
    "humid": ["热带浩室", "雷鬼"],
    "vintage": ["复古摇滚", "老爵士"],
    "futuristic": ["合成器流行", "科技舞曲"],
    "minimalist": ["极简钢琴", "重复乐句"],
    "colorful": ["世界音乐", "流行管弦"],
    "monochrome": ["单音音乐", "噪音墙"],
    "soft": ["耳语唱法", "软摇滚"],
    "harsh": ["工业金属", "噪音音乐"],
    "spring": ["清新民谣", "轻快口琴"],
    "summer": ["冲浪摇滚", "热带浩室"],
    "autumn": ["爵士", "慢速钢琴"],
    "winter": ["古典", "温暖电子"],
    "morning": ["轻快闹钟音乐", "清新吉他"],
    "noon": ["明亮流行", "打击乐"],
    "afternoon": ["休闲爵士", "独立流行"],
    "evening": ["弛放音乐", "沙发电子"],
    "midnight": ["LoFi", "氛围钢琴"],
    "cat": ["轻松乐", "可爱风", "竖琴拨奏"],
    "dog": ["活力音乐", "流行", "朋克"],
    "bird": ["轻音乐", "自然声音", "长笛"],
    "fish": ["水下氛围", "舒缓电子"],
    "travel": ["世界音乐", "独立民谣"],
    "workout": ["电子摇滚", "嘻哈"],
    "sleep": ["白噪音", "冥想音乐"],
    "study": ["钢琴", "LoFi"],
    "party": ["电子舞曲", "流行混音"],
}

# -----------------------------
# 4. 图像预处理
# -----------------------------
transform = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

# -----------------------------
# 5. 预测函数
# -----------------------------
def predict_image(image_path):
    img = Image.open(image_path).convert('RGB')
    img_t = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(img_t)
        _, predicted_idx = outputs.max(1)
        class_name = imagenet_classes[predicted_idx.item()]

    # 转小写，用于匹配音乐
    key = class_name.lower()
    recommended_music = []
    for k in music_map:
        if k in key:
            recommended_music = music_map[k]
            break
    if not recommended_music:
        recommended_music = ["轻音乐", "流行"]  # 默认推荐

    return class_name, recommended_music

# -----------------------------
# 6. 从字节数据预测（用于 Django 上传）
# ------------------------------ 
def predict_image_from_bytes(image_bytes):
    """
    从字节数据直接预测图像类别
    
    参数:
        image_bytes: 图像的字节数据
        
    返回:
        (class_name, recommended_music): 类别名称和推荐音乐列表
    """
    # 使用 BytesIO 在内存中处理字节数据
    image_file = BytesIO(image_bytes)
    img = Image.open(image_file).convert('RGB')
    img_t = transform(img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(img_t)
        _, predicted_idx = outputs.max(1)
        class_name = imagenet_classes[predicted_idx.item()]

    # 转小写，用于匹配音乐
    key = class_name.lower()
    recommended_music = []
    for k in music_map:
        if k in key:
            recommended_music = music_map[k]
            break
    if not recommended_music:
        recommended_music = ["轻音乐", "流行"]  # 默认推荐

    return class_name, recommended_music