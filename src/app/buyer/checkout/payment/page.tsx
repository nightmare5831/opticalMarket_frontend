'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCartStore } from '@/stores/cartStore';
import Header from '@/components/Header';
import Request from '@/lib/api';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';

interface SellerPayment {
  paymentId: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  applicationFee: number;
  status: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
}

interface PaymentResult {
  orderId: string;
  status: string;
  paymentMethod: string;
  payments: SellerPayment[];
  totalAmount: number;
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { items, getTotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [shippingType, setShippingType] = useState<'PLATFORM' | 'SELLER'>('PLATFORM');
  const [shipping, setShipping] = useState<{ name: string; price: number; deliveryDays: number } | null>(null);

  // Payment method & card form state
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [cardNumber, setCardNumber] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardholderDocument, setCardholderDocument] = useState('');

  // Payment result state
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const validateCardForm = (): string | null => {
    if (cardNumber.replace(/\D/g, '').length < 13) return 'Invalid card number';
    if (!expirationMonth || !expirationYear) return 'Expiration date is required';
    if (securityCode.length < 3) return 'Invalid security code';
    if (cardholderName.length < 3) return 'Cardholder name is required';
    return null;
  };

  const handlePayment = async () => {
    const addressId = sessionStorage.getItem('checkout_address_id');
    if (!addressId) { toast.error('Please select a delivery address', toastConfig); router.push('/buyer/checkout'); return; }

    if (paymentMethod === 'CREDIT_CARD') {
      const validationError = validateCardForm();
      if (validationError) { toast.error(validationError, toastConfig); return; }
    }

    setProcessing(true);
    try {
      // Validate all sellers have Mercado Pago connected
      const validation = await Request.Post('/payment/validate-sellers', {
        productIds: items.map((item) => item.productId),
      });
      if (!validation.valid) {
        const sellerNames = validation.disconnectedSellers.map((s: any) => s.sellerName).join(', ');
        toast.error(
          `Cannot proceed: seller(s) ${sellerNames} have not connected their Mercado Pago account. Please remove their products from your cart.`,
          { ...toastConfig, autoClose: 8000 }
        );
        setProcessing(false);
        return;
      }

      const storedShippingType = sessionStorage.getItem('checkout_shipping_type') as 'PLATFORM' | 'SELLER';
      const shippingData = sessionStorage.getItem('checkout_shipping');
      const shippingInfo = shippingData ? JSON.parse(shippingData) : null;

      // Create order(s)
      const result = await Request.Post('/orders', {
        addressId,
        paymentMethod,
        shippingType: storedShippingType,
        shippingMethod: shippingInfo?.name,
        shippingCost: shippingInfo?.price || 0,
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });

      const orders = Array.isArray(result) ? result : [result];

      // Create payment intent for ALL orders (process all sellers)
      const allPayments: SellerPayment[] = [];
      let lastResult: PaymentResult | null = null;

      for (const order of orders) {
        const intentData: any = {
          orderId: order.id,
          paymentMethod,
        };

        if (paymentMethod === 'CREDIT_CARD') {
          intentData.cardNumber = cardNumber;
          intentData.expirationMonth = expirationMonth;
          intentData.expirationYear = expirationYear;
          intentData.securityCode = securityCode;
          intentData.cardholderName = cardholderName;
          intentData.cardholderDocument = cardholderDocument.replace(/\D/g, '');
        }

        const paymentResponse: PaymentResult = await Request.Post('/payment/create-intent', intentData);
        allPayments.push(...paymentResponse.payments);
        lastResult = paymentResponse;
      }

      // Set result for display
      const combinedResult: PaymentResult = {
        orderId: orders[0].id,
        status: lastResult?.status || 'pending',
        paymentMethod,
        payments: allPayments,
        totalAmount: orders.reduce((sum: number, o: any) => sum + Number(o.total), 0),
      };

      setPaymentResult(combinedResult);

      // Clear cart & checkout session
      clearCart();
      sessionStorage.removeItem('checkout_address_id');
      sessionStorage.removeItem('checkout_shipping');
      sessionStorage.removeItem('checkout_shipping_type');

      // If credit card and completed immediately
      if (combinedResult.status === 'completed') {
        toast.success('Payment approved!', toastConfig);
        setTimeout(() => router.push('/buyer/orders?confirmed'), 2000);
        return;
      }

      // If credit card pending, poll for status
      if (paymentMethod === 'CREDIT_CARD' && combinedResult.status === 'pending') {
        let pollCount = 0;
        pollingRef.current = setInterval(async () => {
          pollCount++;
          if (pollCount > 30) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            return;
          }
          try {
            const statusResponse = await Request.Get(`/payment/${orders[0].id}/status`);
            if (statusResponse.allCompleted) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              toast.success('Payment approved!', toastConfig);
              setTimeout(() => router.push('/buyer/orders?confirmed'), 2000);
            }
          } catch { /* ignore polling errors */ }
        }, 1000);
      }

