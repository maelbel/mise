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
  <div class="flex flex-col gap-4 rounded-sm bg-muted p-4 md:p-6">
    <p class="text-base leading-[1.6]">{{ suggestion.text }}</p>
    <template v-if="changes.length">
      <ul class="m-0 list-none border-t border-default p-0">
        <li v-for="c in changes" :key="c.key" class="flex flex-col gap-1 border-b border-default py-2">
          <span class="font-mono text-xs text-muted">{{ c.where }}</span>
          <span class="text-[15px]"><s class="text-muted">{{ c.from }}</s> → <strong class="font-medium">{{ c.to }}</strong></span>
        </li>
      </ul>
      <p class="font-mono text-sm text-muted">{{ formatSigned(suggestion.deltaProtein) }} g de protéines · {{ formatSigned(suggestion.deltaKcal) }} kcal sur la semaine</p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="applied"
          icon="i-mise-check"
          label="Ajouté à votre semaine · Annuler"
          class="grow justify-center"
          :disabled="busy"
          @click="emit('undo')"
        />
        <UButton
          v-else
          variant="solid"
          :label="`Appliquer ${plural(changes.length, 'changement')}`"
          class="grow justify-center"
          :disabled="busy"
          @click="emit('apply')"
        />
        <UButton v-if="dismissible" label="Ignorer" @click="emit('dismiss')" />
      </div>
    </template>
  </div>
</template>
