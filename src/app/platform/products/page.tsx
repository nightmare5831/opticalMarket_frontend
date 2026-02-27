'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/stores/auth';
import Header from '@/components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Collection {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  category: { id: string; name: string };
  seller?: { id: string; name: string; email: string; commissionRate?: string };
  collection?: Collection | null;
  status: string;
  isSubmittedForApproval: boolean;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  status: string;
  commissionRate?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function PlatformProductsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { token } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');

  // Add product modal
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({ sku: '', name: '', description: '', price: '', stock: '', categoryId: '', sellerId: '', collectionId: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // CSV import
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvSellerId, setCsvSellerId] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'PLATFORM_USER') { router.push('/'); return; }
    initialize();
  }, [user, loading, router]);

  const initialize = async () => {
    await Promise.all([fetchSellers(), fetchCategories(), fetchCollections()]);
    fetchProducts();
  };

  const fetchSellers = async () => {
    try {
      const res = await axios.get(`${API_URL}/products/platform/full-service-sellers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSellers(Array.isArray(res.data) ? res.data : []);
    } catch { setSellers([]); }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories`);
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch { setCategories([]); }
  };

  const fetchCollections = async () => {
    try {
      const res = await axios.get(`${API_URL}/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCollections(Array.isArray(res.data) ? res.data : []);
    } catch { setCollections([]); }
  };

  const fetchProducts = async (sellerId?: string, collectionId?: string) => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams();
      if (sellerId) params.set('sellerId', sellerId);
      if (collectionId) params.set('collectionId', collectionId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`${API_URL}/products/platform/products${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data?.data || []);
    } catch { setProducts([]); }
    finally { setLoadingData(false); }
  };

  const handleSellerFilter = (sellerId: string) => {
    setSelectedSeller(sellerId);
    fetchProducts(sellerId || undefined, selectedCollection || undefined);
  };

  const handleCollectionFilter = (collectionId: string) => {
    setSelectedCollection(collectionId);
    fetchProducts(selectedSeller || undefined, collectionId || undefined);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sellerId) { toast.error('Please select a seller', toastConfig); return; }
    setFormLoading(true);
    try {
      const payload = new FormData();
      payload.append('sku', formData.sku);
      payload.append('name', formData.name);
      payload.append('description', formData.description);
      payload.append('price', formData.price);
      payload.append('stock', formData.stock);
      payload.append('categoryId', formData.categoryId);
      payload.append('sellerId', formData.sellerId);
      if (formData.collectionId) payload.append('collectionId', formData.collectionId);
      if (imageFile) payload.append('image', imageFile);

      await axios.post(`${API_URL}/products`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Product created!', toastConfig);
      setShowModal(false);
      setFormData({ sku: '', name: '', description: '', price: '', stock: '', categoryId: '', sellerId: '', collectionId: '' });
      setImageFile(null);
      fetchProducts(selectedSeller || undefined, selectedCollection || undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating product', toastConfig);
    } finally { setFormLoading(false); }
  };

  const handleCsvImport = async () => {
    if (!csvFile || !csvSellerId) {
      toast.error('Select a CSV file and seller', toastConfig);
      return;
    }
    setCsvLoading(true);
    try {
      const payload = new FormData();
      payload.append('file', csvFile);
      payload.append('sellerId', csvSellerId);
      const res = await axios.post(`${API_URL}/products/csv-import`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const { success, errors } = res.data;
      toast.success(`Imported ${success} product(s)${errors.length ? `, ${errors.length} error(s)` : ''}`, toastConfig);
      if (errors.length) {
        console.log('CSV import errors:', errors);
      }
      setShowCsvModal(false);
      setCsvFile(null);
      setCsvSellerId('');
      fetchProducts(selectedSeller || undefined, selectedCollection || undefined);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'CSV import failed', toastConfig);
    } finally { setCsvLoading(false); }
  };

  const getStatusBadge = (product: Product) => {
    if (product.status === 'APPROVED') return { label: 'Approved', cls: 'bg-green-100 text-green-800' };
    if (product.status === 'CANCELLED') return { label: 'Rejected', cls: 'bg-red-100 text-red-800' };
    if (product.isSubmittedForApproval) return { label: 'Under Review', cls: 'bg-blue-100 text-blue-800' };
    return { label: 'Draft', cls: 'bg-gray-100 text-gray-800' };
  };

  if (loading || !user || user.role !== 'PLATFORM_USER') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-8 px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Full-Service Products</h1>
            <p className="text-gray-600 mt-1">Manage products for Full-Service sellers</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCsvModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition">
              CSV Import
            </button>
            <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition">
              + Add Product
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select
            value={selectedSeller}
            onChange={(e) => handleSellerFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Full-Service Sellers</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.commissionRate ? `${Number(s.commissionRate)}%` : 'No commission'})</option>
            ))}
          </select>
          <select
            value={selectedCollection}
            onChange={(e) => handleCollectionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All Collections</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Products Grid */}
        {loadingData ? (
          <div className="text-center py-20">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-900 text-lg font-semibold mb-2">No products found</p>
            <p className="text-gray-500 text-sm">Create your first Full-Service product</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {products.map((product) => {
              const badge = getStatusBadge(product);
              return (
                <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm truncate text-gray-900">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-1">{product.sku}</p>
                    {product.seller && (
                      <p className="text-xs text-indigo-600 mb-1">Seller: {product.seller.name}</p>
                    )}
                    {product.collection && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-purple-50 text-purple-700 rounded">
                        {product.collection.name}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mb-3">Stock: {product.stock}</p>
                    <p className="text-lg font-bold text-blue-600">R$ {parseFloat(product.price.toString()).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add Product for Full-Service Seller</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Seller *</label>
                <select value={formData.sellerId} onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })} required className="w-full p-2 border rounded">
                  <option value="">Select a Full-Service seller</option>
                  {sellers.map((s) => <option key={s.id} value={s.id}>{s.name} - {s.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SKU *</label>
                <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full p-2 border rounded" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} required className="w-full p-2 border rounded">
                    <option value="">Select</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Collection</label>
                  <select value={formData.collectionId} onChange={(e) => setFormData({ ...formData, collectionId: e.target.value })} className="w-full p-2 border rounded">
                    <option value="">None</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (R$) *</label>
                  <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock *</label>
                  <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required className="w-full p-2 border rounded" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Image</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full p-2 border rounded" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={formLoading} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {formLoading ? 'Creating...' : 'Create Product'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">CSV Import</h2>
              <button onClick={() => setShowCsvModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Seller *</label>
                <select value={csvSellerId} onChange={(e) => setCsvSellerId(e.target.value)} className="w-full p-2 border rounded">
                  <option value="">Select seller</option>
                  {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CSV File *</label>
                <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="w-full p-2 border rounded" />
                <p className="text-xs text-gray-500 mt-1">Columns: sku, name, description, price, stock, categoryId, images (URLs separated by ;)</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCsvImport} disabled={csvLoading || !csvFile || !csvSellerId} className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-400">
                  {csvLoading ? 'Importing...' : 'Import'}
                </button>
                <button onClick={() => setShowCsvModal(false)} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
