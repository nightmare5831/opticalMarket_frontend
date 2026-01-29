'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Request from '@/lib/api';
import Header from '@/components/Header';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { toastConfig } from '@/lib/toast';

export default function SellerProfilePage() {
  const router = useRouter();
  const { user, loading, setAuth, token } = useAuth();
  const [sellerType, setSellerType] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [legalCompanyName, setLegalCompanyName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'SELLER') {
      router.push('/');
    } else {
      // Initialize form with user data
      setSellerType(user.sellerType || 'B2C_MERCHANT');
      setCnpj(user.cnpj || '');
      setLegalCompanyName(user.legalCompanyName || '');
    }
  }, [user, loading, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Request.Patch(`/admin/users/${user?.id}/business-info`, {
        cnpj,
        legalCompanyName,
      });

      // Update user context with new data
      if (user && token) {
        setAuth({ ...user, cnpj, legalCompanyName }, token);
      }

      toast.success('Business information updated successfully', toastConfig);
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update business info:', error);
      toast.error(error.response?.data?.message || 'Failed to update business information', toastConfig);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setSellerType(user?.sellerType || 'B2C_MERCHANT');
    setCnpj(user?.cnpj || '');
    setLegalCompanyName(user?.legalCompanyName || '');
    setIsEditing(false);
  };

  if (loading || !user || user.role !== 'SELLER') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer />

      <main className="mx-8 px-6 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Profile</h1>
            <p className="text-gray-600">Manage your business information and payment settings</p>
          </div>
          <button
            onClick={() => router.push('/seller')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                    {user.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                    {user.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      user.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                    {user.status === 'PENDING' && (
                      <span className="text-xs text-gray-500">Waiting for admin approval</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 border-2 rounded-lg ${
                      sellerType === 'B2C_MERCHANT'
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          sellerType === 'B2C_MERCHANT' ? 'border-cyan-500' : 'border-gray-300'
                        }`}>
                          {sellerType === 'B2C_MERCHANT' && (
                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">B2C Merchant</div>
                          <div className="text-xs text-gray-500">Retail seller</div>
                        </div>
                      </div>
                    </div>
                    <div className={`p-4 border-2 rounded-lg ${
                      sellerType === 'B2B_SUPPLIER'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          sellerType === 'B2B_SUPPLIER' ? 'border-indigo-500' : 'border-gray-300'
                        }`}>
                          {sellerType === 'B2B_SUPPLIER' && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">B2B Supplier</div>
                          <div className="text-xs text-gray-500">Wholesale supplier</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Seller type is set during registration and cannot be changed
                  </p>
                </div>

                <div>
                  <label htmlFor="legalCompanyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Legal Company Name
                  </label>
                  <input
                    id="legalCompanyName"
                    type="text"
                    value={legalCompanyName}
                    onChange={(e) => setLegalCompanyName(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isEditing
                        ? 'border-gray-300 bg-white text-gray-900'
                        : 'border-gray-300 bg-gray-50 text-gray-600 cursor-not-allowed'
                    }`}
                    placeholder="Your company's legal name"
                  />
                </div>

                <div>
                  <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    id="cnpj"
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isEditing
                        ? 'border-gray-300 bg-white text-gray-900'
                        : 'border-gray-300 bg-gray-50 text-gray-600 cursor-not-allowed'
                    }`}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment Settings */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h2>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Mercado Pago</div>
                      <div className="text-xs text-gray-500">Payment gateway</div>
                    </div>
                  </div>

                  {user.mercadoPagoConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span className="font-medium">Connected</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Your Mercado Pago account is connected and ready to receive payments.
                      </p>
                      <button
                        className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                        <span className="font-medium">Not Connected</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Connect your Mercado Pago account to start receiving payments from customers.
                      </p>
                      <button
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Connect Mercado Pago
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                    </svg>
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-1">Why connect Mercado Pago?</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Receive payments directly</li>
                        <li>Secure payment processing</li>
                        <li>Multiple payment methods</li>
                        <li>Automatic transaction handling</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
