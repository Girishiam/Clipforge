import React, { useState } from 'react';
import { 
  Play, 
  Copy, 
  Trash2, 
  Download, 
  Edit2, 
  ArrowUpDown, 
  Search, 
  Plus, 
  FileSpreadsheet,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { ClipRange } from '../types';
import { formatTimestamp } from '../utils/timecode';

interface ClipCollectionTableProps {
  clips: ClipRange[];
  sourceTitle: string;
  onClipsChange: (clips: ClipRange[]) => void;
  onPreviewClip: (clip: ClipRange) => void;
  onExportClip: (clip: ClipRange) => void;
  onBulkExport: (clips: ClipRange[]) => void;
  onOpenBulkModal: () => void;
  onExportCSV: () => void;
}

export const ClipCollectionTable: React.FC<ClipCollectionTableProps> = ({
  clips,
  sourceTitle,
  onClipsChange,
  onPreviewClip,
  onExportClip,
  onBulkExport,
  onOpenBulkModal,
  onExportCSV,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'timestamp' | 'duration' | 'name'>('timestamp');
  const [sortAsc, setSortAsc] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Filtering
  const filteredClips = clips.filter((clip) =>
    clip.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sorting
  const sortedClips = [...filteredClips].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'timestamp') {
      cmp = a.start - b.start;
    } else if (sortField === 'duration') {
      cmp = a.duration - b.duration;
    } else if (sortField === 'name') {
      cmp = a.name.localeCompare(b.name);
    }
    return sortAsc ? cmp : -cmp;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedClips.length && sortedClips.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedClips.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDuplicate = (clip: ClipRange) => {
    const newClip: ClipRange = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${clip.name} (Copy)`,
    };
    onClipsChange([...clips, newClip]);
  };

  const handleDeleteOne = (id: string) => {
    onClipsChange(clips.filter((c) => c.id !== id));
    if (selectedIds.has(id)) {
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
    }
  };

  const handleBulkDelete = () => {
    onClipsChange(clips.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
  };

  const handleBulkExportSelected = () => {
    const toExport = clips.filter((c) => selectedIds.has(c.id));
    if (toExport.length > 0) {
      onBulkExport(toExport);
    }
  };

  const handleStartRename = (clip: ClipRange) => {
    setEditingId(clip.id);
    setEditingName(clip.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      onClipsChange(
        clips.map((c) => (c.id === id ? { ...c, name: editingName.trim() } : c))
      );
    }
    setEditingId(null);
  };

  return (
    <div className="bg-surface-card border border-stone rounded-md shadow-minimal overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-4 border-b border-stone flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center space-x-3">
          <div>
            <h3 className="font-heading font-bold text-sm text-botanical">
              Multi-Clip Collection ({clips.length})
            </h3>
            <p className="text-xs text-olive">
              Non-destructive ranges referenced from active media.
            </p>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center space-x-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-olive" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clips..."
              className="pl-8 pr-3 py-1.5 bg-ivory border border-stone rounded text-xs text-botanical w-36 sm:w-48 outline-none"
            />
          </div>

          {/* Bulk Paste Modal Button */}
          <button
            onClick={onOpenBulkModal}
            className="px-3 py-1.5 bg-surface hover:bg-stone text-botanical border border-stone rounded text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title="Paste multiple ranges formatted as text or CSV"
          >
            <Sparkles className="w-3.5 h-3.5 text-coral" />
            <span>Bulk Input...</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={onExportCSV}
            disabled={clips.length === 0}
            className="p-1.5 bg-surface hover:bg-stone text-botanical border border-stone rounded disabled:opacity-40"
            title="Export Clip List to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-forest" />
          </button>
        </div>
      </div>

      {/* Bulk Action Ribbon (Appears when items are checked) */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-coral-subtle border-b border-coral/30 flex items-center justify-between text-xs">
          <span className="font-mono text-botanical font-semibold">
            {selectedIds.size} {selectedIds.size === 1 ? 'clip' : 'clips'} selected
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkExportSelected}
              className="px-3 py-1 bg-coral text-white font-semibold rounded hover:bg-coral-hover flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>Export Selected ({selectedIds.size})</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-white border border-stone text-crimson font-medium rounded hover:bg-crimson-subtle flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-ivory border-b border-stone font-mono text-olive uppercase tracking-wider text-[11px] select-none">
            <tr>
              <th className="py-2.5 px-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center text-botanical"
                >
                  {selectedIds.size === sortedClips.length && sortedClips.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-coral" />
                  ) : (
                    <Square className="w-4 h-4 text-stone" />
                  )}
                </button>
              </th>
              <th className="py-2.5 px-2 w-12 text-center">#</th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => {
                    setSortField('name');
                    setSortAsc(!sortAsc);
                  }}
                  className="flex items-center space-x-1 hover:text-botanical"
                >
                  <span>Clip Label</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => {
                    setSortField('timestamp');
                    setSortAsc(!sortAsc);
                  }}
                  className="flex items-center space-x-1 hover:text-botanical"
                >
                  <span>Start (In)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3">End (Out)</th>
              <th className="py-2.5 px-3">
                <button
                  onClick={() => {
                    setSortField('duration');
                    setSortAsc(!sortAsc);
                  }}
                  className="flex items-center space-x-1 hover:text-botanical"
                >
                  <span>Duration</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone font-mono">
            {sortedClips.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-olive">
                  <p className="font-sans text-xs">No clip timeframes added yet.</p>
                  <p className="text-[11px] text-olive mt-1">
                    Select a range on the timeline above and click "Add Range" or use "Bulk Input...".
                  </p>
                </td>
              </tr>
            ) : (
              sortedClips.map((clip, index) => {
                const isSelected = selectedIds.has(clip.id);
                return (
                  <tr
                    key={clip.id}
                    className={`hover:bg-ivory transition-colors ${
                      isSelected ? 'bg-coral-subtle/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2 px-3">
                      <button
                        onClick={() => toggleSelectOne(clip.id)}
                        className="flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-coral" />
                        ) : (
                          <Square className="w-4 h-4 text-stone" />
                        )}
                      </button>
                    </td>

                    {/* Number */}
                    <td className="py-2 px-2 text-center text-olive text-[11px]">
                      {String(index + 1).padStart(2, '0')}
                    </td>

                    {/* Clip Name */}
                    <td className="py-2 px-3 font-sans font-medium text-botanical">
                      {editingId === clip.id ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(clip.id)}
                            onBlur={() => handleSaveRename(clip.id)}
                            className="bg-white border border-stone px-2 py-0.5 rounded text-xs outline-none"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartRename(clip)}
                          className="flex items-center space-x-1.5 cursor-pointer hover:text-coral group"
                        >
                          <span>{clip.name}</span>
                          <Edit2 className="w-3 h-3 text-stone group-hover:text-olive opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                    </td>

                    {/* Start */}
                    <td className="py-2 px-3 text-botanical">
                      {formatTimestamp(clip.start)}
                    </td>

                    {/* End */}
                    <td className="py-2 px-3 text-botanical">
                      {formatTimestamp(clip.end)}
                    </td>

                    {/* Duration */}
                    <td className="py-2 px-3 font-semibold text-forest">
                      {formatTimestamp(clip.duration)}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onPreviewClip(clip)}
                          className="p-1.5 text-botanical hover:bg-surface border border-stone rounded"
                          title="Preview Clip"
                        >
                          <Play className="w-3 h-3 text-coral fill-coral" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(clip)}
                          className="p-1.5 text-olive hover:text-botanical hover:bg-surface border border-stone rounded"
                          title="Duplicate Timeframe"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onExportClip(clip)}
                          className="p-1.5 text-coral hover:bg-coral-subtle border border-coral/40 rounded font-semibold"
                          title="Export This Clip"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteOne(clip.id)}
                          className="p-1.5 text-olive hover:text-crimson hover:bg-crimson-subtle border border-stone rounded"
                          title="Remove Timeframe"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
