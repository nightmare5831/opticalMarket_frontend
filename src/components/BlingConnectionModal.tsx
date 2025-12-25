'use client';

import { useState } from 'react';
import Request from '@/lib/api';
import { toast } from 'react-toastify';
import { toastConfig } from '@/lib/toast';

interface BlingConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BlingConnectionModal({ isOpen, onClose }: BlingConnectionModalProps) {
  const [invitationUrl, setInvitationUrl] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);

  if (!isOpen) return null;

  const handleConnectBling = async () => {
    if (!invitationUrl.trim() || !clientSecret.trim()) {
      toast.error('Please fill in all fields', toastConfig);
      return;
    }

    setConnectLoading(true);
    try {
      // Extract client_id and state from invitation URL
      const url = new URL(invitationUrl);
      const clientId = url.searchParams.get('client_id');
      const state = url.searchParams.get('state');

      if (!clientId || !state) {
        toast.error('Invalid invitation URL: missing client_id or state parameter', toastConfig);
        setConnectLoading(false);
        return;
      }

      // Save credentials to backend
      await Request.Post('/bling/credentials', { clientId, clientSecret, state });

      // Close modal and reset
      setInvitationUrl('');
      setClientSecret('');
      onClose();

      // Redirect to Bling OAuth using the invitation URL
      window.location.href = invitationUrl;
    } catch (error: any) {
      toast.error('Failed to connect: ' + (error?.response?.data?.message || error.message || 'Unknown error'), toastConfig);
      setConnectLoading(false);
    }
  };

  const handleClose = () => {
    if (!connectLoading) {
      setInvitationUrl('');
      setClientSecret('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-xl font-bold mb-4">Connect Bling Account</h3>
        <p className="text-gray-600 mb-4">Enter your Bling invitation URL and Client Secret:</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invitation URL
            </label>
            <input
              type="text"
              value={invitationUrl}
              onChange={(e) => setInvitationUrl(e.target.value)}
              placeholder="https://www.bling.com.br/Api/v3/oauth/authorize?..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Secret
            </label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter your Bling Client Secret"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={handleClose}
            disabled={connectLoading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConnectBling}
            disabled={connectLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {connectLoading ? 'Connecting...' : 'Connect & Authorize'}
          </button>
        </div>
      </div>
    </div>
  );
}
