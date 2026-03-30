#!/usr/bin/env node
import { loadProjectEnv } from './load-env.mjs'

loadProjectEnv()

const API_BASE = 'https://api.cloudflare.com/client/v4'
const API_TOKEN = process.env.CLOUDFLARE_ZONE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN
const TOKEN_SOURCE = process.env.CLOUDFLARE_ZONE_API_TOKEN
  ? 'CLOUDFLARE_ZONE_API_TOKEN'
  : 'CLOUDFLARE_API_TOKEN'
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME || 'gaochengzhi.com'

async function cfRequest(path, init = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    const details = data?.errors?.map(err => err.message || JSON.stringify(err)).join('; ') || response.statusText
    throw new Error(`Cloudflare API request failed (${response.status}): ${details}`)
  }

  return data?.result
}

async function resolveZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID) return process.env.CLOUDFLARE_ZONE_ID

  const result = await cfRequest(`/zones?name=${encodeURIComponent(ZONE_NAME)}&status=active&per_page=1`)
  const zone = Array.isArray(result) ? result[0] : null
  if (!zone?.id) {
    throw new Error(`Unable to resolve zone id for ${ZONE_NAME}`)
  }
  return zone.id
}

async function main() {
  if (!API_TOKEN) {
    throw new Error('Missing CLOUDFLARE_ZONE_API_TOKEN or CLOUDFLARE_API_TOKEN in environment')
  }

  const zoneId = await resolveZoneId()
  console.log(`Purging Cloudflare cache for zone ${ZONE_NAME} (${zoneId}) using ${TOKEN_SOURCE}...`)

  await cfRequest(`/zones/${zoneId}/purge_cache`, {
    method: 'POST',
    body: JSON.stringify({ purge_everything: true }),
  })

  console.log('Cache purge request submitted successfully.')
}

main().catch((error) => {
  console.error(`❌ ${error.message}`)
  process.exit(1)
})
