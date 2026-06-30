import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * 禁用 valaxy-addon-vercount 的 PeerJS 在线人数，避免连接 0.peerjs.com 失败刷屏。
 */
export function patchVercountNoPeer(): Plugin {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const composablePatch = `${root}/patches/vercountComposable.ts`
  const onelineStub = `${root}/patches/vercountOnelineStub.ts`

  return {
    name: 'patch-vercount-no-peer',
    enforce: 'pre',
    load(id) {
      const normalized = id.split('?')[0].replace(/\\/g, '/')
      if (/valaxy-addon-vercount\/client\/composable\.ts$/.test(normalized))
        return readFileSync(composablePatch, 'utf8')
      if (/valaxy-addon-vercount\/helpers\/oneline\.ts$/.test(normalized))
        return readFileSync(onelineStub, 'utf8')
    },
  }
}
