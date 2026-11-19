import React, { useState, useRef } from 'react';
import { 
  X, 
  Copy, 
  ExternalLink, 
  Check, 
  Download,
  Upload,
  Scissors,
  FileVideo,
  Info,
  Terminal
} from 'lucide-react';
import { ClipSource, ClipRange } from '../types';
import { formatTimestamp } from '../utils/timecode';

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
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const firstClip = clips[0] || { start: 0, end: 10, duration: 10, name: 'Clip 1' };
  const shareTimestampLink = source.originalUrl
    ? `${source.originalUrl.split('&t=')[0].split('?t=')[0]}${source.originalUrl.includes('?') ? '&' : '?'}t=${Math.floor(firstClip.start)}s`
    : source.url;

  const startStr = formatTimestamp(firstClip.start, false);
  const endStr = formatTimestamp(firstClip.end, false);
  const ytdlpCommand = `yt-dlp --download-sections "*${startStr}-${endStr}" "${source.originalUrl || source.url}" -o "%(title)s_clip.%(ext)s"`;

  const generateEditorInstructions = () => {
    let text = `# CLIPFORGE EDITORIAL TIMEFRAME PLAN\n`;
    text += `Source: ${source.title}\n`;
    text += `Original Link: ${source.url}\n`;
    text += `Total Clips Planned: ${clips.length}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n\n`;
    text += `------------------------------------------------------\n`;

    clips.forEach((clip, index) => {
      text += `CLIP #${String(index + 1).padStart(2, '0')}: ${clip.name}\n`;
      text += `Start:    ${formatTimestamp(clip.start)}\n`;
      text += `End:      ${formatTimestamp(clip.end)}\n`;
      text += `Duration: ${formatTimestamp(clip.duration)}\n`;

      if (source.platform === 'youtube' && source.originalUrl) {
        const cleanBase = source.originalUrl.split('&t=')[0].split('?t=')[0];
        const separator = cleanBase.includes('?') ? '&' : '?';
        const startSec = Math.floor(clip.start);
        text += `Link:     ${cleanBase}${separator}t=${startSec}s\n`;
      }
      text += `\n`;
    });

    return text;
  };

  const instructionsText = generateEditorInstructions();

  const handleCopy = () => {
    navigator.clipboard.writeText(instructionsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareTimestampLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(ytdlpCommand);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onMediaFileLinked) {
      onMediaFileLinked(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-botanical/60 backdrop-blur-none">
      <div className="bg-surface-card border border-stone rounded-md shadow-hover w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-coral-subtle rounded border border-coral/30">
              <Scissors className="w-4 h-4 text-coral" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-botanical">
                Export Timeframe Cut
              </h3>
              <p className="text-xs text-olive">
                Exact Range: {formatTimestamp(firstClip.start)} to {formatTimestamp(firstClip.end)} ({formatTimestamp(firstClip.duration)})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-olive hover:text-botanical hover:bg-surface rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Option 1: Direct File Cut Ingest */}
          <div className="p-4 bg-ivory border-2 border-dashed border-coral/40 rounded-md text-center space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-coral-subtle text-coral mx-auto flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-botanical">
                Select or Drop Video File to Cut Now
              </h4>
              <p className="text-xs text-olive max-w-sm mx-auto mt-0.5">
                Drop your downloaded video file here. ClipForge will cut the exact timeframe ({formatTimestamp(firstClip.start)} to {formatTimestamp(firstClip.end)}) and export your MP4 immediately.
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-coral text-white hover:bg-coral-hover rounded text-xs font-semibold shadow-minimal inline-flex items-center space-x-1.5"
            >
              <FileVideo className="w-4 h-4" />
              <span>Select File to Export Clip</span>
            </button>
          </div>

          {/* Quick Helper Links */}
          <div className="p-3.5 bg-surface border border-stone rounded-md text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-botanical">Need to download the source video?</span>
              <a
                href={source.originalUrl || source.url}
                target="_blank"
                rel="noreferrer"
                className="text-coral hover:underline flex items-center space-x-1 font-medium"
              >
                <span>Open YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-olive leading-relaxed">
              Due to browser security policies, raw YouTube stream bytes are protected by YouTube servers. Download the MP4 file, then click above to cut and download your exact clip with millisecond precision!
            </p>
          </div>

          {/* Option 2: 1-Click Terminal Command (yt-dlp) */}
          <div className="space-y-1.5 pt-2 border-t border-stone">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-olive font-semibold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-coral" />
                <span>1-Click Terminal Command (yt-dlp):</span>
              </span>
              <button
                onClick={handleCopyCommand}
                className="px-2.5 py-1 bg-surface hover:bg-stone border border-stone text-botanical rounded text-xs font-mono flex items-center space-x-1"
              >
                {copiedCommand ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCommand ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-botanical rounded text-ivory font-mono text-[11px] overflow-x-auto select-all">
              {ytdlpCommand}
            </div>
            <p className="text-[10px] text-olive font-mono">
              Downloads and cuts the exact segment directly from your terminal with zero loss.
            </p>
          </div>

          {/* Option 3: Shareable Timestamp Link & Instructions */}
          <div className="space-y-2 pt-2 border-t border-stone">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-olive font-semibold">
                Direct Timestamp Link:
              </span>
              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 bg-surface hover:bg-stone border border-stone text-botanical rounded text-xs font-mono flex items-center space-x-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
              </button>
            </div>
            <input
              type="text"
              readOnly
              value={shareTimestampLink}
              className="w-full px-2.5 py-1.5 bg-ivory border border-stone rounded font-mono text-xs text-botanical outline-none"
            />
          </div>

          {/* Formatted Instructions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-olive font-semibold">
                Editor Instructions:
              </span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-surface hover:bg-stone border border-stone text-botanical rounded text-xs font-mono flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-forest" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Text' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              readOnly
              value={instructionsText}
              rows={4}
              className="w-full p-2.5 bg-ivory border border-stone rounded font-mono text-[11px] text-botanical leading-relaxed outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-stone bg-ivory flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-stone text-botanical rounded text-xs font-medium hover:bg-surface"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
