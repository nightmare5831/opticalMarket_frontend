'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cartStore';
import { getNavigationTabs, getHomePath } from '@/lib/navigation';
import BlingConnectionModal from '@/components/BlingConnectionModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  Package,
  Users,
  ClipboardList,
  LayoutDashboard,
  FolderOpen,
  Store,
  Tags,
  UserCircle,
  ShoppingCart,
  Receipt,
  Link as LinkIcon,
  LogOut,
  LogIn,
  UserPlus,
  Glasses,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  Users,
  ClipboardList,
  LayoutDashboard,
  FolderOpen,
  Store,
  Tags,
  UserCircle,
  ShoppingCart,
  Receipt,
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loggingOut } = useAuthStore();
  const { getItemCount } = useCartStore();
  const [showBlingModal, setShowBlingModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const navigationTabs = getNavigationTabs(user?.role, user?.status, user?.sellerType);
  const homePath = getHomePath(user?.role);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleNavigation = (path: string) => {
    if (path !== pathname) {
      setIsNavigating(true);
    }
    router.push(path);
  };

  return (
    <>
      <aside className="fixed top-0 left-0 h-screen w-[240px] bg-white border-r border-gray-200 z-40 flex flex-col">
        {/* Logo / Brand */}
        <div className="flex items-center h-16 px-5 border-b border-gray-200">
          <button
            onClick={() => router.push(homePath)}
            className="flex items-center gap-2.5 text-lg font-bold text-blue-600 hover:text-blue-700"
          >
            <Glasses className="w-6 h-6" />
            Optical Market
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigationTabs.map((tab) => {
            const isActive = pathname === tab.path;
            const IconComponent = tab.icon ? iconMap[tab.icon] : null;
            return (
              <button
                key={tab.path}
                onClick={() => handleNavigation(tab.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {IconComponent ? (
                  <IconComponent className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                ) : (
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  </span>
                )}
                <span className="truncate">{tab.label}</span>
                {tab.path.includes('/cart') && mounted && getItemCount() > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {getItemCount()}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 p-3 space-y-1">
          {/* Cart - For customers and unauthenticated users */}
          {(!user || user?.role === 'CUSTOMER') && (
            <Link
              href="/buyer/cart"
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                pathname === '/buyer/cart'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ShoppingCart className={`w-5 h-5 shrink-0 ${pathname === '/buyer/cart' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>Cart</span>
              {mounted && getItemCount() > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {getItemCount()}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <>
              {/* Bling Button - Sellers only */}
              {user.role === 'SELLER' && (
                <button
                  onClick={() => setShowBlingModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 transition"
                >
                  <LinkIcon className="w-5 h-5 shrink-0" />
                  <span>Bling</span>
                </button>
              )}

              {/* User Info */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900 truncate">{user.name}</span>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                <UserPlus className="w-4 h-4" />
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Bling Connection Modal */}
        {user && (
          <BlingConnectionModal
            isOpen={showBlingModal}
            onClose={() => setShowBlingModal(false)}
          />
        )}
      </aside>

      {/* Loading Spinner Overlay */}
      {(isNavigating || loggingOut) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <LoadingSpinner color="white" message={loggingOut ? 'Logging out...' : undefined} />
        </div>
      )}
    </>
  );
}
