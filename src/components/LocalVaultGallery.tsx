import React, { useState } from 'react';
import {
  SavedVideo,
  StorageStats
} from '../types';
import {
  Play,
  Download,
  FolderDown,
  Trash2,
  Copy,
  Check,
  Search,
  Folder,
  SlidersHorizontal,
  HardDrive,
  DownloadCloud,
  Film,
  Music,
  ExternalLink,
  Plus
} from 'lucide-react';
import { saveBlobToDiskFolder, downloadBlobDirectly, sanitizeFilename, copyToClipboard } from '../services/folderSaver';

interface LocalVaultGalleryProps {
  savedVideos: SavedVideo[];
  storageStats: StorageStats;
  onPlayVideo: (video: SavedVideo) => void;
  onDeleteVideo: (id: string) => void;
  onUpdateFolder: (id: string, newFolder: string) => void;
  onNavigateToDownloader: () => void;
}

const DEFAULT_FOLDERS = ['Semua', 'Musik', 'Edukasi', 'Shorts', 'Favorit', 'Podcast'];

export const LocalVaultGallery: React.FC<LocalVaultGalleryProps> = ({
  savedVideos,
  storageStats,
  onPlayVideo,
  onDeleteVideo,
  onUpdateFolder,
  onNavigateToDownloader
}) => {
  const [selectedFolder, setSelectedFolder] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size' | 'title'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [movingVideoId, setMovingVideoId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Extract all distinct folders
  const allFolders = Array.from(
    new Set([...DEFAULT_FOLDERS, ...savedVideos.map((v) => v.folder || 'Semua')])
  );

  // Filter & Search
  let filtered = savedVideos.filter((v) => {
    const matchesFolder = selectedFolder === 'Semua' || v.folder === selectedFolder;
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.quality.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'newest') return b.savedAt - a.savedAt;
    if (sortBy === 'oldest') return a.savedAt - b.savedAt;
    if (sortBy === 'size') return b.fileSize - a.fileSize;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  const handleDirectDownload = (video: SavedVideo) => {
    const filename = sanitizeFilename(video.title, video.format.toLowerCase());
    if (video.blob) {
      downloadBlobDirectly(video.blob, filename);
    } else {
      const target = `/api/yt/proxy-media?url=${encodeURIComponent(video.googleVideoCdnUrl)}&filename=${encodeURIComponent(filename)}`;
      const a = document.createElement('a');
      a.href = target;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setDownloadedId(video.id);
    setTimeout(() => setDownloadedId(null), 2000);
  };

  const handleExportToFolder = async (video: SavedVideo) => {
    if (video.blob) {
      const filename = sanitizeFilename(video.title, video.format.toLowerCase());
      await saveBlobToDiskFolder(video.blob, filename, true);
    }
  };

  const handleCopyCdn = async (video: SavedVideo) => {
    const ok = await copyToClipboard(video.googleVideoCdnUrl);
    if (ok) {
      setCopiedId(video.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      setSelectedFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pt-4 pb-12">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-red-500" />
            <span>Perpustakaan Video Offline di Perangkat</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Semua video di bawah tersimpan di memori perangkat Anda. Anda dapat menontonnya langsung atau mengunduh file video ke folder penyimpanan komputer/HP Anda.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-xs shrink-0">
          <div>
            <div className="text-slate-400">Total Video:</div>
            <div className="text-base font-bold text-white font-mono">{savedVideos.length}</div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div>
            <div className="text-slate-400">Ukuran Penyimpanan:</div>
            <div className="text-base font-bold text-emerald-400 font-mono">
              {storageStats.formattedUsed}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Folder Navigation Bar */}
      <div className="space-y-3">
        {/* Folder Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {allFolders.map((folder) => {
            const count =
              folder === 'Semua'
                ? savedVideos.length
                : savedVideos.filter((v) => v.folder === folder).length;
            const isSelected = selectedFolder === folder;
            return (
              <button
                key={folder}
                type="button"
                onClick={() => setSelectedFolder(folder)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20 font-semibold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{folder}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {isCreatingFolder ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder baru"
                className="px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
              />
              <button
                type="button"
                onClick={handleAddFolder}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg font-medium cursor-pointer"
              >
                Simpan
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 border border-dashed border-slate-800 hover:border-slate-600 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Folder</span>
            </button>
          )}
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, channel, atau resolusi..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="newest">Terbaru Ditambahkan</option>
              <option value="oldest">Terlama Ditambahkan</option>
              <option value="size">Ukuran Terbesar</option>
              <option value="title">Judul A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
            <DownloadCloud className="w-8 h-8 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Belum Ada Video Tersimpan</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'Tidak ada video yang cocok dengan pencarian Anda.'
                : 'Tempel link video YouTube apa saja pada menu downloader untuk langsung menyimpannya ke folder offline perangkat Anda.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToDownloader}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Simpan Video YouTube Pertama Anda</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((video) => {
            const isAudio = video.isAudioOnly || video.format === 'MP3';
            const isMovingThis = movingVideoId === video.id;

            return (
              <div
                key={video.id}
                className="group relative bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between"
              >
                {/* Thumbnail Area */}
                <div>
                  <div className="relative aspect-video bg-black overflow-hidden">
                    {isAudio ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-amber-900/40 via-slate-900 to-black">
                        <Music className="w-12 h-12 text-amber-400 mb-2" />
                        <span className="text-xs text-amber-200 font-mono">Audio MP3 Track</span>
                      </div>
                    ) : (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}

                    {/* Gradient scrim */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Play Button Overlay */}
                    <button
                      type="button"
                      onClick={() => onPlayVideo(video)}
                      className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                      title="Putar video"
                    >
                      <Play className="w-5 h-5 fill-white translate-x-0.5" />
                    </button>

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-semibold tracking-wide uppercase shadow">
                        Offline Ready
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-black/70 text-slate-300 text-[10px] font-mono">
                        {video.quality}
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[11px] font-mono">
                      {video.formattedDuration}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <h3
                      className="text-sm font-bold text-white line-clamp-2 leading-snug cursor-pointer hover:text-red-400 transition-colors"
                      onClick={() => onPlayVideo(video)}
                    >
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="truncate max-w-[60%]">{video.channel}</span>
                      <span className="font-mono text-slate-300">{video.formattedSize}</span>
                    </div>

                    {/* Folder Badge & Change Dropdown */}
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      {isMovingThis ? (
                        <div className="flex items-center gap-1 w-full">
                          <select
                            defaultValue={video.folder}
                            onChange={(e) => {
                              onUpdateFolder(video.id, e.target.value);
                              setMovingVideoId(null);
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none"
                            autoFocus
                            onBlur={() => setMovingVideoId(null)}
                          >
                            {allFolders.filter((f) => f !== 'Semua').map((f) => (
                              <option key={f} value={f}>
                                Pindah ke: {f}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMovingVideoId(video.id)}
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="Klik untuk memindahkan kategori folder"
                        >
                          <Folder className="w-3 h-3 text-amber-400" />
                          <span>{video.folder || 'Semua'}</span>
                          <span className="text-[9px] text-slate-500">(ubah)</span>
                        </button>
                      )}
                      <span className="text-slate-500">
                        {new Date(video.savedAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons: Prominent Download to Device */}
                <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Primary Button: Direct Download to Device */}
                    <button
                      type="button"
                      onClick={() => handleDirectDownload(video)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                        downloadedId === video.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20 active:scale-95'
                      }`}
                      title="Unduh file video/audio langsung ke folder Download perangkat Anda"
                    >
                      {downloadedId === video.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>File Diunduh!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download ke Perangkat</span>
                        </>
                      )}
                    </button>

                    {/* Play Video button */}
                    <button
                      type="button"
                      onClick={() => onPlayVideo(video)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      title="Tonton video"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1 text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleExportToFolder(video)}
                      className="flex items-center gap-1 hover:text-amber-300 transition-colors cursor-pointer py-1"
                      title="Simpan ke folder khusus via Folder Picker"
                    >
                      <FolderDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pilih Folder</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyCdn(video)}
                      className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer py-1"
                      title="Salin Link Google Video CDN"
                    >
                      {copiedId === video.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedId === video.id ? 'Tersalin' : 'Salin CDN'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus video "${video.title}" dari penyimpanan offline perangkat?`)) {
                          onDeleteVideo(video.id);
                        }
                      }}
                      className="flex items-center gap-1 hover:text-red-400 transition-colors cursor-pointer py-1"
                      title="Hapus dari penyimpanan"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-red-400" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
