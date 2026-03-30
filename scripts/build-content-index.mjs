#!/usr/bin/env node
/**
 * build-content-index.mjs
 * 
 * Scans local content directories and generates SQL seed data for D1.
 * 
 * Architecture:
 *   - D1 stores metadata + content_preview + content_plain (for FTS search)
 *   - R2 stores full markdown content (synced via sync-r2.mjs)
 *   - content_full is NOT stored in D1 to avoid SQLITE_TOOBIG errors
 * 
 * Modes:
 *   --incremental   Only generate INSERT/UPDATE/DELETE for changed articles
 *                   Uses .content-manifest.json to track file hashes
 *   (default)       Full rebuild — DELETE all + INSERT all (for initial seeding)
 * 
 * Usage:
 *   node scripts/build-content-index.mjs                 # Full rebuild
 *   node scripts/build-content-index.mjs --incremental   # Incremental
 *   node scripts/build-content-index.mjs --dry-run       # Preview changes
 * 
 * Outputs:
 *   scripts/d1-seed.sql
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import matter from 'gray-matter'

const ROOT = process.cwd()
const POST_DIR = path.join(ROOT, 'post')
const PHOTO_DIR = path.join(ROOT, 'public', 'photography', 'content')
const PAGEVIEWS_FILE = path.join(ROOT, 'public', 'pageviews.json')
const OUTPUT_FILE = path.join(ROOT, 'scripts', 'd1-seed.sql')
const MANIFEST_PATH = path.join(ROOT, 'scripts', '.content-manifest.json')

const args = process.argv.slice(2)
const INCREMENTAL = args.includes('--incremental')
const DRY_RUN = args.includes('--dry-run')

// Protected folder patterns
const PROTECTED_FOLDERS = ['我的日记']

// Max bytes for content_plain to keep statements under D1's 100KB limit
const MAX_PLAIN_BYTES = 50000  // 50KB

function isProtectedPath(filePath) {
  return PROTECTED_FOLDERS.some(folder => filePath.includes(folder))
}

// Escape SQL string
function escSQL(str) {
  if (str === null || str === undefined) return 'NULL'
  return "'" + String(str).replace(/'/g, "''") + "'"
}

// Remove markdown formatting for plain text (used for FTS search index)
function stripMarkdown(content) {
  if (!content) return ''
  return content
    .replace(/```[\s\S]*?```/g, '')     // code blocks
    .replace(/`[^`]*`/g, '')             // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')     // images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')  // links → text
    .replace(/#{1,6}\s/g, '')             // headings
    .replace(/[*_~]{1,3}/g, '')           // bold/italic/strikethrough
    .replace(/>\s?/gm, '')               // blockquotes
    .replace(/[-*+]\s/gm, '')            // list items
    .replace(/\d+\.\s/gm, '')            // numbered lists
    .replace(/\|.*?\|/g, '')             // table rows
    .replace(/---+/g, '')               // horizontal rules
    .replace(/\n{3,}/g, '\n\n')          // excess newlines
    .trim()
}

// Normalize image paths
function normalizeImagePath(content) {
  if (!content) return content
  return content
    .replace(
      new RegExp("(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/", "gm"),
      "/.pic/"
    )
    .replace(
      new RegExp("(file://)?/Users/[^/]+/[^/]+/web-blog/public/.pic/", "gm"),
      "/.pic/"
    )
    .replace(
      /(https?:\/\/(?:www\.)?gaochengzhi\.com)?\/api\/images\//gm,
      "/.pic/"
    )
    .replace(/\/\.pic\/\.pic\//gm, "/.pic/")
}

// Extract first image URL from markdown
function extractFirstImage(content) {
  if (!content) return null
  const match = content.match(/!\[.*?\]\((.*?)\)/)
  if (match) return match[1]
  
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/)
  if (imgMatch) return imgMatch[1]
  
  return null
}

// Truncate text to stay under maxBytes (UTF-8 safe)
function truncateToBytes(text, maxBytes) {
  if (!text) return ''
  const buf = Buffer.from(text, 'utf-8')
  if (buf.length <= maxBytes) return text
  
  // Binary search for the right character cut point
  let lo = 0, hi = text.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (Buffer.byteLength(text.slice(0, mid), 'utf-8') <= maxBytes) {
      lo = mid
    } else {
      hi = mid - 1
    }
  }
  return text.slice(0, lo)
}

// Hash file content
function hashFileContent(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex').substring(0, 16)
}

// Recursively scan directory for files
function scanDirectory(dirPath, extensions = ['.md', '.mdx']) {
  const results = []
  
  if (!fs.existsSync(dirPath)) return results
  
  const items = fs.readdirSync(dirPath)
  for (const item of items) {
    if (item.startsWith('.')) continue
    
    const fullPath = path.join(dirPath, item)
    const stats = fs.statSync(fullPath)
    
    if (stats.isDirectory()) {
      results.push(...scanDirectory(fullPath, extensions))
    } else {
      const ext = path.extname(item).toLowerCase()
      if (extensions.includes(ext)) {
        results.push({
          fullPath,
          relativePath: path.relative(ROOT, fullPath),
          stats
        })
      }
    }
  }
  
  return results
}

// Build path tree data
function buildPathTree(dirPath, parentPath = null) {
  const nodes = []
  
  if (!fs.existsSync(dirPath)) return nodes
  
  const items = fs.readdirSync(dirPath)
  for (const item of items) {
    if (item.startsWith('.')) continue
    
    const fullPath = path.join(dirPath, item)
    const relativePath = path.relative(ROOT, fullPath)
    const stats = fs.statSync(fullPath)
    const isDir = stats.isDirectory()
    
    // Only include .md files and directories
    if (!isDir) {
      const ext = path.extname(item).toLowerCase()
      if (!['.md', '.mdx', '.txt'].includes(ext)) continue
    }
    
    const node = {
      title: item === 'post' ? 'content' : item,
      path: relativePath,
      parent_path: parentPath,
      is_leaf: !isDir,
      type: isDir ? 'folder' : 'file',
      node_key: item === 'post' ? 'myrootkey' : Math.floor(Math.random() * 9e9).toString(),
      created_at: Math.floor(stats.birthtimeMs)
    }
    
    nodes.push(node)
    
    if (isDir) {
      nodes.push(...buildPathTree(fullPath, relativePath))
    }
  }
  
  return nodes
}

// Load content manifest (for incremental mode)
function loadContentManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
    } catch {
      return { version: 1, posts: {} }
    }
  }
  return { version: 1, posts: {} }
}

// Save content manifest
function saveContentManifest(manifest) {
  if (!DRY_RUN) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  }
}

// Process a single post file and return its data
function processPostFile(file) {
  const rawContent = fs.readFileSync(file.fullPath, 'utf-8')
  const contentHash = hashFileContent(rawContent)
  const normalizedContent = normalizeImagePath(rawContent)
  const parsed = matter(normalizedContent)
  const content = parsed.content
  
  const slug = file.relativePath
  const title = path.basename(file.fullPath)
  const category = path.relative(POST_DIR, path.dirname(file.fullPath)) || null
  const isProtected = isProtectedPath(file.fullPath)
  
  // Content preview (first 1500 chars for list pages)
  let contentPreview = content.length > 1500
    ? content.slice(0, 1500) + '...'
    : content
  
  // Plain text for FTS search (stripped markdown, capped at 50KB)
  let contentPlain = stripMarkdown(content)
  const plainBytes = Buffer.byteLength(contentPlain, 'utf-8')
  const wasTruncated = plainBytes > MAX_PLAIN_BYTES
  if (wasTruncated) {
    contentPlain = truncateToBytes(contentPlain, MAX_PLAIN_BYTES)
  }
  
  // Extract first image
  const firstImage = extractFirstImage(content)
  
  const createdAt = Math.floor(file.stats.birthtimeMs)
  const updatedAt = Math.floor(file.stats.mtimeMs)
  
  return {
    slug, title, category, contentPreview, contentPlain,
    firstImage, isProtected, contentHash, createdAt, updatedAt,
    wasTruncated
  }
}

// Generate INSERT SQL for a post
function generateInsertSQL(post) {
  return `INSERT OR REPLACE INTO posts (slug, title, category, content_preview, content_plain, first_image, is_protected, content_hash, created_at, updated_at, path) VALUES (${escSQL(post.slug)}, ${escSQL(post.title)}, ${escSQL(post.category)}, ${escSQL(post.contentPreview)}, ${escSQL(post.contentPlain)}, ${escSQL(post.firstImage)}, ${post.isProtected ? 1 : 0}, ${escSQL(post.contentHash)}, ${post.createdAt}, ${post.updatedAt}, ${escSQL(post.slug)});`
}

// ============================================
// Full mode (default) — DELETE everything + INSERT all
// ============================================
function buildFull() {
  console.log('🔍 Scanning content directories... (FULL REBUILD)')
  
  const sqlStatements = []
  
  // Header
  sqlStatements.push('-- D1 Seed Data (metadata only, full content in R2)')
  sqlStatements.push('-- Generated at ' + new Date().toISOString())
  sqlStatements.push('')
  sqlStatements.push('DELETE FROM posts;')
  sqlStatements.push('DELETE FROM posts_fts;')
  sqlStatements.push('DELETE FROM photos;')
  sqlStatements.push('DELETE FROM path_tree;')
  sqlStatements.push('DELETE FROM pageviews;')
  sqlStatements.push('')
  
  // 1. Posts
  console.log('📝 Processing posts...')
  const postFiles = scanDirectory(POST_DIR)
  let postCount = 0
  let truncatedCount = 0
  const newManifest = { version: 1, posts: {} }
  
  for (const file of postFiles) {
    try {
      const post = processPostFile(file)
      if (post.wasTruncated) truncatedCount++
      
      sqlStatements.push(generateInsertSQL(post))
      newManifest.posts[post.slug] = {
        hash: post.contentHash,
        updatedAt: post.updatedAt
      }
      postCount++
    } catch (err) {
      console.error(`  ⚠ Error processing ${file.relativePath}:`, err.message)
    }
  }
  console.log(`  ✅ ${postCount} posts indexed`)
  if (truncatedCount > 0) {
    console.log(`  ℹ  ${truncatedCount} posts had content_plain truncated to ${MAX_PLAIN_BYTES/1000}KB`)
  }
  
  // 2. Photography
  console.log('📸 Processing photography...')
  let photoCount = 0
  
  if (fs.existsSync(PHOTO_DIR)) {
    const categories = fs.readdirSync(PHOTO_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
    
    for (const category of categories) {
      const catDir = path.join(PHOTO_DIR, category)
      const files = fs.readdirSync(catDir)
        .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        .sort()
      
      files.forEach((filename, index) => {
        const filePath = `photography/content/${category}/${filename}`
        const fullFilePath = path.join(catDir, filename)
        const stats = fs.statSync(fullFilePath)
        const createdAt = Math.floor(stats.birthtimeMs)
        
        sqlStatements.push(
          `INSERT INTO photos (category, filename, path, sort_order, created_at) VALUES (${escSQL(category)}, ${escSQL(filename)}, ${escSQL(filePath)}, ${index}, ${createdAt});`
        )
        photoCount++
      })
    }
  }
  console.log(`  ✅ ${photoCount} photos indexed`)
  
  // 3. Path Tree
  console.log('🌳 Building path tree...')
  const treeNodes = buildPathTree(POST_DIR, 'post')
  
  const postStats = fs.statSync(POST_DIR)
  treeNodes.unshift({
    title: 'content',
    path: 'post',
    parent_path: null,
    is_leaf: false,
    type: 'folder',
    node_key: 'myrootkey',
    created_at: Math.floor(postStats.birthtimeMs)
  })
  
  for (const node of treeNodes) {
    sqlStatements.push(
      `INSERT INTO path_tree (title, path, parent_path, is_leaf, type, node_key, created_at) VALUES (${escSQL(node.title)}, ${escSQL(node.path)}, ${escSQL(node.parent_path)}, ${node.is_leaf ? 1 : 0}, ${escSQL(node.type)}, ${escSQL(node.node_key)}, ${node.created_at});`
    )
  }
  console.log(`  ✅ ${treeNodes.length} tree nodes`)
  
  // 4. Pageviews
  console.log('👁 Importing pageviews...')
  let viewCount = 0
  
  const pageviewSources = [
    path.join(ROOT, 'public', 'pageviews.json'),
    path.join(ROOT, 'data', 'pageviews.json'),
  ]
  
  const mergedViews = {}
  for (const source of pageviewSources) {
    if (fs.existsSync(source)) {
      try {
        const data = JSON.parse(fs.readFileSync(source, 'utf-8'))
        for (const [key, value] of Object.entries(data)) {
          if (key !== 'total' && typeof value === 'number') {
            mergedViews[key] = (mergedViews[key] || 0) + value
          }
        }
      } catch (err) {
        console.error(`  ⚠ Error reading ${source}:`, err.message)
      }
    }
  }
  
  for (const [slug, count] of Object.entries(mergedViews)) {
    sqlStatements.push(
      `INSERT INTO pageviews (slug, count) VALUES (${escSQL(slug)}, ${count});`
    )
    viewCount++
  }
  console.log(`  ✅ ${viewCount} pageview entries`)
  
  // Write output
  const output = sqlStatements.join('\n') + '\n'
  if (!DRY_RUN) {
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8')
    saveContentManifest(newManifest)
  }
  
  const sizeMB = (Buffer.byteLength(output) / 1024 / 1024).toFixed(2)
  console.log(`\n✨ Done! Generated ${OUTPUT_FILE}`)
  console.log(`   Size: ${sizeMB} MB`)
  console.log(`   Posts: ${postCount}, Photos: ${photoCount}, Tree: ${treeNodes.length}, Views: ${viewCount}`)
  if (DRY_RUN) console.log('   🔍 DRY RUN — no files written')
}

// ============================================
// Incremental mode — only changed/new/deleted posts
// ============================================
function buildIncremental() {
  console.log('🔍 Scanning content directories... (INCREMENTAL)')
  
  const oldManifest = loadContentManifest()
  const newManifest = { version: 1, posts: {} }
  const sqlStatements = []
  
  sqlStatements.push('-- D1 Incremental Update')
  sqlStatements.push('-- Generated at ' + new Date().toISOString())
  sqlStatements.push('')
  
  // Scan all current posts
  console.log('📝 Processing posts...')
  const postFiles = scanDirectory(POST_DIR)
  
  const currentSlugs = new Set()
  let newCount = 0
  let updatedCount = 0
  let skippedCount = 0
  let deletedCount = 0
  let truncatedCount = 0
  
  for (const file of postFiles) {
    try {
      const rawContent = fs.readFileSync(file.fullPath, 'utf-8')
      const contentHash = hashFileContent(rawContent)
      const slug = file.relativePath
      currentSlugs.add(slug)
      
      const oldRecord = oldManifest.posts[slug]
      
      // Skip if hash matches
      if (oldRecord && oldRecord.hash === contentHash) {
        newManifest.posts[slug] = oldRecord
        skippedCount++
        continue
      }
      
      // Process the file (new or changed)
      const post = processPostFile(file)
      if (post.wasTruncated) truncatedCount++
      
      // Use INSERT OR REPLACE to handle both new and updated
      sqlStatements.push(generateInsertSQL(post))
      
      newManifest.posts[slug] = {
        hash: post.contentHash,
        updatedAt: post.updatedAt
      }
      
      if (oldRecord) {
        updatedCount++
        console.log(`  📝 Updated: ${slug}`)
      } else {
        newCount++
        console.log(`  ✨ New: ${slug}`)
      }
    } catch (err) {
      console.error(`  ⚠ Error processing ${file.relativePath}:`, err.message)
    }
  }
  
  // Find deleted posts
  for (const oldSlug of Object.keys(oldManifest.posts)) {
    if (!currentSlugs.has(oldSlug)) {
      sqlStatements.push(`DELETE FROM posts WHERE slug = ${escSQL(oldSlug)};`)
      deletedCount++
      console.log(`  🗑️  Deleted: ${oldSlug}`)
    }
  }
  
  // Path tree — always rebuild (it's small and fast)
  sqlStatements.push('')
  sqlStatements.push('DELETE FROM path_tree;')
  
  const treeNodes = buildPathTree(POST_DIR, 'post')
  const postStats = fs.statSync(POST_DIR)
  treeNodes.unshift({
    title: 'content',
    path: 'post',
    parent_path: null,
    is_leaf: false,
    type: 'folder',
    node_key: 'myrootkey',
    created_at: Math.floor(postStats.birthtimeMs)
  })
  
  for (const node of treeNodes) {
    sqlStatements.push(
      `INSERT INTO path_tree (title, path, parent_path, is_leaf, type, node_key, created_at) VALUES (${escSQL(node.title)}, ${escSQL(node.path)}, ${escSQL(node.parent_path)}, ${node.is_leaf ? 1 : 0}, ${escSQL(node.type)}, ${escSQL(node.node_key)}, ${node.created_at});`
    )
  }
  
  // Photography — always rebuild (scan-based, fast)
  sqlStatements.push('')
  sqlStatements.push('DELETE FROM photos;')
  let photoCount = 0
  
  if (fs.existsSync(PHOTO_DIR)) {
    const categories = fs.readdirSync(PHOTO_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
    
    for (const category of categories) {
      const catDir = path.join(PHOTO_DIR, category)
      const files = fs.readdirSync(catDir)
        .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        .sort()
      
      files.forEach((filename, index) => {
        const filePath = `photography/content/${category}/${filename}`
        const fullFilePath = path.join(catDir, filename)
        const stats = fs.statSync(fullFilePath)
        const createdAt = Math.floor(stats.birthtimeMs)
        
        sqlStatements.push(
          `INSERT INTO photos (category, filename, path, sort_order, created_at) VALUES (${escSQL(category)}, ${escSQL(filename)}, ${escSQL(filePath)}, ${index}, ${createdAt});`
        )
        photoCount++
      })
    }
  }
  
  // Check if there are actual changes
  const hasPostChanges = newCount > 0 || updatedCount > 0 || deletedCount > 0
  
  if (!hasPostChanges) {
    console.log(`\n⏭️  No changes detected.`)
    console.log(`   Skipped: ${skippedCount} unchanged posts`)
    // Still save manifest in case format changed
    saveContentManifest(newManifest)
    
    // Write minimal SQL (still need photos + path_tree for consistency)
    const output = sqlStatements.join('\n') + '\n'
    if (!DRY_RUN) {
      fs.writeFileSync(OUTPUT_FILE, output, 'utf-8')
    }
    return { hasChanges: true, postChanges: false }  // photos/tree may still have changed
  }
  
  // Write output
  const output = sqlStatements.join('\n') + '\n'
  if (!DRY_RUN) {
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8')
    saveContentManifest(newManifest)
  }
  
  const sizeMB = (Buffer.byteLength(output) / 1024 / 1024).toFixed(2)
  console.log(`\n✨ Incremental update generated!`)
  console.log(`   New: ${newCount}, Updated: ${updatedCount}, Deleted: ${deletedCount}, Skipped: ${skippedCount}`)
  console.log(`   Photos: ${photoCount}, Tree: ${treeNodes.length}`)
  console.log(`   Size: ${sizeMB} MB`)
  if (truncatedCount > 0) {
    console.log(`   ℹ  ${truncatedCount} posts had content_plain truncated to ${MAX_PLAIN_BYTES/1000}KB`)
  }
  if (DRY_RUN) console.log('   🔍 DRY RUN — no files written')
  
  return { hasChanges: true, postChanges: true }
}

// Main
function main() {
  if (INCREMENTAL) {
    buildIncremental()
  } else {
    buildFull()
  }
}

main()
