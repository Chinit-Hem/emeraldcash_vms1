/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        border: 'var(--border)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        primary: 'var(--primary)',
        danger: 'var(--danger)',
      },
      boxShadow: {
        glass: '0 8px 24px rgba(15,23,42,0.08)',
        'glass-dark': '0 10px 26px rgba(2,6,23,0.26)',
      },
    },
  },
  plugins: [],
}
