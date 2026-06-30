import type { ComputedRef } from 'vue'
import type { ValaxyAddon } from 'valaxy'
import { useRuntimeConfig } from 'valaxy'
import { isClient } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import twikooScriptUrl from 'twikoo/dist/twikoo.all.min.js?url'

export interface TwikooOptions {
  envId: string
  el?: string
  region?: string
  path?: string
  lang?: string
  placeholder?: string
}

const COMMENT_PLACEHOLDER = '分享你的想法...'
const META_PLACEHOLDERS: Record<string, string> = {
  nick: '昵称',
  mail: '邮箱',
  link: '网址 (选填)',
}

let formCustomizeObserver: MutationObserver | null = null

function customizeTwikooCommentForm() {
  if (!isClient)
    return

  document.querySelectorAll('.sakura-comment .twikoo, #tcomment').forEach((root) => {
    root.querySelectorAll('.tk-submit .tk-meta-input .el-input__inner').forEach((input) => {
      const el = input as HTMLInputElement
      el.placeholder = META_PLACEHOLDERS[el.name] ?? ''
    })

    root.querySelectorAll('.tk-submit .tk-input .el-textarea__inner').forEach((textarea) => {
      (textarea as HTMLTextAreaElement).placeholder = COMMENT_PLACEHOLDER
    })
  })
}

function observeTwikooCommentForm() {
  if (!isClient || formCustomizeObserver)
    return

  const targets = document.querySelectorAll('.sakura-comment, .comment, #tcomment')
  if (!targets.length)
    return

  formCustomizeObserver = new MutationObserver(() => customizeTwikooCommentForm())
  targets.forEach(target => formCustomizeObserver!.observe(target, { childList: true, subtree: true }))
}

declare global {
  interface Window {
    twikoo: {
      init: (options: TwikooOptions | Record<string, unknown>) => unknown
    }
  }
}

let loadPromise: Promise<void> | null = null

function useAddonTwikoo() {
  const runtimeConfig = useRuntimeConfig()
  return computed(() => runtimeConfig.value.addons['valaxy-addon-twikoo'] as ValaxyAddon<TwikooOptions>)
}

function loadTwikooScript() {
  if (!isClient)
    return Promise.resolve()

  if (window.twikoo)
    return Promise.resolve()

  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = twikooScriptUrl
      script.async = true
      script.onload = () => {
        if (window.twikoo)
          resolve()
        else
          reject(new Error('Twikoo script loaded but window.twikoo is missing'))
      }
      script.onerror = () => reject(new Error('Failed to load local Twikoo script'))
      document.head.appendChild(script)
    })
  }

  return loadPromise
}

export function useTwikoo(options: ComputedRef<TwikooOptions | undefined>, _version = 'latest') {
  const route = useRoute()
  const { locale } = useI18n()

  function initTwikoo(twikooOptions: TwikooOptions) {
    if (!isClient)
      return

    const defaultOptions = {
      el: '.comment #tcomment',
      lang: locale.value,
      path: route.path,
      placeholder: COMMENT_PLACEHOLDER,
    }
    const newTwikooOptions = Object.assign(defaultOptions, twikooOptions || {})
    const result = window.twikoo.init(newTwikooOptions)
    requestAnimationFrame(() => {
      customizeTwikooCommentForm()
      observeTwikooCommentForm()
    })
    return result
  }

  loadTwikooScript().then(() => {
    if (options.value)
      initTwikoo(options.value)
  }).catch((error) => {
    console.error('[twikoo-local]', error)
  })
}

export function useTwikooWithOptions(_version = 'latest') {
  const addonTwikoo = useAddonTwikoo()
  const options = computed(() => addonTwikoo.value.options)
  useTwikoo(options, _version)
}
