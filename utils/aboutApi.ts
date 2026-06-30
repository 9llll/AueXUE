import type { AboutDetail } from '../types/about'

export async function fetchAbout() {
  const res = await fetch('/api/about')
  if (res.status === 404)
    return null
  if (!res.ok)
    throw new Error(`加载关于页失败 (${res.status})`)
  return res.json() as Promise<AboutDetail>
}
