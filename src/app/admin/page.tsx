'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Request from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [blingStatus, setBlingStatus] = useState<any>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      router.push('/login');
    } else if (user.role !== 'ADMIN') {
      router.push('/');
    } else {
      checkBlingStatus();
    }
  }, [user, loading, router]);

  const checkBlingStatus = async () => {
    setCheckLoading(true);
    setMessage('');
    try {
      const status = await Request.Get('/bling/status');
      setBlingStatus(status);
      setMessage('✅ Connection status checked successfully');
    } catch (error: any) {
      console.error('Failed to check Bling status:', error);
      setMessage(`❌ Failed to check connection: ${error?.response?.data?.message || error.message || 'Unknown error'}`);
      setBlingStatus(null);
    } finally {
      setCheckLoading(false);
    }
  };


  const syncProducts = async () => {
    setSyncLoading(true);
    setMessage('');
    setProducts([]);
    try {
      const data = await Request.Get('/bling/sync/products');
      setProducts(data.data || []);

      if (data.data && data.data.length === 0) {
        setMessage('⚠️ No products found in your Bling ERP account. Please add products in Bling first.');
      } else if (data.data && data.data.length > 0) {
        setMessage(`✅ Successfully synced ${data.data.length} products from Bling!`);
      } else {
        setMessage(`✅ ${data.message || 'Sync completed successfully'}`);
      }

      console.log('Sync result:', data);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error.message || 'Unknown error';
      setMessage(`❌ Failed to sync products: ${errorMessage}`);
      console.error('Sync error:', error);
      console.error('Error response:', error?.response?.data);
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading || !user) {
    return null;
  }

  if (user.role !== 'ADMIN') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <a
              href="#"
              className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Users
            </a>
            <a
              href="#"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Products
            </a>
            <a
              href="#"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Orders
            </a>
            <a
              href="#"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Categories
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Revenue</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">R$ 0</p>
          </div>
        </div>

        {/* Bling ERP Integration */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Bling ERP Integration</h2>
          <div className="flex gap-3 mb-4">
            <button
              onClick={checkBlingStatus}
              disabled={checkLoading}
              className="px-4 py-2 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              {checkLoading ? 'Checking...' : 'Check Connection'}
            </button>
            {blingStatus?.connected && (
              <button
                onClick={syncProducts}
                disabled={syncLoading}
                className="px-4 py-2 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300"
              >
                {syncLoading ? 'Syncing...' : 'Sync Products'}
              </button>
            )}
          </div>
          {blingStatus && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${blingStatus.connected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-sm font-medium">
                  {blingStatus.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{blingStatus.message}</p>
              {blingStatus.expiresAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Token expires: {new Date(blingStatus.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Result Message and Products Table */}
        {message && (
          <div className={`mb-8 rounded-lg ${message.includes('✅') ? 'bg-green-50 border border-green-200' : message.includes('⚠️') ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
            <div className={`p-4 ${message.includes('✅') ? 'text-green-800' : message.includes('⚠️') ? 'text-yellow-800' : 'text-red-800'}`}>
              {message}
            </div>

            {/* Products Table - shown after success message */}
            {products.length > 0 && message.includes('✅') && (
              <div className="p-4 pt-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Stock
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Category
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product: any, index: number) => (
                        <tr key={product.id || index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            {product.sku}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-300">
                            {product.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            R$ {parseFloat(product.price).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            {product.stock}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {product.categoryId || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="px-4 py-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-left">
              <div className="font-medium">Approve Sellers</div>
              <div className="text-sm text-blue-600">Manage seller approvals</div>
            </button>
            <button className="px-4 py-3 bg-green-50 text-green-700 rounded-md hover:bg-green-100 text-left">
              <div className="font-medium">Manage Products</div>
              <div className="text-sm text-green-600">View and moderate products</div>
            </button>
            <button className="px-4 py-3 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 text-left">
              <div className="font-medium">View Orders</div>
              <div className="text-sm text-purple-600">Monitor all orders</div>
            </button>
          </div>
        </div>

        {/* Info Message */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Milestone 1:</strong> Admin panel structure created. Full functionality will be implemented in subsequent milestones.
          </p>
        </div>
      </main>
    </div>
  );
}
