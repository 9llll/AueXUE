import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const localTwikoo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../utils/twikooLocal.ts',
)

export function twikooLocalPlugin(): Plugin {
  return {
    name: 'twikoo-local',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer?.includes('valaxy-addon-twikoo'))
        return null

      if (source === './twikoo' || source.endsWith('/client/twikoo') || source.endsWith('/client/twikoo.ts'))
        return localTwikoo

      return null
    },
  }
}
