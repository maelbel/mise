<script setup lang="ts">
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

const ALL = ''
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
  <div class="page">
    <NuxtLink to="/storage" class="back mobile-only"><AppIcon name="chevronLeft" :size="16" />Réserve</NuxtLink>
    <PageHeader :eyebrow="`${plural(ingredientsStore.ingredients.length, 'ingrédient')} · ${plural(shelves.length, 'rayon')}`" title="Ingrédients" lead="Prix au kilo, au litre ou à la pièce : Mise s’en sert pour chiffrer chaque recette.">
      <button type="button" class="btn btn--primary" @click="openForm(null)"><AppIcon name="plus" :size="16" />Ajouter un ingrédient</button>
    </PageHeader>

    <p v-if="error" class="alert" role="alert">Impossible de charger les ingrédients. Vérifiez que la base de données tourne.</p>

    <template v-else>
      <div class="toolbar">
        <label class="search">
          <span class="visually-hidden">Rechercher un ingrédient</span>
          <AppIcon name="search" :size="16" class="search__icon" />
          <input v-model="query" type="search" class="input search__input" placeholder="Rechercher un ingrédient">
        </label>
        <label class="shelf-filter">
          <span class="visually-hidden">Rayon</span>
          <select v-model="shelf" class="input">
            <option :value="ALL">Tous les rayons</option>
            <option v-for="s in shelves" :key="s" :value="s">{{ shelfLabel(s) }}</option>
          </select>
        </label>
      </div>

      <p v-if="!groups.length" class="empty">Aucun ingrédient ne correspond.</p>

      <section v-for="g in groups" :key="g.shelf" class="group" :aria-label="g.label">
        <h2 class="eyebrow group__title"><span>{{ g.label }}</span><span class="mono group__count">{{ g.rows.length }}</span></h2>
        <div class="table-wrap desktop-only">
          <div class="table">
            <div class="table__row table__row--head">
              <span>Nom</span><span>Vendu</span><span class="num">Prix</span><span>Utilisé dans</span><span class="num">En réserve</span><span />
            </div>
            <ul class="table__body">
              <li v-for="i in g.rows" :key="i.id" class="table__row">
                <span class="name">{{ i.name }}</span>
                <span class="muted">{{ i.sold }}</span>
                <span class="num mono">{{ i.price }}</span>
                <span class="muted">{{ i.used }}</span>
                <span class="num mono">{{ i.stock }}</span>
                <button type="button" class="icon-btn" :aria-label="`Modifier ${i.name}`" @click="openForm(i.ingredient)"><AppIcon name="edit" :size="16" /></button>
              </li>
            </ul>
          </div>
        </div>
        <ul class="rows mobile-only">
          <li v-for="i in g.rows" :key="i.id" class="rows__item">
            <span class="rows__text">
              <span class="name">{{ i.name }}</span>
              <span class="muted rows__meta">{{ i.used }} · réserve {{ i.stock }}</span>
            </span>
            <span class="mono rows__price">{{ i.price }}</span>
            <button type="button" class="icon-btn" :aria-label="`Modifier ${i.name}`" @click="openForm(i.ingredient)"><AppIcon name="edit" :size="16" /></button>
          </li>
        </ul>
      </section>
    </template>

    <IngredientFormDialog :open="formOpen" :ingredient="editing" :unit-locked="unitLocked" @close="formOpen = false" />
  </div>
</template>

<style scoped>
.back {
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  margin: -16px 0 -16px -4px;
  font-size: 15px;
  text-decoration: none;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.search {
  position: relative;
  flex: 1 1 260px;
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

.shelf-filter {
  flex: 0 1 240px;
  display: block;
}

.empty {
  padding: 24px 0;
  border-top: 1px solid var(--c-line);
  border-bottom: 1px solid var(--c-line);
  color: var(--c-text-2);
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group__title {
  display: flex;
  justify-content: space-between;
}

.group__count {
  letter-spacing: 0;
  color: var(--c-text-2);
}

.table-wrap {
  overflow-x: auto;
}

.table {
  /* Not Tailwind's `table` utility (display: table). */
  display: block;
  min-width: 640px;
}

.table__body {
  margin: 0;
  padding: 0;
  list-style: none;
}

.table__row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(4, minmax(0, 1fr)) 44px;
  gap: 32px;
  align-items: center;
  min-height: 48px;
  padding: 12px 0;
  border-bottom: 1px solid var(--c-line);
  font-size: 15px;
}

.table__row--head {
  min-height: 0;
  padding: 8px 0;
  border-bottom-color: var(--c-text);
  font-size: 14px;
  color: var(--c-text-2);
}

.name {
  font-size: 16px;
  font-weight: 500;
}

.num {
  text-align: right;
}

.table__row .mono {
  font-size: 13px;
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
  flex-direction: column;
  border-top: 1px solid var(--c-line);
}

.rows__item {
  min-height: 64px;
  padding: 8px 0;
  border-bottom: 1px solid var(--c-line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.rows__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rows__meta {
  font-size: 13px;
}

.rows__price {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 13px;
}

@media (max-width: 899px) {
  .search {
    max-width: none;
  }

  .shelf-filter {
    flex: 1 1 100%;
  }
}
</style>
