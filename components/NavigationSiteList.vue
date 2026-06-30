<script lang="ts" setup>
import { computed } from 'vue'
import type { NavSiteGroup, NavSiteItem } from '~/types/navigation'

const props = defineProps<{
  navGroups?: NavSiteGroup[]
}>()

const previewFallback = 'https://r2tc.20030327.xyz/file/博客/主题/1780643226230_wallhaven-9d1yjk.png'

function normalizeSite(site: NavSiteItem) {
  return {
    ...site,
    desc: site.desc || '',
    color: site.color || '#0078e7',
    avatar: site.avatar || previewFallback,
  }
}

const groupList = computed(() => {
  if (!Array.isArray(props.navGroups) || !props.navGroups.length)
    return []

  return props.navGroups.map(group => ({
    name: group.name || '',
    desc: group.desc || '',
    sites: (group.sites || []).map(normalizeSite),
  }))
})

</script>

<template>
  <div class="nav-site-list">
    <section
      v-for="(group, groupIndex) in groupList"
      :key="groupIndex"
      class="nav-site-list__group"
    >
      <header
        v-if="group.name"
        class="nav-site-list__header"
      >
        <h2 class="nav-site-list__title">
          <span class="nav-site-list__pin" aria-hidden="true">📌</span>
          {{ group.name }}
        </h2>
        <p
          v-if="group.desc"
          class="nav-site-list__desc"
        >
          {{ group.desc }}
        </p>
      </header>

      <ul class="nav-site-list__grid">
        <li
          v-for="(site, siteIndex) in group.sites"
          :key="`${groupIndex}-${siteIndex}`"
          class="nav-site-list__item"
          :style="{ '--site-color': site.color }"
        >
          <a
            class="nav-site-list__card"
            :href="site.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="nav-site-list__info">
              <img
                class="nav-site-list__avatar"
                :src="site.avatar"
                :alt="site.name"
                loading="lazy"
              >
              <div class="nav-site-list__meta">
                <h3 class="nav-site-list__name">
                  {{ site.name }}
                </h3>
                <p class="nav-site-list__text">
                  {{ site.desc }}
                </p>
              </div>
            </div>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.nav-site-list {
  &__group + &__group {
    margin-top: 36px;
  }

  &__header {
    margin-bottom: 18px;
    text-align: center;
  }

  &__title {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--sakura-color-text-deep, inherit);
  }

  &__pin {
    margin-right: 6px;
  }

  &__desc {
    margin: 8px 0 0;
    font-size: 0.92rem;
    color: var(--sakura-color-text-muted, #888);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__card {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.85);
    background: var(--sakura-card-bg, var(--sakura-post-card-bg));
    text-decoration: none;
    color: inherit;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-3px);
      border-color: var(--site-color, var(--sakura-color-primary));
      box-shadow: 0 10px 24px color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 18%, transparent);
    }
  }

  &__info {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 14px 16px;
  }

  &__avatar {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid color-mix(in srgb, var(--site-color, var(--sakura-color-primary)) 35%, transparent);
  }

  &__meta {
    min-width: 0;
  }

  &__name {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--sakura-color-text-deep, inherit);
  }

  &__text {
    margin: 4px 0 0;
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--sakura-color-text-muted, #888);
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

html.dark .nav-site-list__card {
  border-color: var(--sakura-color-divider, rgb(255 255 255 / 20%));
}
</style>
