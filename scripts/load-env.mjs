import fs from 'fs'
import path from 'path'

function decodeValue(raw) {
  const value = raw.trim()
  if (!value) return ''

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    const inner = value.slice(1, -1)
    if (value.startsWith('"')) {
      return inner
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
    }
    return inner.replace(/\\'/g, "'")
  }

  return value
}

function loadOneEnvFile(filePath, { override = false } = {}) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (!override && process.env[key] !== undefined) continue
    process.env[key] = decodeValue(rawValue)
  }
}

export function loadProjectEnv(cwd = process.cwd()) {
  loadOneEnvFile(path.join(cwd, '.env'))
  loadOneEnvFile(path.join(cwd, '.env.local'), { override: true })
}

