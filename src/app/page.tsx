'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-4 p-8 border-2 border-gray-300 rounded-xl bg-white shadow-lg">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4 rounded-full border-4 border-gray-300 overflow-hidden">
            <Image
              src="/assets/user.png"
              alt="User Avatar"
              fill
              className="object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Optical Market
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Hello, {user.name}!
          </p>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-gray-700">
              You are logged in as <span className="font-semibold">{user.role}</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
