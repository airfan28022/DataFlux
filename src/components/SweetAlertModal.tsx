import React, { useEffect, useState } from 'react';
import { SweetAlertOptions } from '../types';
import { dataService } from '../services/dataService';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export const SweetAlertModal: React.FC = () => {
  const [options, setOptions] = useState<SweetAlertOptions | null>(null);

  useEffect(() => {
    return dataService.subscribeAlert((opt) => {
      setOptions(opt);
    });
  }, []);

  if (!options) return null;

  const handleConfirm = () => {
    if (options.onConfirm) options.onConfirm();
    setOptions(null);
  };

  const handleCancel = () => {
    if (options.onCancel) options.onCancel();
    setOptions(null);
  };

  const renderIcon = () => {
    switch (options.type) {
      case 'success':
        return (
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        );
      case 'warning':
      case 'question':
        return (
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10" />
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10" />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-4">
            <Info className="w-10 h-10" />
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center"
        >
          {renderIcon()}

          <h3 className="text-xl font-bold text-slate-800 mb-2">{options.title}</h3>
          {options.text && <p className="text-slate-600 text-sm mb-6 leading-relaxed">{options.text}</p>}

          <div className="flex items-center justify-center gap-3">
            {options.showCancelButton && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors cursor-pointer"
              >
                {options.cancelButtonText || 'ยกเลิก'}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-all shadow-sm cursor-pointer ${
                options.type === 'error'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : options.type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {options.confirmButtonText || 'ตกลง'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
