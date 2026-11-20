<script setup lang="ts">
import type { Difficulty, Recipe } from '#shared/types/domain'
import { DIFFICULTIES } from '#shared/utils/constants'
import { DIET_LABELS, difficultyLabel, TAG_LABELS, unitLabel } from '#shared/utils/labels'

/** With a `recipe`, the dialog edits it; without, it creates a new one. */
const props = defineProps<{ open: boolean, recipe?: Recipe | null }>()
const emit = defineEmits<{ close: [], saved: [recipe: Recipe] }>()

const recipesStore = useRecipesStore()
const ingredientsStore = useIngredientsStore()

interface Line {
  /** Undefined until one is chosen. */
  ingredientId: number | undefined
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
    lines: [{ ingredientId: undefined, quantity: null }] as Line[],
  }
}

function fromRecipe(recipe: Recipe): ReturnType<typeof blank> {
  const { id: _id, ingredients, tags, diet, ...fields } = recipe
  return {
    ...fields,
    tags: [...tags],
    diet: [...diet],
    lines: ingredients.length ? ingredients.map((l) => ({ ...l })) : blank().lines,
  }
}

const form = reactive(blank())
const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.recipe)

watch(() => props.open, (open) => {
  if (open) Object.assign(form, props.recipe ? fromRecipe(props.recipe) : blank())
}, { immediate: true })

const difficultyItems = DIFFICULTIES.map((d) => ({ label: difficultyLabel(d), value: d }))
const ingredientItems = computed(() => ingredientsStore.ingredients.map((i) => ({ label: i.name, value: i.id })))
const nutrition = [
  { key: 'kcal', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protéines (g)' },
  { key: 'carbs', label: 'Glucides (g)' },
  { key: 'fat', label: 'Lipides (g)' },
] as const

function unitOf(ingredientId: number | undefined): string {
  const ingredient = ingredientId === undefined ? undefined : ingredientsStore.byId.get(ingredientId)
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
  const lines = form.lines.filter((l) => l.ingredientId !== undefined && l.quantity)
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
    const input = {
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
    }
    const recipe = props.recipe ? await recipesStore.update(props.recipe.id, input) : await recipesStore.create(input)
    emit('saved', recipe)
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
  <AppDialog :open="open" :title="editing ? 'Modifier la recette' : 'Nouvelle recette'" @close="close">
    <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
      <UFormField label="Nom de la recette">
        <UInput v-model.trim="form.name" class="w-full" maxlength="120" placeholder="Ex. : curry de pois chiches" />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Temps (min)">
          <UInput v-model.number="form.timeMin" class="w-full" :ui="{ base: 'font-mono' }" type="number" min="1" max="1440" />
        </UFormField>
        <UFormField label="Difficulté">
          <USelect v-model="form.difficulty" class="w-full" :items="difficultyItems" />
        </UFormField>
      </div>
      <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
        <legend class="pb-2 text-[15px] font-medium">Par portion</legend>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-4">
          <UFormField v-for="n in nutrition" :key="n.key" :label="n.label">
            <UInput v-model.number="form[n.key]" class="w-full" :ui="{ base: 'font-mono' }" type="number" min="0" />
          </UFormField>
        </div>
      </fieldset>
      <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
        <legend class="pb-2 text-[15px] font-medium">Régime</legend>
        <div class="flex flex-wrap gap-2">
          <AppToggle v-for="(label, code) in DIET_LABELS" :key="code" :pressed="form.diet.includes(code)" @click="toggle(form.diet, code)">{{ label }}</AppToggle>
        </div>
      </fieldset>
      <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
        <legend class="pb-2 text-[15px] font-medium">Étiquettes</legend>
        <div class="flex flex-wrap gap-2">
          <AppToggle v-for="(label, code) in TAG_LABELS" :key="code" :pressed="form.tags.includes(code)" @click="toggle(form.tags, code)">{{ label }}</AppToggle>
        </div>
      </fieldset>
      <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
        <legend class="pb-2 text-[15px] font-medium">Ingrédients pour une portion</legend>
        <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-[minmax(0,1fr)_88px_auto_44px] items-center gap-2">
          <USelect
            :id="`line-ing-${i}`"
            v-model="line.ingredientId"
            class="w-full"
            :items="ingredientItems"
            placeholder="Choisir un ingrédient"
            :aria-label="`Ingrédient ${i + 1}`"
          />
          <UInput
            :id="`line-qty-${i}`"
            v-model.number="line.quantity"
            :ui="{ base: 'px-2 font-mono' }"
            type="number"
            min="0"
            step="any"
            placeholder="Qté"
            :aria-label="`Quantité de l’ingrédient ${i + 1}`"
          />
          <span class="min-w-12 text-[13px] text-muted">{{ unitOf(line.ingredientId) }}</span>
          <UButton icon="i-mise-close" square :aria-label="`Retirer l’ingrédient ${i + 1}`" @click="form.lines.splice(i, 1)" />
        </div>
        <UButton icon="i-mise-plus" label="Ajouter un ingrédient" block @click="form.lines.push({ ingredientId: undefined, quantity: null })" />
      </fieldset>
      <UAlert v-if="error" color="error" role="alert" :title="error" />
      <div class="flex flex-wrap justify-end gap-2">
        <UButton label="Annuler" @click="close" />
        <UButton type="submit" variant="solid" :disabled="saving" :label="editing ? 'Enregistrer les modifications' : 'Enregistrer la recette'" />
      </div>
    </form>
  </AppDialog>
</template>
