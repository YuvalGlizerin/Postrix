import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Logger } from 'logger';

import { authOptions } from '../lib/auth';

import { LogoutButton } from './logout-button';

const logger = new Logger('Backoffice');

// Force this page to be dynamic so it logs on each request
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  logger.info('User accessed home page', { user: session.user.email });

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Image className="dark:invert" src="/next.svg" alt="Logo" width={80} height={20} priority />
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Backoffice</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || ''}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="text-sm">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{session.user.name}</p>
                <p className="text-zinc-600 dark:text-zinc-400">{session.user.email}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Welcome to Postrix Backoffice
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            You are successfully authenticated and can now access the backoffice features.
          </p>
          <div className="mt-6 space-y-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium">Email:</span> {session.user.email}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
