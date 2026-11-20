import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ArtworkImageFrameProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

export function ArtworkImageFrame({
  src,
  alt,
  className = '',
  imgClassName = 'w-full h-full object-cover',
}: ArtworkImageFrameProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`bg-gradient-to-br from-[#F7F7F7] via-[#DEE9EC]/40 to-[#F0F3E1]/60 flex flex-col items-center justify-center p-6 text-center ${className}`}
      >
        <ImageOff className="w-7 h-7 text-[#19706D]/50 mb-2" aria-hidden="true" />
        <p className="font-display text-sm font-semibold text-[#363E49]/75 line-clamp-2">{alt}</p>
      </div>
    );
  }

  return (
    <div className={`bg-[#F7F7F7] overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={imgClassName}
      />
    </div>
  );
}
