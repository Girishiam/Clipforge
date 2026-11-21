import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ClipSource, 
  ClipRange, 
  ExportPreset, 
  ExportJob, 
  Project 
} from './types';
import { Navbar } from './components/Navbar';
import { UniversalUrlInput } from './components/UniversalUrlInput';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { TimeframeControls } from './components/TimeframeControls';
import { ClipCollectionTable } from './components/ClipCollectionTable';
import { ExportQueueView } from './components/ExportQueueView';
import { BulkTimeframeModal } from './components/BulkTimeframeModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ShareablePlanningModal } from './components/ShareablePlanningModal';
import { executeClipExport } from './services/clippingEngine';
import { 
  getAllProjects, 
  saveProject, 
  saveExportedClip, 
  getStorageEstimate 
} from './services/storage';
import { exportClipsToCSV, formatTimestamp } from './utils/timecode';
import { 
  HeroFilmstripGraphic, 
  FeatureIngestGraphic, 
  FeaturePrecisionGraphic, 
  FeaturePrivacyGraphic, 
  EmptyShelfGraphic 
} from './components/AestheticGraphics';
import { 
  Plus, 
  RefreshCw, 
  Link as LinkIcon, 
  FileVideo, 
  CheckCircle2, 
  ShieldCheck, 
  Scissors, 
  Sparkles,
  Zap,
  Lock,
  ChevronDown,
  Layers
} from 'lucide-react';

const DEFAULT_PRESET: ExportPreset = {
  id: 'preset-default',
  name: 'Standard Precision Export',
  aspectRatio: 'original',
  fitMode: 'crop',
  resolution: 'original',
  format: 'mp4',
  cleanMetadata: true,
  engine: 'precise',
};

const INITIAL_PROJECT: Project = {
  id: `proj-${Date.now()}`,
  name: 'My Clipping Project',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  sources: [],
  clips: {},
};

