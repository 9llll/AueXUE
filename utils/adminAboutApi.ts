import type { AboutDetail } from '../types/about'
import { adminFetch } from './adminApi'

export async function fetchAdminAbout() {
  return adminFetch('/api/about') as Promise<AboutDetail>
}

export async function saveAdminAbout(source: string) {
  return adminFetch('/api/about', {
    method: 'PUT',
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    body: source,
  })
}

export type { AboutDetail }
