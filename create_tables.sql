-- 炫音娱乐 / 音乐推荐系统数据库建表脚本
-- 数据库名：coolmusic
-- 说明：
-- 1. 这里按照当前项目代码中实际使用的字段编写。
-- 2. 7 个榜单表结构保持一致。
-- 3. 榜单评论表使用当前代码兼容的拼写：*_rank_coments。
--    如果你想和界面上的命名统一，可将 coments 改成 comments 后再同步修改代码。

CREATE DATABASE IF NOT EXISTS `coolmusic`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `coolmusic`;

-- =====================================================================
-- 1. 用户表
-- =====================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` VARCHAR(20) NOT NULL COMMENT '用户ID（7位以上随机数字）',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名（账号）',
  `nickname` VARCHAR(255) DEFAULT NULL COMMENT '昵称',
  `gender` INT DEFAULT NULL COMMENT '性别（0-男，1-女）',
  `birthday` DATE DEFAULT NULL COMMENT '生日',
  `region` VARCHAR(255) DEFAULT NULL COMMENT '地区',
  `introduce` VARCHAR(255) DEFAULT NULL COMMENT '介绍',
  `password` VARCHAR(100) NOT NULL COMMENT '密码',
  `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
  `is_creator` TINYINT DEFAULT 0 COMMENT '是否为创作者（0-普通用户，1-音乐创作者）',
  `avatar` LONGTEXT DEFAULT NULL COMMENT '头像 URL',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. 邮箱验证码表
