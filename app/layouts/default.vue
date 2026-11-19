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
</script>

<template>
  <div class="shell">
    <header class="header">
      <NuxtLink to="/" class="wordmark" aria-label="Mise, accueil">
        <span class="wordmark__bar" aria-hidden="true" />
        <span class="wordmark__name">MISE</span>
      </NuxtLink>

      <nav aria-label="Principale" class="nav desktop-only">
        <NuxtLink
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="nav__link"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <NuxtLink
        v-if="user"
        to="/profile"
        class="account"
        :class="{ 'account--on': onAccount }"
        :aria-label="`Mon compte, ${user.name}`"
        :aria-current="onAccount ? 'page' : undefined"
      >
        <span class="account__badge" aria-hidden="true">{{ initial }}</span>
        <span class="account__name desktop-only" aria-hidden="true">{{ user.name }}</span>
      </NuxtLink>
    </header>

    <main class="content">
      <slot />
    </main>

    <nav class="tabs" aria-label="Principale">
      <NuxtLink
        v-for="item in NAV_ITEMS.filter((i) => i.mobile)"
        :key="item.to"
        :to="item.to"
        class="tabs__link"
        :aria-current="isActive(item, true) ? 'page' : undefined"
      >
        <AppIcon :name="item.icon" />{{ item.label }}
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  /* The rule spans the window; the contents line up with the centred page. */
  padding: 24px max(var(--gutter), calc((100% - var(--page-max)) / 2 + var(--gutter)));
  border-bottom: 1px solid var(--c-line);
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 44px;
  color: var(--c-text);
  text-decoration: none;
}

.wordmark:hover {
  color: var(--c-text);
}

.wordmark__bar {
  width: 24px;
  height: 2px;
  background: var(--c-mark);
}

.wordmark__name {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 28px;
  letter-spacing: 0.14em;
  line-height: 1;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nav__link {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: var(--radius);
  color: var(--c-text-2);
  font-size: 15px;
  text-decoration: none;
}

.nav__link:hover {
  color: var(--c-text);
}

.nav__link[aria-current='page'] {
  background: var(--c-fill-primary);
  color: var(--c-on-primary);
  font-weight: 500;
}

.account {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 44px;
  min-height: 44px;
  color: var(--c-text);
  font-size: 15px;
  text-decoration: none;
}

.account:hover {
  color: var(--c-text);
}

.account__badge {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius);
  background: var(--c-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.08em;
  line-height: 1;
}

.account--on .account__badge {
  background: var(--c-fill-primary);
  color: var(--c-on-primary);
}

.content {
  flex-grow: 1;
  width: 100%;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 40px var(--gutter) 64px;
}

.tabs {
  display: none;
}

@media (max-width: 899px) {
  .header {
    padding: 16px;
    gap: 8px;
  }

  .wordmark {
    gap: 8px;
  }

  .wordmark__bar {
    width: 16px;
  }

  .wordmark__name {
    font-size: 18px;
  }

  .content {
    padding: 24px 16px 104px;
  }

  .tabs {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    border-top: 1px solid var(--c-line);
    background: var(--c-bg);
    padding: 0 8px 16px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .tabs__link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 8px 0;
    margin-top: -1px;
    border-top: 2px solid transparent;
    color: var(--c-text-2);
    font-size: 12px;
    text-decoration: none;
  }

  .tabs__link[aria-current='page'] {
    border-top-color: var(--c-mark);
    color: var(--c-text);
    font-weight: 500;
  }
}
</style>
