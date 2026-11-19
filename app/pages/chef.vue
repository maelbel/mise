<script setup lang="ts">
import type { SuggestionId } from '#shared/types/domain'
import { MEAL_SLOTS } from '#shared/utils/constants'

useHead({ title: 'Chef · Mise' })

const { week, label } = useWeek()
const planStore = usePlanStore()
const recipesStore = useRecipesStore()
const chefStore = useChefStore()
const profileStore = useProfileStore()
const { days, weekTotals } = useWeekSummary()

const { error } = await useAsyncData(
  'chef-page',
  async () => {
    await Promise.all([planStore.load(week.value), recipesStore.load(), chefStore.load(week.value), profileStore.load()])
    return true
  },
  { watch: [week] },
)

const selectedId = ref<SuggestionId | null>('protein')
const busy = ref(false)
const actionError = ref('')

const selected = computed(() => (selectedId.value ? chefStore.byId(selectedId.value) ?? null : null))

function impact(id: SuggestionId): string {
  const s = chefStore.byId(id)
  if (!s) return ''
  if (id === 'stock') return 'Selon votre réserve'
  if (!s.changes.length) return 'Rien à changer'
  return `${formatSigned(s.deltaProtein)} g prot. · ${formatSigned(s.deltaKcal)} kcal`
}

/** Week totals now and with the selected suggestion. */
const totals = computed(() => {
  const s = selected.value
  return {
    protein: weekTotals.value.protein,
    kcal: weekTotals.value.kcal,
    proteinAfter: weekTotals.value.protein + (s?.deltaProtein ?? 0),
    kcalAfter: weekTotals.value.kcal + (s?.deltaKcal ?? 0),
  }
})

/** The week, with the meals the selected suggestion would change. */
const preview = computed(() => {
  const changes = new Map((selected.value?.changes ?? []).map((c) => [`${c.day}:${c.slot}`, c.toRecipeId]))
  return days.value.map((d) => ({
    day: d.day,
    short: d.short,
    cells: MEAL_SLOTS.map((slot) => {
      const meal = d.meals.find((m) => m.slot === slot)!
      const to = changes.get(`${d.day}:${slot}`)
      return { slot, name: meal.recipe?.name ?? '—', to: to === undefined ? null : recipesStore.byId.get(to)?.name ?? null }
    }),
  }))
})

async function apply(): Promise<void> {
  const s = selected.value
  if (!s) return
  busy.value = true
  actionError.value = ''
  try {
    await planStore.applyChanges(s.changes, `Chef a appliqué ${plural(s.changes.length, 'changement')} à votre semaine.`)
    selectedId.value = null
    await chefStore.load(week.value)
  } catch {
    actionError.value = 'Impossible de modifier votre semaine. Réessayez.'
  } finally {
    busy.value = false
  }
}

async function undo(): Promise<void> {
  busy.value = true
  try {
    await planStore.undo()
    await chefStore.load(week.value)
  } finally {
    busy.value = false
  }
}

watch(week, () => {
  selectedId.value = 'protein'
})
</script>

