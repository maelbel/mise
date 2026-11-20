<script setup lang="ts">
import type { Recipe } from '#shared/types/domain'
import { dietLabel, difficultyLabel, tagLabel } from '#shared/utils/labels'
import { formatPrice, recipeCostCents } from '#shared/utils/units'

const props = defineProps<{ recipe: Recipe, selected: boolean }>()
const emit = defineEmits<{ select: [] }>()

const ingredientsStore = useIngredientsStore()
const tags = computed(() => props.recipe.tags.map(tagLabel).join(' · '))
const meta = computed(() => [`${props.recipe.timeMin} min`, difficultyLabel(props.recipe.difficulty), ...props.recipe.diet.map(dietLabel)].join(' · '))
const cost = computed(() => formatPrice(recipeCostCents(props.recipe, ingredientsStore.byId)))
</script>

<template>
  <UButton
    class="min-h-50 flex-col items-stretch gap-2 border border-default p-6 text-left ring-0 hover:bg-default max-md:min-h-0 max-md:p-4"
    :class="{ 'border-inverted bg-muted hover:bg-muted': selected }"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <AppEyebrow v-if="tags" as="span" class="text-xs!">{{ tags }}</AppEyebrow>
    <span class="text-xl font-medium leading-[1.3] max-md:text-[17px]">{{ recipe.name }}</span>
    <span class="text-sm text-muted">{{ meta }}</span>
    <span class="mt-auto flex flex-wrap justify-between gap-2 border-t border-default pt-4 font-mono text-xs text-muted">
      <span>{{ formatNumber(recipe.kcal) }} kcal · {{ recipe.protein }} g prot.</span>
      <span class="text-default">{{ cost }} / portion</span>
    </span>
  </UButton>
</template>
