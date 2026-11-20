<script setup lang="ts">
import type { Recipe } from '#shared/types/domain'
import { formatPrice, recipeCostCents } from '#shared/utils/units'

useHead({ title: 'Recettes · Mise' })

const { week } = useWeek()
const recipesStore = useRecipesStore()
const ingredientsStore = useIngredientsStore()
const planStore = usePlanStore()

const { error } = await useAsyncData(
  'recipes-page',
  async () => {
    await Promise.all([recipesStore.load(), ingredientsStore.load(), planStore.load(week.value), useProfileStore().load()])
    return true
  },
  { watch: [week] },
)

const { query, filter, filtered } = useRecipeFilters(toRef(recipesStore, 'recipes'))
const selectedId = ref<number | null>(null)
/** Phones show the details in a sheet, opened by tapping a recipe. */
const sheetOpen = ref(false)
const formOpen = ref(false)
/** The recipe being edited, or null when the form creates a new one. */
const editing = ref<Recipe | null>(null)

function openForm(recipe: Recipe | null): void {
  editing.value = recipe
  formOpen.value = true
}

const selected = computed(() => {
  const list = recipesStore.recipes
  return list.find((r) => r.id === selectedId.value) ?? filtered.value[0] ?? list[0] ?? null
})

const plannedCount = computed(() =>
  selected.value ? planStore.plan?.slots.filter((s) => s.recipeId === selected.value!.id).length ?? 0 : 0,
)

function select(id: number): void {
  selectedId.value = id
  sheetOpen.value = true
}

const cost = (id: number) => {
  const recipe = recipesStore.byId.get(id)
  return recipe ? formatPrice(recipeCostCents(recipe, ingredientsStore.byId)) : ''
}
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-10">
    <PageHeader :eyebrow="plural(recipesStore.recipes.length, 'recette')" title="Vos recettes" lead="Ce que vous savez cuisiner, et ce que ça coûte.">
      <UButton variant="solid" icon="i-mise-plus" label="Nouvelle recette" @click="openForm(null)" />
    </PageHeader>

    <UAlert v-if="error" color="error" role="alert" title="Impossible de charger les recettes. Vérifiez que la base de données tourne." />

    <template v-else>
      <div class="flex flex-wrap items-center gap-4 md:-mb-4">
        <UInput
          v-model="query"
          type="search"
          icon="i-mise-search"
          placeholder="Rechercher une recette"
          aria-label="Rechercher une recette"
          class="flex-[1_1_280px] md:max-w-[360px]"
        />
        <div role="group" aria-label="Filtres" class="flex flex-wrap gap-2 max-md:-mx-4 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-4 max-md:pb-1">
          <AppToggle v-for="f in RECIPE_FILTERS" :key="f.id" :pressed="filter === f.id" @click="filter = f.id">{{ f.label }}</AppToggle>
        </div>
      </div>

      <div class="flex flex-wrap items-start gap-10">
        <section aria-label="Recettes" class="min-w-0 flex-[999_1_600px]">
          <p v-if="!filtered.length" class="border-y border-default py-6 text-muted">Aucune recette ne correspond. Essayez un autre mot ou un autre filtre.</p>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 max-md:hidden">
            <RecipeCard v-for="r in filtered" :key="r.id" :recipe="r" :selected="selected?.id === r.id" @select="selectedId = r.id" />
          </div>
          <ul class="m-0 flex list-none flex-col border-t border-default p-0 md:hidden">
            <li v-for="r in filtered" :key="r.id" class="border-b border-default">
              <UButton variant="ghost" block class="min-h-18 gap-4 px-0 py-4 text-left text-default hover:bg-transparent" @click="select(r.id)">
                <span class="flex min-w-0 grow flex-col gap-1">
                  <span class="text-[17px] font-medium leading-[1.3]">{{ r.name }}</span>
                  <span class="font-mono text-xs text-muted">{{ r.timeMin }} min · {{ formatNumber(r.kcal) }} kcal · {{ r.protein }} g prot. · {{ cost(r.id) }}</span>
                </span>
                <UIcon name="i-mise-chevron-right" class="size-4 shrink-0" />
              </UButton>
            </li>
          </ul>
        </section>
        <aside class="flex min-w-0 flex-[1_1_340px] flex-col gap-6 max-md:hidden">
          <RecipeDetails v-if="selected" :recipe="selected" :planned-count="plannedCount" @edit="openForm(selected)" />
        </aside>
      </div>

      <!-- Phones: the details in a sheet, opened by tapping a recipe. -->
      <UDrawer
        v-if="selected"
        v-model:open="sheetOpen"
        title="Détail de la recette"
        :handle="false"
        :ui="{
          overlay: 'bg-limestone-950/50',
          content: 'max-h-[92dvh] rounded-none border-t-2 border-inverted ring-0',
          container: 'gap-0 px-4 py-6',
          header: 'min-h-0',
          title: 'sr-only',
        }"
      >
        <template #actions>
          <UButton icon="i-mise-close" square aria-label="Fermer" class="-mb-4" @click="sheetOpen = false" />
        </template>
        <template #body>
          <RecipeDetails :recipe="selected" :planned-count="plannedCount" @edit="openForm(selected)" />
        </template>
      </UDrawer>
    </template>

    <RecipeFormDialog :open="formOpen" :recipe="editing" @close="formOpen = false" @saved="selectedId = $event.id" />
  </div>
</template>
