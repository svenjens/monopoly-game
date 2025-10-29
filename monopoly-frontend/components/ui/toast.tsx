/**
 * Toast Notification Component
 * 
 * Simple toast notification system for user feedback.
 */

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

const toastStore: {
  toasts: Toast[];
  listeners: Set<(toasts: Toast[]) => void>;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
} = {
  toasts: [],
  listeners: new Set(),
  
  addToast(toast) {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.listeners.forEach(listener => listener(this.toasts));
    
    // Auto remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }
  },
  
  removeToast(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.listeners.forEach(listener => listener(this.toasts));
  },
};

export const toast = {
  success: (message: string, duration?: number) => 
    toastStore.addToast({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => 
    toastStore.addToast({ message, type: 'error', duration }),
  info: (message: string, duration?: number) => 
    toastStore.addToast({ message, type: 'info', duration }),
  warning: (message: string, duration?: number) => 
    toastStore.addToast({ message, type: 'warning', duration }),
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  useEffect(() => {
    toastStore.listeners.add(setToasts);
    return () => {
      toastStore.listeners.delete(setToasts);
    };
  }, []);
  
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      case 'warning':
        return 'bg-yellow-600 text-white';
      case 'info':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-900 text-white';
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-right`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => toastStore.removeToast(toast.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}


