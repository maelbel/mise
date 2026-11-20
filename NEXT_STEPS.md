# Next steps

Last updated: 2026-11-20. Repository: https://github.com/maelbel/mise (private).

## Done: the app in the "Mael Belliard" design, in French

Every screen follows the Mise canvas boards (desktop and phone): tokens,
Jost / Josefin Sans / JetBrains Mono, rules instead of boxes, 4 px corners,
header nav on desktop and tab bar on phones. Copy, dates ("Semaine du 16 au
22 novembre"), prices ("4,32 €"), Chef's suggestions and server messages are
in French. Stored codes (shelves, diets, tags, difficulty) stay in English
and are shown in French (`shared/utils/labels.ts`).

Checked with screenshots of every page at 1440 px and 390 px (headless Edge,
test database, throwaway account), compared with the boards; typecheck and
101 tests pass.

Known differences with the boards, on purpose:

- **Ingrédients**: "Ajouter un ingrédient" opens a dialog instead of a side
  panel, so the table keeps the full width.
- **Chef**: with a profile, the protein swap can pick a different recipe than
  the board shows (e.g. the burger rather than the salmon pasta for a
  2,320 kcal target), because the thresholds now follow your targets.

## Done: editing recipes and ingredients

"Modifier la recette" in a recipe's details and a pencil on each ingredient
row open the same forms as creation, filled in. Planned meals, stock and the
shopping list follow the change, since they point to the recipe or ingredient
itself. An ingredient's unit is fixed once a recipe or the pantry uses it
(their quantities are counted in that unit); its name, aisle and price can
always change. Deleting stays out of scope.

Use it to translate the data created before the switch to French (e.g. your
5 starter recipes). Renaming an ingredient also changes what Chef's "foods to
avoid" match, since they compare names.

## Done: typing the stock on the Réserve page

The amount between − and + is now a field: type it in the ingredient's own
unit (g, mL, pieces, tablespoons), with a comma or a dot, and it saves on
Enter or when you leave the field. Escape cancels; an amount that isn't a
number between 0 and 1 000 000 isn't saved and the field goes back. The
buttons still move by 100 g / 100 mL or by 1.

## Done: Nuxt UI and Tailwind CSS

Every screen is built from Nuxt UI 4 components with Tailwind CSS 4 classes;
no `<style>` blocks are left and `main.css` holds only the theme. The design
system is the Nuxt UI theme: palettes, fonts, 4 px corners and no shadows in
`app/assets/css/main.css`, component defaults and icons in `app/app.config.ts`.
Shared patterns are small components in `app/components/common`.

Checked step by step with screenshots of every page and dialog at 1440 px and
390 px (headless Brave, test database), compared with screenshots taken
before the migration: the screens look the same, within a pixel or two.
Typecheck and all 120 tests pass.

What changed on purpose:

- **Dropdowns** (difficulty, aisle, unit, ingredient, cooking time) are Nuxt
  UI menus instead of the browser's own lists.
- **The recipe sheet on phones** is a drawer that can also be swiped down.
- **Buttons and rows** get a light hover colour on desktop.
- **Links** are only the brass underlined ones (AppLink); the others are
  buttons.

## To check yourself

- [ ] Look at it on your phone. The screenshots can't show touch, scrolling
      feel or your phone's own date picker (headless Edge showed dates as
      MM/DD/YYYY; a French browser shows DD/MM/YYYY). Also check the stock
      field on the Réserve page: that the decimal keypad opens and that
      the row still fits next to long ingredient names. Since the move to
      Nuxt UI, also try the dropdowns and swiping the recipe sheet down.

## Afterwards (not started, each needs its own approval)

- **Dark theme.** The design system defines dark values for every colour token;
  the app only uses the light ones. With Nuxt UI this is mostly a `.dark`
  block of `--ui-*` colours in `main.css` and turning `ui.colorMode` back on
  in `nuxt.config.ts`.
- **Error colour.** The design system has none; the app uses a deep red
  (`--c-danger: #8a2b1d`) for errors only. Add it to the design system or pick
  another.
- **Chef's thresholds.** Decide whether a weekday dinner like the burger should
  be proposed for protein, or whether Chef should prefer lighter swaps.
- **Hosting for the family** (you said you'd handle it): set `NUXT_APP_SECRET`,
  serve over HTTPS (or `NUXT_SESSION_COOKIE_SECURE=false` on a plain-HTTP home
  network), see the README's deployment section.
- **Chef on the Claude API.** Chef runs on built-in rules; the `ChefAdvisor`
  interface is ready for a Claude-based advisor (`ANTHROPIC_API_KEY` is
  reserved in `.env.example`).
- **Backup.** The dump taken before the accounts migration sits in a temporary
  folder; move it somewhere permanent if you want to keep it.
