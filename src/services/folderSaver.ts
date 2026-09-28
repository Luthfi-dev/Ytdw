// Service for handling Local Disk Folder saving via Web File System Access API or browser download fallback

let directoryHandle: any = null;
let chosenFolderName: string | null = null;

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickLocalFolder(): Promise<{ success: boolean; folderName?: string | null; error?: string }> {
  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      error: 'Browser Anda tidak mendukung File System Access API. Video akan diunduh melalui pengunduhan langsung browser.'
    };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'downloads'
    });
    directoryHandle = handle;
    chosenFolderName = handle?.name || 'Folder Terpilih';
    return { success: true, folderName: chosenFolderName };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Pemilihan folder dibatalkan.' };
    }
    return { success: false, error: err.message || 'Gagal memilih folder lokal.' };
  }
}

export function getCurrentFolderName(): string | null {
  return chosenFolderName;
}

export function sanitizeFilename(title: string, extension: string): string {
  const clean = title
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${clean || 'youtube_video'}.${extension}`;
}

export function downloadBlobDirectly(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    console.error('Direct download error:', err);
  }
}

export async function saveBlobToDiskFolder(
  blob: Blob,
  filename: string,
  preferFolderPicker = false
): Promise<{ success: boolean; method: 'filesystem' | 'download'; pathOrName: string; error?: string }> {
  // If user explicitly picked a directory via File System Access API
  if (isFileSystemAccessSupported() && (directoryHandle || preferFolderPicker)) {
    try {
      if (!directoryHandle) {
        directoryHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'downloads'
        });
        chosenFolderName = directoryHandle.name;
      }

      // Create file in the chosen directory
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
      const writableStream = await fileHandle.createWritable();
      await writableStream.write(blob);
      await writableStream.close();

      return {
        success: true,
        method: 'filesystem',
        pathOrName: `${chosenFolderName || 'Folder'}/${filename}`
      };
    } catch (err: any) {
      console.warn('File System Access failed, falling back to direct browser download:', err);
    }
  }

  // Fallback: Direct Browser Download to local Downloads folder
  try {
    downloadBlobDirectly(blob, filename);
    return {
      success: true,
      method: 'download',
      pathOrName: filename
    };
  } catch (err: any) {
    return {
      success: false,
      method: 'download',
      pathOrName: filename,
      error: err.message || 'Gagal menyimpan file ke perangkat.'
    };
  }
}

export function triggerDirectDownloadUrl(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Clipboard copy error:', err);
    return false;
  }
}
