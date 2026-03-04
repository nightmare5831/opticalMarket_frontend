'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cartStore';
import AppLayout from '@/components/AppLayout';
import PublicLayout from '@/components/PublicLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import Request from '@/lib/api';
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
  category: { id: string; name: string };
  collection?: { id: string; name: string; slug: string } | null;
  seller?: { id: string; name: string; sellerType?: string; legalCompanyName?: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [searchSku, setSearchSku] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchCategories();
    fetchCollections();
    fetchAllProducts();
  }, [mounted]);

  const fetchCategories = async () => {
    try {
      const data = await Request.Get('/categories?productType=B2C&scope=shop');
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCollections = async () => {
    try {
      const data = await Request.Get('/collections/public');
      setCollections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const fetchAllProducts = async () => {
    setLoading(true);
    try {
      const data = await Request.Get('/products?productType=B2C&limit=500');
      const products = Array.isArray(data) ? data : data?.data || [];
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
    if (selectedCollection && product.collection?.id !== selectedCollection) return false;
    if (minPrice && product.price < parseFloat(minPrice)) return false;
    if (maxPrice && product.price > parseFloat(maxPrice)) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchSku, selectedCategory, selectedCollection, minPrice, maxPrice]);

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.info('Please login to add items to cart', toastConfig);
      router.push('/auth/login?redirect=/buyer/products');
      return;
    }
    if (product.stock < 1) {
      toast.error('Product is out of stock', toastConfig);
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      stock: product.stock,
      category: product.category?.name,
      sellerName: product.seller?.name,
      sellerId: product.seller?.id,
      sellerType: product.seller?.sellerType as any,
    });
    toast.success(`${product.name} added to cart!`, toastConfig);
  };

  const hasActiveFilters = searchName || searchSku || selectedCategory || selectedCollection || minPrice || maxPrice;

  const Layout = user ? AppLayout : PublicLayout;

  return (
    <Layout>
      <div className="px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {user ? 'Products' : 'Optical Market'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user ? 'Browse all available products' : 'Discover quality optical products'}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Search by Name</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Product name..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-none border-b border-gray-300 focus:border-blue-500 text-sm bg-transparent hover:bg-gray-50 transition outline-none"
                />
              </div>
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Search by SKU</label>
              <input
                type="text"
                value={searchSku}
                onChange={(e) => setSearchSku(e.target.value)}
                placeholder="SKU..."
                className="w-full px-3 py-2.5 rounded-none border-b border-gray-300 focus:border-blue-500 text-sm bg-transparent hover:bg-gray-50 transition outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-none border-b border-gray-300 focus:border-blue-500 text-sm bg-transparent hover:bg-gray-50 transition outline-none appearance-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Collection */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Collection</label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full px-3 py-2.5 rounded-none border-b border-gray-300 focus:border-blue-500 text-sm bg-transparent hover:bg-gray-50 transition outline-none appearance-none cursor-pointer"
              >
                <option value="">All Collections</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Price Range</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2.5 rounded-none border-b border-gray-300 focus:border-blue-500 text-sm bg-transparent hover:bg-gray-50 transition outline-none"
                />
                <span className="text-gray-400 text-sm shrink-0">-</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2.5 rounded-none border-b border-gray-300 focus:border-blue-500 text-sm bg-transparent hover:bg-gray-50 transition outline-none"
                />
              </div>
            </div>

            {/* Clear */}
            <div className="flex items-end justify-end">
              <button
                onClick={() => {
                  setSearchName('');
                  setSearchSku('');
                  setSelectedCategory('');
                  setSelectedCollection('');
                  setMinPrice('');
                  setMaxPrice('');
                }}
                disabled={!hasActiveFilters}
                className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Result count + active filter pills */}
          {mounted && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                {filteredProducts.length} of {allProducts.length} products
              </span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <button onClick={() => setSelectedCategory('')} className="hover:text-blue-900">&times;</button>
                </span>
              )}
              {selectedCollection && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                  {collections.find(c => c.id === selectedCollection)?.name}
                  <button onClick={() => setSelectedCollection('')} className="hover:text-purple-900">&times;</button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  {minPrice ? `R$${minPrice}` : '0'} - {maxPrice ? `R$${maxPrice}` : '...'}
                  <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="hover:text-green-900">&times;</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20">
            <LoadingSpinner message="Loading products..." />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-900 text-xl font-semibold mb-2">No products found</p>
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {paginatedProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 group"
                >
                  <div
                    className="relative h-52 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden cursor-pointer"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowProductDetail(true);
                    }}
                  >
                    {product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-300 text-5xl">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                      </div>
                    )}
                    {/* View Details */}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowProductDetail(true);
                        }}
                        className="bg-white/95 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110"
                        title="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                    {/* Stock Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {product.stock} in stock
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-base truncate text-gray-900 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                      <span className="ml-2 shrink-0 px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {product.category?.name || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{product.sku}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-blue-600">
                        R$ {parseFloat(product.price.toString()).toFixed(2)}
                      </p>
                      {(!user || user?.role === 'CUSTOMER') && (
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock < 1}
                          className={`p-2 rounded-lg transition ${
                            product.stock < 1
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          title={product.stock < 1 ? 'Out of stock' : 'Add to cart'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                      )}
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
                  Prev
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
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

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
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
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

                  {/* Add to Cart Button for Customers and unauthenticated users */}
                  {(!user || user?.role === 'CUSTOMER') && (
                    <div className="mt-6 pt-4 border-t">
                      <button
                        onClick={() => {
                          handleAddToCart(selectedProduct);
                          setShowProductDetail(false);
                        }}
                        disabled={selectedProduct.stock < 1}
                        className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                          selectedProduct.stock < 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {selectedProduct.stock < 1 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
