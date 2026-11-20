<script setup lang="ts">
/** A chip that is on or off (filters, choices): ink when on, outlined when off. */
defineProps<{ pressed: boolean }>()
</script>

<template>
  <UButton :variant="pressed ? 'solid' : 'outline'" :aria-pressed="pressed" class="whitespace-nowrap font-normal">
    <slot />
  </UButton>
</template>
