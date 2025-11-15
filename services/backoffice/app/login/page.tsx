'use client';

import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const handleSignIn = () => {
    // Capture the current origin to redirect back after OAuth
    // This is crucial for ephemeral environments with dynamic domains
    const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';

    signIn('google', { callbackUrl });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <main className="flex min-h-[260px] w-full max-w-md flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-10 py-10 shadow-lg">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold text-zinc-50">Postrix</div>
          <p className="mt-2 text-sm text-zinc-400">Backoffice access</p>
        </div>

        <button
          onClick={handleSignIn}
          className="flex w-full items-center justify-center gap-2 rounded border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm font-medium text-zinc-100 shadow-sm hover:border-zinc-500 hover:bg-zinc-750/80 cursor-pointer"
        >
          <span className="text-zinc-100">Sign in with Google</span>
        </button>

        <p className="mt-4 text-xs text-zinc-500">
          Only <span className="font-semibold text-zinc-300">@postrix.io</span> accounts are allowed.
        </p>
      </main>
    </div>
  );
}
