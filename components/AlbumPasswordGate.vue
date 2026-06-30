<script lang="ts" setup>
import { ref } from 'vue'
import { unlockGalleryAlbum } from '../utils/galleryApi'

const props = defineProps<{
  slug: string
  title?: string
}>()

const emit = defineEmits<{
  unlocked: [payload: { password: string, photos: Array<{ url: string, date?: string, poster?: string }> }]
}>()

const input = ref('')
const error = ref('')
const submitting = ref(false)

async function submit() {
  error.value = ''
  submitting.value = true

  try {
    const result = await unlockGalleryAlbum(props.slug, input.value)
    emit('unlocked', { password: input.value, photos: result.photos || [] })
  }
  catch {
    error.value = '密码错误，请重试'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="album-password-gate">
    <div class="album-password-gate__panel">
      <div
        class="album-password-gate__icon"
        aria-hidden="true"
      >
        🔒
      </div>
      <h2 class="album-password-gate__title">
        {{ title || '加密相册' }}
      </h2>
      <p class="album-password-gate__hint">
        此相册已加密，请输入密码后查看
      </p>

      <form
        class="album-password-gate__form"
        @submit.prevent="submit"
      >
        <input
          v-model="input"
          class="album-password-gate__input"
          type="password"
          autocomplete="current-password"
          placeholder="请输入相册密码"
          :disabled="submitting"
        >
        <button
          class="album-password-gate__submit"
          type="submit"
          :disabled="submitting || !input"
        >
          {{ submitting ? '验证中…' : '进入相册' }}
        </button>
      </form>

      <p
        v-if="error"
        class="album-password-gate__error"
        role="alert"
      >
        {{ error }}
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.album-password-gate {
  display: flex;
  justify-content: center;
  padding: 48px 16px 64px;

  &__panel {
    width: min(100%, 420px);
    padding: 36px 28px;
    border-radius: 16px;
    border: 1px solid var(--sakura-color-divider, rgb(0 0 0 / 10%));
    background: var(--sakura-card-bg, #fff);
    text-align: center;
    box-shadow: 0 12px 32px rgb(0 0 0 / 6%);
  }

  &__icon {
    font-size: 2.4rem;
    margin-bottom: 12px;
  }

  &__title {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
  }

  &__hint {
    margin: 10px 0 24px;
    font-size: 0.9rem;
    color: var(--sakura-color-text-muted, #888);
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--sakura-color-divider, rgb(0 0 0 / 14%));
    background: var(--sakura-color-background);
    color: inherit;
    font-size: 0.95rem;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--sakura-color-primary);
    }
  }

  &__submit {
    padding: 12px 16px;
    border: none;
    border-radius: 10px;
    background: var(--sakura-color-primary);
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--sakura-color-primary) 35%, transparent);
    transition:
      transform 0.14s ease,
      box-shadow 0.14s ease,
      background 0.14s ease,
      opacity 0.16s ease;

    &:not(:disabled):hover {
      background: color-mix(in srgb, var(--sakura-color-primary) 88%, #000);
      box-shadow: 0 6px 18px color-mix(in srgb, var(--sakura-color-primary) 42%, transparent);
      transform: translateY(-1px);
    }

    &:not(:disabled):active {
      background: color-mix(in srgb, var(--sakura-color-primary) 78%, #000);
      box-shadow: 0 2px 8px color-mix(in srgb, var(--sakura-color-primary) 28%, transparent);
      transform: translateY(1px) scale(0.98);
    }

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }
  }

  &__error {
    margin: 14px 0 0;
    font-size: 0.86rem;
    color: #dc2626;
  }
}
</style>
