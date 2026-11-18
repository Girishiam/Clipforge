import { SourcePlatform } from '../types';

export interface ParsedUrlInfo {
  platform: SourcePlatform;
  isValid: boolean;
  videoId?: string;
  embedUrl?: string;
  directUrl?: string;
  initialTimestamp?: number; // parsed from ?t= or #t=
  title: string;
  isEmbedOnly: boolean;
  statusNote: string;
  badgeLabel: string;
}

/**
 * Parses timestamp from URL parameters like ?t=1m30s, ?t=90, ?start=90
 */
function parseUrlTimestamp(param: string | null): number | undefined {
  if (!param) return undefined;
  // If pure number: 90 -> 90
  if (/^\d+$/.test(param)) {
    return parseInt(param, 10);
  }
  // If 1h20m30s or 1m30s or 90s
  let total = 0;
  const hMatch = param.match(/(\d+)h/i);
  const mMatch = param.match(/(\d+)m/i);
  const sMatch = param.match(/(\d+)s/i);

  if (hMatch) total += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) total += parseInt(mMatch[1], 10) * 60;
  if (sMatch) total += parseInt(sMatch[1], 10);

  return total > 0 ? total : undefined;
}

export function parseVideoUrl(input: string): ParsedUrlInfo {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      platform: 'unknown' as SourcePlatform,
      isValid: false,
      title: 'Empty URL',
      isEmbedOnly: false,
      statusNote: 'Please enter a video URL or upload a local file.',
      badgeLabel: 'Empty',
    };
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname;

    // 1. YouTube
    if (
      hostname.includes('youtube.com') ||
      hostname.includes('youtu.be') ||
      hostname.includes('youtube-nocookie.com')
    ) {
      let videoId = '';
      const tParam = url.searchParams.get('t') || url.searchParams.get('start');
      const initialTimestamp = parseUrlTimestamp(tParam);

      if (hostname.includes('youtu.be')) {
        // youtu.be/VIDEO_ID
        videoId = pathname.replace('/', '').split('/')[0];
      } else if (pathname.includes('/shorts/')) {
        // youtube.com/shorts/VIDEO_ID
        videoId = pathname.split('/shorts/')[1].split('/')[0];
      } else if (pathname.includes('/embed/')) {
        // youtube.com/embed/VIDEO_ID
        videoId = pathname.split('/embed/')[1].split('/')[0];
      } else if (pathname.includes('/live/')) {
        // youtube.com/live/VIDEO_ID
        videoId = pathname.split('/live/')[1].split('/')[0];
      } else {
        // youtube.com/watch?v=VIDEO_ID
        videoId = url.searchParams.get('v') || '';
      }

      // Clean videoId
      videoId = videoId.split('?')[0].split('&')[0];

      if (videoId && videoId.length >= 5) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&rel=0`;
        return {
          platform: 'youtube',
          isValid: true,
          videoId,
          embedUrl,
          initialTimestamp,
          title: `YouTube: ${videoId}`,
          isEmbedOnly: true,
          statusNote: 'YouTube video identified. Interactive player and exact timeframe clipping active.',
          badgeLabel: 'YouTube',
        };
      }
    }

    // 2. Instagram
    if (hostname.includes('instagram.com')) {
      // /reel/CODE/ or /p/CODE/
      const match = pathname.match(/\/(reel|p)\/([a-zA-Z0-9_-]+)/);
      if (match) {
        const code = match[2];
        const embedUrl = `https://www.instagram.com/reel/${code}/embed`;
        return {
          platform: 'instagram',
          isValid: true,
          videoId: code,
          embedUrl,
          title: `Instagram Reel: ${code}`,
          isEmbedOnly: true,
          statusNote: 'Instagram Reel identified. Preview supported. Import the source video file to execute local clipping and export.',
          badgeLabel: 'Instagram',
        };
      }
    }

    // 3. Facebook
    if (
      hostname.includes('facebook.com') ||
      hostname.includes('fb.watch')
    ) {
      return {
        platform: 'facebook',
        isValid: true,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=0`,
        title: `Facebook Video`,
        isEmbedOnly: true,
        statusNote: 'Facebook video recognized. Embedded preview active. Import original media for local clipping.',
        badgeLabel: 'Facebook',
      };
    }

    // 4. Direct video media file
    const isDirectMedia = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(pathname);
    if (isDirectMedia || url.protocol.startsWith('http')) {
      const fileName = pathname.split('/').pop() || 'Remote Media';
      return {
        platform: 'direct_url',
        isValid: true,
        directUrl: trimmed,
        title: decodeURIComponent(fileName),
        isEmbedOnly: false,
        statusNote: 'Direct media stream detected. Full local processing and clipping available (subject to CORS policy).',
        badgeLabel: 'Direct Stream',
      };
    }

    return {
      platform: 'unknown' as SourcePlatform,
      isValid: false,
      title: 'Unrecognized URL',
      isEmbedOnly: false,
      statusNote: 'The URL provided does not match supported YouTube, Instagram, Facebook, or direct video patterns.',
      badgeLabel: 'Unsupported',
    };
  } catch (err) {
    return {
      platform: 'unknown' as SourcePlatform,
      isValid: false,
      title: 'Invalid URL Format',
      isEmbedOnly: false,
      statusNote: 'Please enter a valid HTTP or HTTPS video URL.',
      badgeLabel: 'Invalid',
    };
  }
}
