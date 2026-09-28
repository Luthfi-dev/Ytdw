import React from 'react';
import { HardDrive, Download, Folder, PlayCircle, Layers, Globe, ArrowUpRight } from 'lucide-react';
import { StorageStats } from '../types';

interface HeaderProps {
  activeTab: 'downloader' | 'vault' | 'batch';
  setActiveTab: (tab: 'downloader' | 'vault' | 'batch') => void;
  storageStats: StorageStats;
  onOpenFolderSettings: () => void;
  onOpenCdnGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  storageStats,
  onOpenFolderSettings,
  onOpenCdnGuide
}) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '/';
  const displayHost = typeof window !== 'undefined' ? window.location.host : 'tubevault.app';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark / Brand title with Base URL Redirect */}
        <div className="flex items-center gap-3">
          <a
            href={baseUrl}
            className="flex items-center gap-2.5 text-left group focus:outline-none transition-transform active:scale-95"
            title={`Kembali ke Base URL (${baseUrl})`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-105 transition-transform duration-200">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white font-display">
                  TubeVault
                </span>
                <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  Offline
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-red-400 transition-colors font-mono">
                <Globe className="w-2.5 h-2.5" />
                <span className="truncate max-w-[140px]">{displayHost}</span>
                <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </a>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800/80 rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveTab('downloader')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'downloader'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Simpan Video Baru</span>
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Perpustakaan Offline ({storageStats.videoCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Link Antrean</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions & Storage info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenCdnGuide}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            title="Pelajari cara kerja Google Video CDN dan pemutaran offline"
          >
            <span>Google CDN</span>
          </button>

          <button
            onClick={onOpenFolderSettings}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Penyimpanan:</span>
            <span className="font-mono text-emerald-400 tabular-nums font-semibold">
              {storageStats.formattedUsed}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav sub-bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/60 bg-slate-950 px-2 py-1.5 text-xs">
        <button
          onClick={() => setActiveTab('downloader')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
            activeTab === 'downloader' ? 'text-red-400 font-semibold bg-red-950/40' : 'text-slate-400'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Simpan</span>
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
            activeTab === 'vault' ? 'text-red-400 font-semibold bg-red-950/40' : 'text-slate-400'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Vault ({storageStats.videoCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
            activeTab === 'batch' ? 'text-red-400 font-semibold bg-red-950/40' : 'text-slate-400'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Multi-Link</span>
        </button>
      </div>
    </header>
  );
};
