<script setup lang="ts">
import type { DailyTargets, Nutrition } from '#shared/types/domain'

const props = defineProps<{ totals: Nutrition, target?: DailyTargets | null }>()

const stats = computed(() => [
  { label: 'Calories de la semaine', value: formatNumber(props.totals.kcal), unit: props.target ? `/ ${formatNumber(props.target.kcal * 7)} kcal` : 'kcal' },
  { label: 'Moyenne par jour', value: formatNumber(props.totals.kcal / 7), unit: props.target ? `/ ${formatNumber(props.target.kcal)} kcal` : 'kcal' },
  { label: 'Protéines de la semaine', value: formatNumber(props.totals.protein), unit: props.target ? `/ ${formatNumber(props.target.protein * 7)} g` : 'g' },
  { label: 'Temps en cuisine', value: formatDuration(props.totals.timeMin), unit: '' },
])
</script>

<template>
  <dl class="stat-row">
    <div v-for="s in stats" :key="s.label">
      <dt>{{ s.label }}</dt>
      <dd>{{ s.value }} <small v-if="s.unit">{{ s.unit }}</small></dd>
    </div>
  </dl>
</template>