-- =====================================================================
CREATE TABLE IF NOT EXISTS `verification_codes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(100) NOT NULL COMMENT '邮箱',
  `code` VARCHAR(6) NOT NULL COMMENT '验证码',
  `create_time` DATETIME NOT NULL COMMENT '创建时间',
  `expire_time` DATETIME NOT NULL COMMENT '过期时间',
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_expire_time` (`expire_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. 音乐主表
-- =====================================================================
CREATE TABLE IF NOT EXISTS `music_info` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `music_id` VARCHAR(50) NOT NULL COMMENT '音乐ID',
  `music_name` VARCHAR(255) NOT NULL COMMENT '歌名',
  `author_id` VARCHAR(50) DEFAULT NULL COMMENT 'user_id',
  `author` VARCHAR(255) DEFAULT NULL COMMENT '歌手',
  `album` VARCHAR(255) DEFAULT NULL COMMENT '专辑',
  `album_cover` VARCHAR(500) DEFAULT NULL COMMENT '封面',
  `lyrics` TEXT DEFAULT NULL COMMENT '歌词',
  `real_url` VARCHAR(500) DEFAULT NULL COMMENT '链接编码后的链接',
  `play_url` VARCHAR(500) DEFAULT NULL COMMENT '链接',
  `country` VARCHAR(255) DEFAULT NULL COMMENT '国家',
  `like_count` INT DEFAULT 0 COMMENT '点赞数',
  `click_count` INT DEFAULT 0 COMMENT '点击量',
  `comment_count` INT DEFAULT 0 COMMENT '评论数',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_music_id` (`music_id`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_country` (`country`),
  KEY `idx_like_count` (`like_count`),
  KEY `idx_click_count` (`click_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 4. 榜单表（7 个，结构一致）
-- =====================================================================

CREATE TABLE IF NOT EXISTS `soaring_rank` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `music_id` VARCHAR(50) NOT NULL COMMENT '首个随机小写字母+随机7-10位数字',
  `music_name` VARCHAR(255) NOT NULL COMMENT '歌名',
  `author_id` VARCHAR(50) DEFAULT NULL COMMENT 'user_id',
  `author` VARCHAR(255) DEFAULT NULL COMMENT '歌手',
  `album` VARCHAR(255) DEFAULT NULL COMMENT '专辑',
  `album_cover` LONGTEXT DEFAULT NULL COMMENT '封面',
  `lyrics` TEXT DEFAULT NULL COMMENT '歌词',
  `real_url` LONGTEXT DEFAULT NULL COMMENT '链接编码后的链接',
  `play_url` LONGTEXT DEFAULT NULL COMMENT '链接',
  `country` VARCHAR(255) DEFAULT NULL COMMENT '国家',
  `like_count` INT DEFAULT 0 COMMENT '点赞数',
  `click_count` INT DEFAULT 0 COMMENT '点击量',
  `comment_count` INT DEFAULT 0 COMMENT '评论数',
  `create_datetime` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_soaring_music_id` (`music_id`),
  KEY `idx_soaring_author_id` (`author_id`),
  KEY `idx_soaring_country` (`country`),
  KEY `idx_soaring_like_count` (`like_count`),
  KEY `idx_soaring_click_count` (`click_count`),
  KEY `idx_soaring_create_datetime` (`create_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `newsong_rank` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `music_id` VARCHAR(50) NOT NULL COMMENT '首个随机小写字母+随机7-10位数字',
  `music_name` VARCHAR(255) NOT NULL COMMENT '歌名',
  `author_id` VARCHAR(50) DEFAULT NULL COMMENT 'user_id',
  `author` VARCHAR(255) DEFAULT NULL COMMENT '用户昵称',
  `album` VARCHAR(255) DEFAULT NULL COMMENT '专辑',
  `album_cover` LONGTEXT DEFAULT NULL COMMENT '封面',
  `lyrics` TEXT DEFAULT NULL COMMENT '歌词',
  `real_url` LONGTEXT DEFAULT NULL COMMENT '链接编码后的链接',
  `play_url` LONGTEXT DEFAULT NULL COMMENT '链接',
  `country` VARCHAR(255) DEFAULT NULL COMMENT '国家',
  `like_count` INT DEFAULT 0 COMMENT '点赞数',
  `click_count` INT DEFAULT 0 COMMENT '点击量',
  `comment_count` INT DEFAULT 0 COMMENT '评论数',
  `create_datetime` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_newsong_music_id` (`music_id`),
  KEY `idx_newsong_author_id` (`author_id`),
  KEY `idx_newsong_country` (`country`),
  KEY `idx_newsong_like_count` (`like_count`),
  KEY `idx_newsong_click_count` (`click_count`),
  KEY `idx_newsong_create_datetime` (`create_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hotsong_rank` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `music_id` VARCHAR(50) NOT NULL,
  `music_name` VARCHAR(255) NOT NULL,
  `author_id` VARCHAR(50) DEFAULT NULL,
  `author` VARCHAR(255) DEFAULT NULL,
  `album` VARCHAR(255) DEFAULT NULL,
  `album_cover` LONGTEXT DEFAULT NULL,
  `lyrics` TEXT DEFAULT NULL,
  `real_url` LONGTEXT DEFAULT NULL,
  `play_url` LONGTEXT DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `like_count` INT DEFAULT 0,
  `click_count` INT DEFAULT 0,
  `comment_count` INT DEFAULT 0,
  `create_datetime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_hotsong_music_id` (`music_id`),
  KEY `idx_hotsong_author_id` (`author_id`),
  KEY `idx_hotsong_country` (`country`),
  KEY `idx_hotsong_create_datetime` (`create_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chinese_rank` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `music_id` VARCHAR(50) NOT NULL,
  `music_name` VARCHAR(255) NOT NULL,
  `author_id` VARCHAR(50) DEFAULT NULL,
  `author` VARCHAR(255) DEFAULT NULL,
  `album` VARCHAR(255) DEFAULT NULL,
  `album_cover` LONGTEXT DEFAULT NULL,
  `lyrics` TEXT DEFAULT NULL,
  `real_url` LONGTEXT DEFAULT NULL,
  `play_url` LONGTEXT DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `like_count` INT DEFAULT 0,
  `click_count` INT DEFAULT 0,
  `comment_count` INT DEFAULT 0,
  `create_datetime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chinese_music_id` (`music_id`),
  KEY `idx_chinese_author_id` (`author_id`),
  KEY `idx_chinese_country` (`country`),
  KEY `idx_chinese_create_datetime` (`create_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `america_rank` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `music_id` VARCHAR(50) NOT NULL,
  `music_name` VARCHAR(255) NOT NULL,
  `author_id` VARCHAR(50) DEFAULT NULL,
  `author` VARCHAR(255) DEFAULT NULL,
  `album` VARCHAR(255) DEFAULT NULL,
  `album_cover` LONGTEXT DEFAULT NULL,
  `lyrics` TEXT DEFAULT NULL,
  `real_url` LONGTEXT DEFAULT NULL,
  `play_url` LONGTEXT DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `like_count` INT DEFAULT 0,
  `click_count` INT DEFAULT 0,
  `comment_count` INT DEFAULT 0,
  `create_datetime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_america_music_id` (`music_id`),
  KEY `idx_america_author_id` (`author_id`),
  KEY `idx_america_country` (`country`),
  KEY `idx_america_create_datetime` (`create_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `korea_rank` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `music_id` VARCHAR(50) NOT NULL,
  `music_name` VARCHAR(255) NOT NULL,
  `author_id` VARCHAR(50) DEFAULT NULL,
  `author` VARCHAR(255) DEFAULT NULL,
  `album` VARCHAR(255) DEFAULT NULL,
  `album_cover` LONGTEXT DEFAULT NULL,
  `lyrics` TEXT DEFAULT NULL,
  `real_url` LONGTEXT DEFAULT NULL,
  `play_url` LONGTEXT DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `like_count` INT DEFAULT 0,
  `click_count` INT DEFAULT 0,
  `comment_count` INT DEFAULT 0,
  `create_datetime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_korea_music_id` (`music_id`),
  KEY `idx_korea_author_id` (`author_id`),
  KEY `idx_korea_country` (`country`),
  KEY `idx_korea_create_datetime` (`create_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `japan_rank` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `music_id` VARCHAR(50) NOT NULL,
  `music_name` VARCHAR(255) NOT NULL,
  `author_id` VARCHAR(50) DEFAULT NULL,
  `author` VARCHAR(255) DEFAULT NULL,
  `album` VARCHAR(255) DEFAULT NULL,
  `album_cover` LONGTEXT DEFAULT NULL,
  `lyrics` TEXT DEFAULT NULL,
  `real_url` LONGTEXT DEFAULT NULL,
  `play_url` LONGTEXT DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `like_count` INT DEFAULT 0,
  `click_count` INT DEFAULT 0,
  `comment_count` INT DEFAULT 0,
  `create_datetime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_japan_music_id` (`music_id`),
  KEY `idx_japan_author_id` (`author_id`),
  KEY `idx_japan_country` (`country`),
  KEY `idx_japan_create_datetime` (`create_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. 榜单评论表（7 个，对应各榜单）
--    注意：当前项目代码里部分地方拼成了 coments，所以这里按代码兼容命名。
-- =====================================================================

CREATE TABLE IF NOT EXISTS `soaring_rank_coments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `comment_content` VARCHAR(255) DEFAULT NULL,
  `comment_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `like_count` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_soaring_comment_time` (`comment_time`),
  KEY `idx_soaring_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `newsong_rank_coments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `comment_content` VARCHAR(255) DEFAULT NULL,
  `comment_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `like_count` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_newsong_comment_time` (`comment_time`),
  KEY `idx_newsong_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hotsong_rank_coments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `comment_content` VARCHAR(255) DEFAULT NULL,
  `comment_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `like_count` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_hotsong_comment_time` (`comment_time`),
  KEY `idx_hotsong_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chinese_rank_coments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `comment_content` VARCHAR(255) DEFAULT NULL,
  `comment_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `like_count` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_chinese_comment_time` (`comment_time`),
  KEY `idx_chinese_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `america_rank_coments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `comment_content` VARCHAR(255) DEFAULT NULL,
  `comment_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `like_count` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_america_comment_time` (`comment_time`),
  KEY `idx_america_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `korea_rank_coments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `comment_content` VARCHAR(255) DEFAULT NULL,
  `comment_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `like_count` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_korea_comment_time` (`comment_time`),
  KEY `idx_korea_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `japan_rank_coments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(255) DEFAULT NULL,
  `avatar_url` VARCHAR(255) DEFAULT NULL,
  `comment_content` VARCHAR(255) DEFAULT NULL,
  `comment_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `like_count` INT DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_japan_comment_time` (`comment_time`),
  KEY `idx_japan_comment_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 6. 用户动态创建的表说明
-- =====================================================================
-- 这两类表是运行时按 user_id 动态创建的：
--   1) {user_id}_like_musics
--   2) {user_id}_create_musics
--
-- 它们不适合在一个通用 SQL 文件里预先写死表名。
-- 如果你需要，我可以继续给你补一份“动态建表模板 SQL”。
