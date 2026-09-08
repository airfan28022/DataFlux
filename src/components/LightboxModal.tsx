import React from 'react';
import { ActivityPhoto } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { formatThaiDate } from '../utils/helpers';
import { dataService } from '../services/dataService';
import { X, Trash2, Calendar, Tag, ExternalLink } from 'lucide-react';

interface LightboxModalProps {
  photo: ActivityPhoto | null;
  onClose: () => void;
  isAdmin: boolean;
  onDelete?: (id: string) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ photo, onClose, isAdmin, onDelete }) => {
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative bg-slate-900 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[92vh]">
        {/* Top bar controls */}
        <div className="p-4 px-6 flex items-center justify-between border-b border-slate-800/80 text-white bg-slate-900/90">
          <div>
            <h3 className="text-base sm:text-lg font-bold truncate max-w-md">{photo.title}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {formatThaiDate(photo.date)}
              </span>
              {photo.category && (
                <span className="flex items-center gap-1 bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-md text-[11px] border border-emerald-800/50">
                  <Tag className="w-3 h-3" />
                  {photo.category}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {photo.driveUrl && (
              <a
                href={photo.driveUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="เปิดในแท็บใหม่"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
            {isAdmin && onDelete && (
              <button
                onClick={() => {
                  dataService.showAlert({
                    type: 'warning',
                    title: 'ยืนยันการลบรูปภาพ?',
                    text: `คุณต้องการลบรูปภาพ "${photo.title}" ใช่หรือไม่?`,
                    showCancelButton: true,
                    confirmButtonText: 'ลบรูปภาพ',
                    cancelButtonText: 'ยกเลิก',
                    onConfirm: () => {
                      onDelete(photo.id);
                      onClose();
                    },
                  });
                }}
                className="p-2 text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-950/50 transition-colors cursor-pointer"
                title="ลบรูปภาพนี้ (แอดมิน)"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="ปิด"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Large Image Preview with Fallback */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative min-h-[300px]">
          <ImageWithFallback
            src={photo.driveUrl}
            alt={photo.title}
            className="max-h-[68vh] w-auto max-w-full rounded-xl object-contain shadow-md"
          />
        </div>

        {/* Description bottom note */}
        {photo.description && (
          <div className="p-4 px-6 bg-slate-900 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300">
            {photo.description}
          </div>
        )}
      </div>
    </div>
  );
};
