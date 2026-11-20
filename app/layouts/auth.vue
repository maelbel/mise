<template>
  <div class="flex min-h-screen flex-wrap">
    <section class="hidden flex-[1_1_480px] flex-col justify-between gap-16 bg-inverted px-gutter py-16 text-limestone-200 md:flex" aria-label="Mise">
      <AppWordmark as="p" />
      <div class="flex max-w-[520px] flex-col gap-6">
        <AppEyebrow light>Tout préparer avant de cuisiner</AppEyebrow>
        <p class="text-[clamp(32px,4vw,40px)] font-medium leading-[1.2] text-limestone-50">Votre semaine, vos recettes, vos courses.</p>
        <p class="text-lg leading-[1.6] text-limestone-500">Chaque membre de la famille a son propre compte : ses recettes, sa semaine et ses objectifs restent à lui.</p>
      </div>
      <p class="font-mono text-xs text-limestone-500">Accès sur invitation de l’administrateur</p>
    </section>

    <main class="flex flex-[1_1_480px] flex-col justify-start gap-10 px-4 pb-10 md:justify-center md:px-gutter md:py-16">
      <AppWordmark as="p" small class="-mx-4 min-h-11 border-b border-default p-4 md:hidden" />
      <div class="w-full max-w-[420px]">
        <slot />
      </div>
    </main>
  </div>
</template>
