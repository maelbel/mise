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
  <button type="button" class="recipe" :aria-pressed="selected" @click="emit('select')">
    <span v-if="tags" class="eyebrow recipe__tags">{{ tags }}</span>
    <span class="recipe__name">{{ recipe.name }}</span>
    <span class="recipe__meta">{{ meta }}</span>
    <span class="recipe__foot mono">
      <span>{{ formatNumber(recipe.kcal) }} kcal · {{ recipe.protein }} g prot.</span>
      <span class="recipe__cost">{{ cost }} / portion</span>
    </span>
  </button>
</template>

<style scoped>
.recipe {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
  padding: 24px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  background: var(--c-bg);
  color: var(--c-text);
  text-align: left;
  cursor: pointer;
}

.recipe[aria-pressed='true'] {
  background: var(--c-surface);
  border-color: var(--c-text);
}

.recipe__tags {
  font-size: 12px;
}

.recipe__name {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.3;
}

.recipe__meta {
  font-size: 14px;
  line-height: 1.5;
  color: var(--c-text-2);
}

.recipe__foot {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--c-line);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--c-text-2);
}

.recipe__cost {
  color: var(--c-text);
}

@media (max-width: 899px) {
  .recipe {
    min-height: 0;
    padding: 16px;
  }

  .recipe__name {
    font-size: 17px;
  }
}
</style>
