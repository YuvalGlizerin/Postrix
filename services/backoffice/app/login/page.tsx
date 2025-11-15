'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { signInWithPopup, shouldUsePopupAuth } from '../../components/popup-auth';

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [isLoading, setIsLoading] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    // Use popup auth for ephemeral environments
    if (shouldUsePopupAuth()) {
      setIsLoading(true);
      setPopupError(null);
      try {
        await signInWithPopup('google');
        // Page will reload on success
      } catch (err) {
        setIsLoading(false);
        setPopupError(err instanceof Error ? err.message : 'Authentication failed');
      }
    } else {
      // Use standard OAuth flow for production/dev
      signIn('google', { callbackUrl });
    }
  };

  const handleDevSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    signIn('credentials', { email, callbackUrl });
  };

  // Check if dev bypass is enabled
  const isDevBypass =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('-adhoc-') ||
      window.location.hostname.includes('-ephemeral-') ||
      window.location.hostname.includes('preview-'));

  const usePopup = typeof window !== 'undefined' && shouldUsePopupAuth();

  return (
    <main className="flex min-h-[320px] w-full max-w-md flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-10 py-10 shadow-sm dark:border-zinc-800 dark:bg-black">
      <Image className="mb-6 dark:invert" src="/next.svg" alt="Logo" width={100} height={20} priority />

      <h1 className="mb-2 text-2xl font-semibold leading-8 tracking-tight text-black dark:text-zinc-50">
        Welcome to Backoffice
      </h1>

      <p className="mb-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Please sign in with your Google account to continue
      </p>

      {(error || popupError) && (
        <div className="mb-4 w-full rounded-md bg-red-50 p-3 text-center text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {popupError || (
            <>
              {error === 'OAuthSignin' && 'Error occurred during authentication'}
              {error === 'OAuthCallback' && 'Error occurred during callback'}
              {error === 'OAuthCreateAccount' && 'Could not create account'}
              {error === 'Callback' && 'Authentication failed'}
              {error === 'Default' && 'An error occurred during sign in'}
            </>
          )}
        </div>
      )}

      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
            Authenticating...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </>
        )}
      </button>

      {usePopup && (
        <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          ✨ Using popup authentication for this environment
        </p>
      )}

      {isDevBypass && (
        <>
          <div className="my-4 flex w-full items-center">
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
            <span className="mx-3 text-xs text-zinc-500 dark:text-zinc-400">OR</span>
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
          </div>

          <form onSubmit={handleDevSignIn} className="w-full space-y-3">
            <input
              type="email"
              name="email"
              placeholder="dev@postrix.io"
              pattern=".*@postrix\.io$"
              required
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign in (Dev Mode)
            </button>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Dev bypass for ephemeral environments
            </p>
          </form>
        </>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Suspense
        fallback={
          <main className="flex min-h-[320px] w-full max-w-md flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-10 py-10 shadow-sm dark:border-zinc-800 dark:bg-black">
            <div className="animate-pulse">Loading...</div>
          </main>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
