import React from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { Toast } from './types';

interface ToastNotificationsProps {
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
}

const ToastNotifications: React.FC<ToastNotificationsProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-md shadow-lg text-sm font-medium cursor-pointer ${
            toast.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
          onClick={() => onRemoveToast(toast.id)}
        >
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastNotifications; 