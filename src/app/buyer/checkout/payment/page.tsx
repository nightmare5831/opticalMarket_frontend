'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCartStore } from '@/stores/cartStore';
import Header from '@/components/Header';
import Request from '@/lib/api';
import { toast, ToastContainer } from 'react-toastify';
import { toastConfig } from '@/lib/toast';
import 'react-toastify/dist/ReactToastify.css';

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { items, getTotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [shippingType, setShippingType] = useState<'PLATFORM' | 'SELLER'>('PLATFORM');
  const [shipping, setShipping] = useState<{ name: string; price: number; deliveryDays: number } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth/login?redirect=/buyer/checkout'); return; }
    const addressId = sessionStorage.getItem('checkout_address_id');
    const storedShippingType = sessionStorage.getItem('checkout_shipping_type') as 'PLATFORM' | 'SELLER' | null;
    if (!addressId || !storedShippingType) { router.push('/buyer/checkout'); return; }
    setShippingType(storedShippingType);
    if (storedShippingType === 'PLATFORM') {
      const shippingData = sessionStorage.getItem('checkout_shipping');
      if (!shippingData) { router.push('/buyer/checkout'); return; }
      setShipping(JSON.parse(shippingData));
    }
  }, [user, loading, router]);

  const handlePayment = async () => {
    const addressId = sessionStorage.getItem('checkout_address_id');
    if (!addressId) { toast.error('Please select a delivery address', toastConfig); router.push('/buyer/checkout'); return; }

    setProcessing(true);
    try {
      const storedShippingType = sessionStorage.getItem('checkout_shipping_type') as 'PLATFORM' | 'SELLER';
      const shippingData = sessionStorage.getItem('checkout_shipping');
      const shippingInfo = shippingData ? JSON.parse(shippingData) : null;

      // Create order(s) - may return single order or array (multi-seller split)
      const result = await Request.Post('/orders', {
        addressId,
        paymentMethod: 'PIX',
        shippingType: storedShippingType,
        shippingMethod: shippingInfo?.name,
        shippingCost: shippingInfo?.price || 0,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });

      const orders = Array.isArray(result) ? result : [result];

      // Create checkout for the first order (MP handles per-seller charge)
      // For multi-seller: each order gets its own MP checkout
      const checkout = await Request.Post('/payment/create', {
        orderId: orders[0].id,
        payerEmail: user?.email,
      });

      // Store remaining order IDs for sequential payment if multi-seller
      if (orders.length > 1) {
        const remainingIds = orders.slice(1).map((o: any) => o.id);
        sessionStorage.setItem('pending_order_ids', JSON.stringify(remainingIds));
      }

      clearCart();
      sessionStorage.removeItem('checkout_address_id');
      sessionStorage.removeItem('checkout_shipping');
      sessionStorage.removeItem('checkout_shipping_type');

      window.location.href = checkout.sandboxInitPoint || checkout.initPoint;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error processing payment', toastConfig);
      setProcessing(false);
    }
  };

  if (!mounted || loading) return null;
  if (items.length === 0) { router.push('/buyer/cart'); return null; }

  const total = getTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="ml-2 text-gray-500">Address</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">2</div>
            <span className="ml-2 font-medium text-gray-900">Payment</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">3</div>
            <span className="ml-2 text-gray-500">Confirmation</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  You will be redirected to Mercado Pago to complete your payment securely.
                </p>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-6">
                <p className="font-medium text-gray-900">Available payment methods:</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📱</span>
                  <span>PIX - Instant payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">💳</span>
                  <span>Credit Card - Up to 12x installments</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/buyer/checkout" className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center">
                  Back
                </Link>
                <button onClick={handlePayment} disabled={processing}
                  className="flex-1 py-3 bg-[#009ee3] text-white rounded-lg hover:bg-[#0088c7] disabled:opacity-50 font-medium">
                  {processing ? 'Processing...' : 'Continue to Payment'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between">
                    <span className="text-gray-600">{item.name} x{item.quantity}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping{shipping ? ` (${shipping.name})` : ''}</span>
                  <span>
                    {shippingType === 'SELLER'
                      ? 'Seller'
                      : shipping
                        ? `R$ ${Number(shipping.price).toFixed(2)}`
                        : '-'}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-blue-600">R$ {(total + (shippingType === 'SELLER' ? 0 : (shipping?.price || 0))).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
