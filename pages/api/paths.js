import { getDB } from '../../lib/cfContext'

/**
 * Rebuild tree structure from flat path_tree rows
 * Returns the same format as readAllFile's InfoArray
 */
function buildTreeFromRows(rows) {
  if (!rows || rows.length === 0) return {}

  // Group by parent_path
  const childrenMap = {}
  const nodeMap = {}

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

export default async function handler(req, res) {
  try {
    const db = await getDB()
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const { results } = await db.prepare(
      'SELECT * FROM path_tree ORDER BY path'
    ).all()

    const tree = buildTreeFromRows(results)

    res.status(200).json({
      paths: tree
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch paths'
    })
  }
}