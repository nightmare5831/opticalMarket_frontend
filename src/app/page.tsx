'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Request from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [blingStatus, setBlingStatus] = useState<any>(null);
  const [blingLoading, setBlingLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait for auth to load

    if (!user) {
      router.push('/login');
    } else if (user.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [user, loading, router]);

  const checkBlingStatus = async () => {
    setBlingLoading(true);
    try {
      const data = await Request.Get('/bling/status');
      setBlingStatus(data);
    } catch (error: any) {
      setBlingStatus({ error: error.message || 'Failed to check Bling status' });
    } finally {
      setBlingLoading(false);
    }
  };

  const syncProducts = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const data = await Request.Get('/bling/sync/products');
      setSyncResult({ success: true, data });
    } catch (error: any) {
      setSyncResult({ success: false, error: error.message || 'Failed to sync products' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleConnectBling = async () => {
    if (!invitationUrl.trim() || !clientSecret.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setConnectLoading(true);
    try {
      // Extract client_id and state from invitation URL
      const url = new URL(invitationUrl);
      const clientId = url.searchParams.get('client_id');
      const state = url.searchParams.get('state');

      if (!clientId || !state) {
        alert('Invalid invitation URL: missing client_id or state parameter');
        setConnectLoading(false);
        return;
      }

      // Save credentials to backend
      await Request.Post('/bling/credentials', { clientId, clientSecret, state });

      setShowModal(false);
      setInvitationUrl('');
      setClientSecret('');

      // Redirect to Bling OAuth using the invitation URL
      window.location.href = invitationUrl;
    } catch (error: any) {
      alert('Failed to connect: ' + (error?.response?.data?.message || error.message || 'Unknown error'));
      setConnectLoading(false);
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative w-12 h-12 rounded-full border-2 border-gray-300 overflow-hidden">
              <Image
                src="/assets/user.png"
                alt="User Avatar"
                fill
                className="object-cover"
              />
            </div>
            <span className="font-semibold text-gray-900">{user.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {!blingStatus?.configured && (
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                Connect Bling Account
              </button>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Optical Market
          </h1>
          <p className="text-xl text-gray-600">
            Hello, {user.name}! You are logged in as <span className="font-semibold">{user.role}</span>
          </p>
        </div>

        {/* ERP Test Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Bling ERP Integration Test
          </h2>

          {/* API Connection Status */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="font-semibold text-lg mb-4">1. API Connection Status</h3>
            <button
              onClick={checkBlingStatus}
              disabled={blingLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {blingLoading ? 'Checking...' : 'Check Connection'}
            </button>
            {blingStatus && (
              <div className={`p-4 rounded-lg ${blingStatus.error ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                {blingStatus.error ? (
                  <p className="text-red-700">{blingStatus.error}</p>
                ) : (
                  <>
                    <p className={`font-medium text-lg ${blingStatus.configured ? 'text-green-700' : 'text-orange-700'}`}>
                      Status: {blingStatus.configured ? 'Connected ✓' : 'Not Configured'}
                    </p>
                    <p className="text-gray-700 mt-1">{blingStatus.message}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Product Sync */}
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="font-semibold text-lg mb-4">2. Sync Products</h3>
            <button
              onClick={syncProducts}
              disabled={syncLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {syncLoading ? 'Syncing...' : 'Sync Products'}
            </button>

            {syncResult && (
              <div className="mt-4">
                {syncResult.success ? (
                  <div>
                    <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg mb-4">
                      <p className="font-medium text-green-700 text-lg">Sync Completed ✓</p>
                      <p className="text-gray-700 mt-1">{syncResult.data.message}</p>
                    </div>

                    {/* Product Table */}
                    {syncResult.data.data && syncResult.data.data.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 px-4 py-2 text-left">SKU</th>
                              <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                              <th className="border border-gray-300 px-4 py-2 text-left">Price</th>
                              <th className="border border-gray-300 px-4 py-2 text-left">Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {syncResult.data.data.map((product: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2">{product.sku}</td>
                                <td className="border border-gray-300 px-4 py-2">{product.name}</td>
                                <td className="border border-gray-300 px-4 py-2">${product.price}</td>
                                <td className="border border-gray-300 px-4 py-2">{product.stock}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg">
                    <p className="text-red-700">{syncResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal for Bling Credentials */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Connect Bling Account</h3>
            <p className="text-gray-600 mb-4">Enter your Bling invitation URL and Client Secret:</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invitation URL
                </label>
                <input
                  type="text"
                  value={invitationUrl}
                  onChange={(e) => setInvitationUrl(e.target.value)}
                  placeholder="https://www.bling.com.br/Api/v3/oauth/authorize?..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter your Bling Client Secret"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setInvitationUrl('');
                  setClientSecret('');
                }}
                disabled={connectLoading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectBling}
                disabled={connectLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {connectLoading ? 'Connecting...' : 'Connect & Authorize'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
