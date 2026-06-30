import type { LinksDetail } from '../types/links'

export async function fetchLinks() {
  const res = await fetch('/api/links')
  if (res.status === 404)
    return null
  if (!res.ok)
    throw new Error(`加载友链失败 (${res.status})`)
  return res.json() as Promise<LinksDetail>
}
