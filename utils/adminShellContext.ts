import type { InjectionKey, Ref } from 'vue'

export const adminTopbarTargetKey: InjectionKey<Ref<HTMLElement | null>> = Symbol('adminTopbarTarget')
