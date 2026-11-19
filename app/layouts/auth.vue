<template>
  <div class="auth">
    <section class="intro" aria-label="Mise">
      <p class="wordmark"><span class="wordmark__bar" aria-hidden="true" /><span class="wordmark__name">MISE</span></p>
      <div class="intro__text">
        <p class="eyebrow intro__eyebrow">Tout préparer avant de cuisiner</p>
        <p class="intro__title">Votre semaine, vos recettes, vos courses.</p>
        <p class="intro__body">Chaque membre de la famille a son propre compte : ses recettes, sa semaine et ses objectifs restent à lui.</p>
      </div>
      <p class="intro__note">Accès sur invitation de l’administrateur</p>
    </section>

    <main class="form-side">
      <p class="wordmark wordmark--small"><span class="wordmark__bar" aria-hidden="true" /><span class="wordmark__name">MISE</span></p>
      <div class="form-side__inner">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  flex-wrap: wrap;
}

.intro {
  flex: 1 1 480px;
  padding: 64px var(--gutter);
  background: var(--c-fill-primary);
  color: var(--c-surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 64px;
}

.intro__text {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.intro__eyebrow {
  color: var(--c-mark-light);
}

.intro__title {
  font-size: clamp(32px, 4vw, 40px);
  font-weight: 500;
  line-height: 1.2;
  color: var(--c-on-primary);
}

.intro__body {
  font-size: 18px;
  line-height: 1.6;
  color: var(--c-stone);
}

.intro__note {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--c-stone);
}

.wordmark {
  display: flex;
  align-items: center;
  gap: 16px;
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

.wordmark--small {
  display: none;
}

.form-side {
  flex: 1 1 480px;
  padding: 64px var(--gutter);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-side__inner {
  width: 100%;
  max-width: 420px;
}

@media (max-width: 899px) {
  .intro {
    display: none;
  }

  .form-side {
    padding: 0 16px 40px;
    justify-content: flex-start;
    gap: 40px;
  }

  .wordmark--small {
    display: flex;
    gap: 8px;
    min-height: 44px;
    margin: 0 -16px;
    padding: 16px;
    border-bottom: 1px solid var(--c-line);
  }

  .wordmark--small .wordmark__bar {
    width: 16px;
  }

  .wordmark--small .wordmark__name {
    font-size: 18px;
  }
}
</style>
