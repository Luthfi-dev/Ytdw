import React from 'react';
import {
  X,
  Sparkles,
  Globe,
  HardDrive,
  CheckCircle,
  Copy,
  Tv,
  HelpCircle
} from 'lucide-react';

interface GoogleCdnExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleCdnExplainerModal: React.FC<GoogleCdnExplainerModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Cara Kerja Google Video CDN & Pemutaran Offline
              </h3>
              <p className="text-[11px] text-slate-400">
                Panduan tautan stream langsung & penyimpanan di memori perangkat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Card 1: What is CDN */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>1. Apa itu Link Google Video CDN?</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Google Video CDN (<code className="text-amber-300 font-mono bg-slate-950 px-1 py-0.5 rounded">googlevideo.com/videoplayback</code>) adalah jalur transmisi data stream langsung video YouTube asli tanpa tampilan antarmuka pemutar web YouTube.
            </p>
          </div>

          {/* Card 2: Offline storage mechanism */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>2. Penyimpanan Offline di Memori Perangkat</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Ketika Anda menekan tombol <strong className="text-white">"Simpan Offline ke Vault"</strong> atau <strong className="text-white">"Simpan ke Folder"</strong>, TubeVault mengambil stream media dan menyimpannya langsung dalam format file biner (Blob) di dalam <strong>IndexedDB browser perangkat Anda</strong> atau ke <strong>folder disk lokal</strong> yang Anda pilih.
            </p>
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Setelah tersimpan, video dapat diputar <strong>100% tanpa internet</strong> (Mode Pesawat / Offline).
              </span>
            </div>
          </div>

          {/* Card 3: Watching on external players */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <Tv className="w-4 h-4 text-red-400" />
              <span>3. Memutar di Pemutar Eksternal (VLC / PotPlayer / MX Player)</span>
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Anda dapat menyalin link CDN yang disediakan pada halaman detail video, lalu membukanya di aplikasi pemutar favorit:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li><strong>VLC Media Player:</strong> Menu <em>Media &rarr; Buka Stream Jaringan (Ctrl+N)</em> lalu paste tautan CDN.</li>
              <li><strong>MPV / PotPlayer / KMPlayer:</strong> Buka tautan URL stream secara langsung.</li>
              <li><strong>Browser / Tab Baru:</strong> Langsung streaming video murni tanpa iklan.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
