<script setup lang="ts">
const { isCurrent, previous, next, goToCurrent } = useWeek()
</script>

<template>
  <div class="flex items-center gap-2" role="group" aria-label="Changer de semaine">
    <UButton icon="i-mise-chevron-left" square aria-label="Semaine précédente" :ui="{ leadingIcon: 'size-[18px]' }" @click="previous" />
    <UButton v-if="!isCurrent" label="Cette semaine" @click="goToCurrent" />
    <UButton icon="i-mise-chevron-right" square aria-label="Semaine suivante" :ui="{ leadingIcon: 'size-[18px]' }" @click="next" />
  </div>
</template>
