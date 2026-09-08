import React, { useEffect, useState } from 'react';
import { ToastMessage } from '../types';
import { dataService } from '../services/dataService';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return dataService.subscribeToast((newToast) => {
      setToasts((prev) => [...prev, newToast]);
      if (newToast.duration) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    });
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-100/90 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'error':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-100/90 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-100/90 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-sky-100/90 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Info className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none p-4 gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="pointer-events-auto flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl max-w-sm w-full select-none"
          >
            {getIcon(toast.type)}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-800 text-sm">{toast.title}</div>
              {toast.message && <div className="text-slate-500 text-xs mt-0.5 line-clamp-2">{toast.message}</div>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
              title="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
