<script setup lang="ts">
import type { Ingredient } from '#shared/types/domain'
import type { Stat } from '~/components/common/AppStatRow.vue'
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

const stats = computed<Stat[]>(() => {
  const all = ingredientsStore.ingredients
  const needed = all.filter((i) => needs.value.get(i.id))
  return [
    { label: 'Ingrédients en réserve', value: all.filter((i) => i.stock > 0).length, unit: `sur ${all.length}` },
    { label: 'Valeur estimée', value: formatPrice(all.reduce((sum, i) => sum + costCents(i, i.stock), 0)) },
    { label: 'Besoins de la semaine couverts', value: needed.filter((i) => missing(i) === 0).length, unit: `sur ${needed.length}` },
  ]
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
  <div class="flex flex-col gap-6 md:gap-10">
    <PageHeader eyebrow="En réserve" title="Réserve" lead="Ce que vous avez déjà. La liste de courses en tient compte.">
      <AppToggle :pressed="hideEmpty" @click="hideEmpty = !hideEmpty">Masquer les vides</AppToggle>
      <UButton to="/ingredients" label="Ingrédients" trailing-icon="i-mise-chevron-right" />
    </PageHeader>

    <UAlert v-if="error" color="error" role="alert" title="Impossible de charger votre réserve. Vérifiez que la base de données tourne." />

    <template v-else>
      <AppStatRow :stats="stats" />

      <UAlert v-if="saveError" color="error" role="alert" :title="saveError" />
      <p v-if="!groups.length" class="text-sm text-muted">Rien ici pour l’instant.</p>

      <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] gap-10">
        <section v-for="g in groups" :key="g.shelf" class="flex min-w-0 flex-col gap-2" :aria-label="g.label">
          <AppEyebrow as="h2">{{ g.label }}</AppEyebrow>
          <ul class="m-0 list-none border-t border-default p-0">
            <li v-for="i in g.items" :key="i.id" class="flex min-h-16 items-center justify-between gap-2 border-b border-default py-2 md:gap-4">
              <span class="flex min-w-0 flex-col gap-1">
                <span class="text-base font-medium">{{ i.name }}</span>
                <span class="text-sm" :class="status(i).short ? 'text-primary' : 'text-muted'">{{ status(i).text }}</span>
              </span>
              <StockStepper :ingredient="i" @change="save(i, $event)" @invalid="saveError = INVALID_QUANTITY" />
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
