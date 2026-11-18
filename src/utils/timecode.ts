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
 * Formats seconds into human duration e.g. "00:01:15.500"
 */
export function formatDuration(seconds: number): string {
  return formatTimestamp(seconds, true);
}

/**
 * Parses timestamps in various natural formats:
 * - "00:12:35.500"
 * - "1:01:58" / "01:01:58"
 * - "1.01.58" / "01.01.58" (dot-separated hours.mins.secs)
 * - "57:58" (mins:secs)
 * - "57.58" (mins.secs)
 * - "1h 1m 58s" / "57m 58s"
 * - "75.5" (plain seconds)
 * Returns seconds as float or null if invalid.
 */
export function parseTimestamp(input: string): number | null {
  if (!input) return null;
  let trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed.startsWith('-')) return null;

  // Case A: Natural language units: "1h 1m 58s", "57m 58s", "1h 1m", "90s", "1h01m58s"
  if (/[hms]/.test(trimmed)) {
    let total = 0;
    let matched = false;
    const h = trimmed.match(/(\d+)\s*h/);
    const m = trimmed.match(/(\d+)\s*m(?!s)/);
    const s = trimmed.match(/(\d+(\.\d+)?)\s*s/);
    if (h) { total += parseInt(h[1], 10) * 3600; matched = true; }
    if (m) { total += parseInt(m[1], 10) * 60; matched = true; }
    if (s) { total += parseFloat(s[1]); matched = true; }
    if (matched) return total;
  }

  // Case B: Dot-separated format like "1.01.58", "01.01.58"
  // If input contains 2 or more dots (H.M.S or H.M.S.ms) and NO colons, convert time-like dots to colons!
  if (!trimmed.includes(':') && trimmed.includes('.')) {
    const dotParts = trimmed.split('.');
    if (dotParts.length === 3) {
      // e.g. "1.01.58" -> H:M:S
      trimmed = `${dotParts[0]}:${dotParts[1]}:${dotParts[2]}`;
    } else if (dotParts.length === 4) {
      // e.g. "1.01.58.500" -> H:M:S.ms
      trimmed = `${dotParts[0]}:${dotParts[1]}:${dotParts[2]}.${dotParts[3]}`;
    }
  }

  // Case C: Standard Colon Timecode: "H:M:S", "M:S", "H:M:S.ms", "M:S.ms"
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.some(p => p.includes('-') || isNaN(Number(p)))) return null;

    if (parts.length === 2) {
      // M:S or M:S.ms (e.g. "57:58" or "125:30")
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      if (isNaN(minutes) || minutes < 0) return null;
      if (isNaN(seconds) || seconds < 0 || seconds >= 60) return null;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // H:M:S or H:M:S.ms (e.g. "1:01:58" or "01:01:58.000")
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      if (isNaN(hours) || hours < 0) return null;
      if (isNaN(minutes) || minutes < 0 || minutes >= 60) return null;
      if (isNaN(seconds) || seconds < 0 || seconds >= 60) return null;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return null;
  }

  // Case D: Plain number of seconds
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const val = parseFloat(trimmed);
    return isNaN(val) || val < 0 ? null : val;
  }

  return null;
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
  // Check maxDuration if provided
  if (maxDuration !== undefined && maxDuration > 0) {
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
 */
export function parseBulkTimeframes(
  text: string,
  maxDuration?: number
): BulkParseResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const rows: ParsedBulkRow[] = [];

  lines.forEach((line, index) => {
    if (index === 0 && /^start.*end/i.test(line.replace(/[^a-z]/gi, ''))) {
      return;
    }

    let rawStart = '';
    let rawEnd = '';
    let clipName = `Clip ${String(index + 1).padStart(2, '0')}`;

    if (line.includes(',')) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const t0 = parseTimestamp(parts[0]);
        const t1 = parseTimestamp(parts[1]);
        if (t0 !== null && t1 !== null) {
          rawStart = parts[0];
          rawEnd = parts[1];
          if (parts[2]) clipName = parts[2];
        } else if (parts.length >= 3) {
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

    if (!rawStart && (line.includes('-') || line.toLowerCase().includes(' to '))) {
      let content = line;
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && isNaN(Number(line[colonIdx + 1]))) {
        clipName = line.substring(0, colonIdx).trim();
        content = line.substring(colonIdx + 1).trim();
      }

      const separator = content.toLowerCase().includes(' to ') ? / to /i : /\s*-\s*/;
      const parts = content.split(separator).map(p => p.trim());

      if (parts.length >= 2) {
        rawStart = parts[0];
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

  const validRows = rows.filter(r => r.isValid);
  let hasDuplicates = false;
  let hasOverlaps = false;

  for (let i = 0; i < validRows.length; i++) {
    for (let j = i + 1; j < validRows.length; j++) {
      const a = validRows[i];
      const b = validRows[j];

      if (Math.abs(a.start - b.start) < 0.05 && Math.abs(a.end - b.end) < 0.05) {
        b.isDuplicate = true;
        hasDuplicates = true;
      }

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
