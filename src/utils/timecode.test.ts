import { describe, it, expect } from 'vitest';
import { 
  formatTimestamp, 
  parseTimestamp, 
  validateTimeframe, 
  parseBulkTimeframes,
  exportClipsToCSV 
} from './timecode';
import { ClipRange } from '../types';

describe('Timecode Formatting & Parsing', () => {
  it('formats seconds into exact HH:MM:SS.mmm format', () => {
    expect(formatTimestamp(755.5)).toBe('00:12:35.500');
    expect(formatTimestamp(0)).toBe('00:00:00.000');
    expect(formatTimestamp(3661.25)).toBe('01:01:01.250');
    expect(formatTimestamp(66.75)).toBe('00:01:06.750');
  });

  it('formats seconds without milliseconds when requested', () => {
    expect(formatTimestamp(755.5, false)).toBe('00:12:35');
    expect(formatTimestamp(0, false)).toBe('00:00:00');
  });

  it('parses various valid timestamp strings into float seconds', () => {
    expect(parseTimestamp('00:12:35.500')).toBe(755.5);
    expect(parseTimestamp('12:35.500')).toBe(755.5);
    expect(parseTimestamp('00:01:06.750')).toBe(66.75);
    expect(parseTimestamp('01:00:00')).toBe(3600);
    expect(parseTimestamp('45.25')).toBe(45.25);
    // User requested formats:
    expect(parseTimestamp('57:58')).toBe(3478);
    expect(parseTimestamp('1.01.58')).toBe(3718);
    expect(parseTimestamp('1.02.56')).toBe(3776);
    expect(parseTimestamp('01.02.56')).toBe(3776);
    expect(parseTimestamp('1:02:56')).toBe(3776);
    expect(parseTimestamp('01.01.58')).toBe(3718);
    expect(parseTimestamp('1:01:58')).toBe(3718);
    expect(parseTimestamp('1h 1m 58s')).toBe(3718);
  });

  it('rejects malformed timestamps gracefully with null', () => {
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('invalid')).toBeNull();
    expect(parseTimestamp('12:65:00')).toBeNull(); // 65 minutes invalid
    expect(parseTimestamp('-00:10:00')).toBeNull(); // negative invalid
  });
});

describe('Timeframe Range Validation', () => {
  it('accepts valid range within media duration', () => {
    const res = validateTimeframe(10, 25, 60);
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('rejects when start >= end', () => {
    const res = validateTimeframe(30, 20, 60);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('strictly before');
  });

  it('rejects zero-length selections', () => {
    const res = validateTimeframe(15, 15, 60);
    expect(res.isValid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('rejects clip duration under 100ms', () => {
    const res = validateTimeframe(10, 10.05, 60);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('at least 0.100s');
  });

  it('rejects end time exceeding media duration', () => {
    const res = validateTimeframe(50, 75, 60);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('exceeds media duration');
  });

  it('rejects negative timestamps', () => {
    const res = validateTimeframe(-5, 10, 60);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('negative');
  });
});

describe('Bulk Timeframe Parsing', () => {
  it('parses dash-separated ranges and names', () => {
    const input = `00:01:20 - 00:01:55, Intro Hook
00:04:10 - 00:04:48, Product Demo
00:09:35 - 00:10:20`;
    const result = parseBulkTimeframes(input, 1000);
    expect(result.validRows.length).toBe(3);
    expect(result.invalidRows.length).toBe(0);
    expect(result.validRows[0].name).toBe('Intro Hook');
    expect(result.validRows[0].duration).toBe(35);
  });

  it('parses CSV lines', () => {
    const input = `00:00:10, 00:00:30, Hook 1
00:01:00, 00:01:45, Hook 2`;
    const result = parseBulkTimeframes(input, 500);
    expect(result.validRows.length).toBe(2);
    expect(result.validRows[0].name).toBe('Hook 1');
  });

  it('detects duplicate ranges', () => {
    const input = `00:01:00 - 00:01:30, First
00:01:00 - 00:01:30, Duplicate`;
    const result = parseBulkTimeframes(input, 500);
    expect(result.hasDuplicates).toBe(true);
  });

  it('detects overlapping ranges', () => {
    const input = `00:01:00 - 00:02:00, Range A
00:01:30 - 00:02:30, Range B`;
    const result = parseBulkTimeframes(input, 500);
    expect(result.hasOverlaps).toBe(true);
  });

  it('reports malformed rows with line numbers and human errors', () => {
    const input = `00:01:00 - 00:01:30, Valid
invalid line here
00:05:00 - 00:04:00, Backwards`;
    const result = parseBulkTimeframes(input, 500);
    expect(result.validRows.length).toBe(1);
    expect(result.invalidRows.length).toBe(2);
    expect(result.invalidRows[0].index).toBe(2);
  });
});

describe('CSV Export Generation', () => {
  it('generates well-formatted CSV with headers and quoted fields', () => {
    const sampleClips: ClipRange[] = [
      { id: '1', name: 'Hook', start: 10, end: 25, duration: 15 },
      { id: '2', name: 'Quote, with comma', start: 40, end: 60, duration: 20 },
    ];
    const csv = exportClipsToCSV(sampleClips, 'Master Video');
    expect(csv).toContain('Clip Name,Start Timecode,End Timecode');
    expect(csv).toContain('"Hook",00:00:10.000,00:00:25.000');
    expect(csv).toContain('"Quote, with comma"');
  });

  it('neutralizes CSV formula injection characters', () => {
    const maliciousClips: ClipRange[] = [
      { id: '1', name: '=1+1', start: 0, end: 10, duration: 10 },
      { id: '2', name: '@SUM(A1:A10)', start: 10, end: 20, duration: 10 },
      { id: '3', name: '-calc', start: 20, end: 30, duration: 10 },
    ];
    const csv = exportClipsToCSV(maliciousClips, 'Master Video');
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"\'@SUM(A1:A10)"');
    expect(csv).toContain('"\' -calc"'.replace(' -', '-'));
  });
});
