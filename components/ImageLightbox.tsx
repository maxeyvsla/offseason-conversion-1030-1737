'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageLightboxProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export default function ImageLightbox({ src, alt, width, height }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="relative w-full h-[200px]">
        <img
          src={src}
          alt={alt}
          className="w-full h-full rounded cursor-pointer hover:opacity-90 transition-opacity object-contain"
          onClick={() => setIsOpen(true)}
        />
      </div>
      
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center cursor-pointer p-4"
          onClick={() => setIsOpen(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}