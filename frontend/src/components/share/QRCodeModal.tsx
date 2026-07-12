import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import type { ShareSettings } from '../../api/share';

interface QRCodePopoverProps {
  open: boolean;
  shareState: ShareSettings | null;
}

export function QRCodePopover({ open, shareState }: QRCodePopoverProps) {
  const { t } = useTranslation('resume');

  if (!open || !shareState) return null;

  const shareUrl = `${window.location.origin}/resume/${shareState.resume_id}`;

  return (
    <div
      className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 flex flex-col items-center gap-2"
      style={{ animation: 'dropdown-appear 0.15s ease-out' }}
    >
      <style>{`
        @keyframes dropdown-appear {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <h3 className="text-xs font-medium text-gray-500">{t('share.qrCodeHint')}</h3>

      <div className="p-3 bg-white rounded-lg border border-gray-100">
        <QRCodeSVG
          value={shareUrl}
          size={140}
          level="M"
          bgColor="#ffffff"
          fgColor="#000000"
          marginSize={2}
        />
      </div>
    </div>
  );
}
