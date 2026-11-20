// Nuxt UI theme for the "Mael Belliard" design system. Palettes, fonts and
// --ui-* variables are in app/assets/css/main.css.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brass',
      neutral: 'limestone',
      error: 'oxblood',
    },
    // Nuxt UI's own icons, drawn from the design system's line icons.
    icons: {
      check: 'i-mise-check',
      chevronDown: 'i-mise-chevron-down',
      chevronLeft: 'i-mise-chevron-left',
      chevronRight: 'i-mise-chevron-right',
      chevronUp: 'i-mise-chevron-up',
      close: 'i-mise-close',
      edit: 'i-mise-edit',
      eye: 'i-mise-eye',
      eyeOff: 'i-mise-eye-off',
      info: 'i-mise-info',
      caution: 'i-mise-info',
      error: 'i-mise-info',
      warning: 'i-mise-info',
      loading: 'i-mise-loading',
      minus: 'i-mise-minus',
      plus: 'i-mise-plus',
      search: 'i-mise-search',
      trash: 'i-mise-trash',
    },
    // 44 px tap targets, 15 px text, outlined by default; ink when solid.
    button: {
      slots: {
        base: 'font-normal disabled:opacity-40 aria-disabled:opacity-40',
        // Only the label: buttons laid out as cards keep the 1.5 line height inside.
        label: 'leading-tight',
      },
      variants: {
        size: {
          md: { base: 'min-h-11 px-4 py-0 text-[15px] gap-2', leadingIcon: 'size-4', trailingIcon: 'size-4' },
        },
      },
      compoundVariants: [
        { square: true, size: 'md', class: 'size-11 p-0 justify-center' },
        { color: 'neutral', variant: 'solid', class: 'font-medium' },
      ],
      defaultVariants: { variant: 'outline' },
    },
    // Messages: no box, a rule above and below in the text colour (red for errors).
    alert: {
      slots: {
        root: 'rounded-none px-0 py-2 gap-4',
        title: 'text-[15px] font-normal',
        description: 'text-[15px] opacity-100',
        actions: 'gap-2',
      },
      compoundVariants: [
        { variant: 'outline', class: { root: 'ring-0 border-y border-current bg-transparent' } },
      ],
      defaultVariants: { variant: 'outline' },
    },
  },
})
