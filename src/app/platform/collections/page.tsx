'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/components/AppLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import axios from 'axios';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  _count?: { products: number };
  seller?: { id: string; name: string } | null;
}

export default function PlatformCollectionsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { token } = useAuthStore();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (user.role !== 'PLATFORM_USER') { router.push('/'); return; }
    fetchCollections();
  }, [user, loading, router]);

  const fetchCollections = async () => {
    setLoadingData(true);
    try {
      const res = await axios.get(`${API_URL}/collections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCollections(Array.isArray(res.data) ? res.data : []);
    } catch { setCollections([]); }
    finally { setLoadingData(false); }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: '', slug: '', description: '' });
    setShowModal(true);
  };

  const openEditModal = (collection: Collection) => {
    setEditingId(collection.id);
    setFormData({ name: collection.name, slug: collection.slug, description: collection.description || '' });
    setShowModal(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    const slug = !editingId ? generateSlug(name) : formData.slug;
    setFormData({ ...formData, name, slug });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required', toastConfig);
      return;
    }
    setFormLoading(true);
    try {
      if (editingId) {
        await axios.put(`${API_URL}/collections/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Collection updated!', toastConfig);
      } else {
        await axios.post(`${API_URL}/collections`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Collection created!', toastConfig);
      }
      setShowModal(false);
      fetchCollections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error saving collection', toastConfig);
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete collection "${name}"? Products will be unlinked but not deleted.`)) return;
    try {
      await axios.delete(`${API_URL}/collections/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Collection deleted', toastConfig);
      fetchCollections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting collection', toastConfig);
    }
  };

  if (loading || !user || user.role !== 'PLATFORM_USER') return null;

  return (
    <AppLayout>
      <main className="mx-8 px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
            <p className="text-gray-600 mt-1">Manage commercial groupings for products</p>
          </div>
          <button onClick={openCreateModal} className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition">
            + New Collection
          </button>
        </div>

        {loadingData ? (
          <div className="text-center py-20">
            <LoadingSpinner />
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-gray-900 text-lg font-semibold mb-2">No collections yet</p>
            <p className="text-gray-500 text-sm mb-4">Create your first collection (e.g. Premium, Kids, Seasonal)</p>
            <button onClick={openCreateModal} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              Create Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {collections.map((collection) => (
              <div key={collection.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{collection.name}</h3>
                    <p className="text-xs text-gray-400">{collection.slug}</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                    {collection._count?.products ?? 0} product{(collection._count?.products ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs mb-2">
                  {collection.seller ? (
                    <span className="text-indigo-600 font-medium">Seller: {collection.seller.name}</span>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </p>
                {collection.description && (
                  <p className="text-sm text-gray-600 mb-3">{collection.description}</p>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={() => openEditModal(collection)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(collection.id, collection.name)} className="text-sm text-red-600 hover:text-red-800 font-medium">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit' : 'New'} Collection</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="e.g. Premium, Kids, Seasonal"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  placeholder="e.g. premium, kids, seasonal"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Optional description for this collection"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={formLoading} className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-400">
                  {formLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
