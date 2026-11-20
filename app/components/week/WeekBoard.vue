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
  <section aria-label="Plan de la semaine" class="overflow-x-auto">
    <div class="grid min-w-[900px] grid-cols-7 gap-2">
      <div v-for="d in days" :key="d.day" class="flex flex-col gap-2 rounded-sm p-2" :class="{ 'bg-muted': d.day === selectedDay }">
        <UButton
          class="min-h-14 flex-col items-start justify-center gap-1 border border-default px-2 py-0 text-default ring-0 hover:bg-transparent"
          :class="{ 'border-inverted bg-default hover:bg-default': d.day === selectedDay }"
          :aria-pressed="d.day === selectedDay"
          @click="emit('selectDay', d.day)"
        >
          <span class="text-[15px] font-medium">{{ d.short }} {{ d.dateNumber }}</span>
          <span class="font-mono text-xs text-muted">{{ formatNumber(d.totals.kcal) }} kcal</span>
        </UButton>
        <UButton
          v-for="m in d.meals"
          :key="m.slot"
          class="min-h-30 flex-col items-stretch gap-2 border border-default p-2 text-left ring-0 hover:bg-default"
          :class="{ 'border-inverted': editing?.day === d.day && editing.slot === m.slot }"
          :aria-label="`Changer le ${m.slotLabel.toLowerCase()} de ${d.name.toLowerCase()} : ${m.recipe?.name ?? 'rien de prévu'}`"
          @click="emit('edit', d.day, m.slot)"
        >
          <span class="flex items-center justify-between gap-1">
            <span class="font-mono text-xs text-muted">{{ m.slotLabel }}</span>
            <PortionsBadge v-if="m.portions > 1" :portions="m.portions" />
          </span>
          <template v-if="m.recipe">
            <span class="text-[15px] font-medium leading-[1.3]">{{ m.recipe.name }}</span>
            <span class="mt-auto font-mono text-xs text-muted">{{ formatNumber(m.nutrition.kcal) }} kcal · {{ m.recipe.timeMin }} min</span>
          </template>
          <span v-else class="text-[15px] text-muted">Ajouter un repas</span>
        </UButton>
      </div>
    </div>
  </section>
</template>
