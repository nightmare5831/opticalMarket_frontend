'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  total: string;
  createdAt: string;
  items: OrderItem[];
  address: Address;
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const showConfirmation = searchParams.has('confirmed');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchOrders();
  }, [user, loading, router]);

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
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return 'bg-green-100 text-green-800';
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

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading orders...</p>
          </div>
        </main>
      </div>
    );
  }

  const confirmedOrder = showConfirmation && orders.length > 0 ? orders[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {confirmedOrder && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Order Confirmed!
                </h2>
                <p className="text-sm text-gray-500">
                  Order #{confirmedOrder.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500 mb-4">You have no orders yet.</p>
            <Link
              href="/products"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Shopping
            </Link>
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
                    <div>
                      <p className="font-medium text-gray-900 text-left">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
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
                  <div className="border-t px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Payment</p>
                        <div className="flex items-center gap-2">
                          <span>{order.paymentMethod}</span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(
                              order.paymentStatus
                            )}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                      {order.address && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">
                            Delivery Address
                          </p>
                          <p className="text-sm">
                            {order.address.street}, {order.address.number}
                            {order.address.complement &&
                              ` - ${order.address.complement}`}
                          </p>
                          <p className="text-sm">
                            {order.address.city} - {order.address.state}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                        >
                          <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                            {item.product.images?.[0] ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium">
                            R$ {(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
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
