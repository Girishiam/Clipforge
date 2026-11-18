import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Download, 
  Clock, 
  Crosshair, 
  Check, 
  AlertTriangle,
  Repeat
} from 'lucide-react';
import { formatTimestamp, parseTimestamp, validateTimeframe, ValidationResult } from '../utils/timecode';

interface TimeframeControlsProps {
  startTime: number;
  endTime: number;
  duration: number;
  currentTime: number;
  isLooping: boolean;
  onRangeChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
  onPreviewSelection: () => void;
  onToggleLoop: () => void;
  onAddClip: (name: string) => void;
  onQuickExport: () => void;
}

type PresetAnchor = 'start-at-playhead' | 'center-playhead' | 'end-at-playhead';

export const TimeframeControls: React.FC<TimeframeControlsProps> = ({
  startTime,
  endTime,
  duration,
  currentTime,
  isLooping,
  onRangeChange,
  onSeek,
  onPreviewSelection,
  onToggleLoop,
  onAddClip,
  onQuickExport,
}) => {
  const [startInput, setStartInput] = useState(formatTimestamp(startTime));
  const [endInput, setEndInput] = useState(formatTimestamp(endTime));
  const [clipName, setClipName] = useState('Highlight Clip');
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [presetAnchor, setPresetAnchor] = useState<PresetAnchor>('start-at-playhead');

  // Keep text inputs synchronized when timeline handles or seek changes external start/end
  useEffect(() => {
    setStartInput(formatTimestamp(startTime));
    setEndInput(formatTimestamp(endTime));
    setValidation(validateTimeframe(startTime, endTime, duration));
  }, [startTime, endTime, duration]);

  const handleApplyStart = (newStartStr: string) => {
    setStartInput(newStartStr);
    const parsed = parseTimestamp(newStartStr);
    if (parsed !== null) {
      const v = validateTimeframe(parsed, endTime, duration);
      setValidation(v);
      if (v.isValid) {
        onRangeChange(parsed, endTime);
      }
    } else {
      setValidation({ isValid: false, error: 'Invalid start timestamp format (use HH:MM:SS.mmm).' });
    }
  };

  const handleApplyEnd = (newEndStr: string) => {
    setEndInput(newEndStr);
    const parsed = parseTimestamp(newEndStr);
    if (parsed !== null) {
      const v = validateTimeframe(startTime, parsed, duration);
      setValidation(v);
      if (v.isValid) {
        onRangeChange(startTime, parsed);
      }
    } else {
      setValidation({ isValid: false, error: 'Invalid end timestamp format (use HH:MM:SS.mmm).' });
    }
  };

  // Steppers for precision adjustments
  const adjustStart = (deltaSeconds: number) => {
    const newStart = Math.max(0, startTime + deltaSeconds);
    const v = validateTimeframe(newStart, endTime, duration);
    if (v.isValid) {
      onRangeChange(newStart, endTime);
    }
  };

  const adjustEnd = (deltaSeconds: number) => {
    const newEnd = Math.min(duration || Infinity, endTime + deltaSeconds);
    const v = validateTimeframe(startTime, newEnd, duration);
    if (v.isValid) {
      onRangeChange(startTime, newEnd);
    }
  };

  // Set from current playhead
  const setStartToPlayhead = () => {
    const v = validateTimeframe(currentTime, endTime, duration);
    if (v.isValid) {
      onRangeChange(currentTime, endTime);
    } else {
      // If current playhead is past end, move end forward too
      const safeEnd = Math.min(duration, currentTime + 5);
      onRangeChange(currentTime, safeEnd);
    }
  };

  const setEndToPlayhead = () => {
    const v = validateTimeframe(startTime, currentTime, duration);
    if (v.isValid) {
      onRangeChange(startTime, currentTime);
    } else {
      // If current playhead is before start, adjust start backward
      const safeStart = Math.max(0, currentTime - 5);
      onRangeChange(safeStart, currentTime);
    }
  };

  // Quick Duration Presets
  const presets: { label: string; seconds: number }[] = [
    { label: '5s', seconds: 5 },
    { label: '10s', seconds: 10 },
    { label: '15s', seconds: 15 },
    { label: '30s', seconds: 30 },
    { label: '45s', seconds: 45 },
    { label: '60s', seconds: 60 },
    { label: '90s', seconds: 90 },
    { label: '3m', seconds: 180 },
    { label: '5m', seconds: 300 },
  ];

  const applyPresetDuration = (presetSecs: number) => {
    let s = startTime;
    let e = startTime + presetSecs;

    if (presetAnchor === 'start-at-playhead') {
      s = currentTime;
      e = currentTime + presetSecs;
    } else if (presetAnchor === 'center-playhead') {
      s = Math.max(0, currentTime - presetSecs / 2);
      e = s + presetSecs;
    } else if (presetAnchor === 'end-at-playhead') {
      e = currentTime;
      s = Math.max(0, currentTime - presetSecs);
    }

    if (duration > 0 && e > duration) {
      e = duration;
      s = Math.max(0, e - presetSecs);
    }

    onRangeChange(s, e);
  };

  const clipDuration = Math.max(0, endTime - startTime);

  return (
    <div className="bg-surface-card border border-stone rounded-md p-6 space-y-6 shadow-minimal">
      {/* Top Banner: Large Timeframe Inputs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading font-bold text-sm text-botanical uppercase tracking-wider">
              Exact Timeframe Boundaries
            </h3>
            <p className="text-xs text-olive">
              Frame-accurate millisecond boundaries. Direct typing, steppers, or playhead alignment.
            </p>
          </div>

          {/* Dynamic Clip Duration Pill */}
          <div className="flex items-center space-x-2 bg-lime-subtle border border-lime text-botanical px-3 py-1.5 rounded">
            <Clock className="w-4 h-4 text-botanical" />
            <span className="text-xs uppercase font-mono tracking-wider font-semibold">Clip Duration:</span>
            <span className="font-mono text-sm font-bold text-botanical">
              {formatTimestamp(clipDuration, true)}
            </span>
          </div>
        </div>

        {/* The Two Prominent Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* START TIME FIELD */}
          <div className="p-4 bg-ivory border border-stone rounded">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-botanical flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-coral inline-block" />
                <span>START TIME (IN POINT)</span>
              </label>
              <button
                onClick={setStartToPlayhead}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface hover:bg-stone text-botanical border border-stone flex items-center space-x-1"
                title="Set Start from Current Playhead"
              >
                <Crosshair className="w-3 h-3 text-coral" />
                <span>Set to Playhead</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={startInput}
                onChange={(e) => handleApplyStart(e.target.value)}
                onBlur={() => setStartInput(formatTimestamp(startTime))}
                className="flex-1 px-3 py-2 bg-white border border-stone rounded font-mono font-bold text-base text-botanical tracking-wider"
                placeholder="00:00:00.000"
              />
              {/* Steppers */}
              <div className="flex flex-col space-y-1">
                <div className="flex space-x-1">
                  <button
                    onClick={() => adjustStart(-1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="-1 second"
                  >
                    -1s
                  </button>
                  <button
                    onClick={() => adjustStart(-0.1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="-100ms"
                  >
                    -100m
                  </button>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => adjustStart(0.1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="+100ms"
                  >
                    +100m
                  </button>
                  <button
                    onClick={() => adjustStart(1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="+1 second"
                  >
                    +1s
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center text-[11px] font-mono text-olive">
              <span>Format: HH:MM:SS.mmm</span>
              <button
                onClick={() => onSeek(startTime)}
                className="text-coral hover:underline"
              >
                Jump to Start
              </button>
            </div>
          </div>

          {/* END TIME FIELD */}
          <div className="p-4 bg-ivory border border-stone rounded">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-botanical flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-coral inline-block" />
                <span>END TIME (OUT POINT)</span>
              </label>
              <button
                onClick={setEndToPlayhead}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface hover:bg-stone text-botanical border border-stone flex items-center space-x-1"
                title="Set End from Current Playhead"
              >
                <Crosshair className="w-3 h-3 text-coral" />
                <span>Set to Playhead</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={endInput}
                onChange={(e) => handleApplyEnd(e.target.value)}
                onBlur={() => setEndInput(formatTimestamp(endTime))}
                className="flex-1 px-3 py-2 bg-white border border-stone rounded font-mono font-bold text-base text-botanical tracking-wider"
                placeholder="00:00:00.000"
              />
              {/* Steppers */}
              <div className="flex flex-col space-y-1">
                <div className="flex space-x-1">
                  <button
                    onClick={() => adjustEnd(-1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="-1 second"
                  >
                    -1s
                  </button>
                  <button
                    onClick={() => adjustEnd(-0.1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="-100ms"
                  >
                    -100m
                  </button>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => adjustEnd(0.1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="+100ms"
                  >
                    +100m
                  </button>
                  <button
                    onClick={() => adjustEnd(1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="+1 second"
                  >
                    +1s
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-between items-center text-[11px] font-mono text-olive">
              <span>Format: HH:MM:SS.mmm</span>
              <button
                onClick={() => onSeek(endTime)}
                className="text-coral hover:underline"
              >
                Jump to End
              </button>
            </div>
          </div>
        </div>

        {/* Validation Error Message */}
        {!validation.isValid && (
          <div className="mt-3 p-3 bg-crimson-subtle border border-crimson text-crimson rounded text-xs flex items-center space-x-2 font-mono">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{validation.error}</span>
          </div>
        )}
      </div>

      {/* Quick Duration Presets & Alignment */}
      <div className="pt-2 border-t border-stone">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-mono uppercase tracking-wider text-olive font-semibold">
            One-Click Duration Presets:
          </span>

          {/* Anchor mode selector */}
          <div className="flex items-center space-x-1 text-[11px] font-mono">
            <span className="text-olive mr-1">Anchor:</span>
            <button
              onClick={() => setPresetAnchor('start-at-playhead')}
              className={`px-2 py-0.5 rounded border ${
                presetAnchor === 'start-at-playhead'
                  ? 'bg-botanical text-white border-botanical font-semibold'
                  : 'bg-surface text-botanical border-stone hover:bg-stone'
              }`}
            >
              Start @ Playhead
            </button>
            <button
              onClick={() => setPresetAnchor('center-playhead')}
              className={`px-2 py-0.5 rounded border ${
                presetAnchor === 'center-playhead'
                  ? 'bg-botanical text-white border-botanical font-semibold'
                  : 'bg-surface text-botanical border-stone hover:bg-stone'
              }`}
            >
              Center @ Playhead
            </button>
            <button
              onClick={() => setPresetAnchor('end-at-playhead')}
              className={`px-2 py-0.5 rounded border ${
                presetAnchor === 'end-at-playhead'
                  ? 'bg-botanical text-white border-botanical font-semibold'
                  : 'bg-surface text-botanical border-stone hover:bg-stone'
              }`}
            >
              End @ Playhead
            </button>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const isMatch = Math.abs(clipDuration - preset.seconds) < 0.05;
            return (
              <button
                key={preset.label}
                onClick={() => applyPresetDuration(preset.seconds)}
                className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
                  isMatch
                    ? 'bg-lime text-botanical border-lime-dark font-bold'
                    : 'bg-surface hover:bg-stone border-stone text-botanical'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Toolbar: Preview, Loop, Add to Workspace, Quick Export */}
      <div className="pt-4 border-t border-stone flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onPreviewSelection}
            className="px-3.5 py-2 bg-surface hover:bg-stone border border-stone text-botanical text-xs font-medium rounded flex items-center space-x-1.5 shadow-minimal"
          >
            <Play className="w-3.5 h-3.5 text-coral fill-coral" />
            <span>Preview Selection</span>
          </button>

          <button
            onClick={onToggleLoop}
            className={`px-3 py-2 border rounded text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              isLooping
                ? 'bg-lime border-lime-dark text-botanical font-semibold'
                : 'bg-surface hover:bg-stone border-stone text-botanical'
            }`}
            title="Loop playback within selected timeframe"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{isLooping ? 'Loop: ON' : 'Loop'}</span>
          </button>
        </div>

        {/* Clip Name & Save / Export */}
        <div className="flex items-center space-x-2 flex-1 max-w-md justify-end">
          <input
            type="text"
            value={clipName}
            onChange={(e) => setClipName(e.target.value)}
            placeholder="Clip Label..."
            className="px-3 py-2 bg-ivory border border-stone rounded text-xs text-botanical w-40 focus:w-48 transition-all"
          />

          <button
            onClick={() => {
              if (validation.isValid) {
                onAddClip(clipName);
              }
            }}
            disabled={!validation.isValid}
            className={`px-3.5 py-2 text-xs font-semibold rounded flex items-center space-x-1.5 transition-colors ${
              validation.isValid
                ? 'bg-botanical text-white hover:bg-botanical-light'
                : 'bg-stone text-olive cursor-not-allowed'
            }`}
            title="Save range to Multi-Clip collection"
          >
            <Plus className="w-3.5 h-3.5 text-lime" />
            <span>Add Range</span>
          </button>

          <button
            onClick={onQuickExport}
            disabled={!validation.isValid}
            className={`px-4 py-2 text-xs font-semibold rounded flex items-center space-x-1.5 shadow-minimal transition-colors ${
              validation.isValid
                ? 'bg-coral text-white hover:bg-coral-hover'
                : 'bg-stone text-olive cursor-not-allowed'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Clip</span>
          </button>
        </div>
      </div>
    </div>
  );
};
