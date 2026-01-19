import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
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
          window.location.href = '/login';
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
