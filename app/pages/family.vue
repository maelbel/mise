<script setup lang="ts">
import type { AccountStatus, FamilyMember } from '#shared/types/domain'

useHead({ title: 'Famille · Mise' })

const familyStore = useFamilyStore()
const { error: loadError } = await useAsyncData('family-page', async () => {
  await familyStore.load()
  return true
})

const STATUS: Record<AccountStatus, string> = { active: 'Actif', temporary: 'Mot de passe temporaire', disabled: 'Désactivé' }

function lastSeen(m: FamilyMember): string {
  if (!m.lastLoginAt) return 'Jamais connecté'
  return `Dernière connexion le ${new Date(m.lastLoginAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

// The temporary password is shown once, right after it is made.
const reveal = ref<{ name: string, email: string, password: string } | null>(null)
const copied = ref(false)

async function copy(): Promise<void> {
  if (!reveal.value) return
  try {
    await navigator.clipboard.writeText(reveal.value.password)
    copied.value = true
  } catch {
    copied.value = false
  }
}

const name = ref('')
const email = ref('')
const createError = ref('')
const creating = ref(false)

async function create(): Promise<void> {
  createError.value = !name.value.trim() ? 'Indiquez un prénom.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? 'Cette adresse e-mail n’est pas valide.' : ''
  if (createError.value) return
  creating.value = true
  try {
    const { member, temporaryPassword } = await familyStore.create(name.value.trim(), email.value.trim())
    reveal.value = { name: member.name, email: member.email, password: temporaryPassword }
    copied.value = false
    name.value = ''
    email.value = ''
  } catch (e) {
    createError.value = (e as { statusCode?: number }).statusCode === 409 ? 'Un compte utilise déjà cette adresse.' : 'Création impossible. Réessayez.'
  } finally {
    creating.value = false
  }
}

const confirming = ref<{ id: number, kind: 'reset' | 'disable' } | null>(null)
const actionError = ref('')
const busy = ref(false)

function confirmText(m: FamilyMember): string {
  return confirming.value?.kind === 'reset'
    ? `Générer un nouveau mot de passe temporaire pour ${m.name} ? L’ancien ne fonctionnera plus et ${m.name} sera déconnecté.`
    : `Désactiver le compte de ${m.name} ? Ses données sont gardées, mais la connexion est bloquée.`
}

async function run(m: FamilyMember, action: () => Promise<void>): Promise<void> {
  busy.value = true
  actionError.value = ''
  try {
    await action()
    confirming.value = null
  } catch {
    actionError.value = `Impossible de modifier le compte de ${m.name}. Réessayez.`
  } finally {
    busy.value = false
  }
}

function doConfirmed(m: FamilyMember): Promise<void> {
  return run(m, async () => {
    if (confirming.value?.kind === 'reset') {
      const password = await familyStore.resetPassword(m.id)
      reveal.value = { name: m.name, email: m.email, password }
      copied.value = false
    } else {
      await familyStore.setDisabled(m.id, true)
    }
  })
}
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-10">
    <AppBackLink to="/profile" label="Profil" />
    <PageHeader :eyebrow="`Administration · ${plural(familyStore.members.length, 'compte')}`" title="Famille" lead="Vous créez les comptes. Chacun garde ses recettes, sa semaine et son profil pour lui." />

    <UAlert v-if="loadError" color="error" role="alert" title="Impossible de charger les comptes. Rechargez la page." />

    <div v-else class="flex flex-wrap items-start gap-10 md:gap-16">
      <section class="flex min-w-0 flex-[999_1_600px] flex-col gap-6" aria-label="Comptes">
        <section v-if="reveal" class="flex flex-col gap-4 border-t-2 border-b border-inverted py-4 text-base" role="status" aria-label="Mot de passe temporaire">
          <AppEyebrow>À transmettre à {{ reveal.name }}</AppEyebrow>
          <p>Identifiant <span class="font-mono">{{ reveal.email }}</span>, mot de passe temporaire :</p>
          <div class="flex flex-wrap items-center gap-2">
            <code class="flex min-h-12 flex-[1_1_200px] select-all items-center rounded-sm bg-muted px-4 font-mono text-lg">{{ reveal.password }}</code>
            <UButton variant="solid" :label="copied ? 'Copié' : 'Copier'" @click="copy" />
          </div>
          <p class="text-sm text-muted">Il ne sera plus affiché. {{ reveal.name }} choisira son propre mot de passe à la première connexion.</p>
          <UButton label="C’est noté" class="self-start" @click="reveal = null" />
        </section>

        <UAlert v-if="actionError" color="error" role="alert" :title="actionError" />

        <ul class="m-0 list-none border-t border-default p-0">
          <li v-for="m in familyStore.members" :key="m.id" class="flex flex-col gap-4 border-b border-default py-4">
            <div class="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-6 gap-y-4 min-[1200px]:grid-cols-[44px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(320px,auto)]">
              <UAvatar
                :text="m.name.charAt(0).toUpperCase()"
                aria-hidden="true"
                :ui="{ root: 'size-11 rounded-sm bg-muted', fallback: 'font-display text-lg font-normal text-default' }"
              />
              <div class="flex min-w-0 flex-col gap-1 text-sm">
                <span class="text-[17px] font-medium">{{ m.name }} <span class="text-sm font-normal text-muted">· {{ m.isAdmin ? 'Administrateur' : 'Membre' }}</span></span>
                <span class="font-mono text-[13px] text-muted">{{ m.email }}</span>
              </div>
              <div class="col-start-2 flex min-w-0 flex-col gap-1 text-sm min-[1200px]:col-start-auto">
                <span :class="{ 'text-primary': m.status === 'temporary', 'text-muted line-through': m.status === 'disabled' }">{{ STATUS[m.status] }}</span>
                <span class="text-muted">{{ lastSeen(m) }}</span>
              </div>
              <div v-if="!m.isAdmin" class="col-start-2 flex flex-wrap items-center justify-start gap-2 min-[1200px]:col-start-auto min-[1200px]:justify-end">
                <template v-if="m.status !== 'disabled'">
                  <UButton label="Nouveau mot de passe" :disabled="busy" @click="confirming = { id: m.id, kind: 'reset' }" />
                  <UButton label="Désactiver" :disabled="busy" @click="confirming = { id: m.id, kind: 'disable' }" />
                </template>
                <UButton v-else label="Réactiver" :disabled="busy" @click="run(m, () => familyStore.setDisabled(m.id, false))" />
              </div>
            </div>
            <div v-if="confirming?.id === m.id" class="flex flex-col gap-4 rounded-sm bg-muted p-4 text-[15px]" role="alert">
              <p>{{ confirmText(m) }}</p>
              <div class="flex flex-wrap items-center gap-2">
                <UButton variant="solid" :disabled="busy" :label="confirming.kind === 'reset' ? 'Générer' : 'Désactiver'" @click="doConfirmed(m)" />
                <UButton label="Annuler" @click="confirming = null" />
              </div>
            </div>
          </li>
        </ul>
        <p class="text-sm text-muted">Vous ne voyez ni les repas ni les profils des autres membres. Un compte désactivé garde ses données ; il suffit de le réactiver pour le retrouver.</p>
      </section>

      <aside class="flex min-w-0 flex-[1_1_340px] flex-col gap-6">
        <form class="flex flex-col gap-4 rounded-sm bg-muted p-4 md:p-6" aria-labelledby="fa-new" novalidate @submit.prevent="create">
          <AppEyebrow class="-mb-2">Nouveau compte</AppEyebrow>
          <h2 id="fa-new" class="text-xl font-medium leading-[1.3]">Ajouter un membre</h2>
          <UFormField label="Prénom">
            <UInput v-model="name" class="w-full" autocomplete="off" />
          </UFormField>
          <UFormField label="E-mail de connexion">
            <UInput v-model="email" class="w-full" type="email" autocomplete="off" inputmode="email" placeholder="prenom@exemple.fr" />
          </UFormField>
          <UAlert v-if="createError" color="error" role="alert" :title="createError" />
          <p class="text-sm text-muted">Mise génère un mot de passe temporaire, et le compte démarre avec les recettes et ingrédients de base.</p>
          <UButton type="submit" variant="solid" block class="min-h-12" :disabled="creating" :label="creating ? 'Création…' : 'Créer le compte'" />
        </form>
      </aside>
    </div>
  </div>
</template>
