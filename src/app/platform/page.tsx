'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Request from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function PlatformDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({ totalProducts: 0, totalSellers: 0, totalOrders: 0 });
  const [sellers, setSellers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'PLATFORM_USER') { router.push('/'); return; }
    fetchData();
  }, [user, loading, router]);

  const fetchData = async () => {
    try {
      const [productsRes, sellersRes] = await Promise.all([
        Request.Get('/products/platform/products?limit=1'),
        Request.Get('/products/platform/full-service-sellers'),
      ]);
      const sellerList = Array.isArray(sellersRes) ? sellersRes : [];
      setSellers(sellerList);
      setStats({
        totalProducts: productsRes?.meta?.total ?? 0,
        totalSellers: sellerList.length,
        totalOrders: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading || !user || user.role !== 'PLATFORM_USER') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="mx-8 px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Platform Dashboard</h1>
          <p className="text-gray-600">Manage Full-Service sellers and products</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Full-Service Products</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{dataLoading ? '...' : stats.totalProducts}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Full-Service Sellers</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{dataLoading ? '...' : stats.totalSellers}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Role</h3>
            <div className="mt-3">
              <span className="px-3 py-1.5 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800">
                Platform User
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => router.push('/platform/products')} className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-left border border-blue-100 transition">
              <div className="font-medium">Manage Products</div>
              <div className="text-sm text-blue-600">Create and manage Full-Service products</div>
            </button>
            <button onClick={() => router.push('/platform/sellers')} className="px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-left border border-green-100 transition">
              <div className="font-medium">Manage Sellers</div>
              <div className="text-sm text-green-600">View and configure commission rates</div>
            </button>
            <button onClick={() => router.push('/platform/products')} className="px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-left border border-purple-100 transition">
              <div className="font-medium">CSV Import</div>
              <div className="text-sm text-purple-600">Bulk import products via CSV</div>
            </button>
          </div>
        </div>

        {/* Recent Sellers */}
        {sellers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Full-Service Sellers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Commission</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sellers.slice(0, 5).map((seller: any) => (
                    <tr key={seller.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{seller.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{seller.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{seller.commissionRate ? `${Number(seller.commissionRate)}%` : 'Not set'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          seller.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>{seller.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
