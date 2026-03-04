'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCartStore } from '@/stores/cartStore';
import AppLayout from '@/components/AppLayout';
import Request from '@/lib/api';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';

interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

interface ShippingOption {
  service: string;
  name: string;
  price: number;
  deliveryDays: number;
}

export default function CheckoutAddressPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { items, getTotal } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shippingType, setShippingType] = useState<'PLATFORM' | 'SELLER' | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  const [cepLoading, setCepLoading] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const handleCepChange = async (value: string) => {
    const clean = value.replace(/\D/g, '');
    setNewAddress((prev) => ({ ...prev, zipCode: clean }));
    if (clean.length === 8) {
      setCepLoading(true);
      try {
        const data = await Request.Get(`/address/cep/${clean}`);
        if (data) {
          setNewAddress((prev) => ({
            ...prev,
            street: data.street || prev.street,
            neighborhood: data.neighborhood || prev.neighborhood,
            city: data.city || prev.city,
            state: data.state || prev.state,
          }));
        }
      } catch { /* ignore */ }
      setCepLoading(false);
    }
  };

  // Auto-detect shipping type based on seller types in cart
  const autoDetectShippingType = (): 'PLATFORM' | 'SELLER' | null => {
    const sellerTypes = new Set(items.map((i) => i.sellerType).filter(Boolean));
    if (sellerTypes.size === 0) return null;
    if (sellerTypes.has('FULL_SERVICE') && sellerTypes.size === 1) return 'PLATFORM';
    if ((sellerTypes.has('B2C_MERCHANT') || sellerTypes.has('B2B_SUPPLIER')) && !sellerTypes.has('FULL_SERVICE')) return 'SELLER';
    return null; // mixed — let user choose
  };

  useEffect(() => {
    if (selectedAddressId && !shippingType) {
      const auto = autoDetectShippingType();
      if (auto) handleShippingTypeSelect(auto);
    }
  }, [selectedAddressId]);

  const fillMockAddress = () => {
    setNewAddress({
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apt 45',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login?redirect=/buyer/checkout');
      return;
    }
    fetchAddresses();
  }, [user, loading, router]);

  const fetchAddresses = async () => {
    try {
      const data = await Request.Get('/address');
      setAddresses(data);
      const defaultAddr = data.find((a: Address) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (data.length > 0) {
        setSelectedAddressId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const fetchShipping = async (cep: string) => {
    setLoadingShipping(true);
    try {
      const options = await Request.Get(`/shipping/calculate?cep=${cep}`);
      setShippingOptions(options);
      if (options.length > 0) {
        setSelectedShipping(options[0]);
      }
    } catch (error) {
      console.error('Error fetching shipping:', error);
    } finally {
      setLoadingShipping(false);
    }
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddressId(address.id);
    setShippingType(null);
    setSelectedShipping(null);
    setShippingOptions([]);
  };

  const handleShippingTypeSelect = (type: 'PLATFORM' | 'SELLER') => {
    setShippingType(type);
    setSelectedShipping(null);
    if (type === 'PLATFORM') {
      const address = addresses.find((a) => a.id === selectedAddressId);
      if (address) fetchShipping(address.zipCode);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const created = await Request.Post('/address', {
        ...newAddress,
        isDefault: addresses.length === 0,
      });
      setAddresses([...addresses, created]);
      setSelectedAddressId(created.id);
      setShowNewAddressForm(false);
      setShippingType(null);
      setSelectedShipping(null);
      setShippingOptions([]);
      setNewAddress({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
      });
      toast.success('Address added successfully', toastConfig);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Error adding address',
        toastConfig
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedAddressId) {
      toast.error('Please select a delivery address', toastConfig);
      return;
    }
    if (!shippingType) {
      toast.error('Please select a shipping type', toastConfig);
      return;
    }
    if (shippingType === 'PLATFORM' && !selectedShipping) {
      toast.error('Please select a shipping method', toastConfig);
      return;
    }
    sessionStorage.setItem('checkout_address_id', selectedAddressId);
    sessionStorage.setItem('checkout_shipping_type', shippingType);
    if (shippingType === 'PLATFORM' && selectedShipping) {
      sessionStorage.setItem('checkout_shipping', JSON.stringify(selectedShipping));
    } else {
      sessionStorage.removeItem('checkout_shipping');
    }
    router.push('/buyer/checkout/payment');
  };

  if (!mounted || loading) {
    return null;
  }

  if (items.length === 0) {
    router.push('/buyer/cart');
    return null;
  }

  const total = getTotal();

  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
              1
            </div>
            <span className="ml-2 font-medium text-gray-900">Address</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span className="ml-2 text-gray-500">Payment</span>
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
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Delivery Address
              </h2>

              {loadingAddresses ? (
                <div className="text-center py-8 text-gray-500">
                  Loading addresses...
                </div>
              ) : addresses.length === 0 && !showNewAddressForm ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    No addresses found. Add a delivery address to continue.
                  </p>
                  <button
                    onClick={() => setShowNewAddressForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddressId === address.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="address"
                            value={address.id}
                            checked={selectedAddressId === address.id}
                            onChange={() => handleAddressSelect(address)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {address.street}, {address.number}
                              {address.complement && ` - ${address.complement}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.neighborhood}, {address.city} -{' '}
                              {address.state}
                            </p>
                            <p className="text-sm text-gray-600">
                              CEP: {address.zipCode}
                            </p>
                            {address.isDefault && (
                              <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {!showNewAddressForm && (
                    <button
                      onClick={() => setShowNewAddressForm(true)}
                      className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      + Add new address
                    </button>
                  )}
                </>
              )}

              {showNewAddressForm && (
                <form onSubmit={handleCreateAddress} className="mt-4 space-y-4">
                  {process.env.NODE_ENV === 'development' && (
                    <button
                      type="button"
                      onClick={fillMockAddress}
                      className="text-sm text-orange-600 hover:text-orange-700 underline"
                    >
                      Fill Mock Address (Dev Only)
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street
                      </label>
                      <input
                        type="text"
                        value={newAddress.street}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, street: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Number
                      </label>
                      <input
                        type="text"
                        value={newAddress.number}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, number: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Complement
                      </label>
                      <input
                        type="text"
                        value={newAddress.complement}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            complement: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Neighborhood
                      </label>
                      <input
                        type="text"
                        value={newAddress.neighborhood}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            neighborhood: e.target.value,
                          })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={newAddress.city}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, city: e.target.value })
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={newAddress.state}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, state: e.target.value })
                        }
                        required
                        maxLength={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code {cepLoading && <span className="text-blue-500 text-xs ml-1">Looking up...</span>}
                      </label>
                      <input
                        type="text"
                        value={newAddress.zipCode}
                        onChange={(e) => handleCepChange(e.target.value)}
                        required
                        maxLength={8}
                        placeholder="00000000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(false)}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {formLoading ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {selectedAddressId && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Shipping
                </h2>

                <div className="space-y-3 mb-4">
                  <label
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      shippingType === 'PLATFORM'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingType"
                        value="PLATFORM"
                        checked={shippingType === 'PLATFORM'}
                        onChange={() => handleShippingTypeSelect('PLATFORM')}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Platform Shipping (Correios)</p>
                        <p className="text-sm text-gray-600">
                          Shipped via Correios with tracking
                        </p>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      shippingType === 'SELLER'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingType"
                        value="SELLER"
                        checked={shippingType === 'SELLER'}
                        onChange={() => handleShippingTypeSelect('SELLER')}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Seller Shipping</p>
                        <p className="text-sm text-gray-600">
                          Seller handles shipping directly
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {shippingType === 'PLATFORM' && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Select Shipping Method
                    </h3>
                    {loadingShipping ? (
                      <div className="text-center py-4 text-gray-500">
                        Calculating shipping...
                      </div>
                    ) : shippingOptions.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        No shipping options available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {shippingOptions.map((option) => (
                          <label
                            key={option.service}
                            className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedShipping?.service === option.service
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="shipping"
                                value={option.service}
                                checked={selectedShipping?.service === option.service}
                                onChange={() => setSelectedShipping(option)}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{option.name}</p>
                                <p className="text-sm text-gray-600">
                                  {option.deliveryDays} business days
                                </p>
                              </div>
                              <span className="font-semibold text-gray-900">
                                R$ {Number(option.price).toFixed(2)}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {shippingType === 'SELLER' && (
                  <div className="border-t pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        The seller will handle shipping for this order. Shipping details will be provided by the seller after payment.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
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
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span>
                    {shippingType === 'SELLER'
                      ? 'Seller'
                      : selectedShipping
                        ? `R$ ${Number(selectedShipping.price).toFixed(2)}`
                        : '-'}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-blue-600">
                    R$ {(total + (shippingType === 'SELLER' ? 0 : (selectedShipping?.price || 0))).toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleContinue}
                disabled={!selectedAddressId || !shippingType || (shippingType === 'PLATFORM' && !selectedShipping)}
                className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
