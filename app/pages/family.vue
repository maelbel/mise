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
  <div class="page">
    <NuxtLink to="/profile" class="back mobile-only"><AppIcon name="chevronLeft" :size="16" />Profil</NuxtLink>
    <PageHeader :eyebrow="`Administration · ${plural(familyStore.members.length, 'compte')}`" title="Famille" lead="Vous créez les comptes. Chacun garde ses recettes, sa semaine et son profil pour lui." />

    <p v-if="loadError" class="alert" role="alert">Impossible de charger les comptes. Rechargez la page.</p>

    <div v-else class="layout">
      <section class="layout__main main" aria-label="Comptes">
        <section v-if="reveal" class="reveal" role="status" aria-label="Mot de passe temporaire">
          <p class="eyebrow">À transmettre à {{ reveal.name }}</p>
          <p>Identifiant <span class="mono">{{ reveal.email }}</span>, mot de passe temporaire :</p>
          <div class="row">
            <code class="reveal__password mono">{{ reveal.password }}</code>
            <button type="button" class="btn btn--primary" @click="copy">{{ copied ? 'Copié' : 'Copier' }}</button>
          </div>
          <p class="hint">Il ne sera plus affiché. {{ reveal.name }} choisira son propre mot de passe à la première connexion.</p>
          <button type="button" class="btn reveal__done" @click="reveal = null">C’est noté</button>
        </section>

        <p v-if="actionError" class="alert" role="alert">{{ actionError }}</p>

        <ul class="members">
          <li v-for="m in familyStore.members" :key="m.id" class="member">
            <div class="member__row">
              <span class="member__badge" aria-hidden="true">{{ m.name.charAt(0).toUpperCase() }}</span>
              <div class="member__who">
                <span class="member__name">{{ m.name }} <span class="muted">· {{ m.isAdmin ? 'Administrateur' : 'Membre' }}</span></span>
                <span class="mono member__email">{{ m.email }}</span>
              </div>
              <div class="member__status">
                <span :class="`status status--${m.status}`">{{ STATUS[m.status] }}</span>
                <span class="muted">{{ lastSeen(m) }}</span>
              </div>
              <div v-if="!m.isAdmin" class="row">
                <template v-if="m.status !== 'disabled'">
                  <button type="button" class="btn" :disabled="busy" @click="confirming = { id: m.id, kind: 'reset' }">Nouveau mot de passe</button>
                  <button type="button" class="btn" :disabled="busy" @click="confirming = { id: m.id, kind: 'disable' }">Désactiver</button>
                </template>
                <button v-else type="button" class="btn" :disabled="busy" @click="run(m, () => familyStore.setDisabled(m.id, false))">Réactiver</button>
              </div>
            </div>
            <div v-if="confirming?.id === m.id" class="confirm" role="alert">
              <p>{{ confirmText(m) }}</p>
              <div class="row">
                <button type="button" class="btn btn--primary" :disabled="busy" @click="doConfirmed(m)">{{ confirming.kind === 'reset' ? 'Générer' : 'Désactiver' }}</button>
                <button type="button" class="btn" @click="confirming = null">Annuler</button>
              </div>
            </div>
          </li>
        </ul>
        <p class="hint">Vous ne voyez ni les repas ni les profils des autres membres. Un compte désactivé garde ses données ; il suffit de le réactiver pour le retrouver.</p>
      </section>

      <aside class="layout__side">
        <form class="new" aria-labelledby="fa-new" novalidate @submit.prevent="create">
          <p class="eyebrow">Nouveau compte</p>
          <h2 id="fa-new" class="section-title">Ajouter un membre</h2>
          <label class="field">Prénom<input v-model="name" class="input" autocomplete="off"></label>
          <label class="field">E-mail de connexion<input v-model="email" class="input" type="email" autocomplete="off" inputmode="email" placeholder="prenom@exemple.fr"></label>
          <p v-if="createError" class="alert" role="alert">{{ createError }}</p>
          <p class="hint">Mise génère un mot de passe temporaire, et le compte démarre avec les recettes et ingrédients de base.</p>
          <button type="submit" class="btn btn--primary new__submit" :disabled="creating">{{ creating ? 'Création…' : 'Créer le compte' }}</button>
        </form>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.back {
  align-self: flex-start;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  margin: -16px 0 -16px -4px;
  font-size: 15px;
  text-decoration: none;
}

.layout {
  gap: 64px;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.reveal {
  padding: 16px 0;
  border-top: 2px solid var(--c-text);
  border-bottom: 1px solid var(--c-text);
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 16px;
}

.reveal__password {
  flex: 1 1 200px;
  min-height: 48px;
  padding: 0 16px;
  border-radius: var(--radius);
  background: var(--c-surface);
  display: flex;
  align-items: center;
  font-size: 18px;
  user-select: all;
}

.reveal__done {
  align-self: flex-start;
}

.members {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--c-line);
}

.member {
  padding: 16px 0;
  border-bottom: 1px solid var(--c-line);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.member__row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1.2fr) minmax(0, 1fr) minmax(320px, auto);
  align-items: center;
  gap: 16px 24px;
}

.member__row > .row {
  justify-content: flex-end;
}

.member__badge {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius);
  background: var(--c-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: 18px;
}

.member__who,
.member__status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.member__who {
  min-width: 0;
}

.member__name {
  font-size: 17px;
  font-weight: 500;
}

.member__name .muted {
  font-size: 14px;
  font-weight: 400;
}

.member__email {
  font-size: 13px;
  color: var(--c-text-2);
}

.member__status {
  min-width: 0;
}

.status--temporary {
  color: var(--c-accent);
}

.status--disabled {
  color: var(--c-text-2);
  text-decoration: line-through;
}

.confirm {
  padding: 16px;
  border-radius: var(--radius);
  background: var(--c-surface);
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 15px;
  line-height: 1.5;
}

.new {
  padding: 24px;
  border-radius: var(--radius);
  background: var(--c-surface);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.new > .eyebrow {
  margin-bottom: -8px;
}

.new__submit {
  min-height: 48px;
}

@media (max-width: 1199px) {
  .member__row {
    grid-template-columns: 44px minmax(0, 1fr);
  }

  .member__status,
  .member__row > .row {
    grid-column: 2;
    justify-content: flex-start;
  }
}

@media (max-width: 899px) {
  .layout {
    gap: 40px;
  }

  .new {
    padding: 16px;
  }
}
</style>
