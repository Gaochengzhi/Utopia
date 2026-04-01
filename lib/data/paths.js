/**
 * Shared data-access layer for path_tree queries.
 *
 * Both getStaticProps (SSG) and API route handlers call these functions
 * so the query logic lives in one place.
 */

/**
 * Rebuild a nested tree structure from flat path_tree rows.
 * Returns the same format as readAllFile's InfoArray.
 *
 * @param {Array} rows – flat rows from D1 `path_tree` table
 * @returns {Object} – nested tree object
 */
export function buildTreeFromRows(rows) {
  if (!rows || rows.length === 0) return {}

  const nodeMap = {}
  const childrenMap = {}

  for (const row of rows) {
    const node = {
      title: row.title,
      path: row.path,
      key: row.node_key || String(Math.floor(Math.random() * 9e9)),
      isLeaf: !!row.is_leaf,
      type: row.type,
      time: row.created_at,
    }

    if (!row.is_leaf) {
      node.children = []
    }

    nodeMap[row.path] = node

    const parentKey = row.parent_path || '__root__'
    if (!childrenMap[parentKey]) {
      childrenMap[parentKey] = []
    }
    childrenMap[parentKey].push(node)
  }

  // Link children to parents
  for (const [parentPath, children] of Object.entries(childrenMap)) {
    if (parentPath === '__root__') continue
    if (nodeMap[parentPath]) {
      nodeMap[parentPath].children = children
    }
  }

  // The root nodes are those without a parent
  const roots = childrenMap['__root__'] || []

  // If there's a single root, return it directly (matches readAllFile format)
  if (roots.length === 1) {
    return roots[0]
  }

  // Otherwise wrap in a synthetic root
  return {
    title: 'content',
    key: 'myrootkey',
    isLeaf: false,
    type: 'folder',
    children: roots,
  }
}

/**
 * Fetch the full path tree from D1 and build a nested tree.
 *
 * @param {D1Database} db
 * @returns {Promise<Object>}
 */
export async function getPathTree(db) {
  const { results } = await db.prepare(
    'SELECT * FROM path_tree ORDER BY path'
  ).all()

  return buildTreeFromRows(results)
}

/**
 * Fetch top-level folders (direct children of 'post').
 *
 * @param {D1Database} db
 * @returns {Promise<Array>}
 */
export async function getTopLevelFolders(db) {
  const { results: folderRows } = await db.prepare(`
    SELECT title, path, type FROM path_tree 
    WHERE parent_path = 'post' AND type = 'folder'
    ORDER BY title
  `).all()

  return (folderRows || []).map(row => ({
    name: row.title,
    path: `/${row.path}`,
    isFolder: true,
  }))
}

/**
 * Extract a human-readable title from markdown content_preview.
 * Tries h1, h2, then first non-empty text line.
 *
 * @param {string} content
 * @param {string} fallback
 * @returns {string}
 */
function extractTitle(content, fallback) {
  if (!content || typeof content !== 'string') return fallback
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1]
  const lines = content.split('\n').slice(0, 5)
  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/)
    if (h2Match) return h2Match[1]
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('!')) {
      const parsed = trimmed.replace(/[#*_~`\[\]]/g, '').trim()
      if (parsed) return parsed
    }
  }
  return fallback
}

/**
 * Fetch contents of a folder path (children with article metadata joined).
 *
 * @param {D1Database} db
 * @param {string} folderPath – e.g. 'post/diary'
 * @returns {Promise<Array|null>} – array of folder contents, or null if empty
 */
export async function getFolderContents(db, folderPath) {
  const { results: children } = await db.prepare(`
    SELECT pt.*, p.title AS article_title, p.created_at AS article_created_at, p.content_preview
    FROM path_tree pt
    LEFT JOIN posts p ON p.slug = pt.path
    WHERE pt.parent_path = ?
    ORDER BY pt.type DESC, p.created_at DESC, pt.title
  `).bind(folderPath).all()

  if (!children || children.length === 0) return null

  return children.map(row => {
    const fallbackName = (row.article_title || row.title).replace(/\.md$/i, '')
    return {
      name: row.type === 'folder' ? fallbackName : extractTitle(row.content_preview, fallbackName),
      path: `/${row.path}`,
      isFolder: row.type === 'folder',
      time: row.article_created_at || null,
    }
  })
}
