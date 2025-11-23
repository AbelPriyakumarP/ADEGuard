import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-24 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-fade-in-up backdrop-blur-sm transition-all ${
      type === 'success' 
        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-900/90 dark:border-emerald-800 dark:text-emerald-100' 
        : 'bg-red-50/90 border-red-200 text-red-800 dark:bg-red-900/90 dark:border-red-800 dark:text-red-100'
    }`}>
      {type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

export default Toast;
