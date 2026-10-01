/** Next.js server-start hook: create storage, seed first-run data and clear interrupted jobs. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureBoot } = await import('./server/bootstrap');
    ensureBoot();
  }
}
