import type { NoticeBoardDetail } from '../types/notice'

export async function fetchNotice() {
  const res = await fetch('/api/notice')
  if (res.status === 404)
    return null
  if (!res.ok)
    throw new Error(`加载公告栏失败 (${res.status})`)
  return res.json() as Promise<NoticeBoardDetail>
}
