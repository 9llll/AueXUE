#!/usr/bin/env node
/**
 * 将本地 Markdown 文章迁移到 R2 + D1（含 FTS 索引）
 *
 * 用法:
 *   pnpm migrate:posts
 *   pnpm migrate:posts --local   # 写入本地 D1（wrangler dev 用）
 *
 * 前置:
 *   npx wrangler d1 create aiovtue-blog
 *   npx wrangler r2 bucket create aiovtue-blog
 *   npx wrangler d1 migrations apply aiovtue-blog --remote
 *   更新 wrangler.toml 中的 database_id
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const useLocal = process.argv.includes('--local')
const remoteFlag = useLocal ? '--local' : '--remote'
const postsDir = existsSync(join(root, 'content', 'posts'))
  ? join(root, 'content', 'posts')
  : join(root, 'pages', 'posts')

function runWrangler(args) {
  if (process.platform === 'win32') {
    const cmd = ['wrangler', ...args]
      .map((arg) => /[\s"]/.test(arg) ? `"${String(arg).replace(/"/g, '\\"')}"` : String(arg))
      .join(' ')
    const result = spawnSync(`npx ${cmd}`, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    })
    if (result.status !== 0)
      process.exit(result.status || 1)
    return
  }

  const result = spawnSync('npx', ['wrangler', ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  })
  if (result.status !== 0)
    process.exit(result.status || 1)
}

function runWranglerSql(sql) {
  const file = join(root, '.migrate-tmp.sql')
  writeFileSync(file, sql, 'utf8')
  try {
    runWrangler(['d1', 'execute', 'aiovtue-blog', remoteFlag, '--file', file])
  }
  finally {
    if (existsSync(file))
      unlinkSync(file)
  }
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''")
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\'')))
    return value.slice(1, -1)
  return value
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match)
    return { data: {}, content: source }

  const yaml = match[1]
  const content = match[2]
  const data = {}
  let currentKey = null
  let listItems = null

  function flushList() {
    if (currentKey && listItems)
      data[currentKey] = listItems
    listItems = null
  }

  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line.trim() || line.trim().startsWith('#'))
      continue

    const listMatch = line.match(/^\s*-\s+(.+)$/)
    if (listMatch && listItems) {
      listItems.push(unquote(listMatch[1].trim()))
      continue
    }

    flushList()
    const kvMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kvMatch)
      continue

    currentKey = kvMatch[1]
    const value = kvMatch[2].trim()
    if (!value) {
      listItems = []
      continue
    }
    data[currentKey] = unquote(value)
  }

  flushList()
  return { data, content }
}

function stripMarkdown(content) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sqlValue(value) {
  if (value === null || value === undefined)
    return 'NULL'
  return `'${sqlEscape(value)}'`
}

if (!existsSync(postsDir)) {
  console.error(`未找到文章目录: ${postsDir}`)
  process.exit(1)
}

const files = readdirSync(postsDir).filter(name => name.endsWith('.md'))
if (!files.length) {
  console.log('没有可迁移的 Markdown 文件。')
  process.exit(0)
}

mkdirSync(join(root, 'content', 'posts'), { recursive: true })

console.log(`准备迁移 ${files.length} 篇文章 (${useLocal ? 'local' : 'remote'})...`)

for (const file of files) {
  const slug = basename(file, '.md')
  const sourcePath = join(postsDir, file)
  const source = readFileSync(sourcePath, 'utf8')
  const { data: fm, content } = parseFrontmatter(source)
  const r2Key = `posts/${slug}.md`

  runWrangler(['r2', 'object', 'put', `aiovtue-blog/${r2Key}`, '--file', sourcePath, remoteFlag])

  const title = fm.title || slug
  const date = fm.date || new Date().toISOString().slice(0, 10)
  const excerpt = fm.excerpt || null
  const updated = fm.updated || null
  const cover = fm.cover || null
  const published = fm.draft === true || fm.draft === 'true' || fm.hidden === true || fm.hidden === 'true' ? 0 : 1
  const categories = fm.categories ? JSON.stringify(fm.categories) : null
  const tags = Array.isArray(fm.tags) ? JSON.stringify(fm.tags) : fm.tags ? JSON.stringify([fm.tags]) : null
  const plain = stripMarkdown(content)
  const categoryPath = !fm.categories
    ? 'Uncategorized'
    : typeof fm.categories === 'string'
      ? fm.categories
      : Array.isArray(fm.categories) && fm.categories.length
        ? fm.categories.join('/')
        : 'Uncategorized'
  const tagList = Array.isArray(fm.tags) ? fm.tags.map(String) : fm.tags ? [String(fm.tags)] : []
  const pinOrder = (() => {
    const raw = fm.pin_order ?? fm.top
    if (raw === undefined || raw === null || raw === '' || raw === false)
      return 0
    if (raw === true)
      return 1
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  })()

  const sql = `
    INSERT INTO posts (slug, title, excerpt, description, date, updated, categories, tags, cover, pin_order, published, r2_key, updated_at)
    VALUES (
      ${sqlValue(slug)},
      ${sqlValue(title)},
      ${sqlValue(excerpt)},
      NULL,
      ${sqlValue(date)},
      ${sqlValue(updated)},
      ${sqlValue(categories)},
      ${sqlValue(tags)},
      ${sqlValue(cover)},
      ${pinOrder},
      ${published},
      ${sqlValue(r2Key)},
      datetime('now')
    )
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      excerpt = excluded.excerpt,
      date = excluded.date,
      updated = excluded.updated,
      categories = excluded.categories,
      tags = excluded.tags,
      cover = excluded.cover,
      pin_order = excluded.pin_order,
      published = excluded.published,
      r2_key = excluded.r2_key,
      updated_at = datetime('now');
    DELETE FROM posts_fts WHERE slug = ${sqlValue(slug)};
    INSERT INTO posts_fts (slug, title, excerpt, content) VALUES (
      ${sqlValue(slug)},
      ${sqlValue(title)},
      ${sqlValue(excerpt || '')},
      ${sqlValue(plain)}
    );
    DELETE FROM post_categories WHERE post_slug = ${sqlValue(slug)};
    DELETE FROM post_tags WHERE post_slug = ${sqlValue(slug)};
    INSERT INTO post_categories (post_slug, category_path) VALUES (${sqlValue(slug)}, ${sqlValue(categoryPath)});
    ${tagList.map(tag => `INSERT INTO post_tags (post_slug, tag) VALUES (${sqlValue(slug)}, ${sqlValue(tag)});`).join('\n')}
  `

  runWranglerSql(sql)
  console.log(`已迁移: ${slug}`)
}

console.log('\n迁移完成。')
