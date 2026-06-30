#!/usr/bin/env node
/**
 * 本地完整测试：构建 SPA + 本地 D1/R2 + Pages Functions
 *
 * 用法: npm run dev:cf
 * 访问: http://localhost:8788
 *
 * 仅重建前端、不迁移数据: npm run dev:cf:lite
 */
import { existsSync, copyFileSync } from 'node:fs'
import { spawnSync, spawn } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const devVars = join(root, '.dev.vars')
const devVarsExample = join(root, '.dev.vars.example')
const lite = process.argv.includes('--lite')

if (!existsSync(devVars) && existsSync(devVarsExample)) {
  copyFileSync(devVarsExample, devVars)
  console.log('已从 .dev.vars.example 创建 .dev.vars（可按需修改）\n')
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    ...opts,
  })
  if (result.status !== 0)
    process.exit(result.status || 1)
}

console.log('1/2 构建 SPA...')
run('npm', ['run', 'build'])

if (lite) {
  console.log('\n2/2 启动 wrangler pages dev（跳过数据迁移）...\n')
}
else {
  console.log('\n2/8 应用本地 D1 迁移...')
  run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'aiovtue-blog', '--local'])

  console.log('\n3/8 同步文章到本地 R2 + D1...')
  run('node', ['scripts/migrate-posts-to-r2.mjs', '--local'])

  console.log('\n4/8 同步友链到本地 R2...')
  run('node', ['scripts/migrate-links-to-r2.mjs', '--local'])

  console.log('\n5/8 同步关于页到本地 R2...')
  run('node', ['scripts/migrate-about-to-r2.mjs', '--local'])

  console.log('\n6/8 同步相册到本地 R2...')
  run('node', ['scripts/migrate-gallery-to-r2.mjs', '--local'])

  console.log('\n7/8 同步公告栏到本地 D1...')
  run('node', ['scripts/migrate-notice-to-d1.mjs', '--local'])

  console.log('\n8/8 启动 wrangler pages dev...\n')
}

console.log('  首页:     http://localhost:8788')
console.log('  文章 API: http://localhost:8788/api/posts')
console.log('  友链 API: http://localhost:8788/api/links')
console.log('  关于 API: http://localhost:8788/api/about')
console.log('  相册 API: http://localhost:8788/api/gallery')
console.log('  后台:     http://localhost:8788/admin\n')

const child = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', '8788'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

child.on('exit', code => process.exit(code ?? 0))
