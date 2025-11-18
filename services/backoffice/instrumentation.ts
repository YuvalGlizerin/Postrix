/**
 * Next.js Instrumentation
 *
 * This file runs when the Next.js server starts, before any pages or routes load.
 * It's the ideal place to load environment variables, set up monitoring, etc.
 *
 * IMPORTANT: Next.js calls register() TWICE:
 * 1. Once for Edge Runtime (lightweight, runs on CDN, no Node.js APIs like fs/os)
 * 2. Once for Node.js Runtime (full Node.js with all APIs)
 *
 * We only want to run our code in Node.js runtime because our packages (env-loader, logger)
 * use Node.js modules like 'fs' and 'os' which don't exist in Edge Runtime.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Check which runtime is calling us: 'nodejs' or 'edge'
  // We only run in Node.js runtime because our dependencies need Node.js APIs
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic imports (await import) ensure these modules are only loaded when this code runs,
    // not at build time. This prevents Next.js from trying to bundle Node.js modules for Edge Runtime.
    await import('env-loader');
    await import('secret-manager');
  }
  // When NEXT_RUNTIME === 'edge', this function does nothing and returns immediately
}
