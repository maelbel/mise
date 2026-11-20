<script setup lang="ts">
/** "×2" on a meal cooked for more than one portion. */
defineProps<{ portions: number }>()
</script>

<template>
  <UBadge color="neutral" variant="solid" :label="`×${portions}`" class="rounded-xs px-2 py-0 font-mono text-xs font-normal" />
</template>
