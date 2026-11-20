<script setup lang="ts">
/** A dialog with a title: centred on desktop, a sheet from the bottom on phones. */
defineProps<{ open: boolean, title: string }>()
const emit = defineEmits<{ close: [] }>()

const ui = {
  overlay: 'bg-limestone-950/50',
  content: [
    'w-[calc(100vw-32px)] max-w-[600px] sm:max-h-[calc(100dvh-48px)] rounded-sm ring-0 border-t-2 border-inverted divide-y-0',
    // Desktop: centred with margins, not a 50 % shift, so 1 px lines don't land on half pixels.
    'md:inset-0 md:m-auto md:h-fit md:translate-x-0 md:translate-y-0',
    // Phones: a full-width sheet from the bottom.
    'max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:w-full max-md:max-w-none max-md:max-h-[92dvh] max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none',
  ].join(' '),
  // 24 px above a row as tall as the 44 px close button.
  header: 'min-h-[68px] p-6 pb-0 pr-20 max-md:px-4 max-md:pr-16',
  title: 'text-xl font-medium leading-snug',
  body: 'flex flex-col gap-6 p-6 sm:p-6 max-md:px-4',
  close: 'top-6 end-6 max-md:end-4',
}

function onOpenChange(open: boolean): void {
  if (!open) emit('close')
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :close="{ square: true, variant: 'outline', class: 'size-11' }"
    :ui="ui"
    @update:open="onOpenChange"
  >
    <template #body>
      <slot />
    </template>
  </UModal>
</template>
