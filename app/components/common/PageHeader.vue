<script setup lang="ts">
defineProps<{ eyebrow?: string, title: string, lead?: string }>()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-6">
    <div class="flex max-w-[680px] flex-col gap-2 md:gap-4">
      <AppEyebrow v-if="eyebrow">{{ eyebrow }}</AppEyebrow>
      <h1 class="text-[clamp(32px,5vw,48px)] font-medium leading-[1.1] tracking-[-0.01em] text-balance">{{ title }}</h1>
      <p v-if="lead" class="text-[clamp(18px,2.4vw,22px)] italic leading-[1.4] text-muted">{{ lead }}</p>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </header>
</template>
