<script setup lang="ts">
const { isCurrent, previous, next, goToCurrent } = useWeek()
</script>

<template>
  <div class="week-switcher" role="group" aria-label="Changer de semaine">
    <button type="button" class="icon-btn" aria-label="Semaine précédente" @click="previous">
      <AppIcon name="chevronLeft" :size="18" />
    </button>
    <button v-if="!isCurrent" type="button" class="btn" @click="goToCurrent">Cette semaine</button>
    <button type="button" class="icon-btn" aria-label="Semaine suivante" @click="next">
      <AppIcon name="chevronRight" :size="18" />
    </button>
  </div>
</template>

<style scoped>
.week-switcher {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
