import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Upload, 
  FileText, 
  Plus, 
  RefreshCw 
} from 'lucide-react';
import { parseBulkTimeframes, BulkParseResult } from '../utils/timecode';
import { ClipRange } from '../types';

interface BulkTimeframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxDuration?: number;
  onAddClips: (clips: ClipRange[], mode: 'append' | 'replace') => void;
}

const SAMPLE_BULK_INPUT = `00:00:15.000 - 00:00:45.000, Intro Hook & Context
00:01:10 - 00:01:50, Key Architecture Breakdown
00:02:25.500 - 00:03:00.000, Live Demonstration
00:03:40 - 00:04:15, Summary Takeaways`;

export const BulkTimeframeModal: React.FC<BulkTimeframeModalProps> = ({
  isOpen,
  onClose,
  maxDuration,
  onAddClips,
}) => {
  const [inputText, setInputText] = useState(SAMPLE_BULK_INPUT);
  const [parseResult, setParseResult] = useState<BulkParseResult | null>(null);

  if (!isOpen) return null;

  const handleValidate = () => {
    const result = parseBulkTimeframes(inputText, maxDuration);
    setParseResult(result);
  };

  const handleApply = (mode: 'append' | 'replace') => {
    const result = parseResult || parseBulkTimeframes(inputText, maxDuration);
    if (result.validRows.length === 0) return;

    const newClips: ClipRange[] = result.validRows.map((r, idx) => ({
      id: `bulk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      name: r.name,
      start: r.start,
      end: r.end,
      duration: r.duration,
    }));

    onAddClips(newClips, mode);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInputText(text);
        setParseResult(parseBulkTimeframes(text, maxDuration));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-botanical/60 backdrop-blur-none">
      <div className="bg-surface-card border border-stone rounded-md shadow-hover w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-coral-subtle rounded border border-coral/30">
              <FileText className="w-4 h-4 text-coral" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-botanical">
                Bulk Timeframe Parser
              </h3>
              <p className="text-xs text-olive">
                Paste multiple ranges (dash-separated or CSV) with optional labels.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Instructions & File Import */}
          <div className="flex items-center justify-between text-xs text-olive">
            <span>
              Format: <code className="font-mono bg-surface px-1 py-0.5 rounded text-botanical">HH:MM:SS - HH:MM:SS, Name</code> or CSV
            </span>
            <label className="cursor-pointer flex items-center space-x-1 text-coral hover:underline font-medium">
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV File</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Text Area */}
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setParseResult(null); // Reset until re-validated
            }}
            rows={7}
            placeholder={`00:01:20 - 00:01:55\n00:04:10 - 00:04:48, Product Hook\n00:09:35 - 00:10:20\n00:14:00 - 00:14:30, Key Takeaway`}
            className="w-full p-3 bg-ivory border border-stone rounded font-mono text-xs text-botanical leading-relaxed focus:bg-white resize-y"
          />

          {/* Validation Status & Detailed Row Analysis */}
          {parseResult && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-surface border border-stone rounded text-xs font-mono">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1 text-forest font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    <span>{parseResult.validRows.length} Valid</span>
                  </span>
                  {parseResult.invalidRows.length > 0 && (
                    <span className="flex items-center space-x-1 text-crimson font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      <span>{parseResult.invalidRows.length} Malformed</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-[11px]">
                  {parseResult.hasDuplicates && (
                    <span className="px-2 py-0.5 bg-crimson-subtle text-crimson rounded border border-crimson/30">
                      Duplicate Ranges Detected
                    </span>
                  )}
                  {parseResult.hasOverlaps && (
                    <span className="px-2 py-0.5 bg-lime-subtle text-botanical rounded border border-lime">
                      Overlapping Ranges Warning
                    </span>
                  )}
                </div>
              </div>

              {/* Invalid Rows Report */}
              {parseResult.invalidRows.length > 0 && (
                <div className="p-3 bg-crimson-subtle border border-crimson/40 rounded text-xs space-y-1">
                  <div className="font-semibold text-crimson font-mono flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Malformed Lines (Will be skipped):</span>
                  </div>
                  {parseResult.invalidRows.map((inv) => (
                    <div key={inv.index} className="text-[11px] font-mono text-crimson flex justify-between">
                      <span>Line {inv.index}: <code className="bg-white/60 px-1 rounded">{inv.rawText}</code></span>
                      <span className="text-botanical">{inv.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone bg-ivory flex items-center justify-between">
          <button
            onClick={handleValidate}
            className="px-4 py-2 bg-surface hover:bg-stone text-botanical border border-stone rounded text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Validate Timeframes</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleApply('replace')}
              disabled={parseResult ? parseResult.validRows.length === 0 : false}
              className="px-3 py-2 bg-white hover:bg-surface text-botanical border border-stone rounded text-xs font-medium"
              title="Replace all existing clips with these parsed clips"
            >
              Replace Existing
            </button>
            <button
              onClick={() => handleApply('append')}
              disabled={parseResult ? parseResult.validRows.length === 0 : false}
              className="px-4 py-2 bg-coral text-white hover:bg-coral-hover rounded text-xs font-semibold flex items-center space-x-1.5 shadow-minimal"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add All Clips</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
