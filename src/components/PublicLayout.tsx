'use client';

import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Floating top-right buttons */}
      <div className="absolute top-10 right-12 z-40 flex items-center gap-8">
        <Link
          href="/about"
          className="text-base font-semibold text-gray-500 hover:text-gray-900 transition"
        >
          About
        </Link>
        <Link
          href="/auth/login"
          className="text-base font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          Login
        </Link>
      </div>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
