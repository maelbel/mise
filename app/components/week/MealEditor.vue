<script setup lang="ts">
import type { MealSlot } from '#shared/types/domain'
import { DAY_NAMES, MAX_PORTIONS, MEAL_SLOT_LABELS, MIN_PORTIONS } from '#shared/utils/constants'

const props = defineProps<{ day: number, slot: MealSlot }>()
const emit = defineEmits<{ close: [] }>()

const planStore = usePlanStore()
const recipesStore = useRecipesStore()

const current = computed(() => planStore.slotAt(props.day, props.slot))
const portions = computed(() => current.value?.portions ?? 1)
const saving = ref(false)
const error = ref('')

async function run(action: () => Promise<void>): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    await action()
  } catch {
    error.value = 'Enregistrement impossible. Vérifiez que le serveur tourne et réessayez.'
  } finally {
    saving.value = false
  }
}

const choose = (recipeId: number | null) => run(() => planStore.setRecipe(props.day, props.slot, recipeId))
const changePortions = (delta: number) => {
  const value = Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, portions.value + delta))
  if (value !== portions.value) void run(() => planStore.setPortions(props.day, props.slot, value))
}

const OPTION = 'min-h-14 w-full gap-2 rounded-none border-b border-default p-2 text-left text-default hover:bg-transparent'
const CHECKED = 'bg-default hover:bg-default max-md:bg-muted max-md:hover:bg-muted'
</script>

<template>
  <section
    class="flex flex-col gap-4 rounded-sm bg-muted p-6 max-md:rounded-none max-md:border-t-2 max-md:border-inverted max-md:bg-default max-md:px-4"
    aria-labelledby="meal-editor-title"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex flex-col gap-2">
        <AppEyebrow>{{ DAY_NAMES[day] }} · {{ MEAL_SLOT_LABELS[slot] }}</AppEyebrow>
        <h2 id="meal-editor-title" class="text-xl font-medium leading-[1.3]">Changer ce repas</h2>
      </div>
      <UButton icon="i-mise-close" square aria-label="Fermer" @click="emit('close')" />
    </div>

    <div role="radiogroup" aria-label="Recette" class="flex max-h-[360px] flex-col overflow-y-auto border-t border-default">
      <UButton
        v-for="recipe in recipesStore.recipes"
        :key="recipe.id"
        variant="ghost"
        role="radio"
        :class="[OPTION, current?.recipeId === recipe.id && CHECKED]"
        :aria-checked="current?.recipeId === recipe.id"
        :disabled="saving"
        @click="choose(recipe.id)"
      >
        <span class="flex grow flex-col gap-1">
          <span class="text-[15px] font-medium">{{ recipe.name }}</span>
          <span class="font-mono text-xs text-muted">{{ formatNumber(recipe.kcal) }} kcal · {{ recipe.protein }} g prot. · {{ recipe.timeMin }} min</span>
        </span>
        <UIcon v-if="current?.recipeId === recipe.id" name="i-mise-check" class="size-[18px] shrink-0" />
      </UButton>
      <UButton
        variant="ghost"
        role="radio"
        :class="[OPTION, current?.recipeId === null && CHECKED]"
        :aria-checked="current?.recipeId === null"
        :disabled="saving"
        @click="choose(null)"
      >
        <span class="grow text-[15px] text-muted">Pas de repas prévu</span>
        <UIcon v-if="current?.recipeId === null" name="i-mise-check" class="size-[18px] shrink-0" />
      </UButton>
    </div>

    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-[15px] font-medium">Portions</span>
        <span class="text-sm text-muted">Cuisiner plus pour les restes</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton icon="i-mise-minus" square aria-label="Une portion de moins" :disabled="saving || portions <= MIN_PORTIONS" @click="changePortions(-1)" />
        <span class="min-w-6 text-center font-mono text-lg" aria-live="polite">{{ portions }}</span>
        <UButton icon="i-mise-plus" square variant="solid" aria-label="Une portion de plus" :disabled="saving || portions >= MAX_PORTIONS" @click="changePortions(1)" />
      </div>
    </div>

    <UAlert v-if="error" color="error" role="alert" :title="error" />
    <UButton variant="solid" block label="Terminé" class="min-h-12" @click="emit('close')" />
  </section>
</template>
