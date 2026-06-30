#!/usr/bin/env node
/**
 * 将 pages/posts/*.md 移至 content/posts/，避免与动态路由 [...slug].vue 冲突
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const srcDir = join(root, 'pages', 'posts')
const destDir = join(root, 'content', 'posts')

if (!existsSync(srcDir)) {
  console.log('pages/posts 不存在，跳过。')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })

const files = readdirSync(srcDir).filter(name => name.endsWith('.md'))
if (!files.length) {
  console.log('没有需要移动的 Markdown 文件。')
  process.exit(0)
}

for (const file of files) {
  const src = join(srcDir, file)
  const dest = join(destDir, file)
  if (!existsSync(dest))
    copyFileSync(src, dest)
  unlinkSync(src)
  console.log(`已移动: ${file}`)
}

console.log(`\n共移动 ${files.length} 篇文章到 content/posts/`)
