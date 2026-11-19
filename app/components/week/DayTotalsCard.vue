<script setup lang="ts">
import type { DailyTargets } from '#shared/types/domain'
import type { PlannedDay } from '~/composables/useWeekSummary'

const props = defineProps<{ day: PlannedDay, target?: DailyTargets | null }>()

/** Within 10 % of the target counts as on target. */
const progress = computed(() => {
  const t = props.target
  if (!t) return null
  const kcal = props.day.totals.kcal
  const pct = Math.min(100, Math.round((kcal / t.kcal) * 100))
  const gap = kcal < t.kcal * 0.9
    ? `Il manque ${formatNumber(t.kcal - kcal)} kcal pour atteindre votre objectif`
    : kcal > t.kcal * 1.1 ? `${formatNumber(kcal - t.kcal)} kcal au-dessus de votre objectif` : 'Dans votre objectif'
  return { pct, gap }
})
</script>

<template>
  <section class="totals ink-panel" :aria-label="`Total du ${day.date}`">
    <p class="eyebrow totals__day">{{ day.date }}</p>
    <div class="totals__main">
      <span class="totals__kcal mono">{{ formatNumber(day.totals.kcal) }} <small>{{ target ? `/ ${formatNumber(target.kcal)} kcal` : 'kcal' }}</small></span>
      <span class="totals__time">{{ day.totals.timeMin }} min en cuisine</span>
    </div>
    <template v-if="progress">
      <div class="totals__track" role="progressbar" aria-label="Calories du jour par rapport à votre objectif" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="progress.pct">
        <div class="totals__bar" :style="{ width: `${progress.pct}%` }" />
      </div>
      <p class="totals__gap">{{ progress.gap }}</p>
    </template>
    <div class="totals__macros">
      <div class="macro">
        <span class="macro__label">Protéines</span>
        <span class="macro__value macro__value--protein mono">{{ day.totals.protein }}<small v-if="target"> / {{ target.protein }}</small> g</span>
      </div>
      <div class="macro">
        <span class="macro__label">Glucides</span>
        <span class="macro__value mono">{{ day.totals.carbs }} g</span>
      </div>
      <div class="macro">
        <span class="macro__label">Lipides</span>
        <span class="macro__value mono">{{ day.totals.fat }} g</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.totals {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.totals__day {
  color: var(--c-mark-light);
}

.totals__main {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.totals__kcal {
  font-size: 32px;
  line-height: 1;
}

.totals__kcal small,
.macro__value small {
  font-size: 12px;
  color: var(--c-stone);
}

.totals__time,
.totals__gap {
  font-size: 14px;
  color: var(--c-stone);
}

.totals__gap {
  color: var(--c-surface);
}

.totals__track {
  height: 2px;
  background: var(--c-text-2);
}

.totals__bar {
  height: 2px;
  background: var(--c-mark-light);
}

.totals__macros {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--c-text-2);
}

.macro {
  padding: 16px 8px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.macro:first-child {
  padding-left: 0;
}

.macro + .macro {
  border-left: 1px solid var(--c-text-2);
}

.macro__label {
  font-size: 14px;
  color: var(--c-stone);
}

.macro__value {
  font-size: 16px;
}

.macro__value--protein {
  color: var(--c-mark-light);
}

@media (max-width: 899px) {
  .totals {
    padding: 16px;
  }

  .totals__kcal {
    font-size: 24px;
  }
}
</style>
