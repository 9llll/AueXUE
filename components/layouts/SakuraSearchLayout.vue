<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFuzzyPostSearch } from '../../composables/useFuzzyPostSearch'
import type { PostListItem } from '../../types/posts'

const input = ref('')
const results = ref<PostListItem[]>([])
const loading = ref(false)
const route = useRoute()
const router = useRouter()
const { search: fuzzySearch } = useFuzzyPostSearch()

async function runSearch(query: string) {
  const q = query.trim()
  input.value = q
  if (!q) {
    results.value = []
    return
  }

  loading.value = true
  try {
    results.value = await fuzzySearch(q)
  }
  catch {
    results.value = []
  }
  finally {
    loading.value = false
  }
}

function submitSearch() {
  const q = input.value.trim()
  router.push({ path: '/search', query: q ? { q } : {} })
}

watch(
  () => route.query.q as string,
  query => runSearch(query || ''),
  { immediate: true },
)
</script>

<template>
  <SakuraPage class="sakura-search-page">
    <template #header />
    <RouterView v-slot="{ Component }">
      <component :is="Component">
        <template #main-content>
          <slot name="content">
            <div class="sakura-search">
              <div class="sakura-search-form-wrap">
                <form class="sakura-search-form" @submit.prevent="submitSearch">
                  <span class="sakura-search-form__icon i-mdi-magnify" aria-hidden="true" />
                  <input
                    v-model="input"
                    class="sakura-search-form__input"
                    type="search"
                    enterkeyhint="search"
                    autocomplete="off"
                    placeholder="搜索文章标题、摘要…"
                  >
                  <button type="submit" class="sakura-search-form__btn" :disabled="loading">
                    {{ loading ? '…' : '搜索' }}
                  </button>
                </form>
              </div>

              <header class="page-header">
                <h1 class="page-title">
                  <template v-if="loading">
                    搜索中: {{ input }}
                  </template>
                  <template v-else-if="results.length > 0">
                    搜索结果: {{ input }}
                  </template>
                  <template v-else-if="input">
                    没有找到任何东西！
                  </template>
                  <template v-else>
                    请输入搜索关键词
                  </template>
                </h1>
              </header>

              <div v-if="results.length > 0" class="sakura-search-results">
                <div class="sakura-search-result post post-list">
                  <article
                    v-for="result in results"
                    :key="result.slug"
                    class="post-entry"
                  >
                    <AppLink :to="result.path" class="post-entry__cover-link">
                      <div class="feature">
                        <div class="flex-center overlay">
                          <div i-fa-file-text-o />
                        </div>
                        <SakuraImageCard :src="result.cover" class="h-full rounded-full" />
                      </div>
                    </AppLink>

                    <div class="post-entry__body">
                      <div class="post-entry__meta">
                        <h3 class="sakura-search-result-title entry-title">
                          <AppLink :to="result.path">
                            {{ result.title }}
                          </AppLink>
                        </h3>

                        <div class="p-time">
                          <span i-mdi-access-time class="p-time__icon" aria-hidden="true" />
                          发布于 {{ result.date }}
                        </div>
                      </div>

                      <p v-if="result.excerpt" class="sakura-search-result-excerpt">
                        {{ result.excerpt }}
                      </p>

                      <div class="post-more">
                        <AppLink :to="result.path" aria-label="阅读全文">
                          <SakuraDots class="post-more__dots" />
                        </AppLink>
                      </div>

                      <hr class="post-entry__divider">
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </slot>
        </template>
      </component>
    </RouterView>
  </SakuraPage>
</template>

<style lang="scss" scoped>
.sakura-search {
  --search-form-max: 40rem;

  box-sizing: border-box;
  width: min(100%, 800px);
  min-width: 0;
  margin-inline: auto;
  margin-top: var(--sakura-navbar-spacing, var(--sakura-navbar-height));
  padding:
    1rem
    max(1rem, env(safe-area-inset-right, 0px))
    1.75rem
    max(1rem, env(safe-area-inset-left, 0px));
  pointer-events: auto;
  transition: color 0.2s ease;
}

.sakura-search-form-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
  min-width: 0;
  margin-bottom: 1.25rem;
}

