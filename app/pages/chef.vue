<script setup lang="ts">
import type { SuggestionId } from '#shared/types/domain'
import type { Stat } from '~/components/common/AppStatRow.vue'
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

const stats = computed<Stat[]>(() => {
  const t = profileStore.targets
  return [
    { label: 'Protéines de la semaine', value: formatNumber(totals.value.protein), unit: t ? `/ ${formatNumber(t.protein * 7)} g` : 'g' },
    { label: 'Avec la suggestion', value: formatNumber(totals.value.proteinAfter), unit: 'g' },
    { label: 'Calories de la semaine', value: formatNumber(totals.value.kcal), unit: t ? `/ ${formatNumber(t.kcal * 7)} kcal` : 'kcal' },
    { label: 'Avec la suggestion', value: formatNumber(totals.value.kcalAfter), unit: 'kcal' },
  ]
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
  <div class="flex flex-col gap-6 md:gap-10">
    <PageHeader :eyebrow="label" title="Des idées tirées de vos recettes" lead="Chef compare votre semaine à vos objectifs et propose des échanges. Rien ne change sans votre accord.">
      <WeekSwitcher />
    </PageHeader>

    <UAlert v-if="error" color="error" role="alert" title="Impossible de charger les suggestions de Chef. Vérifiez que la base de données tourne." />

    <template v-else>
      <p v-if="profileStore.targets" class="text-sm text-muted">
        Objectifs du jour d’après <AppLink to="/profile">votre profil</AppLink> :
        <span class="font-mono text-default">{{ formatNumber(profileStore.targets.kcal) }} kcal · {{ profileStore.targets.protein }} g de protéines</span>.
        Chef respecte aussi votre régime, vos aliments à éviter et votre temps de cuisine en semaine.
      </p>
      <p v-else class="text-sm text-muted"><AppLink to="/profile">Renseignez votre profil</AppLink> et Chef visera vos propres objectifs.</p>

      <AppStatRow :stats="stats" />

      <div class="flex flex-wrap items-start gap-10">
        <section class="flex min-w-0 flex-[1_1_340px] flex-col gap-4" aria-labelledby="chef-ask">
          <h2 id="chef-ask" class="text-xl font-medium leading-[1.3]">Demander à Chef</h2>
          <UButton
            v-for="s in chefStore.suggestions"
            :key="s.id"
            block
            class="flex-col items-stretch gap-2 border border-default p-4 text-left ring-0 hover:bg-default"
            :class="{ 'border-inverted bg-muted hover:bg-muted': selectedId === s.id }"
            :aria-pressed="selectedId === s.id"
            @click="selectedId = selectedId === s.id ? null : s.id"
          >
            <span class="text-[17px] font-medium">{{ s.question }}</span>
            <span class="font-mono text-xs text-muted">{{ impact(s.id) }}</span>
          </UButton>
        </section>

        <div class="flex min-w-0 flex-[999_1_600px] flex-col gap-6">
          <UAlert v-if="planStore.lastChange" role="status" orientation="horizontal" :title="planStore.lastChange.note">
            <template #actions>
              <UButton label="Annuler" :disabled="busy" @click="undo" />
            </template>
          </UAlert>

          <section v-if="selected" class="flex flex-col gap-4" aria-labelledby="chef-answer">
            <div class="flex flex-col gap-2">
              <AppEyebrow>{{ selected.label }}</AppEyebrow>
              <h2 id="chef-answer" class="text-2xl font-medium leading-[1.3]">{{ selected.question }}</h2>
            </div>
            <SuggestionView :suggestion="selected" :busy="busy" dismissible @apply="apply" @dismiss="selectedId = null" />
            <UButton v-if="selected.id === 'stock'" to="/shopping" variant="solid" label="Voir la liste de courses" class="self-start" />
          </section>
          <UAlert v-if="actionError" color="error" role="alert" :title="actionError" />

          <section class="flex flex-col gap-4 max-md:hidden" aria-labelledby="chef-week">
            <div class="flex flex-wrap items-baseline justify-between gap-4">
              <h2 id="chef-week" class="text-xl font-medium leading-[1.3]">Aperçu de la semaine</h2>
              <p class="text-sm text-muted">Les repas encadrés changent si vous appliquez.</p>
            </div>
            <div class="overflow-x-auto">
              <div class="grid min-w-[760px] grid-cols-7 gap-2">
                <div v-for="d in preview" :key="d.day" class="flex flex-col gap-2">
                  <span class="font-mono text-xs text-muted">{{ d.short }}</span>
                  <div
                    v-for="c in d.cells"
                    :key="c.slot"
                    class="flex min-h-18 flex-col gap-1 rounded-sm border p-2 text-[13px] leading-[1.3]"
                    :class="c.to ? 'border-inverted bg-muted' : 'border-default'"
                  >
                    <template v-if="c.to">
                      <s class="text-muted">{{ c.name }}</s>
                      <span class="font-medium">→ {{ c.to }}</span>
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
