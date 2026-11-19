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
</script>

<template>
  <section class="editor" aria-labelledby="meal-editor-title">
    <div class="editor__head">
      <div class="editor__titles">
        <p class="eyebrow">{{ DAY_NAMES[day] }} · {{ MEAL_SLOT_LABELS[slot] }}</p>
        <h2 id="meal-editor-title" class="section-title">Changer ce repas</h2>
      </div>
      <button type="button" class="icon-btn" aria-label="Fermer" @click="emit('close')">
        <AppIcon name="close" :size="16" />
      </button>
    </div>

    <div role="radiogroup" aria-label="Recette" class="options">
      <button
        v-for="recipe in recipesStore.recipes"
        :key="recipe.id"
        type="button"
        role="radio"
        class="option"
        :aria-checked="current?.recipeId === recipe.id"
        :disabled="saving"
        @click="choose(recipe.id)"
      >
        <span class="option__text">
          <span class="option__name">{{ recipe.name }}</span>
          <span class="option__meta mono">{{ formatNumber(recipe.kcal) }} kcal · {{ recipe.protein }} g prot. · {{ recipe.timeMin }} min</span>
        </span>
        <AppIcon v-if="current?.recipeId === recipe.id" name="check" :size="18" />
      </button>
      <button
        type="button"
        role="radio"
        class="option"
        :aria-checked="current?.recipeId === null"
        :disabled="saving"
        @click="choose(null)"
      >
        <span class="option__name option__name--empty">Pas de repas prévu</span>
        <AppIcon v-if="current?.recipeId === null" name="check" :size="18" />
      </button>
    </div>

    <div class="portions">
      <div class="portions__text">
        <span class="portions__label">Portions</span>
        <span class="hint">Cuisiner plus pour les restes</span>
      </div>
      <div class="stepper">
        <button type="button" class="icon-btn" aria-label="Une portion de moins" :disabled="saving || portions <= MIN_PORTIONS" @click="changePortions(-1)">
          <AppIcon name="minus" :size="16" />
        </button>
        <span class="stepper__value mono" aria-live="polite">{{ portions }}</span>
        <button type="button" class="icon-btn icon-btn--primary" aria-label="Une portion de plus" :disabled="saving || portions >= MAX_PORTIONS" @click="changePortions(1)">
          <AppIcon name="plus" :size="16" />
        </button>
      </div>
    </div>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>
    <button type="button" class="btn btn--primary editor__done" @click="emit('close')">Terminé</button>
  </section>
</template>

<style scoped>
.editor {
  background: var(--c-surface);
  border-radius: var(--radius);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.editor__titles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.options {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--c-line);
  max-height: 360px;
  overflow-y: auto;
}

.option {
  width: 100%;
  min-height: 56px;
  padding: 8px;
  border: 0;
  border-bottom: 1px solid var(--c-line);
  border-radius: 0;
  background: transparent;
  color: var(--c-text);
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.option[aria-checked='true'] {
  background: var(--c-bg);
}

.option__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-grow: 1;
}

.option__name {
  font-size: 15px;
  font-weight: 500;
  flex-grow: 1;
}

.option__name--empty {
  font-weight: 400;
  color: var(--c-text-2);
}

.option__meta {
  font-size: 12px;
  color: var(--c-text-2);
}

.portions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.portions__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.portions__label {
  font-size: 15px;
  font-weight: 500;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stepper__value {
  min-width: 24px;
  text-align: center;
  font-size: 18px;
}

.editor__done {
  min-height: 48px;
}

@media (max-width: 899px) {
  .editor {
    border-radius: 0;
    border-top: 2px solid var(--c-fill-primary);
    background: var(--c-bg);
    padding: 24px 16px;
  }

  .option[aria-checked='true'] {
    background: var(--c-surface);
  }
}
</style>
