import React, { useState } from 'react';
import {
  DownloadTask,
  YouTubeVideoInfo
} from '../types';
import {
  X,
  Layers,
  Play,
  CheckCircle,
  AlertCircle,
  FolderDown,
  HardDriveDownload,
  ListPlus,
  Trash2
} from 'lucide-react';
import { downloadYouTubeMedia } from '../services/downloadEngine';

interface BatchDownloadModalProps {
  onClose: () => void;
  onRefreshVault: () => void;
}

export const BatchDownloadModal: React.FC<BatchDownloadModalProps> = ({
  onClose,
  onRefreshVault
}) => {
  const [linksText, setLinksText] = useState(
    `https://www.youtube.com/watch?v=dQw4w9WgXcQ\nhttps://www.youtube.com/watch?v=L_LUpnjgPso\nhttps://www.youtube.com/watch?v=kJQP7kiw5Fk`
  );
  const [targetQuality, setTargetQuality] = useState<'720p' | '1080p' | '480p' | '360p' | 'Audio MP3'>('720p');
  const [targetFolder, setTargetFolder] = useState('Musik');
  const [saveToDisk, setSaveToDisk] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);

  const handleStartBatch = async () => {
    const rawLines = linksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) return;

    setIsProcessing(true);

    const initialTasks: DownloadTask[] = rawLines.map((url, i) => ({
      id: `task_${Date.now()}_${i}`,
      youtubeId: url,
      title: `Memproses link: ${url.slice(0, 30)}...`,
      thumbnail: '',
      quality: targetQuality,
      format: targetQuality === 'Audio MP3' ? 'MP3' : 'MP4',
      sizeMB: targetQuality === 'Audio MP3' ? 8 : 25,
      progress: 0,
      downloadSpeedMBs: 0,
      status: 'pending',
      savedDestination: saveToDisk ? 'both' : 'vault'
    }));

    setTasks(initialTasks);

    for (let i = 0; i < initialTasks.length; i++) {
      const task = initialTasks[i];
      const url = rawLines[i];

      // Update task to downloading
      setTasks((prev) =>
        prev.map((t, idx) => (idx === i ? { ...t, status: 'downloading', progress: 10 } : t))
      );

      try {
        // Fetch info
        const resp = await fetch(`/api/yt/info?url=${encodeURIComponent(url)}`);
        if (!resp.ok) throw new Error('Gagal mengambil info video');
        const info: YouTubeVideoInfo = await resp.json();

        // Find matching format
        const format =
          info.formats.find((f) => f.quality === targetQuality) || info.formats[0];

        setTasks((prev) =>
          prev.map((t, idx) =>
            idx === i
              ? {
                  ...t,
                  title: info.title,
                  thumbnail: info.thumbnails.hq || info.thumbnails.default,
                  sizeMB: format.approxSizeMB
                }
              : t
          )
        );

        // Download
        await downloadYouTubeMedia(info, format, {
          destination: saveToDisk ? 'both' : 'vault',
          folderCategory: targetFolder,
          onProgress: (progress, speed, status, msg) => {
            setTasks((prev) =>
              prev.map((t, idx) =>
                idx === i
                  ? {
                      ...t,
                      progress,
                      downloadSpeedMBs: speed,
                      status: status as any
                    }
                  : t
              )
            );
          }
        });

        setTasks((prev) =>
          prev.map((t, idx) => (idx === i ? { ...t, status: 'completed', progress: 100 } : t))
        );
      } catch (err: any) {
        setTasks((prev) =>
          prev.map((t, idx) =>
            idx === i
              ? {
                  ...t,
                  status: 'error',
                  errorMessage: err.message || 'Gagal mengunduh'
                }
              : t
          )
        );
      }
    }

    setIsProcessing(false);
    onRefreshVault();
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pt-4 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-display">
              Unduh Banyak Link YouTube Sekaligus (Batch Queue)
            </h2>
            <p className="text-xs text-slate-400">
              Tempel beberapa link YouTube (1 baris = 1 tautan) untuk mengunduh dan menyimpan semuanya secara otomatis ke folder lokal.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Col: URL Input Textarea & Config */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Daftar URL YouTube (Satu baris per tautan):</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {linksText.split('\n').filter((l) => l.trim()).length} Tautan
                </span>
              </label>
              <textarea
                rows={6}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                disabled={isProcessing}
                placeholder="https://www.youtube.com/watch?v=...&#10;https://youtu.be/...&#10;https://youtube.com/shorts/..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Kualitas File:</label>
                <select
                  value={targetQuality}
                  onChange={(e) => setTargetQuality(e.target.value as any)}
                  disabled={isProcessing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none"
                >
                  <option value="1080p">1080p Full HD</option>
                  <option value="720p">720p HD (Direkomendasikan)</option>
                  <option value="480p">480p SD</option>
                  <option value="360p">360p Data Saver</option>
                  <option value="Audio MP3">Audio MP3 (320kbps)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Kategori Folder:</label>
                <select
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  disabled={isProcessing}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none"
                >
                  <option value="Semua">Semua</option>
                  <option value="Musik">Musik</option>
                  <option value="Edukasi">Edukasi</option>
                  <option value="Shorts">Shorts</option>
                  <option value="Favorit">Favorit</option>
                  <option value="Podcast">Podcast</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveToDisk}
                onChange={(e) => setSaveToDisk(e.target.checked)}
                className="rounded border-slate-800 text-red-600 accent-red-600"
              />
              <span>Simpan juga file ke folder unduhan komputer (Download File Langsung)</span>
            </label>

            <button
              type="button"
              onClick={handleStartBatch}
              disabled={isProcessing || !linksText.trim()}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sedang Mengunduh Antrean...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Mulai Unduh Semua ({linksText.split('\n').filter((l) => l.trim()).length} Video)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Col: Antrean Unduhan / Task List */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Status Antrean ({completedCount} / {tasks.length} Selesai)
              </h3>
              {tasks.length > 0 && !isProcessing && (
                <button
                  type="button"
                  onClick={() => setTasks([])}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Bersihkan</span>
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <ListPlus className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Belum ada antrean yang berjalan. Tekan tombol "Mulai Unduh" di samping.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {tasks.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate flex-1">
                        <div className="font-semibold text-slate-200 truncate">{t.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {t.quality} · ~{t.sizeMB} MB
                        </div>
                      </div>

                      {t.status === 'completed' && (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium shrink-0">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Selesai</span>
                        </span>
                      )}

                      {t.status === 'error' && (
                        <span className="flex items-center gap-1 text-red-400 font-medium shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Gagal</span>
                        </span>
                      )}

                      {t.status === 'downloading' && (
                        <span className="flex items-center gap-1 text-amber-400 font-medium shrink-0">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          <span>Mengunduh...</span>
                        </span>
                      )}

                      {t.status === 'pending' && (
                        <span className="text-slate-500 font-medium shrink-0">Menunggu</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          t.status === 'completed'
                            ? 'bg-emerald-500'
                            : t.status === 'error'
                            ? 'bg-red-500'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
