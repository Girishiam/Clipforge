import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  HardDrive, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle,
  FileCode
} from 'lucide-react';
import { ExportPreset, Project } from '../types';
import { getStorageEstimate, exportProjectManifest, importProjectManifest } from '../services/storage';

interface SettingsViewProps {
  defaultPreset: ExportPreset;
  onPresetChange: (preset: ExportPreset) => void;
  currentProject: Project;
  onProjectImport: (project: Project) => void;
  onClearStorage: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  defaultPreset,
  onPresetChange,
  currentProject,
  onProjectImport,
  onClearStorage,
}) => {
  const [storageInfo, setStorageInfo] = useState({ usedBytes: 0, totalBytes: 0, percentage: 0 });
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, []);

  const handleExportManifest = () => {
    const json = exportProjectManifest(currentProject);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.toLowerCase().replace(/\s+/g, '_')}_manifest.clipforge.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportManifest = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const project = importProjectManifest(text);
        onProjectImport(project);
        setImportStatus('Project manifest imported successfully!');
      } catch (err: any) {
        setImportStatus(`Import error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-card border border-stone rounded-md p-6 shadow-minimal">
        <h2 className="font-heading font-bold text-base text-botanical">
          Settings & Local Storage System
        </h2>
        <p className="text-xs text-olive">
          Configure default export profiles, privacy sanitization, and browser database persistence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metadata Cleaner Policy */}
        <div className="bg-surface-card border border-stone rounded-md p-5 shadow-minimal space-y-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-forest" />
            <h3 className="font-heading font-bold text-sm text-botanical">
              Metadata Cleaner Rules
            </h3>
          </div>
          <p className="text-xs text-olive">
            When enabled, ClipForge creates clean output streams stripped of personal device signatures.
          </p>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={defaultPreset.cleanMetadata}
                onChange={(e) =>
                  onPresetChange({ ...defaultPreset, cleanMetadata: e.target.checked })
                }
                className="w-4 h-4 accent-coral mt-0.5 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-botanical block">
                  Strip Metadata on All Exports (Recommended)
                </span>
                <span className="text-[11px] text-olive block">
                  Removes GPS coordinates, device serials, author names, software identifiers, and camera make.
                </span>
              </div>
            </label>

            <div className="p-3 bg-surface border border-stone rounded text-[11px] font-mono text-olive space-y-1">
              <div>✓ Omit EXIF & quicktime metadata atoms</div>
              <div>✓ Sanitize creation & modification timestamps</div>
              <div>✓ Exclude chapter attachments & vendor metadata</div>
              <div>✓ Preserve essential video & audio stream tracks</div>
            </div>
          </div>
        </div>

        {/* Storage Management */}
        <div className="bg-surface-card border border-stone rounded-md p-5 shadow-minimal space-y-4">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-coral" />
            <h3 className="font-heading font-bold text-sm text-botanical">
              IndexedDB Storage Quota
            </h3>
          </div>
          <p className="text-xs text-olive">
            ClipForge operates 100% locally using HTML5 client-side storage with zero telemetry.
          </p>

          <div className="p-3 bg-ivory border border-stone rounded space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-olive">Allocated Storage:</span>
              <span className="font-bold text-botanical">
                {formatMb(storageInfo.usedBytes)} MB / {formatMb(storageInfo.totalBytes)} MB
              </span>
            </div>
            <div className="w-full bg-stone h-2 rounded-full overflow-hidden">
              <div
                className="bg-forest h-full"
                style={{ width: `${Math.max(3, storageInfo.percentage)}%` }}
              />
            </div>
          </div>

          <button
            onClick={onClearStorage}
            className="w-full py-2 bg-white hover:bg-crimson-subtle border border-crimson/30 text-crimson rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Cached Clips & Reset Storage</span>
          </button>
        </div>

        {/* Project Manifest Backup / Restore */}
        <div className="bg-surface-card border border-stone rounded-md p-5 shadow-minimal space-y-4 md:col-span-2">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-botanical" />
            <h3 className="font-heading font-bold text-sm text-botanical">
              Project Manifest Backup & Relinking
            </h3>
          </div>
          <p className="text-xs text-olive">
            Export a portable JSON manifest containing all source metadata and exact timeframe definitions.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportManifest}
              className="px-4 py-2 bg-botanical text-white hover:bg-botanical-light rounded text-xs font-semibold flex items-center space-x-1.5 shadow-minimal"
            >
              <Download className="w-3.5 h-3.5 text-lime" />
              <span>Export Project Manifest (.json)</span>
            </button>

            <label className="px-4 py-2 bg-surface hover:bg-stone text-botanical border border-stone rounded text-xs font-medium flex items-center space-x-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Manifest</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportManifest}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <div className="p-3 bg-lime-subtle border border-lime text-botanical rounded text-xs font-mono flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-forest" />
              <span>{importStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
