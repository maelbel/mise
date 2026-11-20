<script setup lang="ts">
import type { Ingredient } from '#shared/types/domain'
import { unitLabel } from '#shared/utils/labels'
import { parseQuantity, quantityInputValue, stockStep } from '#shared/utils/units'

/**
 * The stock of one ingredient: − and + move by one step, and the field takes an
 * exact amount in the ingredient's unit, saved on Enter or when leaving it.
 * Reports new amounts with `change`; an amount it can't read is dropped and reported with `invalid`.
 */
const props = defineProps<{ ingredient: Pick<Ingredient, 'name' | 'unit' | 'stock'> }>()
const emit = defineEmits<{ change: [quantity: number], invalid: [] }>()

const text = ref(quantityInputValue(props.ingredient.stock))
watch(() => props.ingredient.stock, (stock) => {
  text.value = quantityInputValue(stock)
})

const unit = computed(() => unitLabel(props.ingredient.unit, 2))

function step(direction: 1 | -1): void {
  emit('change', Math.max(0, props.ingredient.stock + direction * stockStep(props.ingredient.unit)))
}

function commit(): void {
  const quantity = parseQuantity(text.value)
  if (quantity === null) {
    text.value = quantityInputValue(props.ingredient.stock)
    emit('invalid')
  } else if (quantity !== props.ingredient.stock) {
    emit('change', quantity)
  }
}

function cancel(event: KeyboardEvent): void {
  text.value = quantityInputValue(props.ingredient.stock)
  ;(event.target as HTMLInputElement).blur()
}
</script>

<template>
  <span class="stepper" role="group" :aria-label="`Quantité de ${ingredient.name}`">
    <button type="button" class="icon-btn" :aria-label="`Moins de ${ingredient.name}`" :disabled="ingredient.stock <= 0" @click="step(-1)">
      <AppIcon name="minus" :size="16" />
    </button>
    <label class="stepper__field">
      <span class="visually-hidden">Quantité de {{ ingredient.name }} en {{ unit }}</span>
      <input
        v-model="text"
        class="input mono stepper__input"
        inputmode="decimal"
        autocomplete="off"
        @keydown.enter.prevent="commit"
        @keydown.esc="cancel"
        @blur="commit"
      >
      <span class="stepper__unit" aria-hidden="true">{{ unit }}</span>
    </label>
    <button type="button" class="icon-btn icon-btn--primary" :aria-label="`Plus de ${ingredient.name}`" @click="step(1)">
      <AppIcon name="plus" :size="16" />
    </button>
  </span>
</template>

<style scoped>
.stepper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stepper__field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stepper__input {
  width: 72px;
  padding: 0 8px;
  text-align: right;
  font-size: 14px;
}

.stepper__unit {
  min-width: 40px;
  font-size: 13px;
  color: var(--c-text-2);
}

@media (max-width: 899px) {
  .stepper {
    gap: 4px;
  }

  .stepper__input {
    width: 64px;
  }
}
</style>
