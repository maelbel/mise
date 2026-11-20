<script setup lang="ts">
import type { SuggestionId } from '#shared/types/domain'

const chefStore = useChefStore()
const planStore = usePlanStore()

const PLAN_SUGGESTIONS: SuggestionId[] = ['protein', 'lighter', 'variety']
const selected = ref<SuggestionId | null>(null)
const busy = ref(false)
const error = ref('')

const chips = computed(() => PLAN_SUGGESTIONS.map((id) => chefStore.byId(id)).filter((s) => s !== undefined))
const suggestion = computed(() => (selected.value ? chefStore.byId(selected.value) ?? null : null))

function toggle(id: SuggestionId): void {
  selected.value = selected.value === id ? null : id
}

async function apply(): Promise<void> {
  const s = suggestion.value
  if (!s) return
  busy.value = true
  error.value = ''
  try {
    await planStore.applyChanges(s.changes, `Chef a appliqué ${plural(s.changes.length, 'changement')}`)
    selected.value = null
  } catch {
    error.value = 'Impossible d’appliquer les changements. Réessayez.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="flex flex-col gap-4 border-t border-default pt-6" aria-labelledby="chef-panel-title">
    <div class="flex flex-col gap-2">
      <AppEyebrow>Chef</AppEyebrow>
      <h2 id="chef-panel-title" class="text-xl font-medium leading-[1.3]">Des idées tirées de vos recettes</h2>
    </div>
    <div role="group" aria-label="Suggestions" class="flex flex-wrap gap-2">
      <AppToggle v-for="s in chips" :key="s.id" :pressed="selected === s.id" @click="toggle(s.id)">{{ s.label }}</AppToggle>
    </div>
    <SuggestionView
      v-if="suggestion"
      :suggestion="suggestion"
      :busy="busy"
      dismissible
      @apply="apply"
      @dismiss="selected = null"
    />
    <UAlert v-if="error" color="error" role="alert" :title="error" />
    <AppLink to="/chef" class="inline-flex min-h-11 items-center self-start text-[15px]">Ouvrir la page Chef</AppLink>
  </section>
</template>
