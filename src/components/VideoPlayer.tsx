import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Film
} from 'lucide-react';
import { ClipSource } from '../types';
import { formatTimestamp } from '../utils/timecode';

interface VideoPlayerProps {
  source: ClipSource;
  videoRef: React.RefObject<HTMLVideoElement>;
  currentTime: number;
  duration: number;
  startTime: number;
  endTime: number;
  isLooping: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  source,
  videoRef,
  currentTime,
  duration,
  startTime,
  endTime,
  isLooping,
  onTimeUpdate,
  onDurationChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [guideRatio, setGuideRatio] = useState<'none' | '9:16' | '1:1'>('none');

  const ytPlayerRef = useRef<any>(null);
  const ytIntervalRef = useRef<any>(null);
  const isYouTube = source.platform === 'youtube' && !!source.videoId;

  // Initialize YouTube Player if source is YouTube
  useEffect(() => {
    if (!isYouTube || !source.videoId) return;

    let destroyed = false;

    const initPlayer = () => {
      if (destroyed) return;
      const YT = (window as any).YT;
      if (!YT || !YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      try {
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.destroy(); } catch {}
        }

        ytPlayerRef.current = new YT.Player('yt-player-target', {
          videoId: source.videoId,
          playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              if (destroyed) return;
              try {
                const dur = event.target.getDuration();
                if (dur && dur > 0) {
                  onDurationChange(dur);
                }
                event.target.playVideo();
                setIsPlaying(true);
              } catch {}
            },
            onStateChange: (event: any) => {
              if (destroyed) return;
              // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
              setIsPlaying(event.data === 1);
            },
          },
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube player:', err);
      }
    };

    initPlayer();

    // Time ticker for YouTube player
    ytIntervalRef.current = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const curr = ytPlayerRef.current.getCurrentTime();
          if (typeof curr === 'number' && !isNaN(curr)) {
            onTimeUpdate(curr);

            // Loop checking
            if (isLooping && curr >= endTime) {
              ytPlayerRef.current.seekTo(startTime, true);
            }
          }
        } catch {}
      }
    }, 150);

    return () => {
      destroyed = true;
      clearInterval(ytIntervalRef.current);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [source.videoId, isYouTube, isLooping, startTime, endTime, onDurationChange, onTimeUpdate]);

  // Sync play/pause state for both Native and YouTube
  const togglePlay = useCallback(() => {
    if (isYouTube && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.playVideo();
        }
      } catch {}
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isYouTube, isPlaying, videoRef]);

  // Frame stepping
  const stepFrame = (frames: number) => {
    const delta = frames * (1 / 30);

    if (isYouTube && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
        const nextT = Math.max(0, Math.min(duration, currentTime + delta));
        ytPlayerRef.current.seekTo(nextT, true);
        onTimeUpdate(nextT);
      } catch {}
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    const newTime = Math.max(0, Math.min(duration, video.currentTime + delta));
    video.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  const seekRelative = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));

    if (isYouTube && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(newTime, true);
        onTimeUpdate(newTime);
      } catch {}
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  // Loop checking for Native Video
  useEffect(() => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;

    const handleTime = () => {
      onTimeUpdate(video.currentTime);

      if (isLooping && video.currentTime >= endTime) {
        video.currentTime = startTime;
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    };

    video.addEventListener('timeupdate', handleTime);
    return () => video.removeEventListener('timeupdate', handleTime);
  }, [videoRef, isYouTube, isLooping, startTime, endTime, onTimeUpdate]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    const nextMuted = newVol === 0;
    setIsMuted(nextMuted);

    if (isYouTube && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(newVol * 100);
        if (nextMuted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch {}
      return;
    }

    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = nextMuted;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (isYouTube && ytPlayerRef.current) {
      try {
        if (nextMuted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      } catch {}
      return;
    }

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);

    if (isYouTube && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setPlaybackRate(rate);
      } catch {}
      return;
    }

    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  return (
    <div className="bg-surface-card border border-stone rounded-md overflow-hidden flex flex-col shadow-minimal">
      {/* Video Screen Container */}
      <div className="relative bg-black w-full aspect-video flex items-center justify-center overflow-hidden">
        {isYouTube ? (
          /* Official Interactive YouTube Player */
          <div className="w-full h-full relative">
            <div id="yt-player-target" className="w-full h-full" />
          </div>
        ) : source.isEmbedOnly && source.embedUrl ? (
          /* Generic Platform Embed (IG / FB) */
          <div className="w-full h-full relative">
            <iframe
              src={source.embedUrl}
              className="w-full h-full border-0"
              title={source.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          /* Native HTML5 Video Player */
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={source.url}
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => {
                const vid = e.currentTarget;
                if (vid.duration) onDurationChange(vid.duration);
              }}
              playsInline
            />

            {/* Optional Aspect Ratio Composition Guides */}
            {guideRatio === '9:16' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="h-full aspect-[9/16] border-2 border-dashed border-coral opacity-70" />
              </div>
            )}
            {guideRatio === '1:1' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="h-full aspect-square border-2 border-dashed border-lime opacity-70" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="p-2.5 sm:p-3 bg-ivory border-t border-stone flex flex-wrap items-center justify-between gap-2.5 text-xs select-none">
        {/* Left: Playback & Step Controls */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {/* Main Play / Pause */}
          <button
            onClick={togglePlay}
            className="p-2 bg-coral text-white rounded hover:bg-coral-hover transition-colors shadow-minimal"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          {/* Jump -5s */}
          <button
            onClick={() => seekRelative(-5)}
            className="px-2 py-1.5 text-botanical hover:bg-surface border border-stone rounded font-mono text-[11px]"
            title="Seek -5s (Left Arrow)"
          >
            -5s
          </button>

          {/* Step Back 1 Frame */}
          <button
            onClick={() => stepFrame(-1)}
            className="px-2 py-1.5 text-botanical hover:bg-surface border border-stone rounded font-mono text-[11px]"
            title="Step Back 1 Frame (,)"
          >
            -1f
          </button>

          {/* Step Forward 1 Frame */}
          <button
            onClick={() => stepFrame(1)}
            className="px-2 py-1.5 text-botanical hover:bg-surface border border-stone rounded font-mono text-[11px]"
            title="Step Forward 1 Frame (.)"
          >
            +1f
          </button>

          {/* Jump +5s */}
          <button
            onClick={() => seekRelative(5)}
            className="px-2 py-1.5 text-botanical hover:bg-surface border border-stone rounded font-mono text-[11px]"
            title="Seek +5s (Right Arrow)"
          >
            +5s
          </button>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center space-x-1 pl-1.5 border-l border-stone">
            <button
              onClick={toggleMute}
              className="p-1 text-olive hover:text-botanical"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-14 lg:w-16 accent-coral cursor-pointer"
            />
          </div>
        </div>

        {/* Center: Precision Timecode Badge */}
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <span className="font-bold text-coral text-xs sm:text-sm">
            {formatTimestamp(currentTime, true)}
          </span>
          <span className="text-stone">/</span>
          <span className="text-olive text-xs sm:text-sm">
            {formatTimestamp(duration, true)}
          </span>
        </div>

        {/* Right: Aspect Ratio Guides & Speed */}
        <div className="flex items-center space-x-1.5">
          {/* Framing Guides */}
          <div className="hidden sm:flex items-center space-x-0.5 border border-stone rounded p-0.5 bg-surface text-[11px] font-mono">
            <button
              onClick={() => setGuideRatio('none')}
              className={`px-1.5 py-0.5 rounded ${guideRatio === 'none' ? 'bg-botanical text-white' : 'text-olive'}`}
              title="Full Frame"
            >
              Full
            </button>
            <button
              onClick={() => setGuideRatio('9:16')}
              className={`px-1.5 py-0.5 rounded ${guideRatio === '9:16' ? 'bg-coral text-white font-bold' : 'text-olive'}`}
              title="9:16 Vertical Guide"
            >
              9:16
            </button>
            <button
              onClick={() => setGuideRatio('1:1')}
              className={`px-1.5 py-0.5 rounded ${guideRatio === '1:1' ? 'bg-lime text-botanical font-bold' : 'text-olive'}`}
              title="1:1 Square Guide"
            >
              1:1
            </button>
          </div>

          {/* Speed Selector */}
          <select
            value={playbackRate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            className="px-1.5 sm:px-2 py-1 bg-surface border border-stone rounded text-botanical font-mono text-xs cursor-pointer outline-none"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>
        </div>
      </div>
    </div>
  );
};
