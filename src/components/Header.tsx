import React, { useState } from 'react';
import { 
  FolderOpen, 
  Download, 
  HelpCircle, 
  Plus, 
  Check, 
  Edit3,
  Video
} from 'lucide-react';
import { Project, ClipSource, NavigationTab } from '../types';
import { formatTimestamp } from '../utils/timecode';

interface HeaderProps {
  currentTab: NavigationTab;
  currentProject: Project;
  onProjectChange: (project: Project) => void;
  onNewProject: () => void;
  onExportManifest: () => void;
  activeSource: ClipSource | null;
  onOpenShortcuts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currentProject,
  onProjectChange,
  onNewProject,
  onExportManifest,
  activeSource,
  onOpenShortcuts,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(currentProject.name);

  const getTabLabel = (tab: NavigationTab) => {
    switch (tab) {
      case 'home': return { title: 'Media Ingest', desc: 'Universal link resolver and local video upload' };
      case 'quick': return { title: 'Quick Clipper', desc: 'Single timeframe isolation and instant export' };
      case 'multi': return { title: 'Multi-Clip Workspace', desc: 'Multiple custom start and end ranges' };
      case 'batch': return { title: 'Batch Clipper', desc: 'Multi-source queue and batch packaging' };
      case 'saved': return { title: 'Saved Library', desc: 'Offline storage of exported video clips' };
      case 'queue': return { title: 'Export Queue', desc: 'Background render queue and ZIP packaging' };
      case 'settings': return { title: 'Settings', desc: 'Metadata sanitization, aspect presets, and backups' };
    }
  };

  const currentView = getTabLabel(currentTab);

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      onProjectChange({
        ...currentProject,
        name: titleInput.trim(),
        updatedAt: Date.now(),
      });
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="h-14 sm:h-16 bg-surface-card border-b border-stone px-3 sm:px-6 flex items-center justify-between shrink-0 select-none">
      {/* Mobile Brand / View Title & Context */}
      <div className="flex items-center space-x-3 sm:space-x-6 min-w-0">
        {/* Mobile Vector Logo */}
        <div className="md:hidden w-8 h-8 rounded-md bg-botanical flex items-center justify-center p-1 shrink-0">
          <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
            <rect x="4" y="6" width="32" height="28" rx="4" fill="#FAF8F2"/>
            <rect x="13" y="14" width="14" height="12" rx="2" fill="#C9E865"/>
            <path d="M15 13L25 27M25 13L15 27" stroke="#FE5936" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="min-w-0">
          <h1 className="font-heading font-bold text-sm sm:text-base text-botanical tracking-tight leading-tight truncate">
            {currentView.title}
          </h1>
          <p className="text-[11px] sm:text-xs text-olive hidden sm:block truncate">
            {currentView.desc}
          </p>
        </div>

        {/* Media Details Ribbon if active source exists */}
        {activeSource && (
          <div className="hidden xl:flex items-center space-x-3 pl-4 border-l border-stone text-xs font-mono">
            <span className="flex items-center space-x-1 text-botanical font-medium">
              <Video className="w-3.5 h-3.5 text-coral" />
              <span>{activeSource.width ? `${activeSource.width}x${activeSource.height}` : 'Video Stream'}</span>
            </span>
            <span className="text-stone">|</span>
            <span className="text-olive">
              Duration: <strong className="text-botanical">{formatTimestamp(activeSource.duration, false)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Project Switcher & Tools */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5">
        {/* Project Name & Edit */}
        <div className="flex items-center space-x-1.5 bg-surface px-2 sm:px-2.5 py-1 rounded border border-stone text-xs max-w-[140px] sm:max-w-xs">
          <FolderOpen className="w-3.5 h-3.5 text-olive shrink-0" />
          {isEditingTitle ? (
            <div className="flex items-center space-x-1">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="bg-white border border-stone px-1.5 py-0.5 rounded text-xs font-medium text-botanical outline-none w-20 sm:w-28"
                autoFocus
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 text-forest hover:bg-stone rounded"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTitleInput(currentProject.name);
                setIsEditingTitle(true);
              }}
              className="flex items-center space-x-1 text-botanical font-medium hover:text-coral truncate"
              title="Click to rename project"
            >
              <span className="truncate">{currentProject.name}</span>
              <Edit3 className="w-3 h-3 text-olive ml-1 shrink-0" />
            </button>
          )}
        </div>

        {/* New Project */}
        <button
          onClick={onNewProject}
          className="p-1.5 text-olive hover:text-botanical hover:bg-surface border border-stone rounded"
          title="New Project"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Export Project Manifest */}
        <button
          onClick={onExportManifest}
          className="p-1.5 text-olive hover:text-botanical hover:bg-surface border border-stone rounded"
          title="Export Project Manifest (JSON)"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Keyboard Shortcuts Trigger */}
        <button
          onClick={onOpenShortcuts}
          className="hidden sm:flex items-center space-x-1 px-2 py-1 text-xs text-olive hover:text-botanical hover:bg-surface border border-stone rounded"
          title="Keyboard Shortcuts"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="font-mono text-[11px]">Shortcuts</span>
        </button>
      </div>
    </header>
  );
};
