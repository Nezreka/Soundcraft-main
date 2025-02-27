/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: "#121212",
        surface: "#1E1E1E",
        primary: "#BB86FC",
        secondary: "#03DAC6",
        accent: "#CF6679",
        text: {
          primary: "#E1E1E1",
          secondary: "#B0B0B0"
        }
      },
      boxShadow: {
        'neumorphic-inset': 'inset 3px 3px 7px rgba(0, 0, 0, 0.5), inset -3px -3px 7px rgba(255, 255, 255, 0.05)',
        'neumorphic': '5px 5px 10px rgba(0, 0, 0, 0.5), -5px -5px 10px rgba(255, 255, 255, 0.05)'
      },
      backdropFilter: {
        'glass': 'blur(16px) saturate(180%)'
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}