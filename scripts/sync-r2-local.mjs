#!/usr/bin/env node
/**
 * sync-r2-local.mjs
 *
 * Syncs local post/ markdown files into the local miniflare R2 bucket
 * so that `next dev` (which uses initOpenNextCloudflareForDev) can
 * serve full article content from R2.
 *
 * Usage:
 *   node scripts/sync-r2-local.mjs
 *   node scripts/sync-r2-local.mjs --dry-run
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const POST_DIR = path.join(ROOT, 'post')
const DRY_RUN = process.argv.includes('--dry-run')

function scanMarkdown(dirPath) {
  const results = []
  if (!fs.existsSync(dirPath)) return results

  for (const item of fs.readdirSync(dirPath)) {
    if (item.startsWith('.')) continue
    const fullPath = path.join(dirPath, item)
    const stats = fs.statSync(fullPath)
    if (stats.isDirectory()) {
      results.push(...scanMarkdown(fullPath))
    } else if (/\.(md|mdx)$/i.test(item)) {
      results.push(fullPath)
    }
  }
  return results
}

async function main() {
  console.log('🔍 Scanning post/ for markdown files...')
  const files = scanMarkdown(POST_DIR)
  console.log(`   Found ${files.length} files\n`)

  let synced = 0
  let errors = 0

  for (const filePath of files) {
    const r2Key = path.relative(ROOT, filePath)

    if (DRY_RUN) {
      console.log(`  [DRY] ${r2Key}`)
      synced++
      continue
    }

    try {
      // Use --pipe to avoid shell escaping issues with &, spaces, Chinese chars
      const content = fs.readFileSync(filePath)
      execSync(
        `npx wrangler r2 object put "utopia-images/${r2Key}" --local --pipe --content-type "text/markdown; charset=utf-8"`,
        { cwd: ROOT, input: content, stdio: ['pipe', 'pipe', 'pipe'] }
      )
      synced++
      if (synced % 20 === 0) console.log(`  ✅ Synced ${synced}/${files.length}...`)
    } catch (err) {
      console.error(`  ❌ Failed: ${r2Key}: ${err.stderr?.toString().trim() || err.message}`)
      errors++
    }
  }

  console.log(`\n✨ Done! Synced ${synced} files to local R2${DRY_RUN ? ' (dry run)' : ''}`)
  if (errors > 0) console.log(`   ❌ ${errors} errors`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
