<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSakuraAppStore } from '../node_modules/valaxy-theme-sakura/stores/app.ts'

interface SidebarNavItem {
  text?: string
  locale?: string | number
  link?: string
  icon?: string
  collapsed?: boolean
  items?: SidebarNavItem[]
}

const props = defineProps<{
  items?: SidebarNavItem[]
  item?: SidebarNavItem
}>()

const { t } = useI18n()
const route = useRoute()
const sakuraAppStore = useSakuraAppStore()

const openGroups = ref<Record<string, boolean>>({})

function groupKey(navItem: SidebarNavItem, index = 0) {
  return navItem.link || navItem.text || String(navItem.locale || index)
}

function getItemText(navItem: SidebarNavItem) {
  if (navItem.locale)
    return `${navItem.text ?? ''}${navItem.text ? ' ' : ''}${t(String(navItem.locale))}`.trim()

  return navItem.text || ''
}

function isChildActive(navItem: SidebarNavItem) {
  if (!navItem.items?.length || !navItem.link)
    return navItem.link ? route.path === navItem.link || route.path.startsWith(`${navItem.link}/`) : false

  return navItem.items.some((sub) => {
    if (!sub.link)
      return false
    return route.path === sub.link || route.path.startsWith(`${sub.link}/`)
  })
}

function isGroupOpen(navItem: SidebarNavItem, index = 0) {
  const key = groupKey(navItem, index)
  if (openGroups.value[key] !== undefined)
    return openGroups.value[key]

  if (navItem.collapsed === true)
    return false

  if (navItem.collapsed === false)
    return true

  return false
}

function toggleGroup(navItem: SidebarNavItem, index = 0) {
  const key = groupKey(navItem, index)
  openGroups.value[key] = !isGroupOpen(navItem, index)
}

function syncGroupsFromRoute() {
  if (!props.items?.length)
    return

  for (const [index, navItem] of props.items.entries()) {
    if (navItem.items?.length && isChildActive(navItem))
      openGroups.value[groupKey(navItem, index)] = true
  }
}

watch(() => route.path, () => {
  sakuraAppStore.sidebar.close()
  syncGroupsFromRoute()
}, { immediate: true })

const hasNestedItems = computed(() => Boolean(props.items?.some(item => item.items?.length)))

function closeSidebarOnNavigate() {
  sakuraAppStore.sidebar.close()
}
</script>

<template>
  <template v-if="item">
    <SakuraNavLink v-bind="item" @click="closeSidebarOnNavigate">
      <SakuraSidebarCount :locale="item.locale" />
    </SakuraNavLink>
  </template>

  <ul v-else-if="items?.length" class="sakura-sidebar-link-items" :class="{ 'has-groups': hasNestedItems }">
    <li v-for="(navItem, index) in items" :key="groupKey(navItem, index)">
      <template v-if="navItem.items?.length">
        <button
          type="button"
          class="sakura-sidebar-link-item sidebar-nav-group__toggle"
          :data-nav="navItem.link"
          :aria-expanded="isGroupOpen(navItem, index) ? 'true' : 'false'"
          @click="toggleGroup(navItem, index)"
        >
          <span
            v-if="navItem.icon"
            :class="navItem.icon"
            class="sakura-icon sakura-nav-link-icon"
            aria-hidden="true"
          />
          <span class="sidebar-nav-group__label">{{ getItemText(navItem) }}</span>
          <span
            class="sidebar-nav-group__chevron i-ant-design:down-outlined"
            :class="{ 'is-open': isGroupOpen(navItem, index) }"
            aria-hidden="true"
          />
        </button>

        <ul
          v-show="isGroupOpen(navItem, index)"
          class="sakura-sidebar-link-sub-items"
        >
          <li v-for="(subItem, subIndex) in navItem.items" :key="groupKey(subItem, subIndex)">
            <SakuraSidebarLinkItem :item="subItem" class="sakura-sidebar-link-item" />
          </li>
        </ul>
      </template>

      <SakuraSidebarLinkItem v-else :item="navItem" class="sakura-sidebar-link-item" />
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.sakura-sidebar-link-items {
  .sakura-sidebar-link-item {
    padding: 6px 15px;
    color: var(--sakura-color-text);
    font-size: 14px;
    letter-spacing: 0.02em;

    &:hover {
      color: var(--sakura-color-primary);
    }
  }

  .sakura-icon {
    width: 1rem;
    height: 1rem;
    margin-right: 6px;
  }

  .sidebar-nav-group__toggle {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font: inherit;
    color: inherit;
    transition: color 0.2s ease;

    &:hover {
      color: var(--sakura-color-primary);
    }
  }

  .sidebar-nav-group__label {
    flex: 1;
    min-width: 0;
  }

  .sidebar-nav-group__chevron {
    flex-shrink: 0;
    width: 0.85rem;
    height: 0.85rem;
    margin-left: 6px;
    opacity: 0.72;
    transition: transform 0.22s ease, opacity 0.2s ease;

    &.is-open {
      transform: rotate(180deg);
      opacity: 1;
    }
  }

  .sakura-sidebar-link-sub-items {
    padding-left: 20px;

    .sakura-sidebar-link-item {
      font-size: 13px;
      color: var(--sakura-color-text);
    }

    .sakura-icon {
      width: 0.9rem;
      height: 0.9rem;
    }
  }
}
</style>
