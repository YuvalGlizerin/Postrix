'use client';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function urlHasAdhoc(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.location.pathname.includes('-adhoc-backoffice.postrix.io');
}

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setCodeSent(true);
        setMessage('Verification code sent! Check your email.');
        // In dev, the code is logged to console
        if (process.env.NODE_ENV === 'development') {
          console.log('Check server logs for the verification code');
        }
      } else {
        setMessage(data.error || 'Failed to send code');
      }
    } catch (error) {
      setMessage('Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    const result = await signIn('credentials', {
      email,
      code,
      callbackUrl,
      redirect: false
    });

    setIsLoading(false);

    if (result?.error) {
      setMessage('Invalid verification code. Please try again.');
      setCode('');
    } else if (result?.ok) {
      window.location.href = callbackUrl;
    }
  };

  return (
    <main className="flex min-h-[320px] w-full max-w-md flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white px-10 py-10 shadow-sm dark:border-zinc-800 dark:bg-black">
      <Image className="mb-6 dark:invert" src="/next.svg" alt="Logo" width={100} height={20} priority />

      <h1 className="mb-2 text-2xl font-semibold leading-8 tracking-tight text-black dark:text-zinc-50">
        Welcome to Backoffice
      </h1>

      <p className="mb-6 text-center text-sm text-zinc-600 dark:text-zinc-400">Sign in to continue</p>

      {(error || message) && (
        <div
          className={`mb-4 w-full rounded-md p-3 text-center text-sm ${
            error ||
            (message &&
              (message.toLowerCase().includes('invalid') ||
                message.toLowerCase().includes('failed') ||
                message.toLowerCase().includes('required') ||
                message.toLowerCase().includes('error')))
              ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
              : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400'
          }`}
        >
          {error === 'OAuthSignin' && 'Error occurred during Google authentication'}
          {error === 'OAuthCallback' && 'Error occurred during Google callback'}
          {error === 'OAuthCreateAccount' && 'Could not create account'}
          {error === 'Callback' && 'Authentication failed'}
          {error === 'Default' && 'An error occurred during sign in'}
          {message && !error && message}
        </div>
      )}

      {/* Email/Verification Code Form */}
      {!codeSent ? (
        <form onSubmit={handleSendCode} className="mb-4 w-full space-y-4">
          <div>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-600"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="cursor-pointer w-full rounded-lg border border-zinc-200 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isLoading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="mb-4 w-full space-y-4">
          <div>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Code sent to {email}</p>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              disabled={isLoading}
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-center text-2xl tracking-widest text-zinc-900 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-600"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode('');
                setMessage('');
              }}
              disabled={isLoading}
              className="cursor-pointer flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Change Email
            </button>
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="cursor-pointer flex-1 rounded-lg border border-zinc-200 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        </form>
      )}

      {!urlHasAdhoc() && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-zinc-500 dark:bg-black dark:text-zinc-400">Or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
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
          </button>
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
