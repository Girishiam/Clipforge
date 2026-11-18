import { ClipRange } from '../types';

/**
 * Formats seconds into standard HH:MM:SS.mmm
 * e.g. 755.5 -> "00:12:35.500"
 */
export function formatTimestamp(seconds: number, includeMs: boolean = true): string {
  if (isNaN(seconds) || seconds < 0) {
    return includeMs ? '00:00:00.000' : '00:00:00';
  }

  const totalMilliseconds = Math.round(seconds * 1000);
  const ms = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  const pad = (num: number, size: number = 2) => String(num).padStart(size, '0');

  const base = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (!includeMs) return base;
  return `${base}.${pad(ms, 3)}`;
}

/**
 * Formats seconds into human duration e.g. "1m 15s" or "00:01:15.500"
 */
export function formatDuration(seconds: number): string {
  return formatTimestamp(seconds, true);
}

/**
 * Parses timestamps in various formats:
 * - "00:12:35.500"
 * - "12:35.500"
 * - "12:35"
 * - "1:15:30"
 * - "75.5" (plain seconds)
 * Returns seconds as float or null if invalid.
 */
export function parseTimestamp(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('-')) return null;

  // Case 1: Plain number of seconds
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const val = parseFloat(trimmed);
    return isNaN(val) || val < 0 ? null : val;
  }

  // Case 2: Timecode HH:MM:SS.mmm or MM:SS.mmm
  // Regex matches H:M:S(.ms) or M:S(.ms)
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  // Ensure none of the parts have negative signs
  if (parts.some(p => p.includes('-'))) return null;

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  }

  if (isNaN(hours) || hours < 0) return null;
  if (isNaN(minutes) || minutes < 0 || minutes >= 60) return null;
  if (isNaN(seconds) || seconds < 0 || seconds >= 60) return null;

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return totalSeconds;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates start and end timeframes
 */
export function validateTimeframe(
  start: number,
  end: number,
  maxDuration?: number
): ValidationResult {
  if (isNaN(start) || start < 0) {
    return { isValid: false, error: 'Start time cannot be negative or invalid.' };
  }
  if (isNaN(end) || end <= 0) {
    return { isValid: false, error: 'End time must be greater than zero.' };
  }
  if (start >= end) {
    return { isValid: false, error: 'Start time must be strictly before end time.' };
  }
  if (end - start < 0.1) {
    return { isValid: false, error: 'Clip duration must be at least 0.100s (100ms).' };
  }
  if (maxDuration && maxDuration > 0) {
    if (end > maxDuration + 0.05) {
      return {
        isValid: false,
        error: `End time (${formatTimestamp(end)}) exceeds media duration (${formatTimestamp(maxDuration)}).`,
      };
    }
    if (start >= maxDuration) {
      return {
        isValid: false,
        error: `Start time (${formatTimestamp(start)}) is at or beyond media end.`,
      };
    }
  }

  return { isValid: true };
}

export interface ParsedBulkRow {
  index: number;
  rawText: string;
  name: string;
  start: number;
  end: number;
  duration: number;
  isValid: boolean;
  error?: string;
  isDuplicate?: boolean;
  isOverlapping?: boolean;
  overlappingWithIndex?: number;
}

export interface BulkParseResult {
  totalRows: number;
  validRows: ParsedBulkRow[];
  invalidRows: ParsedBulkRow[];
  hasDuplicates: boolean;
  hasOverlaps: boolean;
}

/**
 * Advanced bulk timeframe parser
 * Supports:
 * - "00:01:20 - 00:01:55"
 * - "00:01:20 - 00:01:55, Highlight 1"
 * - "00:01:20, 00:01:55, Intro Hook"
 * - "Intro Hook: 00:01:20 - 00:01:55"
 * - "01:20 to 01:55"
 */