.sakura-search-form {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: min(100%, var(--search-form-max));
  padding: 0.5rem 0.55rem 0.5rem 1rem;
  border: 2px solid var(--sakura-color-primary, #df9193);
  border-radius: 999px;
  background: var(--sakura-post-card-bg, var(--va-c-bg-soft, #fff));
  box-shadow:
    0 4px 18px rgb(223 145 147 / 16%),
    0 1px 0 rgb(255 255 255 / 65%) inset;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:focus-within {
    border-color: color-mix(in srgb, var(--sakura-color-primary, #df9193) 85%, #000 15%);
    box-shadow:
      0 6px 22px rgb(223 145 147 / 24%),
      0 0 0 3px rgb(223 145 147 / 14%);
  }

  &__icon {
    flex-shrink: 0;
    width: 1.375rem;
    height: 1.375rem;
    color: var(--sakura-color-primary, #df9193);
  }

  &__input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--sakura-color-text);
    font-size: 1.0625rem;
    font-weight: 500;
    line-height: 1.45;
    outline: none;

    &::placeholder {
      color: var(--sakura-color-text-light, #aaa);
      font-weight: 400;
    }
  }

  &__btn {
    flex-shrink: 0;
    height: 2.5rem;
    padding: 0 1.125rem;
    border: none;
    border-radius: 999px;
    background: var(--sakura-color-primary, #df9193);
    color: #fff;
    font-size: 0.9375rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    box-shadow: 0 2px 8px rgb(223 145 147 / 35%);
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      opacity 0.15s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgb(223 145 147 / 42%);
    }

    &:disabled {
      opacity: 0.65;
      cursor: wait;
    }
  }
}

.page-header {
  position: relative;
  width: 100%;
  min-width: 0;
  margin-bottom: 1rem;
  text-align: center;

  .page-title {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    margin: 0 0 1rem;
    padding: 0.625rem 0.875rem;
    border: 1px dashed var(--sakura-color-divider);
    color: var(--sakura-color-text);
    font-size: 1.125rem;
    font-weight: 400;
    line-height: 1.5;
    word-break: break-word;
  }
}

.sakura-search-results {
  width: 100%;
  min-width: 0;
  overflow-x: clip;
}

.sakura-search-result {
  width: 100%;
  min-width: 0;
}

.post-entry {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
  margin-bottom: 0.5rem;

  &__cover-link {
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__meta {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    min-width: 0;
  }

  &__divider {
    width: 33%;
    margin: 2.5rem auto 2rem;
    border: none;
    border-top: 1px solid var(--sakura-color-divider);
  }
}

.entry-title {
  min-width: 0;

  a {
    display: block;
    color: var(--sakura-color-text-deep);
    font-size: 1.25rem;
    font-weight: 400;
    line-height: 1.45;
    word-break: break-word;

    &:hover {
      color: var(--sakura-color-primary);
    }
  }
}

.sakura-search-result-excerpt {
  margin: 0.5rem 0 0;
  color: var(--sakura-color-text);
  font-size: 0.9375rem;
  line-height: 1.65;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.p-time {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.2rem;
  color: var(--sakura-color-text);
  font-size: 0.75rem;
  white-space: nowrap;

  &__icon {
    width: 0.875rem;
    height: 0.875rem;
  }
}

.post-more {
  margin-top: 0.35rem;
  color: var(--sakura-color-text);
  font-size: 1.5rem;
  text-align: right;

  &__dots {
    float: right;
    margin-top: 0.35rem;
  }
}

.feature {
  position: relative;
  width: 100px;
  height: 100px;
  padding: 2px;
  overflow: hidden;
  border: 1px solid var(--sakura-color-divider);
  border-radius: 50%;
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background-color: orange;
  opacity: 0;
  transition: opacity 0.3s ease-out;
  pointer-events: none;

  div {
    color: oklch(100% 0 0);
    font-size: 1.5rem;
    line-height: 94px;
  }
}

.feature:hover .overlay {
  opacity: 1;
  pointer-events: auto;
}

@media (max-width: 767px) {
  .sakura-search {
    width: 100%;
    margin-top: var(--sakura-navbar-spacing, calc(var(--sakura-navbar-height) + 0.35rem));
    padding:
      0.75rem
      max(0.875rem, env(safe-area-inset-right, 0px))
      1.25rem
      max(0.875rem, env(safe-area-inset-left, 0px));
  }

  .sakura-search-form-wrap {
    position: sticky;
    top: var(--sakura-navbar-height, 3.5rem);
    z-index: 5;
    margin-bottom: 1rem;
    padding-block: 0.35rem 0.65rem;
    background: linear-gradient(
      180deg,
      var(--sakura-color-background, #fff) 72%,
      rgb(255 255 255 / 0%) 100%
    );
  }

  .sakura-search-form {
    width: 100%;
    max-width: none;
    gap: 0.45rem;
    padding: 0.4rem 0.45rem 0.4rem 0.85rem;

    &__icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    &__input {
      font-size: 16px;
    }

    &__btn {
      height: 2.75rem;
      min-width: 4.25rem;
      padding: 0 1rem;
      font-size: 0.875rem;
    }
  }

  .page-header .page-title {
    font-size: 0.9375rem;
    padding: 0.5rem 0.75rem;
  }

  .post-entry {
    flex-direction: row;
    align-items: flex-start;
    gap: 0.75rem;
    text-align: left;

    &__meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    &__divider {
      width: 40%;
      margin: 1.25rem auto 1rem;
    }
  }

  .entry-title a {
    font-size: 1rem;
    line-height: 1.4;
  }

  .sakura-search-result-excerpt {
    font-size: 0.8125rem;
    line-height: 1.55;
  }

  .p-time {
    font-size: 0.6875rem;
  }

  .feature {
    width: 64px;
    height: 64px;
  }

  .overlay div {
    line-height: 58px;
    font-size: 1.125rem;
  }

  .post-more {
    text-align: left;

    &__dots {
      float: none;
      margin-top: 0.15rem;
    }
  }
}
</style>

<style lang="scss">
.sakura-search-page {
  width: 100%;
  overflow-x: clip;
  box-sizing: border-box;

  .sakura-one-columns,
  .sakura-triple-columns {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    grid-template-columns: minmax(0, 1fr) !important;
    justify-items: stretch;
  }

  .sakura-page-header {
    display: none;
  }

  .sakura-page-content {
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    min-width: 0;
    padding: 0 !important;
    background: transparent;
    border-radius: 0;
  }

  main {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    overflow-x: clip;
  }

  @media (max-width: 767px) {
    .sakura-triple-columns > div,
    .sakura-one-columns > div {
      width: 100%;
      min-width: 0;
    }
  }
}

html.dark .sakura-search-page {
  .sakura-search-form-wrap {
    background: linear-gradient(
      180deg,
      var(--sakura-color-background, #1a1a1a) 72%,
      rgb(0 0 0 / 0%) 100%
    );
  }

  .sakura-search-form {
    box-shadow:
      0 4px 18px rgb(0 0 0 / 28%),
      0 1px 0 rgb(255 255 255 / 6%) inset;
  }
}
</style>
