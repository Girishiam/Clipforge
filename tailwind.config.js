/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF8F2',
        coral: {
          DEFAULT: '#FE5936',
          hover: '#E24523',
          subtle: '#FFF1ED',
        },
        lime: {
          DEFAULT: '#C9E865',
          dark: '#7D9929',
          subtle: '#F6FCE8',
        },
        botanical: {
          DEFAULT: '#202822',
          light: '#2E3830',
        },
        stone: {
          DEFAULT: '#E8E3D8',
          subtle: '#F4F0E8',
        },
        olive: {
          DEFAULT: '#6B7169',
          light: '#8A9188',
        },
        surface: {
          DEFAULT: '#F1EFE8',
          card: '#FFFFFF',
        },
        forest: {
          DEFAULT: '#3C7458',
          subtle: '#EDF5F1',
        },
        crimson: {
          DEFAULT: '#C4493F',
          subtle: '#FCEDEC',
        },
      },
      fontFamily: {
        heading: ['Manrope', 'Plus Jakarta Sans', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '3px',
        sm: '5px',
        DEFAULT: '7px',
        md: '9px',
        lg: '12px',
      },
      boxShadow: {
        minimal: '0 1px 2px rgba(32, 40, 34, 0.04)',
        hover: '0 2px 5px rgba(32, 40, 34, 0.07)',
      },
    },
  },
  plugins: [],
}
