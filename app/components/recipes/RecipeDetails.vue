<script setup lang="ts">
import type { Recipe } from '#shared/types/domain'
import { dietLabel, difficultyLabel } from '#shared/utils/labels'
import { costCents, formatPrice, formatQuantity } from '#shared/utils/units'
import { MAX_PORTIONS, MIN_PORTIONS } from '#shared/utils/constants'

const props = defineProps<{ recipe: Recipe, plannedCount: number }>()
defineEmits<{ edit: [] }>()

const ingredientsStore = useIngredientsStore()
const profileStore = useProfileStore()

const portions = ref(1)
watch(() => props.recipe.id, () => {
  portions.value = 1
})

const lines = computed(() =>
  props.recipe.ingredients.map((line) => {
    const ingredient = ingredientsStore.byId.get(line.ingredientId)
    const quantity = line.quantity * portions.value
    return {
      id: line.ingredientId,
      name: ingredient?.name ?? 'Ingrédient inconnu',
      quantity: ingredient ? formatQuantity(quantity, ingredient.unit) : String(quantity),
      cost: ingredient ? formatPrice(costCents(ingredient, quantity)) : '—',
      cents: ingredient ? costCents(ingredient, quantity) : 0,
    }
  }),
)
const total = computed(() => formatPrice(lines.value.reduce((sum, l) => sum + l.cents, 0)))

const nutrition = computed<{ label: string, value: string, unit?: string, accent?: boolean }[]>(() => [
  { label: 'Calories', value: formatNumber(props.recipe.kcal), unit: 'kcal' },
  { label: 'Protéines', value: `${props.recipe.protein} g`, accent: true },
  { label: 'Glucides', value: `${props.recipe.carbs} g` },
  { label: 'Lipides', value: `${props.recipe.fat} g` },
])

/** One serving's share of the user's daily targets. */
const share = computed(() => {
  const t = profileStore.targets
  if (!t) return null
  return { kcal: Math.round((props.recipe.kcal / t.kcal) * 100), protein: Math.round((props.recipe.protein / t.protein) * 100) }
})

const usage = computed(() => props.plannedCount
  ? `Prévue ${props.plannedCount} fois cette semaine.`
  : 'Pas encore prévue cette semaine.')
</script>

<template>
  <section class="flex flex-col gap-6" aria-label="Détail de la recette">
    <div class="flex flex-col gap-2">
      <AppEyebrow>{{ difficultyLabel(recipe.difficulty) }} · {{ recipe.timeMin }} min</AppEyebrow>
      <h2 class="text-[32px] font-medium leading-[1.15] max-md:text-2xl max-md:leading-[1.15]">{{ recipe.name }}</h2>
      <p class="text-muted">{{ recipe.diet.length ? recipe.diet.map(dietLabel).join(' · ') : 'Aucun régime particulier' }}</p>
    </div>

    <dl class="m-0 grid grid-cols-2 border-t border-default">
      <div
        v-for="(n, i) in nutrition"
        :key="n.label"
        class="flex flex-col gap-1 border-b border-default py-4"
        :class="i % 2 ? 'border-l pl-4' : 'pr-4'"
      >
        <dt class="text-sm text-muted">{{ n.label }}</dt>
        <dd class="m-0 font-mono text-xl" :class="{ 'text-primary': n.accent }">
          {{ n.value }}{{ n.unit ? ' ' : '' }}<small v-if="n.unit" class="text-xs text-muted">{{ n.unit }}</small>
        </dd>
      </div>
    </dl>
    <p v-if="share" class="text-sm text-muted">
      Une portion couvre <strong class="font-mono">{{ share.kcal }} %</strong> de vos calories et <strong class="font-mono">{{ share.protein }} %</strong> de vos protéines du jour.
    </p>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-[17px] font-medium">Ingrédients</h3>
        <div class="flex items-center gap-2" role="group" aria-label="Portions">
          <UButton icon="i-mise-minus" square aria-label="Une portion de moins" :disabled="portions <= MIN_PORTIONS" @click="portions--" />
          <span class="min-w-22 text-center font-mono text-sm" aria-live="polite">{{ plural(portions, 'portion') }}</span>
          <UButton icon="i-mise-plus" square variant="solid" aria-label="Une portion de plus" :disabled="portions >= MAX_PORTIONS" @click="portions++" />
        </div>
      </div>
      <ul v-if="lines.length" class="m-0 list-none border-t border-default p-0">
        <li v-for="l in lines" :key="l.id" class="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-4 border-b border-default py-2 text-[15px]">
          <span>{{ l.name }}</span>
          <span class="font-mono text-xs text-muted">{{ l.quantity }}</span>
          <span class="min-w-16 text-right font-mono text-xs">{{ l.cost }}</span>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">Aucun ingrédient renseigné.</p>
      <div class="flex items-baseline justify-between gap-4 pt-2 text-[15px] font-medium">
        <span>Coût estimé</span>
        <span class="font-mono text-lg font-normal">{{ total }}</span>
      </div>
    </div>

    <p class="text-muted">{{ usage }}</p>
    <UButton label="Modifier la recette" class="self-start" @click="$emit('edit')" />
  </section>
</template>
