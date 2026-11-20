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
  <span class="flex shrink-0 items-center gap-1 md:gap-2" role="group" :aria-label="`Quantité de ${ingredient.name}`">
    <UButton icon="i-mise-minus" square :aria-label="`Moins de ${ingredient.name}`" :disabled="ingredient.stock <= 0" @click="step(-1)" />
    <span class="flex items-center gap-1">
      <UInput
        v-model="text"
        :aria-label="`Quantité de ${ingredient.name} en ${unit}`"
        class="w-16 md:w-18"
        :ui="{ base: 'px-2 text-right font-mono text-sm md:text-sm' }"
        inputmode="decimal"
        autocomplete="off"
        @keydown.enter.prevent="commit"
        @keydown.esc="cancel"
        @blur="commit"
      />
      <span class="min-w-10 text-[13px] text-muted" aria-hidden="true">{{ unit }}</span>
    </span>
    <UButton icon="i-mise-plus" square variant="solid" :aria-label="`Plus de ${ingredient.name}`" @click="step(1)" />
  </span>
</template>
