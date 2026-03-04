'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/AppLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import axios from 'axios';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Seller {
  id: string;
  name: string;
  email: string;
  status: string;
  commissionRate: string | null;
  mercadoPagoConnected: boolean;
  _count: { products: number; orders: number };
}

export default function PlatformSellersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { token } = useAuthStore();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Edit commission modal
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [commissionValue, setCommissionValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'PLATFORM_USER') { router.push('/'); return; }
    fetchSellers();
  }, [user, loading, router]);

  const fetchSellers = async () => {
    try {
      const res = await axios.get(`${API_URL}/products/platform/full-service-sellers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSellers(Array.isArray(res.data) ? res.data : []);
    } catch { setSellers([]); }
    finally { setDataLoading(false); }
  };

  const openEditModal = (seller: Seller) => {
    setEditingSeller(seller);
    setCommissionValue(seller.commissionRate ? String(Number(seller.commissionRate)) : '');
  };

  const handleSaveCommission = async () => {
    if (!editingSeller) return;
    const rate = parseFloat(commissionValue);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Commission rate must be between 0 and 100', toastConfig);
      return;
    }
    setSaving(true);
    try {
      await axios.patch(`${API_URL}/admin/users/${editingSeller.id}/commission`, { commissionRate: rate }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Commission updated to ${rate}%`, toastConfig);
      setEditingSeller(null);
      fetchSellers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update commission', toastConfig);
    } finally { setSaving(false); }
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Full-Service Sellers</h1>
          <p className="text-gray-600 mt-1">Manage commission rates for Full-Service sellers</p>
        </div>

        {dataLoading ? (
          <div className="text-center py-20">
            <LoadingSpinner />
          </div>
        ) : sellers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-900 text-lg font-semibold mb-2">No Full-Service sellers found</p>
            <p className="text-gray-500 text-sm">Full-Service sellers will appear here once registered</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">MP Connected</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Commission</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Products</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{seller.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{seller.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          seller.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          seller.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>{seller.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${seller.mercadoPagoConnected ? 'text-green-600' : 'text-gray-400'}`}>
                          {seller.mercadoPagoConnected ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {seller.commissionRate ? `${Number(seller.commissionRate)}%` : 'Not set'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{seller._count?.products ?? 0}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openEditModal(seller)}
                          className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
                        >
                          Edit Commission
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Edit Commission Modal */}
      {editingSeller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full shadow-xl">
            <div className="border-b p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Edit Commission Rate</h2>
              <button onClick={() => setEditingSeller(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Seller: <span className="font-medium text-gray-900">{editingSeller.name}</span></p>
              <div>
                <label className="block text-sm font-medium mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. 20"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveCommission} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditingSeller(null)} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
