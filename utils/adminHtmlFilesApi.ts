import type { HtmlFileDetail, HtmlFileUpsertPayload } from '../types/htmlFile'
import { adminFetch } from './adminApi'

export async function fetchAdminHtmlFiles() {
  return adminFetch('/api/html-files') as Promise<{ files: import('../types/htmlFile').HtmlFileSummary[] }>
}

export async function fetchAdminHtmlFile(slug: string) {
  return adminFetch(`/api/html-files/${encodeURIComponent(slug)}`) as Promise<HtmlFileDetail>
}

export async function saveAdminHtmlFile(payload: HtmlFileUpsertPayload) {
  return adminFetch(`/api/html-files/${encodeURIComponent(payload.slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  }) as Promise<HtmlFileDetail>
}

export async function deleteAdminHtmlFile(slug: string) {
  return adminFetch(`/api/html-files/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  }) as Promise<{ ok: boolean }>
}
