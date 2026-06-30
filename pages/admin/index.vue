<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuth } from '../../composables/useAdminAuth'
import { fetchAdminPostList } from '../../utils/adminPostsApi'
import { isSafeAdminRedirect } from '../../utils/adminRoute'
import AdminLogin from '../../components/admin/AdminLogin.vue'
import AdminPostList from '../../components/admin/AdminPostList.vue'

const route = useRoute()
const router = useRouter()

const { authenticated, username, loading, isAuthenticated, login, logout, refresh } = useAdminAuth()
const loginRef = ref<InstanceType<typeof AdminLogin> | null>(null)
const posts = ref<Awaited<ReturnType<typeof fetchAdminPostList>>>([])
const listLoading = ref(false)
const listError = ref<string | null>(null)

async function loadPosts() {
  listLoading.value = true
  listError.value = null
  try {
    posts.value = await fetchAdminPostList()
  }
  catch (err) {
    listError.value = err instanceof Error ? err.message : '加载文章失败'
  }
  finally {
    listLoading.value = false
  }
}

async function handleLogin(payload: { username: string, password: string }) {
  loginRef.value?.setSubmitting(true)
  try {
    await login(payload.username, payload.password)

    const redirect = typeof route.query.redirect === 'string'
      ? route.query.redirect
      : ''
    if (isSafeAdminRedirect(redirect)) {
      await router.replace(redirect)
      return
    }

    let stored = ''
    try {
      stored = sessionStorage.getItem('admin-login-return-path') || ''
      sessionStorage.removeItem('admin-login-return-path')
    }
    catch {
      // ignore
    }
    if (isSafeAdminRedirect(stored)) {
      await router.replace(stored)
      return
    }

    await loadPosts()
  }
  catch (err) {
    loginRef.value?.setError(err instanceof Error ? err.message : '登录失败')
  }
  finally {
    loginRef.value?.setSubmitting(false)
  }
}

async function handleLogout() {
  await logout({ clearRemembered: true })
  posts.value = []
}

onMounted(async () => {
  await refresh()
  if (isAuthenticated.value)
    await loadPosts()
})
</script>

<template>
  <div class="admin-page">
    <AdminLogin
      v-if="!authenticated"
      ref="loginRef"
      @submit="handleLogin"
    />

    <div v-if="loading && !authenticated" class="admin-page__checking">
      验证登录状态…
    </div>

    <AdminShell
      v-else-if="authenticated"
      :username="username"
      @logout="handleLogout"
    >
      <template #topbar>
        <div class="admin-layout__page-head">
          <div>
            <h1 class="admin-layout__page-title">
              文章管理
            </h1>
            <p class="admin-layout__page-subtitle">
              管理您的博客文章
            </p>
          </div>
        </div>
      </template>
      <AdminPostList
        :posts="posts"
        :loading="listLoading"
        :error="listError"
        @refresh="loadPosts"
      />
    </AdminShell>
  </div>
</template>

<style scoped lang="scss">
.admin-page {
  position: relative;
  min-height: 100dvh;

  &__checking {
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(61 61 61 / 72%);
    color: #fff;
    font-size: 0.9375rem;
    pointer-events: none;
  }
}
</style>

<route lang="yaml">
meta:
  layout: false
</route>