export const App: React.FC = () => {
  const [currentProject, setCurrentProject] = useState<Project>(INITIAL_PROJECT);
  const [activeSource, setActiveSource] = useState<ClipSource | null>(null);
  const [isChangingVideo, setIsChangingVideo] = useState<boolean>(false);

  // Timeframe & Player State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(10);
  const [duration, setDuration] = useState<number>(10);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  // Queue & Presets
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [currentPreset, setCurrentPreset] = useState<ExportPreset>(DEFAULT_PRESET);
  const [showQueueSection, setShowQueueSection] = useState<boolean>(false);

  // Modals & Feedback
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isShareableModalOpen, setIsShareableModalOpen] = useState(false);
  const [isDownloadingDirectClip, setIsDownloadingDirectClip] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const clipsShelfRef = useRef<HTMLDivElement>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // Load existing project or set initial
  useEffect(() => {
    getAllProjects().then((projects) => {
      if (projects.length > 0) {
        setCurrentProject(projects[0]);
        if (projects[0].sources.length > 0) {
          const first = projects[0].sources[0];
          setActiveSource(first);
          setDuration(first.duration);
          setEndTime(Math.min(first.duration, 10));
        }
      }
    });
  }, []);

  // Autosave Project to IndexedDB
  useEffect(() => {
    if (currentProject.id) {
      saveProject(currentProject).catch(console.error);
    }
  }, [currentProject]);

  // Active Clips for current source
  const currentClips = activeSource ? currentProject.clips[activeSource.id] || [] : [];

  const handleUpdateClips = (newClips: ClipRange[]) => {
    if (!activeSource) return;
    setCurrentProject((prev) => ({
      ...prev,
      updatedAt: Date.now(),
      clips: {
        ...prev.clips,
        [activeSource.id]: newClips,
      },
    }));
  };

  // Add Source handler (triggered instantly when URL pasted or file dropped)
  const handleSourceLoaded = (newSource: ClipSource) => {
    if (activeSource?.objectUrl && activeSource.objectUrl !== newSource.objectUrl) {
      try { URL.revokeObjectURL(activeSource.objectUrl); } catch {}
    }
    setActiveSource(newSource);
    setDuration(newSource.duration);
    setStartTime(0);
    setEndTime(Math.min(newSource.duration, 10));
    setCurrentTime(0);
    setIsChangingVideo(false);

    // Add to project sources if not present
    setCurrentProject((prev) => {
      const exists = prev.sources.some((s) => s.id === newSource.id);
      const updatedSources = exists ? prev.sources : [...prev.sources, newSource];
      return {
        ...prev,
        updatedAt: Date.now(),
        sources: updatedSources,
        activeSourceId: newSource.id,
      };
    });
  };

  // Timeframe handlers
  const handleRangeChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    if (end > duration) {
      setDuration(Math.ceil(end + 60));
    }
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
    try {
      const ytIframe = document.querySelector('#yt-player-target') as HTMLIFrameElement;
      if (ytIframe && ytIframe.contentWindow) {
        const targetOrigin = ytIframe.src ? new URL(ytIframe.src).origin : 'https://www.youtube.com';
        ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [start, true] }), targetOrigin);
      }
    } catch {}
    setCurrentTime(start);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    try {
      const ytIframe = document.querySelector('#yt-player-target') as HTMLIFrameElement;
      if (ytIframe && ytIframe.contentWindow) {
        const targetOrigin = ytIframe.src ? new URL(ytIframe.src).origin : 'https://www.youtube.com';
        ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [time, true] }), targetOrigin);
      }
    } catch {}
  };

  const handlePreviewSelection = () => {
    handleSeek(startTime);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    try {
      const ytIframe = document.querySelector('#yt-player-target') as HTMLIFrameElement;
      if (ytIframe && ytIframe.contentWindow) {
        const targetOrigin = ytIframe.src ? new URL(ytIframe.src).origin : 'https://www.youtube.com';
        ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), targetOrigin);
      }
    } catch {}
  };

  const handleAddClipRange = (name: string) => {
    if (!activeSource) return;
    const newClip: ClipRange = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name || `Clip ${currentClips.length + 1}`,
      start: startTime,
      end: endTime,
      duration: endTime - startTime,
    };
    handleUpdateClips([...currentClips, newClip]);
    showToast(`Saved "${newClip.name}" (${formatTimestamp(newClip.start, false)} - ${formatTimestamp(newClip.end, false)}) to shelf`);
  };

  // Single Clip Quick Export
  const handleQueueSingleClip = async (clip?: ClipRange) => {
    if (!activeSource) return;

    const cStart = clip ? clip.start : startTime;
    const cEnd = clip ? clip.end : endTime;
    const cName = clip ? clip.name : `Clip_${formatTimestamp(cStart, false).replace(/:/g, '-')}`;

    if (activeSource.isEmbedOnly) {
      setIsDownloadingDirectClip(true);
      showToast(`Clipping video from ${formatTimestamp(cStart, false)} to ${formatTimestamp(cEnd, false)}... ⚡`);

      try {
        const response = await fetch('/api/clip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: activeSource.originalUrl || activeSource.url,
            start: cStart,
            end: cEnd,
            title: cName,
            quality: currentPreset.resolution === '4k' ? '4k' : 'best',
          }),
        });

        if (!response.ok) {
          throw new Error('Direct clipping service error');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const cleanTitle = (cName || activeSource.title || 'Clip')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 30);
        a.download = `${cleanTitle}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 10000);

        showToast(`✓ Downloaded ${cleanTitle}.mp4!`);
      } catch (err: any) {
        console.warn('Direct URL download failed, opening fallback options:', err);
        setIsShareableModalOpen(true);
      } finally {
        setIsDownloadingDirectClip(false);
      }
      return;
    }

    const newJob: ExportJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sourceId: activeSource.id,
      sourceTitle: activeSource.title,
      clipId: clip?.id || 'quick-clip',
      clipName: cName,
      start: cStart,
      end: cEnd,
      duration: cEnd - cStart,
      preset: { ...currentPreset },
      status: 'queued',
      progress: 0,
      log: [`Job initialized for ${cName}`, `Range: ${cStart.toFixed(3)}s to ${cEnd.toFixed(3)}s`],
      createdAt: Date.now(),
    };

    setExportJobs((prev) => [newJob, ...prev]);
    setShowQueueSection(true);
  };

  // Bulk Export Dispatcher
  const handleBulkExport = async (clipsToExport: ClipRange[]) => {
    if (!activeSource) return;

    if (activeSource.isEmbedOnly) {
      setIsDownloadingDirectClip(true);
      showToast(`Downloading ${clipsToExport.length} clips... ⚡`);

      for (let i = 0; i < clipsToExport.length; i++) {
        const c = clipsToExport[i];
        try {
          showToast(`Clipping ${i + 1}/${clipsToExport.length}: "${c.name}"...`);
          const response = await fetch('/api/clip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: activeSource.originalUrl || activeSource.url,
              start: c.start,
              end: c.end,
              title: c.name,
              quality: currentPreset.resolution === '4k' ? '4k' : 'best',
            }),
          });
          if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${c.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 10000);
          }
        } catch (e) {
          console.error('Failed to export clip', c.name, e);
        }
      }
      setIsDownloadingDirectClip(false);
      showToast(`✓ All ${clipsToExport.length} clips downloaded!`);
      return;
    }

    const newJobs: ExportJob[] = clipsToExport.map((clip, idx) => ({
      id: `job-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      sourceId: activeSource.id,
      sourceTitle: activeSource.title,
      clipId: clip.id,
      clipName: clip.name,
      start: clip.start,
      end: clip.end,
      duration: clip.duration,
      preset: { ...currentPreset },
      status: 'queued',
      progress: 0,
      log: [`Batch job queued: ${clip.name}`],
      createdAt: Date.now() + idx,
    }));

    setExportJobs((prev) => [...newJobs, ...prev]);
    setShowQueueSection(true);
  };

  // Export Clips to CSV
  const handleExportCSV = () => {
    if (!activeSource || currentClips.length === 0) return;
    const csvContent = exportClipsToCSV(currentClips, activeSource.title);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSource.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_clips.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${currentClips.length} clips to CSV`);
  };

  // ================= Job Processing Queue Engine ================= //
  useEffect(() => {
    const nextJob = exportJobs.find((j) => j.status === 'queued');
    if (!nextJob || !videoRef.current) return;

    const isBusy = exportJobs.some((j) => j.status === 'processing');
    if (isBusy) return;

    setExportJobs((prev) =>
      prev.map((j) =>
        j.id === nextJob.id ? { ...j, status: 'processing', progress: 5 } : j
      )
    );

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    const runExport = async () => {
      try {
        const result = await executeClipExport(
          videoRef.current!,
          nextJob,
          (progress: number, message?: string) => {
            setExportJobs((prev) =>
              prev.map((j) =>
                j.id === nextJob.id
                  ? {
                      ...j,
                      progress,
                      log: message ? [...j.log, message] : j.log,
                    }
                  : j
              )
            );
          },
          abortController.signal
        );

        const fileName = `${nextJob.clipName.replace(/[^a-z0-9_-]/gi, '_')}.${nextJob.preset.format}`;

        setExportJobs((prev) =>
          prev.map((j) =>
            j.id === nextJob.id
              ? {
                  ...j,
                  status: 'completed',
                  progress: 100,
                  outputBlob: result.blob,
                  outputUrl: result.url,
                  outputFileName: fileName,
                  log: [...j.log, `Render complete! Size: ${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB`],
                }
              : j
          )
        );

        saveExportedClip({
          id: nextJob.id,
          clipName: nextJob.clipName,
          sourceTitle: nextJob.sourceTitle,
          start: nextJob.start,
          end: nextJob.end,
          duration: nextJob.duration,
          aspectRatio: nextJob.preset.aspectRatio,
          format: nextJob.preset.format,
          blob: result.blob,
          cleanMetadata: nextJob.preset.cleanMetadata,
        }).catch(console.error);

      } catch (err: any) {
        if (err.name === 'AbortError') {
          setExportJobs((prev) =>
            prev.map((j) =>
              j.id === nextJob.id ? { ...j, status: 'cancelled', log: [...j.log, 'Job cancelled by user.'] } : j
            )
          );
        } else {
          setExportJobs((prev) =>
            prev.map((j) =>
              j.id === nextJob.id
                ? { ...j, status: 'error', error: err.message || 'Render failed', log: [...j.log, `Error: ${err.message}`] }
                : j
            )
          );
        }
      } finally {
        activeAbortControllerRef.current = null;
      }
    };

    runExport();
  }, [exportJobs]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play().catch(() => {});
          else videoRef.current.pause();
        }
      } else if (e.key === 'i' || e.key === 'I') {
        const nextEnd = currentTime >= endTime ? currentTime + 5 : endTime;
        handleRangeChange(currentTime, nextEnd);
      } else if (e.key === 'o' || e.key === 'O') {
        const nextStart = currentTime <= startTime ? Math.max(0, currentTime - 5) : startTime;
        handleRangeChange(nextStart, currentTime);
      } else if (e.key === 'p' || e.key === 'P') {
        handlePreviewSelection();
      } else if (e.key === 'l' || e.key === 'L') {
        setIsLooping((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        handleAddClipRange(`Clip ${currentClips.length + 1}`);
      } else if (e.key === 'e' || e.key === 'E') {
        handleQueueSingleClip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, currentClips, startTime, endTime]);

  const scrollToClips = () => {
    clipsShelfRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeJobsCount = exportJobs.filter((j) => j.status === 'queued' || j.status === 'processing').length;

  return (
    <div className="min-h-screen bg-ivory font-sans text-botanical flex flex-col selection:bg-coral selection:text-white">
      {/* Editorial Landing Navbar */}
      <Navbar
        activeSource={activeSource}
        clipCount={currentClips.length}
        onNewVideo={() => {
          setActiveSource(null);
          setIsChangingVideo(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onScrollToClips={scrollToClips}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Landing Page Flow */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* HERO / INGEST SECTION (When no video is loaded OR when user chooses to change video) */}
        {(!activeSource || isChangingVideo) && (
          <section className="text-center space-y-6 pt-4 pb-2">
            <div className="space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-stone text-xs font-mono text-olive shadow-minimal">
                <span className="w-2 h-2 rounded-full bg-coral animate-pulse"></span>
                <span>Instant Web Clipper • Frame Accuracy</span>
              </div>
              <h1 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl text-botanical tracking-tight leading-tight">
                Clip any video in seconds.
              </h1>
              <p className="text-sm sm:text-base text-olive max-w-lg mx-auto">
                Paste a YouTube, Instagram, or Facebook link, or drop a video file. Your preview opens automatically with frame-accurate start and end points.
              </p>
            </div>

            {/* Aesthetic Editorial Filmstrip & Caliper Illustration */}
            <div className="pt-1 pb-2">
              <HeroFilmstripGraphic />
            </div>

            <UniversalUrlInput 
              onSourceLoaded={handleSourceLoaded}
              autoFocus={true}
            />

            {activeSource && (
              <div className="pt-2">
                <button
                  onClick={() => setIsChangingVideo(false)}
                  className="text-xs text-olive hover:text-botanical underline font-mono"
                >
                  Cancel and return to current video
                </button>
              </div>
            )}
          </section>
        )}

        {/* ACTIVE VIDEO STUDIO SECTION (Revealed immediately when video is loaded) */}
        {activeSource && !isChangingVideo && (
          <section className="space-y-4 sm:space-y-6">
            {/* Source Information & Quick Switcher Bar */}
            <div className="bg-surface-card border border-stone rounded-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-minimal">
              <div className="flex items-center space-x-3 min-w-0">
                <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider bg-coral text-white shrink-0">
                  {activeSource.platform}
                </span>
                <span className="font-semibold text-xs sm:text-sm text-botanical truncate max-w-md" title={activeSource.title}>
                  {activeSource.title}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto justify-end">
                {activeSource.isEmbedOnly && (
                  <button
                    onClick={() => setIsShareableModalOpen(true)}
                    className="px-2.5 py-1 text-xs font-mono font-medium text-olive hover:text-coral border border-stone rounded bg-surface hover:bg-white transition-colors"
                    title="More export options & fallbacks"
                  >
                    Export Options
                  </button>
                )}
                <button
                  onClick={() => setIsChangingVideo(true)}
                  className="px-3 py-1 bg-surface hover:bg-white border border-stone text-botanical text-xs font-semibold rounded shadow-minimal flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 text-coral" />
                  <span>Change Video</span>
                </button>
              </div>
            </div>

            {/* Video Preview Player */}
            <VideoPlayer
              source={activeSource}
              videoRef={videoRef}
              currentTime={currentTime}
              duration={duration}
              startTime={startTime}
              endTime={endTime}
              isLooping={isLooping}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
            />

            {/* Frame Scrubbing Timeline */}
            <Timeline
              duration={duration}
              currentTime={currentTime}
              startTime={startTime}
              endTime={endTime}
              clips={currentClips}
              onSeek={handleSeek}
              onRangeChange={handleRangeChange}
            />

            {/* Precision Timeframe Controls & Actions */}
            <TimeframeControls
              startTime={startTime}
              endTime={endTime}
              duration={duration}
              currentTime={currentTime}
              isLooping={isLooping}
              isEmbed={!!activeSource?.isEmbedOnly}
              isDownloading={isDownloadingDirectClip}
              onRangeChange={handleRangeChange}
              onSeek={handleSeek}
              onPreviewSelection={handlePreviewSelection}
              onToggleLoop={() => setIsLooping(!isLooping)}
              onAddClip={(name) => {
                handleAddClipRange(name);
                scrollToClips();
              }}
              onQuickExport={() => handleQueueSingleClip()}
              onOpenOptions={() => setIsShareableModalOpen(true)}
            />
          </section>
        )}

        {/* YOUR CLIPS SHELF (Directly below player) */}
        <section ref={clipsShelfRef} id="clips-shelf" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="font-heading font-bold text-lg sm:text-xl text-botanical tracking-tight">
                Your Saved Clips
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-lime text-botanical text-xs font-mono font-bold">
                {currentClips.length}
              </span>
            </div>

            {currentClips.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-surface hover:bg-white border border-stone text-xs font-mono text-botanical rounded shadow-minimal transition-colors"
              >
                Export CSV List
              </button>
            )}
          </div>

          {activeSource && currentClips.length > 0 ? (
            <ClipCollectionTable
              clips={currentClips}
              sourceTitle={activeSource.title}
              onClipsChange={handleUpdateClips}
              onPreviewClip={(clip) => {
                handleRangeChange(clip.start, clip.end);
                handlePreviewSelection();
                window.scrollTo({ top: 120, behavior: 'smooth' });
              }}
              onExportClip={(clip) => handleQueueSingleClip(clip)}
              onBulkExport={handleBulkExport}
              onOpenBulkModal={() => setIsBulkModalOpen(true)}
              onExportCSV={handleExportCSV}
            />
          ) : (
            <div className="bg-surface-card border border-stone rounded-lg p-6 sm:p-10 text-center text-olive space-y-3 shadow-minimal">
              <EmptyShelfGraphic />
              <p className="text-sm font-semibold text-botanical">No clips added to shelf yet</p>
              <p className="text-xs text-olive max-w-sm mx-auto">
                Set your start and end timeframe in the controls above and click &quot;+ Add Range&quot; to save clips from this video.
              </p>
            </div>
          )}
        </section>

        {/* ACTIVE EXPORT QUEUE (Shows if export jobs are active or finished) */}
        {(showQueueSection || exportJobs.length > 0) && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-botanical flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-coral animate-pulse"></span>
                <span>Export Queue & Downloads</span>
              </h3>
              <button
                onClick={() => setShowQueueSection(false)}
                className="text-xs font-mono text-olive hover:text-botanical"
              >
                Hide Queue
              </button>
            </div>

            <ExportQueueView
              jobs={exportJobs}
              onRetryJob={(id) => {
                setExportJobs((prev) =>
                  prev.map((j) => (j.id === id ? { ...j, status: 'queued', progress: 0 } : j))
                );
              }}
              onCancelJob={(id) => {
                if (activeAbortControllerRef.current) {
                  activeAbortControllerRef.current.abort();
                }
              }}
              onClearCompleted={() => {
                setExportJobs((prev) => prev.filter((j) => j.status !== 'completed'));
              }}
              onClearAll={() => setExportJobs([])}
            />
          </section>
        )}

        {/* LANDING PAGE HOW-IT-WORKS SECTION */}
        <section className="border-t border-stone pt-10 sm:pt-14 space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="font-heading font-bold text-xl sm:text-2xl text-botanical tracking-tight">
              Designed for Speed & Precision
            </h3>
            <p className="text-xs sm:text-sm text-olive">
              Everything happens directly inside your browser. No wait lists, no sign-ups, and no bloated timelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-surface-card border border-stone rounded-lg p-5 space-y-3 shadow-minimal flex flex-col justify-between">
              <div>
                <FeatureIngestGraphic className="w-full h-24 mb-3" />
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-surface border border-stone text-[10px] font-mono font-bold text-coral">01</span>
                  <h4 className="font-heading font-bold text-sm text-botanical">Instant Auto-Preview</h4>
                </div>
                <p className="text-xs text-olive leading-relaxed">
                  Paste any YouTube, Instagram, or Facebook link. ClipForge immediately parses the media and initializes playback with zero required setup.
                </p>
              </div>
            </div>

            <div className="bg-surface-card border border-stone rounded-lg p-5 space-y-3 shadow-minimal flex flex-col justify-between">
              <div>
                <FeaturePrecisionGraphic className="w-full h-24 mb-3" />
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-surface border border-stone text-[10px] font-mono font-bold text-coral">02</span>
                  <h4 className="font-heading font-bold text-sm text-botanical">Millisecond Boundaries</h4>
                </div>
                <p className="text-xs text-olive leading-relaxed">
                  Type exact timestamps like 57:58 or 1.01.58, click one-touch presets (15s, 30s, 60s), or scrub with visual handles on the interactive timeline.
                </p>
              </div>
            </div>

            <div className="bg-surface-card border border-stone rounded-lg p-5 space-y-3 shadow-minimal flex flex-col justify-between">
              <div>
                <FeaturePrivacyGraphic className="w-full h-24 mb-3" />
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-surface border border-stone text-[10px] font-mono font-bold text-coral">03</span>
                  <h4 className="font-heading font-bold text-sm text-botanical">Zero Cloud Privacy</h4>
                </div>
                <p className="text-xs text-olive leading-relaxed">
                  Processing runs 100% on your device using client-side WebAssembly and HTML5 Canvas. Your raw media is never uploaded to any remote server.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-stone bg-surface mt-12 py-8 px-4 sm:px-8 text-xs text-olive select-none">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-bold text-botanical">ClipForge</span>
            <span>•</span>
            <span>Creative Video Tool</span>
          </div>

          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span>Space: Play/Pause</span>
            <span>•</span>
            <span>I/O: In/Out Points</span>
            <span>•</span>
            <span>P: Preview Clip</span>
          </div>

          <div className="text-[11px] font-mono">
            100% Client-Side
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isBulkModalOpen && (
        <BulkTimeframeModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          maxDuration={duration}
          onAddClips={(newClips, mode) => {
            if (mode === 'replace') {
              handleUpdateClips(newClips);
            } else {
              handleUpdateClips([...currentClips, ...newClips]);
            }
            scrollToClips();
          }}
        />
      )}

      {isShortcutsOpen && (
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      )}

      {isShareableModalOpen && activeSource && (
        <ShareablePlanningModal
          isOpen={isShareableModalOpen}
          onClose={() => setIsShareableModalOpen(false)}
          source={activeSource}
          clips={currentClips.length > 0 ? currentClips : [
            {
              id: 'current-range',
              name: 'Active Clip',
              start: startTime,
              end: endTime,
              duration: endTime - startTime,
            }
          ]}
          onMediaFileLinked={(file: File) => {
            const objectUrl = URL.createObjectURL(file);
            const linkedSource: ClipSource = {
              ...activeSource,
              isEmbedOnly: false,
              file: file,
              objectUrl: objectUrl,
              url: objectUrl,
            };
            setActiveSource(linkedSource);
            setIsShareableModalOpen(false);
          }}
        />
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-botanical text-white font-mono text-xs rounded-md shadow-hover border border-stone/30 flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-lime shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};