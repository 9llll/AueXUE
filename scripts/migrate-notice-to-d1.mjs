#!/usr/bin/env node
/**
 * 将公告栏 JSON 写入 D1（单条 notice_board 记录）
 *
 * 用法:
 *   pnpm migrate:notice
 *   pnpm migrate:notice:local
 *
 * 数据源: content/notice.json
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const root = process.cwd()
const useLocal = process.argv.includes('--local')
const remoteFlag = useLocal ? '--local' : '--remote'
const sourcePath = join(root, 'content', 'notice.json')

function runWrangler(args) {
  if (process.platform === 'win32') {
    const cmd = ['wrangler', ...args]
      .map(arg => (/[\s"]/.test(arg) ? `"${String(arg).replace(/"/g, '\\"')}"` : String(arg)))
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

function sqlEscape(value) {
  return String(value).replace(/'/g, "''")
}

if (!existsSync(sourcePath)) {
  console.error('未找到 content/notice.json，请先创建公告栏种子文件')
  process.exit(1)
}

const source = readFileSync(sourcePath, 'utf8')
let parsed
try {
  parsed = JSON.parse(source)
}
catch {
  console.error('content/notice.json 不是合法 JSON')
  process.exit(1)
}

const title = String(parsed.title || '公告栏').trim() || '公告栏'
const sectionsJson = JSON.stringify(Array.isArray(parsed.sections) ? parsed.sections : [])

console.log(`写入公告栏到 D1 (${useLocal ? 'local' : 'remote'}): ${sourcePath}`)

const sql = `INSERT INTO notice_board (id, title, sections_json, updated_at)
VALUES (1, '${sqlEscape(title)}', '${sqlEscape(sectionsJson)}', datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  sections_json = excluded.sections_json,
  updated_at = datetime('now');`

const tempFile = join(tmpdir(), `notice-migrate-${Date.now()}.sql`)
writeFileSync(tempFile, sql, 'utf8')

try {
  runWrangler([
    'd1',
    'execute',
    'aiovtue-blog',
    remoteFlag,
    '--file',
    tempFile,
  ])
}
finally {
  try {
    unlinkSync(tempFile)
  }
  catch {}
}

console.log('公告栏迁移完成。')
