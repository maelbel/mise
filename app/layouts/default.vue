<script setup lang="ts">
import type { NavItem } from '~/utils/navigation'

const route = useRoute()
const { user, initial } = useAccount()

function matches(path: string): boolean {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

/** Desktop: exact entry. Phone tab bar: also the pages filed under it. */
function isActive(item: NavItem, withAliases = false): boolean {
  return matches(item.to) || (withAliases && !!item.also?.some(matches))
}

const onAccount = computed(() => matches('/profile') || matches('/family'))
const mobileItems = NAV_ITEMS.filter((i) => i.mobile)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- The rule spans the window; the contents line up with the centred page. -->
    <header class="border-b border-default">
      <div class="mx-auto flex max-w-(--ui-container) flex-wrap items-center justify-between gap-2 px-gutter py-4 md:gap-6 md:py-6">
        <ULink to="/" raw class="flex min-h-11 items-center text-default" aria-label="Mise, accueil">
          <AppWordmark />
        </ULink>

        <nav aria-label="Principale" class="hidden flex-wrap gap-2 md:flex">
          <UButton
            v-for="item in NAV_ITEMS"
            :key="item.to"
            :to="item.to"
            :label="item.label"
            :variant="isActive(item) ? 'solid' : 'ghost'"
            :class="isActive(item) ? '' : 'text-muted hover:bg-transparent hover:text-default'"
            :aria-current="isActive(item) ? 'page' : undefined"
          />
        </nav>

        <ULink
          v-if="user"
          to="/profile"
          raw
          class="flex min-h-11 min-w-11 items-center justify-center gap-2 text-[15px] text-default"
          :aria-label="`Mon compte, ${user.name}`"
          :aria-current="onAccount ? 'page' : undefined"
        >
          <UAvatar
            :text="initial"
            aria-hidden="true"
            :ui="{
              root: ['size-8 rounded-sm', onAccount ? 'bg-inverted' : 'bg-muted'],
              fallback: ['font-display text-sm font-normal leading-none tracking-[0.08em]', onAccount ? 'text-inverted' : 'text-default'],
            }"
          />
          <span class="hidden md:inline" aria-hidden="true">{{ user.name }}</span>
        </ULink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-(--ui-container) grow px-gutter pt-6 pb-26 md:pt-10 md:pb-16">
      <slot />
    </main>

    <nav class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-default bg-default px-2 pb-4 md:hidden" aria-label="Principale">
      <ULink
        v-for="item in mobileItems"
        :key="item.to"
        :to="item.to"
        raw
        class="-mt-px flex min-h-11 flex-col items-center gap-1 border-t-2 py-2 text-xs"
        :class="isActive(item, true) ? 'border-brass-400 font-medium text-default' : 'border-transparent text-muted'"
        :aria-current="isActive(item, true) ? 'page' : undefined"
      >
        <UIcon :name="`i-mise-${item.icon}`" class="size-5" aria-hidden="true" />{{ item.label }}
      </ULink>
    </nav>
  </div>
</template>
