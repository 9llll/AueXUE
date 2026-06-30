import { computed, ref } from 'vue'
import { clearRememberedLogin } from '../utils/adminRememberLogin'
import { checkAdminSession, loginAdmin, logoutAdmin } from '../utils/adminApi'

const authenticated = ref(false)
const username = ref<string | null>(null)
const loading = ref(true)
let checked = false

export function useAdminAuth() {
  const isReady = computed(() => !loading.value)
  const isAuthenticated = computed(() => authenticated.value)

  async function refresh() {
    loading.value = true
    try {
      const result = await checkAdminSession()
      authenticated.value = result.authenticated
      username.value = result.username || null
    }
    finally {
      loading.value = false
      checked = true
    }
  }

  async function login(user: string, password: string) {
    const result = await loginAdmin(user, password)
    authenticated.value = true
    username.value = result.username
  }

  async function logout(options?: { clearRemembered?: boolean }) {
    try {
      await logoutAdmin()
    }
    catch {
      // 忽略网络错误，仍清除本地登录态
    }
    authenticated.value = false
    username.value = null
    if (options?.clearRemembered)
      clearRememberedLogin()
  }

  if (!checked)
    void refresh()

  return {
    authenticated,
    username,
    loading,
    isReady,
    isAuthenticated,
    refresh,
    login,
    logout,
  }
}
