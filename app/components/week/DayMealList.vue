<script setup lang="ts">
import type { MealSlot } from '#shared/types/domain'
import type { PlannedDay } from '~/composables/useWeekSummary'

defineProps<{ day: PlannedDay }>()
const emit = defineEmits<{ edit: [day: number, slot: MealSlot] }>()
</script>

<template>
  <ul class="meals">
    <li v-for="m in day.meals" :key="m.slot" class="meals__item">
      <button
        type="button"
        class="meal"
        :aria-label="`Changer le ${m.slotLabel.toLowerCase()} : ${m.recipe?.name ?? 'rien de prévu'}`"
        @click="emit('edit', day.day, m.slot)"
      >
        <span class="meal__body">
          <span class="meal__top">
            <span class="slot-chip">{{ m.slotLabel }}</span>
            <span v-if="m.portions > 1" class="portions-mark">×{{ m.portions }}</span>
          </span>
          <span class="meal__name">{{ m.recipe?.name ?? 'Ajouter un repas' }}</span>
          <span v-if="m.recipe" class="meal__meta mono">
            {{ m.recipe.timeMin }} min · {{ formatNumber(m.nutrition.kcal) }} kcal · {{ m.nutrition.protein }} g prot.
          </span>
        </span>
        <AppIcon name="chevronRight" :size="16" class="meal__chevron" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.meals {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--c-line);
}

.meals__item {
  border-bottom: 1px solid var(--c-line);
}

.meal {
  width: 100%;
  min-height: 72px;
  padding: 16px 0;
  border: 0;
  background: transparent;
  color: var(--c-text);
  display: flex;
  gap: 16px;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.meal__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-grow: 1;
  min-width: 0;
}

.meal__top {
  display: flex;
  gap: 8px;
  align-items: center;
}

.meal__name {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.3;
}

.meal__meta {
  font-size: 12px;
  color: var(--c-text-2);
}

.meal__chevron {
  flex-shrink: 0;
  color: var(--c-text-2);
}
</style>
