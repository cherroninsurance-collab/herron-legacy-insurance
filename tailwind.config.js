/** Tailwind config for experience.html.
 *  Build:  npx tailwindcss -c tailwind.config.js -i src/experience.tw.css -o experience.css --minify
 *  The compiled experience.css is committed, so the page ships with no CDN and
 *  no build step required to serve it. */
module.exports = {
  content: ['./experience.html'],
  theme: {
    extend: {
      fontFamily: {
        // A high-contrast didone: hairline serifs against heavy stems. It is
        // what makes the page read as an engraved certificate rather than
        // another dark SaaS landing page.
        display: ['"Playfair Display"', 'Didot', '"Bodoni MT"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        obsidian: '#030712',
        vault: { 900: '#0F172A', 800: '#0B132B', indigo: '#1E1B4B' },
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [require('@tailwindcss/forms')({ strategy: 'base' })],
};
