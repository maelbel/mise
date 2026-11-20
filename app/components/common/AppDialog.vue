<script setup lang="ts">
const props = defineProps<{ open: boolean, title: string }>()
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    const el = dialog.value
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  },
  { flush: 'post' },
)

onMounted(() => {
  if (props.open) dialog.value?.showModal()
})
</script>

<template>
  <dialog ref="dialog" class="dialog" :aria-label="title" @close="emit('close')" @click.self="emit('close')">
    <div class="dialog__body">
      <div class="dialog__head">
        <h2 class="dialog__title">{{ title }}</h2>
        <button type="button" class="icon-btn" aria-label="Fermer" @click="emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </div>
      <slot />
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  border: 0;
  border-top: 2px solid var(--c-fill-primary);
  padding: 0;
  /* Centred, as browsers do by default (Tailwind's reset removes it). */
  margin: auto;
  border-radius: var(--radius);
  width: min(600px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  background: var(--c-bg);
  color: var(--c-text);
}

.dialog::backdrop {
  background: rgba(14, 15, 17, 0.5);
}

.dialog__body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dialog__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.dialog__title {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.3;
}

@media (max-width: 899px) {
  .dialog {
    width: 100vw;
    max-width: 100vw;
    max-height: 92vh;
    margin: auto 0 0;
    border-radius: 0;
  }

  .dialog__body {
    padding: 24px 16px;
  }
}
</style>
