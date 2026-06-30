<script setup lang="ts">
import type { MenuItem } from 'valaxy'
import { useI18n } from 'vue-i18n'
import { scrollToHeadingById, updateLocationHash } from '../utils/scrollToHeading'

defineProps<{
  headers: MenuItem[]
  root?: boolean
}>()

const { locale } = useI18n()

function handleClick(event: MouseEvent, link: string) {
  event.preventDefault()

  const hashIndex = link.indexOf('#')
  if (hashIndex === -1)
    return

  const id = link.slice(hashIndex + 1)
  if (!scrollToHeadingById(id))
    return

  updateLocationHash(id)
}
</script>

<template>
  <ul :class="root ? 'root' : 'nested'" class="va-toc css-i18n-toc">
    <li v-for="{ children, link, title, lang } in headers" :key="link" class="va-toc-item" :lang="lang || locale">
      <a :href="link" class="outline-link" @click="handleClick($event, link)">
        {{ title }}
      </a>
      <template v-if="children?.length">
        <SakuraOutlineItem :headers="children" />
      </template>
    </li>
  </ul>
</template>

<style lang="scss" scoped>
.root {
  position: relative;
  z-index: 1;
}

.nested {
  padding-left: 16px;
}

.outline-link {
  display: block;
  line-height: 28px;
  color: var(--va-c-text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.5s;
  font-weight: 400;
  cursor: pointer;
  text-decoration: none;

  &:hover,
  &.active {
    color: var(--sakura-color-primary);
    transition: color 0.25s;
  }
}
</style>
