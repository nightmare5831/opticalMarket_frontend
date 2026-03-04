'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/AppLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
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
    seller?: { name: string };
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
}

function SellerPurchasesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const showConfirmation = searchParams.has('confirmed');

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'SELLER' || user.sellerType !== 'B2C_MERCHANT') { router.push('/seller'); return; }
    fetchOrders();
  }, [user, router]);

  useEffect(() => {
    if (showConfirmation && orders.length > 0) {
      setExpandedOrder(orders[0].id);
    }
  }, [showConfirmation, orders]);

  const fetchOrders = async () => {
    try {
      const data = await Request.Get('/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
    const completed = orders.filter((o) => o.status === 'DELIVERED').length;
    const shipped = orders.filter((o) => o.status === 'SHIPPED').length;
    return { totalOrders, totalSpent, completed, shipped };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

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

  const statusFilters = [
    { label: 'All', value: 'ALL' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Shipped', value: 'SHIPPED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  if (loadingOrders) {
    return (
      <AppLayout>
        <main className="mx-8 px-6 py-8">
          <div className="text-center py-16">
            <LoadingSpinner message="Loading purchases..." />
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="mx-8 px-6 py-8">
        {showConfirmation && orders.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-800">Order Confirmed!</p>
              <p className="text-sm text-green-700">Order #{orders[0].id.slice(0, 8).toUpperCase()} has been placed successfully.</p>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Purchases</h1>
            <p className="text-gray-600">Track your B2B supplier orders</p>
          </div>
          <button
            onClick={() => router.push('/seller/shop')}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            Browse Products
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Purchases', value: stats.totalOrders, color: 'blue' },
            { label: 'Total Spent', value: `R$ ${stats.totalSpent.toFixed(2)}`, color: 'green' },
            { label: 'Completed', value: stats.completed, color: 'purple' },
            { label: 'In Transit', value: stats.shipped, color: 'orange' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filter + Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 pt-4">
            <div className="flex gap-1 overflow-x-auto">
              {statusFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition whitespace-nowrap ${
                    statusFilter === f.value
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                  {f.value === 'ALL' && (
                    <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {orders.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg mb-2">
                {orders.length === 0 ? 'No purchases yet' : 'No orders match this filter'}
              </p>
              {orders.length === 0 && (
                <button
                  onClick={() => router.push('/seller/shop')}
                  className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                >
                  Browse B2B Products
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Payment</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <>
                      <tr
                        key={order.id}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedOrder === order.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{order.items.reduce((s, i) => s + i.quantity, 0)} item(s)</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">R$ {parseFloat(order.total).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>{order.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(order.paymentStatus)}`}>{order.paymentStatus}</span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                          {order.status === 'PENDING' && (
                            <Link
                              href={`/buyer/checkout/payment?orderId=${order.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                            >
                              Complete Payment
                            </Link>
                          )}
                          <svg className={`w-5 h-5 text-gray-400 transition-transform inline-block ${expandedOrder === order.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </td>
                      </tr>
                      {expandedOrder === order.id && (
                        <tr key={`${order.id}-details`}>
                          <td colSpan={7} className="px-6 py-5 bg-gray-50/80">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Shipping</h4>
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${order.shippingType === 'SELLER' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {order.shippingType === 'SELLER' ? 'Seller Shipping' : 'Platform Shipping'}
                                </span>
                                {order.shippingMethod && <p className="text-sm text-gray-500 mt-1">Method: {order.shippingMethod}</p>}
                              </div>
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment</h4>
                                <p className="font-medium text-gray-900">{order.paymentMethod}</p>
                                <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(order.paymentStatus)}`}>{order.paymentStatus}</span>
                              </div>
                              {order.address && (
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Delivery Address</h4>
                                  <p className="text-sm text-gray-900">{order.address.street}, {order.address.number}{order.address.complement && ` - ${order.address.complement}`}</p>
                                  <p className="text-sm text-gray-600">{order.address.neighborhood}, {order.address.city} - {order.address.state}</p>
                                  <p className="text-sm text-gray-500">{order.address.zipCode}</p>
                                </div>
                              )}
                            </div>
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Items ({order.items.length})</h4>
                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                      {item.product.images?.[0] ? (
                                        <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                                      <p className="text-xs text-gray-500">
                                        SKU: {item.product.sku} | Qty: {item.quantity} x R$ {parseFloat(item.price).toFixed(2)}
                                        {item.product.seller?.name && ` | Seller: ${item.product.seller.name}`}
                                      </p>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900">R$ {(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}

export default function SellerPurchasesPageWrapper() {
  return (
    <Suspense>
      <SellerPurchasesPage />
    </Suspense>
  );
}
