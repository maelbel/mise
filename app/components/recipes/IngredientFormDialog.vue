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

const shelfItems = computed(() => [...new Set([...SHELVES, ...ingredientsStore.shelves])].map((s) => ({ label: shelfLabel(s), value: s })))
const unitItems = UNITS.map((u) => ({ label: UNIT_NAMES[u], value: u }))
const unitDisabled = computed(() => editing.value && !!props.unitLocked)

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
    <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
      <UFormField label="Nom">
        <UInput v-model="form.name" class="w-full" maxlength="80" placeholder="Ex. : pois chiches" />
      </UFormField>
      <UFormField label="Rayon">
        <USelect v-model="form.shelf" class="w-full" :items="shelfItems" />
      </UFormField>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <UFormField label="Unité dans les recettes">
          <USelect
            id="ingredient-unit"
            v-model="form.unit"
            class="w-full"
            :items="unitItems"
            :disabled="unitDisabled"
            :aria-describedby="unitDisabled ? 'unit-locked' : undefined"
          />
        </UFormField>
        <UFormField :label="`Prix (€ / ${PURCHASE_UNITS[form.unit].label})`">
          <UInput v-model="form.price" class="w-full" :ui="{ base: 'font-mono' }" inputmode="decimal" placeholder="0,00" />
        </UFormField>
      </div>
      <p v-if="unitDisabled" id="unit-locked" class="text-sm text-muted">L’unité est fixée : cet ingrédient sert dans une recette ou en réserve, dont les quantités sont comptées dans cette unité.</p>
      <p class="text-sm text-muted">Les recettes comptent en {{ unitLabel(form.unit, 2) }} ; le prix est par {{ PURCHASE_UNITS[form.unit].label }}, comme en rayon.</p>
      <UAlert v-if="error" color="error" role="alert" :title="error" />
      <div class="flex flex-wrap justify-end gap-2">
        <UButton label="Annuler" @click="close" />
        <UButton type="submit" variant="solid" :disabled="saving" :label="editing ? 'Enregistrer les modifications' : 'Ajouter l’ingrédient'" />
      </div>
    </form>
  </AppDialog>
</template>