      // PIX: result is displayed with QR codes (stays on page)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error processing payment', toastConfig);
      setProcessing(false);
    }
  };

  if (!mounted || loading) return null;
  if (items.length === 0 && !paymentResult) { router.push('/buyer/cart'); return null; }

  const total = getTotal();

  // Show payment result (PIX QR codes or card status)
  if (paymentResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {paymentResult.status === 'completed' ? 'Payment Approved' : 'Complete Your Payment'}
            </h2>

            {paymentResult.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-medium">All payments have been approved! Redirecting...</p>
              </div>
            )}

            {/* Per-seller payment cards */}
            <div className="space-y-4">
              {paymentResult.payments.map((p) => (
                <div key={p.paymentId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">{p.sellerName}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      p.status === 'completed' ? 'bg-green-100 text-green-700' :
                      p.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {p.status === 'completed' ? 'Approved' : p.status === 'failed' ? 'Failed' : 'Pending'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Amount</span>
                      <span className="font-medium">R$ {p.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee</span>
                      <span>R$ {p.applicationFee.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* PIX QR Code */}
                  {p.pixQrCodeBase64 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">Scan the QR Code to pay:</p>
                      <img
                        src={`data:image/png;base64,${p.pixQrCodeBase64}`}
                        alt="PIX QR Code"
                        className="mx-auto w-48 h-48"
                      />
                      {p.pixQrCode && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Or copy the PIX code:</p>
                          <div className="relative">
                            <input
                              type="text"
                              readOnly
                              value={p.pixQrCode}
                              className="w-full text-xs p-2 pr-16 border rounded bg-gray-50 text-gray-600"
                            />
                            <button
                              onClick={() => { navigator.clipboard.writeText(p.pixQrCode!); toast.success('PIX code copied!', toastConfig); }}
                              className="absolute right-1 top-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/buyer/orders" className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center">
                View My Orders
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress steps */}
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
          <div className="lg:col-span-2 space-y-4">
            {/* Payment Method Selector */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('PIX')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    paymentMethod === 'PIX'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">📱</span>
                  <span className="font-medium text-sm">PIX (8%)</span>
                  <span className="block text-xs text-gray-500">Instant payment</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">💳</span>
                  <span className="font-medium text-sm">Credit Card (10%)</span>
                  <span className="block text-xs text-gray-500">Up to 12x</span>
                </button>
              </div>
            </div>

            {/* Credit Card Form */}
            {paymentMethod === 'CREDIT_CARD' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Card Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                      <input
                        type="text"
                        value={expirationMonth}
                        onChange={(e) => setExpirationMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        placeholder="MM"
                        maxLength={2}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <input
                        type="text"
                        value={expirationYear}
                        onChange={(e) => setExpirationYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="YYYY"
                        maxLength={4}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                      <input
                        type="text"
                        value={securityCode}
                        onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                      placeholder="NAME ON CARD"
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                    <input
                      type="text"
                      value={cardholderDocument}
                      onChange={(e) => setCardholderDocument(formatCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PIX Info */}
            {paymentMethod === 'PIX' && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    After confirming, a PIX QR Code will be generated for each seller. Scan to complete the payment instantly.
                  </p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex gap-3">
                <Link href="/buyer/checkout" className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center">
                  Back
                </Link>
                <button onClick={handlePayment} disabled={processing}
                  className="flex-1 py-3 bg-[#009ee3] text-white rounded-lg hover:bg-[#0088c7] disabled:opacity-50 font-medium">
                  {processing ? 'Processing...' : `Pay with ${paymentMethod === 'PIX' ? 'PIX' : 'Credit Card'}`}
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
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
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Platform fee ({paymentMethod === 'PIX' ? '8%' : '10%'})</span>
                  <span>Included</span>
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
