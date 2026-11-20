<script setup lang="ts">
/** A text link in brass, underlined: within sentences and for "see more" links. */
defineProps<{ to: string }>()
</script>

<template>
  <ULink :to="to" raw class="text-primary underline hover:text-default">
    <slot />
  </ULink>
</template>
