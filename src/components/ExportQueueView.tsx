import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  RotateCcw, 
  XCircle, 
  CheckCircle, 
  Clock, 
  Terminal, 
  Archive, 
  FileVideo, 
  AlertCircle,
  Play
} from 'lucide-react';
import JSZip from 'jszip';
import { ExportJob } from '../types';
import { formatTimestamp } from '../utils/timecode';

interface ExportQueueViewProps {
  jobs: ExportJob[];
  onRetryJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

export const ExportQueueView: React.FC<ExportQueueViewProps> = ({
  jobs,
  onRetryJob,
  onCancelJob,
  onClearCompleted,
  onClearAll,
}) => {
  const [selectedLogJob, setSelectedLogJob] = useState<ExportJob | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const completedJobs = jobs.filter((j) => j.status === 'completed' && j.outputBlob);

  const handleDownloadSingle = (job: ExportJob) => {
    if (!job.outputBlob && !job.outputUrl) return;
    const url = job.outputUrl || URL.createObjectURL(job.outputBlob!);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.outputFileName || `${job.clipName.replace(/[^a-z0-9_-]/gi, '_')}.${job.preset.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAllZip = async () => {
    if (completedJobs.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      completedJobs.forEach((job, idx) => {
        const fileName = job.outputFileName || `clip_${String(idx + 1).padStart(2, '0')}_${job.clipName.replace(/[^a-z0-9_-]/gi, '_')}.${job.preset.format}`;
        if (job.outputBlob) {
          zip.file(fileName, job.outputBlob);
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clipforge_batch_export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP bundle:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue Header & Actions */}
      <div className="bg-surface-card border border-stone rounded-md p-6 shadow-minimal flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-base text-botanical">
            Render Queue & Batch Dispatch
          </h2>
          <p className="text-xs text-olive">
            Isolated background execution engine with frame synchronization and metadata stripping.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {completedJobs.length > 0 && (
            <button
              onClick={handleDownloadAllZip}
              disabled={isZipping}
              className="px-4 py-2 bg-forest text-white hover:bg-forest/90 rounded text-xs font-semibold flex items-center space-x-1.5 shadow-minimal transition-colors disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Bundling ZIP...' : `Download All as ZIP (${completedJobs.length})`}</span>
            </button>
          )}

          {jobs.some((j) => j.status === 'completed' || j.status === 'error') && (
            <button
              onClick={onClearCompleted}
              className="px-3 py-2 bg-surface hover:bg-stone text-botanical border border-stone rounded text-xs font-medium"
            >
              Clear Finished
            </button>
          )}

          {jobs.length > 0 && (
            <button
              onClick={onClearAll}
              className="px-3 py-2 bg-white hover:bg-crimson-subtle text-crimson border border-stone rounded text-xs font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="bg-surface-card border border-stone rounded-md p-12 text-center text-olive">
            <FileVideo className="w-8 h-8 text-stone mx-auto mb-2" />
            <p className="font-sans text-xs">No export jobs in queue.</p>
            <p className="text-[11px] text-olive mt-1">
              Select timeframes in the Quick Clipper or Multi-Clip Workspace and click "Export".
            </p>
          </div>
        ) : (
          jobs.map((job) => {
            const isProcessing = job.status === 'processing';
            const isCompleted = job.status === 'completed';
            const isError = job.status === 'error';
            const isQueued = job.status === 'queued';

            return (
              <div
                key={job.id}
                className="bg-surface-card border border-stone rounded-md p-4 shadow-minimal space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    {/* Status Icon */}
                    <div className="p-2 rounded bg-surface border border-stone">
                      {isProcessing && <div className="w-4 h-4 border-2 border-coral border-t-transparent rounded-full animate-spin" />}
                      {isCompleted && <CheckCircle className="w-4 h-4 text-forest" />}
                      {isError && <AlertCircle className="w-4 h-4 text-crimson" />}
                      {isQueued && <Clock className="w-4 h-4 text-olive" />}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-heading font-bold text-sm text-botanical">
                          {job.clipName}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-stone text-olive uppercase">
                          {job.preset.aspectRatio} • {job.preset.format} • {job.preset.engine}
                        </span>
                        {job.preset.cleanMetadata && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-lime-subtle border border-lime text-botanical font-semibold">
                            Cleaned Metadata
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-olive mt-0.5">
                        Source: <span className="text-botanical">{job.sourceTitle}</span> | Range:{' '}
                        <span className="text-botanical">
                          {formatTimestamp(job.start)} → {formatTimestamp(job.end)} ({formatTimestamp(job.duration)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-2">
                    {isCompleted && (
                      <button
                        onClick={() => handleDownloadSingle(job)}
                        className="px-3 py-1.5 bg-coral text-white hover:bg-coral-hover rounded text-xs font-semibold flex items-center space-x-1 shadow-minimal"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}

                    {isProcessing && (
                      <button
                        onClick={() => onCancelJob(job.id)}
                        className="px-3 py-1.5 bg-white border border-stone text-crimson hover:bg-crimson-subtle rounded text-xs font-medium flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}

                    {isError && (
                      <button
                        onClick={() => onRetryJob(job.id)}
                        className="px-3 py-1.5 bg-surface hover:bg-stone text-botanical border border-stone rounded text-xs font-medium flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-coral" />
                        <span>Retry</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedLogJob(selectedLogJob?.id === job.id ? null : job)}
                      className="p-1.5 text-olive hover:text-botanical hover:bg-surface border border-stone rounded"
                      title="View Render Terminal Logs"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-olive">
                    <span>
                      {isProcessing ? 'Rendering in progress...' : isCompleted ? 'Export verified & ready' : isError ? `Failed: ${job.error}` : 'Waiting in scheduler...'}
                    </span>
                    <span className="font-semibold text-botanical">{job.progress}%</span>
                  </div>
                  <div className="w-full bg-stone h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        isError ? 'bg-crimson' : isCompleted ? 'bg-forest' : 'bg-coral'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>

                {/* Log Terminal Accordion */}
                {selectedLogJob?.id === job.id && (
                  <div className="mt-3 p-3 bg-botanical text-white font-mono text-[11px] rounded space-y-1 max-h-40 overflow-y-auto">
                    <div className="text-olive text-[10px] uppercase tracking-wider border-b border-botanical-light pb-1 mb-1">
                      Render Session Diagnostics (Job: {job.id})
                    </div>
                    {job.log.map((logMsg, lIdx) => (
                      <div key={lIdx} className="leading-relaxed">
                        <span className="text-lime mr-2">›</span>
                        {logMsg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
