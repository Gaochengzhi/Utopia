/**
 * Cloudflare D1/R2 binding helper
 * 
 * In production (Cloudflare Worker): uses the global cloudflare context
 * set by @opennextjs/cloudflare via AsyncLocalStorage
 * In local dev: falls back gracefully
 */

function getCloudflareEnv() {
  // Method 1: globalThis symbol (set by @opennextjs/cloudflare worker runtime)
  try {
    const ctx = globalThis[Symbol.for("__cloudflare-context__")];
    if (ctx && ctx.env) return ctx.env;
  } catch (e) {}

  // Method 2: dynamic import / require (build time / local dev)
  // Use dynamic require to avoid webpack ESM warning
  try {
    const mod = typeof __webpack_require__ !== 'undefined'
      ? null  // Skip in webpack context (dev mode)
      : require('@opennextjs/cloudflare');
    if (mod && mod.getCloudflareContext) {
      return null; // signal to use async path
    }
  } catch (e) {}

  return null;
}

async function getCloudflareEnvAsync() {
  // Method 1: globalThis symbol (fastest, sync)
  try {
    const ctx = globalThis[Symbol.for("__cloudflare-context__")];
    if (ctx && ctx.env) return ctx.env;
  } catch (e) {}

  // Method 2: dynamic require (build time / Cloudflare runtime)
  // Use dynamic require to avoid webpack ESM warning in dev
  try {
    const pkgName = '@opennextjs/cloudflare';
    const mod = typeof __webpack_require__ !== 'undefined'
      ? null  // Skip in webpack context (dev mode)
      : require(pkgName);
    if (mod && mod.getCloudflareContext) {
      const { env } = await mod.getCloudflareContext();
      return env;
    }
  } catch (e) {}

  return null;
}

/**
 * Get Cloudflare environment bindings (DB, IMAGES, etc.)
 */
export async function getCfEnv() {
  try {
    return await getCloudflareEnvAsync();
  } catch (e) {
    console.warn('Failed to get Cloudflare context:', e.message);
    return null;
  }
}

/**
 * Get D1 database binding
 */
export async function getDB() {
  const env = await getCfEnv();
  return env?.DB || null;
}

/**
 * Get R2 bucket binding
 */
export async function getR2() {
  const env = await getCfEnv();
  return env?.IMAGES || null;
}
