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
  <div v-if="done" class="flex flex-col gap-6" role="status">
    <div class="flex flex-col gap-2">
      <AppEyebrow>Connecté</AppEyebrow>
      <h1 class="text-[clamp(32px,5vw,48px)] font-medium leading-[1.1] tracking-[-0.01em] text-balance">Bienvenue, {{ user?.name }}</h1>
      <p class="text-base text-muted">Renseignez votre profil pour que Mise calcule vos calories et vos protéines du jour.</p>
    </div>
    <UButton to="/profile" variant="solid" block class="min-h-12" label="Compléter mon profil" />
    <AppLink to="/" class="inline-flex min-h-11 items-center self-start text-[15px]">Plus tard, aller à ma semaine</AppLink>
  </div>

  <form v-else class="flex flex-col gap-6" novalidate @submit.prevent="submit">
    <div class="flex flex-col gap-2">
      <AppEyebrow>Première connexion</AppEyebrow>
      <h1 class="text-[clamp(32px,5vw,48px)] font-medium leading-[1.1] tracking-[-0.01em] text-balance">Bonjour {{ user?.name }}, choisissez votre mot de passe</h1>
      <p class="text-base text-muted">Le mot de passe temporaire ne fonctionnera plus ensuite. Personne d’autre, pas même l’administrateur, ne connaîtra le nouveau.</p>
    </div>

    <UFormField label="Nouveau mot de passe">
      <UInput v-model="password" class="w-full" :type="show ? 'text' : 'password'" autocomplete="new-password" />
    </UFormField>
    <UFormField label="Confirmez-le">
      <div class="flex gap-2">
        <UInput v-model="confirm" class="w-full" :type="show ? 'text' : 'password'" autocomplete="new-password" />
        <UButton :label="show ? 'Masquer' : 'Afficher'" class="min-w-24 justify-center text-sm md:text-sm" :aria-pressed="show" @click="show = !show" />
      </div>
    </UFormField>

    <ul class="m-0 flex list-none flex-col gap-2 p-0 text-sm text-muted" aria-label="Règles du mot de passe">
      <li class="flex items-center gap-2" :class="{ 'text-default': longEnough }">
        <UIcon :name="longEnough ? 'i-mise-check' : 'i-mise-minus'" class="size-4" />Au moins {{ PASSWORD_MIN_LENGTH }} caractères
      </li>
      <li class="flex items-center gap-2" :class="{ 'text-default': matches }">
        <UIcon :name="matches ? 'i-mise-check' : 'i-mise-minus'" class="size-4" />Les deux mots de passe correspondent
      </li>
    </ul>

    <UAlert v-if="error" color="error" role="alert" :title="error" />

    <UButton type="submit" variant="solid" block class="min-h-12" :disabled="busy" :label="busy ? 'Enregistrement…' : 'Enregistrer et continuer'" />
    <UButton variant="link" label="Se déconnecter" class="min-h-11 self-start p-0 text-[15px] text-primary underline hover:text-default" @click="logout" />
  </form>
</template>
