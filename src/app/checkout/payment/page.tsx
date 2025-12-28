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

type PaymentMethod = 'PIX' | 'CREDIT_CARD';

interface PaymentResult {
  paymentId: string;
  status: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  ticketUrl?: string;
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { items, getTotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [processing, setProcessing] = useState(false);
  const [pixData, setPixData] = useState<PaymentResult | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }

    const addressId = sessionStorage.getItem('checkout_address_id');
    if (!addressId) {
      router.push('/checkout');
    }
  }, [user, loading, router]);

  const handlePayment = async () => {
    const addressId = sessionStorage.getItem('checkout_address_id');
    if (!addressId) {
      toast.error('Please select a delivery address', toastConfig);
      router.push('/checkout');
      return;
    }

    setProcessing(true);

    try {
      const orderData = {
        addressId,
        paymentMethod,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const order = await Request.Post('/orders', orderData);
      setOrderId(order.id);

      const paymentData = {
        orderId: order.id,
        paymentMethod,
        payerEmail: user?.email,
      };

      const payment = await Request.Post('/payment/create', paymentData);

      if (paymentMethod === 'PIX') {
        setPixData(payment);
        if (payment.status === 'approved') {
          clearCart();
          sessionStorage.removeItem('checkout_address_id');
          router.push(`/checkout/confirmation?orderId=${order.id}`);
        }
      } else {
        if (payment.status === 'approved') {
          clearCart();
          sessionStorage.removeItem('checkout_address_id');
          router.push(`/checkout/confirmation?orderId=${order.id}`);
        } else {
          toast.error('Payment was not approved. Please try again.', toastConfig);
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(
        error.response?.data?.message || 'Error processing payment',
        toastConfig
      );
    } finally {
      setProcessing(false);
    }
  };

  const checkPixPayment = async () => {
    if (!orderId) return;

    try {
      const status = await Request.Get(`/payment/${orderId}/status`);
      if (status.paymentStatus === 'APPROVED') {
        clearCart();
        sessionStorage.removeItem('checkout_address_id');
        router.push(`/checkout/confirmation?orderId=${orderId}`);
      } else {
        toast.info('Payment not yet confirmed. Please wait...', toastConfig);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    }
  };

  const copyPixCode = () => {
    if (pixData?.pixQrCode) {
      navigator.clipboard.writeText(pixData.pixQrCode);
      toast.success('PIX code copied!', toastConfig);
    }
  };

  if (!mounted || loading) {
    return null;
  }

  if (items.length === 0 && !pixData) {
    router.push('/cart');
    return null;
  }

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
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="ml-2 text-gray-500">Address</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span className="ml-2 font-medium text-gray-900">Payment</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
              3
            </div>
            <span className="ml-2 text-gray-500">Confirmation</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Method
              </h2>

              {!pixData ? (
                <>
                  <div className="space-y-3 mb-6">
                    <label
                      className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                        paymentMethod === 'PIX'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value="PIX"
                          checked={paymentMethod === 'PIX'}
                          onChange={() => setPaymentMethod('PIX')}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">PIX</p>
                          <p className="text-sm text-gray-500">
                            Instant payment via PIX
                          </p>
                        </div>
                        <div className="text-2xl">📱</div>
                      </div>
                    </label>

                    <label
                      className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                        paymentMethod === 'CREDIT_CARD'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          value="CREDIT_CARD"
                          checked={paymentMethod === 'CREDIT_CARD'}
                          onChange={() => setPaymentMethod('CREDIT_CARD')}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Credit Card</p>
                          <p className="text-sm text-gray-500">
                            Pay with credit card (up to 12x)
                          </p>
                        </div>
                        <div className="text-2xl">💳</div>
                      </div>
                    </label>
                  </div>

                  {paymentMethod === 'CREDIT_CARD' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-800">
                        Credit card payment will be implemented with Mercado Pago
                        card form. For now, please use PIX for testing.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Link
                      href="/checkout"
                      className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center"
                    >
                      Back
                    </Link>
                    <button
                      onClick={handlePayment}
                      disabled={processing || paymentMethod === 'CREDIT_CARD'}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      {processing ? 'Processing...' : 'Pay Now'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Scan the QR Code or copy the PIX code
                  </h3>

                  {pixData.pixQrCodeBase64 && (
                    <div className="mb-4">
                      <img
                        src={`data:image/png;base64,${pixData.pixQrCodeBase64}`}
                        alt="PIX QR Code"
                        className="mx-auto w-48 h-48"
                      />
                    </div>
                  )}

                  {pixData.pixQrCode && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        Or copy the PIX code:
                      </p>
                      <div className="bg-gray-100 p-3 rounded-lg break-all text-xs">
                        {pixData.pixQrCode.substring(0, 50)}...
                      </div>
                      <button
                        onClick={copyPixCode}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Copy full code
                      </button>
                    </div>
                  )}

                  <p className="text-sm text-gray-500 mb-4">
                    After payment, click the button below to confirm
                  </p>

                  <button
                    onClick={checkPixPayment}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    I already paid - Check status
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between">
                    <span className="text-gray-600">
                      {item.name} x{item.quantity}
                    </span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-blue-600">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
