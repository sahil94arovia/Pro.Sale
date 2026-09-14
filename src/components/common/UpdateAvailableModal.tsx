import React from 'react';
import { AppleModal } from './AppleModal';
import { AppUpdateInfo } from '../../types/update';
import { updateService } from '../../services/updateService';
import { Download, Sparkles, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface UpdateAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: AppUpdateInfo | null;
}

export const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
}) => {
  if (!updateInfo) return null;

  const handleDownload = () => {
    if (updateInfo.apkUrl) {
      updateService.openApkDownload(updateInfo.apkUrl);
    } else {
      window.open(updateInfo.htmlUrl, '_system');
    }
  };

  const handleDismiss = () => {
    updateService.setDismissedUpdateVersion(updateInfo.latestVersion);
    onClose();
  };

  // Format file size
  const formattedSize =
    updateInfo.apkSize > 0
      ? `${(updateInfo.apkSize / (1024 * 1024)).toFixed(1)} MB`
      : null;

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Available"
      subtitle={`A newer version of PROSALE is available for your tablet.`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs text-neutral-900">
        {/* Version Compare Banner */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
              Current Installed
            </span>
            <span className="text-sm font-bold text-neutral-800 font-mono">
              v{updateInfo.currentVersion}
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 font-bold">
            →
          </div>

          <div className="space-y-0.5 text-right">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
              New Version
            </span>
            <span className="text-sm font-bold text-blue-600 font-mono">
              v{updateInfo.latestVersion}
            </span>
          </div>
        </div>

        {/* What's New Box */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-1.5 text-neutral-700 font-semibold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>What's New in {updateInfo.releaseName}</span>
          </div>
          <div className="max-h-48 overflow-y-auto p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs whitespace-pre-line leading-relaxed font-sans select-text">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* APK Asset details if present */}
        {formattedSize && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-100 text-neutral-600 text-[11px]">
            <span className="font-mono text-neutral-800">{updateInfo.apkName}</span>
            <span className="font-semibold">{formattedSize}</span>
          </div>
        )}

        {/* Android Installation Notice */}
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start space-x-2 text-amber-800 text-[11px]">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="leading-snug">
            <span className="font-bold">Android Installation Notice: </span>
            Android may ask you to allow installation from this source. This permission is controlled by Android.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-xl text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer transition-colors"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Update</span>
          </button>
        </div>
      </div>
    </AppleModal>
  );
};
