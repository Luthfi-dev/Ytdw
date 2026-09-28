export interface VideoFormat {
  itag: number;
  quality: string;
  label: string;
  format: string; // 'MP4' | 'MP3' | 'WebM'
  type: 'video' | 'audio';
  approxSizeMB: number;
  fps: number;
  hasAudio: boolean;
  streamUrl: string;
  googleCdnLink: string;
}

export interface YouTubeVideoInfo {
  videoId: string;
  originalUrl: string;
  title: string;
  authorName: string;
  authorUrl: string;
  duration: number; // in seconds
  formattedDuration: string;
  views: number;
  formattedViews: string;
  description: string;
  publishDate: string;
  tags: string[];
  thumbnails: {
    maxres: string;
    hq: string;
    mq: string;
    default: string;
  };
  googleVideoCdnUrl: string;
  formats: VideoFormat[];
}

export interface SavedVideo {
  id: string; // unique ID e.g. `${videoId}_${quality}`
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number;
  formattedDuration: string;
  quality: string;
  format: string;
  mimeType: string;
  fileSize: number; // bytes
  formattedSize: string;
  blob?: Blob;
  savedAt: number; // timestamp
  folder: string; // category e.g. 'Semua', 'Musik', 'Edukasi', 'Shorts', 'Favorit'
  originalUrl: string;
  googleVideoCdnUrl: string;
  watchProgress?: number; // seconds
  notes?: string;
  isAudioOnly?: boolean;
}

export interface DownloadTask {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  quality: string;
  format: string;
  sizeMB: number;
  progress: number; // 0 - 100
  downloadSpeedMBs: number;
  status: 'pending' | 'downloading' | 'saving' | 'completed' | 'error';
  errorMessage?: string;
  savedDestination: 'vault' | 'disk' | 'both';
  savePath?: string;
}

export interface StorageStats {
  usedBytes: number;
  formattedUsed: string;
  videoCount: number;
  quotaBytes?: number;
  formattedQuota?: string;
  percentageUsed?: number;
}
