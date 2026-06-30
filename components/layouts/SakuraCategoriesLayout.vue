<script lang="ts" setup>
import type { Post } from 'valaxy'
import { useCategories, useConfig } from 'valaxy'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { getDynamicCategoryMap, loadDynamicTaxonomy, useDynamicTaxonomyState } from '../../composables/useDynamicTaxonomy'
import { fetchFilteredPosts } from '../../utils/postsApi'
import { toValaxyCompatiblePosts } from '../../utils/dynamicPostIndex'

type CategoriesStyle = 'list' | 'chart'

interface CategoriesThemeConfig {
  style?: CategoriesStyle
}

const config = useConfig()
const builtInCategories = useCategories()
const { loaded: taxonomyLoaded } = useDynamicTaxonomyState()
const filteredPosts = ref<Post[]>([])

const { t } = useI18n()
const route = useRoute()
const curCategory = computed(() => (route.query.category || '') as string)

const categories = computed(() => {
  if (taxonomyLoaded.value) {
    const dynamic = getDynamicCategoryMap()
    if (dynamic.size) {
      return {
        children: dynamic,
      } as typeof builtInCategories.value
    }
  }
  return builtInCategories.value
})

const categoryStyle = computed(() => {
  const themeConfig = config.value?.themeConfig as { categories?: CategoriesThemeConfig } | undefined
  return themeConfig?.categories?.style ?? 'list'
})

async function loadCategoryPosts(category: string) {
  if (!category || !taxonomyLoaded.value) {
    filteredPosts.value = []
    return
  }
  const data = await fetchFilteredPosts({ category, pageSize: 100 })
  filteredPosts.value = toValaxyCompatiblePosts(data.posts) as Post[]
}

onMounted(() => {
  void loadDynamicTaxonomy()
})

watch([curCategory, taxonomyLoaded], () => {
  void loadCategoryPosts(curCategory.value)
}, { immediate: true })
</script>

<template>
  <SakuraPage class="sakura-categories-page">
    <RouterView v-slot="{ Component }">
      <component :is="Component">
        <template #main-content>
          <slot name="content">
            <div>
              <div text="center" class="yun-text-light" p="2">
                {{ t('counter.categories', Array.from(categories.children).length) }}
              </div>

              <SakuraCategoriesChart
                v-if="categoryStyle === 'chart'"
                :categories="categories.children"
              />
              <SakuraCategories
                v-else
                :categories="categories.children"
              />
            </div>
          </slot>
        </template>

        <template #main-nav-before>
          <slot name="posts">
            <div v-if="curCategory">
              <SakuraPostList w="full" :posts="filteredPosts" />
            </div>
          </slot>
        </template>
      </component>
    </RouterView>
  </SakuraPage>
</template>

<style lang="scss">
.sakura-categories-page {
  .sakura-triple-columns {
    width: 100%;
  }
}
</style>
