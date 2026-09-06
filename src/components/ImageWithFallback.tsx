import React, { useState } from 'react';
import { getDriveDirectImageUrl, DEFAULT_AVATAR_PLACEHOLDER, DEFAULT_IMAGE_PLACEHOLDER } from '../utils/helpers';
import { Image as ImageIcon } from 'lucide-react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  isAvatar?: boolean;
  className?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  isAvatar = false,
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const directUrl = src ? getDriveDirectImageUrl(src) : '';
  const fallbackSrc = isAvatar ? DEFAULT_AVATAR_PLACEHOLDER : DEFAULT_IMAGE_PLACEHOLDER;

  if (!directUrl || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 border border-slate-200 overflow-hidden ${className}`}
        title={`${alt} (แสดงรูปตัวอย่าง)`}
      >
        <img
          src={fallbackSrc}
          alt={alt}
          className="w-1/2 h-1/2 object-contain opacity-50"
          loading="lazy"
        />
        {!isAvatar && (
          <span className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> ไม่พบรูปต้นฉบับ
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={directUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        referrerPolicy="no-referrer"
        loading="lazy"
        {...props}
      />
    </div>
  );
};
