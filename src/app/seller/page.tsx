'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Request from '@/lib/api';
import Header from '@/components/Header';

interface DashboardData {
  orderCount: number;
  productCount: number;
  pendingProducts: number;
  approvedProducts: number;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<DashboardData>({
    orderCount: 0,
    productCount: 0,
    pendingProducts: 0,
    approvedProducts: 0,
  });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'SELLER') {
      router.push('/');
      return;
    }
    fetchDashboardData();
  }, [user, loading, router]);

  const fetchDashboardData = async () => {
    try {
      const [orders, products] = await Promise.all([
        Request.Get('/orders/seller').catch(() => []),
        Request.Get('/products/seller/me').catch(() => []),
      ]);

      const orderList = Array.isArray(orders) ? orders : [];
      const productList = Array.isArray(products) ? products : [];

      setData({
        orderCount: orderList.length,
        productCount: productList.length,
        pendingProducts: productList.filter((p: any) => p.status === 'PENDING').length,
        approvedProducts: productList.filter((p: any) => p.status === 'APPROVED').length,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user || user.role !== 'SELLER') return null;

  const isPending = user.status === 'PENDING';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-8 px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Seller Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}</p>
        </div>

        {/* Pending Account Banner */}
        {isPending && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-800">Account Pending Approval</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your seller account is awaiting admin approval. You can complete your profile, connect Mercado Pago, and create product drafts.
                You cannot submit products for approval or receive orders until approved.
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Account Status</h3>
            <div className="mt-3">
              <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                user.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {user.status}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Seller Type</h3>
            <div className="mt-3">
              <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                user.sellerType === 'B2C_MERCHANT' ? 'bg-cyan-100 text-cyan-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {user.sellerType === 'B2C_MERCHANT' ? 'B2C Merchant' : 'B2B Supplier'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {dataLoading ? '...' : data.productCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {dataLoading ? '' : `${data.approvedProducts} approved, ${data.pendingProducts} pending`}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {dataLoading ? '...' : data.orderCount}
            </p>
          </div>
        </div>

        {/* MP Connection & Business Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Mercado Pago Connection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Connection</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">Mercado Pago</div>
                {user.mercadoPagoConnected ? (
                  <span className="flex items-center gap-1 text-sm text-green-700 mt-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-yellow-700 mt-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    Not Connected
                  </span>
                )}
              </div>
              <button
                onClick={() => router.push('/seller/profile')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                  user.mercadoPagoConnected
                    ? 'text-gray-600 border border-gray-300 hover:bg-gray-50'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {user.mercadoPagoConnected ? 'Manage' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Business Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Company Name</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.legalCompanyName || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">CNPJ</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.cnpj || 'Not set'}
                </span>
              </div>
              {(!user.legalCompanyName || !user.cnpj) && (
                <button
                  onClick={() => router.push('/seller/profile')}
                  className="w-full mt-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
                >
                  Complete Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/seller/products')}
              className="px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-left border border-blue-100 transition"
            >
              <div className="font-medium">My Listings</div>
              <div className="text-sm text-blue-600">Manage your products</div>
            </button>
            <button
              onClick={() => router.push('/seller/orders')}
              disabled={isPending}
              className={`px-4 py-3 rounded-lg text-left border transition ${
                isPending
                  ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                  : 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100'
              }`}
            >
              <div className="font-medium">View Orders</div>
              <div className={`text-sm ${isPending ? 'text-gray-400' : 'text-green-600'}`}>
                {isPending ? 'Available after approval' : 'Manage customer orders'}
              </div>
            </button>
            <button
              onClick={() => router.push('/seller/profile')}
              className="px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-left border border-purple-100 transition"
            >
              <div className="font-medium">Profile & Payments</div>
              <div className="text-sm text-purple-600">Business info & Mercado Pago</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
