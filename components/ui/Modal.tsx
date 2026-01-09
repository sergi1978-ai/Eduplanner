import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} flex flex-col max-h-[95vh]`}>
        <div className="flex justify-between items-center px-6 py-4 border-b flex-none">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100 p-1">
            <X size={24} />
          </button>
        </div>
        {/* Content Wrapper - Removed p-4 to allow full-bleed layouts */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
          {children}
        </div>
      </div>
    </div>
  );
};