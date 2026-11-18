import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  NavigationTab, 
  ClipSource, 
  ClipRange, 
  ExportPreset, 
  ExportJob, 
  Project 
} from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { UniversalUrlInput } from './components/UniversalUrlInput';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { TimeframeControls } from './components/TimeframeControls';
import { ClipCollectionTable } from './components/ClipCollectionTable';
import { BulkTimeframeModal } from './components/BulkTimeframeModal';
import { ExportQueueView } from './components/ExportQueueView';
import { BatchClipperView } from './components/BatchClipperView';
import { SavedClipsView } from './components/SavedClipsView';
import { SettingsView } from './components/SettingsView';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ShareablePlanningModal } from './components/ShareablePlanningModal';
import { executeClipExport } from './services/clippingEngine';
import { 
  getAllProjects, 
  saveProject, 
  saveExportedClip, 
  getStorageEstimate,
  exportProjectManifest
} from './services/storage';
import { exportClipsToCSV } from './utils/timecode';

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
  // Navigation & Project
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [currentProject, setCurrentProject] = useState<Project>(INITIAL_PROJECT);
  const [storageUsage, setStorageUsage] = useState({ usedBytes: 0, totalBytes: 0, percentage: 0 });

  // Mobile multi-view tab selector ('player' or 'table')
  const [mobileMultiView, setMobileMultiView] = useState<'player' | 'table'>('player');

  // Active Media & Timeframes
  const [activeSource, setActiveSource] = useState<ClipSource | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(10);
  const [duration, setDuration] = useState<number>(10);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  // Queue & Presets
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [currentPreset, setCurrentPreset] = useState<ExportPreset>(DEFAULT_PRESET);

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isShareableModalOpen, setIsShareableModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // Refresh Storage Estimate
  const refreshStorage = useCallback(() => {
    getStorageEstimate().then(setStorageUsage);
  }, []);

  useEffect(() => {
    refreshStorage();
  }, [refreshStorage]);

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

  // Add Source handler
  const handleSourceLoaded = (newSource: ClipSource) => {
    setActiveSource(newSource);
    setDuration(newSource.duration);
    setStartTime(0);
    setEndTime(Math.min(newSource.duration, 10));
    setCurrentTime(0);

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

    // Jump to Quick Clipper view on source load
    setCurrentTab('quick');
  };

  // Timeframe handlers
  const handleRangeChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
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
        ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [time, true] }), '*');
      }
    } catch {}
  };

  const handlePreviewSelection = () => {
    handleSeek(startTime);
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(() => {});
    }
    try {
      const ytIframe = document.querySelector('#yt-player-target') as HTMLIFrameElement;
      if (ytIframe && ytIframe.contentWindow) {
        ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [startTime, true] }), '*');
        ytIframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
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
  };

  // Single Clip Quick Export
  const handleQueueSingleClip = (clip?: ClipRange) => {
    if (!activeSource) return;

    if (activeSource.isEmbedOnly) {
      setIsShareableModalOpen(true);
      return;
    }

    const cStart = clip ? clip.start : startTime;
    const cEnd = clip ? clip.end : endTime;
    const cName = clip ? clip.name : `Clip_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`;

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
    setCurrentTab('queue');
  };

  // Bulk Export Dispatcher
  const handleBulkExport = (clipsToExport: ClipRange[]) => {
    if (!activeSource) return;
    if (activeSource.isEmbedOnly) {
      setIsShareableModalOpen(true);
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
    setCurrentTab('queue');
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

    executeClipExport(
      videoRef.current,
      nextJob,
      (progress, logMsg) => {
        setExportJobs((prev) =>
          prev.map((j) => {
            if (j.id === nextJob.id) {
              const updatedLog = logMsg ? [...j.log, logMsg] : j.log;
              return { ...j, progress, log: updatedLog };
            }
            return j;
          })
        );
      },
      abortController.signal
    )
      .then(async (result) => {
        setExportJobs((prev) =>
          prev.map((j) =>
            j.id === nextJob.id
              ? {
                  ...j,
                  status: 'completed',
                  progress: 100,
                  outputBlob: result.blob,
                  outputUrl: result.url,
                  sizeBytes: result.sizeBytes,
                  completedAt: Date.now(),
                  log: [...j.log, `Render complete: Output size ${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB`],
                }
              : j
          )
        );

        await saveExportedClip({
          id: nextJob.id,
          clipName: nextJob.clipName,
          sourceTitle: nextJob.sourceTitle,
          start: nextJob.start,
          end: nextJob.end,
          duration: nextJob.duration,
          aspectRatio: nextJob.preset.aspectRatio,
          format: result.format,
          blob: result.blob,
          cleanMetadata: nextJob.preset.cleanMetadata,
        });

        refreshStorage();
      })
      .catch((err) => {
        setExportJobs((prev) =>
          prev.map((j) =>
            j.id === nextJob.id
              ? {
                  ...j,
                  status: 'error',
                  error: err.message,
                  log: [...j.log, `Error: ${err.message}`],
                }
              : j
          )
        );
      });
  }, [exportJobs, refreshStorage]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play().catch(() => {});
          else videoRef.current.pause();
        }
      } else if (e.key === '[') {
        setStartTime(currentTime);
      } else if (e.key === ']') {
        setEndTime(currentTime);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(duration, currentTime + 5));
      } else if (e.key === ',') {
        handleSeek(Math.max(0, currentTime - 1 / 30));
      } else if (e.key === '.') {
        handleSeek(Math.min(duration, currentTime + 1 / 30));
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
  }, [currentTime, duration, currentClips]);

  return (
    <div className="flex h-screen bg-ivory font-sans text-botanical overflow-hidden select-none">
      {/* Studio Editorial Sidebar (Desktop + Mobile Bottom Navigation) */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        activeSource={activeSource}
        activeClipCount={currentClips.length}
        queueCount={exportJobs.filter((j) => j.status === 'queued' || j.status === 'processing').length}
        storageUsage={storageUsage}
      />

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          currentProject={currentProject}
          onProjectChange={setCurrentProject}
          onNewProject={() => {
            const newProj: Project = {
              id: `proj-${Date.now()}`,
              name: `Project ${new Date().toLocaleDateString()}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              sources: [],
              clips: {},
            };
            setCurrentProject(newProj);
            setActiveSource(null);
            setCurrentTab('home');
          }}
          onExportManifest={() => {
            const json = exportProjectManifest(currentProject);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentProject.name.toLowerCase().replace(/\s+/g, '_')}_manifest.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
          activeSource={activeSource}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 md:pb-6">
          {/* TAB 1: HOME / INGEST */}
          {currentTab === 'home' && (
            <UniversalUrlInput
              onSourceLoaded={handleSourceLoaded}
            />
          )}

          {/* TAB 2: QUICK CLIPPER */}
          {currentTab === 'quick' && (
            <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
              {activeSource ? (
                <>
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

                  <Timeline
                    duration={duration}
                    currentTime={currentTime}
                    startTime={startTime}
                    endTime={endTime}
                    clips={currentClips}
                    onSeek={handleSeek}
                    onRangeChange={handleRangeChange}
                  />

                  <TimeframeControls
                    startTime={startTime}
                    endTime={endTime}
                    duration={duration}
                    currentTime={currentTime}
                    isLooping={isLooping}
                    onRangeChange={handleRangeChange}
                    onSeek={handleSeek}
                    onPreviewSelection={handlePreviewSelection}
                    onToggleLoop={() => setIsLooping(!isLooping)}
                    onAddClip={(name) => {
                      handleAddClipRange(name);
                      setCurrentTab('multi');
                    }}
                    onQuickExport={() => handleQueueSingleClip()}
                  />
                </>
              ) : (
                <div className="bg-surface-card border border-stone rounded-md p-8 sm:p-12 text-center text-olive">
                  <p className="font-sans text-sm font-semibold text-botanical mb-1">
                    No active video source loaded.
                  </p>
                  <p className="text-xs text-olive mb-4">
                    Import a video file or paste a link to start clipping.
                  </p>
                  <button
                    onClick={() => setCurrentTab('home')}
                    className="px-4 py-2 bg-coral text-white font-semibold rounded text-xs hover:bg-coral-hover shadow-minimal"
                  >
                    Go to Media Ingest
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MULTI-CLIP WORKSPACE */}
          {currentTab === 'multi' && (
            <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
              {activeSource ? (
                <>
                  {/* Mobile switcher between Player and Clips Table */}
                  <div className="lg:hidden flex items-center bg-surface border border-stone p-1 rounded-md text-xs font-medium font-mono">
                    <button
                      onClick={() => setMobileMultiView('player')}
                      className={`flex-1 py-1.5 rounded transition-colors ${
                        mobileMultiView === 'player' ? 'bg-botanical text-white font-bold' : 'text-olive'
                      }`}
                    >
                      Player & Trim
                    </button>
                    <button
                      onClick={() => setMobileMultiView('table')}
                      className={`flex-1 py-1.5 rounded transition-colors ${
                        mobileMultiView === 'table' ? 'bg-botanical text-white font-bold' : 'text-olive'
                      }`}
                    >
                      Clips Table ({currentClips.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Video & Timeline & Timeframe */}
                    <div className={`lg:col-span-7 space-y-4 ${mobileMultiView === 'table' ? 'hidden lg:block' : 'block'}`}>
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

                      <Timeline
                        duration={duration}
                        currentTime={currentTime}
                        startTime={startTime}
                        endTime={endTime}
                        clips={currentClips}
                        onSeek={handleSeek}
                        onRangeChange={handleRangeChange}
                      />

                      <TimeframeControls
                        startTime={startTime}
                        endTime={endTime}
                        duration={duration}
                        currentTime={currentTime}
                        isLooping={isLooping}
                        onRangeChange={handleRangeChange}
                        onSeek={handleSeek}
                        onPreviewSelection={handlePreviewSelection}
                        onToggleLoop={() => setIsLooping(!isLooping)}
                        onAddClip={handleAddClipRange}
                        onQuickExport={() => handleQueueSingleClip()}
                      />
                    </div>

                    {/* Right: Clip Collection Table */}
                    <div className={`lg:col-span-5 ${mobileMultiView === 'player' ? 'hidden lg:block' : 'block'}`}>
                      <ClipCollectionTable
                        clips={currentClips}
                        sourceTitle={activeSource.title}
                        onClipsChange={handleUpdateClips}
                        onPreviewClip={(clip) => {
                          setStartTime(clip.start);
                          setEndTime(clip.end);
                          handleSeek(clip.start);
                          setMobileMultiView('player');
                        }}
                        onExportClip={(clip) => handleQueueSingleClip(clip)}
                        onBulkExport={handleBulkExport}
                        onOpenBulkModal={() => setIsBulkModalOpen(true)}
                        onExportCSV={handleExportCSV}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-surface-card border border-stone rounded-md p-8 sm:p-12 text-center text-olive">
                  <p className="font-sans text-xs">No media loaded.</p>
                  <button
                    onClick={() => setCurrentTab('home')}
                    className="mt-3 px-4 py-2 bg-coral text-white font-semibold rounded text-xs hover:bg-coral-hover shadow-minimal"
                  >
                    Load Video Source
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BATCH CLIPPER */}
          {currentTab === 'batch' && (
            <BatchClipperView
              sources={currentProject.sources}
              clipsMap={currentProject.clips}
              currentPreset={currentPreset}
              onPresetChange={setCurrentPreset}
              onDispatchBatch={(selectedSourceIds, preset, pattern) => {
                const batchJobs: ExportJob[] = [];
                selectedSourceIds.forEach((sid) => {
                  const src = currentProject.sources.find((s) => s.id === sid);
                  const srcClips = currentProject.clips[sid] || [];
                  if (!src) return;

                  srcClips.forEach((clip, idx) => {
                    const formattedName = pattern
                      .replace('{source}', src.title.replace(/[^a-z0-9_-]/gi, '_'))
                      .replace('{clip}', clip.name.replace(/[^a-z0-9_-]/gi, '_'))
                      .replace('{num}', String(idx + 1).padStart(2, '0'));

                    batchJobs.push({
                      id: `batch-${Date.now()}-${sid}-${idx}`,
                      sourceId: sid,
                      sourceTitle: src.title,
                      clipId: clip.id,
                      clipName: formattedName,
                      start: clip.start,
                      end: clip.end,
                      duration: clip.duration,
                      preset,
                      status: 'queued',
                      progress: 0,
                      log: [`Batch job scheduled for ${formattedName}`],
                      createdAt: Date.now() + idx,
                    });
                  });
                });

                setExportJobs((prev) => [...batchJobs, ...prev]);
                setCurrentTab('queue');
              }}
              onRemoveSource={(sourceId) => {
                setCurrentProject((prev) => ({
                  ...prev,
                  sources: prev.sources.filter((s) => s.id !== sourceId),
                }));
                if (activeSource?.id === sourceId) {
                  setActiveSource(null);
                }
              }}
            />
          )}

          {/* TAB 5: SAVED CLIPS ARCHIVE */}
          {currentTab === 'saved' && <SavedClipsView />}

          {/* TAB 6: EXPORT QUEUE & LOGS */}
          {currentTab === 'queue' && (
            <ExportQueueView
              jobs={exportJobs}
              onRetryJob={(id) => {
                setExportJobs((prev) =>
                  prev.map((j) => (j.id === id ? { ...j, status: 'queued', progress: 0 } : j))
                );
              }}
              onCancelJob={(id) => {
                activeAbortControllerRef.current?.abort();
                setExportJobs((prev) =>
                  prev.map((j) => (j.id === id ? { ...j, status: 'cancelled' } : j))
                );
              }}
              onClearCompleted={() => {
                setExportJobs((prev) => prev.filter((j) => j.status !== 'completed'));
              }}
              onClearAll={() => {
                setExportJobs([]);
              }}
            />
          )}

          {/* TAB 7: SETTINGS & STORAGE */}
          {currentTab === 'settings' && (
            <SettingsView
              defaultPreset={currentPreset}
              onPresetChange={setCurrentPreset}
              currentProject={currentProject}
              onProjectImport={(proj) => {
                setCurrentProject(proj);
                if (proj.sources.length > 0) {
                  setActiveSource(proj.sources[0]);
                }
              }}
              onClearStorage={() => {
                indexedDB.deleteDatabase('clipforge_db');
                alert('Storage cleared. Please refresh the page.');
              }}
            />
          )}
        </main>
      </div>

      {/* Bulk Timeframe Input Modal */}
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
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Shareable Planning Modal */}
      {activeSource && (
        <ShareablePlanningModal
          isOpen={isShareableModalOpen}
          onClose={() => setIsShareableModalOpen(false)}
          source={activeSource}
          clips={currentClips.length > 0 ? currentClips : [{ id: 'active-range', name: 'Active Selection', start: startTime, end: endTime, duration: endTime - startTime }]}
          onMediaFileLinked={(file) => {
            const objectUrl = URL.createObjectURL(file);
            const updatedSource: ClipSource = {
              ...activeSource,
              platform: 'local',
              url: objectUrl,
              file,
              objectUrl,
              isEmbedOnly: false,
            };
            setActiveSource(updatedSource);
            const newJob: ExportJob = {
              id: `job-${Date.now()}`,
              sourceId: updatedSource.id,
              sourceTitle: updatedSource.title,
              clipId: 'quick-clip',
              clipName: `Clip_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}`,
              start: startTime,
              end: endTime,
              duration: endTime - startTime,
              preset: { ...currentPreset },
              status: 'queued',
              progress: 0,
              log: [`Linked source media: ${file.name}`, `Cutting exact range: ${startTime.toFixed(3)}s to ${endTime.toFixed(3)}s`],
              createdAt: Date.now(),
            };
            setExportJobs((prev) => [newJob, ...prev]);
            setCurrentTab('queue');
          }}
        />
      )}
    </div>
  );
};
