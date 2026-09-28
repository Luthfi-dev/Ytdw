import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  YouTubeVideoInfo,
  VideoFormat,
  SavedVideo,
  StorageStats
} from './types';
import {
  getAllSavedVideos,
  getStorageStats,
  deleteVideoFromVault,
  updateVideoFolder,
  saveVideoToVault
} from './services/db';
import { downloadYouTubeMedia } from './services/downloadEngine';
import { downloadBlobDirectly, sanitizeFilename } from './services/folderSaver';

import { Header } from './components/Header';
import { UrlInputSection } from './components/UrlInputSection';
import { VideoInspector } from './components/VideoInspector';
import { LocalVaultGallery } from './components/LocalVaultGallery';
import { BatchDownloadModal } from './components/BatchDownloadModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { FolderSettingsModal } from './components/FolderSettingsModal';
import { GoogleCdnExplainerModal } from './components/GoogleCdnExplainerModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'downloader' | 'vault' | 'batch'>('downloader');

  // URL Downloader State
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [folderCategory, setFolderCategory] = useState('Semua');

  // Download Progress State
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');

  // Offline Saved Videos & Storage Stats
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usedBytes: 0,
    formattedUsed: '0 B',
    videoCount: 0
  });

  // Modals & Player State
  const [activePlayingSavedVideo, setActivePlayingSavedVideo] = useState<SavedVideo | undefined>(undefined);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isFolderSettingsOpen, setIsFolderSettingsOpen] = useState(false);
  const [isCdnGuideOpen, setIsCdnGuideOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load saved videos from IndexedDB
  const refreshVault = useCallback(async () => {
    try {
      const list = await getAllSavedVideos();
      setSavedVideos(list);
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (err) {
      console.error('Error loading vault:', err);
    }
  }, []);

  useEffect(() => {
    refreshVault();
  }, [refreshVault]);

  // Handle URL Analysis
  const handleAnalyzeUrl = async (customUrl?: string) => {
    const targetUrl = customUrl || urlInput;
    if (!targetUrl.trim()) return;

    setIsLoadingInfo(true);
    try {
      const resp = await fetch(`/api/yt/info?url=${encodeURIComponent(targetUrl.trim())}`);
      const data = await resp.json();

      if (!resp.ok || data.error) {
        throw new Error(data.error || 'Gagal memproses URL YouTube');
      }

      setVideoInfo(data);
      const defaultFmt = data.formats.find((f: VideoFormat) => f.quality === '720p') || data.formats[0];
      setSelectedFormat(defaultFmt);
      addToast('success', `Berhasil memuat: "${data.title}"`);
    } catch (err: any) {
      addToast('error', err.message || 'URL YouTube tidak dapat diproses.');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Direct download to user device (Downloads folder)
  const handleDirectDownload = async () => {
    if (!videoInfo || !selectedFormat) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadSpeed(0);
    setDownloadStatusText('Mengunduh file ke perangkat...');

    const result = await downloadYouTubeMedia(videoInfo, selectedFormat, {
      destination: 'disk',
      folderCategory,
      preferFolderPicker: false, // directly triggers browser download
      onProgress: (progress, speed, status, msg) => {
        setDownloadProgress(progress);
        setDownloadSpeed(speed);
        if (msg) setDownloadStatusText(msg);
      }
    });

    setIsDownloading(false);

    if (result.success) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 }
      });
      addToast('success', `File video "${videoInfo.title}" berhasil diunduh ke folder Download perangkat Anda!`);
      refreshVault();
    } else {
      addToast('error', result.error || 'Gagal mengunduh file.');
    }
  };

  // Trigger download to Local Disk Folder with folder picker
  const handleDownloadToFolder = async () => {
    if (!videoInfo || !selectedFormat) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadSpeed(0);
    setDownloadStatusText('Memilih folder & menyimpan video...');

    const result = await downloadYouTubeMedia(videoInfo, selectedFormat, {
      destination: 'disk',
      folderCategory,
      preferFolderPicker: true,
      onProgress: (progress, speed, status, msg) => {
        setDownloadProgress(progress);
        setDownloadSpeed(speed);
        if (msg) setDownloadStatusText(msg);
      }
    });

    setIsDownloading(false);

    if (result.success) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 }
      });
      addToast(
        'success',
        result.diskPath
          ? `Video berhasil disimpan ke "${result.diskPath}"!`
          : `Video berhasil disimpan ke folder penyimpanan perangkat Anda!`
      );
      refreshVault();
    } else {
      addToast('error', result.error || 'Gagal menyimpan ke folder.');
    }
  };

  // Trigger Save Offline into IndexedDB Vault
  const handleSaveToVault = async () => {
    if (!videoInfo || !selectedFormat) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadSpeed(0);
    setDownloadStatusText('Mengunduh stream video untuk offline vault...');

    const result = await downloadYouTubeMedia(videoInfo, selectedFormat, {
      destination: 'vault',
      folderCategory,
      onProgress: (progress, speed, status, msg) => {
        setDownloadProgress(progress);
        setDownloadSpeed(speed);
        if (msg) setDownloadStatusText(msg);
      }
    });

    setIsDownloading(false);

    if (result.success) {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
      addToast('success', `Video "${videoInfo.title}" berhasil disimpan di Offline Vault! Siap ditonton kapan saja.`);
      refreshVault();
    } else {
      addToast('error', result.error || 'Gagal menyimpan ke vault offline.');
    }
  };

  // Play video immediately
  const handlePlayDirect = () => {
    setActivePlayingSavedVideo(undefined);
    setIsPlayerOpen(true);
  };

  const handlePlaySavedVideo = (video: SavedVideo) => {
    setActivePlayingSavedVideo(video);
    setIsPlayerOpen(true);
  };

  const handleDeleteSavedVideo = async (id: string) => {
    try {
      await deleteVideoFromVault(id);
      addToast('info', 'Video dihapus dari penyimpanan perangkat.');
      refreshVault();
    } catch (err: any) {
      addToast('error', 'Gagal menghapus video: ' + err.message);
    }
  };

  const handleUpdateSavedVideoFolder = async (id: string, newFolder: string) => {
    try {
      await updateVideoFolder(id, newFolder);
      addToast('success', `Video dipindahkan ke folder "${newFolder}".`);
      refreshVault();
    } catch (err: any) {
      addToast('error', 'Gagal memindahkan folder: ' + err.message);
    }
  };

  // Check if current inspected video is already in vault
  const alreadySaved = videoInfo && selectedFormat
    ? savedVideos.find((v) => v.youtubeId === videoInfo.videoId && v.quality === selectedFormat.quality)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500/30 selection:text-red-200">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        storageStats={storageStats}
        onOpenFolderSettings={() => setIsFolderSettingsOpen(true)}
        onOpenCdnGuide={() => setIsCdnGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'downloader' && (
          <div className="space-y-6">
            <UrlInputSection
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              isLoading={isLoadingInfo}
              onAnalyze={handleAnalyzeUrl}
              onSwitchToBatch={() => setActiveTab('batch')}
            />

            {videoInfo && selectedFormat && (
              <VideoInspector
                videoInfo={videoInfo}
                selectedFormat={selectedFormat}
                setSelectedFormat={setSelectedFormat}
                folderCategory={folderCategory}
                setFolderCategory={setFolderCategory}
                isDownloading={isDownloading}
                downloadProgress={downloadProgress}
                downloadSpeed={downloadSpeed}
                downloadStatusText={downloadStatusText}
                onDirectDownload={handleDirectDownload}
                onDownloadToFolder={handleDownloadToFolder}
                onSaveToVault={handleSaveToVault}
                onPlayDirectly={handlePlayDirect}
                onOpenCdnGuide={() => setIsCdnGuideOpen(true)}
                alreadySavedVideo={alreadySaved}
              />
            )}

            {/* Quick Link to Saved Videos if any exist */}
            {savedVideos.length > 0 && !videoInfo && (
              <div className="mt-8 pt-8 border-t border-slate-900">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Video Tersimpan Baru-baru Ini ({savedVideos.length})
                  </h3>
                  <button
                    onClick={() => setActiveTab('vault')}
                    className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer"
                  >
                    Lihat Semua di Vault &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {savedVideos.slice(0, 3).map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handlePlaySavedVideo(v)}
                      className="group p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3 cursor-pointer transition-all"
                    >
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        className="w-16 h-12 object-cover rounded-lg shrink-0 bg-slate-950"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="overflow-hidden flex-1">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-red-400 transition-colors">
                          {v.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{v.channel}</p>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {v.quality} · {v.formattedSize}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vault' && (
          <LocalVaultGallery
            savedVideos={savedVideos}
            storageStats={storageStats}
            onPlayVideo={handlePlaySavedVideo}
            onDeleteVideo={handleDeleteSavedVideo}
            onUpdateFolder={handleUpdateSavedVideoFolder}
            onNavigateToDownloader={() => setActiveTab('downloader')}
          />
        )}

        {activeTab === 'batch' && (
          <BatchDownloadModal
            onClose={() => setActiveTab('downloader')}
            onRefreshVault={refreshVault}
          />
        )}
      </main>

      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        savedVideo={activePlayingSavedVideo}
        previewVideoInfo={videoInfo || undefined}
        previewFormat={selectedFormat || undefined}
        onSaveToVault={handleSaveToVault}
      />

      {/* Folder & Storage Settings Modal */}
      <FolderSettingsModal
        isOpen={isFolderSettingsOpen}
        onClose={() => setIsFolderSettingsOpen(false)}
        storageStats={storageStats}
        onClearAll={refreshVault}
      />

      {/* Google CDN Guide Modal */}
      <GoogleCdnExplainerModal
        isOpen={isCdnGuideOpen}
        onClose={() => setIsCdnGuideOpen(false)}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>TubeVault — Simpan Video YouTube ke Folder Lokal & Tonton Offline</div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Penyimpanan: IndexedDB Blob & File System API</span>
            <span aria-hidden="true">·</span>
            <span>Google Video CDN Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
