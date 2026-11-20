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
  isEmbed?: boolean;
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
  isEmbed = false,
  onRangeChange,
  onSeek,
  onPreviewSelection,
  onToggleLoop,
  onAddClip,
  onQuickExport,
}) => {
  const [startInput, setStartInput] = useState(formatTimestamp(startTime));
  const [endInput, setEndInput] = useState(formatTimestamp(endTime));
  const [isStartFocused, setIsStartFocused] = useState(false);
  const [isEndFocused, setIsEndFocused] = useState(false);
  const [clipName, setClipName] = useState('Highlight Clip');
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [presetAnchor, setPresetAnchor] = useState<PresetAnchor>('start-at-playhead');

  const effectiveMaxDuration = isEmbed ? undefined : (duration > 0 ? duration : undefined);

  // Keep text inputs synchronized with external changes, but NEVER overwrite while user is actively typing
  useEffect(() => {
    if (!isStartFocused) {
      setStartInput(formatTimestamp(startTime));
    }
    if (!isEndFocused) {
      setEndInput(formatTimestamp(endTime));
    }
    setValidation(validateTimeframe(startTime, endTime, effectiveMaxDuration));
  }, [startTime, endTime, duration, effectiveMaxDuration, isStartFocused, isEndFocused]);

  const handleStartInputChange = (val: string) => {
    setStartInput(val);
    const parsed = parseTimestamp(val);
    if (parsed !== null) {
      setValidation({ isValid: true });
    } else if (val.trim().length > 3) {
      setValidation({ isValid: false, error: 'Enter format like 57:58, 1.02.56, or 00:57:58' });
    }
  };

  const handleCommitStart = () => {
    setIsStartFocused(false);
    const parsed = parseTimestamp(startInput);
    if (parsed !== null) {
      let nextEnd = endTime;
      if (parsed >= endTime) {
        nextEnd = parsed + 60;
      }
      onRangeChange(parsed, nextEnd);
      setStartInput(formatTimestamp(parsed));
      setValidation({ isValid: true });
    } else {
      setStartInput(formatTimestamp(startTime));
      setValidation({ isValid: true });
    }
  };

  const handleEndInputChange = (val: string) => {
    setEndInput(val);
    const parsed = parseTimestamp(val);
    if (parsed !== null) {
      setValidation({ isValid: true });
    } else if (val.trim().length > 3) {
      setValidation({ isValid: false, error: 'Enter format like 1.02.56, 1:02:56, or 57:58' });
    }
  };

  const handleCommitEnd = () => {
    setIsEndFocused(false);
    const parsed = parseTimestamp(endInput);
    if (parsed !== null) {
      let nextStart = startTime;
      if (parsed <= startTime) {
        nextStart = Math.max(0, parsed - 60);
      }
      onRangeChange(nextStart, parsed);
      setEndInput(formatTimestamp(parsed));
      setValidation({ isValid: true });
    } else {
      setEndInput(formatTimestamp(endTime));
      setValidation({ isValid: true });
    }
  };

  const handlePasteStart = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    if (text) {
      e.preventDefault();
      setStartInput(text);
      const parsed = parseTimestamp(text);
      if (parsed !== null) {
        let nextEnd = endTime;
        if (parsed >= endTime) nextEnd = parsed + 60;
        onRangeChange(parsed, nextEnd);
        setStartInput(formatTimestamp(parsed));
        setIsStartFocused(false);
        setValidation({ isValid: true });
      }
    }
  };

  const handlePasteEnd = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim();
    if (text) {
      e.preventDefault();
      setEndInput(text);
      const parsed = parseTimestamp(text);
      if (parsed !== null) {
        let nextStart = startTime;
        if (parsed <= startTime) nextStart = Math.max(0, parsed - 60);
        onRangeChange(nextStart, parsed);
        setEndInput(formatTimestamp(parsed));
        setIsEndFocused(false);
        setValidation({ isValid: true });
      }
    }
  };

  // Steppers for precision adjustments
  const adjustStart = (deltaSeconds: number) => {
    const newStart = Math.max(0, startTime + deltaSeconds);
    const v = validateTimeframe(newStart, endTime, effectiveMaxDuration);
    if (v.isValid) {
      onRangeChange(newStart, endTime);
    }
  };

  const adjustEnd = (deltaSeconds: number) => {
    const newEnd = Math.max(startTime + 0.1, endTime + deltaSeconds);
    const v = validateTimeframe(startTime, newEnd, effectiveMaxDuration);
    if (v.isValid) {
      onRangeChange(startTime, newEnd);
    }
  };

  // Set from current playhead
  const setStartToPlayhead = () => {
    const v = validateTimeframe(currentTime, endTime, effectiveMaxDuration);
    if (v.isValid) {
      onRangeChange(currentTime, endTime);
    } else {
      // If current playhead is past end, move end forward too
      const safeEnd = currentTime + 5;
      onRangeChange(currentTime, safeEnd);
    }
  };

  const setEndToPlayhead = () => {
    const v = validateTimeframe(startTime, currentTime, effectiveMaxDuration);
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
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={startInput}
                  onFocus={() => setIsStartFocused(true)}
                  onChange={(e) => handleStartInputChange(e.target.value)}
                  onBlur={handleCommitStart}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommitStart()}
                  onPaste={handlePasteStart}
                  className="w-full pl-3 pr-14 py-2 bg-white border border-stone rounded font-mono font-bold text-base text-botanical tracking-wider focus:border-coral focus:outline-none"
                  placeholder="00:00:00.000 or 57:58"
                />
                {isStartFocused && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCommitStart();
                    }}
                    className="absolute right-1.5 px-2 py-1 bg-coral text-white text-[11px] font-mono font-bold rounded shadow-minimal hover:bg-coral-hover"
                    title="Apply start time"
                  >
                    Set
                  </button>
                )}
              </div>
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
              <span>e.g. 57:58, 1:02:56, 1.02.56, or HH:MM:SS</span>
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
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={endInput}
                  onFocus={() => setIsEndFocused(true)}
                  onChange={(e) => handleEndInputChange(e.target.value)}
                  onBlur={handleCommitEnd}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommitEnd()}
                  onPaste={handlePasteEnd}
                  className="w-full pl-3 pr-14 py-2 bg-white border border-stone rounded font-mono font-bold text-base text-botanical tracking-wider focus:border-coral focus:outline-none"
                  placeholder="00:00:00.000 or 1.02.56"
                />
                {isEndFocused && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCommitEnd();
                    }}
                    className="absolute right-1.5 px-2 py-1 bg-coral text-white text-[11px] font-mono font-bold rounded shadow-minimal hover:bg-coral-hover"
                    title="Apply end time"
                  >
                    Set
                  </button>
                )}
              </div>
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
              <span>e.g. 1.02.56, 1:02:56, 57:58, or HH:MM:SS</span>
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
            onClick={() => {
              if (isStartFocused) handleCommitStart();
              if (isEndFocused) handleCommitEnd();
              onPreviewSelection();
            }}
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
              if (isStartFocused) handleCommitStart();
              if (isEndFocused) handleCommitEnd();
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
            onClick={() => {
              if (isStartFocused) handleCommitStart();
              if (isEndFocused) handleCommitEnd();
              if (validation.isValid) {
                onQuickExport();
              }
            }}
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
