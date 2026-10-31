import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '!./src/preview.tsx', '!./src/preview/**'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#ff6b3d',
        action: '#ff5722',
        'action-hover': '#e64a19',
        'background-light': '#f4f6f8',
        'background-dark': '#ffffff',
        'background-darker': '#f8fafc',
        'surface-dark': '#ffffff',
        'surface-border': '#e2e8f0',
        'text-secondary': '#667085',
        'text-muted': '#98a2b3',
        'progress-start': '#2563eb',
        'progress-end': '#22c55e',
        'progress-blue': '#0ea5e9',
        'progress-green': '#10b981',
        'progress-teal': '#14b8a6',
      },
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '0.75rem', lg: '1rem', xl: '1.25rem', full: '9999px' },
      boxShadow: {
        glow: '0 1px 2px rgba(15, 23, 42, 0.05)',
        'glow-action': '0 1px 2px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [forms, containerQueries],
};
