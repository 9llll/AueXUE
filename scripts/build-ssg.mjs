import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const BUILD_DONE_MARKERS = [
  '[HOOK] build:after done',
  'RSS Feed Files',
]
const GRACE_MS = 800
const HEARTBEAT_MS = 45_000
const MAX_MS = 20 * 60 * 1000

const require = createRequire(import.meta.url)
const valaxyBin = require.resolve('valaxy/bin/valaxy.mjs')
const distIndex = resolve(process.cwd(), 'dist/index.html')

const child = spawn(process.execPath, [valaxyBin, 'build', '--ssg'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
  windowsHide: true,
})

let finished = false
let successTimer
let outputBuffer = ''

function killChildTree() {
  if (!child.pid)
    return

  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }

  try {
    child.kill('SIGKILL')
  }
  catch {}
}

function finishSuccess() {
  if (finished)
    return
  finished = true
  clearTimeout(maxTimer)
  clearTimeout(successTimer)
  clearInterval(heartbeatTimer)

  if (!existsSync(distIndex)) {
    console.error('\n构建流程已结束，但未找到 dist/index.html，请检查构建日志。\n')
    killChildTree()
    process.exit(1)
    return
  }

  console.log('\n✓ 构建已完成，正在结束进程…\n')
  killChildTree()
  setTimeout(() => process.exit(0), 200)
}

function finishError(code) {
  if (finished)
    return
  finished = true
  clearTimeout(maxTimer)
  clearTimeout(successTimer)
  clearInterval(heartbeatTimer)
  process.exit(code ?? 1)
}

function scheduleSuccess() {
  clearTimeout(successTimer)
  successTimer = setTimeout(finishSuccess, GRACE_MS)
}

function inspectOutput(text) {
  outputBuffer += text
  if (outputBuffer.length > 8192)
    outputBuffer = outputBuffer.slice(-8192)

  if (BUILD_DONE_MARKERS.some(marker => outputBuffer.includes(marker)))
    scheduleSuccess()
}

const heartbeatTimer = setInterval(() => {
  if (finished)
    return
  console.log('\n⏳ 仍在构建中（SSG 预渲染可能较慢，请稍候）…\n')
}, HEARTBEAT_MS)

const maxTimer = setTimeout(() => {
  if (finished)
    return
  console.error('\nSSG 构建超时（20 分钟）。\n')
  killChildTree()
  finishError(1)
}, MAX_MS)

child.stdout.on('data', (chunk) => {
  const text = chunk.toString()
  process.stdout.write(text)
  inspectOutput(text)
})

child.stderr.on('data', (chunk) => {
  const text = chunk.toString()
  process.stderr.write(text)
  inspectOutput(text)
})

child.on('error', (error) => {
  console.error(error)
  finishError(1)
})

child.on('close', (code) => {
  if (finished)
    return
  if (code === 0 || existsSync(distIndex))
    finishSuccess()
  else
    finishError(code)
})
