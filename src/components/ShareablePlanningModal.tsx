import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Copy, 
  ExternalLink, 
  Check, 
  Download,
  Upload,
  Scissors,
  FileVideo,
  Radio,
  Sparkles,
  Link2
} from 'lucide-react';
import { ClipSource, ClipRange } from '../types';
import { formatTimestamp } from '../utils/timecode';
import { parseVideoUrl } from '../utils/urlParser';

interface ShareablePlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: ClipSource;
  clips: ClipRange[];
  onMediaFileLinked?: (file: File) => void;
}

export const ShareablePlanningModal: React.FC<ShareablePlanningModalProps> = ({
  isOpen,
  onClose,
  source,
  clips,
  onMediaFileLinked,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(0);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  // Clean up any ongoing recording on unmount or close
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try { recorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  if (!isOpen) return null;

  const firstClip = clips[0] || { start: 0, end: 10, duration: 10, name: 'Active Clip' };
  const clipDuration = Math.max(1, Math.round((firstClip.end - firstClip.start) * 10) / 10);
  const cleanStartSec = Math.floor(firstClip.start);

  const parsedUrl = parseVideoUrl(source.originalUrl || source.url);
  const videoId = parsedUrl.videoId;

  const shareTimestampLink = source.originalUrl
    ? `${source.originalUrl.split('&t=')[0].split('?t=')[0]}${source.originalUrl.includes('?') ? '&' : '?'}t=${cleanStartSec}s`
    : `${source.url}?t=${cleanStartSec}s`;

  // Direct 1-click video downloader link
  const fastDownloadUrl = videoId
    ? `https://www.ssyoutube.com/watch?v=${videoId}`
    : (source.originalUrl || source.url);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareTimestampLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onMediaFileLinked) {
      onMediaFileLinked(file);
      onClose();
    }
  };

  // 1-Click In-Browser Capture: Record exact clip timeframe
  const handleStartRecording = async () => {
    setRecordError(null);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setRecordError("In-browser recording isn't supported in this browser. Use the 1-click MP4 download below.");
        return;
      }

      // Prompt user to pick the tab
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      streamRef.current = stream;

      // When user clicks browser's native "Stop Sharing" button
      stream.getVideoTracks()[0].onended = () => {
        handleStopRecordingEarly();
      };

      // Select supported recording mime type
      const preferredMimes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      let chosenMime = 'video/webm';
      for (const mime of preferredMimes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
          chosenMime = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType: chosenMime });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Clean up tracks
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);

        if (chunks.length > 0) {
          const extension = chosenMime.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: chosenMime });
          const url = URL.createObjectURL(blob);
          const downloadAnchor = document.createElement('a');
          downloadAnchor.href = url;
          const cleanTitle = (source.title || 'Clip')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 24);
          const startTag = formatTimestamp(firstClip.start, false).replace(/:/g, '-');
          const endTag = formatTimestamp(firstClip.end, false).replace(/:/g, '-');
          downloadAnchor.download = `${cleanTitle}_${startTag}_to_${endTag}.${extension}`;
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          onClose();
        }
      };

      // Seek YouTube iframe to clip start and start playback
      try {
        const ytIframe = document.querySelector('#yt-player-target') as HTMLIFrameElement;
        if (ytIframe && ytIframe.contentWindow) {
          const targetOrigin = ytIframe.src ? new URL(ytIframe.src).origin : 'https://www.youtube.com';
          ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [firstClip.start, true] }), targetOrigin);
          ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), targetOrigin);
        }
      } catch {}

      recorder.start(500);
      setIsRecording(true);

      const totalSeconds = Math.max(1, Math.ceil(clipDuration));
      setRecordingSecondsLeft(totalSeconds);
      setRecordingProgress(0);

      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        const left = Math.max(0, totalSeconds - elapsed);
        setRecordingSecondsLeft(left);
        setRecordingProgress(Math.min(100, Math.round((elapsed / totalSeconds) * 100)));

        if (elapsed >= totalSeconds) {
          clearInterval(timerRef.current);
          if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
          }
          // Pause iframe
          try {
            const ytIframe = document.querySelector('#yt-player-target') as HTMLIFrameElement;
            if (ytIframe && ytIframe.contentWindow) {
              const targetOrigin = ytIframe.src ? new URL(ytIframe.src).origin : 'https://www.youtube.com';
              ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), targetOrigin);
            }
          } catch {}
        }
      }, 1000);

    } catch (err: any) {
      console.warn("Screen capture cancelled or unavailable:", err);
      setIsRecording(false);
    }
  };

  const handleStopRecordingEarly = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-botanical/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F2] border border-stone rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone/60 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-coral/10 text-coral flex items-center justify-center border border-coral/20">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-botanical">
                Export Clip
              </h3>
              <p className="text-xs text-olive font-mono mt-0.5">
                {formatTimestamp(firstClip.start, false)} → {formatTimestamp(firstClip.end, false)} <span className="text-stone">({clipDuration}s)</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-olive hover:text-botanical hover:bg-surface rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto">

          {/* Active Recording State */}
          {isRecording ? (
            <div className="p-5 bg-white border-2 border-coral rounded-xl text-center space-y-3 shadow-minimal">
              <div className="flex items-center justify-center space-x-2 text-coral font-bold text-sm">
                <span className="w-3 h-3 rounded-full bg-coral animate-ping" />
                <span>Recording Clip... {recordingSecondsLeft}s left</span>
              </div>
              <div className="w-full bg-stone/40 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-coral h-full transition-all duration-500 rounded-full"
                  style={{ width: `${recordingProgress}%` }}
                />
              </div>
              <p className="text-xs text-olive">
                Capturing playback automatically. It will save to your Downloads folder when finished.
              </p>
              <button
                onClick={handleStopRecordingEarly}
                className="px-4 py-1.5 bg-coral text-white text-xs font-semibold rounded-md hover:bg-coral-hover transition-colors"
              >
                Save Clip Now
              </button>
            </div>
          ) : (
            <>
              {/* Option 1: 1-Click Direct In-Browser Recording */}
              <div className="p-4 bg-white border border-stone/80 rounded-xl space-y-3 hover:border-coral/40 transition-colors shadow-minimal">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-coral uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5" /> 1-Click Clip Capture
                    </span>
                    <h4 className="font-heading font-bold text-sm text-botanical mt-0.5">
                      Record & Download Clip ({clipDuration}s)
                    </h4>
                    <p className="text-xs text-olive mt-1 leading-relaxed">
                      Plays and records your exact {clipDuration}-second segment directly in your browser and saves it straight to your Downloads.
                    </p>
                  </div>
                </div>

                {recordError && (
                  <p className="text-xs text-crimson font-medium bg-crimson/10 p-2 rounded">
                    {recordError}
                  </p>
                )}

                <button
                  onClick={handleStartRecording}
                  className="w-full py-2.5 px-4 bg-coral hover:bg-coral-hover text-white rounded-lg text-xs font-semibold shadow-minimal flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
                >
                  <Radio className="w-4 h-4" />
                  <span>Start Clip Recording ({clipDuration}s)</span>
                </button>
              </div>

              {/* Option 2: 1-Click Video Downloader & File Ingest */}
              <div className="p-4 bg-white border border-stone/80 rounded-xl space-y-3 shadow-minimal">
                <div>
                  <span className="text-[11px] font-bold text-forest uppercase tracking-wide">
                    Source Video
                  </span>
                  <h4 className="font-heading font-bold text-sm text-botanical mt-0.5">
                    Download or Trim Video File
                  </h4>
                  <p className="text-xs text-olive mt-1 leading-relaxed">
                    Grab the full video file to edit losslessly, or drop the downloaded video here to trim right away.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={fastDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 bg-surface hover:bg-white border border-stone text-botanical rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-coral" />
                    <span>Download Full MP4</span>
                    <ExternalLink className="w-3 h-3 text-olive" />
                  </a>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-surface hover:bg-white border border-stone text-botanical rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-forest" />
                    <span>Drop / Choose File to Trim</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Quick Timestamp Link */}
              <div className="p-3 bg-surface/70 border border-stone/60 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-olive truncate mr-2">
                  <Link2 className="w-3.5 h-3.5 text-coral shrink-0" />
                  <span className="truncate">Clip link starts at {formatTimestamp(firstClip.start, false)}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-white hover:bg-stone/30 border border-stone text-botanical rounded text-xs font-medium flex items-center space-x-1 shrink-0 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-stone/60 bg-white flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-surface hover:bg-stone/30 text-botanical rounded-lg text-xs font-medium border border-stone/60 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
