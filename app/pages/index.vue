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
  <div class="page">
    <PageHeader :eyebrow="label" title="Au menu cette semaine" lead="Tout préparer avant de cuisiner." class="desktop-only">
      <WeekSwitcher />
    </PageHeader>
    <header class="mobile-head mobile-only">
      <div class="mobile-head__text">
        <p class="eyebrow">{{ range }}</p>
        <h1 class="page-title">Au menu</h1>
      </div>
      <WeekSwitcher />
    </header>

    <p v-if="error" class="alert" role="alert">
      Impossible de charger la semaine. Vérifiez que la base de données tourne, puis rechargez la page.
    </p>

    <template v-else-if="selected">
      <div class="desktop-only intro">
        <WeekStats :totals="weekTotals" :target="profileStore.targets" />
        <p v-if="!profileStore.targets" class="hint">
          <NuxtLink to="/profile">Renseignez votre profil</NuxtLink> pour comparer vos journées à vos propres objectifs de calories et de protéines.
        </p>
      </div>

      <div class="layout">
        <div class="layout__main">
          <WeekBoard
            class="desktop-only"
            :days="days"
            :selected-day="selectedDay"
            :editing="editing"
            @select-day="selectedDay = $event"
            @edit="edit"
          />

          <div class="mobile-only mobile-stack">
            <DayPicker :days="days" :selected-day="selectedDay" @select="selectedDay = $event" />
            <DayTotalsCard :day="selected" :target="profileStore.targets" />
            <NuxtLink v-if="chefStore.tip" to="/chef" class="tip">
              <span class="eyebrow tip__label">Chef</span>
              <span class="tip__text">{{ chefStore.tip.label }} : {{ plural(chefStore.tip.changes.length, 'changement') }} proposés</span>
              <AppIcon name="chevronRight" :size="16" />
            </NuxtLink>
            <DayMealList :day="selected" @edit="edit" />
          </div>
        </div>

        <aside class="layout__side">
          <div v-if="planStore.lastChange" role="status" class="notice undo-bar">
            <span>{{ planStore.lastChange.note }}</span>
            <button type="button" class="btn" :disabled="undoing" @click="undo">Annuler</button>
          </div>

          <div v-if="editing" class="editor-wrap">
            <button type="button" class="editor-backdrop" aria-label="Fermer" @click="editing = null" />
            <MealEditor :key="`${editing.day}-${editing.slot}`" :day="editing.day" :slot="editing.slot" class="editor-sheet" @close="editing = null" />
          </div>

          <DayTotalsCard class="desktop-only" :day="selected" :target="profileStore.targets" />
          <ChefPanel class="desktop-only" />
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-head {
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.mobile-head__text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-stack {
  flex-direction: column;
  gap: 16px;
}

.tip {
  min-height: 44px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text);
  text-decoration: none;
}

.tip:hover {
  color: var(--c-text);
}

.tip__label {
  flex-shrink: 0;
}

.tip__text {
  flex-grow: 1;
  font-size: 14px;
  line-height: 1.4;
}

.undo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.editor-backdrop {
  display: none;
}

@media (max-width: 899px) {
  .layout__side {
    display: contents;
  }

  .undo-bar {
    order: -1;
  }

  /* On phones the editor is a bottom sheet over the page. */
  .editor-wrap {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .editor-backdrop {
    display: block;
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(14, 15, 17, 0.5);
    cursor: pointer;
  }

  .editor-sheet {
    position: relative;
    max-height: 92vh;
    overflow-y: auto;
  }
}
</style>
