import React, { useState } from 'react';
import {
  YouTubeVideoInfo,
  VideoFormat,
  SavedVideo
} from '../types';
import {
  Play,
  Download,
  FolderDown,
  HardDriveDownload,
  Copy,
  Check,
  Film,
  Music,
  ExternalLink,
  ShieldCheck,
  Clock,
  Eye,
  Info,
  Sparkles
} from 'lucide-react';
import { copyToClipboard, isFileSystemAccessSupported, getCurrentFolderName } from '../services/folderSaver';

interface VideoInspectorProps {
  videoInfo: YouTubeVideoInfo;
  selectedFormat: VideoFormat;
  setSelectedFormat: (format: VideoFormat) => void;
  folderCategory: string;
  setFolderCategory: (cat: string) => void;
  isDownloading: boolean;
  downloadProgress: number;
  downloadSpeed: number;
  downloadStatusText: string;
  onDirectDownload: () => void;
  onDownloadToFolder: () => void;
  onSaveToVault: () => void;
  onPlayDirectly: () => void;
  onOpenCdnGuide: () => void;
  alreadySavedVideo?: SavedVideo;
}

const FOLDER_CATEGORIES = [
  'Semua',
  'Musik',
  'Edukasi',
  'Shorts',
  'Favorit',
  'Podcast',
  'Film & Hiburan'
];

