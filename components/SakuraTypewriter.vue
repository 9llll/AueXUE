<script setup lang="ts">
import type { Options } from 'typeit'
import TypeIt from 'typeit'
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  [key: string]: any
} & Partial<TypewriterProps>>(), {
  delay: 75,
  typeString: '',
})

const emit = defineEmits(['typingFinished', 'deletionFinished', 'allTypingFinished'])

export interface TypewriterProps {
  /**
   * @default 75
   *
   * The delay between each key when typing
   */
  delay: number
  /**
   * The delay between deleting each character
   */
  deleteSpeed: number
  /**
   * @default false
   *
   * Whether to keep looping or not
   */
  loop: boolean
  /**
   * @default 1500
   *
   * The pause duration after a string is typed when using autostart mode
   */
  pauseFor: number | number[]
  /**
   * String to type out, it can contain HTML tags
   * Type out a string using the typewriter effect
   */
  typeString: string | string[]
  /**
   * Speed to delete all visibles nodes, can be number or 'natural'
   * Delete everything that is visible inside of the typewriter wrapper element
   */
  deleteAll: number | boolean | number[]
}

const typewriterElement = ref<HTMLElement | null>(null)
let instance: TypeIt | null = null

function getTypeStrings() {
  if (!props.typeString)
    return []

  return Array.isArray(props.typeString) ? props.typeString : [props.typeString]
}

function destroyTypewriter() {
  instance?.destroy()
  instance = null

  if (typewriterElement.value)
    typewriterElement.value.innerHTML = ''
}

function createTypewriter(typeStrings: string[]) {
  if (!typewriterElement.value || typeStrings.length === 0)
    return

  destroyTypewriter()

  const options = {
    deleteSpeed: props.deleteSpeed,
    loop: props.loop,
  } as Options

  instance = new TypeIt(typewriterElement.value, options)

  typeStrings.forEach((str, index) => {
    instance!.type(str)

    if (typeof props.pauseFor === 'number')
      instance!.pause(props.pauseFor)
    else if (Array.isArray(props.pauseFor))
      instance!.pause(props.pauseFor[index])

    instance!.exec(() => emit('typingFinished'))

    if (index === typeStrings.length - 1)
      instance!.exec(() => emit('allTypingFinished'))

    if (props.deleteAll === true) {
      instance!.delete()
    }
    else if (typeof props.deleteAll === 'number') {
      for (let i = 0; i < str.length; i++)
        instance!.delete(1, { delay: props.deleteAll })
    }
    else if (Array.isArray(props.deleteAll)) {
      for (let i = 0; i < str.length; i++)
        instance!.delete(1, { delay: props.deleteAll[index] })
    }
  })

  instance.flush(() => {
    emit('deletionFinished')
  })
}

function restartTypewriter() {
  const typeStrings = getTypeStrings()

  if (!typewriterElement.value || typeStrings.length === 0) {
    destroyTypewriter()
    return
  }

  createTypewriter(typeStrings)
}

watch(
  () => props.typeString,
  () => {
    restartTypewriter()
  },
)

onMounted(() => {
  restartTypewriter()
})

onUnmounted(() => {
  destroyTypewriter()
})
</script>

<template>
  <span ref="typewriterElement" />
</template>
