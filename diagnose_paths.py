#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
路径诊断脚本 - 验证数据集路径问题是否解决
"""

import os
import sys

# 添加 music 包到路径
music_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, music_dir)

from music.markov_model import SCRIPT_DIR, DATASET_DIR, load_thchs30_dataset, log_header, log_success, log_error, log_warning


def diagnose_paths():
    """诊断路径问题"""
    log_header("🔍 路径诊断报告")
    
    print("\n【1】脚本目录信息")
    print(f"   脚本所在目录: {SCRIPT_DIR}")
    print(f"   目录存在: {os.path.exists(SCRIPT_DIR)}")
    
    print("\n【2】数据集目录信息")
    print(f"   数据集路径: {DATASET_DIR}")
    print(f"   路径存在: {os.path.exists(DATASET_DIR)}")
    
    # 检查各级目录
    data_thchs30_path = os.path.join(SCRIPT_DIR, 'data_thchs30')
    print(f"\n【3】目录层级检查")
    print(f"   data_thchs30 目录: {data_thchs30_path}")
    print(f"   data_thchs30 存在: {os.path.exists(data_thchs30_path)}")
    
    data_path = os.path.join(data_thchs30_path, 'data')
    print(f"   data_thchs30/data 目录: {data_path}")
    print(f"   data_thchs30/data 存在: {os.path.exists(data_path)}")
    
    # 查看 music 目录的文件
    print(f"\n【4】music 目录内容")
    try:
        items = os.listdir(SCRIPT_DIR)
        print(f"   目录项数: {len(items)}")
        print(f"   包含 data_thchs30: {'data_thchs30' in items}")
        print(f"   包含 markov_model.py: {'markov_model.py' in items}")
        
        # 列出前几项
        print(f"   目录内容样本:")
        for item in sorted(items)[:10]:
            is_dir = "[DIR]" if os.path.isdir(os.path.join(SCRIPT_DIR, item)) else "[FILE]"
            print(f"      {is_dir} {item}")
    except Exception as e:
        log_error(f"无法列出目录内容: {e}")
    
    # 尝试加载数据集
    print(f"\n【5】数据集加载测试")
    try:
        print(f"   尝试加载数据集（样本数: 5）...")
        thchs30_data = load_thchs30_dataset(limit=5)
        
        if thchs30_data:
            log_success(f"数据集加载成功！")
            print(f"      样本数: {thchs30_data['X_train'].shape[0]}")
            print(f"      特征维度: {thchs30_data['X_train'].shape[1]}")
            return True
        else:
            log_error(f"数据集加载失败")
            return False
    except Exception as e:
        log_error(f"加载异常: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_working_directory():
    """检查当前工作目录"""
    print(f"\n【6】当前工作目录")
    cwd = os.getcwd()
    print(f"   当前工作目录: {cwd}")
    print(f"   music 目录存在: {os.path.exists(os.path.join(cwd, 'music'))}")
    
    # 相对路径对比
    old_relative = os.path.join(cwd, "data_thchs30/data")
    print(f"\n【7】路径对比")
    print(f"   旧的相对路径效果:")
    print(f"      路径: {old_relative}")
    print(f"      存在: {os.path.exists(old_relative)}")
    
    print(f"\n   新的绝对路径效果:")
    print(f"      路径: {DATASET_DIR}")
    print(f"      存在: {os.path.exists(DATASET_DIR)}")


def main():
    """主函数"""
    success = diagnose_paths()
    check_working_directory()
    
    print(f"\n{'='*70}")
    if success:
        log_success("✅ 路径问题已解决！数据集可以正常加载")
        print(f"   现在无论从哪个目录运行代码都能正确找到数据集")
    else:
        log_error("❌ 路径问题未解决，请检查上面的诊断信息")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
