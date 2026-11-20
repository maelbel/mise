<script setup lang="ts">
import type { PublicUser } from '#shared/types/domain'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Connexion · Mise' })

const route = useRoute()
const { refresh } = useAccount()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const busy = ref(false)

/** Only paths inside the app, never another site. */
function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

async function submit(): Promise<void> {
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'Saisissez votre e-mail et votre mot de passe.'
    return
  }
  busy.value = true
  try {
    const user = await $fetch<PublicUser>('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await refresh()
    await navigateTo(user.mustChangePassword ? '/password' : safeRedirect(route.query.redirect))
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    error.value = status === 401 || status === 403 || status === 429
      ? (e as { statusMessage?: string }).statusMessage ?? 'Connexion impossible.'
      : 'Connexion impossible. Vérifiez votre connexion et réessayez.'
    password.value = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
    <div class="flex flex-col gap-2">
      <AppEyebrow>Bon retour</AppEyebrow>
      <h1 class="text-[clamp(32px,5vw,48px)] font-medium leading-[1.1] tracking-[-0.01em] text-balance">Connexion</h1>
    </div>

    <UFormField label="E-mail">
      <UInput v-model="email" class="w-full" type="email" autocomplete="username" inputmode="email" placeholder="vous@exemple.fr" />
    </UFormField>

    <UFormField label="Mot de passe">
      <div class="flex gap-2">
        <UInput v-model="password" class="w-full" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" />
        <UButton
          :label="showPassword ? 'Masquer' : 'Afficher'"
          class="min-w-24 justify-center text-sm md:text-sm"
          :aria-pressed="showPassword"
          @click="showPassword = !showPassword"
        />
      </div>
    </UFormField>

    <UAlert v-if="error" color="error" role="alert" :title="error" />

    <UButton type="submit" variant="solid" block class="min-h-12" :disabled="busy" :label="busy ? 'Connexion…' : 'Se connecter'" />

    <p class="border-t border-default pt-4 text-[15px] text-muted">
      Pas encore de compte, ou mot de passe oublié ? Demandez à l’administrateur de la famille : il crée les comptes et peut vous donner un nouveau mot de passe.
    </p>
  </form>
</template>
