/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            maxWidth: '72ch',
            color: theme('colors.gray.800'),
            a: {
              color: theme('colors.brand.700'),
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              fontWeight: '500',
              '&:hover': {
                color: theme('colors.brand.800'),
              },
            },
            h1: { fontWeight: '700', letterSpacing: '-0.02em' },
            h2: { fontWeight: '700', letterSpacing: '-0.01em', marginTop: '2em' },
            h3: { fontWeight: '600', marginTop: '1.5em' },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            code: {
              backgroundColor: theme('colors.gray.100'),
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '500',
            },
            blockquote: {
              borderLeftColor: theme('colors.brand.500'),
              backgroundColor: theme('colors.brand.50'),
              padding: '1rem 1.5rem',
              fontStyle: 'normal',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
