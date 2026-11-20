<script setup lang="ts">
/**
 * A chip that is on or off (filters, choices): ink when on, outlined when off.
 * `radio`: one choice among several, inside an element with role="radiogroup".
 */
const props = defineProps<{ pressed: boolean, radio?: boolean }>()

const a11y = computed(() => (props.radio ? { 'role': 'radio', 'aria-checked': props.pressed } : { 'aria-pressed': props.pressed }))
</script>

<template>
  <UButton :variant="pressed ? 'solid' : 'outline'" v-bind="a11y" class="whitespace-nowrap font-normal">
    <slot />
  </UButton>
</template>
