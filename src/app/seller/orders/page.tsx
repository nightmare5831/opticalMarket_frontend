'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Request from '@/lib/api';

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  product: {
    id: string;
    name: string;
    images: string[];
    sku: string;
  };
}

interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingMethod: string | null;
  shippingType: 'PLATFORM' | 'SELLER';
  total: string;
  createdAt: string;
  items: OrderItem[];
  address: Address;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [syncingBling, setSyncingBling] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    if (user.status === 'PENDING') {
      router.push('/seller');
      return;
    }
    fetchOrders();
  }, [user, loading, router]);

  const fetchOrders = async () => {
    try {
      const data = await Request.Get('/orders/seller');
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(orderId);
    try {
      await Request.Patch(`/orders/${orderId}/status`, { status: newStatus });
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const syncToBling = async (orderId: string) => {
    setSyncingBling(orderId);
    try {
      const result = await Request.Post(`/orders/${orderId}/bling`);
      if (result.success) {
        alert('Order synced to Bling successfully');
      } else {
        alert(`Failed to sync: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error syncing to Bling:', error);
      alert(error.response?.data?.message || 'Failed to sync to Bling');
    } finally {
      setSyncingBling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'SHIPPED':
        return 'bg-blue-100 text-blue-800';
      case 'DELIVERED':
        return 'bg-purple-100 text-purple-800';
      case 'PENDING':
      case 'IN_PROCESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'PAID':
        return 'SHIPPED';
      case 'SHIPPED':
        return 'DELIVERED';
      default:
        return null;
    }
  };

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
    const paid = orders.filter((o) => o.status === 'PAID').length;
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
    return { totalOrders, totalRevenue, paid, delivered };
  }, [orders]);

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-8 px-6 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading orders...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-8 px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Seller Orders</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-600">Manage and fulfill customer orders</p>
              {user?.sellerType && (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  user.sellerType === 'B2C_MERCHANT' ? 'bg-cyan-100 text-cyan-800' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {user.sellerType === 'B2C_MERCHANT' ? 'B2C Merchant' : 'B2B Supplier'}
                </span>
              )}
              {user?.mercadoPagoConnected ? (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  MP Connected
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  MP Not Connected
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push('/seller')}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalOrders}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  R$ {stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Awaiting Action</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.paid}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Delivered</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.delivered}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500 text-lg mb-2">No orders yet</p>
            <p className="text-gray-400">Orders for your products will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedOrder(expandedOrder === order.id ? null : order.id)
                  }
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="font-medium text-gray-900">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')} -{' '}
                        {order.user.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                    <span className="font-medium text-blue-600">
                      R$ {parseFloat(order.total).toFixed(2)}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedOrder === order.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {expandedOrder === order.id && (
                  <div className="border-t px-4 py-5 bg-gray-50/80">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      {/* Customer Info */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Customer
                        </h4>
                        <p className="font-medium text-gray-900">{order.user.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{order.user.email}</p>
                      </div>

                      {/* Payment Info */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Payment
                        </h4>
                        <p className="font-medium text-gray-900">{order.paymentMethod}</p>
                        <span
                          className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                            order.paymentStatus
                          )}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>

                      {/* Shipping Info */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                          </svg>
                          Shipping
                        </h4>
                        {order.shippingType === 'SELLER' ? (
                          <>
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                              Seller Shipping
                            </span>
                            <p className="text-sm text-gray-600 mt-1">
                              You are responsible for shipping this order.
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Platform Shipping
                            </span>
                            {order.shippingMethod && (
                              <p className="text-sm text-gray-600 mt-1">{order.shippingMethod}</p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Address Info */}
                      {order.address && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Delivery Address
                          </h4>
                          <p className="text-sm text-gray-900">
                            {order.address.street}, {order.address.number}
                            {order.address.complement && ` - ${order.address.complement}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {order.address.neighborhood}, {order.address.city} - {order.address.state}
                          </p>
                          <p className="text-sm text-gray-500">{order.address.zipCode}</p>
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Items ({order.items.length})
                      </h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                          >
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {item.product.images?.[0] ? (
                                <img
                                  src={item.product.images[0]}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                SKU: {item.product.sku} | Qty: {item.quantity} x R$ {parseFloat(item.price).toFixed(2)}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              R$ {(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {(getNextStatus(order.status) || order.status === 'PAID' || order.status === 'PENDING') && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                        {getNextStatus(order.status) && (
                          <button
                            onClick={() =>
                              updateOrderStatus(order.id, getNextStatus(order.status)!)
                            }
                            disabled={updatingStatus === order.id}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                          >
                            {updatingStatus === order.id
                              ? 'Updating...'
                              : `Mark as ${getNextStatus(order.status)}`}
                          </button>
                        )}
                        {order.status === 'PAID' && (
                          <button
                            onClick={() => syncToBling(order.id)}
                            disabled={syncingBling === order.id}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
                          >
                            {syncingBling === order.id
                              ? 'Syncing...'
                              : 'Sync to Bling'}
                          </button>
                        )}
                        {(order.status === 'PENDING' || order.status === 'PAID') && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                            disabled={updatingStatus === order.id}
                            className="px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 disabled:opacity-50 transition"
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
