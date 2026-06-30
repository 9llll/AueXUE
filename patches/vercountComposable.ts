/**
 * 去掉 PeerJS 在线人数（Oneline），仅保留 Vercount 的 PV/UV 统计。
 * 公共 PeerJS 服务器在国内/本地预览时常不可用，会在控制台报错。
 */
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isClient } from '@vueuse/core'
import type { Page, Site } from '../types'
import { useAddonVercountConfig } from './options'

export function useAddonVercount() {
  const vercountOptions = useAddonVercountConfig()
  const { placeholder, api, baseUrl } = vercountOptions.value

  const page = ref<Page>({ pv: placeholder, uv: placeholder, online: placeholder })
  const site = ref<Site>({ pv: placeholder, uv: placeholder, online: placeholder })

  if (!isClient)
    return { page, site }

  const router = useRouter()

  const defaultUrl = 'https://events.vercount.one/api/v2/log?jsonpCallback=VisitorCountCallback'
  const cnUrl = 'https://cn.vercount.one/api/v2/log?jsonpCallback=VisitorCountCallback'

  const url = api === 'cn' ? cnUrl : api || defaultUrl

  const fetchVisitorCount = (href: string) => {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: href }),
    })
      .then((response) => {
        if (!response.ok)
          throw new Error('Network response was not ok.')

        return response.json()
      })
      .then((response) => {
        const data = response.data
        page.value.pv = data.page_pv
        page.value.uv = data.page_uv

        site.value.pv = data.site_pv
        site.value.uv = data.site_uv
      })
      .catch((error) => {
        console.error('Error fetching visitor count:', error)
      })
  }

  router.beforeEach((to) => {
    const completeUrl = `${baseUrl}${to.fullPath}`
    fetchVisitorCount(completeUrl)
  })

  onMounted(() => {
    fetchVisitorCount(window.location.href)
  })

  return { page, site }
}
