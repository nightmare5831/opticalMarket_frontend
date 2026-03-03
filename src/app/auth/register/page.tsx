'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Request from '@/lib/api';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';
import { validateCNPJ, validateCPF, formatCNPJ, formatCPF } from '@/lib/validators';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [sellerType, setSellerType] = useState('B2C_MERCHANT');
  const [cnpj, setCnpj] = useState('');
  const [cpf, setCpf] = useState('');
  const [legalCompanyName, setLegalCompanyName] = useState('');
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTos) {
      setError('You must accept the Terms of Service to continue.');
      return;
    }

    // Validate documents for sellers
    if (role === 'SELLER') {
      if (sellerType === 'B2C_MERCHANT' || sellerType === 'B2B_SUPPLIER') {
        if (!cnpj) { setError('CNPJ is required for this seller type.'); return; }
        if (!validateCNPJ(cnpj)) { setError('Invalid CNPJ number.'); return; }
      }
      if (sellerType === 'FULL_SERVICE') {
        if (!cnpj && !cpf) { setError('CNPJ or CPF is required for Full-Service sellers.'); return; }
        if (cnpj && !validateCNPJ(cnpj)) { setError('Invalid CNPJ number.'); return; }
        if (cpf && !validateCPF(cpf)) { setError('Invalid CPF number.'); return; }
      }
    }

    setLoading(true);

    try {
      const payload: any = { name, email, password, role };

      // Add seller-specific fields if role is SELLER
      if (role === 'SELLER') {
        payload.sellerType = sellerType;
        if (cnpj) payload.cnpj = cnpj;
        if (cpf) payload.cpf = cpf;
        if (legalCompanyName) payload.legalCompanyName = legalCompanyName;
      }

      await Request.Post('/auth/register', payload);

      // Redirect all users to login page after registration
      // Login flow will handle user status checks
      const message = role === 'SELLER'
        ? 'Registration successful! Please wait for admin approval before logging in.'
        : 'Registration successful! Please login to continue.';

      toast.success(message, toastConfig);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.', toastConfig);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 border-2 border-gray-300 rounded-xl p-8 bg-white shadow-lg">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-4 rounded-full border-4 border-gray-300 overflow-hidden p-4 bg-white">
            <Image
              src="/assets/user.png"
              alt="User Avatar"
              fill
              className="object-contain p-4"
            />
          </div>
          <p className="text-xs text-gray-500 mb-1">Click to upload your profile picture</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Full name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password (min. 6 characters)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all ${
                    role === 'CUSTOMER'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="relative w-12 h-12 mb-2">
                    <Image
                      src="/assets/buyer.png"
                      alt="Buyer"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className={`text-xs font-medium ${role === 'CUSTOMER' ? 'text-blue-600' : 'text-gray-700'}`}>
                    Customer
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('SELLER')}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all ${
                    role === 'SELLER'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="relative w-12 h-12 mb-2">
                    <Image
                      src="/assets/seller.png"
                      alt="Seller"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className={`text-xs font-medium ${role === 'SELLER' ? 'text-blue-600' : 'text-gray-700'}`}>
                    Seller
                  </span>
                </button>
              </div>
            </div>

            {/* Seller-specific fields */}
            {role === 'SELLER' && (
              <div className="space-y-4 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-900">Business Information</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller Type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSellerType('B2C_MERCHANT')}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        sellerType === 'B2C_MERCHANT'
                          ? 'border-blue-600 bg-blue-100 text-blue-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      B2C Merchant
                      <span className="block text-xs font-normal mt-1 opacity-75">Retail seller</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerType('B2B_SUPPLIER')}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        sellerType === 'B2B_SUPPLIER'
                          ? 'border-blue-600 bg-blue-100 text-blue-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      B2B Supplier
                      <span className="block text-xs font-normal mt-1 opacity-75">Wholesale supplier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerType('FULL_SERVICE')}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        sellerType === 'FULL_SERVICE'
                          ? 'border-blue-600 bg-blue-100 text-blue-900'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      Full-Service
                      <span className="block text-xs font-normal mt-1 opacity-75">Commission-based</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="legalCompanyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Legal Company Name
                  </label>
                  <input
                    id="legalCompanyName"
                    name="legalCompanyName"
                    type="text"
                    value={legalCompanyName}
                    onChange={(e) => setLegalCompanyName(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Your company's legal name"
                  />
                </div>

                <div>
                  <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ {sellerType !== 'FULL_SERVICE' ? '*' : ''}
                  </label>
                  <input
                    id="cnpj"
                    name="cnpj"
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>

                {sellerType === 'FULL_SERVICE' && (
                  <div>
                    <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
                      CPF {!cnpj ? '*' : ''}
                    </label>
                    <input
                      id="cpf"
                      name="cpf"
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start">
            <input
              id="tos"
              name="tos"
              type="checkbox"
              checked={acceptedTos}
              onChange={(e) => setAcceptedTos(e.target.checked)}
              className="h-4 w-4 mt-1 text-blue-600 focus:ring-blue-500 border-gray-300 rounded accent-blue-600"
            />
            <label htmlFor="tos" className="ml-2 block text-sm text-gray-700">
              I agree to the{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                Privacy Policy
              </a>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !acceptedTos}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