<template>
  <div class="page">
    <PageHeader :eyebrow="label" title="Des idées tirées de vos recettes" lead="Chef compare votre semaine à vos objectifs et propose des échanges. Rien ne change sans votre accord.">
      <WeekSwitcher />
    </PageHeader>

    <p v-if="error" class="alert" role="alert">Impossible de charger les suggestions de Chef. Vérifiez que la base de données tourne.</p>

    <template v-else>
      <p v-if="profileStore.targets" class="hint">
        Objectifs du jour d’après <NuxtLink to="/profile">votre profil</NuxtLink> :
        <span class="mono targets">{{ formatNumber(profileStore.targets.kcal) }} kcal · {{ profileStore.targets.protein }} g de protéines</span>.
        Chef respecte aussi votre régime, vos aliments à éviter et votre temps de cuisine en semaine.
      </p>
      <p v-else class="hint"><NuxtLink to="/profile">Renseignez votre profil</NuxtLink> et Chef visera vos propres objectifs.</p>

      <dl class="stat-row">
        <div><dt>Protéines de la semaine</dt><dd>{{ formatNumber(totals.protein) }} <small>{{ profileStore.targets ? `/ ${formatNumber(profileStore.targets.protein * 7)} g` : 'g' }}</small></dd></div>
        <div><dt>Avec la suggestion</dt><dd>{{ formatNumber(totals.proteinAfter) }} <small>g</small></dd></div>
        <div><dt>Calories de la semaine</dt><dd>{{ formatNumber(totals.kcal) }} <small>{{ profileStore.targets ? `/ ${formatNumber(profileStore.targets.kcal * 7)} kcal` : 'kcal' }}</small></dd></div>
        <div><dt>Avec la suggestion</dt><dd>{{ formatNumber(totals.kcalAfter) }} <small>kcal</small></dd></div>
      </dl>

      <div class="layout">
        <section class="questions" aria-labelledby="chef-ask">
          <h2 id="chef-ask" class="section-title">Demander à Chef</h2>
          <button
            v-for="s in chefStore.suggestions"
            :key="s.id"
            type="button"
            class="question"
            :aria-pressed="selectedId === s.id"
            @click="selectedId = selectedId === s.id ? null : s.id"
          >
            <span class="question__text">{{ s.question }}</span>
            <span class="question__impact mono">{{ impact(s.id) }}</span>
          </button>
        </section>

        <div class="answer">
          <div v-if="planStore.lastChange" role="status" class="notice undo-bar">
            <span>{{ planStore.lastChange.note }}</span>
            <button type="button" class="btn" :disabled="busy" @click="undo">Annuler</button>
          </div>

          <section v-if="selected" class="panel" aria-labelledby="chef-answer">
            <div class="panel__head">
              <p class="eyebrow">{{ selected.label }}</p>
              <h2 id="chef-answer" class="panel__title">{{ selected.question }}</h2>
            </div>
            <SuggestionView :suggestion="selected" :busy="busy" dismissible @apply="apply" @dismiss="selectedId = null" />
            <NuxtLink v-if="selected.id === 'stock'" to="/shopping" class="btn btn--primary panel__link">Voir la liste de courses</NuxtLink>
          </section>
          <p v-if="actionError" class="alert" role="alert">{{ actionError }}</p>

          <section class="preview desktop-only" aria-labelledby="chef-week">
            <div class="preview__head">
              <h2 id="chef-week" class="section-title">Aperçu de la semaine</h2>
              <p class="hint">Les repas encadrés changent si vous appliquez.</p>
            </div>
            <div class="preview__scroll">
              <div class="preview__grid">
                <div v-for="d in preview" :key="d.day" class="preview__day">
                  <span class="mono preview__name">{{ d.short }}</span>
                  <div v-for="c in d.cells" :key="c.slot" class="cell" :class="{ 'cell--changed': c.to }">
                    <template v-if="c.to">
                      <s class="muted">{{ c.name }}</s>
                      <span class="cell__to">→ {{ c.to }}</span>
                    </template>
                    <span v-else>{{ c.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.targets {
  color: var(--c-text);
}

.questions {
  flex: 1 1 340px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question {
  width: 100%;
  padding: 16px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  background: var(--c-bg);
  color: var(--c-text);
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.question[aria-pressed='true'] {
  background: var(--c-surface);
  border-color: var(--c-text);
}

.question__text {
  font-size: 17px;
  font-weight: 500;
}

.question__impact {
  font-size: 12px;
  color: var(--c-text-2);
}

.answer {
  flex: 999 1 600px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.undo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel__title {
  font-size: 24px;
  font-weight: 500;
  line-height: 1.3;
}

.panel__link {
  align-self: flex-start;
}

.preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 16px;
}

.preview__scroll {
  overflow-x: auto;
}

.preview__grid {
  min-width: 760px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.preview__day {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview__name {
  font-size: 12px;
  color: var(--c-text-2);
}

.cell {
  min-height: 72px;
  padding: 8px;
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  line-height: 1.3;
}

.cell--changed {
  background: var(--c-surface);
  border-color: var(--c-text);
}

.cell__to {
  font-weight: 500;
}

</style>
