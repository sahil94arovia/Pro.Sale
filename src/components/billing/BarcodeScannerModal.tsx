import React, { useState, useEffect, useRef } from 'react';
import { AppleModal } from '../common/AppleModal';
import { Camera, Scan, AlertCircle, Search } from 'lucide-react';
import { Product } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductScanned: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductScanned,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // USB Barcode Gun Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          matchAndSelect(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, products]);

  const matchAndSelect = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    const found = products.find(
      (p) =>
        p.barcode?.toLowerCase() === trimmed ||
        p.sku?.toLowerCase() === trimmed ||
        p.name.toLowerCase().includes(trimmed)
    );

    if (found) {
      onProductScanned(found);
      setErrorMessage('');
      setManualCode('');
      onClose();
    } else {
      setErrorMessage(`No product found matching code: "${code}"`);
    }
  };

  // Camera initialization
  const startCamera = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error(err);
      setErrorMessage('Unable to access camera. Please enter barcode or SKU manually.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      matchAndSelect(manualCode);
    }
  };

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title="Barcode & SKU Scanner"
      subtitle="Use camera scanner, USB barcode gun or type code"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Scanner Viewport */}
        <div className="relative w-full h-56 bg-neutral-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-neutral-800">
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center text-white border border-neutral-700">
                <Scan className="w-6 h-6 animate-pulse text-blue-400" />
              </div>
              <p className="text-xs text-neutral-300">
                Ready for USB Barcode Reader or Web Camera Scan
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-all cursor-pointer border border-neutral-700"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start Camera Scanner</span>
              </button>
            </div>
          )}

          {/* Scanner Overlay Guide */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-28 border-2 border-blue-400/80 rounded-xl relative">
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500/80 animate-pulse shadow-sm" />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Manual Barcode / SKU entry */}
        <form onSubmit={handleManualSubmit} className="space-y-2 text-xs">
          <label className="block text-xs font-semibold text-neutral-700">
            Manual Barcode / SKU Entry
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                autoFocus
                placeholder="Scan or enter Barcode / SKU..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-black focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-semibold active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </AppleModal>
  );
};
