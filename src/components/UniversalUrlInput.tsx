import React, { useState, useRef, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  Upload, 
  Clipboard, 
  X, 
  AlertCircle, 
  FileVideo,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { parseVideoUrl, ParsedUrlInfo } from '../utils/urlParser';
import { ClipSource } from '../types';

interface UniversalUrlInputProps {
  onSourceLoaded: (source: ClipSource) => void;
  autoFocus?: boolean;
}

export const UniversalUrlInput: React.FC<UniversalUrlInputProps> = ({
  onSourceLoaded,
  autoFocus = false,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Instantly process and load video link as soon as it's entered or pasted
  const processAndLoadUrl = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    const parsed = parseVideoUrl(trimmed);
    if (!parsed.isValid) {
      setLoadingError('Please enter a valid video link (YouTube, Instagram, Facebook, or direct video stream).');
      return;
    }

    setLoadingError(null);
    setIsProcessing(true);

    if (parsed.platform === 'youtube' && parsed.videoId) {
      // Instantly load video preview into workspace with zero delay
      const initialSource: ClipSource = {
        id: `yt-${parsed.videoId}-${Date.now()}`,
        title: parsed.title || 'YouTube Video',
        platform: 'youtube',
        url: trimmed,
        originalUrl: trimmed,
        videoId: parsed.videoId,
        thumbnailUrl: `https://i.ytimg.com/vi/${parsed.videoId}/hqdefault.jpg`,
        duration: 3600,
        isEmbedOnly: true,
        embedUrl: parsed.embedUrl,
        createdAt: Date.now(),
      };
      
      onSourceLoaded(initialSource);
      setIsProcessing(false);

      // Concurrently fetch video title in background without blocking preview
      fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${parsed.videoId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.title) {
            onSourceLoaded({
              ...initialSource,
              title: data.title,
              author: data.author_name,
              thumbnailUrl: data.thumbnail_url || initialSource.thumbnailUrl,
            });
          }
        })
        .catch(() => {});
    } else if (parsed.isEmbedOnly) {
      const newSource: ClipSource = {
        id: `embed-${Date.now()}`,
        title: parsed.title,
        platform: parsed.platform,
        url: trimmed,
        originalUrl: trimmed,
        duration: 3600,
        isEmbedOnly: true,
        embedUrl: parsed.embedUrl,
        createdAt: Date.now(),
      };
      onSourceLoaded(newSource);
      setIsProcessing(false);
    } else if (parsed.directUrl) {
      const tempVideo = document.createElement('video');
      tempVideo.src = parsed.directUrl;
      tempVideo.preload = 'metadata';

      tempVideo.onloadedmetadata = () => {
        const newSource: ClipSource = {
          id: `stream-${Date.now()}`,
          title: parsed.title,
          platform: 'direct_url',
          url: parsed.directUrl!,
          originalUrl: trimmed,
          duration: tempVideo.duration || 60,
          width: tempVideo.videoWidth,
          height: tempVideo.videoHeight,
          format: 'mp4',
          createdAt: Date.now(),
        };
        onSourceLoaded(newSource);
        setIsProcessing(false);
      };

      tempVideo.onerror = () => {
        setIsProcessing(false);
        setLoadingError('Failed to load remote video stream. Ensure the URL permits streaming or drop a local file.');
      };
    }
  };

  const handleInputChange = (value: string) => {
    setUrlInput(value);
    setLoadingError(null);
    const trimmed = value.trim();
    // Auto-detect full valid URLs immediately as user finishes typing or pastes
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = parseVideoUrl(trimmed);
      if (parsed.isValid) {
        processAndLoadUrl(trimmed);
      }
    }
  };

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      e.preventDefault();
      setUrlInput(text);
      processAndLoadUrl(text);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text);
        processAndLoadUrl(text);
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setUrlInput('');
    setLoadingError(null);
    setIsProcessing(false);
    inputRef.current?.focus();
  };

  const handleFileChange = (file: File) => {
    setLoadingError(null);
    setIsProcessing(true);
    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.src = objectUrl;
    tempVideo.preload = 'metadata';

    tempVideo.onloadedmetadata = () => {
      const newSource: ClipSource = {
        id: `local-${Date.now()}`,
        title: file.name,
        platform: 'local',
        url: objectUrl,
        originalUrl: file.name,
        duration: tempVideo.duration || 0,
        width: tempVideo.videoWidth || 1920,
        height: tempVideo.videoHeight || 1080,
        format: file.type.split('/')[1] || 'mp4',
        file: file,
        objectUrl: objectUrl,
        isEmbedOnly: false,
        createdAt: Date.now(),
      };
      onSourceLoaded(newSource);
      setIsProcessing(false);
    };

    tempVideo.onerror = () => {
      setIsProcessing(false);
      setLoadingError('Could not decode the selected video file. Supported formats: MP4, WebM, MOV.');
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Universal Input Card */}
      <div className="bg-surface-card border border-stone rounded-lg p-3 sm:p-5 shadow-minimal">
        <div className="flex items-center justify-between gap-2 mb-3">
          <label htmlFor="universal-url-input" className="text-xs font-semibold text-botanical uppercase tracking-wider font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-coral inline-block"></span>
            Paste Video Link
          </label>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-olive">
            <span className="px-1.5 py-0.5 rounded bg-surface border border-stone">YouTube</span>
            <span className="px-1.5 py-0.5 rounded bg-surface border border-stone">Reels</span>
            <span className="px-1.5 py-0.5 rounded bg-surface border border-stone">Facebook</span>
            <span className="px-1.5 py-0.5 rounded bg-surface border border-stone">MP4</span>
          </div>
        </div>

        {/* Input Bar with Instant Paste */}
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-olive">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-coral" />
            ) : (
              <LinkIcon className="w-4 h-4" />
            )}
          </div>
          
          <input
            ref={inputRef}
            id="universal-url-input"
            type="text"
            value={urlInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onPaste={handlePasteEvent}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                processAndLoadUrl(urlInput);
              }
            }}
            placeholder="Paste any YouTube, Instagram, or Facebook link..."
            className="w-full pl-10 pr-28 sm:pr-32 py-3 bg-ivory border border-stone rounded-md text-xs sm:text-sm font-mono text-botanical placeholder:text-olive focus:bg-white focus:border-coral focus:outline-none transition-colors"
          />

          <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
            {urlInput ? (
              <button
                onClick={handleClear}
                className="p-1.5 text-olive hover:text-botanical rounded transition-colors"
                title="Clear input"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handlePasteFromClipboard}
                className="px-2.5 py-1.5 bg-coral text-white text-[11px] font-semibold rounded hover:bg-coral-hover transition-colors shadow-minimal flex items-center gap-1"
                type="button"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste</span>
              </button>
            )}

            {urlInput && (
              <button
                onClick={() => processAndLoadUrl(urlInput)}
                className="px-3 py-1.5 bg-coral text-white text-xs font-semibold rounded hover:bg-coral-hover transition-colors shadow-minimal flex items-center gap-1"
                type="button"
              >
                <span>Go</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {loadingError && (
          <div className="mt-3 p-2.5 bg-crimson-subtle border border-crimson text-crimson rounded text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadingError}</span>
          </div>
        )}

        {/* Instant file drop / alternative */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-3 border border-dashed rounded-md p-3 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-coral bg-coral-subtle' : 'border-stone hover:border-olive bg-surface'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            onChange={(e) => e.target.files && e.target.files[0] && handleFileChange(e.target.files[0])}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2 text-xs text-olive hover:text-botanical">
            <Upload className="w-3.5 h-3.5 text-coral" />
            <span>Or drag and drop a local video file (MP4, WebM, MOV)</span>
          </div>
        </div>
      </div>
    </div>
  );
};