import React, { useState } from 'react';
import { 
  Layers, 
  Video, 
  Settings2, 
  Download, 
  CheckCircle, 
  Clock, 
  Trash2,
  FileCheck
} from 'lucide-react';
import { ClipSource, ClipRange, ExportPreset } from '../types';
import { formatTimestamp } from '../utils/timecode';

interface BatchClipperViewProps {
  sources: ClipSource[];
  clipsMap: Record<string, ClipRange[]>;
  currentPreset: ExportPreset;
  onPresetChange: (preset: ExportPreset) => void;
  onDispatchBatch: (selectedSourceIds: string[], preset: ExportPreset, namingPattern: string) => void;
  onRemoveSource: (sourceId: string) => void;
}

export const BatchClipperView: React.FC<BatchClipperViewProps> = ({
  sources,
  clipsMap,
  currentPreset,
  onPresetChange,
  onDispatchBatch,
  onRemoveSource,
}) => {
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(
    new Set(sources.map((s) => s.id))
  );
  const [namingPattern, setNamingPattern] = useState('{source}_{clip}_{num}');

  const totalClips = Array.from(selectedSourceIds).reduce((acc, sid) => {
    return acc + (clipsMap[sid]?.length || 0);
  }, 0);

  const toggleSourceSelection = (id: string) => {
    const next = new Set(selectedSourceIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSourceIds(next);
  };

  const handleStartBatch = () => {
    if (totalClips === 0) return;
    onDispatchBatch(Array.from(selectedSourceIds), currentPreset, namingPattern);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-card border border-stone rounded-md p-6 shadow-minimal flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-base text-botanical">
            Batch Processor & Multi-Source Dispatcher
          </h2>
          <p className="text-xs text-olive">
            Queue and export multiple clips across multiple sources in one synchronized batch.
          </p>
        </div>

        <button
          onClick={handleStartBatch}
          disabled={totalClips === 0}
          className={`px-5 py-2.5 text-xs font-semibold rounded flex items-center space-x-2 transition-colors shadow-minimal ${
            totalClips > 0
              ? 'bg-coral text-white hover:bg-coral-hover'
              : 'bg-stone text-olive cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Dispatch Batch ({totalClips} Clips)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sources & Clip List (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface-card border border-stone rounded-md p-5 shadow-minimal space-y-4">
            <h3 className="font-heading font-bold text-sm text-botanical">
              Active Project Sources ({sources.length})
            </h3>

            {sources.length === 0 ? (
              <div className="text-center py-8 text-olive text-xs">
                No sources loaded in this project. Ingest video files from the Home or Quick Clipper tab.
              </div>
            ) : (
              sources.map((src) => {
                const srcClips = clipsMap[src.id] || [];
                const isSelected = selectedSourceIds.has(src.id);

                return (
                  <div
                    key={src.id}
                    className={`p-4 rounded border transition-colors ${
                      isSelected
                        ? 'bg-white border-coral'
                        : 'bg-surface border-stone opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSourceSelection(src.id)}
                          className="accent-coral w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="font-heading font-bold text-sm text-botanical flex items-center space-x-2">
                            <span>{src.title}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-stone text-olive uppercase">
                              {src.platform}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-olive mt-0.5">
                            Duration: {formatTimestamp(src.duration, false)} • {srcClips.length} Defined Clip Timeframes
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveSource(src.id)}
                        className="p-1.5 text-olive hover:text-crimson hover:bg-crimson-subtle rounded border border-transparent hover:border-stone"
                        title="Remove Source"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Clip summary preview */}
                    {srcClips.length > 0 && isSelected && (
                      <div className="mt-3 pt-3 border-t border-stone flex flex-wrap gap-1.5">
                        {srcClips.map((clip) => (
                          <span
                            key={clip.id}
                            className="px-2 py-0.5 bg-ivory border border-stone rounded font-mono text-[11px] text-botanical"
                          >
                            {clip.name}: {formatTimestamp(clip.duration)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Batch Export Preset Settings (1 column) */}
        <div className="space-y-4">
          <div className="bg-surface-card border border-stone rounded-md p-5 shadow-minimal space-y-4">
            <h3 className="font-heading font-bold text-sm text-botanical flex items-center space-x-2">
              <Settings2 className="w-4 h-4 text-coral" />
              <span>Batch Output Preset</span>
            </h3>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-olive font-semibold">
                Aspect Ratio:
              </label>
              <select
                value={currentPreset.aspectRatio}
                onChange={(e) =>
                  onPresetChange({
                    ...currentPreset,
                    aspectRatio: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 bg-ivory border border-stone rounded text-xs font-mono text-botanical outline-none"
              >
                <option value="original">Original Aspect Ratio</option>
                <option value="9:16">9:16 (Shorts / Reels / TikTok)</option>
                <option value="16:9">16:9 (Horizontal Widescreen)</option>
                <option value="1:1">1:1 (Square Feed Post)</option>
                <option value="4:5">4:5 (Portrait Feed Post)</option>
              </select>
            </div>

            {/* Fit Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-olive font-semibold">
                Framing & Fit Mode:
              </label>
              <select
                value={currentPreset.fitMode}
                onChange={(e) =>
                  onPresetChange({
                    ...currentPreset,
                    fitMode: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 bg-ivory border border-stone rounded text-xs font-mono text-botanical outline-none"
              >
                <option value="crop">Crop to Fill (No letterboxing)</option>
                <option value="contain">Fit with Padding (Pillarbox/Letterbox)</option>
                <option value="original">Original Untouched</option>
              </select>
            </div>

            {/* Format & Engine */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-olive font-semibold">
                  Format:
                </label>
                <select
                  value={currentPreset.format}
                  onChange={(e) =>
                    onPresetChange({
                      ...currentPreset,
                      format: e.target.value as any,
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-ivory border border-stone rounded text-xs font-mono text-botanical outline-none"
                >
                  <option value="mp4">MP4 (H.264)</option>
                  <option value="webm">WebM (VP9)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-olive font-semibold">
                  Engine:
                </label>
                <select
                  value={currentPreset.engine}
                  onChange={(e) =>
                    onPresetChange({
                      ...currentPreset,
                      engine: e.target.value as any,
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-ivory border border-stone rounded text-xs font-mono text-botanical outline-none"
                >
                  <option value="precise">Precise (Frame-Exact)</option>
                  <option value="fast">Fast (Keyframe)</option>
                </select>
              </div>
            </div>

            {/* Metadata Sanitization Switch */}
            <div className="pt-2 border-t border-stone flex items-center justify-between">
              <div>
                <span className="font-heading font-semibold text-xs text-botanical block">
                  Strip Metadata
                </span>
                <span className="text-[11px] text-olive block">
                  Remove GPS, author & device tags
                </span>
              </div>
              <input
                type="checkbox"
                checked={currentPreset.cleanMetadata}
                onChange={(e) =>
                  onPresetChange({
                    ...currentPreset,
                    cleanMetadata: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-coral cursor-pointer"
              />
            </div>

            {/* Output Naming Pattern */}
            <div className="space-y-1.5 pt-2 border-t border-stone">
              <label className="text-xs font-mono uppercase tracking-wider text-olive font-semibold">
                File Naming Scheme:
              </label>
              <input
                type="text"
                value={namingPattern}
                onChange={(e) => setNamingPattern(e.target.value)}
                className="w-full px-3 py-1.5 bg-ivory border border-stone rounded font-mono text-xs text-botanical outline-none"
              />
              <p className="text-[10px] font-mono text-olive">
                Tags: <code>{'{source}'}</code>, <code>{'{clip}'}</code>, <code>{'{num}'}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
