<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Ingredient } from '#shared/types/domain'
import { SHELVES } from '#shared/utils/constants'
import { shelfLabel, UNIT_NAMES } from '#shared/utils/labels'
import { formatQuantity, formatUnitPrice } from '#shared/utils/units'

useHead({ title: 'Ingrédients · Mise' })

const ingredientsStore = useIngredientsStore()
const recipesStore = useRecipesStore()
const { error } = await useAsyncData('ingredients-page', async () => {
  await Promise.all([ingredientsStore.load(), recipesStore.load()])
  return true
})

/** "Tous les rayons" (a select option can't be empty). */
const ALL = 'all'
const shelf = ref(ALL)
const query = ref('')
const formOpen = ref(false)
/** The ingredient being edited, or null when the form creates a new one. */
const editing = ref<Ingredient | null>(null)

function openForm(ingredient: Ingredient | null): void {
  editing.value = ingredient
  formOpen.value = true
}

/** Recipe quantities and stock are counted in the ingredient's unit, so it can't change while either uses it. */
const unitLocked = computed(() => !!editing.value && ((usedIn.value.get(editing.value.id) ?? 0) > 0 || editing.value.stock > 0))

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

/** Shelves in store order, then any others. */
const shelves = computed(() => {
  const known = SHELVES as readonly string[]
  const others = ingredientsStore.shelves.filter((s) => !known.includes(s)).sort()
  return [...known.filter((s) => ingredientsStore.shelves.includes(s)), ...others]
})

const shelfItems = computed(() => [{ label: 'Tous les rayons', value: ALL }, ...shelves.value.map((s) => ({ label: shelfLabel(s), value: s }))])

type Row = (typeof groups.value)[number]['rows'][number]
const RIGHT = { th: 'text-right', td: 'text-right' }
const columns: TableColumn<Row>[] = [
  { accessorKey: 'name', header: 'Nom', meta: { class: { th: 'w-[30%]', td: 'text-base font-medium' } } },
  { accessorKey: 'sold', header: 'Vendu', meta: { class: { td: 'text-muted' } } },
  { accessorKey: 'price', header: 'Prix', meta: { class: RIGHT } },
  { accessorKey: 'used', header: 'Utilisé dans', meta: { class: { td: 'text-muted' } } },
  { accessorKey: 'stock', header: 'En réserve', meta: { class: RIGHT } },
  { id: 'actions', header: '', meta: { class: { th: 'w-11 pr-0', td: 'pr-0' } } },
]
const tableUi = {
  root: 'overflow-x-auto',
  base: 'w-full min-w-[640px] table-fixed',
  separator: 'bg-inverted',
  tbody: 'divide-y-0',
  th: 'px-0 pr-8 py-2 text-sm font-normal text-muted',
  td: 'border-b border-default px-0 pr-8 py-3 text-[15px] text-default whitespace-normal align-middle',
}

const usedIn = computed(() => {
  const counts = new Map<number, number>()
  for (const r of recipesStore.recipes) for (const l of r.ingredients) counts.set(l.ingredientId, (counts.get(l.ingredientId) ?? 0) + 1)
  return counts
})

const groups = computed(() => {
  const q = fold(query.value.trim())
  return shelves.value
    .filter((s) => shelf.value === ALL || s === shelf.value)
    .map((s) => ({
      shelf: s,
      label: shelfLabel(s),
      rows: ingredientsStore.ingredients
        .filter((i) => i.shelf === s && (!q || fold(i.name).includes(q)))
        .map((i) => {
          const n = usedIn.value.get(i.id) ?? 0
          return {
            ...i,
            ingredient: i,
            sold: UNIT_NAMES[i.unit],
            price: formatUnitPrice(i),
            used: n ? plural(n, 'recette') : 'Aucune recette',
            stock: i.stock > 0 ? formatQuantity(i.stock, i.unit) : '—',
          }
        }),
    }))
    .filter((g) => g.rows.length)
})
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-10">
    <ULink to="/storage" raw class="-my-4 -ml-1 flex min-h-11 items-center gap-1 self-start text-[15px] text-primary md:hidden">
      <UIcon name="i-mise-chevron-left" class="size-4" />Réserve
    </ULink>
    <PageHeader :eyebrow="`${plural(ingredientsStore.ingredients.length, 'ingrédient')} · ${plural(shelves.length, 'rayon')}`" title="Ingrédients" lead="Prix au kilo, au litre ou à la pièce : Mise s’en sert pour chiffrer chaque recette.">
      <UButton variant="solid" icon="i-mise-plus" label="Ajouter un ingrédient" @click="openForm(null)" />
    </PageHeader>

    <UAlert v-if="error" color="error" role="alert" title="Impossible de charger les ingrédients. Vérifiez que la base de données tourne." />

    <template v-else>
      <div class="flex flex-wrap gap-4">
        <UInput
          v-model="query"
          type="search"
          icon="i-mise-search"
          placeholder="Rechercher un ingrédient"
          aria-label="Rechercher un ingrédient"
          class="flex-[1_1_260px] md:max-w-[360px]"
        />
        <USelect v-model="shelf" :items="shelfItems" aria-label="Rayon" class="flex-[1_1_100%] md:flex-[0_1_240px]" />
      </div>

      <p v-if="!groups.length" class="border-y border-default py-6 text-muted">Aucun ingrédient ne correspond.</p>

      <section v-for="g in groups" :key="g.shelf" class="flex flex-col gap-2" :aria-label="g.label">
        <AppEyebrow as="h2" class="flex justify-between">
          <span>{{ g.label }}</span><span class="font-mono tracking-normal text-muted">{{ g.rows.length }}</span>
        </AppEyebrow>
        <UTable :data="g.rows" :columns="columns" :ui="tableUi" class="max-md:hidden">
          <template #price-cell="{ row }">
            <span class="font-mono text-[13px]">{{ row.original.price }}</span>
          </template>
          <template #stock-cell="{ row }">
            <span class="font-mono text-[13px]">{{ row.original.stock }}</span>
          </template>
          <template #actions-cell="{ row }">
            <UButton icon="i-mise-edit" square :aria-label="`Modifier ${row.original.name}`" @click="openForm(row.original.ingredient)" />
          </template>
        </UTable>
        <ul class="m-0 flex list-none flex-col border-t border-default p-0 md:hidden">
          <li v-for="i in g.rows" :key="i.id" class="flex min-h-16 items-center justify-between gap-4 border-b border-default py-2">
            <span class="flex min-w-0 flex-col gap-1">
              <span class="text-base font-medium">{{ i.name }}</span>
              <span class="text-[13px] text-muted">{{ i.used }} · réserve {{ i.stock }}</span>
            </span>
            <span class="ml-auto shrink-0 font-mono text-[13px]">{{ i.price }}</span>
            <UButton icon="i-mise-edit" square :aria-label="`Modifier ${i.name}`" @click="openForm(i.ingredient)" />
          </li>
        </ul>
      </section>
    </template>

    <IngredientFormDialog :open="formOpen" :ingredient="editing" :unit-locked="unitLocked" @close="formOpen = false" />
  </div>
</template>
