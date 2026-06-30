<script lang="ts" setup>
import type { Post } from 'valaxy'
import { useConfig, useTags } from 'valaxy'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getDynamicTagMap, loadDynamicTaxonomy, useDynamicTaxonomyState } from '../../composables/useDynamicTaxonomy'
import { fetchFilteredPosts } from '../../utils/postsApi'
import { toValaxyCompatiblePosts } from '../../utils/dynamicPostIndex'

type TagsStyle = 'list' | 'chart'

interface TagsPageThemeConfig {
  style?: TagsStyle
  chartLength?: number
}

const route = useRoute()
const router = useRouter()
const builtInTags = useTags()
const { loaded: taxonomyLoaded } = useDynamicTaxonomyState()
const filteredPosts = ref<Post[]>([])
const config = useConfig()
const { t } = useI18n()

const tags = computed(() => {
  if (taxonomyLoaded.value) {
    const dynamic = getDynamicTagMap()
    if (dynamic.size)
      return dynamic
  }
  return builtInTags.value
})

const tagStyle = computed(() => {
  const themeConfig = config.value?.themeConfig as { tagsPage?: TagsPageThemeConfig } | undefined
  return themeConfig?.tagsPage?.style ?? 'list'
})

const chartLength = computed(() => {
  const themeConfig = config.value?.themeConfig as { tagsPage?: TagsPageThemeConfig } | undefined
  return themeConfig?.tagsPage?.chartLength ?? 10
})

const curTag = computed(() => route.query.tag as string || '')

async function loadTagPosts(tag: string) {
  if (!tag || !taxonomyLoaded.value) {
    filteredPosts.value = []
    return
  }
  const data = await fetchFilteredPosts({ tag, pageSize: 100 })
  filteredPosts.value = toValaxyCompatiblePosts(data.posts) as Post[]
}

onMounted(() => {
  void loadDynamicTaxonomy()
})

watch([curTag, taxonomyLoaded], () => {
  void loadTagPosts(curTag.value)
}, { immediate: true })

function displayTag(tag: string) {
  router.push({ query: { tag } })
}
</script>

<template>
  <SakuraPage class="sakura-tags-page">
    <RouterView v-slot="{ Component }">
      <component :is="Component">
        <template #main-content>
          <slot name="content">
            <div>
              <div class="sakura-text-light" text="center" p="2">
                {{ t('counter.tags', Array.from(tags).length) }}
              </div>

              <template v-if="tagStyle === 'chart'">
                <SakuraTagsChart :display-length="chartLength" />

                <div class="sakura-tags-list items-end justify-center" flex="~ wrap" gap="1">
                  <SakuraButton
                    v-for="([key, tag]) in Array.from(tags).sort()"
                    :key="key"
                    class="sakura-tag-button"
                    :class="{ clicked: curTag === key.toString() }"
                    @click="displayTag(key.toString())"
                  >
                    <span mx-1 inline-flex>{{ key }}</span>
                    <span inline-flex text="xs">[{{ tag.count }}]</span>
                  </SakuraButton>
                </div>

                <SakuraDivider icon="i-fa6-solid:water" text="文章列表" :divider="false" />
              </template>

              <template v-else>
                <div class="items-end justify-center" flex="~ wrap" gap="1">
                  <SakuraButton
                    v-for="([key, tag]) in Array.from(tags).sort()"
                    :key="key"
                    class="sakura-tag-button"
                    :class="{ clicked: curTag === key.toString() }"
                    @click="displayTag(key.toString())"
                  >
                    <span mx-1 inline-flex>{{ key }}</span>
                    <span inline-flex text="xs">[{{ tag.count }}]</span>
                  </SakuraButton>
                </div>

                <SakuraDivider icon="i-fa6-solid:water" text="文章列表" :divider="false" />
              </template>
            </div>
          </slot>
        </template>

        <template #main-nav-before>
          <slot name="post">
            <div v-if="curTag">
              <SakuraPostList :posts="filteredPosts" />
            </div>
          </slot>
        </template>
      </component>
    </RouterView>
  </SakuraPage>
</template>

<style lang="scss" scoped>
.sakura-tags-list {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.sakura-tag-button {
  color: var(--sakura-tag-color) !important;
  background-color: var(--sakura-tag-bg);
  line-height: 1.75rem;
  transition:
    color 0.3s ease-in-out,
    color-border 0.2s ease-in-out;

  &:hover {
    color: var(--sakura-tag-color, var(--sakura-color-primary)) !important;
    border-color: var(--sakura-tag-color, var(--sakura-color-primary));
  }

  &.clicked {
    color: var(--sakura-tag-color, var(--sakura-color-primary)) !important;
    border-color: var(--sakura-tag-color, var(--sakura-color-primary));
  }

  &::before {
    content: '#';
  }
}
</style>

<style lang="scss">
.sakura-tags-page {
  .sakura-one-columns,
  .sakura-triple-columns {
    width: 100%;
  }

  .sakura-page-content {
    width: 100%;
    max-width: none;
  }

  main {
    width: 100%;
  }
}
</style>
