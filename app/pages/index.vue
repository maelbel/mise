<script setup lang="ts">
import type { MealSlot } from '#shared/types/domain'
import { formatWeekRange } from '#shared/utils/week'

useHead({ title: 'Semaine · Mise' })

const { week, label } = useWeek()
const planStore = usePlanStore()
const recipesStore = useRecipesStore()
const chefStore = useChefStore()
const profileStore = useProfileStore()
const { days, weekTotals } = useWeekSummary()

const { error } = await useAsyncData(
  'week-page',
  async () => {
    await Promise.all([planStore.load(week.value), recipesStore.load(), chefStore.load(week.value), profileStore.load()])
    return true
  },
  { watch: [week] },
)

// Chef's suggestions depend on the plan: refresh them after every change.
watch(
  () => planStore.plan?.slots,
  async (slots, previous) => {
    if (previous && slots && planStore.plan) await chefStore.load(planStore.plan.weekStart).catch(() => {})
  },
)

const selectedDay = ref(0)
const editing = ref<{ day: number, slot: MealSlot } | null>(null)
const selected = computed(() => days.value[selectedDay.value])
const undoing = ref(false)
const range = computed(() => formatWeekRange(week.value))

function edit(day: number, slot: MealSlot): void {
  selectedDay.value = day
  editing.value = { day, slot }
}

async function undo(): Promise<void> {
  undoing.value = true
  try {
    await planStore.undo()
  } finally {
    undoing.value = false
  }
}

watch(week, () => {
  editing.value = null
})
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-10">
    <PageHeader :eyebrow="label" title="Au menu cette semaine" lead="Tout préparer avant de cuisiner." class="max-md:hidden">
      <WeekSwitcher />
    </PageHeader>
    <header class="flex items-end justify-between gap-4 md:hidden">
      <div class="flex flex-col gap-2">
        <AppEyebrow>{{ range }}</AppEyebrow>
        <h1 class="text-[clamp(32px,5vw,48px)] font-medium leading-[1.1] tracking-[-0.01em]">Au menu</h1>
      </div>
      <WeekSwitcher />
    </header>

    <UAlert
      v-if="error"
      color="error"
      role="alert"
      title="Impossible de charger la semaine. Vérifiez que la base de données tourne, puis rechargez la page."
    />

    <template v-else-if="selected">
      <div class="flex flex-col gap-4 max-md:hidden">
        <WeekStats :totals="weekTotals" :target="profileStore.targets" />
        <p v-if="!profileStore.targets" class="text-sm text-muted">
          <AppLink to="/profile">Renseignez votre profil</AppLink> pour comparer vos journées à vos propres objectifs de calories et de protéines.
        </p>
      </div>

      <div class="flex flex-wrap items-start gap-10">
        <div class="min-w-0 flex-[999_1_600px]">
          <WeekBoard
            class="max-md:hidden"
            :days="days"
            :selected-day="selectedDay"
            :editing="editing"
            @select-day="selectedDay = $event"
            @edit="edit"
          />

          <div class="flex flex-col gap-4 md:hidden">
            <DayPicker :days="days" :selected-day="selectedDay" @select="selectedDay = $event" />
            <DayTotalsCard :day="selected" :target="profileStore.targets" />
            <ULink v-if="chefStore.tip" to="/chef" raw class="flex min-h-11 items-center gap-2 py-2 text-default">
              <AppEyebrow as="span" class="shrink-0">Chef</AppEyebrow>
              <span class="grow text-sm leading-[1.4]">{{ chefStore.tip.label }} : {{ plural(chefStore.tip.changes.length, 'changement') }} proposés</span>
              <UIcon name="i-mise-chevron-right" class="size-4 shrink-0" />
            </ULink>
            <DayMealList :day="selected" @edit="edit" />
          </div>
        </div>

        <aside class="flex min-w-0 flex-[1_1_340px] flex-col gap-6 max-md:contents">
          <UAlert v-if="planStore.lastChange" role="status" orientation="horizontal" :title="planStore.lastChange.note" class="max-md:order-first">
            <template #actions>
              <UButton label="Annuler" :disabled="undoing" @click="undo" />
            </template>
          </UAlert>

          <!-- On phones the editor is a sheet over the page. -->
          <div v-if="editing" class="max-md:fixed max-md:inset-0 max-md:z-30 max-md:flex max-md:flex-col max-md:justify-end">
            <button type="button" class="absolute inset-0 hidden cursor-pointer bg-limestone-950/50 max-md:block" aria-label="Fermer" @click="editing = null" />
            <MealEditor
              :key="`${editing.day}-${editing.slot}`"
              :day="editing.day"
              :slot="editing.slot"
              class="relative max-md:max-h-[92vh] max-md:overflow-y-auto"
              @close="editing = null"
            />
          </div>

          <DayTotalsCard class="max-md:hidden" :day="selected" :target="profileStore.targets" />
          <ChefPanel class="max-md:hidden" />
        </aside>
      </div>
    </template>
  </div>
</template>
