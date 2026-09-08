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
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        );
      case 'warning':
      case 'question':
        return (
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
            <AlertTriangle className="w-7 h-7" />
          </div>
        );
      case 'error':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
            <AlertCircle className="w-7 h-7" />
          </div>
        );
      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
            <Info className="w-7 h-7" />
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white rounded-2xl p-6 md:p-7 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
        >
          {renderIcon()}

          <h3 className="text-lg font-bold text-slate-800 mb-1.5">{options.title}</h3>
          {options.text && <p className="text-slate-600 text-xs sm:text-sm mb-5 leading-relaxed">{options.text}</p>}

          <div className="flex items-center justify-center gap-2.5">
            {options.showCancelButton && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                {options.cancelButtonText || 'ยกเลิก'}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer ${
                options.type === 'error' || options.confirmButtonText?.includes('ลบ')
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  : options.type === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
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
