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
  <section class="chef" aria-labelledby="chef-panel-title">
    <div class="chef__head">
      <p class="eyebrow">Chef</p>
      <h2 id="chef-panel-title" class="section-title">Des idées tirées de vos recettes</h2>
    </div>
    <div role="group" aria-label="Suggestions" class="chips">
      <button
        v-for="s in chips"
        :key="s.id"
        type="button"
        class="toggle"
        :aria-pressed="selected === s.id"
        @click="toggle(s.id)"
      >
        {{ s.label }}
      </button>
    </div>
    <SuggestionView
      v-if="suggestion"
      :suggestion="suggestion"
      :busy="busy"
      dismissible
      @apply="apply"
      @dismiss="selected = null"
    />
    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <NuxtLink to="/chef" class="chef__more">Ouvrir la page Chef</NuxtLink>
  </section>
</template>

<style scoped>
.chef {
  padding-top: 24px;
  border-top: 1px solid var(--c-line);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chef__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chef__more {
  align-self: flex-start;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  font-size: 15px;
}
</style>
