import type { LinksDetail } from '../types/links'
import { adminFetch } from './adminApi'

export async function fetchAdminLinks() {
  return adminFetch('/api/links') as Promise<LinksDetail>
}

export async function saveAdminLinks(source: string) {
  return adminFetch('/api/links', {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    body: source,
  })
}

export type { LinksDetail }
