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

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  category: { id: string; name: string };
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  isSubmittedForApproval: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function SellerProductsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { token } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // CSV import
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  // Detail modal
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (user.role !== 'SELLER') {
      router.push('/');
      return;
    }
    fetchCategories();
    fetchProducts();
  }, [user, loading, router]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await axios.get(`${API_URL}/products/seller/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmitForApproval = async (productId: string) => {
    if (user?.status !== 'ACTIVE') {
      toast.error('Your account must be approved before submitting products', toastConfig);
      return;
    }
    setSubmitting(productId);
    try {
      await axios.post(`${API_URL}/products/${productId}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Product submitted for approval!', toastConfig);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit product', toastConfig);
    } finally {
      setSubmitting(null);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) { toast.error('Select a CSV file', toastConfig); return; }
    setCsvLoading(true);
    try {
      const payload = new FormData();
      payload.append('file', csvFile);
      const res = await axios.post(`${API_URL}/products/csv-import`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const { success, errors } = res.data;
      toast.success(`Imported ${success} product(s)${errors.length ? `, ${errors.length} error(s)` : ''}`, toastConfig);
      setShowCsvModal(false);
      setCsvFile(null);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'CSV import failed', toastConfig);
    } finally { setCsvLoading(false); }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      categoryId: product.category?.id || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ sku: '', name: '', description: '', price: '', stock: '', categoryId: '' });
    setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingProduct) {
        await axios.put(`${API_URL}/products/${editingProduct.id}`, {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          categoryId: formData.categoryId,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Product updated successfully!', toastConfig);
      } else {
        const formPayload = new FormData();
        formPayload.append('sku', formData.sku);
        formPayload.append('name', formData.name);
        formPayload.append('description', formData.description);
        formPayload.append('price', formData.price);
        formPayload.append('stock', formData.stock);
        formPayload.append('categoryId', formData.categoryId);
        if (imageFile) {
          formPayload.append('image', imageFile);
        }
        await axios.post(`${API_URL}/products`, formPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        toast.success('Product created successfully!', toastConfig);
      }
      closeModal();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving product', toastConfig);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredProducts = statusFilter === 'ALL'
    ? products
    : products.filter((p) => p.status === statusFilter);

  const getStatusBadge = (product: Product) => {
    if (product.status === 'APPROVED') return { label: 'Approved', cls: 'bg-green-100 text-green-800' };
    if (product.status === 'CANCELLED') return { label: 'Rejected', cls: 'bg-red-100 text-red-800' };
    if (product.isSubmittedForApproval) return { label: 'Under Review', cls: 'bg-blue-100 text-blue-800' };
    return { label: 'Draft', cls: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user || user.role !== 'SELLER') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-8 px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-600 mt-1">Manage your products</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCsvModal(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition">
              CSV Import
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg transition text-sm font-medium bg-green-600 text-white hover:bg-green-700"
            >
              + Add Product
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-6">
          {['ALL', 'APPROVED', 'PENDING', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status === 'ALL' ? 'All' : status === 'CANCELLED' ? 'Rejected' : status.charAt(0) + status.slice(1).toLowerCase()}
              {status !== 'ALL' && (
                <span className="ml-1.5 text-xs">
                  ({products.filter(p => p.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Products */}
        {loadingProducts ? (
          <div className="text-center py-20">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-900 text-lg font-semibold mb-2">No products found</p>
            <p className="text-gray-500 text-sm">
              {statusFilter !== 'ALL' ? 'Try a different filter' : 'Create your first product to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {filteredProducts.map((product) => {
              const badge = getStatusBadge(product);
              const canSubmit = user.status === 'ACTIVE' && product.status === 'PENDING' && !product.isSubmittedForApproval;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden cursor-pointer" onClick={() => setDetailProduct(product)}>
                    {product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    {/* Edit Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(product); }}
                      className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow hover:bg-yellow-500 hover:text-white transition"
                      title="Edit Product"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Stock */}
                    <div className="absolute bottom-3 left-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        product.stock > 10 ? 'bg-green-100 text-green-700' :
                        product.stock > 0 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {product.stock} in stock
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm truncate text-gray-900">{product.name}</h3>
                      <span className="ml-2 shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {product.category?.name || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{product.sku}</p>
                    <p className="text-xs text-gray-500 mb-3">Stock: {product.stock}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-blue-600">
                        R$ {parseFloat(product.price.toString()).toFixed(2)}
                      </p>
                    </div>

                    {/* Submit for Approval Button */}
                    {canSubmit && (
                      <button
                        onClick={() => handleSubmitForApproval(product.id)}
                        disabled={submitting === product.id}
                        className="w-full mt-3 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                      >
                        {submitting === product.id ? 'Submitting...' : 'Submit for Approval'}
                      </button>
                    )}
                    {product.status === 'PENDING' && !canSubmit && user.status === 'PENDING' && (
                      <p className="mt-3 text-xs text-gray-400 text-center">
                        Account approval required to submit
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">SKU *</label>
                <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required disabled={!!editingProduct} className={`w-full p-2 border rounded ${editingProduct ? 'bg-gray-100' : ''}`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full p-2 border rounded" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (R$) *</label>
                  <input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock *</label>
                  <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} required className="w-full p-2 border rounded">
                    <option value="">Select</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Image</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full p-2 border rounded" />
                {imageFile && <p className="text-sm text-gray-600 mt-1">Selected: {imageFile.name}</p>}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={formLoading} className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {formLoading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" onClick={closeModal} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDetailProduct(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
              <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
              <button onClick={() => setDetailProduct(null)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>

            <div className="p-6">
              {/* Images */}
              {detailProduct.images.length > 0 ? (
                <div className="mb-6">
                  <div className="rounded-lg overflow-hidden bg-gray-100 mb-3">
                    <img src={detailProduct.images[0]} alt={detailProduct.name} className="w-full h-72 object-contain" />
                  </div>
                  {detailProduct.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {detailProduct.images.map((img, idx) => (
                        <img key={idx} src={img} alt={`${detailProduct.name} ${idx + 1}`} className="h-20 w-20 object-cover rounded-lg border-2 border-gray-200 shrink-0" />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Status & Category */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusBadge(detailProduct).cls}`}>
                  {getStatusBadge(detailProduct).label}
                </span>
                <span className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                  {detailProduct.category?.name || 'Uncategorized'}
                </span>
              </div>

              {/* Name & Price */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{detailProduct.name}</h3>
              <p className="text-2xl font-bold text-blue-600 mb-4">R$ {parseFloat(detailProduct.price.toString()).toFixed(2)}</p>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase font-medium">SKU</p>
                  <p className="text-sm font-semibold text-gray-900">{detailProduct.sku}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase font-medium">Stock</p>
                  <p className={`text-sm font-semibold ${detailProduct.stock > 10 ? 'text-green-700' : detailProduct.stock > 0 ? 'text-yellow-700' : 'text-red-700'}`}>
                    {detailProduct.stock} units
                  </p>
                </div>
              </div>

              {/* Description */}
              {detailProduct.description && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 uppercase font-medium mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{detailProduct.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => { setDetailProduct(null); openEditModal(detailProduct); }}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium transition"
                >
                  Edit Product
                </button>
                <button
                  onClick={() => setDetailProduct(null)}
                  className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
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
                <label className="block text-sm font-medium mb-1">CSV File *</label>
                <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="w-full p-2 border rounded" />
                <p className="text-xs text-gray-500 mt-1">Columns: sku, name, description, price, stock, categoryId, images (URLs separated by ;)</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCsvImport} disabled={csvLoading || !csvFile} className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-400">
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
