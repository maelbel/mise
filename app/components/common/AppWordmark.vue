<script setup lang="ts">
/** "— MISE". Large on desktop, smaller on phones; `small` keeps it small everywhere. */
withDefaults(defineProps<{ as?: string, small?: boolean }>(), { as: 'span', small: false })
</script>

<template>
  <component :is="as" class="flex items-center" :class="small ? 'gap-2' : 'gap-2 md:gap-4'">
    <span class="h-0.5 bg-brass-400" :class="small ? 'w-4' : 'w-4 md:w-6'" aria-hidden="true" />
    <span class="font-display font-light leading-none tracking-[0.14em]" :class="small ? 'text-lg' : 'text-lg md:text-[28px]'">MISE</span>
  </component>
</template>
