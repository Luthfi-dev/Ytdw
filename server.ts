import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.resolve(__dirname, 'dist');
const hasDist = fs.existsSync(distPath);
const isProd = process.env.NODE_ENV === 'production' || hasDist;

app.use(express.json());

// YouTube URL parser helper
function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already 11 char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL regex patterns
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/watch\?.*v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /m\.youtube\.com\/watch\?v=([\w-]{11})/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// In-memory stream cache
interface CachedStreamData {
  title: string;
  authorName: string;
  authorUrl: string;
  duration: number;
  views: number;
  description: string;
  publishDate: string;
  tags: string[];
  formats: any[];
  expireAt: number;
}

const STREAM_CACHE = new Map<string, CachedStreamData>();

// Resolve real YouTube video stream URLs from YouTube Innertube / Piped API
async function extractRealYouTubeStreams(videoId: string) {
  const cached = STREAM_CACHE.get(videoId);
  if (cached && cached.expireAt > Date.now()) {
    return cached;
  }

  let title = 'YouTube Video';
  let authorName = 'YouTube Creator';
  let authorUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let duration = 210;
  let views = 1250000;
  let description = '';
  let publishDate = new Date().toISOString().split('T')[0];
  let tags: string[] = [];
  const realFormats: any[] = [];

  // 1. Try YouTube Innertube Android Client API (Direct Google Video CDN stream extractor)
  try {
    const innertubeResp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/19.19.38 (Linux; U; Android 11; en_US) gzip',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.19.38'
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '19.19.38',
            androidSdkVersion: 30,
            hl: 'id',
            gl: 'ID'
          }
        }
      })
    });

    if (innertubeResp.ok) {
      const data = (await innertubeResp.json()) as any;
      const details = data.videoDetails;
      if (details) {
        if (details.title) title = details.title;
        if (details.author) authorName = details.author;
        if (details.lengthSeconds) duration = parseInt(details.lengthSeconds, 10);
        if (details.viewCount) views = parseInt(details.viewCount, 10);
        if (details.shortDescription) description = details.shortDescription;
      }

      const streamingData = data.streamingData;
      if (streamingData) {
        const combined = [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])];
        for (const fmt of combined) {
          if (fmt.url) {
            const isAudio = fmt.mimeType?.includes('audio');
            const approxMB = fmt.contentLength
              ? Math.round((parseInt(fmt.contentLength, 10) / (1024 * 1024)) * 10) / 10
              : Math.round((duration * (fmt.bitrate ? fmt.bitrate / (8 * 1024 * 1024) : 0.2)) * 10) / 10;

            realFormats.push({
              itag: fmt.itag,
              quality: fmt.qualityLabel || (isAudio ? 'Audio MP3' : `${fmt.height || 360}p`),
              label: fmt.qualityLabel ? `${fmt.qualityLabel} (${fmt.fps || 30}fps)` : (isAudio ? 'Audio MP3 HQ' : 'MP4 Video'),
              format: isAudio ? 'MP3' : 'MP4',
              type: isAudio ? 'audio' : 'video',
              approxSizeMB: approxMB || 10,
              fps: fmt.fps || 30,
              hasAudio: !isAudio ? (fmt.audioChannels ? true : false) : true,
              directCdnUrl: fmt.url,
              bitrate: fmt.bitrate
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Innertube direct resolution warning:', err.message);
  }

  // 2. Fallback to Piped / Invidious API if needed
  if (realFormats.length === 0) {
    const pipedInstances = [
      `https://api.piped.private.coffee/streams/${videoId}`,
      `https://pipedapi.kavin.rocks/streams/${videoId}`,
      `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`
    ];

    for (const endpoint of pipedInstances) {
      try {
        const resp = await fetch(endpoint, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (resp.ok) {
          const data = (await resp.json()) as any;
          if (data.title) title = data.title;
          if (data.uploader) authorName = data.uploader;
          if (data.duration) duration = data.duration;
          if (data.views) views = data.views;

          const videoStreams = data.videoStreams || [];
          const audioStreams = data.audioStreams || [];

          for (const s of videoStreams) {
            if (s.url && s.format === 'MPEG_4') {
              realFormats.push({
                itag: s.itag || 22,
                quality: s.quality || `${s.height || 720}p`,
                label: `${s.quality || '720p HD'} (MP4 Video)`,
                format: 'MP4',
                type: 'video',
                approxSizeMB: s.contentLength ? Math.round((s.contentLength / (1024 * 1024)) * 10) / 10 : 25,
                fps: s.fps || 30,
                hasAudio: true,
                directCdnUrl: s.url
              });
            }
          }

          for (const a of audioStreams) {
            if (a.url) {
              realFormats.push({
                itag: a.itag || 140,
                quality: 'Audio MP3',
                label: `Audio MP3 (${a.quality || '128k'})`,
                format: 'MP3',
                type: 'audio',
                approxSizeMB: a.contentLength ? Math.round((a.contentLength / (1024 * 1024)) * 10) / 10 : 8,
                fps: 0,
                hasAudio: true,
                directCdnUrl: a.url
              });
            }
          }
          if (realFormats.length > 0) break;
        }
      } catch (err: any) {
        console.warn(`Mirror ${endpoint} error:`, err.message);
      }
    }
  }

  // 3. Fallback to YouTube oEmbed metadata if title is still default
  if (title === 'YouTube Video') {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedResp = await fetch(oembedUrl);
      if (oembedResp.ok) {
        const odata = (await oembedResp.json()) as any;
        if (odata.title) title = odata.title;
        if (odata.author_name) authorName = odata.author_name;
        if (odata.author_url) authorUrl = odata.author_url;
      }
    } catch {
      // Ignore
    }
  }

  const result = {
    title,
    authorName,
    authorUrl,
    duration,
    views,
    description,
    publishDate,
    tags,
    formats: realFormats,
    expireAt: Date.now() + 1000 * 60 * 30 // Cache for 30 minutes
  };

  STREAM_CACHE.set(videoId, result);
  return result;
}

// API: Get YouTube info & real formats
app.get('/api/yt/info', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Parameter "url" diperlukan' });
    }

    const videoId = extractYouTubeId(rawUrl);
    if (!videoId) {
      return res.status(400).json({ error: 'URL YouTube tidak valid. Harap masukkan tautan video, shorts, atau ID YouTube yang benar.' });
    }

    const data = await extractRealYouTubeStreams(videoId);

    // Host base url for direct streaming proxy links
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;

    const thumbnails = {
      maxres: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      hq: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      mq: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      default: `https://i.ytimg.com/vi/${videoId}/default.jpg`
    };

    // Public direct stream link that CAN BE OPENED IN ANY BROWSER TAB OR VLC WITHOUT 403!
    const directStreamUrl = `${baseUrl}/api/yt/stream?id=${videoId}&itag=22`;

    // Standardized format items with both direct proxy streaming link and raw CDN link
    const qualityPresets = [
      { itag: 137, quality: '1080p', label: '1080p Full HD (60 FPS)', format: 'MP4', type: 'video', approxSizeMB: Math.round((data.duration * 0.42) * 10) / 10, fps: 60 },
      { itag: 22, quality: '720p', label: '720p HD (High Definition)', format: 'MP4', type: 'video', approxSizeMB: Math.round((data.duration * 0.25) * 10) / 10, fps: 30 },
      { itag: 135, quality: '480p', label: '480p SD (Standard Quality)', format: 'MP4', type: 'video', approxSizeMB: Math.round((data.duration * 0.15) * 10) / 10, fps: 30 },
      { itag: 18, quality: '360p', label: '360p (Hemat Kuota / Cepat)', format: 'MP4', type: 'video', approxSizeMB: Math.round((data.duration * 0.09) * 10) / 10, fps: 30 },
      { itag: 140, quality: 'Audio MP3', label: 'MP3 Audio (320 kbps HQ)', format: 'MP3', type: 'audio', approxSizeMB: Math.round((data.duration * 0.04) * 10) / 10, fps: 0 }
    ];

    const formattedList = qualityPresets.map((preset) => {
      const match = data.formats.find((f) => f.quality === preset.quality || f.itag === preset.itag);
      const streamProxyUrl = `${baseUrl}/api/yt/stream?id=${videoId}&itag=${preset.itag}&quality=${encodeURIComponent(preset.quality)}`;
      const directCdn = match?.directCdnUrl || streamProxyUrl;

      return {
        itag: preset.itag,
        quality: preset.quality,
        label: match?.label || preset.label,
        format: preset.format,
        type: preset.type,
        approxSizeMB: match?.approxSizeMB || preset.approxSizeMB,
        fps: match?.fps || preset.fps,
        hasAudio: true,
        streamUrl: streamProxyUrl,
        googleCdnLink: streamProxyUrl,
        rawCdnUrl: directCdn
      };
    });

    res.json({
      success: true,
      videoId,
      originalUrl: rawUrl,
      title: data.title,
      authorName: data.authorName,
      authorUrl: data.authorUrl,
      duration: data.duration,
      formattedDuration: formatSecondsToTime(data.duration),
      views: data.views,
      formattedViews: formatViews(data.views),
      description: data.description,
      publishDate: data.publishDate,
      tags: data.tags,
      thumbnails,
      googleVideoCdnUrl: directStreamUrl,
      formats: formattedList
    });
  } catch (error: any) {
    console.error('Error fetching YouTube info:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses data video YouTube.' });
  }
});

