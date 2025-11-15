'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const isEphemeralEnvironment = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  const hostname = window.location.hostname;
  // Check if this is an ephemeral environment (not prod, dev, or localhost)
  const isPersistent =
    hostname === 'backoffice.postrix.io' || // prod
    hostname === 'dev-backoffice.postrix.io' || // dev
    hostname === 'localhost'; // local
  return !isPersistent;
};

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  // If already authenticated, redirect to home
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleSignIn = () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isEphemeralEnvironment()) {
      // For ephemeral environments, open production OAuth in popup
      // The session cookie will be shared via .postrix.io domain
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      // Listen for message from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin === 'https://backoffice.postrix.io' && event.data === 'oauth-success') {
          window.removeEventListener('message', handleMessage);
          // Reload to pick up the session
          window.location.reload();
        }
      };
      window.addEventListener('message', handleMessage);

      const successUrl = encodeURIComponent('https://backoffice.postrix.io/api/auth/oauth-success');
      const popup = window.open(
        `https://backoffice.postrix.io/api/auth/signin/google?callbackUrl=${successUrl}`,
        'oauth-popup',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Fallback: Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          // Popup closed, check if we have a session now
          window.location.reload();
        }
      }, 500);
    } else {
      // For persistent environments (prod, dev, localhost), use normal OAuth
      const callbackUrl = `${window.location.origin}/`;
      signIn('google', { callbackUrl });
    }
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
