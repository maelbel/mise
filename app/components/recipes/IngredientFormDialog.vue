<script setup lang="ts">
import type { Ingredient, Unit } from '#shared/types/domain'
import { SHELVES, UNITS } from '#shared/utils/constants'
import { shelfLabel, UNIT_NAMES, unitLabel } from '#shared/utils/labels'
import { PURCHASE_UNITS } from '#shared/utils/units'

/**
 * With an `ingredient`, the dialog edits it; without, it creates a new one.
 * `unitLocked`: the ingredient is used in a recipe or in stock, so its unit can't change.
 */
const props = defineProps<{ open: boolean, ingredient?: Ingredient | null, unitLocked?: boolean }>()
const emit = defineEmits<{ close: [] }>()

const ingredientsStore = useIngredientsStore()

const blank = () => ({ name: '', shelf: SHELVES[0] as string, unit: 'g' as Unit, price: '' })
const fromIngredient = (i: Ingredient) => ({ name: i.name, shelf: i.shelf, unit: i.unit, price: (i.priceCents / 100).toFixed(2).replace('.', ',') })
const form = reactive(blank())
const saving = ref(false)
const error = ref('')
const editing = computed(() => !!props.ingredient)

watch(() => props.open, (open) => {
  if (open) Object.assign(form, props.ingredient ? fromIngredient(props.ingredient) : blank())
}, { immediate: true })

const shelfOptions = computed(() => [...new Set([...SHELVES, ...ingredientsStore.shelves])])

function close(): void {
  Object.assign(form, blank())
  error.value = ''
  emit('close')
}

async function submit(): Promise<void> {
  const price = Number(String(form.price).replace(',', '.'))
  error.value = !form.name.trim() ? 'Donnez un nom à l’ingrédient.' : !(price >= 0) || form.price === '' ? 'Indiquez un prix.' : ''
  if (error.value) return
  saving.value = true
  try {
    const input = { name: form.name.trim(), shelf: form.shelf, unit: form.unit, priceCents: Math.round(price * 100) }
    if (props.ingredient) await ingredientsStore.update(props.ingredient.id, input)
    else await ingredientsStore.create(input)
    close()
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    const unitChanged = !!props.ingredient && form.unit !== props.ingredient.unit
    error.value = status === 409
      ? (unitChanged ? 'L’unité ne peut plus changer : cet ingrédient sert déjà dans une recette ou en réserve.' : 'Un ingrédient porte déjà ce nom.')
      : 'Enregistrement impossible. Réessayez.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDialog :open="open" :title="editing ? 'Modifier l’ingrédient' : 'Nouvel ingrédient'" @close="close">
    <form class="form" novalidate @submit.prevent="submit">
      <label class="field">Nom<input v-model="form.name" class="input" maxlength="80" placeholder="Ex. : pois chiches"></label>
      <label class="field">Rayon
        <select v-model="form.shelf" class="input">
          <option v-for="s in shelfOptions" :key="s" :value="s">{{ shelfLabel(s) }}</option>
        </select>
      </label>
      <div class="grid">
        <label class="field">Unité dans les recettes
          <select v-model="form.unit" class="input" :disabled="editing && unitLocked" :aria-describedby="editing && unitLocked ? 'unit-locked' : undefined">
            <option v-for="u in UNITS" :key="u" :value="u">{{ UNIT_NAMES[u] }}</option>
          </select>
        </label>
        <label class="field">Prix (€ / {{ PURCHASE_UNITS[form.unit].label }})
          <input v-model="form.price" class="input mono" inputmode="decimal" placeholder="0,00">
        </label>
      </div>
      <p v-if="editing && unitLocked" id="unit-locked" class="hint">L’unité est fixée : cet ingrédient sert dans une recette ou en réserve, dont les quantités sont comptées dans cette unité.</p>
      <p class="hint">Les recettes comptent en {{ unitLabel(form.unit, 2) }} ; le prix est par {{ PURCHASE_UNITS[form.unit].label }}, comme en rayon.</p>
      <p v-if="error" class="alert" role="alert">{{ error }}</p>
      <div class="form__actions">
        <button type="button" class="btn" @click="close">Annuler</button>
        <button type="submit" class="btn btn--primary" :disabled="saving">{{ editing ? 'Enregistrer les modifications' : 'Ajouter l’ingrédient' }}</button>
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.form__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
