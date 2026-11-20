<script setup lang="ts">
import type { Ingredient } from '#shared/types/domain'
import { MAX_STOCK, SHELVES } from '#shared/utils/constants'
import { shelfLabel } from '#shared/utils/labels'
import { weekNeeds } from '#shared/utils/shopping'
import { costCents, formatPrice, formatQuantity } from '#shared/utils/units'

useHead({ title: 'Réserve · Mise' })

const { week } = useWeek()
const ingredientsStore = useIngredientsStore()
const recipesStore = useRecipesStore()
const planStore = usePlanStore()
const { error } = await useAsyncData(
  'storage-page',
  async () => {
    await Promise.all([ingredientsStore.load(), recipesStore.load(), planStore.load(week.value)])
    return true
  },
  { watch: [week] },
)

const hideEmpty = ref(false)
const saveError = ref('')

const needs = computed(() => (planStore.plan ? weekNeeds(planStore.plan, recipesStore.byId) : new Map<number, number>()))

/** What is still missing for the week, rounded up for pieces. */
function missing(i: Ingredient): number {
  const left = Math.max(0, (needs.value.get(i.id) ?? 0) - i.stock)
  return i.unit === 'pcs' ? Math.ceil(left - 1e-9) : left
}

function status(i: Ingredient): { text: string, short: boolean } {
  if (!needs.value.get(i.id)) return { text: 'Pas prévu cette semaine', short: false }
  const m = missing(i)
  return m > 0 ? { text: `Manque ${formatQuantity(m, i.unit)}`, short: true } : { text: 'Couvre la semaine', short: false }
}

const stats = computed(() => {
  const all = ingredientsStore.ingredients
  const needed = all.filter((i) => needs.value.get(i.id))
  return {
    inStock: all.filter((i) => i.stock > 0).length,
    total: all.length,
    value: formatPrice(all.reduce((sum, i) => sum + costCents(i, i.stock), 0)),
    covered: needed.filter((i) => missing(i) === 0).length,
    needed: needed.length,
  }
})

const groups = computed(() => {
  const known = SHELVES as readonly string[]
  const shelves = [...known.filter((s) => ingredientsStore.shelves.includes(s)), ...ingredientsStore.shelves.filter((s) => !known.includes(s)).sort()]
  return shelves
    .map((s) => ({
      shelf: s,
      label: shelfLabel(s),
      items: ingredientsStore.ingredients.filter((i) => i.shelf === s && (!hideEmpty.value || i.stock > 0)),
    }))
    .filter((g) => g.items.length)
})

const INVALID_QUANTITY = `Quantité non enregistrée : indiquez un nombre entre 0 et ${formatNumber(MAX_STOCK)}.`

async function save(ingredient: Ingredient, quantity: number): Promise<void> {
  saveError.value = ''
  try {
    await ingredientsStore.setStock(ingredient.id, quantity)
  } catch {
    saveError.value = `Impossible d’enregistrer la quantité de ${ingredient.name}. Réessayez.`
  }
}
</script>

<template>
  <div class="page">
    <PageHeader eyebrow="En réserve" title="Réserve" lead="Ce que vous avez déjà. La liste de courses en tient compte.">
      <button type="button" class="toggle" :aria-pressed="hideEmpty" @click="hideEmpty = !hideEmpty">Masquer les vides</button>
      <NuxtLink to="/ingredients" class="btn">Ingrédients <AppIcon name="chevronRight" :size="16" /></NuxtLink>
    </PageHeader>

    <p v-if="error" class="alert" role="alert">Impossible de charger votre réserve. Vérifiez que la base de données tourne.</p>

    <template v-else>
      <dl class="stat-row">
        <div><dt>Ingrédients en réserve</dt><dd>{{ stats.inStock }} <small>sur {{ stats.total }}</small></dd></div>
        <div><dt>Valeur estimée</dt><dd>{{ stats.value }}</dd></div>
        <div><dt>Besoins de la semaine couverts</dt><dd>{{ stats.covered }} <small>sur {{ stats.needed }}</small></dd></div>
      </dl>

      <p v-if="saveError" class="alert" role="alert">{{ saveError }}</p>
      <p v-if="!groups.length" class="empty">Rien ici pour l’instant.</p>

      <div class="groups">
        <section v-for="g in groups" :key="g.shelf" class="group" :aria-label="g.label">
          <h2 class="eyebrow">{{ g.label }}</h2>
          <ul class="items">
            <li v-for="i in g.items" :key="i.id" class="item">
              <span class="item__text">
                <span class="item__name">{{ i.name }}</span>
                <span class="item__status" :class="{ 'item__status--short': status(i).short }">{{ status(i).text }}</span>
              </span>
              <StockStepper :ingredient="i" @change="save(i, $event)" @invalid="saveError = INVALID_QUANTITY" />
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.empty {
  padding: 24px 0;
  border-top: 1px solid var(--c-line);
  border-bottom: 1px solid var(--c-line);
  color: var(--c-text-2);
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr));
  gap: 40px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.items {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--c-line);
}

.item {
  min-height: 64px;
  padding: 8px 0;
  border-bottom: 1px solid var(--c-line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.item__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.item__name {
  font-size: 16px;
  font-weight: 500;
}

.item__status {
  font-size: 14px;
  color: var(--c-text-2);
}

.item__status--short {
  color: var(--c-accent);
}

@media (max-width: 899px) {
  .item {
    gap: 8px;
  }
}
</style>
