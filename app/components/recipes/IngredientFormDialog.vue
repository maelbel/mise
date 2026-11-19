<script setup lang="ts">
import type { Unit } from '#shared/types/domain'
import { SHELVES, UNITS } from '#shared/utils/constants'
import { shelfLabel, UNIT_NAMES, unitLabel } from '#shared/utils/labels'
import { PURCHASE_UNITS } from '#shared/utils/units'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const ingredientsStore = useIngredientsStore()

const blank = () => ({ name: '', shelf: SHELVES[0] as string, unit: 'g' as Unit, price: '' })
const form = reactive(blank())
const saving = ref(false)
const error = ref('')

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
    await ingredientsStore.create({ name: form.name.trim(), shelf: form.shelf, unit: form.unit, priceCents: Math.round(price * 100) })
    close()
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    error.value = status === 409 ? 'Cet ingrédient existe déjà.' : 'Enregistrement impossible. Réessayez.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppDialog :open="open" title="Nouvel ingrédient" @close="close">
    <form class="form" novalidate @submit.prevent="submit">
      <label class="field">Nom<input v-model="form.name" class="input" maxlength="80" placeholder="Ex. : pois chiches"></label>
      <label class="field">Rayon
        <select v-model="form.shelf" class="input">
          <option v-for="s in shelfOptions" :key="s" :value="s">{{ shelfLabel(s) }}</option>
        </select>
      </label>
      <div class="grid">
        <label class="field">Unité dans les recettes
          <select v-model="form.unit" class="input">
            <option v-for="u in UNITS" :key="u" :value="u">{{ UNIT_NAMES[u] }}</option>
          </select>
        </label>
        <label class="field">Prix (€ / {{ PURCHASE_UNITS[form.unit].label }})
          <input v-model="form.price" class="input mono" inputmode="decimal" placeholder="0,00">
        </label>
      </div>
      <p class="hint">Les recettes comptent en {{ unitLabel(form.unit, 2) }} ; le prix est par {{ PURCHASE_UNITS[form.unit].label }}, comme en rayon.</p>
      <p v-if="error" class="alert" role="alert">{{ error }}</p>
      <div class="form__actions">
        <button type="button" class="btn" @click="close">Annuler</button>
        <button type="submit" class="btn btn--primary" :disabled="saving">Ajouter l’ingrédient</button>
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
