#!/usr/bin/env node
/**
 * 将关于页 Markdown 上传到 R2（单文件 about/index.md）
 *
 * 用法:
 *   pnpm migrate:about
 *   pnpm migrate:about:local
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const useLocal = process.argv.includes('--local')
const remoteFlag = useLocal ? '--local' : '--remote'

const candidates = [
  join(root, 'content', 'about', 'index.md'),
  join(root, 'pages', 'about', 'index.md'),
]

const sourcePath = candidates.find(path => existsSync(path))

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

if (!sourcePath) {
  console.error('未找到关于页源文件，请创建 content/about/index.md')
  process.exit(1)
}

console.log(`上传关于页: ${sourcePath} → R2 about/index.md (${useLocal ? 'local' : 'remote'})`)

runWrangler([
  'r2',
  'object',
  'put',
  'aiovtue-blog/about/index.md',
  remoteFlag,
  '--file',
  sourcePath,
  '--content-type',
  'text/markdown; charset=utf-8',
])

console.log('关于页迁移完成。')
