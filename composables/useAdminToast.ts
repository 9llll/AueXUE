import { ref } from 'vue'

export type AdminToastType = 'success' | 'error'

export interface AdminToastItem {
  id: number
  type: AdminToastType
  message: string
}

const toasts = ref<AdminToastItem[]>([])
let nextId = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function removeToast(id: number) {
  toasts.value = toasts.value.filter(item => item.id !== id)
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function pushToast(type: AdminToastType, message: string, duration = 3200) {
  const trimmed = message.trim()
  if (!trimmed)
    return

  const id = ++nextId
  toasts.value.push({ id, type, message: trimmed })
  timers.set(id, setTimeout(() => removeToast(id), duration))
}

export function useAdminToast() {
  return {
    toasts,
    success(message: string) {
      pushToast('success', message)
    },
    error(message: string) {
      pushToast('error', message)
    },
    dismiss: removeToast,
  }
}
