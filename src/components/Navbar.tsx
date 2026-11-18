import React from 'react';
import { 
  Scissors, 
  Plus, 
  ListFilter, 
  FileText, 
  HelpCircle, 
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { ClipSource } from '../types';

interface NavbarProps {
  activeSource: ClipSource | null;
  clipCount: number;
  onNewVideo: () => void;
  onScrollToClips: () => void;
  onOpenBulkModal: () => void;
  onOpenShortcuts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeSource,
  clipCount,
  onNewVideo,
  onScrollToClips,
  onOpenBulkModal,
  onOpenShortcuts,
}) => {
  return (
    <nav className="sticky top-0 z-40 bg-ivory/95 backdrop-blur-sm border-b border-stone px-4 sm:px-8 py-3 flex items-center justify-between select-none">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <a href="#" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-md bg-botanical flex items-center justify-center p-1.5 shadow-minimal transition-transform group-hover:scale-105">
            <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
              <rect x="4" y="6" width="32" height="28" rx="4" fill="#FAF8F2"/>
              <rect x="13" y="14" width="14" height="12" rx="2" fill="#C9E865"/>
              <path d="M15 13L25 27M25 13L15 27" stroke="#FE5936" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-heading font-extrabold text-lg sm:text-xl text-botanical tracking-tight">
              ClipForge
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface border border-stone text-olive">
              Web Clipper
            </span>
          </div>
        </a>
      </div>

      {/* Navigation Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {activeSource && (
          <button
            onClick={onNewVideo}
            className="px-2.5 sm:px-3 py-1.5 bg-surface hover:bg-white border border-stone text-botanical rounded text-xs font-semibold shadow-minimal flex items-center space-x-1.5 transition-colors"
            title="Paste another video link or upload file"
          >
            <Plus className="w-3.5 h-3.5 text-coral" />
            <span className="hidden xs:inline">New Video</span>
          </button>
        )}

        <button
          onClick={onScrollToClips}
          className="px-2.5 sm:px-3 py-1.5 bg-surface hover:bg-white border border-stone text-botanical rounded text-xs font-semibold shadow-minimal flex items-center space-x-1.5 transition-colors relative"
          title="Jump to saved clip selections"
        >
          <Scissors className="w-3.5 h-3.5 text-olive" />
          <span>Clips</span>
          {clipCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-lime text-botanical text-[10px] font-mono font-bold">
              {clipCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenBulkModal}
          className="hidden md:flex px-2.5 sm:px-3 py-1.5 bg-surface hover:bg-white border border-stone text-botanical rounded text-xs font-semibold shadow-minimal items-center space-x-1.5 transition-colors"
          title="Bulk paste multiple start and end timestamps"
        >
          <FileText className="w-3.5 h-3.5 text-olive" />
          <span>Bulk Timestamps</span>
        </button>

        <button
          onClick={onOpenShortcuts}
          className="p-1.5 sm:px-2.5 sm:py-1.5 bg-surface hover:bg-white border border-stone text-olive hover:text-botanical rounded text-xs font-semibold shadow-minimal flex items-center space-x-1 transition-colors"
          title="Keyboard shortcuts"
        >
          <HelpCircle className="w-3.5 h-3.5 text-coral" />
          <span className="hidden lg:inline text-xs">Shortcuts</span>
        </button>

        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 bg-surface border border-stone rounded text-[11px] font-mono text-forest">
          <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse"></span>
          <span>100% Client-Side Private</span>
        </div>
      </div>
    </nav>
  );
};