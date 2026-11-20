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
    // Fields: 44 px, 15 px text, a 1 px stone outline.
    input: {
      slots: {
        // No browser up/down arrows in number fields: typing and the ↑ ↓ keys still work.
        base: '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none',
      },
      variants: {
        size: {
          md: { base: 'min-h-11 px-4 py-0 text-[15px] gap-2', leading: 'ps-4', trailing: 'pe-4', leadingIcon: 'size-4', trailingIcon: 'size-4' },
        },
      },
      compoundVariants: [
        { leading: true, size: 'md', class: 'ps-11' },
        // Nuxt UI drops fields to 14 px on desktop: keep 15 px.
        { fixed: false, size: 'md', class: 'md:text-[15px]' },
        { trailing: true, size: 'md', class: 'pe-11' },
      ],
    },
    select: {
      slots: {
        content: 'rounded-sm ring-default',
        item: 'min-h-11 text-[15px]',
      },
      variants: {
        size: {
          md: { base: 'min-h-11 px-4 py-0 text-[15px] gap-2', trailing: 'pe-4', trailingIcon: 'size-4', item: 'text-[15px]' },
        },
      },
      compoundVariants: [
        { trailing: true, size: 'md', class: 'pe-11' },
        { fixed: false, size: 'md', class: 'md:text-[15px]' },
      ],
    },
    formField: {
      slots: {
        label: 'font-normal text-sm text-muted',
      },
      // 8 px between a label and its field.
      variants: { orientation: { vertical: { container: 'mt-2' } } },
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
