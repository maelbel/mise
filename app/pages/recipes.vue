<script setup lang="ts">
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
  <div class="page">
    <PageHeader :eyebrow="plural(recipesStore.recipes.length, 'recette')" title="Vos recettes" lead="Ce que vous savez cuisiner, et ce que ça coûte.">
      <button type="button" class="btn btn--primary" @click="formOpen = true"><AppIcon name="plus" :size="16" />Nouvelle recette</button>
    </PageHeader>

    <p v-if="error" class="alert" role="alert">Impossible de charger les recettes. Vérifiez que la base de données tourne.</p>

    <template v-else>
      <div class="toolbar">
        <label class="search">
          <span class="visually-hidden">Rechercher une recette</span>
          <AppIcon name="search" :size="16" class="search__icon" />
          <input v-model="query" type="search" class="input search__input" placeholder="Rechercher une recette">
        </label>
        <div role="group" aria-label="Filtres" class="chips filters">
          <button v-for="f in RECIPE_FILTERS" :key="f.id" type="button" class="toggle" :aria-pressed="filter === f.id" @click="filter = f.id">
            {{ f.label }}
          </button>
        </div>
      </div>

      <div class="layout">
        <section aria-label="Recettes" class="layout__main">
          <p v-if="!filtered.length" class="empty">Aucune recette ne correspond. Essayez un autre mot ou un autre filtre.</p>
          <div class="grid desktop-only">
            <RecipeCard v-for="r in filtered" :key="r.id" :recipe="r" :selected="selected?.id === r.id" @select="selectedId = r.id" />
          </div>
          <ul class="rows mobile-only">
            <li v-for="r in filtered" :key="r.id" class="rows__item">
              <button type="button" class="row" @click="select(r.id)">
                <span class="row__text">
                  <span class="row__name">{{ r.name }}</span>
                  <span class="row__meta mono">{{ r.timeMin }} min · {{ formatNumber(r.kcal) }} kcal · {{ r.protein }} g prot. · {{ cost(r.id) }}</span>
                </span>
                <AppIcon name="chevronRight" :size="16" />
              </button>
            </li>
          </ul>
        </section>
        <aside class="layout__side desktop-only">
          <RecipeDetails v-if="selected" :recipe="selected" :planned-count="plannedCount" />
        </aside>
      </div>

      <div v-if="sheetOpen && selected" class="sheet mobile-only">
        <button type="button" class="sheet__backdrop" aria-label="Fermer" @click="sheetOpen = false" />
        <div class="sheet__panel" role="dialog" aria-label="Détail de la recette">
          <button type="button" class="icon-btn sheet__close" aria-label="Fermer" @click="sheetOpen = false"><AppIcon name="close" :size="16" /></button>
          <RecipeDetails :recipe="selected" :planned-count="plannedCount" />
        </div>
      </div>
    </template>

    <RecipeFormDialog :open="formOpen" @close="formOpen = false" @created="selectedId = $event.id" />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: -16px;
}

.search {
  position: relative;
  flex: 1 1 280px;
  max-width: 360px;
  display: block;
}

.search__icon {
  position: absolute;
  left: 16px;
  top: 14px;
  color: var(--c-text-2);
}

.search__input {
  padding-left: 44px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.empty {
  padding: 24px 0;
  border-top: 1px solid var(--c-line);
  border-bottom: 1px solid var(--c-line);
  color: var(--c-text-2);
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
  flex-direction: column;
  border-top: 1px solid var(--c-line);
}

.rows__item {
  border-bottom: 1px solid var(--c-line);
}

.row {
  width: 100%;
  min-height: 72px;
  padding: 16px 0;
  border: 0;
  background: transparent;
  color: var(--c-text);
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  cursor: pointer;
}

.row__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-grow: 1;
  min-width: 0;
}

.row__name {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.3;
}

.row__meta {
  font-size: 12px;
  color: var(--c-text-2);
}

@media (max-width: 899px) {
  .toolbar {
    margin-bottom: 0;
  }

  .search {
    max-width: none;
  }

  .filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin: 0 -16px;
    padding: 0 16px 4px;
  }

  .sheet {
    position: fixed;
    inset: 0;
    z-index: 30;
    flex-direction: column;
    justify-content: flex-end;
  }

  .sheet__backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(14, 15, 17, 0.5);
    cursor: pointer;
  }

  .sheet__panel {
    position: relative;
    max-height: 92vh;
    overflow-y: auto;
    padding: 24px 16px;
    background: var(--c-bg);
    border-top: 2px solid var(--c-fill-primary);
    display: flex;
    flex-direction: column;
  }

  .sheet__close {
    align-self: flex-end;
    margin-bottom: -16px;
  }
}
</style>
