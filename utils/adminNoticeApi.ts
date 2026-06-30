import type { NoticeBoard, NoticeBoardDetail } from '../types/notice'
import { adminFetch } from './adminApi'

export async function fetchAdminNotice() {
  return adminFetch('/api/notice') as Promise<NoticeBoardDetail>
}

export async function saveAdminNotice(payload: NoticeBoard) {
  return adminFetch('/api/notice', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  }) as Promise<NoticeBoardDetail>
}
