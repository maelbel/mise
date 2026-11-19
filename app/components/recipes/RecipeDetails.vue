<script setup lang="ts">
import type { Recipe } from '#shared/types/domain'
import { dietLabel, difficultyLabel } from '#shared/utils/labels'
import { costCents, formatPrice, formatQuantity } from '#shared/utils/units'
import { MAX_PORTIONS, MIN_PORTIONS } from '#shared/utils/constants'

const props = defineProps<{ recipe: Recipe, plannedCount: number }>()

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
  <section class="details" aria-label="Détail de la recette">
    <div class="details__head">
      <p class="eyebrow">{{ difficultyLabel(recipe.difficulty) }} · {{ recipe.timeMin }} min</p>
      <h2 class="details__name">{{ recipe.name }}</h2>
      <p class="muted">{{ recipe.diet.length ? recipe.diet.map(dietLabel).join(' · ') : 'Aucun régime particulier' }}</p>
    </div>

    <dl class="nutrition">
      <div><dt>Calories</dt><dd class="mono">{{ formatNumber(recipe.kcal) }} <small>kcal</small></dd></div>
      <div><dt>Protéines</dt><dd class="mono nutrition__protein">{{ recipe.protein }} g</dd></div>
      <div><dt>Glucides</dt><dd class="mono">{{ recipe.carbs }} g</dd></div>
      <div><dt>Lipides</dt><dd class="mono">{{ recipe.fat }} g</dd></div>
    </dl>
    <p v-if="share" class="hint">
      Une portion couvre <strong class="mono">{{ share.kcal }} %</strong> de vos calories et <strong class="mono">{{ share.protein }} %</strong> de vos protéines du jour.
    </p>

    <div class="ingredients">
      <div class="ingredients__head">
        <h3 class="ingredients__title">Ingrédients</h3>
        <div class="stepper" role="group" aria-label="Portions">
          <button type="button" class="icon-btn" aria-label="Une portion de moins" :disabled="portions <= MIN_PORTIONS" @click="portions--">
            <AppIcon name="minus" :size="16" />
          </button>
          <span class="stepper__value mono" aria-live="polite">{{ plural(portions, 'portion') }}</span>
          <button type="button" class="icon-btn icon-btn--primary" aria-label="Une portion de plus" :disabled="portions >= MAX_PORTIONS" @click="portions++">
            <AppIcon name="plus" :size="16" />
          </button>
        </div>
      </div>
      <ul v-if="lines.length" class="lines">
        <li v-for="l in lines" :key="l.id" class="line">
          <span>{{ l.name }}</span>
          <span class="line__qty mono">{{ l.quantity }}</span>
          <span class="line__cost mono">{{ l.cost }}</span>
        </li>
      </ul>
      <p v-else class="hint">Aucun ingrédient renseigné.</p>
      <div class="total">
        <span>Coût estimé</span>
        <span class="total__value mono">{{ total }}</span>
      </div>
    </div>

    <p class="muted">{{ usage }}</p>
  </section>
</template>

<style scoped>
.details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.details__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.details__name {
  font-size: 32px;
  font-weight: 500;
  line-height: 1.15;
}

.nutrition {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--c-line);
}

.nutrition > div {
  padding: 16px 16px 16px 0;
  border-bottom: 1px solid var(--c-line);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nutrition > div:nth-child(even) {
  padding: 16px 0 16px 16px;
  border-left: 1px solid var(--c-line);
}

.nutrition dt {
  font-size: 14px;
  color: var(--c-text-2);
}

.nutrition dd {
  margin: 0;
  font-size: 20px;
}

.nutrition small {
  font-size: 12px;
  color: var(--c-text-2);
}

.nutrition__protein {
  color: var(--c-accent);
}

.ingredients {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ingredients__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.ingredients__title {
  font-size: 17px;
  font-weight: 500;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stepper__value {
  min-width: 88px;
  text-align: center;
  font-size: 14px;
}

.lines {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--c-line);
}

.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 16px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--c-line);
  font-size: 15px;
}

.line__qty {
  font-size: 12px;
  color: var(--c-text-2);
}

.line__cost {
  min-width: 64px;
  text-align: right;
  font-size: 12px;
}

.total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  padding-top: 8px;
  font-size: 15px;
  font-weight: 500;
}

.total__value {
  font-size: 18px;
  font-weight: 400;
}

@media (max-width: 899px) {
  .details__name {
    font-size: 24px;
  }
}
</style>
