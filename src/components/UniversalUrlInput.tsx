import React, { useState, useRef, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  Upload, 
  Clipboard, 
  X, 
  AlertCircle, 
  FileVideo,
  Play,
  Loader2
} from 'lucide-react';
import { parseVideoUrl, ParsedUrlInfo } from '../utils/urlParser';
import { ClipSource } from '../types';

interface UniversalUrlInputProps {
  onSourceLoaded: (source: ClipSource) => void;
}

export const UniversalUrlInput: React.FC<UniversalUrlInputProps> = ({
  onSourceLoaded,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [urlInfo, setUrlInfo] = useState<ParsedUrlInfo | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [fetchedDetails, setFetchedDetails] = useState<{ title: string; author?: string; thumbnail?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    setLoadingError(null);
    setFetchedDetails(null);

    if (value.trim()) {
      const parsed = parseVideoUrl(value);
      setUrlInfo(parsed);

      if (parsed.isValid && parsed.platform === 'youtube' && parsed.videoId) {
        setIsFetchingDetails(true);
        fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${parsed.videoId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.title) {
              setFetchedDetails({
                title: data.title,
                author: data.author_name,
                thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${parsed.videoId}/hqdefault.jpg`,
              });
            }
          })
          .catch(() => {})
          .finally(() => setIsFetchingDetails(false));
      }
    } else {
      setUrlInfo(null);
      setIsFetchingDetails(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUrlChange(text);
      }
    } catch {
      const input = document.getElementById('universal-url-field');
      input?.focus();
    }
  };

  const handleClear = () => {
    setUrlInput('');
    setUrlInfo(null);
    setFetchedDetails(null);
    setLoadingError(null);
  };

  const handleResolveUrl = () => {
    if (!urlInfo || !urlInfo.isValid) {
      setLoadingError('Please enter a valid video link before proceeding.');
      return;
    }

    if (urlInfo.platform === 'youtube' && urlInfo.videoId) {
      const title = fetchedDetails?.title || urlInfo.title;
      const newSource: ClipSource = {
        id: `yt-${urlInfo.videoId}-${Date.now()}`,
        title,
        platform: 'youtube',
        url: urlInput,
        originalUrl: urlInput,
        videoId: urlInfo.videoId,
        author: fetchedDetails?.author,
        thumbnailUrl: fetchedDetails?.thumbnail || `https://i.ytimg.com/vi/${urlInfo.videoId}/hqdefault.jpg`,
        duration: 300,
        isEmbedOnly: true,
        embedUrl: urlInfo.embedUrl,
        createdAt: Date.now(),
      };
      onSourceLoaded(newSource);
    } else if (urlInfo.isEmbedOnly) {
      const newSource: ClipSource = {
        id: `embed-${Date.now()}`,
        title: urlInfo.title,
        platform: urlInfo.platform,
        url: urlInput,
        originalUrl: urlInput,
        duration: 300,
        isEmbedOnly: true,
        embedUrl: urlInfo.embedUrl,
        createdAt: Date.now(),
      };
      onSourceLoaded(newSource);
    } else if (urlInfo.directUrl) {
      const tempVideo = document.createElement('video');
      tempVideo.src = urlInfo.directUrl;
      tempVideo.preload = 'metadata';

      tempVideo.onloadedmetadata = () => {
        const newSource: ClipSource = {
          id: `stream-${Date.now()}`,
          title: urlInfo.title,
          platform: 'direct_url',
          url: urlInfo.directUrl!,
          originalUrl: urlInput,
          duration: tempVideo.duration || 60,
          width: tempVideo.videoWidth,
          height: tempVideo.videoHeight,
          format: 'mp4',
          createdAt: Date.now(),
        };
        onSourceLoaded(newSource);
      };

      tempVideo.onerror = () => {
        setLoadingError('Failed to load remote video stream. Ensure the URL permits CORS streaming or use local file upload.');
      };
    }
  };

  const handleFileChange = (file: File) => {
    setLoadingError(null);
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
    };

    tempVideo.onerror = () => {
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
    <div className="space-y-6 max-w-4xl mx-auto pb-16 md:pb-6">
      {/* Universal URL Resolver Card */}
      <div className="bg-surface-card border border-stone rounded-md p-4 sm:p-6 shadow-minimal">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-heading font-bold text-base text-botanical">
              Enter Video Link
            </h2>
            <p className="text-xs text-olive">
              Paste any YouTube, Instagram, Facebook link or direct video file URL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-surface border border-stone text-botanical">YouTube</span>
            <span className="px-2 py-0.5 rounded bg-surface border border-stone text-botanical">Instagram</span>
            <span className="px-2 py-0.5 rounded bg-surface border border-stone text-botanical">Facebook</span>
            <span className="px-2 py-0.5 rounded bg-surface border border-stone text-botanical">Direct MP4</span>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-olive">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              id="universal-url-field"
              type="text"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleResolveUrl()}
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
              className="w-full pl-9 pr-16 py-2.5 bg-ivory border border-stone rounded text-xs font-mono text-botanical placeholder:text-olive focus:bg-white"
            />
            {urlInput && (
              <button
                onClick={handleClear}
                className="absolute inset-y-0 right-8 pr-2 flex items-center text-olive hover:text-botanical"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handlePaste}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-olive hover:text-coral"
              title="Paste from clipboard"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleResolveUrl}
            disabled={!urlInfo || !urlInfo.isValid}
            className={`px-5 py-2.5 text-xs font-semibold rounded transition-colors flex items-center justify-center space-x-1.5 shrink-0 ${
              urlInfo && urlInfo.isValid
                ? 'bg-coral text-white hover:bg-coral-hover shadow-minimal'
                : 'bg-stone text-olive cursor-not-allowed'
            }`}
          >
            <span>Resolve Link</span>
          </button>
        </div>

        {/* Fetching State */}
        {isFetchingDetails && (
          <div className="mt-3 flex items-center space-x-2 text-xs font-mono text-olive py-2">
            <Loader2 className="w-4 h-4 animate-spin text-coral" />
            <span>Fetching video details...</span>
          </div>
        )}

        {/* Fetched Preview Card */}
        {urlInfo && urlInfo.isValid && (
          <div className="mt-4 p-3 bg-surface border border-stone rounded text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              {fetchedDetails?.thumbnail ? (
                <img
                  src={fetchedDetails.thumbnail}
                  alt="Thumbnail"
                  className="w-20 h-12 object-cover rounded border border-stone shrink-0"
                />
              ) : (
                <div className="w-20 h-12 bg-ivory rounded border border-stone flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 text-coral" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold tracking-wider bg-coral text-white">
                    {urlInfo.badgeLabel}
                  </span>
                  {fetchedDetails?.author && (
                    <span className="text-[11px] font-mono text-olive truncate">
                      {fetchedDetails.author}
                    </span>
                  )}
                </div>
                <div className="font-semibold text-botanical truncate mt-0.5">
                  {fetchedDetails?.title || urlInfo.title}
                </div>
              </div>
            </div>

            <button
              onClick={handleResolveUrl}
              className="w-full sm:w-auto px-4 py-2 bg-botanical text-white hover:bg-botanical-light rounded text-xs font-semibold shrink-0 shadow-minimal flex items-center justify-center space-x-1"
            >
              <Play className="w-3.5 h-3.5 text-lime fill-lime" />
              <span>Open in Clipper</span>
            </button>
          </div>
        )}

        {loadingError && (
          <div className="mt-3 p-3 bg-crimson-subtle border border-crimson text-crimson rounded text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadingError}</span>
          </div>
        )}
      </div>

      {/* Local Video File Ingest Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-surface-card border-2 border-dashed rounded-md p-6 sm:p-10 text-center transition-colors shadow-minimal ${
          isDragging ? 'border-coral bg-coral-subtle' : 'border-stone hover:border-olive'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          onChange={(e) => e.target.files && e.target.files[0] && handleFileChange(e.target.files[0])}
          className="hidden"
        />

        <div className="w-12 h-12 rounded bg-surface border border-stone mx-auto flex items-center justify-center text-botanical mb-3">
          <Upload className="w-5 h-5 text-coral" />
        </div>

        <h3 className="font-heading font-bold text-sm text-botanical mb-1">
          Or Upload Local Video File
        </h3>
        <p className="text-xs text-olive max-w-md mx-auto mb-4">
          Drag and drop your MP4, WebM, or MOV file here, or click browse.
          100% processed directly inside your browser with zero cloud uploads.
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-5 py-2.5 bg-coral text-white text-xs font-semibold rounded hover:bg-coral-hover transition-colors shadow-minimal inline-flex items-center space-x-2"
        >
          <FileVideo className="w-4 h-4" />
          <span>Browse Video File</span>
        </button>
      </div>
    </div>
  );
};
