<script setup lang="ts">
import type { Difficulty, Recipe } from '#shared/types/domain'
import { DIFFICULTIES } from '#shared/utils/constants'
import { DIET_LABELS, difficultyLabel, TAG_LABELS, unitLabel } from '#shared/utils/labels'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [], created: [recipe: Recipe] }>()

const recipesStore = useRecipesStore()
const ingredientsStore = useIngredientsStore()

interface Line {
  ingredientId: number | null
  quantity: number | null
}

function blank() {
  return {
    name: '',
    timeMin: 20,
    difficulty: 'Easy' as Difficulty,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    tags: [] as string[],
    diet: [] as string[],
    lines: [{ ingredientId: null, quantity: null }] as Line[],
  }
}

const form = reactive(blank())
const saving = ref(false)
const error = ref('')

function unitOf(ingredientId: number | null): string {
  const ingredient = ingredientId === null ? undefined : ingredientsStore.byId.get(ingredientId)
  return ingredient ? unitLabel(ingredient.unit, 2) : ''
}

function toggle(list: string[], value: string): void {
  const i = list.indexOf(value)
  if (i >= 0) list.splice(i, 1)
  else list.push(value)
}

function close(): void {
  Object.assign(form, blank())
  error.value = ''
  emit('close')
}

async function submit(): Promise<void> {
  const lines = form.lines.filter((l) => l.ingredientId !== null && l.quantity)
  if (!form.name.trim()) {
    error.value = 'Donnez un nom à la recette.'
    return
  }
  if (new Set(lines.map((l) => l.ingredientId)).size !== lines.length) {
    error.value = 'Chaque ingrédient ne peut apparaître qu’une fois.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const recipe = await recipesStore.create({
      name: form.name,
      timeMin: form.timeMin,
      difficulty: form.difficulty,
      kcal: form.kcal,
      protein: form.protein,
      carbs: form.carbs,
      fat: form.fat,
      tags: [...form.tags],
      diet: [...form.diet],
      ingredients: lines.map((l) => ({ ingredientId: l.ingredientId!, quantity: l.quantity! })),
    })
    emit('created', recipe)
    close()
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    error.value = status === 409 ? 'Une recette porte déjà ce nom.' : 'Enregistrement impossible. Vérifiez les champs et réessayez.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDialog :open="open" title="Nouvelle recette" @close="close">
    <form class="form" novalidate @submit.prevent="submit">
      <label class="field">Nom de la recette<input v-model.trim="form.name" class="input" maxlength="120" placeholder="Ex. : curry de pois chiches"></label>
      <div class="grid">
        <label class="field">Temps (min)<input v-model.number="form.timeMin" class="input mono" type="number" min="1" max="1440"></label>
        <label class="field">Difficulté
          <select v-model="form.difficulty" class="input">
            <option v-for="d in DIFFICULTIES" :key="d" :value="d">{{ difficultyLabel(d) }}</option>
          </select>
        </label>
      </div>
      <fieldset class="fieldset">
        <legend class="legend">Par portion</legend>
        <div class="grid grid--4">
          <label class="field">Calories (kcal)<input v-model.number="form.kcal" class="input mono" type="number" min="0"></label>
          <label class="field">Protéines (g)<input v-model.number="form.protein" class="input mono" type="number" min="0"></label>
          <label class="field">Glucides (g)<input v-model.number="form.carbs" class="input mono" type="number" min="0"></label>
          <label class="field">Lipides (g)<input v-model.number="form.fat" class="input mono" type="number" min="0"></label>
        </div>
      </fieldset>
      <fieldset class="fieldset">
        <legend class="legend">Régime</legend>
        <div class="chips">
          <button v-for="(label, code) in DIET_LABELS" :key="code" type="button" class="toggle" :aria-pressed="form.diet.includes(code)" @click="toggle(form.diet, code)">{{ label }}</button>
        </div>
      </fieldset>
      <fieldset class="fieldset">
        <legend class="legend">Étiquettes</legend>
        <div class="chips">
          <button v-for="(label, code) in TAG_LABELS" :key="code" type="button" class="toggle" :aria-pressed="form.tags.includes(code)" @click="toggle(form.tags, code)">{{ label }}</button>
        </div>
      </fieldset>
      <fieldset class="fieldset">
        <legend class="legend">Ingrédients pour une portion</legend>
        <div v-for="(line, i) in form.lines" :key="i" class="line">
          <label class="visually-hidden" :for="`line-ing-${i}`">Ingrédient {{ i + 1 }}</label>
          <select :id="`line-ing-${i}`" v-model="line.ingredientId" class="input">
            <option :value="null">Choisir un ingrédient</option>
            <option v-for="ing in ingredientsStore.ingredients" :key="ing.id" :value="ing.id">{{ ing.name }}</option>
          </select>
          <label class="visually-hidden" :for="`line-qty-${i}`">Quantité de l’ingrédient {{ i + 1 }}</label>
          <input :id="`line-qty-${i}`" v-model.number="line.quantity" class="input mono line__qty" type="number" min="0" step="any" placeholder="Qté">
          <span class="line__unit">{{ unitOf(line.ingredientId) }}</span>
          <button type="button" class="icon-btn" :aria-label="`Retirer l’ingrédient ${i + 1}`" @click="form.lines.splice(i, 1)">
            <AppIcon name="close" :size="16" />
          </button>
        </div>
        <button type="button" class="btn" @click="form.lines.push({ ingredientId: null, quantity: null })">
          <AppIcon name="plus" :size="16" />Ajouter un ingrédient
        </button>
      </fieldset>
      <p v-if="error" class="alert" role="alert">{{ error }}</p>
      <div class="form__actions">
        <button type="button" class="btn" @click="close">Annuler</button>
        <button type="submit" class="btn btn--primary" :disabled="saving">Enregistrer la recette</button>
      </div>
    </form>
  </AppDialog>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.grid--4 {
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
}

.fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend {
  padding: 0 0 8px;
  font-size: 15px;
  font-weight: 500;
}

.line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px auto 44px;
  gap: 8px;
  align-items: center;
}

.line__qty {
  padding: 0 8px;
}

.line__unit {
  min-width: 48px;
  font-size: 13px;
  color: var(--c-text-2);
}

.form__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
