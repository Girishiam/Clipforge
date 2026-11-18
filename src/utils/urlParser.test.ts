import { describe, it, expect } from 'vitest';
import { parseVideoUrl } from './urlParser';

describe('Universal Video URL Parser', () => {
  it('parses standard YouTube watch URLs', () => {
    const res = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res.platform).toBe('youtube');
    expect(res.isValid).toBe(true);
    expect(res.videoId).toBe('dQw4w9WgXcQ');
    expect(res.isEmbedOnly).toBe(true);
    expect(res.embedUrl).toContain('youtube.com/embed/dQw4w9WgXcQ');
  });

  it('parses YouTube Shorts URLs', () => {
    const res = parseVideoUrl('https://www.youtube.com/shorts/3n79h1rN8-A');
    expect(res.platform).toBe('youtube');
    expect(res.isValid).toBe(true);
    expect(res.videoId).toBe('3n79h1rN8-A');
  });

  it('parses youtu.be shortlinks', () => {
    const res = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?t=45s');
    expect(res.platform).toBe('youtube');
    expect(res.videoId).toBe('dQw4w9WgXcQ');
    expect(res.initialTimestamp).toBe(45);
  });

  it('parses Instagram Reel links', () => {
    const res = parseVideoUrl('https://www.instagram.com/reel/C-xyz12345/');
    expect(res.platform).toBe('instagram');
    expect(res.isValid).toBe(true);
    expect(res.videoId).toBe('C-xyz12345');
    expect(res.isEmbedOnly).toBe(true);
  });

  it('parses Facebook video links', () => {
    const res = parseVideoUrl('https://www.facebook.com/watch/?v=1234567890');
    expect(res.platform).toBe('facebook');
    expect(res.isValid).toBe(true);
    expect(res.isEmbedOnly).toBe(true);
  });

  it('parses direct MP4 media links', () => {
    const res = parseVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
    expect(res.platform).toBe('direct_url');
    expect(res.isValid).toBe(true);
    expect(res.isEmbedOnly).toBe(false);
    expect(res.directUrl).toBe('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  });

  it('handles empty or invalid inputs gracefully', () => {
    const emptyRes = parseVideoUrl('');
    expect(emptyRes.isValid).toBe(false);
    expect(emptyRes.platform).toBe('unknown');

    const invalidRes = parseVideoUrl('not-a-valid-url');
    expect(invalidRes.isValid).toBe(false);
  });
});
