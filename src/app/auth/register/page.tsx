'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Request from '@/lib/api';
import { ShoppingBag, Store } from 'lucide-react';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';
import { validateCNPJ, validateCPF, formatCNPJ, formatCPF } from '@/lib/validators';

function FloatingInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required = false,
  minLength,
  maxLength,
  placeholder,
  endIcon,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  endIcon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        placeholder=" "
        className="peer w-full px-4 pt-5 pb-2 text-sm text-gray-900 bg-transparent border-b border-gray-300 rounded-none outline-none transition-colors focus:border-blue-500"
      />
      <label
        htmlFor={id}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 transition-all pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-blue-500 peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
      >
        {label}
      </label>
      {endIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {endIcon}
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      if (role === 'SELLER') {
        payload.sellerType = sellerType;
        if (cnpj) payload.cnpj = cnpj;
        if (cpf) payload.cpf = cpf;
        if (legalCompanyName) payload.legalCompanyName = legalCompanyName;
      }

      await Request.Post('/auth/register', payload);

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg px-8 pt-10 pb-8">
          {/* Avatar Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-center text-gray-900 mb-1">Create account</h1>
          <p className="text-sm text-center text-gray-500 mb-8">Join Optical Market today</p>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <FloatingInput
              id="name"
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {/* Email */}
            <FloatingInput
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            {/* Password */}
            <FloatingInput
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              }
            />

            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all ${
                    role === 'CUSTOMER'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <ShoppingBag className={`w-8 h-8 mb-1.5 ${role === 'CUSTOMER' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${role === 'CUSTOMER' ? 'text-blue-600' : 'text-gray-600'}`}>
                    Customer
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('SELLER')}
                  className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all ${
                    role === 'SELLER'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Store className={`w-8 h-8 mb-1.5 ${role === 'SELLER' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${role === 'SELLER' ? 'text-blue-600' : 'text-gray-600'}`}>
                    Seller
                  </span>
                </button>
              </div>
            </div>

            {/* Seller-specific fields */}
            {role === 'SELLER' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Business Information</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'B2C_MERCHANT', label: 'B2C', sub: 'Retail' },
                      { value: 'B2B_SUPPLIER', label: 'B2B', sub: 'Wholesale' },
                      { value: 'FULL_SERVICE', label: 'Full', sub: 'Commission' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSellerType(item.value)}
                        className={`p-2.5 border-2 rounded-xl text-xs font-medium transition-all ${
                          sellerType === item.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {item.label}
                        <span className="block text-[10px] font-normal mt-0.5 opacity-75">{item.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <FloatingInput
                  id="legalCompanyName"
                  label="Legal Company Name"
                  value={legalCompanyName}
                  onChange={(e) => setLegalCompanyName(e.target.value)}
                />

                <FloatingInput
                  id="cnpj"
                  label={`CNPJ ${sellerType !== 'FULL_SERVICE' ? '*' : ''}`}
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                  maxLength={18}
                />

                {sellerType === 'FULL_SERVICE' && (
                  <FloatingInput
                    id="cpf"
                    label={`CPF ${!cnpj ? '*' : ''}`}
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                  />
                )}
              </div>
            )}

            {/* Terms of Service */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTos}
                onChange={(e) => setAcceptedTos(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
              />
              <span className="text-sm text-gray-600 leading-tight">
                I agree to the{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !acceptedTos}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-4 text-sm text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Social signup buttons */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continue with Facebook
            </button>
          </div>
        </div>

        {/* Bottom link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
