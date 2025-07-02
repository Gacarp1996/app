// postcss.config.js (Forma nueva y correcta)
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // <--- ¡Este es el cambio!
    autoprefixer: {},
  },
};