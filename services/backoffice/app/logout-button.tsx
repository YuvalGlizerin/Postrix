'use client';

import { signOut } from 'next-auth/react';

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="mt-6 rounded-full bg-zinc-200 px-5 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-300 cursor-pointer"
    >
      Logout
    </button>
  );
}
