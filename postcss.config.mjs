/**
 * PostCSS Configuration
 *
 * This file configures PostCSS for all Next.js services in the monorepo.
 * PostCSS automatically searches up the directory tree, so all services
 * under /services will use this shared configuration.
 *
 * Currently configured plugins:
 * - @tailwindcss/postcss: Processes Tailwind CSS utility classes
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
