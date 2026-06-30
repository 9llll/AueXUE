<script setup lang="ts">
import { useAdminToast } from '../../composables/useAdminToast'

const { toasts, dismiss } = useAdminToast()
</script>

<template>
  <Teleport to="body">
    <div class="admin-toast-host" aria-live="polite" aria-atomic="false">
      <TransitionGroup name="admin-toast" tag="div" class="admin-toast-host__list">
        <div
          v-for="item in toasts"
          :key="item.id"
          class="admin-toast"
          :class="`admin-toast--${item.type}`"
          role="status"
        >
          <span
            class="admin-toast__icon"
            :class="item.type === 'success' ? 'i-mdi-check-circle-outline' : 'i-mdi-alert-circle-outline'"
            aria-hidden="true"
          />
          <span class="admin-toast__message">{{ item.message }}</span>
          <button
            type="button"
            class="admin-toast__close"
            aria-label="关闭通知"
            @click="dismiss(item.id)"
          >
            <span class="i-mdi-close" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.admin-toast-host {
  position: fixed;
  top: calc(var(--sakura-navbar-height, 60px) + 12px);
  right: max(16px, env(safe-area-inset-right, 0px));
  z-index: 10030;
  pointer-events: none;
  width: min(360px, calc(100vw - 32px));

  &__list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}

.admin-toast {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid #000;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 28px rgb(0 0 0 / 16%);
  pointer-events: auto;
  font-size: 0.875rem;
  line-height: 1.45;

  &--success {
    border-color: #1f7a45;
    background: #f0faf4;
    color: #1f7a45;
  }

  &--error {
    border-color: #c0392b;
    background: #fff5f7;
    color: #c0392b;
  }

  &__icon {
    flex-shrink: 0;
    width: 1.125rem;
    height: 1.125rem;
    margin-top: 0.1rem;
  }

  &__message {
    flex: 1;
    min-width: 0;
  }

  &__close {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    margin: -0.15rem -0.2rem 0 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    opacity: 0.72;
    cursor: pointer;

    &:hover {
      opacity: 1;
      background: rgb(0 0 0 / 6%);
    }
  }
}

.admin-toast-enter-active,
.admin-toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.admin-toast-enter-from,
.admin-toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

.admin-toast-move {
  transition: transform 0.22s ease;
}

@media (max-width: 768px) {
  .admin-toast-host {
    top: auto;
    bottom: max(16px, env(safe-area-inset-bottom, 0px));
    right: max(12px, env(safe-area-inset-right, 0px));
    left: max(12px, env(safe-area-inset-left, 0px));
    width: auto;
  }

  .admin-toast-enter-from,
  .admin-toast-leave-to {
    transform: translateY(12px);
  }
}
</style>
