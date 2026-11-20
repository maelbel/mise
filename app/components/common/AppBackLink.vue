<script setup lang="ts">
/** "‹ Réserve": back to the parent page, on phones only (desktop has the header navigation). */
defineProps<{ to: string, label: string }>()
</script>

<template>
  <ULink :to="to" raw class="-my-4 -ml-1 flex min-h-11 items-center gap-1 self-start text-[15px] text-primary md:hidden">
    <UIcon name="i-mise-chevron-left" class="size-4" />{{ label }}
  </ULink>
</template>