export const VideoInspector: React.FC<VideoInspectorProps> = ({
  videoInfo,
  selectedFormat,
  setSelectedFormat,
  folderCategory,
  setFolderCategory,
  isDownloading,
  downloadProgress,
  downloadSpeed,
  downloadStatusText,
  onDirectDownload,
  onDownloadToFolder,
  onSaveToVault,
  onPlayDirectly,
  onOpenCdnGuide,
  alreadySavedVideo
}) => {
  const [copiedCdn, setCopiedCdn] = useState(false);
  const [activeTabType, setActiveTabType] = useState<'video' | 'audio'>('video');
  const [customFolder, setCustomFolder] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  const folderName = getCurrentFolderName();
  const fsSupported = isFileSystemAccessSupported();

  const handleCopyCdn = async () => {
    const link = selectedFormat.googleCdnLink || videoInfo.googleVideoCdnUrl;
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopiedCdn(true);
      setTimeout(() => setCopiedCdn(false), 2000);
    }
  };

  const filteredFormats = videoInfo.formats.filter((f) => f.type === activeTabType);

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-black/50">
      {/* Top Banner if already in Vault */}
      {alreadySavedVideo && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Video ini sudah tersimpan di vault offline perangkat Anda ({alreadySavedVideo.quality} · {alreadySavedVideo.formattedSize}).
            </span>
          </div>
          <button
            onClick={onPlayDirectly}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Tonton Video
          </button>
        </div>
      )}

      {/* Main Grid: Thumbnail + Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Col: Thumbnail & Quick Play */}
        <div className="md:col-span-5 relative group">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
            <img
              src={videoInfo.thumbnails.maxres || videoInfo.thumbnails.hq || videoInfo.thumbnails.default}
              alt={videoInfo.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

            {/* Play Overlay Button */}
            <button
              onClick={onPlayDirectly}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
              title="Tonton video sekarang"
            >
              <Play className="w-6 h-6 fill-white translate-x-0.5" />
            </button>

            {/* Duration Tag */}
            <div className="absolute bottom-2.5 right-2.5 px-2 py-1 bg-black/80 backdrop-blur-md rounded text-[11px] font-mono font-medium text-white flex items-center gap-1 border border-white/10">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{videoInfo.formattedDuration}</span>
            </div>

            {/* Offline Ready Tag */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-red-600/90 backdrop-blur-md rounded text-[10px] font-semibold text-white tracking-wide uppercase">
              Siap Simpan
            </div>
          </div>

          <div className="mt-2 text-center">
            <a
              href={`https://www.youtube.com/watch?v=${videoInfo.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Buka di YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Right Col: Metadata & Format Options */}
        <div className="md:col-span-7 space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white line-clamp-2 leading-snug">
              {videoInfo.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{videoInfo.authorName}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-slate-500" />
                <span>{videoInfo.formattedViews}</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Rilis: {videoInfo.publishDate}</span>
            </div>
          </div>

          {/* Format Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Pilih Kualitas File:</span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTabType('video')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeTabType === 'video'
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-3 h-3 text-red-400" />
                  <span>Video MP4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabType('audio')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeTabType === 'audio'
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music className="w-3 h-3 text-amber-400" />
                  <span>Audio MP3</span>
                </button>
              </div>
            </div>

            {/* Quality Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {filteredFormats.map((fmt) => {
                const isSelected = selectedFormat.itag === fmt.itag;
                return (
                  <button
                    key={fmt.itag}
                    type="button"
                    onClick={() => setSelectedFormat(fmt)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-500/10 border-red-500 text-white shadow-md shadow-red-500/10 ring-1 ring-red-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{fmt.quality}</span>
                      {fmt.fps > 30 && (
                        <span className="text-[9px] px-1 py-0.2 bg-red-600 text-white rounded font-mono font-medium">
                          60fps
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{fmt.format}</span>
                      <span className="font-mono text-slate-300 tabular-nums">~{fmt.approxSizeMB} MB</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Folder Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Simpan ke Kategori Folder:</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Folder Aktif: <strong className="text-white">{folderCategory}</strong>
              </span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FOLDER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFolderCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                    folderCategory === cat
                      ? 'bg-slate-800 text-white border-slate-600 font-medium'
                      : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {isAddingFolder ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                    placeholder="Nama Folder"
                    className="px-2 py-0.5 text-xs bg-slate-950 border border-slate-700 rounded text-white focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customFolder.trim()) {
                        setFolderCategory(customFolder.trim());
                        setIsAddingFolder(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customFolder.trim()) {
                        setFolderCategory(customFolder.trim());
                      }
                      setIsAddingFolder(false);
                    }}
                    className="px-2 py-0.5 text-xs bg-red-600 text-white rounded font-medium cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingFolder(true)}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 border border-dashed border-slate-700 hover:border-slate-500 rounded-lg transition-colors cursor-pointer"
                >
                  + Kategori Baru
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google Video CDN Direct Stream Link Card */}
      <div className="mt-5 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Link Google Video CDN (Direct Offline Stream)</span>
          </div>
          <button
            type="button"
            onClick={onOpenCdnGuide}
            className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            <Info className="w-3 h-3" />
            <span>Cara Tonton Offline CDN</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 truncate select-all">
            {selectedFormat.googleCdnLink || videoInfo.googleVideoCdnUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyCdn}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer shrink-0 ${
              copiedCdn
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Salin tautan CDN untuk VLC / MPV / Browser"
          >
            {copiedCdn ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCdn ? 'Tersalin' : 'Salin CDN'}</span>
          </button>
        </div>
      </div>

      {/* Download Progress Bar */}
      {isDownloading && (
        <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-red-500/30 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              {downloadStatusText}
            </span>
            <div className="flex items-center gap-3 font-mono text-slate-300">
              {downloadSpeed > 0 && <span>{downloadSpeed} MB/detik</span>}
              <span className="font-bold text-red-400">{downloadProgress}%</span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 transition-all duration-300 rounded-full shadow-lg shadow-red-500/50"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPlayDirectly}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95"
        >
          <Play className="w-4 h-4 fill-current text-red-400" />
          <span>Buka di Pemutar</span>
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Direct Download to Device Button */}
          <button
            type="button"
            onClick={onDirectDownload}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Download langsung file ke folder Download perangkat Anda"
          >
            <Download className="w-4 h-4" />
            <span>Unduh ke Perangkat ({selectedFormat.quality})</span>
          </button>

          {/* Save to Local Disk Folder Button via Picker */}
          <button
            type="button"
            onClick={onDownloadToFolder}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title={fsSupported ? 'Simpan langsung ke folder di perangkat Anda' : 'Unduh file langsung ke folder Unduhan'}
          >
            <FolderDown className="w-4 h-4 text-amber-400" />
            <span>
              {folderName ? `Ke Folder "${folderName}"` : 'Pilih Folder'}
            </span>
          </button>

          {/* Save Offline to Vault Button */}
          <button
            type="button"
            onClick={onSaveToVault}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <HardDriveDownload className="w-4 h-4" />
            <span>Simpan ke Vault Offline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
