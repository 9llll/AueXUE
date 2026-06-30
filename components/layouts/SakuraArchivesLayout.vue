<script lang="ts" setup>
import type { Post } from 'valaxy'
import { useConfig } from 'valaxy'
import { computed, onMounted, ref } from 'vue'
import { loadDynamicTaxonomy, useDynamicTaxonomyState } from '../../composables/useDynamicTaxonomy'
import { fetchPostList } from '../../utils/postsApi'
import { toValaxyCompatiblePosts } from '../../utils/dynamicPostIndex'

type ArchivesStyle = 'list' | 'chart'

interface ArchivesThemeConfig {
  style?: ArchivesStyle
  startMonth?: string
}

const config = useConfig()
const { archives, loaded: taxonomyLoaded } = useDynamicTaxonomyState()
const timelinePosts = ref<Post[]>([])

const archiveStyle = computed(() => {
  const themeConfig = config.value?.themeConfig as { archives?: ArchivesThemeConfig } | undefined
  return themeConfig?.archives?.style ?? 'list'
})

const startMonth = computed(() => {
  const themeConfig = config.value?.themeConfig as { archives?: ArchivesThemeConfig } | undefined
  return themeConfig?.archives?.startMonth ?? '2020-01'
})

onMounted(async () => {
  await loadDynamicTaxonomy()
  const data = await fetchPostList({ pageSize: 100 })
  timelinePosts.value = toValaxyCompatiblePosts(data.posts) as Post[]
})
</script>

<template>
  <SakuraPage class="sakura-archivers-page">
    <RouterView v-slot="{ Component }">
      <component :is="Component">
        <template #main-content>
          <slot name="content">
            <div v-if="archiveStyle === 'chart'" class="sakura-archives-chart-section">
              <SakuraArchivesChart
                :posts="timelinePosts"
                :months="taxonomyLoaded ? archives : undefined"
                :start-month="startMonth"
              />
              <SakuraTimeLine :posts="timelinePosts" />
            </div>
            <SakuraTimeLine v-else :posts="timelinePosts" />
          </slot>
        </template>
      </component>
    </RouterView>
  </SakuraPage>
</template>

<style lang="scss">
.sakura-archivers-page {
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

  .sakura-archives-chart-section {
    width: 100%;
    overflow: visible;
  }
}
</style>