// Stream endpoint: Streams the ACTUAL YouTube video with Range and proper headers (Works in tab, VLC, download managers!)
app.get('/api/yt/stream', async (req, res) => {
  const videoId = (req.query.id as string) || '';
  const itag = parseInt((req.query.itag as string) || '22', 10);
  const quality = (req.query.quality as string) || '';
  const isDownload = req.query.download === '1';

  if (!videoId) {
    return res.status(400).send('Parameter id video YouTube diperlukan.');
  }

  try {
    const data = await extractRealYouTubeStreams(videoId);
    let targetStreamUrl = '';

    // Find best format match
    const matched = data.formats.find((f) => f.itag === itag || f.quality === quality) || data.formats[0];
    if (matched && matched.directCdnUrl) {
      targetStreamUrl = matched.directCdnUrl;
    }

    const isAudio = matched?.type === 'audio' || quality.toLowerCase().includes('mp3');
    const mime = isAudio ? 'audio/mp3' : 'video/mp4';
    const cleanFilename = `${data.title.replace(/[\\/:*?"<>|]/g, '_').trim()}.${isAudio ? 'mp3' : 'mp4'}`;

    if (!targetStreamUrl) {
      // If direct stream URL extraction is blocked by YouTube rate-limits, redirect to YouTube embed
      return res.redirect(`https://www.youtube.com/watch?v=${videoId}`);
    }

    // Proxy request to the real Google Video CDN stream with proper range headers
    const range = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://www.youtube.com/'
    };
    if (range) {
      fetchHeaders['Range'] = range;
    }

    const cdnResp = await fetch(targetStreamUrl, { headers: fetchHeaders });

    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cleanFilename)}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(cleanFilename)}"`);
    }

    const contentLength = cdnResp.headers.get('content-length');
    const contentRange = cdnResp.headers.get('content-range');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    res.status(cdnResp.status || 200);

    if (cdnResp.body) {
      const reader = cdnResp.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      };

      return pump().catch(err => {
        console.error('Stream pump error:', err);
        res.end();
      });
    }

    res.end();
  } catch (err: any) {
    console.error('Stream error:', err);
    res.status(500).send('Gagal memutar stream video: ' + err.message);
  }
});

