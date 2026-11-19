<script setup lang="ts">
import type { Suggestion } from '#shared/types/domain'
import { DAY_NAMES, MEAL_SLOT_LABELS } from '#shared/utils/constants'

const props = defineProps<{ suggestion: Suggestion, applied?: boolean, busy?: boolean, dismissible?: boolean }>()
const emit = defineEmits<{ apply: [], undo: [], dismiss: [] }>()

const recipesStore = useRecipesStore()

const changes = computed(() =>
  props.suggestion.changes.map((c) => ({
    key: `${c.day}-${c.slot}`,
    where: `${DAY_NAMES[c.day]} · ${MEAL_SLOT_LABELS[c.slot]}`,
    from: recipesStore.byId.get(c.fromRecipeId)?.name ?? 'Recette inconnue',
    to: recipesStore.byId.get(c.toRecipeId)?.name ?? 'Recette inconnue',
  })),
)
</script>

<template>
  <div class="suggestion">
    <p class="suggestion__text">{{ suggestion.text }}</p>
    <template v-if="changes.length">
      <ul class="changes">
        <li v-for="c in changes" :key="c.key" class="change">
          <span class="change__where mono">{{ c.where }}</span>
          <span class="change__swap"><s>{{ c.from }}</s> → <strong>{{ c.to }}</strong></span>
        </li>
      </ul>
      <p class="deltas mono">{{ formatSigned(suggestion.deltaProtein) }} g de protéines · {{ formatSigned(suggestion.deltaKcal) }} kcal sur la semaine</p>
      <div class="actions">
        <button v-if="applied" type="button" class="btn actions__main" :disabled="busy" @click="emit('undo')">
          <AppIcon name="check" :size="16" />Ajouté à votre semaine · Annuler
        </button>
        <button v-else type="button" class="btn btn--primary actions__main" :disabled="busy" @click="emit('apply')">
          Appliquer {{ plural(changes.length, 'changement') }}
        </button>
        <button v-if="dismissible" type="button" class="btn" @click="emit('dismiss')">Ignorer</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.suggestion {
  background: var(--c-surface);
  border-radius: var(--radius);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestion__text {
  font-size: 16px;
  line-height: 1.6;
}

.changes {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--c-line);
}

.change {
  padding: 8px 0;
  border-bottom: 1px solid var(--c-line);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.change__where {
  font-size: 12px;
  color: var(--c-text-2);
}

.change__swap {
  font-size: 15px;
}

.change__swap s {
  color: var(--c-text-2);
}

.change__swap strong {
  font-weight: 500;
}

.deltas {
  font-size: 14px;
  color: var(--c-text-2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actions__main {
  flex-grow: 1;
}

@media (max-width: 899px) {
  .suggestion {
    padding: 16px;
  }
}
</style>