export function parseBulkTimeframes(
  text: string,
  maxDuration?: number
): BulkParseResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const rows: ParsedBulkRow[] = [];

  lines.forEach((line, index) => {
    // Check if header row (skip if "start,end" header)
    if (index === 0 && /^start.*end/i.test(line.replace(/[^a-z]/gi, ''))) {
      return;
    }

    let rawStart = '';
    let rawEnd = '';
    let clipName = `Clip ${String(index + 1).padStart(2, '0')}`;

    // Pattern 1: CSV format: Start, End, [Name] or Name, Start, End
    if (line.includes(',')) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        // check if part 0 is timestamp
        const t0 = parseTimestamp(parts[0]);
        const t1 = parseTimestamp(parts[1]);
        if (t0 !== null && t1 !== null) {
          rawStart = parts[0];
          rawEnd = parts[1];
          if (parts[2]) clipName = parts[2];
        } else if (parts.length >= 3) {
          // Maybe Name, Start, End
          const t1_alt = parseTimestamp(parts[1]);
          const t2_alt = parseTimestamp(parts[2]);
          if (t1_alt !== null && t2_alt !== null) {
            clipName = parts[0];
            rawStart = parts[1];
            rawEnd = parts[2];
          }
        }
      }
    }

    // Pattern 2: Dash or "to" separated: "00:01:20 - 00:01:55" or "Intro: 00:01:20 - 00:01:55"
    if (!rawStart && (line.includes('-') || line.toLowerCase().includes(' to '))) {
      let content = line;
      // Check for leading label like "Hook: 00:00:10 - 00:00:25"
      const colonIdx = line.indexOf(':');
      // Ensure colon isn't part of timestamp (timestamp colon followed by digits)
      if (colonIdx > 0 && isNaN(Number(line[colonIdx + 1]))) {
        clipName = line.substring(0, colonIdx).trim();
        content = line.substring(colonIdx + 1).trim();
      }

      const separator = content.toLowerCase().includes(' to ') ? / to /i : /\s*-\s*/;
      const parts = content.split(separator).map(p => p.trim());

      if (parts.length >= 2) {
        rawStart = parts[0];
        // If part 1 has trailing name: "00:01:55 (Intro)" or "00:01:55, Intro"
        const endPart = parts[1];
        if (endPart.includes(',')) {
          const sub = endPart.split(',').map(s => s.trim());
          rawEnd = sub[0];
          if (sub[1]) clipName = sub[1];
        } else if (endPart.includes('(') && endPart.endsWith(')')) {
          const match = endPart.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            rawEnd = match[1].trim();
            clipName = match[2].trim();
          } else {
            rawEnd = endPart;
          }
        } else {
          rawEnd = endPart;
        }
      }
    }

    const startVal = parseTimestamp(rawStart);
    const endVal = parseTimestamp(rawEnd);

    if (startVal === null || endVal === null) {
      rows.push({
        index: index + 1,
        rawText: line,
        name: clipName,
        start: 0,
        end: 0,
        duration: 0,
        isValid: false,
        error: `Could not parse start ("${rawStart || 'missing'}") or end ("${rawEnd || 'missing'}") timestamp.`,
      });
      return;
    }

    const validation = validateTimeframe(startVal, endVal, maxDuration);
    if (!validation.isValid) {
      rows.push({
        index: index + 1,
        rawText: line,
        name: clipName,
        start: startVal,
        end: endVal,
        duration: endVal - startVal > 0 ? endVal - startVal : 0,
        isValid: false,
        error: validation.error,
      });
      return;
    }

    rows.push({
      index: index + 1,
      rawText: line,
      name: clipName,
      start: startVal,
      end: endVal,
      duration: endVal - startVal,
      isValid: true,
    });
  });

  // Duplicate & Overlap Detection
  const validRows = rows.filter(r => r.isValid);
  let hasDuplicates = false;
  let hasOverlaps = false;

  for (let i = 0; i < validRows.length; i++) {
    for (let j = i + 1; j < validRows.length; j++) {
      const a = validRows[i];
      const b = validRows[j];

      // Exact match check (tolerance of 50ms)
      if (Math.abs(a.start - b.start) < 0.05 && Math.abs(a.end - b.end) < 0.05) {
        b.isDuplicate = true;
        hasDuplicates = true;
      }

      // Overlap check
      const overlaps = Math.max(a.start, b.start) < Math.min(a.end, b.end) - 0.05;
      if (overlaps) {
        b.isOverlapping = true;
        b.overlappingWithIndex = a.index;
        hasOverlaps = true;
      }
    }
  }

  return {
    totalRows: rows.length,
    validRows: rows.filter(r => r.isValid),
    invalidRows: rows.filter(r => !r.isValid),
    hasDuplicates,
    hasOverlaps,
  };
}

/**
 * Export clips to CSV format
 */
export function exportClipsToCSV(clips: ClipRange[], sourceTitle: string): string {
  const header = ['Clip Name', 'Start Timecode', 'End Timecode', 'Start Seconds', 'End Seconds', 'Duration Timecode', 'Duration Seconds', 'Source'];
  const lines = [header.join(',')];

  clips.forEach(clip => {
    const row = [
      `"${clip.name.replace(/"/g, '""')}"`,
      formatTimestamp(clip.start),
      formatTimestamp(clip.end),
      clip.start.toFixed(3),
      clip.end.toFixed(3),
      formatTimestamp(clip.duration),
      clip.duration.toFixed(3),
      `"${sourceTitle.replace(/"/g, '""')}"`,
    ];
    lines.push(row.join(','));
  });

  return lines.join('\n');
}
