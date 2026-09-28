import React, { useState } from 'react';
import { StorageStats } from '../types';
import {
  X,
  Folder,
  FolderPlus,
  HardDrive,
  Trash2,
  Database,
  CheckCircle,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import {
  pickLocalFolder,
  getCurrentFolderName,
  isFileSystemAccessSupported
} from '../services/folderSaver';
import { clearAllSavedVideos } from '../services/db';

interface FolderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageStats: StorageStats;
  onClearAll: () => void;
}

export const FolderSettingsModal: React.FC<FolderSettingsModalProps> = ({
  isOpen,
  onClose,
  storageStats,
  onClearAll
}) => {
  const [folderName, setFolderName] = useState<string | null>(getCurrentFolderName());
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const fsSupported = isFileSystemAccessSupported();

  const handlePickFolder = async () => {
    const res = await pickLocalFolder();
    if (res.success && res.folderName) {
      setFolderName(res.folderName);
      setMsg(`Folder "${res.folderName}" berhasil disetel sebagai folder penyimpanan!`);
      setIsError(false);
      setTimeout(() => setMsg(null), 3000);
    } else if (res.error) {
      setMsg(res.error);
      setIsError(true);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleConfirmClear = async () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin menghapus SEMUA video offline dari penyimpanan perangkat? Tindakan ini tidak dapat dibatalkan.'
      )
    ) {
      await clearAllSavedVideos();
      onClearAll();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Folder className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white font-display">
              Pengaturan Folder & Penyimpanan Lokal
            </h3>
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
        <div className="p-6 space-y-6 text-xs text-slate-300">
          {/* Status Message */}
          {msg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                isError
                  ? 'bg-red-950/40 border-red-500/30 text-red-300'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {isError ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
              <span>{msg}</span>
            </div>
          )}

          {/* Section 1: Local Disk Folder */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                <FolderPlus className="w-4 h-4 text-amber-400" />
                <span>Folder Penyimpanan di Komputer / Disk</span>
              </span>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Anda dapat memilih folder khusus pada laptop/komputer Anda (misalnya folder <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono">Downloads/YT_Videos</code>) sehingga video yang diunduh langsung tersimpan ke sana.
            </p>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="truncate pr-2">
                <span className="text-slate-500 block text-[11px]">Folder Aktif:</span>
                <span className="font-mono text-white font-semibold truncate block">
                  {folderName || 'Folder Unduhan Default (Browser)'}
                </span>
              </div>
              <button
                type="button"
                onClick={handlePickFolder}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                Pilih Folder Baru
              </button>
            </div>

            {!fsSupported && (
              <p className="text-[11px] text-slate-500 italic">
                * Catatan: Browser ini menggunakan mode download langsung ke folder unduhan standar.
              </p>
            )}
          </div>

          {/* Section 2: IndexedDB Device Storage Gauge */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Penyimpanan Offline Browser (IndexedDB Vault)</span>
              </span>
              <span className="font-mono text-emerald-400">{storageStats.formattedUsed}</span>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Semua video dalam vault disimpan di memori permanen perangkat Anda sehingga dapat diputar 100% tanpa internet.
            </p>

            {/* Storage Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Total: {storageStats.videoCount} video tersimpan</span>
                {storageStats.formattedQuota && <span>Batas kuota: ~{storageStats.formattedQuota}</span>}
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.max(2, storageStats.percentageUsed || 4)}%` }}
                />
              </div>
            </div>

            {/* Clear All Videos Button */}
            {storageStats.videoCount > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Hapus Semua Video dari Penyimpanan Perangkat</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
