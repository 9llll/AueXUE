#!/usr/bin/env node
/**
 * 从 posts 表已有 categories/tags JSON 回填 post_categories / post_tags
 *
 * 用法:
 *   node scripts/backfill-taxonomy.mjs
 *   node scripts/backfill-taxonomy.mjs --local
 */

import { spawnSync } from 'node:child_process'

const root = process.cwd()
const useLocal = process.argv.includes('--local')
const remoteFlag = useLocal ? '--local' : '--remote'

function runWranglerSql(sql) {
  const result = spawnSync('npx', ['wrangler', 'd1', 'execute', 'aiovtue-blog', remoteFlag, '--command', sql], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0)
    process.exit(result.status || 1)
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''")
}

function categoryPath(categoriesJson) {
  if (!categoriesJson)
    return 'Uncategorized'
  try {
    const value = JSON.parse(categoriesJson)
    if (typeof value === 'string')
      return value.trim() || 'Uncategorized'
    if (Array.isArray(value)) {
      const parts = value.map(String).filter(Boolean)
      return parts.length ? parts.join('/') : 'Uncategorized'
    }
  }
  catch {}
  return 'Uncategorized'
}

function parseTags(tagsJson) {
  if (!tagsJson)
    return []
  try {
    const value = JSON.parse(tagsJson)
    if (Array.isArray(value))
      return value.map(String)
    return [String(value)]
  }
  catch {
    return []
  }
}

function runWranglerJson(sql) {
  const result = spawnSync('npx', [
    'wrangler', 'd1', 'execute', 'aiovtue-blog', remoteFlag, '--command', sql, '--json',
  ], {
    cwd: root,
    encoding: 'utf8',
    shell: true,
  })
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    process.exit(result.status || 1)
  }
  return JSON.parse(result.stdout || '[]')
}

console.log(`[backfill-taxonomy] 开始回填 (${useLocal ? 'local' : 'remote'})`)

runWranglerSql('DELETE FROM post_categories; DELETE FROM post_tags;')

const rows = runWranglerJson('SELECT slug, categories, tags FROM posts;')
const posts = rows?.[0]?.results || []

for (const row of posts) {
  const path = categoryPath(row.categories)
  runWranglerSql(`INSERT INTO post_categories (post_slug, category_path) VALUES ('${sqlEscape(row.slug)}', '${sqlEscape(path)}');`)

  for (const tag of parseTags(row.tags)) {
    runWranglerSql(`INSERT INTO post_tags (post_slug, tag) VALUES ('${sqlEscape(row.slug)}', '${sqlEscape(tag)}');`)
  }
}

console.log(`[backfill-taxonomy] 完成，处理 ${posts.length} 篇文章`)
