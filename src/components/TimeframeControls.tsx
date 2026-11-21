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
  Repeat,
  Loader2,
  SlidersHorizontal,
  MoreVertical
} from 'lucide-react';
import { formatTimestamp, parseTimestamp, validateTimeframe, ValidationResult, formatHumanReadableTime } from '../utils/timecode';

interface TimeframeControlsProps {
  startTime: number;
  endTime: number;
  duration: number;
  currentTime: number;
  isLooping: boolean;
  isEmbed?: boolean;
  isDownloading?: boolean;
  onRangeChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
  onPreviewSelection: () => void;
  onToggleLoop: () => void;
  onAddClip: (name: string) => void;
  onQuickExport: () => void;
  onOpenOptions?: () => void;
}

type PresetAnchor = 'start-at-playhead' | 'center-playhead' | 'end-at-playhead';

export const TimeframeControls: React.FC<TimeframeControlsProps> = ({
  startTime,
  endTime,
  duration,
  currentTime,
  isLooping,
  isEmbed = false,
  isDownloading = false,
  onRangeChange,
  onSeek,
  onPreviewSelection,
  onToggleLoop,
  onAddClip,
  onQuickExport,
  onOpenOptions,
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
    const text = e.clipboardData.getData('text');
    const parsed = parseTimestamp(text);
    if (parsed !== null) {
      e.preventDefault();
      setIsStartFocused(false);
      let nextEnd = endTime;
      if (parsed >= endTime) {
        nextEnd = parsed + 60;
      }
      onRangeChange(parsed, nextEnd);
      setStartInput(formatTimestamp(parsed));
      setValidation({ isValid: true });
    }
  };

  const handlePasteEnd = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const parsed = parseTimestamp(text);
    if (parsed !== null) {
      e.preventDefault();
      setIsEndFocused(false);
      let nextStart = startTime;
      if (parsed <= startTime) {
        nextStart = Math.max(0, parsed - 60);
      }
      onRangeChange(nextStart, parsed);
      setEndInput(formatTimestamp(parsed));
      setValidation({ isValid: true });
    }
  };

  const adjustStart = (delta: number) => {
    const newStart = Math.max(0, startTime + delta);
    if (newStart < endTime) {
      onRangeChange(newStart, endTime);
    }
  };

  const adjustEnd = (delta: number) => {
    const newEnd = Math.max(startTime + 0.1, endTime + delta);
    onRangeChange(startTime, newEnd);
  };

  const setStartToPlayhead = () => {
    let nextEnd = endTime;
    if (currentTime >= endTime) {
      nextEnd = currentTime + 10;
    }
    onRangeChange(currentTime, nextEnd);
  };

  const setEndToPlayhead = () => {
    let nextStart = startTime;
    if (currentTime <= startTime) {
      nextStart = Math.max(0, currentTime - 10);
    }
    onRangeChange(nextStart, currentTime);
  };

  const applyPresetDuration = (presetSec: number) => {
    let newStart = startTime;
    let newEnd = endTime;

    switch (presetAnchor) {
      case 'start-at-playhead':
        newStart = currentTime;
        newEnd = newStart + presetSec;
        break;
      case 'center-playhead':
        newStart = Math.max(0, currentTime - presetSec / 2);
        newEnd = newStart + presetSec;
        break;
      case 'end-at-playhead':
        newEnd = currentTime;
        newStart = Math.max(0, newEnd - presetSec);
        break;
    }

    onRangeChange(newStart, newEnd);
  };

  const clipDuration = Math.max(0, endTime - startTime);

  const presets = [
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

  const parsedStartPreview = parseTimestamp(startInput);
  const parsedEndPreview = parseTimestamp(endInput);

  return (
    <div className="bg-surface-card border border-stone rounded-md p-4 sm:p-5 shadow-minimal space-y-4">
      {/* Precision Controls Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone pb-3">
          <div>
            <h3 className="font-heading font-bold text-sm text-botanical uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-coral inline-block"></span>
              Clip Timeframe
            </h3>
            <p className="text-xs text-olive">
              Enter your start and end times, or drag the playhead on the player.
            </p>
          </div>

          {/* Dynamic Clip Duration Pill */}
          <div className="flex items-center space-x-2 bg-lime-subtle border border-lime text-botanical px-3 py-1.5 rounded self-start sm:self-auto">
            <Clock className="w-4 h-4 text-botanical" />
            <span className="text-xs uppercase font-mono tracking-wider font-semibold">Clip Length:</span>
            <span className="font-mono text-sm font-bold text-botanical">
              {formatTimestamp(clipDuration, false)}
            </span>
            <span className="text-[11px] font-mono text-olive">
              ({formatHumanReadableTime(clipDuration)})
            </span>
          </div>
        </div>

        {/* The Two Prominent Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* START TIME FIELD */}
          <div className="p-4 bg-ivory border border-stone rounded">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-botanical flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-coral inline-block" />
                <span>Start Time</span>
              </label>
              <button
                onClick={setStartToPlayhead}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface hover:bg-stone text-botanical border border-stone flex items-center space-x-1 transition-colors"
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
                  placeholder="00:00:00 or 57:58"
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
                    title="-0.1 second"
                  >
                    -0.1s
                  </button>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => adjustStart(0.1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="+0.1 second"
                  >
                    +0.1s
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
              <span>
                {parsedStartPreview !== null ? (
                  <span className="text-botanical font-medium">({formatHumanReadableTime(parsedStartPreview)})</span>
                ) : (
                  'e.g. 57:58, 1:02:56, 1.02.56'
                )}
              </span>
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
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-botanical flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-coral inline-block" />
                <span>End Time</span>
              </label>
              <button
                onClick={setEndToPlayhead}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface hover:bg-stone text-botanical border border-stone flex items-center space-x-1 transition-colors"
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
                  placeholder="00:00:00 or 1:01:58"
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
                    title="-0.1 second"
                  >
                    -0.1s
                  </button>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => adjustEnd(0.1)}
                    className="px-1.5 py-1 text-[10px] font-mono bg-surface hover:bg-stone border border-stone rounded"
                    title="+0.1 second"
                  >
                    +0.1s
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
              <span>
                {parsedEndPreview !== null ? (
                  <span className="text-botanical font-medium">({formatHumanReadableTime(parsedEndPreview)})</span>
                ) : (
                  'e.g. 1:01:58, 1.01.58, or 57:58'
                )}
              </span>
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
              className={`px-2 py-0.5 rounded border transition-colors ${
                presetAnchor === 'start-at-playhead'
                  ? 'bg-botanical text-white border-botanical font-semibold'
                  : 'bg-surface text-botanical border-stone hover:bg-stone'
              }`}
            >
              Start @ Playhead
            </button>
            <button
              onClick={() => setPresetAnchor('center-playhead')}
              className={`px-2 py-0.5 rounded border transition-colors ${
                presetAnchor === 'center-playhead'
                  ? 'bg-botanical text-white border-botanical font-semibold'
                  : 'bg-surface text-botanical border-stone hover:bg-stone'
              }`}
            >
              Center @ Playhead
            </button>
            <button
              onClick={() => setPresetAnchor('end-at-playhead')}
              className={`px-2 py-0.5 rounded border transition-colors ${
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

      {/* Action Toolbar: Preview, Loop, Add to Shelf, Download */}
      <div className="pt-4 border-t border-stone flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (isStartFocused) handleCommitStart();
              if (isEndFocused) handleCommitEnd();
              onPreviewSelection();
            }}
            className="px-3.5 py-2 bg-surface hover:bg-stone border border-stone text-botanical text-xs font-medium rounded flex items-center space-x-1.5 shadow-minimal transition-colors"
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

        {/* Clip Name & Save / Download */}
        <div className="flex items-center space-x-2 flex-1 max-w-md justify-end">
          <input
            type="text"
            value={clipName}
            onChange={(e) => setClipName(e.target.value)}
            placeholder="Clip label (optional)..."
            className="px-3 py-2 bg-ivory border border-stone rounded text-xs text-botanical w-36 focus:w-44 transition-all"
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
            className={`px-3 py-2 text-xs font-semibold rounded flex items-center space-x-1.5 transition-colors ${
              validation.isValid
                ? 'bg-botanical text-white hover:bg-botanical-light'
                : 'bg-stone text-olive cursor-not-allowed'
            }`}
            title="Save range to Multi-Clip shelf"
          >
            <Plus className="w-3.5 h-3.5 text-lime" />
            <span>Save Clip</span>
          </button>

          {/* 1-Click Direct Download Button */}
          <button
            onClick={() => {
              if (isStartFocused) handleCommitStart();
              if (isEndFocused) handleCommitEnd();
              if (validation.isValid) {
                onQuickExport();
              }
            }}
            disabled={!validation.isValid || isDownloading}
            className={`px-4 py-2 text-xs font-semibold rounded flex items-center space-x-1.5 shadow-minimal transition-all cursor-pointer ${
              isDownloading
                ? 'bg-coral/80 text-white cursor-wait'
                : validation.isValid
                ? 'bg-coral text-white hover:bg-coral-hover active:scale-[0.98]'
                : 'bg-stone text-olive cursor-not-allowed'
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Clipping Video...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Clip</span>
              </>
            )}
          </button>

          {/* More options button */}
          {onOpenOptions && (
            <button
              onClick={onOpenOptions}
              className="p-2 bg-surface hover:bg-stone/30 border border-stone rounded text-olive hover:text-botanical transition-colors"
              title="More export options (record in browser, link file)"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
