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
  <form class="form" novalidate @submit.prevent="submit">
    <div class="form__head">
      <p class="eyebrow">Bon retour</p>
      <h1 class="page-title">Connexion</h1>
    </div>

    <label class="field">E-mail
      <input v-model="email" class="input" type="email" autocomplete="username" inputmode="email" placeholder="vous@exemple.fr">
    </label>

    <label class="field">Mot de passe
      <span class="password">
        <input v-model="password" class="input" :type="showPassword ? 'text' : 'password'" autocomplete="current-password">
        <button type="button" class="btn password__toggle" :aria-pressed="showPassword" @click="showPassword = !showPassword">
          {{ showPassword ? 'Masquer' : 'Afficher' }}
        </button>
      </span>
    </label>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <button type="submit" class="btn btn--primary form__submit" :disabled="busy">{{ busy ? 'Connexion…' : 'Se connecter' }}</button>

    <p class="form__note">
      Pas encore de compte, ou mot de passe oublié ? Demandez à l’administrateur de la famille : il crée les comptes et peut vous donner un nouveau mot de passe.
    </p>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.password {
  display: flex;
  gap: 8px;
}

.password__toggle {
  min-width: 96px;
  font-size: 14px;
}

.form__submit {
  min-height: 48px;
}

.form__note {
  padding-top: 16px;
  border-top: 1px solid var(--c-line);
  font-size: 15px;
  line-height: 1.5;
  color: var(--c-text-2);
}
</style>
