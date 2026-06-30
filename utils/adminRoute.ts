/** 是否为 admin 区域路由（含登录页 /admin） */
export function isAdminRoutePath(path: string) {
  return path === '/admin' || path.startsWith('/admin/')
}

/** 除登录页外，其余 /admin/* 均需已登录 */
export function requiresAdminSession(path: string) {
  return path.startsWith('/admin/') && path !== '/admin/'
}

/** 登录成功后允许跳回的 admin 子路径 */
export function isSafeAdminRedirect(path: string) {
  return path.startsWith('/admin/') && path !== '/admin' && !path.startsWith('/admin?')
}
