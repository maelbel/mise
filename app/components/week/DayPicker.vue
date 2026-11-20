<script setup lang="ts">
import type { PlannedDay } from '~/composables/useWeekSummary'

defineProps<{ days: PlannedDay[], selectedDay: number }>()
const emit = defineEmits<{ select: [day: number] }>()
</script>

<template>
  <div class="grid grid-cols-7 gap-1" role="group" aria-label="Jour">
    <UButton
      v-for="d in days"
      :key="d.day"
      :variant="d.day === selectedDay ? 'solid' : 'outline'"
      class="min-h-14 flex-col justify-center gap-1 border px-0 py-2 font-normal ring-0"
      :class="d.day === selectedDay ? 'border-inverted' : 'border-default'"
      :aria-label="d.name"
      :aria-pressed="d.day === selectedDay"
      @click="emit('select', d.day)"
    >
      <span class="text-xs">{{ d.short }}</span>
      <span class="font-mono text-base">{{ d.dateNumber }}</span>
    </UButton>
  </div>
</template>
