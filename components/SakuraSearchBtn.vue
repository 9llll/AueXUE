<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  open?: boolean
}>(), {
  open: false,
})

const emit = defineEmits(['close', 'open'])

const { t } = useI18n()

function onClick() {
  if (props.open)
    emit('close')
  else
    emit('open')
}
</script>

<template>
  <button class="sakura-icon-btn sakura-search-btn" type="button" :title="t('menu.search')" @click="onClick">
    <div v-if="!open" class="i-mdi-search" />
    <div v-else class="i-mdi-close sakura-search-btn__close" />
  </button>
</template>

<style lang="scss" scoped>
.sakura-search-btn {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;

  > div {
    width: 1.35em;
    height: 1.35em;
  }

  &__close {
    width: 1.4em;
    height: 1.4em;
  }
}
</style>
