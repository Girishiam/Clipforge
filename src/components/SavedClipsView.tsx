import React, { useState, useEffect } from 'react';
import { 
  FolderCheck, 
  Download, 
  Trash2, 
  Play, 
  X, 
  FileVideo, 
  ShieldCheck, 
  Clock, 
  HardDrive 
} from 'lucide-react';
import { getAllSavedClips, deleteSavedClip } from '../services/storage';
import { formatTimestamp } from '../utils/timecode';

export const SavedClipsView: React.FC = () => {
  const [clips, setClips] = useState<any[]>([]);
  const [activePreviewClip, setActivePreviewClip] = useState<any | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const loadClips = async () => {
    const list = await getAllSavedClips();
    setClips(list);
  };

  useEffect(() => {
    loadClips();
  }, []);

  const handleOpenPreview = (clip: any) => {
    setActivePreviewClip(clip);
    const url = URL.createObjectURL(clip.blob);
    setPreviewBlobUrl(url);
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setActivePreviewClip(null);
    setPreviewBlobUrl(null);
  };

  const handleDownload = (clip: any) => {
    const url = URL.createObjectURL(clip.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clip.clipName.replace(/[^a-z0-9_-]/gi, '_')}.${clip.format || 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this clip from local storage?')) {
      await deleteSavedClip(id);
      loadClips();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-card border border-stone rounded-md p-6 shadow-minimal flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-base text-botanical">
            Saved Clips & Export Archive
          </h2>
          <p className="text-xs text-olive">
            Locally persisted exports stored securely in your browser's IndexedDB.
          </p>
        </div>

        <div className="font-mono text-xs text-olive">
          Total Clips Saved: <span className="font-bold text-botanical">{clips.length}</span>
        </div>
      </div>

      {/* Grid of Saved Clips */}
      {clips.length === 0 ? (
        <div className="bg-surface-card border border-stone rounded-md p-12 text-center text-olive">
          <FolderCheck className="w-8 h-8 text-stone mx-auto mb-2" />
          <p className="font-sans text-xs">No saved exports in local storage.</p>
          <p className="text-[11px] text-olive mt-1">
            Completed exports will be automatically archived here for instant offline playback.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((clip) => {
            const sizeMb = (clip.sizeBytes / (1024 * 1024)).toFixed(2);
            return (
              <div
                key={clip.id}
                className="bg-surface-card border border-stone rounded-md p-4 shadow-minimal hover:border-olive transition-colors flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-stone text-botanical uppercase">
                      {clip.aspectRatio || 'Original'} • {clip.format || 'mp4'}
                    </span>
                    {clip.cleanMetadata && (
                      <span className="flex items-center space-x-0.5 text-[10px] font-mono text-forest">
                        <ShieldCheck className="w-3 h-3 text-forest" />
                        <span>Cleaned</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-sm text-botanical truncate" title={clip.clipName}>
                    {clip.clipName}
                  </h3>
                  <div className="text-[11px] font-mono text-olive truncate" title={clip.sourceTitle}>
                    Source: {clip.sourceTitle}
                  </div>
                </div>

                <div className="space-y-1 text-xs font-mono border-t border-stone pt-2">
                  <div className="flex justify-between text-olive">
                    <span>Duration:</span>
                    <span className="text-botanical font-semibold">{formatTimestamp(clip.duration)}</span>
                  </div>
                  <div className="flex justify-between text-olive">
                    <span>Size:</span>
                    <span className="text-botanical">{sizeMb} MB</span>
                  </div>
                  <div className="flex justify-between text-olive text-[10px]">
                    <span>Saved:</span>
                    <span>{new Date(clip.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone">
                  <button
                    onClick={() => handleOpenPreview(clip)}
                    className="px-2.5 py-1.5 bg-surface hover:bg-stone text-botanical rounded border border-stone text-xs font-medium flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3 text-coral fill-coral" />
                    <span>Play</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleDownload(clip)}
                      className="p-1.5 bg-coral text-white hover:bg-coral-hover rounded shadow-minimal"
                      title="Download Clip"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(clip.id)}
                      className="p-1.5 text-olive hover:text-crimson hover:bg-crimson-subtle rounded border border-stone"
                      title="Delete Clip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Playback Modal */}
      {activePreviewClip && previewBlobUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-botanical/60 backdrop-blur-none">
          <div className="bg-surface-card border border-stone rounded-md shadow-hover w-full max-w-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-stone flex items-center justify-between bg-white">
              <span className="font-heading font-bold text-sm text-botanical">
                {activePreviewClip.clipName}
              </span>
              <button
                onClick={handleClosePreview}
                className="p-1 text-olive hover:text-botanical hover:bg-surface rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black aspect-video flex items-center justify-center">
              <video
                src={previewBlobUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 border-t border-stone bg-ivory flex justify-between items-center text-xs font-mono">
              <span className="text-olive">
                Duration: {formatTimestamp(activePreviewClip.duration)}
              </span>
              <button
                onClick={() => handleDownload(activePreviewClip)}
                className="px-3 py-1.5 bg-coral text-white hover:bg-coral-hover rounded font-semibold flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
