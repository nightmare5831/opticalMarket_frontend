'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Request from '@/lib/api';
import Header from '@/components/Header';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { toastConfig } from '@/lib/toast';

interface DashboardStats {
  summary: {
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    revenue: number;
  };
  usersByRole: Record<string, number>;
  ordersByStatus: Record<string, number>;
  recentOrders: any[];
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      router.push('/auth/login');
    } else if (user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || user.role !== 'ADMIN') return;
      try {
        const data = await Request.Get('/admin/dashboard/stats');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (user && user.role === 'ADMIN') {
      fetchStats();
    }
  }, [user]);

  if (loading || !user) {
    return null;
  }

  if (user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer />

      {/* Main Content */}
      <main className="mx-8 px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your platform, users, and products</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {statsLoading ? '...' : stats?.summary.totalUsers || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {statsLoading ? '...' : stats?.summary.totalProducts || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {statsLoading ? '...' : stats?.summary.totalOrders || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              R$ {statsLoading ? '...' : (stats?.summary.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/users')}
              className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-left border border-blue-100"
            >
              <div className="font-medium">Manage Users</div>
              <div className="text-sm text-blue-600">View and manage all users</div>
            </button>
            <button
              onClick={() => router.push('/admin/products')}
              className="px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-left border border-green-100"
            >
              <div className="font-medium">Manage Products</div>
              <div className="text-sm text-green-600">View and moderate products</div>
            </button>
            <button
              onClick={() => router.push('/admin/orders')}
              className="px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-left border border-purple-100"
            >
              <div className="font-medium">View Orders</div>
              <div className="text-sm text-purple-600">Monitor all orders</div>
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}
