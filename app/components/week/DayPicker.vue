<script setup lang="ts">
import type { PlannedDay } from '~/composables/useWeekSummary'

defineProps<{ days: PlannedDay[], selectedDay: number }>()
const emit = defineEmits<{ select: [day: number] }>()
</script>

<template>
  <div class="picker" role="group" aria-label="Jour">
    <button
      v-for="d in days"
      :key="d.day"
      type="button"
      class="picker__day"
      :aria-label="d.name"
      :aria-pressed="d.day === selectedDay"
      @click="emit('select', d.day)"
    >
      <span class="picker__short">{{ d.short }}</span>
      <span class="picker__num mono">{{ d.dateNumber }}</span>
    </button>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.picker__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 56px;
  padding: 8px 0;
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  background: transparent;
  color: var(--c-text);
  cursor: pointer;
}

.picker__day[aria-pressed='true'] {
  background: var(--c-fill-primary);
  border-color: var(--c-fill-primary);
  color: var(--c-on-primary);
}

.picker__short {
  font-size: 12px;
}

.picker__num {
  font-size: 16px;
}
</style>
