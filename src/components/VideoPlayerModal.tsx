import React, { useState, useRef, useEffect } from 'react';
import {
  SavedVideo,
  YouTubeVideoInfo,
  VideoFormat
} from '../types';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Repeat,
  Radio,
  HardDrive,
  Globe,
  Download,
  Music,
  Bookmark,
  Sparkles,
  Check,
  Tv,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { downloadBlobDirectly, sanitizeFilename } from '../services/folderSaver';
import { updateVideoNotes, updateVideoProgress } from '../services/db';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedVideo?: SavedVideo;
  previewVideoInfo?: YouTubeVideoInfo;
  previewFormat?: VideoFormat;
  onSaveToVault?: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  savedVideo,
  previewVideoInfo,
  previewFormat
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSource, setActiveSource] = useState<'blob' | 'cdn' | 'embed'>('blob');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState(savedVideo?.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Determine media metadata
  const title = savedVideo?.title || previewVideoInfo?.title || 'YouTube Video';
  const channel = savedVideo?.channel || previewVideoInfo?.authorName || 'Channel';
  const quality = savedVideo?.quality || previewFormat?.quality || '720p';
  const youtubeId = savedVideo?.youtubeId || previewVideoInfo?.videoId || '';
  const isAudioOnly = savedVideo?.isAudioOnly || previewFormat?.type === 'audio';
  const cdnUrl = savedVideo?.googleVideoCdnUrl || previewFormat?.googleCdnLink || previewVideoInfo?.googleVideoCdnUrl;

  // Manage Blob Object URL
  useEffect(() => {
    if (!isOpen) return;
    setHasPlaybackError(false);

    if (savedVideo?.blob && savedVideo.blob.size > 0) {
      const url = URL.createObjectURL(savedVideo.blob);
      setBlobUrl(url);
      setActiveSource('blob');
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setActiveSource('embed');
    }
  }, [isOpen, savedVideo]);

  // Sync initial notes
  useEffect(() => {
    if (savedVideo?.notes) {
      setNotes(savedVideo.notes);
    }
  }, [savedVideo]);

  // Time update listener
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
      if (savedVideo?.id && Math.floor(videoRef.current.currentTime) % 5 === 0) {
        updateVideoProgress(savedVideo.id, videoRef.current.currentTime);
      }
    }
  };

  const handleVideoError = () => {
    console.warn('HTML5 Video playback error encountered, auto-switching to YouTube HD Embed mode');
    setHasPlaybackError(true);
    setActiveSource('embed');
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skipTime(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skipTime(5);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'Escape') {
        if (!document.fullscreenElement) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying]);

  // Audio Canvas visualizer loop for MP3
  useEffect(() => {
    if (!isOpen || !isAudioOnly || !audioCanvasRef.current) return;

    const canvas = audioCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bars = 36;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / bars - 2;

      for (let i = 0; i < bars; i++) {
        const factor = isPlaying ? Math.sin(Date.now() / 150 + i * 0.4) * 0.5 + 0.5 : 0.1;
        const barHeight = Math.max(4, factor * height * 0.85);

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(1, '#f59e0b');

        ctx.fillStyle = gradient;
        ctx.fillRect(i * (barWidth + 2), height - barHeight, barWidth, barHeight);
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, isAudioOnly, isPlaying]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
    if (videoRef.current) {
      videoRef.current.loop = !isLooping;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  const handleDirectDownload = () => {
    const ext = isAudioOnly ? 'mp3' : 'mp4';
    const filename = sanitizeFilename(title, ext);

    if (savedVideo?.blob) {
      downloadBlobDirectly(savedVideo.blob, filename);
    } else if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Direct stream proxy download
      const target = `/api/yt/proxy-media?url=${encodeURIComponent(previewFormat?.streamUrl || cdnUrl || '')}&filename=${encodeURIComponent(filename)}`;
      const a = document.createElement('a');
      a.href = target;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleSaveNotes = async () => {
    if (savedVideo?.id) {
      await updateVideoNotes(savedVideo.id, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentMediaSrc = activeSource === 'blob' && blobUrl ? blobUrl : (previewFormat?.streamUrl || cdnUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        ref={playerContainerRef}
        className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Top Player Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/80 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">{title}</h3>
              <p className="text-xs text-slate-400 truncate">{channel} · {quality}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Download Button in Header */}
            <button
              type="button"
              onClick={handleDirectDownload}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-500/40 shadow-emerald-600/20'
              }`}
              title="Unduh file video langsung ke folder Download perangkat Anda"
            >
              {downloadSuccess ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloadSuccess ? 'File Diunduh!' : 'Download ke Perangkat'}</span>
            </button>

            {/* Source Switcher */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
              {blobUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSource('blob');
                    setHasPlaybackError(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    activeSource === 'blob'
                      ? 'bg-emerald-600 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Memutar dari file biner di penyimpanan lokal"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden sm:inline">Offline Vault</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveSource('embed');
                  setHasPlaybackError(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeSource === 'embed'
                    ? 'bg-red-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tonton melalui pemutar YouTube resmi"
              >
                <Tv className="w-3.5 h-3.5 text-red-300" />
                <span className="hidden sm:inline">YouTube HD</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSource('cdn');
                  setHasPlaybackError(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeSource === 'cdn'
                    ? 'bg-amber-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Memutar stream langsung dari Google Video CDN"
              >
                <Globe className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Google CDN</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Display Area */}
        <div className="relative bg-black flex items-center justify-center aspect-video max-h-[60vh] overflow-hidden group">
          {activeSource === 'embed' && youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : isAudioOnly ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-black relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 p-0.5 shadow-2xl shadow-red-500/20 mb-4 flex items-center justify-center">
                <Music className="w-12 h-12 text-white" />
              </div>
              <p className="text-white font-bold text-base mb-1">{title}</p>
              <p className="text-xs text-slate-400 mb-4">{channel} · Audio MP3</p>
              <canvas
                ref={audioCanvasRef}
                width={360}
                height={60}
                className="w-full max-w-sm h-14"
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={currentMediaSrc}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={handleVideoError}
              playsInline
            />
          )}

          {/* Big Center Play/Pause Button on Hover (for native video mode) */}
          {activeSource !== 'embed' && !isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-8 h-8 fill-white translate-x-0.5" />
            </button>
          )}

          {/* Badge: Source Info */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-200 flex items-center gap-1.5 pointer-events-none">
            {activeSource === 'blob' ? (
              <>
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pemutaran Offline (Penyimpanan Lokal)</span>
              </>
            ) : activeSource === 'embed' ? (
              <>
                <Tv className="w-3.5 h-3.5 text-red-400" />
                <span>YouTube HD Player</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Video CDN Direct Stream</span>
              </>
            )}
          </div>
        </div>

        {/* Custom Video Controls (Active when not in embed mode) */}
        {activeSource !== 'embed' && (
          <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 space-y-2.5">
            {/* Progress Slider */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-300 min-w-[40px]">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <span className="text-xs font-mono text-slate-400 min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>

            {/* Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
                  title={isPlaying ? 'Jeda' : 'Putar'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => skipTime(-10)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Mundur 10 detik"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => skipTime(10)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Maju 10 detik"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Bisukan"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 h-1 bg-slate-800 rounded cursor-pointer accent-red-500"
                  />
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Playback Speed selector */}
                <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800 text-xs">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changeSpeed(rate)}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        playbackRate === rate ? 'bg-red-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Loop Button */}
                <button
                  type="button"
                  onClick={toggleLoop}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    isLooping
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'
                  }`}
                  title="Ulangi video (Loop)"
                >
                  <Repeat className="w-4 h-4" />
                </button>

                {/* Picture in Picture */}
                {!isAudioOnly && (
                  <button
                    type="button"
                    onClick={togglePictureInPicture}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Picture-in-Picture"
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Layar Penuh"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Drawer: Bookmarks & Direct Download to Device */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {savedVideo && (
            <div className="flex-1 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambah catatan/bookmark video ini..."
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-slate-700"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors shrink-0 cursor-pointer"
              >
                {notesSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : 'Simpan Catatan'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDirectDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File ({isAudioOnly ? 'MP3' : 'MP4'}) ke Perangkat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
