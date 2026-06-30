#!/usr/bin/env node
/**
 * 将相册 Markdown 上传到 R2（gallery/index.md + gallery/{slug}/index.md）
 *
 * 用法:
 *   pnpm migrate:gallery
 *   pnpm migrate:gallery:local
 *
 * 数据源优先级:
 *   content/gallery/** → pages/gallery/**
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const useLocal = process.argv.includes('--local')
const remoteFlag = useLocal ? '--local' : '--remote'
const bucketPrefix = 'aiovtue-blog'

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

function resolveGalleryRoot() {
  const contentRoot = join(root, 'content', 'gallery')
  if (existsSync(join(contentRoot, 'index.md')))
    return contentRoot

  const pagesRoot = join(root, 'pages', 'gallery')
  if (existsSync(join(pagesRoot, 'index.md')))
    return pagesRoot

  return null
}

function uploadMarkdown(r2Key, filePath) {
  console.log(`上传: ${filePath} → R2 ${r2Key} (${useLocal ? 'local' : 'remote'})`)
  runWrangler([
    'r2',
    'object',
    'put',
    `${bucketPrefix}/${r2Key}`,
    remoteFlag,
    '--file',
    filePath,
    '--content-type',
    'text/markdown; charset=utf-8',
  ])
}

const galleryRoot = resolveGalleryRoot()
if (!galleryRoot) {
  console.error('未找到相册源目录，请创建 content/gallery/index.md')
  process.exit(1)
}

const hubPath = join(galleryRoot, 'index.md')
if (!existsSync(hubPath)) {
  console.error('未找到相册列表文件 index.md')
  process.exit(1)
}

uploadMarkdown('gallery/index.md', hubPath)

for (const entry of readdirSync(galleryRoot, { withFileTypes: true })) {
  if (!entry.isDirectory())
    continue

  const albumPath = join(galleryRoot, entry.name, 'index.md')
  if (!existsSync(albumPath))
    continue

  uploadMarkdown(`gallery/${entry.name}/index.md`, albumPath)
}

console.log('相册迁移完成。')
