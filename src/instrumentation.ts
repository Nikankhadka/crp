/** Next.js server-start hook: migrate the database and import first-run seed data. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureBoot } = await import('./server/bootstrap');
    await ensureBoot();
  }
}
