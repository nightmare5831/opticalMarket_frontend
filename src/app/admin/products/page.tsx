'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Request from '@/lib/api';
import Header from '@/components/Header';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  createdAt: string;
  category: { id: string; name: string };
  seller?: { id: string; name: string; email: string };
}

type TabType = 'ALL' | 'PENDING' | 'APPROVED' | 'CANCELLED';

export default function AdminProductsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
    } else if (user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await Request.Get('/admin/products');
      setAllProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products', toastConfig);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchProducts();
    }
  }, [user]);

  const handleUpdateStatus = async (productId: string, newStatus: 'PENDING' | 'APPROVED' | 'CANCELLED') => {
    try {
      await Request.Patch(`/admin/products/${productId}/status`, { status: newStatus });
      toast.success(`Product ${newStatus.toLowerCase()}`, toastConfig);
      fetchProducts();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update status', toastConfig);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected product(s)?`)) return;
    setDeleting(true);
    try {
      await Request.Delete('/admin/products/batch', { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} product(s) deleted`, toastConfig);
      setSelectedIds(new Set());
      fetchProducts();
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.blocked?.length) {
        const deletedMsg = data.deleted > 0 ? `${data.deleted} product(s) deleted. ` : '';
        toast.warning(
          `${deletedMsg}${data.blocked.length} product(s) have orders and cannot be deleted: ${data.blocked.join(', ')}`,
          { ...toastConfig, autoClose: 8000 }
        );
        setSelectedIds(new Set());
        fetchProducts();
      } else {
        toast.error(data?.message || 'Failed to delete products', toastConfig);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user || user.role !== 'ADMIN') {
    return null;
  }

  // Calculate statistics
  const stats = {
    all: allProducts.length,
    pending: allProducts.filter(p => p.status === 'PENDING').length,
    approved: allProducts.filter(p => p.status === 'APPROVED').length,
    cancelled: allProducts.filter(p => p.status === 'CANCELLED').length,
  };

  // Filter products based on active tab
  const filteredProducts = activeTab === 'ALL'
    ? allProducts
    : allProducts.filter(p => p.status === activeTab);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      APPROVED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-8 px-6 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
            <p className="text-gray-600">Review and approve product listings</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('ALL')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">All Products</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {productsLoading ? '...' : stats.all}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('PENDING')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Pending Products</h3>
                <p className="mt-2 text-3xl font-bold text-yellow-700">
                  {productsLoading ? '...' : stats.pending}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-green-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('APPROVED')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Approved Products</h3>
                <p className="mt-2 text-3xl font-bold text-green-700">
                  {productsLoading ? '...' : stats.approved}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('CANCELLED')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Cancelled Products</h3>
                <p className="mt-2 text-3xl font-bold text-red-700">
                  {productsLoading ? '...' : stats.cancelled}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-lg shadow-sm border border-gray-200 border-b-0">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'ALL'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Products ({stats.all})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'PENDING'
                  ? 'border-b-2 border-yellow-600 text-yellow-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'APPROVED'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Approved ({stats.approved})
            </button>
            <button
              onClick={() => setActiveTab('CANCELLED')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'CANCELLED'
                  ? 'border-b-2 border-red-600 text-red-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cancelled ({stats.cancelled})
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-0 flex items-center justify-between">
            <span className="text-sm text-blue-800 font-medium">{selectedIds.size} product(s) selected</span>
            <button
              onClick={handleBatchDelete}
              disabled={deleting}
              className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 overflow-hidden">
          {productsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No products found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                            <div className="text-xs text-gray-400">{product.category.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{product.seller?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{product.seller?.email || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        R$ {Number(product.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product.stock}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(product.status)}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {product.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(product.id, 'APPROVED')}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(product.id, 'CANCELLED')}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {product.status === 'CANCELLED' && (
                            <button
                              onClick={() => handleUpdateStatus(product.id, 'APPROVED')}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {product.status === 'APPROVED' && (
                            <button
                              onClick={() => handleUpdateStatus(product.id, 'CANCELLED')}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
