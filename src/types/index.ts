export type SourcePlatform = 'local' | 'youtube' | 'instagram' | 'facebook' | 'direct_url';

export interface ClipSource {
  id: string;
  title: string;
  platform: SourcePlatform;
  url: string;
  originalUrl?: string;
  duration: number; // in seconds
  width?: number;
  height?: number;
  fps?: number;
  format?: string;
  file?: File;
  objectUrl?: string;
  isEmbedOnly?: boolean;
  embedUrl?: string;
  videoId?: string;
  author?: string;
  thumbnailUrl?: string;
  createdAt: number;
}

export interface ClipRange {
  id: string;
  name: string;
  start: number; // in seconds (float with millisecond precision)
  end: number;   // in seconds
  duration: number; // end - start
  notes?: string;
  tags?: string[];
  selected?: boolean;
  color?: string;
}

export type AspectRatioType = 'original' | '9:16' | '16:9' | '1:1' | '4:5';
export type FitMode = 'crop' | 'contain' | 'original';
export type ExportEngineMode = 'fast' | 'precise';

export interface ExportPreset {
  id: string;
  name: string;
  aspectRatio: AspectRatioType;
  fitMode: FitMode;
  resolution: 'original' | '1080p' | '720p' | '4k';
  format: 'mp4' | 'webm';
  cleanMetadata: boolean;
  engine: ExportEngineMode;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface ExportJob {
  id: string;
  sourceId: string;
  sourceTitle: string;
  clipId: string;
  clipName: string;
  start: number;
  end: number;
  duration: number;
  preset: ExportPreset;
  status: JobStatus;
  progress: number; // 0 - 100
  outputBlob?: Blob;
  outputUrl?: string;
  outputFileName?: string;
  error?: string;
  sizeBytes?: number;
  log: string[];
  createdAt: number;
  completedAt?: number;
}


export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sources: ClipSource[];
  clips: Record<string, ClipRange[]>; // sourceId -> ClipRange[]
  activeSourceId?: string;
}

export type NavigationTab = 
  | 'home'
  | 'quick'
  | 'multi'
  | 'batch'
  | 'saved'
  | 'queue'
  | 'settings';
