<script lang="ts" setup>
import { useEventListener } from '@vueuse/core'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import iloliImg from '../node_modules/valaxy-theme-sakura/assets/iloli.gif'
import { useScrollLock } from '../node_modules/valaxy-theme-sakura/composables/scroll'
import { useSearch } from '../node_modules/valaxy-theme-sakura/composables/search'

const props = defineProps<{
  open: boolean
}>()

const scrollLock = useScrollLock()
const search = useSearch()
const router = useRouter()
const { t } = useI18n()

const input = ref('')
const searchInputRef = ref<HTMLInputElement>()

watch(() => props.open, async () => {
  if (!props.open)
    return

  setTimeout(() => {
    searchInputRef.value?.focus()
  }, 0)
})

useEventListener('keydown', (event: KeyboardEvent) => {
  if (props.open && event.key === 'Escape')
    search.close()
})

function lockScroll() {
  if (scrollLock)
    scrollLock.value = true
}

function unlockScroll() {
  if (scrollLock)
    scrollLock.value = false
}

function closeSearch() {
  search.close()
}

function toSearch() {
  router.push({ path: '/search', query: { q: input.value } })
  search.close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade" @enter="lockScroll" @after-leave="unlockScroll">
      <div
        v-if="open"
        class="mashiro-search"
        :style="{ '--sakura-search-bg-img': `url('${iloliImg}')` }"
      >
        <div class="mashiro-search-close sakura-safe-padding">
          <SakuraSearchBtn :open="true" @close="closeSearch" />
        </div>
        <div class="mashiro-search-container">
          <p class="mashiro-search-hint">
            想要找点什么呢？
          </p>
          <div class="flex-center relative my-4" flex="~" rounded>
            <div class="i-fa-search absolute left-0 pl-12" />
            <input ref="searchInputRef" v-model="input" class="mashiro-search-input" :placeholder="t('search.placeholder')" @keyup.enter="toSearch">
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
.mashiro-search {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  z-index: 9999;
  background-color: var(--sakura-color-background);
  overflow-y: auto;
  pointer-events: auto;
  transition: color 0.2s ease;
  background-image: var(--sakura-search-bg-img);
  background-repeat: no-repeat;
  background-position: bottom right;
  background-size: auto;

  &-close {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    height: var(--sakura-navbar-height, 3.5rem);
    color: var(--sakura-color-text);
    pointer-events: auto;
  }

  &-hint {
    margin: 0 0 1rem;
    text-align: center;
    font-size: 1rem;
    color: var(--sakura-color-text-light, oklch(70% 0 0));
  }

  &-container {
    margin: 0 auto;
    width: 90%;
    height: 285px;
    max-width: 600px;
    animation: mashiro-search-elastic 0.5s;
  }

  @keyframes mashiro-search-elastic {
    0% {
      transform: scale(0);
    }

    55% {
      transform: scale(1);
    }

    70% {
      transform: scale(0.98);
    }

    100% {
      transform: scale(1);
    }
  }

  &-input {
    width: 100%;
    background: transparent;
    color: var(--sakura-color-text);
    font-size: 1.5rem;
    border-radius: 3rem;
    padding: 6px 24px 6px 50px;
    border: 1px solid var(--sakura-color-border);
    box-sizing: border-box;
    font-weight: 900;
    transition: all 0.2s;

    &:focus {
      border-color: var(--sakura-color-primary);
    }
  }

  @media (max-width: 767px) {
    align-items: flex-start;
    padding-top: calc(var(--sakura-navbar-height, 3.5rem) + 1.5rem);

    &-container {
      width: calc(100% - 2rem);
      height: auto;
      max-width: none;
      padding-inline: max(0.75rem, env(safe-area-inset-left, 0px)) max(0.75rem, env(safe-area-inset-right, 0px));
    }

    &-hint {
      font-size: 0.9375rem;
    }

    &-input {
      font-size: 16px;
      padding: 0.65rem 1rem 0.65rem 2.75rem;
    }
  }

  &-result-item {
    padding: 0.5rem;
    color: var(--sakura-color-text);
    cursor: pointer;
    border-top: 1px dashed var(--sakura-color-divider);

    &:hover {
      color: var(--sakura-color-primary);
    }
  }
}
</style>
