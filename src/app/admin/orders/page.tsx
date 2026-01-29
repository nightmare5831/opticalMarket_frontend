'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Request from '@/lib/api';
import Header from '@/components/Header';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { toastConfig } from '@/lib/toast';

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

interface Order {
  id: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: string | null;
  paymentStatus: string;
  total: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [minTotal, setMinTotal] = useState('');
  const [maxTotal, setMaxTotal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      if (filterStatus) params.append('status', filterStatus);
      if (filterPaymentMethod) params.append('paymentMethod', filterPaymentMethod);
      if (minTotal) params.append('minTotal', minTotal);
      if (maxTotal) params.append('maxTotal', maxTotal);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const data = await Request.Get(`/admin/orders?${params.toString()}`);
      setOrders(data.orders);
      setPagination(data.pagination);

      // Fetch all orders for statistics if not already loaded
      if (allOrders.length === 0) {
        const allOrdersData = await Request.Get('/admin/orders?limit=1000');
        setAllOrders(allOrdersData.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders', toastConfig);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchOrders();
    }
  }, [user, currentPage, filterStatus, filterPaymentMethod, minTotal, maxTotal, startDate, endDate]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders();
  };

  const handleClearFilters = () => {
    setFilterStatus('');
    setFilterPaymentMethod('');
    setMinTotal('');
    setMaxTotal('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await Request.Patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success('Order status updated successfully', toastConfig);
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status', toastConfig);
    }
  };

  if (loading || !user || user.role !== 'ADMIN') {
    return null;
  }

  // Calculate statistics
  const stats = {
    all: allOrders.length,
    pending: allOrders.filter(o => o.status === 'PENDING').length,
    paid: allOrders.filter(o => o.status === 'PAID').length,
    shipped: allOrders.filter(o => o.status === 'SHIPPED').length,
    delivered: allOrders.filter(o => o.status === 'DELIVERED').length,
    cancelled: allOrders.filter(o => o.status === 'CANCELLED').length,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer />

      <main className="mx-8 px-6 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
            <p className="text-gray-600">View and monitor all platform orders</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-500">All Orders</h3>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {ordersLoading ? '...' : stats.all}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-500">Pending</h3>
                <p className="mt-1 text-2xl font-bold text-yellow-700">
                  {ordersLoading ? '...' : stats.pending}
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-500">Paid</h3>
                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {ordersLoading ? '...' : stats.paid}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-500">Shipped</h3>
                <p className="mt-1 text-2xl font-bold text-purple-700">
                  {ordersLoading ? '...' : stats.shipped}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-500">Delivered</h3>
                <p className="mt-1 text-2xl font-bold text-green-700">
                  {ordersLoading ? '...' : stats.delivered}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-500">Cancelled</h3>
                <p className="mt-1 text-2xl font-bold text-red-700">
                  {ordersLoading ? '...' : stats.cancelled}
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="From"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="To"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minTotal}
                  onChange={(e) => setMinTotal(e.target.value)}
                  placeholder="Min (R$)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                  placeholder="Max (R$)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              <button
                onClick={handleClearFilters}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {ordersLoading ? (
            <div className="p-8 text-center text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <>
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          #{order.id.slice(0, 8)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{order.user.name}</div>
                          <div className="text-sm text-gray-500">{order.user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{order.paymentMethod || '-'}</div>
                          <div className="text-xs text-gray-500">{order.paymentStatus}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          R$ {parseFloat(order.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {expandedOrder === order.id ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {expandedOrder === order.id && (
                        <tr key={`${order.id}-details`}>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-2 gap-6 mb-4">
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                                <ul className="space-y-2">
                                  {order.items.map((item) => (
                                    <li key={item.id} className="flex justify-between text-sm bg-white p-2 rounded">
                                      <span className="text-gray-900">{item.product.name} <span className="text-gray-500">(SKU: {item.product.sku})</span></span>
                                      <span className="font-medium">{item.quantity} x R$ {parseFloat(item.price).toFixed(2)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Shipping Address</h4>
                                {order.address ? (
                                  <div className="text-sm text-gray-700 bg-white p-3 rounded">
                                    <p>{order.address.street}, {order.address.number}</p>
                                    <p>{order.address.city} - {order.address.state}</p>
                                    <p>CEP: {order.address.zipCode}</p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No address provided</p>
                                )}
                              </div>
                            </div>
                            <div className="border-t pt-4">
                              <h4 className="font-semibold text-gray-900 mb-3">Update Order Status</h4>
                              <div className="flex gap-2 flex-wrap">
                                {order.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'PAID')}
                                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                      Mark as Paid
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                      Cancel Order
                                    </button>
                                  </>
                                )}
                                {order.status === 'PAID' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'SHIPPED')}
                                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                      Mark as Shipped
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'CANCELLED')}
                                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                      Cancel Order
                                    </button>
                                  </>
                                )}
                                {order.status === 'SHIPPED' && (
                                  <button
                                    onClick={() => handleUpdateOrderStatus(order.id, 'DELIVERED')}
                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                  >
                                    Mark as Delivered
                                  </button>
                                )}
                                {order.status === 'DELIVERED' && (
                                  <div className="text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                                    ✓ Order completed - No actions available
                                  </div>
                                )}
                                {order.status === 'CANCELLED' && (
                                  <div className="text-sm text-red-700 bg-red-50 px-4 py-2 rounded-lg">
                                    ✗ Order cancelled - No actions available
                                  </div>
                                )}
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">{((currentPage - 1) * 10) + 1}</span> to <span className="font-medium">{Math.min(currentPage * 10, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> orders
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white">
                  <span className="text-sm font-medium text-gray-700">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
