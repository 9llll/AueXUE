<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeConfig } from '../../node_modules/valaxy-theme-sakura/composables'
import { clearRememberedLogin, loadRememberedLogin, persistRememberedLogin } from '../../utils/adminRememberLogin'

const emit = defineEmits<{
  submit: [payload: { username: string, password: string }]
}>()

const RETURN_PATH_KEY = 'admin-login-return-path'

const router = useRouter()
const themeConfig = useThemeConfig()

const username = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const error = ref<string | null>(null)
const submitting = ref(false)

const siteTitle = 'AIOVTUE-雪'
const siteSubtitle = '记录生活 · 分享热爱'

async function loadRememberedCredentials() {
  const saved = await loadRememberedLogin()
  remember.value = saved.remember
  if (saved.remember) {
    username.value = saved.username
    password.value = saved.password
  }
}

watch(remember, (value, previous) => {
  if (previous && !value)
    clearRememberedLogin()
})

async function onSubmit() {
  error.value = null
  submitting.value = true
  try {
    await persistRememberedLogin(username.value.trim(), password.value, remember.value)
    emit('submit', {
      username: username.value.trim(),
      password: password.value,
    })
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败'
  }
  finally {
    submitting.value = false
  }
}

function goBack() {
  let returnPath: string | null = null
  try {
    returnPath = sessionStorage.getItem(RETURN_PATH_KEY)
    sessionStorage.removeItem(RETURN_PATH_KEY)
  }
  catch {
    // ignore
  }

  if (returnPath && !returnPath.startsWith('/admin'))
    router.push(returnPath)
  else
    router.push('/')
}

onMounted(() => {
  void loadRememberedCredentials()
})

defineExpose({
  setError(message: string) {
    error.value = message
    submitting.value = false
  },
  setSubmitting(value: boolean) {
    submitting.value = value
  },
})
</script>

