import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ClipRange } from '../types';
import { formatTimestamp } from '../utils/timecode';

interface TimelineProps {
  duration: number;
  currentTime: number;
  startTime: number;
  endTime: number;
  clips: ClipRange[];
  onSeek: (time: number) => void;
  onRangeChange: (start: number, end: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  startTime,
  endTime,
  clips,
  onSeek,
  onRangeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'playhead' | 'start' | 'end' | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const safeDuration = duration > 0 ? duration : 60;

  // Converts clientX offset to time in seconds
  const getTimeFromClientX = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percentage = x / rect.width;
      return Math.max(0, Math.min(safeDuration, percentage * safeDuration));
    },
    [safeDuration]
  );

  const handleMouseDown = (type: 'playhead' | 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(type);
  };

  const handleTouchStart = (type: 'playhead' | 'start' | 'end', e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(type);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    const t = getTimeFromClientX(e.clientX);
    onSeek(t);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const t = getTimeFromClientX(e.clientX);
    setHoverTime(t);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDragging) return;
      const t = getTimeFromClientX(clientX);

      if (isDragging === 'playhead') {
        onSeek(t);
      } else if (isDragging === 'start') {
        const newStart = Math.min(t, endTime - 0.1);
        onRangeChange(Math.max(0, newStart), endTime);
      } else if (isDragging === 'end') {
        const newEnd = Math.max(t, startTime + 0.1);
        onRangeChange(startTime, Math.min(safeDuration, newEnd));
      }
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      window.addEventListener('touchend', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging, getTimeFromClientX, startTime, endTime, safeDuration, onSeek, onRangeChange]);

  // Compute percentages
  const playheadPct = (currentTime / safeDuration) * 100;
  const startPct = (startTime / safeDuration) * 100;
  const endPct = (endTime / safeDuration) * 100;
  const selectionWidthPct = Math.max(0, endPct - startPct);

  // Ruler tick marks
  const tickCount = 8;
  const ticks = Array.from({ length: tickCount + 1 }).map((_, i) => {
    const t = (i / tickCount) * safeDuration;
    return { time: t, pct: (i / tickCount) * 100 };
  });

  return (
    <div className="bg-surface-card border border-stone rounded-md p-3 sm:p-4 select-none shadow-minimal">
      {/* Header bar: Ruler marks & Live Timecodes */}
      <div className="flex flex-wrap justify-between items-center mb-2 font-mono text-[11px] sm:text-xs text-olive gap-1">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span>Range:</span>
          <span className="font-semibold text-botanical">{formatTimestamp(startTime)}</span>
          <span>to</span>
          <span className="font-semibold text-botanical">{formatTimestamp(endTime)}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <span>Playhead:</span>
          <span className="font-semibold text-coral">{formatTimestamp(currentTime)}</span>
          <span className="text-stone">/</span>
          <span>{formatTimestamp(safeDuration)}</span>
        </div>
      </div>

      {/* Main Interactive Timeline Track */}
      <div
        ref={containerRef}
        onClick={handleTrackClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-16 sm:h-20 bg-ivory border border-stone rounded overflow-hidden cursor-pointer touch-none"
      >
        {/* Fine neutral grid lines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-stone opacity-30 h-full"
            />
          ))}
        </div>

        {/* Other Existing Clips from this video */}
        {clips.map((clip) => {
          const cStartPct = (clip.start / safeDuration) * 100;
          const cEndPct = (clip.end / safeDuration) * 100;
          const cWidthPct = Math.max(0.5, cEndPct - cStartPct);
          return (
            <div
              key={clip.id}
              className="absolute top-0 bottom-0 bg-stone opacity-40 border-l border-r border-olive pointer-events-none"
              style={{ left: `${cStartPct}%`, width: `${cWidthPct}%` }}
              title={`Clip: ${clip.name} (${formatTimestamp(clip.duration)})`}
            />
          );
        })}

        {/* Selected Timeframe Region (Lime #C9E865 fill) */}
        <div
          className="absolute top-0 bottom-0 bg-lime opacity-75 border-t-2 border-b-2 border-botanical pointer-events-none transition-none"
          style={{
            left: `${startPct}%`,
            width: `${selectionWidthPct}%`,
          }}
        />

        {/* Left / Start Trim Handle (Coral #FE5936) */}
        <div
          onMouseDown={(e) => handleMouseDown('start', e)}
          onTouchStart={(e) => handleTouchStart('start', e)}
          className="absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-20 flex flex-col justify-center items-center group"
          style={{ left: `${startPct}%` }}
        >
          <div className="w-1.5 sm:w-2 h-full bg-coral rounded-xs shadow-minimal" />
          <div className="hidden sm:block absolute top-0 -mt-1 px-1 py-0.5 bg-coral text-white font-mono text-[9px] rounded-xs opacity-0 group-hover:opacity-100 transition-opacity">
            IN
          </div>
        </div>

        {/* Right / End Trim Handle (Coral #FE5936) */}
        <div
          onMouseDown={(e) => handleMouseDown('end', e)}
          onTouchStart={(e) => handleTouchStart('end', e)}
          className="absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-20 flex flex-col justify-center items-center group"
          style={{ left: `${endPct}%` }}
        >
          <div className="w-1.5 sm:w-2 h-full bg-coral rounded-xs shadow-minimal" />
          <div className="hidden sm:block absolute top-0 -mt-1 px-1 py-0.5 bg-coral text-white font-mono text-[9px] rounded-xs opacity-0 group-hover:opacity-100 transition-opacity">
            OUT
          </div>
        </div>

        {/* High-Contrast Playhead Needle */}
        <div
          onMouseDown={(e) => handleMouseDown('playhead', e)}
          onTouchStart={(e) => handleTouchStart('playhead', e)}
          className="absolute top-0 bottom-0 w-6 -ml-3 cursor-col-resize z-30 flex flex-col items-center group"
          style={{ left: `${playheadPct}%` }}
        >
          <div className="w-0.5 h-full bg-botanical" />
          <div className="w-2.5 h-2.5 bg-coral border border-white rotate-45 -mt-1 shadow-minimal" />
        </div>

        {/* Hover Timestamp Line */}
        {hoverTime !== null && !isDragging && (
          <div
            className="hidden sm:block absolute top-0 bottom-0 w-[1px] bg-olive opacity-60 pointer-events-none z-10"
            style={{ left: `${(hoverTime / safeDuration) * 100}%` }}
          >
            <div className="absolute bottom-1 -left-6 bg-botanical text-white px-1 py-0.5 font-mono text-[9px] rounded pointer-events-none">
              {formatTimestamp(hoverTime, false)}
            </div>
          </div>
        )}
      </div>

      {/* Ruler Scale Labels */}
      <div className="relative h-4 mt-1">
        {ticks.map((tick, i) => (
          <div
            key={i}
            className="absolute top-0 -translate-x-1/2 font-mono text-[9px] sm:text-[10px] text-olive"
            style={{ left: `${tick.pct}%` }}
          >
            {formatTimestamp(tick.time, false)}
          </div>
        ))}
      </div>
    </div>
  );
};
