<script setup lang="ts">
import type { MealSlot } from '#shared/types/domain'
import type { PlannedDay } from '~/composables/useWeekSummary'

defineProps<{ day: PlannedDay }>()
const emit = defineEmits<{ edit: [day: number, slot: MealSlot] }>()
</script>

<template>
  <ul class="m-0 flex list-none flex-col border-t border-default p-0">
    <li v-for="m in day.meals" :key="m.slot" class="border-b border-default">
      <UButton
        variant="ghost"
        block
        class="min-h-18 gap-4 px-0 py-4 text-left text-default hover:bg-transparent"
        :aria-label="`Changer le ${m.slotLabel.toLowerCase()} : ${m.recipe?.name ?? 'rien de prévu'}`"
        @click="emit('edit', day.day, m.slot)"
      >
        <span class="flex min-w-0 grow flex-col gap-1">
          <span class="flex items-center gap-2">
            <span class="font-mono text-xs text-muted">{{ m.slotLabel }}</span>
            <PortionsBadge v-if="m.portions > 1" :portions="m.portions" />
          </span>
          <span class="text-[17px] font-medium leading-[1.3]">{{ m.recipe?.name ?? 'Ajouter un repas' }}</span>
          <span v-if="m.recipe" class="font-mono text-xs text-muted">
            {{ m.recipe.timeMin }} min · {{ formatNumber(m.nutrition.kcal) }} kcal · {{ m.nutrition.protein }} g prot.
          </span>
        </span>
        <UIcon name="i-mise-chevron-right" class="size-4 shrink-0 text-muted" />
      </UButton>
    </li>
  </ul>
</template>
