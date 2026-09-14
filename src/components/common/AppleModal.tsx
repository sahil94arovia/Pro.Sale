import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface AppleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const AppleModal: React.FC<AppleModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto print:static print:p-0 print:overflow-visible print:bg-white">
          {/* Frosted Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 backdrop-blur-md no-print"
          />

          {/* Spring Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative w-full ${maxWidth} bg-white text-neutral-900 rounded-3xl shadow-2xl border border-black/[0.08] overflow-hidden z-10 my-8 print:m-0 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black print:w-full print:max-w-none`}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between no-print">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 tracking-tight">{title}</h3>
                {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
