<script setup lang="ts">
import { shelfLabel } from '#shared/utils/labels'
import { formatPrice, formatQuantity } from '#shared/utils/units'

useHead({ title: 'Courses · Mise' })

const { week, label } = useWeek()
const shoppingStore = useShoppingStore()

const { error } = await useAsyncData(
  'shopping-page',
  async () => {
    await shoppingStore.load(week.value)
    return true
  },
  { watch: [week] },
)

const hideChecked = ref(false)
const actionError = ref('')

const total = computed(() => shoppingStore.items.length)
const progress = computed(() => (total.value ? Math.round((shoppingStore.doneCount / total.value) * 100) : 0))
const groups = computed(() =>
  (shoppingStore.list?.groups ?? [])
    .map((g) => ({
      ...g,
      label: shelfLabel(g.shelf),
      subtotal: formatPrice(g.items.reduce((sum, i) => sum + i.costCents, 0)),
      visible: hideChecked.value ? g.items.filter((i) => !i.checked) : g.items,
    }))
    .filter((g) => g.visible.length > 0),
)

async function toggle(ingredientId: number): Promise<void> {
  actionError.value = ''
  try {
    await shoppingStore.toggle(ingredientId)
  } catch {
    actionError.value = 'Enregistrement impossible. Réessayez.'
  }
}

async function reset(): Promise<void> {
  actionError.value = ''
  try {
    await shoppingStore.reset()
  } catch {
    actionError.value = 'Impossible de décocher la liste. Réessayez.'
  }
}
</script>

<template>
  <div class="page">
    <PageHeader :eyebrow="label" title="Liste de courses" lead="Les besoins de la semaine, moins votre réserve, dans l’ordre du magasin.">
      <WeekSwitcher />
    </PageHeader>

    <p v-if="error" class="alert" role="alert">Impossible de charger la liste de courses. Vérifiez que la base de données tourne.</p>

    <template v-else-if="shoppingStore.list">
      <section class="summary" aria-label="Avancement">
        <dl class="stat-row desktop-only">
          <div><dt>Articles cochés</dt><dd>{{ shoppingStore.doneCount }} <small>sur {{ total }}</small></dd></div>
          <div><dt>Reste à acheter</dt><dd>{{ formatPrice(shoppingStore.remainingCents) }}</dd></div>
          <div><dt>Total estimé</dt><dd>{{ formatPrice(shoppingStore.list.totalCents) }}</dd></div>
        </dl>
        <div class="summary__card ink-panel mobile-only">
          <div class="summary__col">
            <span class="summary__label">Reste à acheter</span>
            <span class="summary__big mono">{{ formatPrice(shoppingStore.remainingCents) }}</span>
          </div>
          <div class="summary__col summary__col--end">
            <span class="summary__label">Cochés</span>
            <span class="summary__count mono">{{ shoppingStore.doneCount }}/{{ total }}</span>
          </div>
        </div>
        <div class="track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" aria-label="Articles cochés">
          <div class="track__bar" :style="{ width: `${progress}%` }" />
        </div>
      </section>

      <div class="toolbar">
        <button type="button" class="toggle" :aria-pressed="hideChecked" @click="hideChecked = !hideChecked">Masquer les cochés</button>
        <button type="button" class="btn" :disabled="!shoppingStore.doneCount" @click="reset">Tout décocher</button>
      </div>

      <p v-if="actionError" class="alert" role="alert">{{ actionError }}</p>
      <p v-if="!total" class="notice">Rien à acheter : votre réserve couvre la semaine.</p>
      <p v-else-if="!groups.length" class="notice" role="status">Tout est dans le panier.</p>

      <div class="groups">
        <section v-for="g in groups" :key="g.shelf" class="group" :aria-label="g.label">
          <h2 class="eyebrow group__title"><span>{{ g.label }}</span><span class="mono group__sub">{{ g.subtotal }}</span></h2>
          <ul class="items">
            <li v-for="item in g.visible" :key="item.ingredientId" class="items__row">
              <label class="item" :class="{ 'item--done': item.checked }">
                <input type="checkbox" class="item__box" :checked="item.checked" @change="toggle(item.ingredientId)">
                <span class="item__text">
                  <span class="item__name">{{ item.name }}</span>
                  <span class="item__qty mono">{{ formatQuantity(item.quantity, item.unit) }}</span>
                </span>
                <span class="item__price mono">{{ formatPrice(item.costCents) }}</span>
              </label>
            </li>
          </ul>
        </section>
      </div>

      <p class="hint">Les quantités tiennent compte de votre <NuxtLink to="/storage">réserve</NuxtLink>. Prix estimés à partir du catalogue des ingrédients.</p>
    </template>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary__card {
  padding: 16px;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.summary__col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary__col--end {
  align-items: flex-end;
}

.summary__label {
  font-size: 14px;
  color: var(--c-stone);
}

.summary__big {
  font-size: 24px;
  line-height: 1;
}

.summary__count {
  font-size: 16px;
  color: var(--c-mark-light);
}

.track {
  height: 2px;
  background: var(--c-line);
}

.track__bar {
  height: 2px;
  background: var(--c-mark);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 40px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.group__title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.group__sub {
  letter-spacing: 0;
  color: var(--c-text-2);
}

.items {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--c-line);
}

.items__row {
  border-bottom: 1px solid var(--c-line);
}

.item {
  min-height: 56px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}

.item__box {
  width: 20px;
  height: 20px;
  margin: 0;
  flex-shrink: 0;
  accent-color: var(--c-fill-primary);
}

.item__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-grow: 1;
  min-width: 0;
}

.item__name {
  font-size: 16px;
}

.item--done .item__name {
  text-decoration: line-through;
  color: var(--c-text-2);
}

.item__qty {
  font-size: 12px;
  color: var(--c-text-2);
}

.item__price {
  flex-shrink: 0;
  font-size: 13px;
}
</style>
