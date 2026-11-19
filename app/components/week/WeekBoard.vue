<script setup lang="ts">
import type { MealSlot } from '#shared/types/domain'
import type { PlannedDay } from '~/composables/useWeekSummary'

defineProps<{
  days: PlannedDay[]
  selectedDay: number
  editing: { day: number, slot: MealSlot } | null
}>()
const emit = defineEmits<{ selectDay: [day: number], edit: [day: number, slot: MealSlot] }>()
</script>

<template>
  <section aria-label="Plan de la semaine" class="board-scroll">
    <div class="board">
      <div v-for="d in days" :key="d.day" class="column" :class="{ 'column--on': d.day === selectedDay }">
        <button type="button" class="day-head" :aria-pressed="d.day === selectedDay" @click="emit('selectDay', d.day)">
          <span class="day-head__name">{{ d.short }} {{ d.dateNumber }}</span>
          <span class="day-head__kcal mono">{{ formatNumber(d.totals.kcal) }} kcal</span>
        </button>
        <button
          v-for="m in d.meals"
          :key="m.slot"
          type="button"
          class="meal"
          :class="{ 'meal--active': editing?.day === d.day && editing.slot === m.slot }"
          :aria-label="`Changer le ${m.slotLabel.toLowerCase()} de ${d.name.toLowerCase()} : ${m.recipe?.name ?? 'rien de prévu'}`"
          @click="emit('edit', d.day, m.slot)"
        >
          <span class="meal__top">
            <span class="slot-chip">{{ m.slotLabel }}</span>
            <span v-if="m.portions > 1" class="portions-mark">×{{ m.portions }}</span>
          </span>
          <template v-if="m.recipe">
            <span class="meal__name">{{ m.recipe.name }}</span>
            <span class="meal__meta mono">{{ formatNumber(m.nutrition.kcal) }} kcal · {{ m.recipe.timeMin }} min</span>
          </template>
          <span v-else class="meal__empty">Ajouter un repas</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.board-scroll {
  overflow-x: auto;
}

.board {
  min-width: 900px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border-radius: var(--radius);
}

.column--on {
  background: var(--c-surface);
}

.day-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  min-height: 56px;
  padding: 0 8px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  background: transparent;
  color: var(--c-text);
  cursor: pointer;
}

.day-head[aria-pressed='true'] {
  background: var(--c-bg);
  border-color: var(--c-text);
}

.day-head__name {
  font-size: 15px;
  font-weight: 500;
}

.day-head__kcal {
  font-size: 12px;
  color: var(--c-text-2);
}

.meal {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 120px;
  padding: 8px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  background: var(--c-bg);
  color: var(--c-text);
  text-align: left;
  cursor: pointer;
}

.meal--active {
  border-color: var(--c-text);
}

.meal__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

.meal__name {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
}

.meal__meta {
  margin-top: auto;
  font-size: 12px;
  color: var(--c-text-2);
}

.meal__empty {
  font-size: 15px;
  color: var(--c-text-2);
}
</style>
