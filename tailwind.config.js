// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        primary: '#2196F3',
        secondary: '#13a4ec',
        danger: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',

        // Backgrounds (Light / Dark)
        background: {
          light: '#ffffff',
          dark: '#0a0a0a', // Deep OLED black
        },
        surface: {
          light: '#f8f9fa', // Light gray for cards
          dark: '#171717', // Neutral 900 for cards
        },
        surfaceHighlight: {
          light: '#f1f5f9',
          dark: '#262626',
        },

        // Typography
        text: {
          primary: {
            light: '#0f172a', // Slate 900
            dark: '#f8fafc', // Slate 50
          },
          secondary: {
            light: '#64748b', // Slate 500
            dark: '#94a3b8', // Slate 400
          },
        },
        border: {
          light: '#e2e8f0',
          dark: '#262626',
        },
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
