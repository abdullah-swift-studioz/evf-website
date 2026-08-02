/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan every page so the build contains exactly the utilities in use.
  // dashboard.html is intentionally excluded: it still loads the Play CDN.
  content: ['./*.html', '!./dashboard.html', './script.js'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0F218B',
          green: '#006A4E',
          grey: '#696969',
        },
      },
    },
  },
  plugins: [],
}
