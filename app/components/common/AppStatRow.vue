<script setup lang="ts">
export interface Stat {
  label: string
  value: string | number
  /** Shown smaller after the value, e.g. "kcal" or "sur 20". */
  unit?: string
}

/** A row of figures between two rules: one line on desktop, two columns on phones. */
defineProps<{ stats: Stat[] }>()

function cellClass(i: number): string[] {
  return [
    // Phones: two columns, a rule between them and above the second row.
    i % 2 ? 'pl-4 border-l' : 'pl-0',
    i >= 2 ? 'border-t' : '',
    // Desktop: one row, a rule before every figure but the first.
    i ? 'md:pl-6 md:border-l' : 'md:pl-0',
    'md:border-t-0',
  ]
}
</script>

<template>
  <dl class="m-0 grid grid-cols-2 border-y border-default md:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
    <div v-for="(s, i) in stats" :key="s.label" class="flex flex-col gap-2 border-default py-3 md:py-4 md:pr-6" :class="cellClass(i)">
      <dt class="text-sm text-muted">{{ s.label }}</dt>
      <dd class="m-0 font-mono text-2xl tabular-nums">
        {{ s.value }}{{ s.unit ? ' ' : '' }}<small v-if="s.unit" class="text-xs text-muted">{{ s.unit }}</small>
      </dd>
    </div>
  </dl>
</template>
