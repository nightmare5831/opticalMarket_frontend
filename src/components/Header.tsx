'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { getNavigationTabs, getHomePath } from '@/lib/navigation';
import BlingConnectionModal from '@/components/BlingConnectionModal';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showBlingModal, setShowBlingModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const navigationTabs = getNavigationTabs(user?.role);
  const homePath = getHomePath(user?.role);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleNavigation = (path: string) => {
    if (path !== pathname) {
      setIsNavigating(true);
    }
    router.push(path);
  };

  if (!user) return null;

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <div className="mx-8 px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-8">
            <button
              onClick={() => router.push(homePath)}
              className="text-xl font-bold text-blue-600 hover:text-blue-700"
            >
              Optical Market
            </button>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigationTabs.map((tab) => {
                const isActive = pathname === tab.path;
                return (
                  <button
                    key={tab.path}
                    onClick={() => handleNavigation(tab.path)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <p className="hidden sm:block text-sm font-medium text-gray-900">{user.name}</p>

            {/* Connect Bling Button */}
            {(user?.role === 'ADMIN' || user?.role === 'SELLER') && (
              <button
                onClick={() => setShowBlingModal(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                title="Connect Bling ERP"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span>Bling</span>
              </button>
            )}

            {/* Logout Icon Button */}
            <button
              onClick={logout}
              className="p-2 text-red-600 border border-red-600 rounded-full hover:bg-red-50 transition"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bling Connection Modal */}
      <BlingConnectionModal
        isOpen={showBlingModal}
        onClose={() => setShowBlingModal(false)}
      />

      {/* Loading Spinner Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </header>
  );
}
