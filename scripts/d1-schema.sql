-- Utopia D1 Schema
-- Generated for Cloudflare migration
-- content_full removed: article markdown is stored in R2, not D1

-- 文章表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,           -- 'post/Writings/car.md'
  title TEXT NOT NULL,
  category TEXT,                        -- 'Writings'
  content_preview TEXT,                 -- 构建时截断前 1500 字符（列表页用）
  content_plain TEXT,                   -- 纯文本，上限 50KB（FTS 索引用）
  first_image TEXT,                     -- 第一张图片 URL
  is_protected BOOLEAN DEFAULT 0,
  content_hash TEXT,                    -- SHA256 hash (前16位) 用于增量更新判断
  created_at INTEGER,                   -- 文件创建时间戳 (ms)
  updated_at INTEGER,
  path TEXT NOT NULL                    -- 前端路由路径 '/<slug>'
);

-- FTS 虚拟表
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title, content_plain,
  content='posts',
  content_rowid='id'
);

-- FTS 同步触发器
CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, content_plain) VALUES (new.id, new.title, new.content_plain);
END;
CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content_plain) VALUES('delete', old.id, old.title, old.content_plain);
END;
CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content_plain) VALUES('delete', old.id, old.title, old.content_plain);
  INSERT INTO posts_fts(rowid, title, content_plain) VALUES (new.id, new.title, new.content_plain);
END;

-- 浏览量表
CREATE TABLE IF NOT EXISTS pageviews (
  slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- 摄影索引表
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,               -- 'City', 'Emotion' 等
  filename TEXT NOT NULL,
  path TEXT NOT NULL,                   -- R2 key: 'photography/content/City/xxx.jpg'
  sort_order INTEGER,                   -- 排序用
  created_at INTEGER
);

-- 路径树表
CREATE TABLE IF NOT EXISTS path_tree (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_path TEXT,
  is_leaf BOOLEAN,
  type TEXT,                            -- 'folder' or 'file'
  node_key TEXT,                        -- 前端 Tree 组件的 key
  created_at INTEGER
);
