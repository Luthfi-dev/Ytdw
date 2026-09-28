import React, { useState } from 'react';
import { Search, Clipboard, X, Sparkles, ArrowRight, Music, Trees, Film, Zap } from 'lucide-react';

interface UrlInputSectionProps {
  urlInput: string;
  setUrlInput: (val: string) => void;
  isLoading: boolean;
  onAnalyze: (urlToAnalyze?: string) => void;
  onSwitchToBatch: () => void;
}

const SAMPLE_VIDEOS = [
  {
    label: 'Nature 4K (60fps)',
    icon: Trees,
    url: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
    desc: 'Audio alam & visual jernih'
  },
  {
    label: 'Never Gonna Give You Up',
    icon: Music,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    desc: 'Musik klasik 80s'
  },
  {
    label: 'Despacito',
    icon: Film,
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    desc: 'Video musik pop'
  },
  {
    label: 'Me at the zoo (1st YT)',
    icon: Zap,
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    desc: 'Video pertama YouTube 2005'
  }
];

export const UrlInputSection: React.FC<UrlInputSectionProps> = ({
  urlInput,
  setUrlInput,
  isLoading,
  onAnalyze,
  onSwitchToBatch
}) => {
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 1500);
      }
    } catch {
      // Fallback
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onAnalyze();
    }
  };

  const handleSelectSample = (url: string) => {
    setUrlInput(url);
    onAnalyze(url);
  };

  return (
    <section className="w-full max-w-4xl mx-auto pt-6 pb-4">
      {/* Title & Badge */}
      <div className="text-center space-y-3 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span>Simpan Otomatis ke Folder Lokal & Tonton Tanpa Internet</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-display">
          Simpan Video YouTube ke Folder Perangkat
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Cukup masukkan link video YouTube, video akan langsung tersimpan di folder laptop/HP Anda untuk ditonton secara offline atau salin link direct Google Video CDN.
        </p>
      </div>

      {/* Main URL Input Form */}
      <form onSubmit={handleFormSubmit} className="relative group">
        <div className="relative flex items-center bg-slate-900/90 border-2 border-slate-700/80 focus-within:border-red-500/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden transition-all duration-200">
          <div className="pl-4 sm:pl-5 text-slate-400">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-red-400 transition-colors" />
          </div>

          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Tempel tautan YouTube di sini (misal: https://youtu.be/... atau youtube.com/watch?v=...)"
            className="w-full py-4 sm:py-5 px-3 sm:px-4 bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none"
            disabled={isLoading}
          />

          {/* Action Buttons inside Input */}
          <div className="flex items-center gap-1.5 pr-2 sm:pr-3">
            {urlInput && (
              <button
                type="button"
                onClick={() => setUrlInput('')}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Hapus tautan"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handlePaste}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                pasteSuccess
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title="Tempel tautan dari clipboard"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>{pasteSuccess ? 'Tersalin!' : 'Tempel'}</span>
            </button>

            <button
              type="submit"
              disabled={isLoading || !urlInput.trim()}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap active:scale-95"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden sm:inline">Menganalisis...</span>
                </>
              ) : (
                <>
                  <span>Ambil Video</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Samples and Multi-link Switcher */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-medium">Contoh Video Siap Uji:</span>
          {SAMPLE_VIDEOS.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(item.url)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors"
                title={item.desc}
              >
                <IconComponent className="w-3 h-3 text-red-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSwitchToBatch}
          className="text-red-400 hover:text-red-300 font-medium transition-colors underline-offset-4 hover:underline ml-auto"
        >
          Unduh Banyak Link Sekaligus (Batch) &rarr;
        </button>
      </div>
    </section>
  );
};
