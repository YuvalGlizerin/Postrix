import Image from 'next/image';
import { Logger } from 'logger';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '../lib/auth';

import { LogoutButton } from './logout-button';

const logger = new Logger('Backoffice');

// Force this page to be dynamic so it logs on each request
export const dynamic = 'force-dynamic';

export default async function Home() {
  await logger.info(`Backoffice page loaded in ${process.env.ENV} environment`);

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-[260px] w-full max-w-md flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-10 py-10 shadow-sm dark:border-zinc-800 dark:bg-black">
        <Image className="mb-4 dark:invert" src="/next.svg" alt="Logo" width={100} height={20} priority />
        <h1 className="text-2xl font-semibold leading-8 tracking-tight text-black dark:text-zinc-50">Hello, world!</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You are logged in as <span className="font-medium">{session.user?.email}</span>.
        </p>
        <LogoutButton />
      </main>
    </div>
  );
}
