import type { Plugin } from 'vite'

/**
 * SSG 预渲染 HTML 与客户端首次渲染存在少量不一致时，Vue hydration 可能清空 #app。
 * 禁用 hydration 后改为客户端挂载，保留预渲染 HTML 的 SEO 价值，同时避免白屏。
 */
export function disableSsgHydration(): Plugin {
  return {
    name: 'disable-ssg-hydration',
    enforce: 'post',
    transform(code) {
      if (!code.includes('app.mount(\'#app\', hydrate)'))
        return

      return code.replace(
        /const hydrate = !!\(appEl && appEl\.innerHTML\.trim\(\)\)/,
        'const hydrate = false',
      )
    },
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'chunk')
          continue
        if (!item.code.includes('getElementById(`app`)') || !item.code.includes('.mount(`#app`'))
          continue

        item.code = item.code.replace(
          /(\w)=!!\(\w&&\w\.innerHTML\.trim\(\)\)/,
          '$1=false',
        )
      }
    },
  }
}
