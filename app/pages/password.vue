<script setup lang="ts">
import { PASSWORD_MIN_LENGTH, passwordProblem } from '#shared/utils/password'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Votre mot de passe · Mise' })

const { user, refresh, logout } = useAccount()

const password = ref('')
const confirm = ref('')
const show = ref(false)
const error = ref('')
const busy = ref(false)
const done = ref(false)

const longEnough = computed(() => password.value.length >= PASSWORD_MIN_LENGTH)
const matches = computed(() => password.value.length > 0 && password.value === confirm.value)

async function submit(): Promise<void> {
  error.value = passwordProblem(password.value) ?? (matches.value ? '' : 'Les deux mots de passe ne correspondent pas.')
  if (error.value) return
  busy.value = true
  try {
    await $fetch('/api/auth/password', { method: 'POST', body: { newPassword: password.value } })
    await refresh()
    done.value = true
  } catch (e) {
    error.value = (e as { statusMessage?: string }).statusMessage ?? 'Enregistrement impossible. Réessayez.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="done" class="form" role="status">
    <div class="form__head">
      <p class="eyebrow">Connecté</p>
      <h1 class="page-title">Bienvenue, {{ user?.name }}</h1>
      <p class="form__lead">Renseignez votre profil pour que Mise calcule vos calories et vos protéines du jour.</p>
    </div>
    <NuxtLink to="/profile" class="btn btn--primary form__submit">Compléter mon profil</NuxtLink>
    <NuxtLink to="/" class="form__later">Plus tard, aller à ma semaine</NuxtLink>
  </div>

  <form v-else class="form" novalidate @submit.prevent="submit">
    <div class="form__head">
      <p class="eyebrow">Première connexion</p>
      <h1 class="page-title">Bonjour {{ user?.name }}, choisissez votre mot de passe</h1>
      <p class="form__lead">Le mot de passe temporaire ne fonctionnera plus ensuite. Personne d’autre, pas même l’administrateur, ne connaîtra le nouveau.</p>
    </div>

    <label class="field">Nouveau mot de passe
      <input v-model="password" class="input" :type="show ? 'text' : 'password'" autocomplete="new-password">
    </label>
    <label class="field">Confirmez-le
      <span class="password">
        <input v-model="confirm" class="input" :type="show ? 'text' : 'password'" autocomplete="new-password">
        <button type="button" class="btn password__toggle" :aria-pressed="show" @click="show = !show">{{ show ? 'Masquer' : 'Afficher' }}</button>
      </span>
    </label>

    <ul class="rules" aria-label="Règles du mot de passe">
      <li :class="{ 'rules__ok': longEnough }"><AppIcon :name="longEnough ? 'check' : 'minus'" :size="16" />Au moins {{ PASSWORD_MIN_LENGTH }} caractères</li>
      <li :class="{ 'rules__ok': matches }"><AppIcon :name="matches ? 'check' : 'minus'" :size="16" />Les deux mots de passe correspondent</li>
    </ul>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <button type="submit" class="btn btn--primary form__submit" :disabled="busy">{{ busy ? 'Enregistrement…' : 'Enregistrer et continuer' }}</button>
    <button type="button" class="form__later" @click="logout">Se déconnecter</button>
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

.form__lead {
  font-size: 16px;
  line-height: 1.5;
  color: var(--c-text-2);
}

.password {
  display: flex;
  gap: 8px;
}

.password__toggle {
  min-width: 96px;
  font-size: 14px;
}

.rules {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: var(--c-text-2);
}

.rules li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rules__ok {
  color: var(--c-text);
}

.form__submit {
  min-height: 48px;
}

.form__later {
  align-self: flex-start;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--c-accent);
  font-size: 15px;
  text-decoration: underline;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
</style>