<template>
  <div class="admin-login-page">
    <div class="admin-login-page__bg" aria-hidden="true">
      <SakuraHeroBackground
        :urls="themeConfig.hero?.urls"
        random-on-mount
        scroll-background
        disable-transition
      />
    </div>

    <div class="admin-login-page__content">
      <button
        type="button"
        class="admin-login-page__back sakura-safe-padding"
        title="返回上一页"
        @click="goBack"
      >
        <span class="i-mdi-arrow-left" aria-hidden="true" />
        <span>返回</span>
      </button>

      <header class="admin-login-page__hero">
        <h1>{{ siteTitle }}</h1>
        <p>{{ siteSubtitle }}</p>
      </header>

      <form class="admin-login-page__card" @submit.prevent="onSubmit">
        <h2 class="admin-login-page__card-title">
          登录你的账号
        </h2>

        <label class="admin-login-page__field">
          <span class="admin-login-page__field-icon i-mdi-account-outline" aria-hidden="true" />
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="请输入账号"
            required
          >
        </label>

        <label class="admin-login-page__field">
          <span class="admin-login-page__field-icon i-mdi-lock-outline" aria-hidden="true" />
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="请输入密码"
            required
          >
          <button
            type="button"
            class="admin-login-page__field-toggle"
            :title="showPassword ? '隐藏密码' : '显示密码'"
            @click="showPassword = !showPassword"
          >
            <span :class="showPassword ? 'i-mdi-eye-off-outline' : 'i-mdi-eye-outline'" aria-hidden="true" />
          </button>
        </label>

        <label class="admin-login-page__remember">
          <input v-model="remember" type="checkbox">
          <span>记住我</span>
        </label>

        <p v-if="error" class="admin-login-page__error">
          {{ error }}
        </p>

        <button type="submit" class="admin-login-page__submit" :disabled="submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>

        <p class="admin-login-page__footer">
          欢迎回来，继续记录你的美好时光
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-login-page {
  --admin-border: 1px solid #000;
  --admin-border-color: #000;
  position: fixed;
  inset: 0;
  z-index: 10000;
  overflow: auto;
  color: #fff;
  background: #3d3d3d;

  &__bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: #3d3d3d;

    :deep(.sakura-hero-background) {
      height: 100%;
      min-height: 100dvh;
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    display: flex;
    min-height: 100dvh;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.25rem 3rem;
    box-sizing: border-box;
  }

  &__back {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    height: var(--sakura-navbar-height, 3.5rem);
    margin: 0;
    padding: 0 0.85rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #fff;
    font-size: 0.9375rem;
    cursor: pointer;
    text-shadow: 0 1px 8px rgb(0 0 0 / 35%);
    transition:
      opacity 0.2s ease,
      transform 0.15s ease,
      background 0.2s ease;

    span:first-child {
      width: 1.25rem;
      height: 1.25rem;
      transition: transform 0.15s ease;
    }

    &:hover {
      background: rgb(255 255 255 / 14%);

      span:first-child {
        transform: translateX(-2px);
      }
    }

    &:active {
      transform: scale(0.96);
      background: rgb(255 255 255 / 22%);
      opacity: 0.92;

      span:first-child {
        transform: translateX(-3px);
      }
    }
  }

  &__hero {
    margin-bottom: 2rem;
    text-align: center;
    text-shadow: 0 2px 16px rgb(0 0 0 / 35%);

    h1 {
      margin: 0 0 0.5rem;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    p {
      margin: 0;
      font-size: clamp(0.9375rem, 2.5vw, 1.0625rem);
      font-weight: 300;
      opacity: 0.95;
    }
  }

  &__card {
    width: min(100%, 400px);
    padding: 2rem 2rem 1.75rem;
    border: var(--admin-border);
    border-radius: 1.5rem;
    background: rgb(255 255 255 / 58%);
    box-shadow:
      0 12px 40px rgb(0 0 0 / 12%),
      inset 0 1px 0 rgb(255 255 255 / 65%);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  &__card-title {
    margin: 0 0 1.5rem;
    text-align: center;
    font-size: 1.125rem;
    font-weight: 600;
    color: #4c4948;
  }

  &__field {
    position: relative;
    display: block;
    margin-bottom: 1rem;

    input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.875rem 2.75rem 0.875rem 2.75rem;
      border: var(--admin-border);
      border-radius: 999px;
      background: rgb(255 255 255 / 92%);
      color: #4c4948;
      font-size: 0.9375rem;
      line-height: 1.2;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

      &::placeholder {
        color: #aaa;
      }

      &:focus {
        outline: none;
        border-color: #e93d6d;
        box-shadow: 0 0 0 3px rgb(233 61 109 / 18%);
      }
    }
  }

  &__field-icon {
    position: absolute;
    top: 50%;
    left: 1rem;
    z-index: 1;
    width: 1.15rem;
    height: 1.15rem;
    color: #aaa;
    transform: translateY(-50%);
    pointer-events: none;
  }

  &__field-toggle {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    background: transparent;
    color: #aaa;
    cursor: pointer;
    transform: translateY(-50%);

    span {
      width: 1.15rem;
      height: 1.15rem;
    }

    &:hover {
      color: #e93d6d;
    }
  }

  &__remember {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.25rem 0 1.25rem;
    cursor: pointer;
    user-select: none;
    font-size: 0.875rem;
    color: #666;

    input {
      width: 0.9375rem;
      height: 0.9375rem;
      accent-color: #e93d6d;
      cursor: pointer;
    }
  }

  &__error {
    margin: 0 0 1rem;
    color: #c0392b;
    font-size: 0.875rem;
    text-align: center;
  }

  &__submit {
    width: 100%;
    padding: 0.875rem;
    border: none;
    border-radius: 999px;
    background: #e93d6d;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.15s ease;

    &:hover:not(:disabled) {
      background: #d73563;
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &:disabled {
      opacity: 0.72;
      cursor: not-allowed;
    }
  }

  &__footer {
    margin: 1.25rem 0 0;
    text-align: center;
    font-size: 0.8125rem;
    color: #999;
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    &__content {
      justify-content: flex-start;
      padding:
        max(1.25rem, env(safe-area-inset-top, 0px))
        max(1rem, env(safe-area-inset-right, 0px))
        max(1.5rem, env(safe-area-inset-bottom, 0px))
        max(1rem, env(safe-area-inset-left, 0px));
    }

    &__hero {
      margin-bottom: 1.5rem;
    }

    &__card {
      padding: 1.5rem 1.25rem 1.25rem;
      border-radius: 1.25rem;
    }

    &__back span:last-child {
      display: none;
    }
  }
}
</style>

<style lang="scss">
body.is-admin-page {
  overflow: hidden;
  background: #3d3d3d;
}
</style>
