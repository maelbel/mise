<script setup lang="ts">
import type { DailyTargets, Nutrition } from '#shared/types/domain'
import type { Stat } from '~/components/common/AppStatRow.vue'

const props = defineProps<{ totals: Nutrition, target?: DailyTargets | null }>()

const stats = computed<Stat[]>(() => [
  { label: 'Calories de la semaine', value: formatNumber(props.totals.kcal), unit: props.target ? `/ ${formatNumber(props.target.kcal * 7)} kcal` : 'kcal' },
  { label: 'Moyenne par jour', value: formatNumber(props.totals.kcal / 7), unit: props.target ? `/ ${formatNumber(props.target.kcal)} kcal` : 'kcal' },
  { label: 'Protéines de la semaine', value: formatNumber(props.totals.protein), unit: props.target ? `/ ${formatNumber(props.target.protein * 7)} g` : 'g' },
  { label: 'Temps en cuisine', value: formatDuration(props.totals.timeMin) },
])
</script>

<template>
  <AppStatRow :stats="stats" />
</template>
