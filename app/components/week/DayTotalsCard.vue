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

const macros = computed(() => [
  { label: 'Protéines', value: props.day.totals.protein, target: props.target?.protein, accent: true },
  { label: 'Glucides', value: props.day.totals.carbs },
  { label: 'Lipides', value: props.day.totals.fat },
])
</script>

<template>
  <section class="flex flex-col gap-4 rounded-sm bg-inverted p-4 text-limestone-200 md:p-6" :aria-label="`Total du ${day.date}`">
    <AppEyebrow light>{{ day.date }}</AppEyebrow>
    <div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <span class="font-mono text-2xl leading-none md:text-[32px]">
        {{ formatNumber(day.totals.kcal) }} <small class="text-xs text-limestone-500">{{ target ? `/ ${formatNumber(target.kcal)} kcal` : 'kcal' }}</small>
      </span>
      <span class="text-sm text-limestone-500">{{ day.totals.timeMin }} min en cuisine</span>
    </div>
    <template v-if="progress">
      <UProgress
        :model-value="progress.pct"
        aria-label="Calories du jour par rapport à votre objectif"
        :ui="{ base: 'h-0.5 rounded-none bg-limestone-800', indicator: 'rounded-none bg-brass-300' }"
      />
      <p class="text-sm">{{ progress.gap }}</p>
    </template>
    <div class="grid grid-cols-3 border-t border-limestone-800">
      <div
        v-for="(m, i) in macros"
        :key="m.label"
        class="flex flex-col gap-1 pt-4 pr-2"
        :class="i ? 'border-l border-limestone-800 pl-4' : 'pl-0'"
      >
        <span class="text-sm text-limestone-500">{{ m.label }}</span>
        <span class="font-mono text-base" :class="{ 'text-brass-300': m.accent }">
          {{ m.value }}<small v-if="m.target" class="text-xs text-limestone-500"> / {{ m.target }}</small> g
        </span>
      </div>
    </div>
  </section>
</template>
