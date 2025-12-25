'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import Header from '@/components/Header';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
  seller?: { name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ProductsPage() {
  const { token, user } = useAuthStore();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [blingConnected, setBlingConnected] = useState(false);
  const [checkingBling, setCheckingBling] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [searchSku, setSearchSku] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Form data
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initialize = async () => {
      // For ADMIN and SELLER, check Bling connection first
      if (user?.role === 'ADMIN' || user?.role === 'SELLER') {
        const isConnected = await checkBlingConnection();
        if (!isConnected) {
          setLoading(false);
          return; // Don't fetch products if not connected
        }
      }

      // Fetch data only if connected or if user is CUSTOMER
      fetchCategories();
      fetchAllProducts();
    };

    initialize();
  }, [user, mounted]);

  const checkBlingConnection = async (): Promise<boolean> => {
    if (!token) return false;

    setCheckingBling(true);
    try {
      const response = await axios.get(`${API_URL}/bling/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const isConnected = response.data.configured && response.data.connected;
      setBlingConnected(isConnected);

      if (!isConnected) {
        toast.error('Bling connection required', toastConfig);
      }

      return isConnected;
    } catch (error) {
      console.error('Error checking Bling connection:', error);
      setBlingConnected(false);
      toast.error(
        'Failed to check Bling connection. Please try again.',
        toastConfig
      );
      return false;
    } finally {
      setCheckingBling(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAllProducts = async () => {
    setLoading(true);
    try {
      // Customers and Admins see all products, Sellers see only their own
      const endpoint = user?.role === 'SELLER'
        ? `${API_URL}/products/seller/me`
        : `${API_URL}/products`;

      // Only add auth header for seller endpoint (which requires it)
      const config = user?.role === 'SELLER' && token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const response = await axios.get(endpoint, config);

      // Handle different response formats:
      // /products returns { data: [...], meta: {...} }
      // /products/seller/me returns [...]
      const products = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setAllProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering
  const filteredProducts = (allProducts || []).filter((product) => {
    if (!product) return false;
    if (searchName && !product.name?.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (searchSku && !product.sku?.toLowerCase().includes(searchSku.toLowerCase())) return false;
    if (selectedCategory && product.category?.id !== selectedCategory) return false;
    if (minPrice && product.price < parseFloat(minPrice)) return false;
    if (maxPrice && product.price > parseFloat(maxPrice)) return false;
    if (minStock && product.stock < parseInt(minStock)) return false;
    if (maxStock && product.stock > parseInt(maxStock)) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchSku, selectedCategory, minPrice, maxPrice, minStock, maxStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
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
      setShowModal(false);
      setFormData({ sku: '', name: '', description: '', price: '', stock: '', categoryId: '' });
      setImageFile(null);
      fetchAllProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating product', toastConfig);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer />

      <div className="mx-8 px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600 mt-1">
              {user?.role === 'SELLER'
                ? 'Manage your products'
                : user?.role === 'ADMIN'
                ? 'View and manage all products'
                : 'Browse all available products'}
            </p>
          </div>
          {(user?.role === 'SELLER' || user?.role === 'ADMIN') && (
            <button
              onClick={() => setShowModal(true)}
              disabled={!blingConnected || checkingBling}
              className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                blingConnected && !checkingBling
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!blingConnected ? 'Connect Bling ERP to add products' : 'Add Product'}
            >
              {checkingBling ? 'Checking...' : '+ Add Product'}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Filter Products</h2>
            <button
              onClick={() => {
                setSearchName('');
                setSearchSku('');
                setSelectedCategory('');
                setMinPrice('');
                setMaxPrice('');
                setMinStock('');
                setMaxStock('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Search by Name</label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Product name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Search by SKU</label>
              <input
                type="text"
                value={searchSku}
                onChange={(e) => setSearchSku(e.target.value)}
                placeholder="SKU..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Stock Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <input
                  type="number"
                  value={maxStock}
                  onChange={(e) => setMaxStock(e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
          {mounted && (
            <div className="mt-4 text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredProducts.length}</span> of <span className="font-semibold text-gray-900">{allProducts.length}</span> products
            </div>
          )}
        </div>

        {/* Products Grid */}
        {loading || checkingBling ? (
          <div className="text-center py-20">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">
              {checkingBling ? 'Checking Bling connection...' : 'Loading products...'}
            </p>
          </div>
        ) : !blingConnected && (user?.role === 'ADMIN' || user?.role === 'SELLER') ? (
          <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-orange-300">
            <div className="text-7xl mb-4">⚠️</div>
            <p className="text-gray-900 text-xl font-semibold mb-2">Bling ERP Not Connected</p>
            <p className="text-gray-600">Connect your Bling account to manage products.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-7xl mb-4">🔍</div>
            <p className="text-gray-900 text-xl font-semibold mb-2">No products found</p>
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 group"
                >
                  <div className="relative h-52 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-300 text-5xl">📷</span>
                      </div>
                    )}
                    {/* Eye Icon */}
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowProductDetail(true);
                      }}
                      className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 transform hover:scale-110"
                      title="View Details"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    {/* Stock Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {product.stock} in stock
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <span className="inline-block px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full mb-2">
                      {product.category?.name || 'Uncategorized'}
                    </span>
                    <h3 className="font-semibold text-base mb-2 truncate text-gray-900 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-3">SKU: {product.sku}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-blue-600">
                        R$ {parseFloat(product.price.toString()).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300 transition font-medium text-sm text-gray-700 hover:text-blue-600"
                >
                  ← Prev
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2.5 rounded-lg font-medium text-sm transition ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 hover:border-blue-300 transition font-medium text-sm text-gray-700 hover:text-blue-600"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded"
                />
                {imageFile && (
                  <p className="text-sm text-gray-600 mt-1">Selected: {imageFile.name}</p>
                )}
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

      {/* Product Detail Modal */}
      {showProductDetail && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
              <button onClick={() => setShowProductDetail(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Product Images */}
                <div>
                  {selectedProduct.images.length > 0 ? (
                    <div className="space-y-3">
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-96 object-cover" />
                      </div>
                      {selectedProduct.images.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {selectedProduct.images.slice(1, 5).map((img, idx) => (
                            <div key={idx} className="rounded overflow-hidden border border-gray-200">
                              <img src={img} alt={`${selectedProduct.name} ${idx + 2}`} className="w-full h-20 object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                      <span className="text-gray-400 text-6xl">📷</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-5">
                  <div>
                    <div className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full mb-3">
                      {selectedProduct.category?.name || 'Uncategorized'}
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-gray-500 mt-2 text-sm">SKU: {selectedProduct.sku}</p>
                  </div>

                  <div className="py-4 border-t border-b">
                    <p className="text-4xl font-bold text-blue-600">R$ {parseFloat(selectedProduct.price.toString()).toFixed(2)}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm font-medium text-gray-600">Stock Available</span>
                      <span className="text-lg font-semibold text-gray-900">{selectedProduct.stock} units</span>
                    </div>

                    {selectedProduct.seller && (
                      <div className="flex items-center justify-between py-3 border-b">
                        <span className="text-sm font-medium text-gray-600">Seller</span>
                        <span className="font-semibold text-gray-900">{selectedProduct.seller.name}</span>
                      </div>
                    )}
                  </div>

                  {selectedProduct.description && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-600 leading-relaxed">{selectedProduct.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
