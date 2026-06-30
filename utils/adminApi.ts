export async function adminFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string')
    headers.set('Content-Type', 'application/json')

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
    cache: 'no-store',
    signal: init.signal ?? AbortSignal.timeout(60_000),
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    }
    catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    const message = (data as { message?: string })?.message || `请求失败 (${response.status})`
    throw new Error(message)
  }

  return data
}

export async function checkAdminSession() {
  try {
    return await adminFetch('/api/admin/me') as { authenticated: boolean, username?: string }
  }
  catch {
    return { authenticated: false }
  }
}

export async function loginAdmin(username: string, password: string) {
  return adminFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }) as Promise<{ ok: boolean, username: string }>
}

export async function logoutAdmin() {
  return adminFetch('/api/admin/logout', { method: 'POST' }) as Promise<{ ok: boolean }>
}
