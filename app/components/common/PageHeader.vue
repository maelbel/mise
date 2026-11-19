<script setup lang="ts">
defineProps<{ eyebrow?: string, title: string, lead?: string }>()
</script>

<template>
  <header class="page-head">
    <div class="page-head__text">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="lead" class="lead">{{ lead }}</p>
    </div>
    <div v-if="$slots.default" class="page-head__actions">
      <slot />
    </div>
  </header>
</template>

<style scoped>
.page-head__text {
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

@media (max-width: 899px) {
  .page-head__text {
    gap: 8px;
  }
}
</style>
