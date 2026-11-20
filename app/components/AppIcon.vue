<script setup lang="ts">
/**
 * The design system's line icons (app/assets/icons), shown with Nuxt UI's UIcon.
 * Kept while screens move to Nuxt UI: new code uses `<UIcon name="i-mise-…">` or an `icon` prop.
 */
const NAMES = [
  'calendar', 'book', 'jar', 'fridge', 'cart', 'sparkle', 'bowl', 'chevronRight', 'chevronLeft', 'check',
  'close', 'plus', 'minus', 'search', 'info', 'edit', 'trash', 'user', 'users', 'logout',
] as const

export type IconName = (typeof NAMES)[number]

const props = withDefaults(defineProps<{ name: IconName, size?: number }>(), { size: 20 })

const icon = computed(() => `i-mise-${props.name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`)
</script>

<template>
  <UIcon :name="icon" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true" />
</template>
