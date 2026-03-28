#!/usr/bin/env node
/**
 * build-content-index.mjs
 * 
 * Scans local content directories and generates SQL seed data for D1.
 * 
 * Usage:
 *   node scripts/build-content-index.mjs
 * 
 * Outputs:
 *   scripts/d1-seed.sql
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const ROOT = process.cwd()
const POST_DIR = path.join(ROOT, 'post')
const PHOTO_DIR = path.join(ROOT, 'public', 'photography', 'content')
const PAGEVIEWS_FILE = path.join(ROOT, 'public', 'pageviews.json')
const OUTPUT_FILE = path.join(ROOT, 'scripts', 'd1-seed.sql')

// Protected folder patterns
const PROTECTED_FOLDERS = ['我的日记']

function isProtectedPath(filePath) {
  return PROTECTED_FOLDERS.some(folder => filePath.includes(folder))
}

// Escape SQL string
function escSQL(str) {
  if (str === null || str === undefined) return 'NULL'
  return "'" + String(str).replace(/'/g, "''") + "'"
}

// Remove markdown formatting for plain text
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
  return content.replace(
    new RegExp("(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/", "gm"),
    "/.pic/"
  )
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

// Main
function main() {
  console.log('🔍 Scanning content directories...')
  
  const sqlStatements = []
  
  // Add transaction and cleanup
  sqlStatements.push('-- D1 Seed Data')
  sqlStatements.push('-- Generated at ' + new Date().toISOString())
  sqlStatements.push('')
  sqlStatements.push('DELETE FROM posts;')
  sqlStatements.push('DELETE FROM posts_fts;')
  sqlStatements.push('DELETE FROM photos;')
  sqlStatements.push('DELETE FROM path_tree;')
  sqlStatements.push('DELETE FROM pageviews;')
  sqlStatements.push('')
  
  // ============================================
  // 1. Posts
  // ============================================
  console.log('📝 Processing posts...')
  const postFiles = scanDirectory(POST_DIR)
  let postCount = 0
  
  for (const file of postFiles) {
    try {
      const rawContent = fs.readFileSync(file.fullPath, 'utf-8')
      const normalizedContent = normalizeImagePath(rawContent)
      const parsed = matter(normalizedContent)
      const content = parsed.content
      
      const slug = file.relativePath
      const title = path.basename(file.fullPath)
      const category = path.relative(POST_DIR, path.dirname(file.fullPath)) || null
      const isProtected = isProtectedPath(file.fullPath)
      
      // Content preview (first 1500 chars)
      let contentPreview = content.length > 1500
        ? content.slice(0, 1500) + '...'
        : content
      
      // Plain text for FTS
      const contentPlain = stripMarkdown(content)
      
      // Full content (empty for protected articles in B-plan)
      const contentFull = isProtected ? '' : content
      
      // Extract first image
      const firstImage = extractFirstImage(content)
      
      const createdAt = Math.floor(file.stats.birthtimeMs)
      const updatedAt = Math.floor(file.stats.mtimeMs)
      
      sqlStatements.push(
        `INSERT INTO posts (slug, title, category, content_preview, content_plain, content_full, first_image, is_protected, created_at, updated_at, path) VALUES (${escSQL(slug)}, ${escSQL(title)}, ${escSQL(category)}, ${escSQL(contentPreview)}, ${escSQL(contentPlain)}, ${escSQL(contentFull)}, ${escSQL(firstImage)}, ${isProtected ? 1 : 0}, ${createdAt}, ${updatedAt}, ${escSQL(slug)});`
      )
      postCount++
    } catch (err) {
      console.error(`  ⚠ Error processing ${file.relativePath}:`, err.message)
    }
  }
  console.log(`  ✅ ${postCount} posts indexed`)
  
  // ============================================
  // 2. Photography
  // ============================================
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
  
  // ============================================
  // 3. Path Tree
  // ============================================
  console.log('🌳 Building path tree...')
  const treeNodes = buildPathTree(POST_DIR)
  
  for (const node of treeNodes) {
    sqlStatements.push(
      `INSERT INTO path_tree (title, path, parent_path, is_leaf, type, node_key, created_at) VALUES (${escSQL(node.title)}, ${escSQL(node.path)}, ${escSQL(node.parent_path)}, ${node.is_leaf ? 1 : 0}, ${escSQL(node.type)}, ${escSQL(node.node_key)}, ${node.created_at});`
    )
  }
  console.log(`  ✅ ${treeNodes.length} tree nodes`)
  
  // ============================================
  // 4. Pageviews (seed from existing data)
  // ============================================
  console.log('👁 Importing pageviews...')
  let viewCount = 0
  
  // Try to merge from both possible locations
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
  
  // ============================================
  // Write output
  // ============================================
  const output = sqlStatements.join('\n') + '\n'
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8')
  
  const sizeMB = (Buffer.byteLength(output) / 1024 / 1024).toFixed(2)
  console.log(`\n✨ Done! Generated ${OUTPUT_FILE}`)
  console.log(`   Size: ${sizeMB} MB`)
  console.log(`   Posts: ${postCount}, Photos: ${photoCount}, Tree: ${treeNodes.length}, Views: ${viewCount}`)
}

main()
