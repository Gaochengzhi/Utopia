import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import { execSync } from 'child_process'
import sharp from 'sharp'
import pLimit from 'p-limit'
import { loadProjectEnv } from './load-env.mjs'

const ROOT = process.cwd()
loadProjectEnv(ROOT)
const MANIFEST_PATH = path.join(ROOT, 'scripts', '.image-manifest.json')
const PUBLIC_DIR = path.join(ROOT, 'public')
const MAX_WIDTH = 2560
const THUMB_WIDTH = 400
const THUMB_QUALITY = 70

// CLI args
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const NO_SYNC = args.includes('--no-sync')
const SYNC_ONLY = args.includes('--sync-only')
const FORCE = args.includes('--force')

let TARGET_SCOPE = 'all'
const scopeIndex = args.indexOf('--scope')
if (scopeIndex !== -1 && args[scopeIndex + 1]) {
  TARGET_SCOPE = args[scopeIndex + 1]
}

const USE_TTY_PROGRESS = Boolean(process.stdout.isTTY)
const PROGRESS_MIN_INTERVAL_MS = 80

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }
  const precision = value >= 100 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(precision)} ${units[unitIndex]}`
}

function truncateMiddle(text, maxLength) {
  if (text.length <= maxLength) return text
  const keep = Math.max(3, Math.floor((maxLength - 3) / 2))
  return `${text.slice(0, keep)}...${text.slice(text.length - keep)}`
}

function renderProgress(state) {
  if (!USE_TTY_PROGRESS || state.total === 0) return
  const terminalWidth = process.stdout.columns || 120
  const barWidth = 20
  const percent = state.done / state.total
  const filled = Math.round(percent * barWidth)
  const bar = `${'#'.repeat(filled)}${'-'.repeat(barWidth - filled)}`
  const basename = state.currentFile ? path.basename(state.currentFile) : '-'
  const maxCurrentLength = Math.max(12, terminalWidth - 75)
  const current = truncateMiddle(basename, maxCurrentLength)
  const line =
    `[${bar}] ${state.done}/${state.total} ${(percent * 100).toFixed(1)}%` +
    ` ok:${state.ok} skip:${state.skip} err:${state.error}` +
    ` saved:${formatBytes(state.savedBytes)}` +
    ` | current:${current}`
  process.stdout.clearLine(0)
  process.stdout.cursorTo(0)
  process.stdout.write(line)
}

function createProgressReporter(initialState) {
  const state = { ...initialState }
  let lastRenderAt = 0

  function renderMaybe(force = false) {
    if (!USE_TTY_PROGRESS || state.total === 0) return
    const now = Date.now()
    if (!force && now - lastRenderAt < PROGRESS_MIN_INTERVAL_MS) return
    lastRenderAt = now
    renderProgress(state)
  }

  return {
    state,
    update(mutator, force = false) {
      mutator(state)
      renderMaybe(force)
    },
    flush() {
      renderMaybe(true)
      if (USE_TTY_PROGRESS) process.stdout.write('\n')
    }
  }
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
  }
  return { version: 1, files: {} }
}

function saveManifest(manifest) {
  if (!DRY_RUN) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  }
}

async function hashFile(filePath) {
  const fileBuffer = await fs.promises.readFile(filePath)
  return crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16)
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16)
}

function scanFiles(dirPath, extRegex) {
  const results = []
  if (!fs.existsSync(dirPath)) return results
  const items = fs.readdirSync(dirPath)
  for (const item of items) {
    if (item.startsWith('.') && item !== '.pic') continue
    const fullPath = path.join(dirPath, item)
    try {
      const lstat = fs.lstatSync(fullPath)
      // Avoid double-processing through aliased paths (e.g. .pic/photography -> ../photography).
      if (lstat.isSymbolicLink()) continue
      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        results.push(...scanFiles(fullPath, extRegex))
      } else {
        if (extRegex.test(item)) {
          results.push(fullPath)
        }
      }
    } catch (e) {
      if (e.code === 'ENOENT') continue // Skip broken symlinks or missing files
      throw e
    }
  }
  return results
}

async function processImage(filePath, manifest, relativePath) {
  const ext = path.extname(filePath).toLowerCase()
  const stats = fs.statSync(filePath)
  const fileSize = stats.size
  const mtimeMs = Math.trunc(stats.mtimeMs)
  let cachedOriginalHash = null
  async function getOriginalHash() {
    if (!cachedOriginalHash) {
      cachedOriginalHash = await hashFile(filePath)
    }
    return cachedOriginalHash
  }

  if (ext === '.gif' || ext === '.svg') {
    manifest.files[relativePath] = {
      hash: await getOriginalHash(),
      size: fileSize,
      mtimeMs,
      status: 'skip',
      reason: ext.replace('.', '')
    }
    return { status: 'skip', reason: ext.replace('.', ''), inputBytes: fileSize, outputBytes: fileSize, savedBytes: 0 }
  }

  if (ext === '.webp' && fileSize <= 500 * 1024) {
    manifest.files[relativePath] = {
      hash: await getOriginalHash(),
      size: fileSize,
      mtimeMs,
      status: 'skip',
      reason: 'webp_small_enough'
    }
    return { status: 'skip', reason: 'webp_small_enough', inputBytes: fileSize, outputBytes: fileSize, savedBytes: 0 }
  }

  try {
    const meta = await sharp(filePath).metadata()
    let needResize = false
    let targetWidth = meta.width

    if (meta.width > MAX_WIDTH) {
      needResize = true
      targetWidth = MAX_WIDTH
    }

    let quality = 80
    if (fileSize <= 200 * 1024) {
      quality = 90
    } else if (fileSize <= 500 * 1024) {
      quality = 85
    }

    let pipeline = sharp(filePath)
    if (needResize) {
      pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true })
    }

    const result = await pipeline.webp({ quality }).toBuffer()

    if (result.length >= fileSize && !needResize && ext !== '.webp') {
      manifest.files[relativePath] = {
        hash: await getOriginalHash(),
        size: fileSize,
        mtimeMs,
        status: 'skip',
        reason: 'no_gain'
      }
      return { status: 'skip', reason: 'no_gain', inputBytes: fileSize, outputBytes: fileSize, savedBytes: 0 }
    }

    if (!DRY_RUN) {
      const parsedPath = path.parse(filePath)
      const newExt = '.webp'
      const newPath = path.join(parsedPath.dir, parsedPath.name + newExt)
      let newRelativePath = path.relative(PUBLIC_DIR, newPath)
      
      // Since Windows path separator is \, ensure we store / in manifest
      newRelativePath = newRelativePath.split(path.sep).join('/')
      
      fs.writeFileSync(newPath, result)
      const newHash = hashBuffer(result)
      manifest.files[newRelativePath] = {
        hash: newHash,
        size: result.length,
        mtimeMs: Math.trunc(fs.statSync(newPath).mtimeMs),
        status: 'ok'
      }
      
      if (ext !== '.webp') {
        fs.unlinkSync(filePath)
        if (relativePath !== newRelativePath) {
          delete manifest.files[relativePath]
        }
      }
      
      // Handle photography thumbnail
      if (newRelativePath.startsWith('photography/content/')) {
        const parts = newRelativePath.split('/')
        // 'photography/content/{Category}/{filename}.ext'
        const category = parts[2]
        const thumbDir = path.join(PUBLIC_DIR, 'photography', 'thumb', category)
        if (!fs.existsSync(thumbDir)) {
          fs.mkdirSync(thumbDir, { recursive: true })
        }
        const thumbPath = path.join(thumbDir, parsedPath.name + '.webp')
        const thumbResult = await sharp(newPath)
          .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
          .webp({ quality: THUMB_QUALITY })
          .toBuffer()
        fs.writeFileSync(thumbPath, thumbResult)
      }
    }
    
    return {
      status: 'ok',
      inputBytes: fileSize,
      outputBytes: result.length,
      savedBytes: Math.max(0, fileSize - result.length)
    }

  } catch (error) {
    let originalHash = ''
    try {
      originalHash = await getOriginalHash()
    } catch {
      originalHash = ''
    }
    manifest.files[relativePath] = {
      hash: originalHash,
      size: fileSize,
      mtimeMs,
      status: 'error',
      reason: error.message
    }
    console.error(`❌ Error processing ${relativePath}: ${error.message}`)
    return { status: 'error', reason: error.message, inputBytes: fileSize, outputBytes: fileSize, savedBytes: 0 }
  }
}

async function main() {
  if (SYNC_ONLY) {
    if (!DRY_RUN) {
      console.log('🔄 Running sync to R2...')
      execSync('node scripts/sync-r2.mjs --delete' + (TARGET_SCOPE !== 'all' ? ` --dir ${TARGET_SCOPE}` : ''), { stdio: 'inherit' })
    }
    return
  }

  const manifest = loadManifest()
  const imageRegex = /\.(jpg|jpeg|png|gif|webp|svg)$/i

  let targetDirs = []
  if (TARGET_SCOPE === 'all' || TARGET_SCOPE === 'blog') {
    targetDirs.push(path.join(PUBLIC_DIR, '.pic'))
  }
  if (TARGET_SCOPE === 'all' || TARGET_SCOPE === 'photography') {
    targetDirs.push(path.join(PUBLIC_DIR, 'photography', 'content'))
  }

  const allFiles = []
  for (const dir of targetDirs) {
    allFiles.push(...scanFiles(dir, imageRegex))
  }

  const toProcess = []
  let counts = { skip: 0, error: 0, ok: 0, removed: 0, total: 0 }
  let totalSavedBytes = 0
  const checkLimit = pLimit(Math.max(4, os.cpus().length * 2))
  const precheckResults = await Promise.all(
    allFiles.map(file =>
      checkLimit(async () => {
        let relativePath = path.relative(PUBLIC_DIR, file)
        relativePath = relativePath.split(path.sep).join('/')

        if (FORCE) {
          return { action: 'process', file, relativePath }
        }

        const record = manifest.files[relativePath]
        if (!record) {
          return { action: 'process', file, relativePath }
        }

        const status = record.status
        const isKnownStatus = status === 'ok' || status === 'skip' || status === 'error'
        if (!isKnownStatus) {
          return { action: 'process', file, relativePath }
        }

        // Fast path: unchanged stat fingerprint, skip without reading full file.
        let size = null
        let mtimeMs = null
        try {
          const stats = await fs.promises.stat(file)
          size = stats.size
          mtimeMs = Math.trunc(stats.mtimeMs)
          if (record.size === size && record.mtimeMs === mtimeMs) {
            return {
              action: 'skip',
              status: status === 'ok' ? 'skip' : status,
              relativePath,
              size,
              mtimeMs
            }
          }
        } catch {
          return { action: 'process', file, relativePath }
        }

        // Fallback: content hash check for backward compatibility with old manifests.
        try {
          const currentHash = await hashFile(file)
          if (record.hash === currentHash) {
            return {
              action: 'skip',
              status: status === 'ok' ? 'skip' : status,
              relativePath,
              size,
              mtimeMs
            }
          }
        } catch {
          return { action: 'process', file, relativePath }
        }

        return { action: 'process', file, relativePath }
      })
    )
  )

  counts.total = allFiles.length
  for (const result of precheckResults) {
    if (result.action === 'skip') {
      counts[result.status]++
      if (!DRY_RUN && result.relativePath && manifest.files[result.relativePath]) {
        manifest.files[result.relativePath].size = result.size
        manifest.files[result.relativePath].mtimeMs = result.mtimeMs
      }
    } else {
      toProcess.push({ file: result.file, relativePath: result.relativePath })
    }
  }

  console.log(`🔍 Found ${toProcess.length} files to process (total scanned: ${counts.total})`)

  if (toProcess.length > 0) {
    const reporter = createProgressReporter({
      total: toProcess.length,
      done: 0,
      ok: 0,
      skip: 0,
      error: 0,
      savedBytes: 0,
      currentFile: ''
    })
    reporter.update(() => {}, true)
    const limit = pLimit(os.cpus().length)
    const tasks = toProcess.map(item => limit(async () => {
      const res = await processImage(item.file, manifest, item.relativePath)
      totalSavedBytes += res.savedBytes || 0
      if (res.status === 'ok') counts.ok++
      if (res.status === 'skip') {
        // Here skip means "skip inside processImage", e.g. converting wasn't beneficial
        counts.skip++
      }
      if (res.status === 'error') counts.error++
      reporter.update(state => {
        state.done++
        state.savedBytes += res.savedBytes || 0
        state.ok = counts.ok
        state.skip = counts.skip
        state.error = counts.error
        state.currentFile = item.relativePath
      })
    }))

    await Promise.all(tasks)
    reporter.flush()
  }

  // Find files in manifest that no longer exist locally
  for (const key of Object.keys(manifest.files)) {
    const fullPath = path.join(PUBLIC_DIR, key)
    let inScope = false
    if (TARGET_SCOPE === 'all') inScope = true
    if (TARGET_SCOPE === 'blog' && key.startsWith('.pic/')) inScope = true
    if (TARGET_SCOPE === 'photography' && key.startsWith('photography/content/')) inScope = true
    
    if (inScope && !fs.existsSync(fullPath)) {
      if (!DRY_RUN) delete manifest.files[key]
      counts.removed++
      if (!DRY_RUN) {
        // Also remove thumbnail if it exists
        if (key.startsWith('photography/content/')) {
          const parts = key.split('/')
          const category = parts[2]
          const parsed = path.parse(parts[3])
          const thumbPath = path.join(PUBLIC_DIR, 'photography', 'thumb', category, parsed.name + '.webp')
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath)
          }
        }
      }
    }
  }

  saveManifest(manifest)

  const finalMessage = [
    '',
    '✅ Optimization complete!',
    `   Processed (newly): ${counts.ok}`,
    `   Skipped: ${counts.skip}`,
    `   Errors: ${counts.error}`,
    `   Removed from manifest: ${counts.removed}`,
    `   Total saved: ${formatBytes(totalSavedBytes)}`
  ].join('\n')
  console.log(finalMessage)

  if (!NO_SYNC && !DRY_RUN) {
    console.log('\n🔄 Syncing to R2...')
    try {
      execSync('node scripts/sync-r2.mjs --delete' + (TARGET_SCOPE !== 'all' ? ` --dir ${TARGET_SCOPE}` : ''), { stdio: 'inherit' })
    } catch (e) {
      console.error('❌ R2 sync failed:', e.message)
    }
  }
}

main().catch(console.error)