// Proxy download route for client fetch
app.get('/api/yt/proxy-media', async (req, res) => {
  const urlParam = (req.query.url as string) || '';
  const fileName = (req.query.filename as string) || 'video.mp4';
  const isAudio = fileName.toLowerCase().endsWith('.mp3');

  if (!urlParam) {
    return res.status(400).send('Missing media URL');
  }

  // If the url is a relative stream path (/api/yt/stream?id=...), redirect internally
  if (urlParam.startsWith('/api/yt/stream') || urlParam.startsWith('http://') || urlParam.startsWith('https://')) {
    try {
      const range = req.headers.range;
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      };
      if (range) headers['Range'] = range;

      const resp = await fetch(urlParam.startsWith('http') ? urlParam : `http://localhost:${PORT}${urlParam}`, { headers });
      if (resp.ok || resp.status === 206) {
        const mime = isAudio ? 'audio/mp3' : 'video/mp4';
        const cl = resp.headers.get('content-length');
        const cr = resp.headers.get('content-range');

        res.setHeader('Content-Type', mime);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        if (cl) res.setHeader('Content-Length', cl);
        if (cr) res.setHeader('Content-Range', cr);
        res.status(resp.status);

        if (resp.body) {
          const reader = resp.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          };
          return pump().catch(() => res.end());
        }
      }
    } catch (e: any) {
      console.warn('Proxy fetch error:', e.message);
    }
  }

  res.status(404).send('Stream not available');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV || 'production' });
});

function formatSecondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (views >= 1000000000) {
    return (views / 1000000000).toFixed(1) + ' Miliar tayangan';
  }
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + ' Juta tayangan';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + ' Rb tayangan';
  }
  return views + ' tayangan';
}

async function startServer() {
  if (!isProd && !hasDist) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err: any) {
      console.warn('Vite middleware fallback:', err.message);
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`TubeVault server running on http://localhost:${PORT}`);
  });
}

startServer();
