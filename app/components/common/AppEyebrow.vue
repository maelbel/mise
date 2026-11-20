<script setup lang="ts">
/** The small spaced capitals above titles, in brass (lighter brass on the ink panels). */
withDefaults(defineProps<{ as?: string, light?: boolean }>(), { as: 'p', light: false })
</script>

<template>
  <component
    :is="as"
    class="font-display text-[13px] font-normal leading-none tracking-[0.24em] uppercase"
    :class="light ? 'text-brass-300' : 'text-primary'"
  >
    <slot />
  </component>
</template>
