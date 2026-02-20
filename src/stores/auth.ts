import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'PLATFORM_USER';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  sellerType?: 'B2C_MERCHANT' | 'B2B_SUPPLIER' | 'FULL_SERVICE';
  cnpj?: string;
  legalCompanyName?: string;
  mercadoPagoConnected?: boolean;
  mercadoPagoAccountId?: string;
  commissionRate?: number | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loggingOut: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loggingOut: false,
      setAuth: (user, token) => set({ user, token, loggingOut: false }),
      logout: () => {
        set({ user: null, token: null, loggingOut: true });
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
