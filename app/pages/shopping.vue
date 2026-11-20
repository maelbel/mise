<script setup lang="ts">
import type { Stat } from '~/components/common/AppStatRow.vue'
import { shelfLabel } from '#shared/utils/labels'
import { formatPrice, formatQuantity } from '#shared/utils/units'

useHead({ title: 'Courses · Mise' })

const { week, label } = useWeek()
const shoppingStore = useShoppingStore()

const { error } = await useAsyncData(
  'shopping-page',
  async () => {
    await shoppingStore.load(week.value)
    return true
  },
  { watch: [week] },
)

const hideChecked = ref(false)
const actionError = ref('')

const total = computed(() => shoppingStore.items.length)
const progress = computed(() => (total.value ? Math.round((shoppingStore.doneCount / total.value) * 100) : 0))
const stats = computed<Stat[]>(() => [
  { label: 'Articles cochés', value: shoppingStore.doneCount, unit: `sur ${total.value}` },
  { label: 'Reste à acheter', value: formatPrice(shoppingStore.remainingCents) },
  { label: 'Total estimé', value: formatPrice(shoppingStore.list?.totalCents ?? 0) },
])
const groups = computed(() =>
  (shoppingStore.list?.groups ?? [])
    .map((g) => ({
      ...g,
      label: shelfLabel(g.shelf),
      subtotal: formatPrice(g.items.reduce((sum, i) => sum + i.costCents, 0)),
      visible: hideChecked.value ? g.items.filter((i) => !i.checked) : g.items,
    }))
    .filter((g) => g.visible.length > 0),
)

async function toggle(ingredientId: number): Promise<void> {
  actionError.value = ''
  try {
    await shoppingStore.toggle(ingredientId)
  } catch {
    actionError.value = 'Enregistrement impossible. Réessayez.'
  }
}

async function reset(): Promise<void> {
  actionError.value = ''
  try {
    await shoppingStore.reset()
  } catch {
    actionError.value = 'Impossible de décocher la liste. Réessayez.'
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-10">
    <PageHeader :eyebrow="label" title="Liste de courses" lead="Les besoins de la semaine, moins votre réserve, dans l’ordre du magasin.">
      <WeekSwitcher />
    </PageHeader>

    <UAlert v-if="error" color="error" role="alert" title="Impossible de charger la liste de courses. Vérifiez que la base de données tourne." />

    <template v-else-if="shoppingStore.list">
      <section class="flex flex-col gap-2" aria-label="Avancement">
        <AppStatRow :stats="stats" class="max-md:hidden" />
        <div class="flex items-end justify-between gap-4 rounded-sm bg-inverted p-4 text-limestone-200 md:hidden">
          <div class="flex flex-col gap-2">
            <span class="text-sm text-limestone-500">Reste à acheter</span>
            <span class="font-mono text-2xl leading-none">{{ formatPrice(shoppingStore.remainingCents) }}</span>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span class="text-sm text-limestone-500">Cochés</span>
            <span class="font-mono text-base text-brass-300">{{ shoppingStore.doneCount }}/{{ total }}</span>
          </div>
        </div>
        <UProgress
          :model-value="progress"
          aria-label="Articles cochés"
          :ui="{ base: 'h-0.5 rounded-none bg-limestone-300', indicator: 'rounded-none bg-brass-400' }"
        />
      </section>

      <div class="flex flex-wrap gap-2">
        <AppToggle :pressed="hideChecked" @click="hideChecked = !hideChecked">Masquer les cochés</AppToggle>
        <UButton label="Tout décocher" :disabled="!shoppingStore.doneCount" @click="reset" />
      </div>

      <UAlert v-if="actionError" color="error" role="alert" :title="actionError" />
      <UAlert v-if="!total" title="Rien à acheter : votre réserve couvre la semaine." />
      <UAlert v-else-if="!groups.length" role="status" title="Tout est dans le panier." />

      <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-10">
        <section v-for="g in groups" :key="g.shelf" class="flex min-w-0 flex-col gap-2" :aria-label="g.label">
          <AppEyebrow as="h2" class="flex justify-between gap-2">
            <span>{{ g.label }}</span><span class="font-mono tracking-normal text-muted">{{ g.subtotal }}</span>
          </AppEyebrow>
          <ul class="m-0 list-none border-t border-default p-0">
            <li v-for="item in g.visible" :key="item.ingredientId" class="border-b border-default">
              <UCheckbox
                :model-value="item.checked"
                :ui="{
                  root: 'min-h-14 items-center gap-4 py-2',
                  container: 'h-5',
                  base: 'size-5 rounded-xs ring-accented',
                  wrapper: 'ms-0 flex grow',
                  label: 'flex grow cursor-pointer items-center gap-4 text-base font-normal text-default',
                }"
                @update:model-value="toggle(item.ingredientId)"
              >
                <template #label>
                  <span class="flex min-w-0 grow flex-col gap-0.5">
                    <span :class="{ 'text-muted line-through': item.checked }">{{ item.name }}</span>
                    <span class="font-mono text-xs text-muted">{{ formatQuantity(item.quantity, item.unit) }}</span>
                  </span>
                  <span class="shrink-0 font-mono text-[13px]">{{ formatPrice(item.costCents) }}</span>
                </template>
              </UCheckbox>
            </li>
          </ul>
        </section>
      </div>

      <p class="text-sm text-muted">Les quantités tiennent compte de votre <AppLink to="/storage">réserve</AppLink>. Prix estimés à partir du catalogue des ingrédients.</p>
    </template>
  </div>
</template>
