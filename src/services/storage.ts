import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project, ExportJob, ExportPreset } from '../types';

interface ClipForgeDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updated': number };
  };
  savedClips: {
    key: string;
    value: {
      id: string;
      clipName: string;
      sourceTitle: string;
      start: number;
      end: number;
      duration: number;
      aspectRatio: string;
      format: string;
      blob: Blob;
      sizeBytes: number;
      createdAt: number;
      cleanMetadata: boolean;
    };
    indexes: { 'by-created': number };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'clipforge_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ClipForgeDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ClipForgeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ClipForgeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('savedClips')) {
          const clipStore = db.createObjectStore('savedClips', { keyPath: 'id' });
          clipStore.createIndex('by-created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

// ================= Projects API ================= //

export async function getAllProjects(): Promise<Project[]> {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex('projects', 'by-updated');
    return all.reverse();
  } catch (err) {
    console.error('Failed to load projects from IndexedDB:', err);
    return [];
  }
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  // Strip non-serializable File objects from persistent state (keep metadata)
  const cleanProject: Project = {
    ...project,
    updatedAt: Date.now(),
    sources: project.sources.map(s => ({
      ...s,
      file: undefined, // File can be re-linked if needed
      objectUrl: undefined, // Object URLs expire across page reloads
    })),
  };
  await db.put('projects', cleanProject);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

// ================= Saved Clips API ================= //

export async function saveExportedClip(clipData: {
  id: string;
  clipName: string;
  sourceTitle: string;
  start: number;
  end: number;
  duration: number;
  aspectRatio: string;
  format: string;
  blob: Blob;
  cleanMetadata: boolean;
}): Promise<void> {
  const db = await getDB();
  await db.put('savedClips', {
    ...clipData,
    sizeBytes: clipData.blob.size,
    createdAt: Date.now(),
  });
}

export async function getAllSavedClips() {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex('savedClips', 'by-created');
    return all.reverse();
  } catch (err) {
    console.error('Failed to load saved clips:', err);
    return [];
  }
}

export async function deleteSavedClip(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('savedClips', id);
}

// ================= Settings API ================= //

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    const val = await db.get('settings', key);
    return val !== undefined ? val : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}

// ================= Storage Quota Estimator ================= //

export async function getStorageEstimate(): Promise<{ usedBytes: number; totalBytes: number; percentage: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usedBytes: usage,
      totalBytes: quota,
      percentage: quota > 0 ? Math.round((usage / quota) * 100) : 0,
    };
  }
  return { usedBytes: 0, totalBytes: 0, percentage: 0 };
}

// ================= Manifest Export / Import ================= //

export function exportProjectManifest(project: Project): string {
  const manifest = {
    clipForgeVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    project: {
      ...project,
      sources: project.sources.map(s => ({
        ...s,
        file: undefined,
        objectUrl: undefined,
      })),
    },
  };
  return JSON.stringify(manifest, null, 2);
}

export function importProjectManifest(jsonStr: string): Project {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.project || !parsed.project.id || !parsed.project.name) {
    throw new Error('Invalid ClipForge project manifest format.');
  }
  return {
    ...parsed.project,
    updatedAt: Date.now(),
  };
}
