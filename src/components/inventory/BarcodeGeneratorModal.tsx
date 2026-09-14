import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { AppleModal } from '../common/AppleModal';
import { Product } from '../../types';
import { Printer, Copy, Check } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

interface BarcodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  firmName: string;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  isOpen,
  onClose,
  product,
  firmName,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen && product && svgRef.current) {
      try {
        JsBarcode(svgRef.current, product.barcode || product.sku || 'PRO12345678', {
          format: 'CODE128',
          lineColor: '#000000',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 13,
          font: 'monospace',
          margin: 6,
        });
      } catch (e) {
        console.error('Failed to generate barcode:', e);
      }
    }
  }, [isOpen, product]);

  if (!product) return null;

  const handlePrintBarcode = () => {
    window.print();
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(product.barcode || product.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Barcode Label"
      subtitle={`Print or scan label for ${product.name}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        {/* Printable Label Preview Card */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
            {firmName}
          </span>
          <h4 className="text-sm font-semibold text-black mt-1 line-clamp-2 max-w-[280px]">
            {product.name}
          </h4>

          {/* Rendered Barcode SVG */}
          <div className="my-3 p-2 bg-white rounded-lg border border-gray-100 flex justify-center w-full">
            <svg ref={svgRef} className="max-w-full"></svg>
          </div>

          <div className="flex items-center justify-between w-full px-4 pt-2 border-t border-gray-100 text-xs text-gray-600">
            <div>
              <span className="text-gray-400">MRP: </span>
              <span className="line-through">{formatINR(product.mrp)}</span>
            </div>
            <div className="text-sm font-bold text-[#0071e3]">
              Sale Price: {formatINR(product.salePrice)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopyBarcode}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:scale-95 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Barcode!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handlePrintBarcode}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white active:scale-95 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
        </div>
      </div>
    </AppleModal>
  );
};
