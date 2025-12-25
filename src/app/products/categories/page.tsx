'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { toastConfig } from '@/lib/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

export default function CategoriesPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [blingConnected, setBlingConnected] = useState(false);
  const [checkingBling, setCheckingBling] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!token || (user?.role !== 'ADMIN' && user?.role !== 'SELLER')) {
      router.push('/login');
      return;
    }

    const initialize = async () => {
      const isConnected = await checkBlingConnection();
      if (!isConnected) {
        setLoading(false);
        return;
      }
      fetchCategories();
    };

    initialize();
  }, [token, user, mounted]);

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
      const response = await axios.get(`${API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/categories/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URL}/categories`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      toast.success(editingId ? 'Category updated successfully!' : 'Category created successfully!', toastConfig);
      setFormData({ name: '', slug: '' });
      setShowForm(false);
      setEditingId(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving category', toastConfig);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({ name: category.name, slug: category.slug });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await axios.delete(`${API_URL}/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Category deleted successfully!', toastConfig);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting category', toastConfig);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer />

      <div className="mx-8 px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-600 mt-1">Manage your product categories and sync with Bling ERP</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ name: '', slug: '' });
            }}
            disabled={!blingConnected || checkingBling}
            className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
              blingConnected && !checkingBling
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!blingConnected ? 'Connect Bling ERP to add categories' : 'Add Category'}
          >
            {checkingBling ? 'Checking...' : showForm ? 'Cancel' : '+ Add Category'}
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-lg">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: '', slug: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        name: e.target.value,
                        slug: generateSlug(e.target.value),
                      });
                    }}
                    required
                    placeholder="Enter category name"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                    placeholder="category-slug"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">URL-friendly version of the name</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {editingId ? 'Update Category' : 'Create Category'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({ name: '', slug: '' });
                    }}
                    className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Categories List */}
        {loading || checkingBling ? (
          <div className="text-center py-20">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">
              {checkingBling ? 'Checking Bling connection...' : 'Loading categories...'}
            </p>
          </div>
        ) : !blingConnected ? (
          <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-orange-300">
            <div className="text-7xl mb-4">⚠️</div>
            <p className="text-gray-900 text-xl font-semibold mb-2">Bling ERP Not Connected</p>
            <p className="text-gray-600">Connect your Bling account to manage categories.</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-7xl mb-4">📁</div>
            <p className="text-gray-900 text-xl font-semibold mb-2">No categories found</p>
            <p className="text-gray-500">Click "Add Category" to create your first category</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Slug</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">Products</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{category.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">{category.slug}</code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {category._count?.products || 0} products
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-blue-600 hover:text-blue-700 font-medium mr-4 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-700 font-medium transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
